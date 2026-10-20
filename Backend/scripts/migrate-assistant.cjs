require('../src/config/env');
const fs=require('node:fs');
const path=require('node:path');
const {pool}=require('../src/config/db');
(async()=>{
  try{
    const required=['assistant_knowledge_candidates','conversation_messages','support_tickets'];
    for(const table of required){
      const result=await pool.query('SELECT to_regclass($1) relation',[table]);
      if(!result.rows[0].relation)throw new Error('Falta una dependencia del asistente: '+table+'. Revisa las migraciones 001 a 011 en la base configurada.');
    }
    await pool.query(fs.readFileSync(path.resolve(__dirname,'../sql/012_assistant_candidate_dedup.sql'),'utf8'));
    await pool.query(fs.readFileSync(path.resolve(__dirname,'../sql/013_openai_usage.sql'),'utf8'));
    console.log('Migraciones 012 y 013 completadas; no se borraron datos.');
  }catch(error){console.error('Migración del asistente:',error.code||error.message);process.exitCode=1;}
  finally{await pool.end();}
})();
