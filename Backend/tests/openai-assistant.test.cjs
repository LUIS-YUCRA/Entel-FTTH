const test=require('node:test');const assert=require('node:assert/strict');
const {createOpenAIAssistant,validPlan,consent,confirmedResolution,schema}=require('../src/services/OpenAIAssistant');
const {pool}=require('../src/config/db');
test.after(()=>{require('../src/services/PythonRuntime').closeAssistantWorkers();return pool.end();});
const facts={device_scope:null,connection_type:null,red_light:null,reported_since:null,router_restart_attempted:null,router_restart_failed:null};
const plan=(changes={})=>({scope:'support',action:'ASK',intent:'internet_lento',message:'Gracias por explicarlo. ¿La lentitud afecta a todos tus dispositivos?',pending_slot:'device_scope',diagnosis_code:null,knowledge_id:null,facts:{...facts},...changes});
const context=(extra={})=>({customer:{id:'1'},conversation:{history:[],dialog_state:'START',finished:false},intent:{intent:'internet_lento',confidence:.95},entities:{lights:{}},flags:{},diagnostic_facts:{},service_location:{confirmed:true},...extra});
function setup({value=plan(),http=200,localThrows=false,budgetThrows=false,networkThrows=false,webResearch}={}){
  const calls={fetch:[],reserve:[],settle:[],local:[]};
  const localProcessor=async payload=>{
    calls.local.push(payload);if(localThrows)throw new Error('python unavailable');
    const ctx=payload.context?.conversation?structuredClone(payload.context):context({service_location:undefined});
    return {success:true,response:'Respuesta local segura. ¿Qué luces ves?',intent:'internet_lento',confidence:.95,context:ctx,dialog_state:ctx.conversation.dialog_state,ticket:null};
  };
  const usage={reserve:async data=>{calls.reserve.push(data);if(budgetThrows)throw Object.assign(new Error('budget'),{code:'OPENAI_DAILY_BUDGET'});return '8';},settle:async(...args)=>calls.settle.push(args)};
  const fetchImpl=async(url,request)=>{calls.fetch.push({url,body:JSON.parse(request.body)});if(networkThrows)throw new Error('network');return {ok:http===200,status:http,json:async()=>({status:'completed',usage:{input_tokens:600,output_tokens:200},output:[{content:[{type:'output_text',text:typeof value==='string'?value:JSON.stringify(value)}]}]})};};
  return {calls,process:createOpenAIAssistant({localProcessor,usage,fetchImpl,apiKey:'test-key',webEnabled:Boolean(webResearch),webResearch})};
}
const payload=(extra={})=>({message:'mi internet esta lento',customerId:1,conversationId:4,customer:{address:'Dirección privada',zone:'Zona privada',customer_category:'HOGAR'},context:context(),...extra});
test('first technical report confirms service location without a paid request',async()=>{
  const s=setup();const r=await s.process(payload({context:null}));
  assert.match(r.response,/domicilio/);assert.equal(r.context.service_location.pending,true);assert.equal(s.calls.fetch.length,0);assert.equal(r.ticket,null);
});
test('missing customer location asks only for location and never alters customer profile',async()=>{
  const s=setup();const r=await s.process(payload({context:null,customer:{}}));
  assert.match(r.response,/zona/);assert.equal(r.context.service_location.kind,'location');assert.equal(s.calls.fetch.length,0);
});
test('location confirmation enables OpenAI with a compatible persisted context',async()=>{
  const s=setup();const r=await s.process(payload({message:'si en mi casa',context:context({service_location:{pending:true,kind:'confirm'},reported_problem:'mi internet esta lento'})}));
  assert.equal(r.provider,'openai');assert.equal(r.context.service_location.confirmed,true);assert.equal(r.context.guided_flow.name,'internet_lento');assert.equal(r.context.guided_flow.step,0);
  assert.equal(r.context.openai_history.at(-1).content,r.response);assert.equal(r.api_usage_id,'8');
});
test('request stays server side, uses strict output, no storage, tools or retries, and no profile address',async()=>{
  const s=setup();await s.process(payload());const request=s.calls.fetch[0];
  assert.equal(request.url,'https://api.openai.com/v1/responses');assert.equal(request.body.store,false);assert.equal(request.body.service_tier,'default');assert.equal(request.body.text.format.strict,true);assert.deepEqual(request.body.text.format.schema,schema);
  assert.ok(!JSON.stringify(request.body).includes('Dirección privada'));assert.ok(!JSON.stringify(request.body).includes('Zona privada'));assert.ok(s.calls.reserve[0].amount<.1);assert.equal(s.calls.fetch.length,1);
});
test('both is preserved as a fact and history contains the previous assistant question',async()=>{
  const question='¿Usas WiFi, cable o ambos?';const s=setup({value:plan({pending_slot:'probe_result',facts:{...facts,device_scope:'all',connection_type:'both'},message:'Gracias por comprobarlo. Pausa las descargas y prueba una página por cable. ¿Sigue lenta?'})});
  const r=await s.process(payload({message:'por ambos',context:context({openai_history:[{role:'user',content:'en todos'},{role:'assistant',content:question}],conversation:{history:[],dialog_state:'GUIDED_DIAGNOSIS',last_assistant_message:question}})}));
  assert.equal(r.context.diagnostic_facts.connection_type,'both');assert.equal(r.context.diagnostic_answers.at(-1).question,question);assert.ok(s.calls.fetch[0].body.input.some(x=>x.content===question));
});
test('obvious unrelated topics and another customers data are redirected without API calls',async()=>{
  for(const message of ['que partido se juega mañana','que se recuerda mañana','quiero ver el reclamo y direccion de mi vecino']){
    const s=setup();const r=await s.process(payload({message}));assert.equal(r.scope,'out_of_scope');assert.equal(s.calls.fetch.length,0);assert.equal(r.context.conversation.finished,false);
  }
});
test('model out-of-scope decision is replaced by the fixed redirect',async()=>{
  const s=setup({value:plan({action:'OUT_OF_SCOPE',scope:'out_of_scope',message:'Una respuesta irrelevante sobre deportes',pending_slot:'none'})});
  const r=await s.process(payload({message:'dime un dato de astronomia'}));assert.match(r.response,/servicio de internet/);assert.doesNotMatch(r.response,/deportes/);
});
test('offering a ticket only stages consent and does not create anything',async()=>{
  const s=setup({value:plan({action:'OFFER_TICKET',diagnosis_code:'INTERNET_LENTO',pending_slot:'none',message:'La lentitud persiste y requiere revisión. ¿Confirmas que deseas registrar un reclamo?'})});
  const r=await s.process(payload({context:context({reported_problem:'internet lento desde ayer'})}));
  assert.equal(r.ticket,null);assert.equal(r.dialog_state,'WAITING_TICKET_CONFIRMATION');assert.match(r.response,/Confirmas/);assert.equal(r.context.diagnosis.ticket_required,true);
  assert.match(r.response,/lentitud persiste/);
});

