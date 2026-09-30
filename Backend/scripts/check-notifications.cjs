require('dotenv').config({ quiet: true });
const { pool } = require('../src/config/db');
const nodemailer = require('nodemailer');
async function run() {
  console.log('SMTP configuration present:', Object.fromEntries(['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD','EMAIL_USER','EMAIL_PASS'].map(key => [key, Boolean(process.env[key])])));
  console.log('Ticket states:', (await pool.query('SELECT status,count(*)::int FROM support_tickets GROUP BY status')).rows);
  console.log('Mail states:', (await pool.query('SELECT email_status,count(*)::int FROM notifications GROUP BY email_status')).rows);
  console.log('Administrator counts:', (await pool.query("SELECT is_active,count(*)::int FROM users WHERE user_type='administrador' GROUP BY is_active")).rows);
  console.log('Customer distribution:', (await pool.query("SELECT customer_id,status,count(*)::int FROM support_tickets GROUP BY customer_id,status ORDER BY customer_id,status")).rows);
  const transport = nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT),secure:Number(process.env.SMTP_PORT)===465,auth:{user:process.env.SMTP_USER||process.env.EMAIL_USER,pass:process.env.SMTP_PASSWORD||process.env.EMAIL_PASS},connectionTimeout:10000,socketTimeout:10000});
  let deadline;
  try { await Promise.race([transport.verify(), new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Object.assign(new Error('timeout'),{code:'VERIFICATION_TIMEOUT'})),15000);})]); console.log('SMTP connection and authentication: OK (no email sent)'); }
  catch (error) { console.log('SMTP verification failed:', {code:error.code,responseCode:error.responseCode,command:error.command}); }
  finally { clearTimeout(deadline); transport.close(); }
}
run().catch(error => {console.log('Diagnostic error:',error.code);process.exitCode=1;}).finally(async()=>{await pool.end();process.exit(process.exitCode||0);});
