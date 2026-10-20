const fs=require('node:fs');
const path=require('node:path');
const {processAssistantMessage}=require('../src/services/AssistantBridge');
const {closeAssistantWorkers}=require('../src/services/PythonRuntime');
(async()=>{
  const messages=['Buenas tardes','Tengo una duda','Tengo falla en mi internet q ago','No funciona nada','Si esta roja','El cable esta bien conectado'];
  const turns=[];let context;
  try{
    for(const message of messages){
      const start=performance.now();
      const result=await processAssistantMessage({message,customerId:'benchmark',context});
      context=result.context;
      turns.push({message,response:result.response,intent:result.intent,state:result.dialog_state,latencyMs:Math.round(performance.now()-start),nlp:result.nlp_backend});
      if(result.ticket)throw new Error('El ejemplo no debe proponer registro sin consentimiento.');
    }
    const report={timestamp:new Date().toISOString(),synthetic:true,persistedTickets:0,turns,
      firstTurnMs:turns[0].latencyMs,warmMeanMs:Math.round(turns.slice(1).reduce((sum,t)=>sum+t.latencyMs,0)/(turns.length-1))};
    fs.writeFileSync(path.resolve(__dirname,'../../deploy/ASISTENTE-conversacion-real.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  }finally{closeAssistantWorkers();}
})().catch(error=>{console.error(error.code||error.name);process.exitCode=1;});