test('visit question is answered while retaining pending consent and backend state',async()=>{
  const diagnosis={code:'ELECTRICAL_STORM_DAMAGE',ticket_required:true};
  const s=setup({value:plan({action:'MESSAGE',pending_slot:'none',message:'Puede ser necesaria una visita; soporte debe confirmarla.'})});
  const r=await s.process(payload({message:'entonces tiene que venir alguien ?',context:context({reported_problem:'mi router huele a quemado',diagnosis,conversation:{history:[],dialog_state:'WAITING_TICKET_CONFIRMATION'}})}));
  assert.match(r.response,/visita/);assert.equal(r.ticket,null);assert.equal(r.dialog_state,'WAITING_TICKET_CONFIRMATION');assert.deepEqual(r.context.diagnosis,diagnosis);
  assert.match(s.calls.fetch[0].body.instructions,/"pendingTicketConfirmation":true/);
});

test('explanations preserve diagnostic progress and accept natural prose',async()=>{
  const flow={name:'internet_lento',step:1,last_question:'¿Usas WiFi, cable o ambos?'};
  const s=setup({value:plan({action:'MESSAGE',intent:'consulta_servicio',pending_slot:'none',message:'WiFi conecta sin cables y puedes usarlo con varios dispositivos; el cable conecta directamente al equipo.'})});
  const r=await s.process(payload({message:'que diferencia hay entre wifi y cable',context:context({guided_flow:flow,conversation:{history:[],dialog_state:'GUIDED_DIAGNOSIS'}})}));
  assert.equal(r.provider,'openai');assert.deepEqual(r.context.guided_flow,flow);assert.equal(r.context.intent.intent,'internet_lento');assert.equal(r.dialog_state,'GUIDED_DIAGNOSIS');
});

