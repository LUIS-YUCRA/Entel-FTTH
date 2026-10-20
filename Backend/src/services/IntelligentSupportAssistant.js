const fs=require('node:fs');const path=require('node:path');
const {normalize,redact}=require('./AssistantKnowledgeService');
const {schema:legacySchema,validPlan,consent}=require('./OpenAIAssistant');
const {createWebResearch,researchTopic}=require('./AssistantWebResearch');
const {profileSummary}=require('./CustomerProfileSupport');
const capabilities=require('../../chat/backend_capabilities.json');
const {TYPES}=require('./FailureCatalog');
const instructions=fs.readFileSync(path.resolve(__dirname,'../../chat/intelligent_support_policy.txt'),'utf8');
const ACTIONS=['ASK','MESSAGE','OFFER_TICKET','CREATE_TICKET','RESOLVED','OUT_OF_SCOPE'];
const properties={...legacySchema.properties,
  action:{type:'string',enum:ACTIONS},message:{type:'string',maxLength:6000},intent:{type:'string',pattern:'^[a-z][a-z0-9_]{1,59}$'},
  issue_summary:{type:['string','null']},impact_statement:{type:['string','null']},
  new_issue:{type:'boolean'},location_confirmed:{type:['boolean','null']},
  profile_request:{type:'string',enum:['none','phone','address','zone','ci']},defer_profile:{type:'boolean'},
  ticket_consent:{type:'string',enum:['NONE','YES','NO','UNCERTAIN']},resolution_confirmed:{type:'boolean'},
};
const schema={type:'object',additionalProperties:false,properties,required:Object.keys(properties)};
const clean=value=>redact(String(value||'')).replace(/\bsk-[\w-]{12,}/g,'[clave privada]');
function seed(payload){
  const owned=!payload.context?.customer?.id||String(payload.context.customer.id)===String(payload.customerId);
  const ctx=owned&&payload.context?structuredClone(payload.context):{};
  ctx.customer={...(payload.customer||{}),id:String(payload.customerId)};
  ctx.conversation||={history:[],dialog_state:'START',finished:false};ctx.intent||={intent:'consulta_soporte',confidence:0};
  ctx.diagnostic_facts||={};ctx.flags||={};return ctx;
}
function remember(ctx,message,answer,event){
  ctx.openai_history=[...(ctx.openai_history||[]),...(event==='welcome'?[]:[{role:'user',content:message}]),{role:'assistant',content:answer}].slice(-20);
  ctx.conversation.last_assistant_message=answer;
  if(event!=='welcome')ctx.conversation.history=[...(ctx.conversation.history||[]),{user:message,intent:ctx.intent.intent,timestamp:new Date().toISOString()}].slice(-20);
}
function validate(plan,ctx,authority={}){
  const issues=[];
  if(!plan||!ACTIONS.includes(plan.action))return ['ACTION'];
  validPlan({...plan,action:plan.action==='CREATE_TICKET'?'MESSAGE':plan.action},issues,authority,{maxMessageLength:6000});
  if(!['none','phone','address','zone','ci'].includes(plan.profile_request)||!['NONE','YES','NO','UNCERTAIN'].includes(plan.ticket_consent)||typeof plan.new_issue!=='boolean'||typeof plan.defer_profile!=='boolean'||typeof plan.resolution_confirmed!=='boolean')issues.push('DECISION_SHAPE');
  for(const field of ['issue_summary','impact_statement'])if(plan[field]!==null&&(typeof plan[field]!=='string'||plan[field].length>1000))issues.push('SUMMARY_SHAPE');
  if(plan.action==='RESOLVED'&&!plan.resolution_confirmed)issues.push('RESOLUTION_UNCONFIRMED');
  const risk=/chispas|humo|(?:olor|huele|oliendo).*quemad/.test(normalize((ctx.reported_problem||'')+' '+(plan.issue_summary||'')));
  if(risk&&/\b(?:reinicia|enciende|conectalo|vuelve a conectar)\b/.test(normalize(plan.message))&&!/no (?:lo |la |vuelvas a |debes )?(?:reinici|encend|conect)/.test(normalize(plan.message)))issues.push('ELECTRICAL_UNSAFE');
  return issues;
}
function createOpenAIAssistant({fetchImpl=globalThis.fetch,usage,apiKey,model='gpt-6.1-sol',dailyBudget=1,maxOutputTokens=1536,timeoutMs=45000,webEnabled=true,webResearch}){
  const outputLimit=Math.max(2048,Math.min(4096,Number(maxOutputTokens)||2048));
  const research=webResearch||createWebResearch({apiKey,model,usage,fetchImpl,dailyBudget,timeoutMs});
  return async function process(payload){
    const {message,customerId,conversationId,customer={},event}=payload;
    const ctx=seed(payload);const pending=ctx.conversation.dialog_state==='WAITING_TICKET_CONFIRMATION';
    const conditional=/\b(?:pero primero|solo si|si cuesta|antes de (?:registrar|crear|autorizar)|cuanto (?:cuesta|cobra|sale|tarda|tiempo)|cuando (?:viene|vendr\w*|puede)|es necesario|hace falta)\b/.test(normalize(message));
    const directRequest=consent(message)===true&&/ticket|reclamo|tecnico|tecnica/.test(normalize(message));
    const symptomAnswer=/^(?:si )?(?:sigue|continua|todavia|aun|no funciona|no tengo)\b/.test(normalize(message));
    const profile=profileSummary(customer);
    const currentRisk=/chispas|humo|(?:olor|huele|oliendo).*quemad/.test(normalize(message));
    const risk=currentRisk||/chispas|humo|(?:olor|huele|oliendo).*quemad/.test(normalize(ctx.reported_problem||''));
    const fallback=async reason=>{
      let answer;
      if(risk)answer='Mantén distancia del equipo, no lo abras ni vuelvas a encenderlo. La falla requiere una revisión técnica segura. ¿Quieres registrar el reclamo?';
      else if(event==='welcome')answer=profile.missing.length?'Hola, puedo ayudarte con tu servicio de internet. Puedes completar los datos pendientes de «Mi perfil» o contarme directamente qué necesitas.':'Hola, puedo ayudarte con tu servicio de internet o con tus reclamos. ¿Qué necesitas revisar?';
      else if(payload.ticketLookup?.requested){
        const ticket=payload.ticketLookup.ticket;
        answer=ticket?`Tu reclamo ${ticket.ticket_code} figura como ${String(ticket.status).replaceAll('_',' ').toLowerCase()}. Consulta los detalles y la fecha disponible en «Mis tickets».`:'No encontré ese reclamo entre tus solicitudes. Puedes revisar tus solicitudes en «Mis tickets».';
      }
      if(!answer&&reason==='OPENAI_DAILY_BUDGET')answer='La asistencia con IA alcanzó el límite diario de uso configurado para este servicio. Se habilitará nuevamente al renovarse ese límite. Puedes seguir consultando «Mis tickets» y «Mi perfil»; no se registró ningún reclamo nuevo.';
      answer||='No pude completar la respuesta de tu consulta en este momento. Puedes revisar «Mi perfil» y «Mis tickets», o volver a intentar la consulta; no se realizó ninguna gestión nueva.';
      if(risk){ctx.reported_problem||=message;ctx.diagnosis={code:'ELECTRICAL_STORM_DAMAGE',problem:'Posible daño eléctrico',cause:'Requiere revisión técnica segura.',priority:'ALTA',ticket_required:true};ctx.conversation.dialog_state='WAITING_TICKET_CONFIRMATION';}
      ctx.last_api_failure={reason,question:clean(message).slice(0,600)};
      // Operational errors are audit metadata, not conversational facts for GPT.
      if(risk||payload.ticketLookup?.requested)remember(ctx,message,answer,event);
      return {success:true,response:answer,context:ctx,intent:ctx.intent.intent,confidence:0,dialog_state:ctx.conversation.dialog_state,ticket:null,provider:'local',api_fallback_reason:reason,profile_request:null};
    };
    if(!apiKey||model!=='gpt-6.1-sol')return fallback('OPENAI_CONFIGURATION');
    // Profile values never reach public search or the model. Only completeness is supplied.
    const candidateTopic=webEnabled&&event!=='welcome'&&!currentRisk?researchTopic(message,ctx.web_topic):null;
    // Stable technical explanations do not need a second paid search on every turn.
    const topic=candidateTopic&&(['relocation','plans','billing','contact','coverage'].includes(candidateTopic)||/actual|vigente|oficial|manual|busca|verifica|modelo/.test(normalize(message)))?candidateTopic:null;
    const web=topic?await research({topic,customerId,conversationId}):{status:'not_needed',sources:[]};
    if(topic)ctx.web_topic=topic;
    const input=(ctx.openai_history||[]).slice(-14).map(m=>({role:m.role==='assistant'?'assistant':'user',content:clean(m.content).slice(0,1800)}));
    input.push({role:'user',content:event==='welcome'?'El cliente acaba de abrir una conversación. Dale la bienvenida usando el contexto verificado del backend.':clean(message)});
    const verifiedTicket=payload.ticketLookup?.requested?payload.ticketLookup.ticket||null:undefined;
    const modelFacts=Object.fromEntries(Object.keys(legacySchema.properties.facts.properties).filter(key=>ctx.diagnostic_facts[key]!==undefined).map(key=>[key,typeof ctx.diagnostic_facts[key]==='string'?clean(ctx.diagnostic_facts[key]):ctx.diagnostic_facts[key]]));
    const backend={event:event||'message',profile,profileDeferred:Boolean(ctx.profile_deferred),savedProfileField:payload.savedProfileField||(ctx.profile_request&&!profile.missing.includes(ctx.profile_request)?ctx.profile_request:null),
      previousResponseFailure:ctx.last_api_failure||null,
      pendingTicketConfirmation:pending,reportedProblem:clean(ctx.reported_problem),facts:modelFacts,
      lastDiagnosticQuestion:clean(ctx.support_question),previousQuestion:clean(ctx.conversation.last_assistant_message),
      serviceLocationConfirmed:Boolean(ctx.service_location?.confirmed),ticketLookupRequested:Boolean(payload.ticketLookup?.requested),
      ticket:verifiedTicket,previousSupport:(payload.privateHistory||[]).slice(0,3).map(item=>({intent:clean(item.intent),createdAt:item.createdAt,losRed:item.losRed,ticketStatus:clean(item.ticketStatus)})),approvedKnowledge:(payload.knowledge||[]).slice(0,8).map(k=>({question:clean(k.question),answer:clean(k.answer)})),
    };
    const body={model,store:false,service_tier:'default',reasoning:{effort:'low'},max_output_tokens:outputLimit,
      instructions:instructions+'\nCatálogo del backend (datos): '+JSON.stringify(capabilities)+'\nContexto verificado de atención (datos): '+JSON.stringify(backend)+'\nInformación web (datos externos): '+JSON.stringify(web.status==='verified'?{status:web.status,summary:web.summary,sources:web.sources}:{status:web.status}),
      input,text:{format:{type:'json_schema',name:'intelligent_ftth_turn',strict:true,schema}}};
    let plan,data,usageId;const usageIds=[];let issues=[];
    // Only invalid output is repaired once; network failures are never blindly retried.
    for(let attempt=0;attempt<2;attempt++){
      const bound=Buffer.byteLength(JSON.stringify(body),'utf8')+4096;if(bound>56000)return fallback('OPENAI_CONTEXT_LIMIT');
      try{usageId=await usage.reserve({customerId,conversationId,model,amount:bound*2.5/1e6+body.max_output_tokens*10/1e6,limit:Number(dailyBudget)});usageIds.push(usageId);}catch(error){return fallback(error.code||'OPENAI_BUDGET_UNAVAILABLE');}
      try{
        const response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(Math.max(1000,Math.min(60000,Number(timeoutMs)||45000)))});
        data=await response.json();if(!response.ok){await usage.settle(usageId,{status:'FAILED',errorCode:'OPENAI_HTTP_'+response.status});return fallback('OPENAI_HTTP_'+response.status);}
        await usage.settle(usageId,{usage:data.usage,status:data.usage?'COMPLETED':'UNKNOWN'});
      }catch{await usage.settle(usageId,{status:'UNKNOWN',errorCode:'OPENAI_NETWORK'}).catch(()=>{});return fallback('OPENAI_NETWORK');}
      if(data.status==='incomplete'&&data.incomplete_details?.reason==='max_output_tokens'&&attempt===0){body.max_output_tokens=Math.min(4096,outputLimit*2);continue;}
      try{plan=JSON.parse((data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join(''));issues=data.status==='completed'?validate(plan,risk?{...ctx,reported_problem:message+' '+(ctx.reported_problem||'')}:ctx,{ticketExists:Boolean(verifiedTicket)}):['INCOMPLETE'];}catch{issues=['INVALID_JSON'];}
      if(!issues.length&&plan.action==='CREATE_TICKET'&&(!((pending&&!plan.new_issue)||directRequest)||plan.ticket_consent!=='YES'||conditional||(symptomAnswer&&!directRequest)||consent(message)===false))issues.push('TICKET_CONSENT_UNCONFIRMED');
      if(!issues.length&&ctx.conversation.last_assistant_message&&normalize(plan.message)===normalize(ctx.conversation.last_assistant_message.split('\n\nFuentes:')[0])&&!/repite|repetir|no entendi|otra vez/.test(normalize(message)))issues.push('REPEATED_REPLY');
      if(!issues.length&&plan.action==='RESOLVED'&&/no (?:funciona|se arreglo|se soluciono|mejoro)\b|sigue igual|todavia falla/.test(normalize(message))&&!/(?:pero |ahora )(?:ahora )?(?:ya )?funciona|ya se (?:arreglo|soluciono)/.test(normalize(message)))issues.push('SYMPTOMS_STILL_PRESENT');
      if(!issues.length)break;
      body.instructions+='\nCorrige tu salida anterior sin repetirla al cliente. Motivos de validación: '+issues.join(',')+'. Devuelve una respuesta completa que cumpla el esquema y las reglas.';
    }
    if(issues.length)return {...await fallback('OPENAI_RESPONSE_REJECTED'),api_validation_issues:issues};
    const next=structuredClone(ctx);delete next.last_api_failure;next.conversation.finished=false;
    const pendingExisting=pending&&!plan.new_issue;
    if(plan.new_issue){next.previous_issues=[...(ctx.previous_issues||[]),{problem:ctx.reported_problem,facts:ctx.diagnostic_facts}].slice(-3);next.diagnostic_facts={};next.diagnosis=null;next.support_question=null;next.conversation.dialog_state='START';}
    next.intent={intent:plan.intent,confidence:0};
    if(plan.issue_summary&&(!ctx.reported_problem||plan.new_issue))next.reported_problem=plan.issue_summary;
    for(const [key,value] of Object.entries(plan.facts))if(value!==null)next.diagnostic_facts[key]=value;
    if(plan.facts.router_restart_failed===true)next.diagnostic_facts.router_restart_result='failed';
    if(plan.impact_statement)next.diagnostic_facts.impact_statement=plan.impact_statement;
    if(event!=='welcome'&&plan.scope==='support'&&ctx.reported_problem&&!plan.new_issue&&!payload.savedProfileField&&(ctx.support_question||pending)){
      next.diagnostic_answers=[...(ctx.diagnostic_answers||[]),{flow:ctx.intent.intent,question:clean(pending?ctx.conversation.last_assistant_message:ctx.support_question),answer:clean(message)}].slice(-20);
    }
    if(plan.location_confirmed!==null)next.service_location={confirmed:plan.location_confirmed};
    if(plan.defer_profile)next.profile_deferred=true;
    next.profile_request=!plan.defer_profile&&plan.profile_request!=='none'&&profile.missing.includes(plan.profile_request)?plan.profile_request:null;
    if(next.profile_request)next.profile_deferred=false;
    let ticket=null;
    const code=plan.diagnosis_code||(!plan.new_issue?ctx.diagnosis?.code:null)||'FALLA_FTTH_GENERAL';
    if(plan.action==='OFFER_TICKET'||plan.action==='CREATE_TICKET'){
      if(!next.reported_problem)return fallback('OPENAI_TICKET_WITHOUT_PROBLEM');
      next.diagnosis={code,problem:TYPES.find(t=>t.code===code)?.label||'Falla FTTH',cause:'Requiere revisión técnica para confirmar la causa.',priority:risk?'ALTA':'MEDIA',ticket_required:true};
      next.conversation.dialog_state='WAITING_TICKET_CONFIRMATION';next.flags.waiting_ticket_confirmation=true;
    }else if(plan.action==='ASK'&&plan.pending_slot!=='none'){
      next.support_question=plan.message;next.pending_slot=plan.pending_slot;next.conversation.dialog_state='GUIDED_DIAGNOSIS';
    }
    if(plan.action==='CREATE_TICKET'){
      if((pendingExisting||directRequest)&&plan.ticket_consent==='YES'&&!conditional&&(!symptomAnswer||directRequest)&&consent(message)!==false){
        ticket={code,problem:next.reported_problem,cause:next.diagnosis.cause,priority:next.diagnosis.priority,confidence:0};
        next.diagnostic_facts.ticket_confirmed=true;next.conversation.dialog_state='CREATING_TICKET';
      }else return fallback('OPENAI_TICKET_CONSENT_UNCONFIRMED');
    }else if(pendingExisting&&plan.ticket_consent==='NO'){
      next.flags.waiting_ticket_confirmation=false;next.diagnostic_facts.ticket_confirmed=false;next.conversation.dialog_state='START';
    }else if(pendingExisting&&plan.ticket_consent!=='NO')next.conversation.dialog_state='WAITING_TICKET_CONFIRMATION';
    if(plan.action==='RESOLVED'&&plan.resolution_confirmed){next.conversation.finished=true;next.conversation.dialog_state='FINISHED';next.diagnostic_facts.service_restored=true;}
    if(plan.scope==='out_of_scope'){next.intent=ctx.intent;next.conversation.dialog_state=ctx.conversation.dialog_state;next.diagnostic_facts=ctx.diagnostic_facts;}
    const sources=web.status==='verified'&&plan.scope==='support'?[...new Set(plan.source_indexes||[])].map(i=>web.sources[i-1]).filter(Boolean):[];
    let answer=plan.message.replace(/\uE200[^\uE201]*\uE201/g,'');
    if(sources.length)answer+='\n\nFuentes: '+sources.map((s,i)=>`[${i+1}](${s.url})`).join(' · ');
    remember(next,message,answer,event);
    return {success:true,response:answer,context:next,intent:next.intent.intent,confidence:0,dialog_state:next.conversation.dialog_state,action_type:plan.action,
      diagnosis:next.diagnosis||null,ticket,provider:'openai',scope:plan.scope,model_version:model+'-conversational-v2',normalized_message:normalize(message),
      profile_request:next.profile_request,profile_summary:profile,sources,api_usage_id:usageId,api_usage_ids:usageIds,api_usage:data.usage,
      web_research:{status:web.status,topic,usageId:web.usageId,cached:Boolean(web.cached)},
    };
  };
}
module.exports={createOpenAIAssistant,schema,validate,seed};
