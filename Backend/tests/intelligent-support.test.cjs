const test=require('node:test');const assert=require('node:assert/strict');
const {createOpenAIAssistant,schema,validate}=require('../src/services/IntelligentSupportAssistant');
const {ServiceIdentity,validateInstance,missingProfile}=require('../src/services/ServiceIdentity');
const {captureRequestedField,profileSummary}=require('../src/services/CustomerProfileSupport');
const {calculateTicketPriority}=require('../src/services/TicketPriorityService');
const {pool}=require('../src/config/db');test.after(()=>pool.end());
const emptyFacts={device_scope:null,connection_type:null,red_light:null,reported_since:null,router_restart_attempted:null,router_restart_failed:null};
const plan=(extra={})=>({scope:'support',action:'ASK',intent:'sin_internet',message:'¿Qué luces observas en el equipo?',pending_slot:'lights',diagnosis_code:null,knowledge_id:null,source_indexes:[],facts:{...emptyFacts},issue_summary:'No tiene internet',impact_statement:null,new_issue:false,location_confirmed:null,profile_request:'none',defer_profile:false,ticket_consent:'NONE',resolution_confirmed:false,...extra});
function harness(values){const requests=[];let localCalls=0;let index=0;
  const run=createOpenAIAssistant({apiKey:'fake-key',webEnabled:false,usage:{reserve:async()=>1,settle:async()=>{}},localProcessor:async({context})=>{localCalls++;return {success:true,response:'Respaldo',context,ticket:null};},fetchImpl:async(url,args)=>{requests.push(JSON.parse(args.body));return {ok:true,json:async()=>({status:'completed',usage:{input_tokens:100,output_tokens:100},output:[{content:[{type:'output_text',text:JSON.stringify(values[Math.min(index++,values.length-1)])}]}]})};}});
  return {run,requests,get localCalls(){return localCalls;}};
}
const payload=(extra={})=>({message:'no tengo internet',customerId:'7',customer:{service_number:'1234567',customer_category:'INSTITUCION',category_verified:true},...extra});
test('GPT is the primary dialogue engine without local intent classification',async()=>{
  const h=harness([plan()]);const r=await h.run(payload());
  assert.equal(r.provider,'openai');assert.equal(h.localCalls,0);assert.equal(h.requests.length,1);assert.deepEqual(h.requests[0].text.format.schema,schema);assert.match(r.response,/luces/);
});
test('welcome requests only a missing field and excludes private profile values',async()=>{
  const h=harness([plan({action:'MESSAGE',intent:'saludo',pending_slot:'none',issue_summary:null,profile_request:'phone',message:'Hola. Para poder contactarte si hace falta una revisión, puedes completar tu teléfono en el formulario. También puedes contarme tu consulta ahora.'})]);
  const r=await h.run(payload({event:'welcome',message:'Inicio de atención',customer:{service_number:'1234567',category_verified:true,customer_category:'NEGOCIO',ci:'PRIVATE-CI',address:'PRIVATE-ADDRESS',phone:'',zone:'PRIVATE-ZONE'}}));
  assert.equal(r.profile_request,'phone');assert.equal(r.context.openai_history.length,1);assert.ok(!JSON.stringify(h.requests).includes('PRIVATE-'));
});
test('an urgent support problem defers onboarding and keeps the issue',async()=>{
  const h=harness([plan({defer_profile:true,profile_request:'phone'})]);const r=await h.run(payload());
  assert.equal(r.context.profile_deferred,true);assert.equal(r.profile_request,null);assert.equal(r.context.reported_problem,'No tiene internet');
});
test('natural affirmative consent creates a backend proposal after an offer',async()=>{
  const h=harness([plan({action:'OFFER_TICKET',pending_slot:'none',diagnosis_code:'SIN_INTERNET',message:'La falla persiste y necesita revisión. ¿Quieres registrar el reclamo?'}),plan({action:'CREATE_TICKET',pending_slot:'none',diagnosis_code:'SIN_INTERNET',ticket_consent:'YES',message:'Voy a solicitar el registro de tu reclamo para revisión.'})]);
  const offered=await h.run(payload());assert.equal(offered.ticket,null);
  const accepted=await h.run(payload({message:'de una, registralo por favor',context:offered.context}));
  assert.equal(accepted.ticket.code,'SIN_INTERNET');assert.equal(accepted.context.diagnostic_facts.ticket_confirmed,true);assert.equal(h.localCalls,0);
});
test('negative and cost questions do not register or erase the pending problem',async()=>{
  for(const [message,decision] of [['prefiero esperar, no lo registres','NO'],['y si tiene costo?','UNCERTAIN']]){
    const h=harness([plan({action:'MESSAGE',pending_slot:'none',ticket_consent:decision,message:decision==='NO'?'De acuerdo, puedes continuar consultándome sin registrar el reclamo.':'No tengo un costo de visita verificado; debes confirmarlo antes de autorizar un servicio con cargo.'})]);
    const context={customer:{id:'7'},reported_problem:'Sin internet desde ayer',diagnosis:{code:'SIN_INTERNET'},conversation:{dialog_state:'WAITING_TICKET_CONFIRMATION',history:[]}};
    const r=await h.run(payload({message,context}));assert.equal(r.ticket,null);assert.equal(r.context.reported_problem,context.reported_problem);
    assert.equal(r.dialog_state,decision==='NO'?'START':'WAITING_TICKET_CONFIRMATION');
  }
});
test('conditional consent cannot create a ticket even if the model mislabels it',async()=>{
  const h=harness([plan({action:'CREATE_TICKET',ticket_consent:'YES',pending_slot:'none',message:'Solicitaré registrar el reclamo.'})]);
  const r=await h.run(payload({message:'si, pero primero dime cuanto cuesta',context:{customer:{id:'7'},reported_problem:'Sin internet',conversation:{history:[],dialog_state:'WAITING_TICKET_CONFIRMATION'}}}));
  assert.equal(r.ticket,null);assert.equal(r.api_fallback_reason,'OPENAI_RESPONSE_REJECTED');assert.equal(h.requests.length,2);
});

