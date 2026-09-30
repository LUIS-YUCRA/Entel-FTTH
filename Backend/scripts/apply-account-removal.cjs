const fs = require('node:fs');
const path = require('node:path');
const {pool} = require('../src/config/db');
(async()=>{
  await pool.query(fs.readFileSync(path.join(__dirname,'../sql/009_account_removal_history.sql'),'utf8'));
  console.log('Applied 009: nullable account references; no accounts or tickets deleted.');
  console.log('Account foreign keys:',(await pool.query("SELECT conrelid::regclass::text AS table_name,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE contype='f' AND confrelid='users'::regclass")).rows);
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
