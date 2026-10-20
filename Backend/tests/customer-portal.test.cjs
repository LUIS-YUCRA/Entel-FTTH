const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');
function load(file, overrides) {
  overrides = {'../services/AssistantKnowledgeService':{knowledge:{approved:async()=>[]},normalize:value=>String(value).toLowerCase()},'../services/AssistantTurns':{turns:{fail:async()=>{}}},...overrides};
  const filename = path.resolve(__dirname, '../src', file);
  const realRequire = createRequire(filename);
  const module = {exports:{}};
  vm.runInNewContext(fs.readFileSync(filename,'utf8'), {module, exports:module.exports, __dirname:path.dirname(filename), console, process, require:(name)=>Object.hasOwn(overrides,name)?overrides[name]:realRequire(name)}, {filename});
  return module.exports;
}
function response(){return {code:200,status(value){this.code=value;return this;},json(value){this.body=value;return this;}};}
const { dateRange } = require('../src/utils/DateRange');
test('date range validates timestamps and rejects inverted or malformed ranges', () => {
  assert.deepEqual(dateRange({}),[null,null]);
  assert.deepEqual(dateRange({from:'2026-09-23T00:00:00-04:00',to:'2026-09-24T00:00:00-04:00'}),['2026-09-23T04:00:00.000Z','2026-09-24T04:00:00.000Z']);
  assert.throws(()=>dateRange({from:'invalid'}));
  assert.throws(()=>dateRange({from:'2026-09-24T00:00:00Z',to:'2026-09-23T00:00:00Z'}));
});
for (const conversation of [{id:1,status:'FINALIZADA'}, {id:1,status:'ACTIVA',ticket_id:4}, null]) {
  test(`rejects closed, ticket-linked or missing chat: ${JSON.stringify(conversation)}`,async()=>{
    const controller=load('controllers/ConversationController.js',{'../models/Conversation':{findOwned:async()=>conversation},'../models/Ticket':{},'../config/db':{},'../services/AssistantBridge':{processAssistantMessage:()=>assert.fail('must not invoke assistant')}});
    const res=response();
    await controller.sendMessage({user:{id:2},body:{conversationId:1,message:'no tengo internet'}},res,error=>{throw error;});
    assert.equal(res.code,conversation?409:404);
  });
}
test('finished assistant response is persisted as closed without a ticket',async()=>{
  let context;
  const controller=load('controllers/ConversationController.js',{'../models/Conversation':{findOwned:async()=>({id:1,status:'ACTIVA'}),getOrCreate:async()=>({id:1}),addMessage:async()=>{},saveContext:async(id,value)=>{context=value;}},'../models/Ticket':{},'../config/db':{query:async()=>({rows:[{}]})},'../services/AssistantBridge':{processAssistantMessage:async()=>({response:'No se generó ticket.',dialog_state:'FINISHED',context:{}})}});
  const res=response();await controller.sendMessage({user:{id:2},body:{conversationId:1,message:'no quiero generar ticket'}},res,error=>{throw error;});
  assert.equal(context.conversation.finished,true);assert.equal(res.body.dialogState,'FINISHED');
});
test('customer summary scopes all counts by owner and same inclusive/exclusive date bounds',async()=>{
  const calls=[];
  const controller=load('controllers/DashboardController.js',{'../models/Ticket':{},'../config/db':{query:async(sql,params)=>{calls.push({sql,params});return {rows:[{total:0}]};}}});
  const res=response();await controller.overview({user:{id:7,user_type:'cliente'},query:{from:'2026-09-23T04:00:00Z',to:'2026-09-24T04:00:00Z'}},res,error=>{throw error;});
  assert.equal(calls.length,3);for(const call of calls){assert.equal(call.params[0],7);assert.match(call.sql,/created_at >= \$2/);assert.match(call.sql,/created_at < \$3/);}
});
test('notification search is not truncated before date filtering; retention only deletes expired customer notifications',async()=>{
  const calls=[];
  const model=load('models/Notification.js',{'../config/db':{query:async(sql,params)=>{calls.push({sql,params});return {rows:[]};}},'../utils/MailService':{}});
  await model.list(8,{from:'2026-08-01T04:00:00Z'});assert.equal(calls[0].params[0],8);assert.match(calls[0].sql,/created_at >= \$2/);assert.doesNotMatch(calls[0].sql,/LIMIT 100/);
  await model.purgeExpired();assert.match(calls[1].sql,/user_type = 'cliente'/);assert.match(calls[1].sql,/created_at <= CURRENT_TIMESTAMP - INTERVAL '3 months'/);
});
test('own profile updates cannot replace the registered instance',async()=>{
  const calls=[];const client={query:async(sql,params)=>{calls.push({sql,params});return {rows:[]};},release(){}};
  const model=load('models/User.js',{'../config/db':{pool:{connect:async()=>client},query:async()=>({rows:[{service_number:'123456'}]})}});
  const profile=await model.updateOwnProfile(8,{fullName:'Cliente Prueba',email:'test@gmail.com',serviceNumber:'999999'},'cliente');
  const update=calls.find(call=>call.sql.includes('INSERT INTO customers'));
  assert.match(update.sql,/service_number = customers.service_number/);assert.equal(profile.service_number,'123456');
  assert.match(update.sql,/customer_category = CASE WHEN \$8::boolean/);
  assert.equal(update.params[7],false);
  assert.equal(update.params[8],false);assert.equal(update.params[10],false);assert.equal(update.params[11],false);
});

test('category changes require the authorized administrative option',async()=>{
  const calls=[];const client={query:async(sql,params)=>{calls.push({sql,params});return {rows:[]};},release(){}};
  const model=load('models/User.js',{'../config/db':{pool:{connect:async()=>client},query:async()=>({rows:[{}]})}});
  await model.updateOwnProfile(8,{customerCategory:'INSTITUCION'},'cliente');
  const denied=calls.find(c=>c.sql.includes('INSERT INTO customers'));
  assert.equal(denied.params[6],'HOGAR');assert.equal(denied.params[7],false);
  calls.length=0;
  await model.updateOwnProfile(8,{customerCategory:'INSTITUCION'},'cliente',{allowCategoryChange:true});
  const accepted=calls.find(c=>c.sql.includes('INSERT INTO customers'));
  assert.equal(accepted.params[6],'INSTITUCION');assert.equal(accepted.params[7],true);
});