test('location gate answers interruptions rather than repeating its question',async()=>{
  for(const kind of ['confirm','location']){
    const s=setup({value:plan({action:'MESSAGE',intent:'consulta_servicio',pending_slot:'none',message:'La ubicación permite orientar la revisión del servicio.'})});
    const r=await s.process(payload({message:'por que necesitas mi ubicacion?',context:context({service_location:{pending:true,kind},reported_problem:'internet lento'})}));
    assert.equal(r.provider,'openai');assert.equal(r.context.service_location.pending,true);assert.match(s.calls.fetch[0].body.input.at(-1).content,/por que/);
  }
});

test('service information needs no location even with a technical local intent',async()=>{
  const s=setup({value:plan({action:'MESSAGE',intent:'consulta_servicio',pending_slot:'none',message:'La fibra lleva la señal mediante luz; WiFi conecta tus dispositivos al router.'})});
  const r=await s.process(payload({message:'que es fibra optica?',context:null}));
  assert.equal(r.provider,'openai');assert.ok(!r.context.service_location?.pending);
});

test('commercial requests and punctuated questions bypass an inherited failure classification',async()=>{
  for(const message of ['puedes cambiarme al plan de 200 megas?','quiero cambiar de plan','eso tiene costo?']){
    const s=setup({value:plan({action:'MESSAGE',intent:'consulta_servicio',pending_slot:'none',message:'No tengo información comercial verificada para ejecutar ese cambio.'})});
    const r=await s.process(payload({message,context:null}));
    assert.equal(r.provider,'openai');assert.ok(!r.context.service_location?.pending);
  }
});

test('verified web data and full backend capabilities reach GPT and citations persist',async()=>{
  const source={url:'https://www.entel.bo/fibra',title:'Fibra ENTEL'};
  const s=setup({value:plan({action:'MESSAGE',intent:'consulta_servicio',pending_slot:'none',message:'El traslado requiere confirmar cobertura con ENTEL.'}),webResearch:async()=>({status:'verified',topic:'relocation',summary:'Requisitos públicos verificados.',sources:[source],usageId:5})});
  const r=await s.process(payload({message:'como traslado mi servicio a otro domicilio?'}));
  assert.equal(r.provider,'openai');assert.equal(r.web_research.status,'verified');assert.match(r.response,/\[1\]\(https:\/\/www.entel.bo\/fibra\)/);
  assert.equal(r.context.openai_history.at(-1).content,r.response);assert.match(s.calls.fetch[0].body.instructions,/Requisitos públicos verificados/);assert.match(s.calls.fetch[0].body.instructions,/10 MB/);
});

test('unavailable API never turns a commercial question into a slow-internet diagnostic',async()=>{
  const s=setup({http:429});const r=await s.process(payload({message:'cuanto cuesta cambiar mi plan?'}));
  assert.equal(r.provider,'local');assert.match(r.response,/información oficial/);assert.doesNotMatch(r.response,/luces|dispositivos/);
});