test('a natural request to register as soon as possible is not confused with a cost question',async()=>{
  const h=harness([plan({action:'CREATE_TICKET',ticket_consent:'YES',pending_slot:'none',message:'Solicitaré registrar el reclamo.'})]);
  const r=await h.run(payload({message:'si, registra el reclamo cuanto antes por favor',context:{customer:{id:'7'},reported_problem:'Sin internet',conversation:{history:[],dialog_state:'WAITING_TICKET_CONFIRMATION'}}}));
  assert.ok(r.ticket);assert.equal(h.localCalls,0);
});

test('only backend evidence permits describing an existing saved ticket',()=>{
  const p=plan({action:'MESSAGE',pending_slot:'none',message:'Tu reclamo fue registrado. Puedes consultar el estado en Mis tickets.'});
  assert.ok(validate(p,{}).includes('UNAUTHORIZED_CLAIM_OR_ACTION'));
  assert.deepEqual(validate(p,{},{ticketExists:true}),[]);
});
test('a negative answer to a symptom question can confirm resolution semantically',async()=>{
  const h=harness([plan({action:'RESOLVED',pending_slot:'none',resolution_confirmed:true,message:'Qué bueno que ya no sigue lento. Puedes continuar usando tu conexión.'})]);
  const r=await h.run(payload({message:'no, ahora ya esta bien',context:{customer:{id:'7'},reported_problem:'Internet lento',conversation:{history:[],dialog_state:'GUIDED_DIAGNOSIS',last_assistant_message:'¿Sigue lenta la conexión?'}}}));
  assert.equal(r.dialog_state,'FINISHED');assert.equal(r.ticket,null);
});
test('a resolved claim without semantic confirmation is repaired then rejected',async()=>{
  const h=harness([plan({action:'RESOLVED',resolution_confirmed:false})]);const r=await h.run(payload());
  assert.equal(h.requests.length,2);assert.equal(r.api_fallback_reason,'OPENAI_RESPONSE_REJECTED');assert.equal(r.ticket,null);
});

