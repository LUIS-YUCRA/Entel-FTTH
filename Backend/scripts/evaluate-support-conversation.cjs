// Explicit live evaluation of the production adapter; synthetic data, no DB writes.
require('../src/config/env');
const fs=require('node:fs');
const path=require('node:path');
const {createOpenAIAssistant}=require('../src/services/OpenAIAssistant');
const {processLocalAssistantMessage}=require('../src/services/AssistantBridge');
const {closeAssistantWorkers}=require('../src/services/PythonRuntime');
async function main(){
  if(!process.argv.includes('--live'))throw new Error('LIVE_FLAG_REQUIRED');
  if(!process.env.OPENAI_API_KEY)throw new Error('API_KEY_NOT_CONFIGURED');
  let reserved=0;
  const usage={reserve:async({amount})=>{if(reserved+amount>.50)throw new Error('EVALUATION_BUDGET');reserved+=amount;return String(reserved);},settle:async()=>{}};
  const run=createOpenAIAssistant({localProcessor:processLocalAssistantMessage,apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL||'gpt-6.1-sol',usage,webEnabled:process.argv.includes('--web')});
  const scenarios=[
    ['electrical',['mi router huele a quemado','entonces tiene que venir alguien ?','y eso tiene costo?']],
    ['information',['que diferencia hay entre wifi y fibra','como veo mis reclamos en este sistema','cuanto cuesta el plan de 100 megas']],
    ['diagnostic interruption',['mi internet esta lento','si en mi domicilio','por que me preguntas eso?','que diferencia hay entre wifi y cable?']],
    ['system',['como veo mis reclamos en este sistema','como recupero mi contraseña','puedes cambiarme al plan de 200 megas?','si reinicio se borra mi wifi?']],
    ['commercial',['puedes cambiarme al plan de 200 megas?']],
  ];
  const rows=[];
  for(const [scenario,messages] of scenarios){
    const selected=process.argv.find(arg=>arg.startsWith('--scenario='))?.split('=')[1];
    if(selected&&scenario!==selected)continue;
    let context=null;
    for(const message of messages){
      const r=await run({message,customerId:'evaluation-synthetic',customer:{zone:'Zona de prueba'},context});
      context=r.context;
      rows.push({scenario,message,response:r.response,provider:r.provider,fallback:r.api_fallback_reason,validation:r.api_validation_issues,state:r.dialog_state,ticket:Boolean(r.ticket),usage:r.api_usage,web:r.web_research});
      console.log(JSON.stringify(rows.at(-1)));
    }
  }
  const output=path.resolve(__dirname,'../../tmp/support-conversation-evaluation-'+Date.now()+'.json');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify({date:new Date().toISOString(),reservedUpperBoundUsd:reserved,rows},null,2));
}
main().catch(e=>{console.error(e.code||e.message);process.exitCode=1;}).finally(()=>closeAssistantWorkers());
