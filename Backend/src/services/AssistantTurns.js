const crypto = require('node:crypto');
const database = require('../config/db');
const conflict = message => Object.assign(new Error(message), {status:409});
class AssistantTurns {
  constructor(db=database){this.db=db;}
  async cached(owner,conversationId,requestId,message){
    const result=await this.db.query(`SELECT t.* FROM assistant_turns t JOIN conversations c ON c.id=t.conversation_id
      WHERE c.customer_id=$1 AND c.id=$2 AND t.request_id=$3`,[owner,conversationId,requestId]);
    const turn=result.rows[0];
    if(turn && turn.original_message!==message)throw conflict('El identificador ya pertenece a otro mensaje.');
    return turn?.status==='COMPLETED'?turn.response:null;
  }
  async claim(owner,conversationId,requestId,message){
    const client=await this.db.pool.connect();
    try{
      await client.query('BEGIN');
      const owned=await client.query('SELECT * FROM conversations WHERE id=$1 AND customer_id=$2 FOR UPDATE',[conversationId,owner]);
      if(!owned.rows[0])throw Object.assign(new Error('Conversación no encontrada.'),{status:404});
      const old=await client.query('SELECT * FROM assistant_turns WHERE conversation_id=$1 AND request_id=$2',[conversationId,requestId]);
      if(old.rows[0] && old.rows[0].original_message!==message)throw conflict('El identificador ya pertenece a otro mensaje.');
      if(old.rows[0]?.status==='COMPLETED'){await client.query('COMMIT');return {cached:old.rows[0].response};}
      if(owned.rows[0].status!=='ACTIVA' || owned.rows[0].ticket_id)throw conflict('Esta conversación ha finalizado.');
      // The bridge timeout is shorter than this lease; the token fences stale completions.
      await client.query(`UPDATE assistant_turns SET status='FAILED',error_code='LEASE_EXPIRED' WHERE conversation_id=$1 AND status='PROCESSING' AND started_at<NOW()-INTERVAL '5 minutes'`,[conversationId]);
      const busy=await client.query("SELECT id FROM assistant_turns WHERE conversation_id=$1 AND status='PROCESSING'",[conversationId]);
      if(busy.rows.length)throw conflict('Espera la respuesta anterior antes de enviar otro mensaje.');
      const token=crypto.randomUUID();
      const result=await client.query(`INSERT INTO assistant_turns(conversation_id,request_id,attempt_token,original_message,status)
        VALUES($1,$2,$3,$4,'PROCESSING') ON CONFLICT(conversation_id,request_id) DO UPDATE
        SET status='PROCESSING',attempt_token=$3,started_at=NOW(),error_code=NULL RETURNING id`,[conversationId,requestId,token,message]);
      await client.query('COMMIT');return {id:result.rows[0].id,token,conversation:owned.rows[0]};
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  }
  async complete(turn,message,response,context,analysis,ticketId){
    const client=await this.db.pool.connect();
    try{
      await client.query('BEGIN');
      const found=await client.query("SELECT * FROM assistant_turns WHERE id=$1 AND attempt_token=$2 AND status='PROCESSING' FOR UPDATE",[turn.id,turn.token]);
      if(!found.rows[0])throw conflict('El turno fue reemplazado; vuelve a consultar la conversación.');
      const conversationId=found.rows[0].conversation_id;
      await client.query(`INSERT INTO conversation_messages(conversation_id,sender,content,metadata) VALUES($1,'usuario',$2,$3::jsonb)`,[conversationId,message,JSON.stringify({normalizedMessage:analysis.normalizedMessage,requestId:found.rows[0].request_id})]);
      const saved=await client.query(`INSERT INTO conversation_messages(conversation_id,sender,content,metadata) VALUES($1,'asistente',$2,$3::jsonb) RETURNING id`,[conversationId,response.response,JSON.stringify(analysis)]);
      response.messageId=saved.rows[0].id;
      await client.query(`UPDATE conversations SET assistant_context=$2::jsonb,ticket_id=COALESCE($3,ticket_id),status=CASE WHEN $4 THEN 'FINALIZADA' ELSE status END,updated_at=NOW() WHERE id=$1`,[conversationId,JSON.stringify(context),ticketId,Boolean(context.conversation?.finished)]);
      await client.query(`UPDATE assistant_turns SET status='COMPLETED',response=$3::jsonb,analysis=$4::jsonb,completed_at=NOW() WHERE id=$1 AND attempt_token=$2`,[turn.id,turn.token,JSON.stringify(response),JSON.stringify(analysis)]);
      await client.query('COMMIT');return response;
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  }
  async fail(turn,error){if(turn?.id)await this.db.query("UPDATE assistant_turns SET status='FAILED',error_code=$3,completed_at=NOW() WHERE id=$1 AND attempt_token=$2 AND status='PROCESSING'",[turn.id,turn.token,String(error.code||'TURN_FAILED').slice(0,80)]);}
}
module.exports={AssistantTurns,turns:new AssistantTurns()};