test('a repeated reply is repaired once by GPT rather than returned to the client',async()=>{
  const h=harness([plan({message:'¿Qué luces observas en el equipo?'}),plan({message:'La luz roja puede indicar falta de señal. ¿Ya intentaste un reinicio normal del equipo?',pending_slot:'restart_result',facts:{...emptyFacts,red_light:true}})]);
  const r=await h.run(payload({message:'ya te dije que hay una roja',context:{customer:{id:'7'},conversation:{history:[],dialog_state:'GUIDED_DIAGNOSIS',last_assistant_message:'¿Qué luces observas en el equipo?'}}}));
  assert.equal(r.provider,'openai');assert.equal(h.requests.length,2);assert.equal(h.localCalls,0);assert.notEqual(r.response,'¿Qué luces observas en el equipo?');
});
test('exact service registry takes precedence and unknown instances are not invented',async()=>{
  let count=0;const repo=new ServiceIdentity({query:async()=>{count++;return {rows:[{customer_category:'NEGOCIO',active:true}]};}});
  assert.equal((await repo.resolve('1234567')).customer_category,'NEGOCIO');assert.equal(count,1);
  const unknown=new ServiceIdentity({query:async()=>({rows:[]})});assert.equal(await unknown.resolve('1234567'),null);
  assert.equal(profileSummary({customer_category:'HOGAR',category_verified:false}).category,null);
});
test('inactive exact records do not inherit a different prefix category',async()=>{
  let count=0;const repo=new ServiceIdentity({query:async()=>{count++;return {rows:[{active:false,customer_category:'NEGOCIO'}]};}});
  assert.equal(await repo.resolve('1234567'),null);assert.equal(count,1);
});
test('registry ignores obsolete economic inputs and rejects invalid classification inputs',()=>{
  assert.equal(Object.hasOwn(validateInstance({serviceNumber:'1234567',customerCategory:'INSTITUCION',reference:'Contrato verificado',monthlyFeeBob:'500'}),'fee'),false);
  assert.equal(validateInstance({serviceNumber:'1234567',customerCategory:'HOGAR',reference:'Contrato verificado',monthlyFeeBob:''}).fee,undefined);
  assert.throws(()=>validateInstance({serviceNumber:'1234567',customerCategory:'VIP',reference:'Contrato verificado'}));
  assert.equal(validateInstance({serviceNumber:'1234567',customerCategory:'HOGAR',reference:'Contrato verificado',monthlyFeeBob:-5}).fee,undefined);
});
test('profile capture never treats yes, no or a support interruption as personal data',()=>{
  assert.deepEqual(captureRequestedField('mi telefono es 71234567','phone'),{field:'phone',value:'71234567'});
  for(const text of ['no','si','no tengo internet','despues, ahora necesito ayuda','por que necesitas mi domicilio?'])assert.equal(captureRequestedField(text,'address'),null);
  assert.deepEqual(missingProfile({phone:'71234567',address:'Calle de prueba',zone:'Zona de prueba',ci:''}),['ci']);
});
test('verified institutional outage escalates while a self-asserted category does not',()=>{
  assert.equal(calculateTicketPriority({diagnosisCode:'SIN_INTERNET',text:'No tengo internet',customer:{customer_category:'INSTITUCION',category_verified:true}}).priority,'ALTA');
  assert.equal(calculateTicketPriority({diagnosisCode:'SIN_INTERNET',text:'No tengo internet',customer:{customer_category:'INSTITUCION',category_verified:false}}).priority,'MEDIA');
});

