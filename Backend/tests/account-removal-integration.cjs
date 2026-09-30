const assert = require('node:assert/strict');
const {pool} = require('../src/config/db');
const {removeAccount} = require('../src/services/AccountRemovalService');
(async()=>{
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const stamp=Date.now();
    const actor=(await client.query("INSERT INTO users(full_name,email,password,user_type) VALUES ('Test actor',$1,'not-a-login-hash','operador') RETURNING id",[`actor-${stamp}@example.test`])).rows[0].id;
    const target=(await client.query("INSERT INTO users(full_name,email,password,user_type) VALUES ('Test deletion',$1,'not-a-login-hash','cliente') RETURNING id",[`target-${stamp}@example.test`])).rows[0].id;
    const ticket=(await client.query("INSERT INTO support_tickets(ticket_code,customer_id,operator_id,technician_id,title,description) VALUES($1,$2,$2,$2,'Test','Test') RETURNING id",[`QA-${stamp}`,target])).rows[0].id;
    await client.query("INSERT INTO ticket_history(ticket_id,changed_by,action) VALUES($1,$2,'TEST')",[ticket,target]);
    const conversation=(await client.query('INSERT INTO conversations(customer_id,ticket_id) VALUES($1,$2) RETURNING id',[target,ticket])).rows[0].id;
    await client.query("INSERT INTO evidences(uploaded_by,conversation_id,ticket_id,original_name,stored_name,mime_type,size_bytes,file_path) VALUES($1,$2,$3,'test','test','image/png',0,'test-only')",[target,conversation,ticket]);
    const transactionAdapter={connect:async()=>({release(){},query:(sql,params)=>client.query(sql==='BEGIN'?'SAVEPOINT removal_test':sql==='COMMIT'?'RELEASE SAVEPOINT removal_test':sql==='ROLLBACK'?'ROLLBACK TO SAVEPOINT removal_test':sql,params)})};
    await removeAccount(target,actor,transactionAdapter);
    assert.equal((await client.query('SELECT id FROM users WHERE id=$1',[target])).rowCount,0);
    const kept=(await client.query('SELECT customer_id,operator_id,technician_id FROM support_tickets WHERE id=$1',[ticket])).rows[0];
    assert.deepEqual(kept,{customer_id:null,operator_id:null,technician_id:null});
    assert.equal((await client.query('SELECT id FROM evidences WHERE ticket_id=$1',[ticket])).rowCount,1);
    assert.equal((await client.query("SELECT changed_by FROM ticket_history WHERE ticket_id=$1 AND action='TEST'",[ticket])).rows[0].changed_by,null);
    assert.equal(String((await client.query("SELECT changed_by FROM ticket_history WHERE ticket_id=$1 AND action='USUARIO_ELIMINADO'",[ticket])).rows[0].changed_by),String(actor));
    console.log('PASS: account removed physically; ticket, conversation, evidence and history retained.');
    await assert.rejects(()=>removeAccount(actor,actor,transactionAdapter),/No puedes eliminar/);
  } finally {await client.query('ROLLBACK');client.release();console.log('All test data rolled back.');}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>pool.end());
