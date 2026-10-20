// Explicit paid evaluation of the production adapter. Synthetic customers; no DB writes.
require('../src/config/env');
const fs=require('node:fs');const path=require('node:path');
const {createOpenAIAssistant}=require('../src/services/IntelligentSupportAssistant');
const {processLocalAssistantMessage}=require('../src/services/AssistantBridge');
const {closeAssistantWorkers}=require('../src/services/PythonRuntime');
const scenarios=[
  {name:'01 · Olor a quemado y visita',messages:['buenos dias','mi router huele a quemado','entonces tiene que venir alguien?','y eso tiene costo?','no gracias, primero consultare el costo']},
  {name:'02 · Traslado de domicilio',messages:['hola','me cambie de domicilio y quiero llevarme el equipo de internet','puedo conectarlo yo en la nueva casa?','que necesito para pedir el traslado?','gracias, voy a solicitarlo con ENTEL']},
  {name:'03 · Lentitud y explicación del diagnóstico',messages:['buenas tardes','mi internet esta lento','si, en mi domicilio','por que me preguntas cuantos dispositivos?','en todos, por wifi y por cable','pause las descargas y ahora ya funciona bien','gracias por la ayuda']},
  {name:'04 · Fibra cortada',messages:['hola','no tengo internet, el cable de fibra esta cortado','si, en mi domicilio','puedo unirlo con cinta mientras llega alguien?','no quiero registrar el reclamo por ahora, gracias']},
  {name:'05 · Cobertura WiFi',messages:['hola','cerca del router funciona bien pero en mi cuarto el wifi esta lento','si, en mi casa','por que pasa si tengo fibra?','ya use el equipo cerca del router y ahora funciona bien, gracias']},
  {name:'06 · Planes y tarifas actuales',messages:['hola','cuanto cuesta el plan de fibra de 100 megas de ENTEL?','el precio incluye instalacion?','puedes cambiarme el plan desde aqui?','gracias, consultare con atencion comercial']},
  {name:'07 · Reclamos y evidencias en el sistema',messages:['buenas','como veo mis reclamos en este sistema?','puedo adjuntar un video y de cuanto tamaño?','como veo quien es mi tecnico?','gracias, ya encontre Mis tickets']},
  {name:'08 · Cuenta y recuperación de acceso',messages:['hola','olvide la contraseña para entrar al sistema','puedes cambiarla por mi desde aqui?','eso cambia tambien la contraseña de mi wifi?','gracias, usare la opcion de recuperar contraseña']},
  {name:'09 · Estado y visita de un ticket propio',fixture:true,messages:['hola','como esta mi reclamo?','cuando viene el tecnico?','puedes adelantar la visita para hoy?','gracias, revisare la fecha en Mis tickets']},
  {name:'10 · Reinicio, RESET y continuidad',messages:['buenos dias','si reinicio el router se borra mi wifi?','y si mantengo presionado RESET?','entonces como hago un reinicio normal?','entendido, gracias']},
];
async function main(){
  if(!process.argv.includes('--live'))throw new Error('LIVE_FLAG_REQUIRED');
  if(!process.env.OPENAI_API_KEY)throw new Error('API_KEY_NOT_CONFIGURED');
  const stamp=Date.now();const out=path.resolve(__dirname,'../../tmp/conversaciones-web-'+stamp);fs.mkdirSync(out,{recursive:true});
  const pending=new Map();let counter=0;let spent=0;
  const report={started:new Date().toISOString(),model:process.env.OPENAI_MODEL||'gpt-6.1-sol',budgetUsd:4,scope:'GPT real + motor local real; clientes ficticios; ticket de escenario 09 es una fixture. Sin persistir clientes, tickets ni mensajes.',scenarios:[]};
  const save=()=>{
    report.conservativeSpendUsd=spent;fs.writeFileSync(path.join(out,'resultados.json'),JSON.stringify(report,null,2));
    let md='# Diez conversaciones con búsqueda web y contexto del backend\n\n'+report.scope+'\n\n';
    for(const s of report.scenarios){md+='## '+s.name+'\n\n';if(s.fixture)md+='El estado del ticket usa datos ficticios de prueba, no un reclamo real.\n\n';
      for(const turn of s.turns)md+='**Cliente:** '+turn.message+'\n\n**Asistente:** '+turn.response+'\n\n';
      md+='Validación: '+(s.issues.length?s.issues.join('; '):'sin incidencias detectadas')+'.\n\n';}
    fs.writeFileSync(path.join(out,'conversaciones.md'),md);
  };
  const usage={reserve:async({amount})=>{if(spent+[...pending.values()].reduce((a,b)=>a+b,0)+amount>report.budgetUsd)throw Object.assign(new Error('EVALUATION_BUDGET'),{code:'EVALUATION_BUDGET'});const id=String(++counter);pending.set(id,amount);return id;},settle:async(id,{usage,status,toolCostUsd=0})=>{const reserved=pending.get(id)||0;pending.delete(id);spent+=status==='FAILED'?0:usage?(usage.input_tokens||0)*2.5/1e6+(usage.output_tokens||0)*10/1e6+toolCostUsd:reserved;}};
  const run=createOpenAIAssistant({localProcessor:processLocalAssistantMessage,apiKey:process.env.OPENAI_API_KEY,model:report.model,usage,dailyBudget:4,webEnabled:true,timeoutMs:60000,maxOutputTokens:1536});
  const selected=process.argv.find(arg=>arg.startsWith('--scenario='))?.split('=')[1];
  for(const s of scenarios){
    if(selected&&!s.name.startsWith(selected))continue;
    const row={name:s.name,fixture:Boolean(s.fixture),turns:[],issues:[]};report.scenarios.push(row);let context=null;
    for(const message of s.messages){
      const ticketLookup=s.fixture&&/como esta|cuando viene/.test(message)?{requested:true,ticket:{ticket_code:'TK-PRUEBA',status:'PENDIENTE',scheduled_at:null}}:{};
      const r=await run({message,customerId:'synthetic-evaluation-'+s.name.slice(0,2),customer:{zone:'Zona ficticia',phone:'70000000',ci:'1234567',address:'Calle ficticia',service_number:'99999999',customer_category:'HOGAR',category_verified:true},context,ticketLookup});context=r.context;
      const turn={message,response:r.response,provider:r.provider,fallback:r.api_fallback_reason,validation:r.api_validation_issues,state:r.dialog_state,web:r.web_research,ticketCandidate:Boolean(r.ticket)};row.turns.push(turn);
      if(r.api_fallback_reason&&/^OPENAI_|EVALUATION_/.test(r.api_fallback_reason))row.issues.push(message+': '+r.api_fallback_reason+' '+(r.api_validation_issues||[]).join(','));
      if(row.turns.length>1&&row.turns.at(-2).response===r.response)row.issues.push(message+': respuesta repetida');
      if(/\uE200|\uE201/.test(r.response))row.issues.push(message+': marcador de cita sin renderizar');
      save();console.log(JSON.stringify({scenario:s.name,turn:row.turns.length,...turn}));
      if(r.dialog_state==='FINISHED')break;
    }
  }
  report.completed=new Date().toISOString();save();console.log('REPORT_DIRECTORY='+out);
}
main().catch(e=>{console.error(e.code||e.message);process.exitCode=1;}).finally(()=>closeAssistantWorkers());
