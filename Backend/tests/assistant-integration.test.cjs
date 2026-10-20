const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');

function load(file, overrides) {
  overrides = {'../services/AssistantKnowledgeService':{knowledge:{approved:async()=>[]},normalize:value=>String(value).toLowerCase()},'../services/AssistantTurns':{turns:{fail:async()=>{}}},...overrides};
  const filename = path.resolve(__dirname,'../src',file);
  const actual = createRequire(filename); const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,process,Buffer,__dirname:path.dirname(filename),
    console:{error(){},log(){}},require:name=>Object.hasOwn(overrides,name)?overrides[name]:actual(name)});
  return module.exports;
}
const response=()=>({code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
const fail=error=>{throw error;};

for(const failure of ['launch','invalid-json','python-error','empty']){
  test(`bridge converts ${failure} into controlled 503`,async()=>{
    const bridge=load('services/AssistantBridge.js',{'./PythonRuntime':{runPython:async()=>{
      if(failure==='launch')throw new Error('spawn failure');
      if(failure==='invalid-json')return ['not json'];
      return [JSON.stringify({success:failure!=='python-error',response:failure==='empty'?'':'failed'})];
    }}});
    await assert.rejects(()=>bridge.processAssistantMessage({message:'hola',customerId:1}),error=>error.status===503 && error.code==='ASSISTANT_UNAVAILABLE');
  });
}

test('real Node/Python bridge restores context across processes and isolates customers', {timeout:60000},async()=>{
  const {processAssistantMessage}=require('../src/services/AssistantBridge');
  const started=performance.now();
  const [a,b]=await Promise.all([
    processAssistantMessage({message:'tengo falla en mi internet q ago',customerId:991}),
    processAssistantMessage({message:'buenas tardes',customerId:992}),
  ]);
  assert.match(a.response,/conexión está lenta/);assert.match(b.response,/Buenas tardes/);
  const next=await processAssistantMessage({message:'no tengo',customerId:991,context:JSON.parse(JSON.stringify(a.context))});
  assert.match(next.response,/luz roja/);assert.equal(next.context.customer.id,'991');
  assert.equal(b.context.customer.id,'992');assert.equal(b.dialog_state,'START');
  assert.ok(performance.now()-started<60000,'three bridge calls exceed test budget');
});

test('API persists original text/context and confirms only the database ticket code',async()=>{
  let saved;const messages=[];
  const controller=load('controllers/ConversationController.js',{
    '../models/Conversation':{findOwned:async()=>({id:1,status:'ACTIVA'}),getOrCreate:async()=>({id:1,assistant_context:{}}),
      addMessage:async(...args)=>messages.push(args),findOriginalProblem:async()=> 'sin internet',saveContext:async(...args)=>saved=args},
    '../models/Ticket':{create:async data=>{assert.equal(data.deduplicate,true);return {id:7,ticket_code:'TK-REAL',status:'PENDIENTE'};}},
    '../config/db':{query:async()=>({rows:[{}]})},
    '../services/AssistantBridge':{processAssistantMessage:async()=>({response:'Internal proposal',intent:'sin_internet',ticket:{ticket_id:'TK-LOCAL',priority:'ALTA'},context:{diagnostic_answers:[],conversation:{}},dialog_state:'FINISHED'})},
  });
  const res=response();await controller.sendMessage({user:{id:1},body:{conversationId:1,message:'sí, genere el ticket'}},res,fail);
  assert.match(res.body.response,/TK-REAL/);assert.doesNotMatch(res.body.response,/TK-LOCAL/);
  assert.equal(messages[0][2],'sí, genere el ticket');assert.equal(saved[1].conversation.finished,true);assert.equal(saved[2],7);
});

test('navigation questions use explanations while direct technician questions query only the owner',async()=>{
  for(const [message,expected] of [['como veo quien es mi tecnico?',false],['quien es mi tecnico?',true]]){
    const lookups=[];let captured;
    const controller=load('controllers/ConversationController.js',{
      '../services/AssistantKnowledgeService':{normalize:value=>String(value).toLowerCase(),knowledge:{approved:async()=>[],ownTicket:async(...args)=>{lookups.push(args);return {ticket_code:'TK-OWN',status:'PENDIENTE'};}}},
      '../models/Conversation':{findOwned:async()=>({id:1,status:'ACTIVA'}),getOrCreate:async()=>({id:1,assistant_context:{}}),addMessage:async()=>({id:10}),saveContext:async()=>{}},
      '../config/db':{query:async()=>({rows:[{}]})},
      '../services/AssistantBridge':{processAssistantMessage:async payload=>{captured=payload;return {response:'Respuesta',context:{conversation:{}},dialog_state:'START'};}},
    });
    const res=response();await controller.sendMessage({user:{id:51},body:{conversationId:1,message}},res,fail);
    assert.equal(Boolean(captured.ticketLookup.requested),expected);assert.equal(lookups.length,expected?1:0);
    if(expected)assert.equal(lookups[0][0],51);
  }
});

test('concurrent turn is rejected without consuming context; lock releases on Python failure',async()=>{
  let release;const pending=new Promise(resolve=>release=resolve);
  const controller=load('controllers/ConversationController.js',{
    '../models/Conversation':{findOwned:async()=>{await pending;return {id:1,status:'ACTIVA'};},getOrCreate:async()=>({id:1}),addMessage:async()=>{}},
    '../models/Ticket':{},'../config/db':{query:async()=>({rows:[{}]})},
    '../services/AssistantBridge':{processAssistantMessage:async()=>{throw new Error('unavailable');}},
  });
  const req={user:{id:1},body:{conversationId:1,message:'hola'}};
  let failed=0;const first=controller.sendMessage(req,response(),()=>failed++);
  const concurrent=response();await controller.sendMessage(req,concurrent,fail);assert.equal(concurrent.code,409);
  release();await first;await controller.sendMessage(req,response(),()=>failed++);assert.equal(failed,2);
});

test('ticket deduplication locks before checking, returns existing code without notifications',async()=>{
  const calls=[];let released=false;
  const client={query:async(sql)=>{calls.push(sql);return {rows:sql.includes('SELECT * FROM support_tickets')?[{id:7,ticket_code:'TK-REAL'}]:[]};},release(){released=true;}};
  const Ticket=load('models/Ticket.js',{'../config/db':{pool:{connect:async()=>client}},'./Notification':{create:()=>assert.fail('duplicate must not notify')}});
  const result=await Ticket.create({customerId:1,diagnosisCode:'SIN_INTERNET',deduplicate:true});
  assert.equal(result.reused,true);assert.equal(result.ticket_code,'TK-REAL');assert.ok(released);
  assert.match(calls[1],/pg_advisory_xact_lock/);assert.match(calls[2],/SELECT \*/);assert.equal(calls.at(-1),'COMMIT');
});

test('ticket insertion failure rolls back and never sends a notification',async()=>{
  const calls=[];let released=false;
  const client={query:async(sql)=>{calls.push(sql);if(sql.includes('INSERT INTO support_tickets'))throw new Error('db unavailable');return {rows:[{number:1}]};},release(){released=true;}};
  const Ticket=load('models/Ticket.js',{'../config/db':{pool:{connect:async()=>client}},'./Notification':{create:()=>assert.fail('must not notify')}});
  await assert.rejects(()=>Ticket.create({customerId:1,title:'test'}),/db unavailable/);
  assert.equal(calls.at(-1),'ROLLBACK');assert.ok(released);
});

test('new ticket and audit commit before notifications, using sequence code',async()=>{
  const events=[];
  const client={query:async(sql,params)=>{
    events.push(sql);
    if(sql.includes('nextval'))return {rows:[{number:123}]};
    if(sql.includes('INSERT INTO support_tickets')){assert.equal(params[0],'TK-123');return {rows:[{id:7,ticket_code:params[0],priority:'MEDIA'}]};}
    return {rows:[]};
  },release(){events.push('release');}};
  const Ticket=load('models/Ticket.js',{'../config/db':{pool:{connect:async()=>client}},'./Notification':{
    create:async payload=>{assert.equal(events.at(-1),'release');assert.equal(payload.ticketId,7);events.push('customer notification');},
    createForRole:async role=>{assert.equal(role,'operador');events.push('operator notification');},
  }});
  const ticket=await Ticket.create({customerId:1,title:'Sin internet',diagnosisCode:'SIN_INTERNET',deduplicate:true});
  assert.equal(ticket.ticket_code,'TK-123');assert.ok(events.some(sql=>sql.includes('INSERT INTO audit_logs')));
  assert.ok(events.indexOf('COMMIT')<events.indexOf('customer notification'));
});

test('PostgreSQL persists original messages and JSON context (rolled back)',{skip:process.env.ASSISTANT_DB_TEST!=='1'},async()=>{
  const {pool}=require('../src/config/db');const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const users=await client.query("SELECT id FROM users WHERE user_type = 'cliente' LIMIT 1");
    assert.ok(users.rows[0],'requires one existing customer');
    const inserted=await client.query("INSERT INTO conversations(customer_id,status) VALUES($1,'ACTIVA') RETURNING id",[users.rows[0].id]);
    const id=inserted.rows[0].id;
    const Conversation=load('models/Conversation.js',{'../config/db':{query:(...args)=>client.query(...args)}});
    const context={conversation:{finished:false,pending_clarification:'connectivity'},intent:{intent:'problema_internet_general'}};
    await Conversation.addMessage(id,'usuario','tengo falla en mi internet q ago');
    await Conversation.saveContext(id,context);
    const found=await Conversation.findOwned(users.rows[0].id,id);
    assert.equal(found.assistant_context.conversation.pending_clarification,'connectivity');
    assert.equal(await Conversation.findOriginalProblem(id),'tengo falla en mi internet q ago');
  }finally{await client.query('ROLLBACK');client.release();await pool.end();}
});

test('API returns cached completed turn even when the conversation already finished',async()=>{
 const expected={success:true,conversationId:1,response:'Tu ticket TK-REAL fue registrado.',messageId:2};
 const controller=load('controllers/ConversationController.js',{
  '../services/AssistantTurns':{turns:{cached:async()=>expected,fail:async()=>{}}},
  '../models/Conversation':{findOwned:()=>assert.fail('completed retry must use stored response')},
 });
 const res=response();await controller.sendMessage({user:{id:1},body:{conversationId:1,requestId:'a1234567-1234-1234-1234-123456789abc',message:'si'}},res,fail);
 assert.equal(res.body,expected);
});
test('API stores a failed new turn without appending half a conversation',async()=>{
 let failed=false;let completed=false;
 const controller=load('controllers/ConversationController.js',{
  '../services/AssistantTurns':{turns:{cached:async()=>null,claim:async()=>({id:2,token:'attempt',conversation:{id:1}}),complete:async()=>{completed=true;},fail:async(t)=>{assert.equal(t.id,2);failed=true;}}},
  '../models/Conversation':{findOwned:async()=>({id:1,status:'ACTIVA'}),getOrCreate:async()=>({id:1}),addMessage:()=>assert.fail('must not partially store new turn')},
  '../config/db':{query:async()=>({rows:[]})},
  '../services/AssistantBridge':{processAssistantMessage:async()=>{throw Object.assign(new Error('down'),{code:'ASSISTANT_UNAVAILABLE'});}},
 });
 let error;await controller.sendMessage({user:{id:1},body:{conversationId:1,requestId:'a1234567-1234-1234-1234-123456789abc',message:'hola'}},response(),e=>{error=e;});
 assert.equal(error.code,'ASSISTANT_UNAVAILABLE');assert.ok(failed);assert.equal(completed,false);
});
test('ticket retry key is checked independently of the five-minute duplicate window',async()=>{
 const calls=[];
 const client={query:async(sql)=>{calls.push(sql);return {rows:sql.includes('WHERE assistant_turn_key')?[{id:7,ticket_code:'TK-OLD',status:'CERRADO'}]:[]};},release(){}};
 const Ticket=load('models/Ticket.js',{'../config/db':{pool:{connect:async()=>client}},'./Notification':{create:()=>assert.fail('must not notify twice')}});
 const result=await Ticket.create({customerId:1,diagnosisCode:'SIN_INTERNET',deduplicate:true,assistantTurnKey:'1:stable-request'});
 assert.equal(result.ticket_code,'TK-OLD');assert.equal(result.reused,true);assert.ok(!calls.some(sql=>sql.includes('INSERT INTO support_tickets')));
});

test('new conversation scopes same-failure deduplication instead of reusing another chat ticket',async()=>{
 const calls=[];let notifications=0;
 const client={query:async(sql,args)=>{calls.push({sql,args});if(sql.includes("nextval"))return {rows:[{number:77}]};if(sql.includes('INSERT INTO support_tickets'))return {rows:[{id:77,ticket_code:'TK-077',priority:'MEDIA'}]};return {rows:[]};},release(){}};
 const Ticket=load('models/Ticket.js',{'../config/db':{pool:{connect:async()=>client}},'./Notification':{create:async()=>{notifications++;},createForRole:async()=>{notifications++;}}});
 const r=await Ticket.create({customerId:1,diagnosisCode:'SIN_INTERNET',title:'Sin internet',deduplicate:true,conversationId:22,assistantTurnKey:'22:request'});
 const duplicate=calls.find(x=>x.sql.includes('ORDER BY created_at DESC LIMIT 1'));
 assert.match(duplicate.sql,/c.id=\$3/);assert.match(duplicate.sql,/c.ticket_id=support_tickets.id/);assert.deepEqual(Array.from(duplicate.args),[1,'SIN_INTERNET',22]);assert.equal(r.ticket_code,'TK-077');assert.equal(notifications,2);
});

