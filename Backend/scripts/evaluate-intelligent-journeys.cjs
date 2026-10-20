require('../src/config/env');
const fs=require('node:fs');const path=require('node:path');
const {createOpenAIAssistant}=require('../src/services/IntelligentSupportAssistant');
const {calculateTicketPriority}=require('../src/services/TicketPriorityService');
async function main(){
  if(!process.argv.includes('--live')||!process.env.OPENAI_API_KEY)throw new Error('EXPLICIT_LIVE_CONFIGURATION_REQUIRED');
  let spent=0;let counter=0;const reservations=new Map();
  const usage={reserve:async({amount})=>{if(spent+[...reservations.values()].reduce((a,b)=>a+b,0)+amount>3)throw Object.assign(new Error('Budget'),{code:'EVALUATION_BUDGET'});const id=++counter;reservations.set(id,amount);return id;},settle:async(id,{usage,status,toolCostUsd=0})=>{const reserve=reservations.get(id)||0;reservations.delete(id);spent+=status==='FAILED'?0:usage?(usage.input_tokens||0)*2.5/1e6+(usage.output_tokens||0)*10/1e6+toolCostUsd:reserve;}};
  const run=createOpenAIAssistant({apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL||'gpt-6.1-sol',usage,dailyBudget:3,webEnabled:true,timeoutMs:60000,maxOutputTokens:2048});
  const output=path.resolve(__dirname,'../../tmp/intelligent-journeys-'+Date.now());fs.mkdirSync(output,{recursive:true});
  const scenarios=[
    {name:'Perfil pendiente y falla urgente',customer:{customer_category:'NEGOCIO',category_verified:true,service_number:'99999901',phone:'',ci:'',address:'',zone:''},turns:[{event:'welcome',message:'Inicio de atención'},{message:'Ya completé mi teléfono en el perfil.',patch:{phone:'70000001'}},{message:'Lo demás después. Ahora no tengo internet y no puedo cobrar a mis clientes.'},{message:'la luz LOS esta roja y ya reinicie pero no funciona'},{message:'entonces tiene que venir alguien?'},{message:'sí, pero primero dime si tiene costo'},{message:'de una, registralo por favor'}]},
    {name:'Institución y respuesta negativa contextual',customer:{customer_category:'INSTITUCION',category_verified:true,service_number:'99999902',phone:'70000002',ci:'1234567',address:'Domicilio ficticio',zone:'Zona ficticia'},turns:[{event:'welcome',message:'Inicio de atención'},{message:'el internet esta lento en todas las computadoras, por wifi y por cable'},{message:'estamos dando clases por videollamada y no se puede continuar'},{message:'pause las descargas y ahora funciona bien'},{message:'gracias'}]},
    {name:'Instancia sin clasificación y límites de categoría',customer:{customer_category:'HOGAR',category_verified:false,service_number:'99999903',phone:'70000003',ci:'1234567',address:'Domicilio ficticio',zone:'Zona ficticia'},turns:[{event:'welcome',message:'Inicio de atención'},{message:'mi cuenta dice categoria pendiente, puedo poner institucion para que me atiendan primero?'},{message:'quien debe cargar esa categoria?'},{message:'gracias'}]},
    {name:'Hogar, rechazo de ticket y consulta posterior',customer:{customer_category:'HOGAR',category_verified:true,service_number:'99999904',phone:'70000004',ci:'1234567',address:'Domicilio ficticio',zone:'Zona ficticia'},turns:[{event:'welcome',message:'Inicio de atención'},{message:'mi fibra esta cortada y no tengo internet'},{message:'no quiero registrar el ticket por ahora'},{message:'y puedo unir el cable con cinta mientras tanto?'},{message:'entendido gracias'}]},
  ];
  const results=[];
  const save=()=>{
    fs.writeFileSync(path.join(output,'resultados.json'),JSON.stringify({scope:'GPT real; datos de clientes y confirmaciones de perfil son fixtures; sin escrituras en la base de datos ni notificaciones externas.',spentConservativeUsd:spent,results},null,2));
    let md='# Validación del asistente conversacional con identidad y perfil\n\nRespuestas reales de GPT con datos ficticios. Los guardados de perfil se simulan en estas conversaciones; la persistencia real se verifica por separado con PostgreSQL y rollback. Las propuestas de ticket no se guardan ni envían notificaciones durante esta evaluación.\n\n';
    for(const s of results){md+='## '+s.name+'\n\n';for(const t of s.turns)md+=(t.event==='welcome'?'**Inicio de atención**':'**Cliente:** '+t.message)+'\n\n**Asistente:** '+t.response+'\n\n';}
    fs.writeFileSync(path.join(output,'conversaciones.md'),md);
  };
  for(const scenario of scenarios){const row={name:scenario.name,turns:[]};results.push(row);let context=null;let customer={...scenario.customer};
    for(const turn of scenario.turns){customer={...customer,...turn.patch};const r=await run({message:turn.message,event:turn.event,customerId:'synthetic-journey',customer,context});context=r.context;
      const record={message:turn.message,event:turn.event,response:r.response,provider:r.provider,fallback:r.api_fallback_reason,validation:r.api_validation_issues,state:r.dialog_state,profileRequest:r.profile_request,deferred:r.context?.profile_deferred,ticketCandidate:Boolean(r.ticket),web:r.web_research};
      if(r.ticket)record.priority=calculateTicketPriority({diagnosisCode:r.ticket.code,text:r.context.reported_problem+' '+(r.context.diagnostic_facts.impact_statement||''),customer,facts:r.context.diagnostic_facts});
      row.turns.push(record);save();console.log(JSON.stringify({scenario:scenario.name,...record}));if(r.ticket||r.dialog_state==='FINISHED')break;
    }
  }
  console.log('REPORT_DIRECTORY='+output);
}
main().catch(e=>{console.error(e.code||e.message);process.exitCode=1;});
