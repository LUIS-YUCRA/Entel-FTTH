const fs=require('node:fs');const assert=require('node:assert/strict');const {pool}=require('../src/config/db');
(async()=>{
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('CREATE TEMP TABLE sessions (id bigint) ON COMMIT DROP');
  await client.query('CREATE TEMP TABLE conversations (id bigint, status text, ticket_id bigint, assistant_context jsonb) ON COMMIT DROP');
  await client.query('CREATE TEMP TABLE conversation_messages (conversation_id bigint, metadata jsonb) ON COMMIT DROP');
  const data=[
   [1,'FINALIZADA',null,{conversation:{dialog_state:'GUIDED_DIAGNOSIS',finished:false}}],
   [2,'FINALIZADA',null,{conversation:{dialog_state:'FINISHED',finished:true}}],
   [3,'FINALIZADA',40,{conversation:{finished:false}}],
   [4,'FINALIZADA',null,{conversation:{finished:true}}],
   [5,'FINALIZADA',null,{}],
  ];
  for(const row of data)await client.query('INSERT INTO conversations VALUES ($1,$2,$3,$4)',row);
  await client.query('INSERT INTO conversation_messages VALUES ($1,$2)',[5,{ticketId:90}]);
  const sql=fs.readFileSync('sql/010_session_activity_and_open_conversations.sql','utf8').replace('BEGIN;','').replace('COMMIT;','');
  await client.query(sql);
  const result=await client.query('SELECT id,status FROM conversations ORDER BY id');
  assert.deepEqual(result.rows.map(row=>row.status),['ACTIVA','FINALIZADA','FINALIZADA','FINALIZADA','FINALIZADA']);
  console.log('Migration verified: unfinished chat reopens; finished and ticket-linked chats stay closed.');
 }finally{await client.query('ROLLBACK');client.release();await pool.end();}
})().catch(error=>{console.error(error);process.exitCode=1;});
