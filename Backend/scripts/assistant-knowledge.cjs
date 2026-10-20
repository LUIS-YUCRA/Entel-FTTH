const fs=require('node:fs');const path=require('node:path');
const {pool}=require('../src/config/db');const {knowledge}=require('../src/services/AssistantKnowledgeService');
async function main(){
 const command=process.argv[2];
 if(command==='migrate'){await pool.query(fs.readFileSync(path.join(__dirname,'../sql/011_assistant_learning.sql'),'utf8'));console.log('Migración adicional 011 aplicada.');}
 else if(command==='collect'){let batch;let total=0;do{batch=await knowledge.collect(200);total+=batch.inserted;}while(batch.scanned===200);console.log({imported:total});}
 else if(command==='metrics')console.log(await knowledge.metrics());
 else if(command==='export'){
  const destination=process.argv[3];if(!destination)throw new Error('Indica un archivo JSON de salida.');
  const rows=await knowledge.approved();const data=rows.map(r=>({knowledgeKey:r.knowledge_key,version:r.version,status:'VALIDATED',privacyReviewed:true,question:r.question,variants:r.variants,intent:r.intent}));
  fs.writeFileSync(destination,JSON.stringify(data,null,2),{encoding:'utf8',flag:'wx'});console.log(`${data.length} grupos revisados exportados; sin transcripciones ni identificadores de clientes.`);
 }else throw new Error('Uso: node scripts/assistant-knowledge.cjs migrate|collect|metrics|export [archivo.json]');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool.end());