test('detailed WiFi instructions and 5 GHz intent are accepted without repair',async()=>{
 const message='Para cambiar la clave de tu WiFi:\n'+Array.from({length:8},(_,i)=>`${i+1}. Revisa la opción correspondiente en la configuración de tu propia red y confirma el cambio antes de reconectar los dispositivos. `).join('\n')+'\nNo compartas contraseñas ni pulses RESET. Si no tienes acceso administrativo, consulta con soporte. '+('Los nombres de los menús dependen del modelo. '.repeat(12));
 assert.ok(message.length>1400);
 const h=harness([plan({intent:'wifi_5ghz',action:'MESSAGE',pending_slot:'none',issue_summary:null,message})]);
 const r=await h.run(payload({message:'como cambiaria la contraseña de mi wifi huawei'}));
 assert.equal(r.provider,'openai');assert.equal(r.response,message);assert.equal(h.requests.length,1);assert.ok(h.requests[0].max_output_tokens>=2048);
});
test('stable technical questions do not spend a separate web request',async()=>{
 let searches=0;const h=harness([plan({action:'MESSAGE',pending_slot:'none',message:'La banda de 5 GHz requiere compatibilidad del dispositivo.'})]);
 const run=createOpenAIAssistant({apiKey:'fake',webEnabled:true,webResearch:async()=>{searches++;return {status:'verified',sources:[]};},usage:{reserve:async()=>1,settle:async()=>{}},fetchImpl:async()=>({ok:true,json:async()=>({status:'completed',usage:{input_tokens:10,output_tokens:10},output:[{content:[{type:'output_text',text:JSON.stringify(plan({action:'MESSAGE',pending_slot:'none',message:'La banda de 5 GHz requiere compatibilidad del dispositivo.'}))}]}]})})});
 const r=await run(payload({message:'¿Por qué mi red WiFi de 5 GHz no aparece?'}));assert.equal(r.provider,'openai');assert.equal(searches,0);
});
test('truncated structured output is retried once with a larger token allowance',async()=>{
 const requests=[];let count=0;const run=createOpenAIAssistant({apiKey:'fake',webEnabled:false,usage:{reserve:async()=>1,settle:async()=>{}},fetchImpl:async(url,args)=>{requests.push(JSON.parse(args.body));return {ok:true,json:async()=>++count===1?{status:'incomplete',incomplete_details:{reason:'max_output_tokens'},usage:{input_tokens:10,output_tokens:2048},output:[]}:{status:'completed',usage:{input_tokens:10,output_tokens:100},output:[{content:[{type:'output_text',text:JSON.stringify(plan())}]}]}};}});
 const r=await run(payload());assert.equal(r.provider,'openai');assert.equal(requests.length,2);assert.ok(requests[1].max_output_tokens>requests[0].max_output_tokens);
});
test('budget exhaustion is explicit and does not poison the next GPT history',async()=>{
 let calls=0;const run=createOpenAIAssistant({apiKey:'fake',webEnabled:false,usage:{reserve:async()=>{throw Object.assign(new Error('budget'),{code:'OPENAI_DAILY_BUDGET'});}},fetchImpl:async()=>{calls++;throw new Error('must not call');}});
 const context={customer:{id:'7'},openai_history:[{role:'user',content:'Mi WiFi está lento'}],conversation:{history:[],dialog_state:'START',last_assistant_message:'¿Ocurre en todos los dispositivos?'}};
 const r=await run(payload({context}));assert.equal(calls,0);assert.match(r.response,/límite diario/);assert.deepEqual(r.context.openai_history,context.openai_history);assert.equal(r.context.conversation.last_assistant_message,context.conversation.last_assistant_message);assert.equal(r.ticket,null);
});
test('photo capability question is answered as a normal support question',async()=>{
 const h=harness([plan({action:'MESSAGE',pending_slot:'none',intent:'adjuntar_imagen',issue_summary:null,message:'Puedes adjuntar una foto con el botón + como evidencia para el técnico. Actualmente no analizo imágenes en este chat. Si quieres orientación aquí, escribe el modelo y oculta las contraseñas de la etiqueta.'})]);
 const r=await h.run(payload({message:'si te mando una imagen puedes analizarla?'}));assert.equal(r.provider,'openai');assert.match(r.response,/Actualmente no analizo/);assert.equal(r.ticket,null);
});