test('qualified refusal is backend-owned consent, not a new paid question',async()=>{
  assert.equal(consent('no gracias, primero consultare el costo'),false);
  const s=setup();await s.process(payload({message:'no gracias, primero consultare el costo',context:context({conversation:{history:[],dialog_state:'WAITING_TICKET_CONFIRMATION'}})}));
  assert.equal(s.calls.fetch.length,0);
});

test('natural burning smell variants bypass location and paid requests',async()=>{
  for(const message of ['mi router huele a quemado','el modem tiene olor a quemado','esta saliendo humo','el router está oliendo a quemado']){
    const s=setup();const r=await s.process(payload({message,context:null}));
    assert.equal(r.api_fallback_reason,'ELECTRICAL_SAFETY');assert.equal(s.calls.fetch.length,0);assert.ok(!r.context.service_location?.pending);
  }
});

test('real local engine handles burning smell and visit question without looping',{timeout:60000},async()=>{
  const {processLocalAssistantMessage}=require('../src/services/AssistantBridge');
  const run=createOpenAIAssistant({localProcessor:processLocalAssistantMessage,apiKey:null});
  const danger=await run(payload({message:'mi router huele a quemado',context:null}));
  assert.match(danger.response,/distancia/);assert.match(danger.response,/encender/);
  assert.equal(danger.dialog_state,'WAITING_TICKET_CONFIRMATION');assert.equal(danger.ticket,null);
  const question=await run(payload({message:'entonces tiene que venir alguien ?',context:danger.context}));
  assert.match(question.response,/visita técnica/);assert.match(question.response,/evaluará/);
  assert.equal(question.dialog_state,'WAITING_TICKET_CONFIRMATION');assert.equal(question.ticket,null);
  const accepted=await run(payload({message:'si por favor',context:question.context}));
  assert.ok(accepted.ticket);assert.equal(accepted.ticket.code,'ELECTRICAL_STORM_DAMAGE');
});
test('ticket consent uses local domain service, never the model',async()=>{
  const s=setup();await s.process(payload({message:'si',context:context({conversation:{history:[],dialog_state:'WAITING_TICKET_CONFIRMATION'},diagnosis:{code:'SIN_INTERNET',ticket_required:true}})}));
  assert.equal(s.calls.fetch.length,0);assert.equal(consent('no funciona'),null);assert.equal(consent('si por favor'),true);assert.equal(consent('no gracias'),false);
});
test('own ticket lookup is authoritative and does not send database data to the API',async()=>{
  const s=setup();const r=await s.process(payload({message:'cuando viene el tecnico',ticketLookup:{requested:true,ticket:{ticket_code:'TK-REAL',status:'PENDIENTE'}}}));
  assert.equal(s.calls.fetch.length,0);assert.equal(r.api_fallback_reason,'AUTHORITATIVE_TICKET_LOOKUP');
});
for(const [name,settings,reason] of [['quota',{http:429},'OPENAI_HTTP_429'],['timeout',{networkThrows:true},'OPENAI_NETWORK_OR_SETTLEMENT'],['invalid JSON',{value:'invalid'},'OPENAI_INVALID_JSON'],['unsafe answer',{value:plan({message:'Desconecta la fibra y mira el extremo.'})},'OPENAI_RESPONSE_REJECTED'],['compound questions',{value:plan({message:'¿Ocurre en todos? ¿También por cable?'})},'OPENAI_RESPONSE_REJECTED'],['false ticket registration',{value:plan({message:'Tu ticket ya fue registrado.'})},'OPENAI_RESPONSE_REJECTED'],['budget',{budgetThrows:true},'OPENAI_DAILY_BUDGET']]){
  test(name+' falls back safely without retrying',async()=>{const s=setup(settings);const r=await s.process(payload());assert.equal(r.provider,'local');assert.equal(r.api_fallback_reason,reason);assert.ok(s.calls.fetch.length<=1);assert.equal(r.ticket,null);});
}
test('resolution without confirmation is rejected',async()=>{
  const s=setup({value:plan({action:'RESOLVED',pending_slot:'none'})});const r=await s.process(payload());assert.equal(r.api_fallback_reason,'OPENAI_RESOLUTION_UNCONFIRMED');assert.equal(r.context.conversation.finished,false);
});
test('customer B never inherits history or facts from A',async()=>{
  const s=setup();await s.process(payload({customerId:2,context:context({openai_history:[{role:'user',content:'PRIVATE CUSTOMER A'}],diagnostic_facts:{red_light:true}})}));
  const local=s.calls.local[0];assert.equal(local.context.customer.id,'2');assert.ok(!JSON.stringify(local.context).includes('PRIVATE CUSTOMER A'));assert.deepEqual(local.context.diagnostic_facts,{});
});
test('private location provided during confirmation is not sent to OpenAI',async()=>{
  const s=setup();await s.process(payload({message:'Calle Privada 12345',customer:{},context:context({service_location:{pending:true,kind:'location'},reported_problem:'internet lento'})}));
  assert.ok(!JSON.stringify(s.calls.fetch[0].body).includes('Calle Privada'));
});
test('plans reject unknown facts and accept one valid support question',()=>{
  assert.equal(validPlan(plan()),true);assert.equal(validPlan(plan({facts:{...facts,priority:'ALTA'}})),false);
});

