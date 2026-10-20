require('../src/config/env');
const fs=require('node:fs');const path=require('node:path');const {pool}=require('../src/config/db');
pool.query(fs.readFileSync(path.resolve(__dirname,'../sql/014_service_identity_onboarding.sql'),'utf8')).then(()=>pool.query(fs.readFileSync(path.resolve(__dirname,'../sql/015_remove_economic_priority.sql'),'utf8'))).then(()=>pool.query(fs.readFileSync(path.resolve(__dirname,'../sql/015_remove_economic_priority.sql'),'utf8')))
  .then(()=>console.log('Migración de identidad de servicio y perfil completada. No se crearon categorías ficticias. Prioridad sin facturación.'))
  .catch(error=>{console.error('MIGRATION_FAILED',error.code||error.name);process.exitCode=1;})
  .finally(()=>pool.end());