test('ticket screen explanations are valid while invented completed actions are rejected',()=>{
  for(const message of ['En Mis tickets puedes ver tus reclamos registrados y el técnico asignado, si lo hay.','No puedo confirmar que el técnico vendrá mañana.','Si tu ticket fue registrado, puedes consultar su estado en Mis tickets.'])assert.equal(validPlan(plan({action:'MESSAGE',pending_slot:'none',message})),true,message);
  for(const message of ['Tu ticket ya fue registrado.','El técnico vendrá mañana.','He creado un reclamo.'])assert.equal(validPlan(plan({action:'MESSAGE',pending_slot:'none',message})),false,message);
});
test('safe power restart with a fiber warning is accepted; affirmative optical repair is rejected',()=>{
  assert.equal(validPlan(plan({message:'Desconecta el equipo solo de la corriente durante un minuto, sin tocar la fibra. ¿Mejoró la conexión?'})),true);
  assert.equal(validPlan(plan({message:'Desconecta la fibra. No reinicies el equipo.'})),false);
  assert.equal(validPlan(plan({message:'Si mantienes presionado RESET, puedes borrar la configuración. No lo uses para reiniciar.'})),true);
  assert.equal(validPlan(plan({message:'No mantengas presionado RESET: puede borrar la configuración.'})),true);
  assert.equal(validPlan(plan({message:'Mantén presionado RESET durante diez segundos.'})),false);
  assert.equal(validPlan(plan({message:'Presiona RESET para recuperar internet.'})),false);
});
test('electrical danger is handled before asking for the customer location',async()=>{
  const s=setup();const result=await s.process(payload({message:'sale humo del router',context:null}));
  assert.equal(result.api_fallback_reason,'ELECTRICAL_SAFETY');assert.equal(s.calls.fetch.length,0);assert.ok(!result.context.service_location?.pending);
});
test('resolution respects the polarity of the actual question',()=>{
  assert.equal(confirmedResolution('si sigue lento','¿Sigue lento?'),false);
  assert.equal(confirmedResolution('no','¿Sigue lento?'),true);
  assert.equal(confirmedResolution('si','¿La velocidad mejoró?'),true);
  assert.equal(confirmedResolution('si','¿Sigue lento?'),false);
  assert.equal(confirmedResolution('no','¿La velocidad mejoró?'),false);
});
test('OpenAI staged ticket consent is compatible with the real Python domain engine',{timeout:60000},async()=>{
  const {processLocalAssistantMessage}=require('../src/services/AssistantBridge');let calls=0;
  const value=plan({action:'OFFER_TICKET',diagnosis_code:'SIN_INTERNET',pending_slot:'none',intent:'sin_internet'});
  const run=createOpenAIAssistant({localProcessor:processLocalAssistantMessage,apiKey:'test-key',usage:{reserve:async()=>1,settle:async()=>{}},fetchImpl:async()=>{calls++;return {ok:true,status:200,json:async()=>({status:'completed',usage:{input_tokens:100,output_tokens:100},output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};}});
  const staged=await run(payload({message:'no tengo internet',context:context({intent:{intent:'sin_internet',confidence:.95},reported_problem:'no tengo internet'})}));
  assert.equal(staged.ticket,null);assert.equal(staged.dialog_state,'WAITING_TICKET_CONFIRMATION');
  const confirmed=await run(payload({message:'si',context:JSON.parse(JSON.stringify(staged.context))}));
  assert.ok(confirmed.ticket);assert.equal(confirmed.ticket.code,'SIN_INTERNET');assert.equal(confirmed.context.diagnostic_facts.ticket_confirmed,true);assert.equal(calls,1);
});
test('approved knowledge with unmet diagnostic conditions is not supplied to the model',async()=>{
  const s=setup();await s.process(payload({knowledge:[{id:9,intent:'internet_lento',question:'Pregunta privada no aplicable',answer:'No se debe usar esta respuesta.',reply_key:'slow:device_scope',conditions:{los_status:'red'}}]}));
  assert.ok(!JSON.stringify(s.calls.fetch[0].body).includes('Pregunta privada no aplicable'));
});
test('historical repeat lookup uses the backend-owned private history without sending it to the API',async()=>{
  const s=setup();const r=await s.process(payload({message:'otra vez lo mismo de ayer',privateHistory:[{intent:'sin_internet',ticketCode:'TK-PRIVATE'}]}));
  assert.equal(s.calls.fetch.length,0);assert.equal(r.api_fallback_reason,'AUTHORITATIVE_HISTORY');
});
test('natural visit consent respects clear requests, negatives, conditions and informational questions',()=>{
  for(const message of ['que un tecnico venga a mi domicilio','si que un tecnico venga a solucionar mi servicio','quiero que venga un tecnico','necesito un tecnico en mi casa','manden un tecnico por favor','solicito una visita tecnica','quiero que lo revise un tecnico','no funciona, quiero que venga un tecnico','correcto'])assert.equal(consent(message),true,message);
  for(const message of ['no quiero que un tecnico venga','no quiero que venga un tecnico','si pero no registres el ticket','no hace falta un tecnico','no venga un tecnico','no quiero una visita tecnica','no quiero'])assert.equal(consent(message),false,message);
  for(const message of ['no funciona','sigue igual','cuando viene el tecnico','si es gratis quiero que venga un tecnico','quiero saber cuando viene el tecnico','es necesario que un tecnico venga','cuando venga un tecnico avisame','me dijeron que un tecnico venga'])assert.equal(consent(message),null,message);
});
test('reported natural requests bypass GPT and confirm through real Python in one turn',{timeout:60000},async()=>{
  const {processLocalAssistantMessage}=require('../src/services/AssistantBridge');
  const run=createOpenAIAssistant({localProcessor:processLocalAssistantMessage,apiKey:'test-key',usage:{reserve:()=>assert.fail('must not spend credits')},fetchImpl:()=>assert.fail('must not call GPT')});
  for(const message of ['que un tecnico venga a mi domicilio','si que un tecnico venga a solucionar mi servicio']){
    const staged=context({conversation:{history:[],dialog_state:'WAITING_TICKET_CONFIRMATION'},reported_problem:'sin internet',diagnosis:{code:'SIN_INTERNET',problem:'Sin internet',cause:'Requiere revisión',ticket_required:true,priority:'ALTA'}});
    const result=await run(payload({message,context:staged}));
    assert.ok(result.ticket);assert.equal(result.context.diagnostic_facts.ticket_confirmed,true);assert.equal(result.api_fallback_reason,'TICKET_CONSENT_BACKEND');
  }
});
