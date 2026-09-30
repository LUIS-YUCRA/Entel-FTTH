const { pool } = require('../config/db');

async function removeAccount(id, actorId, executor = pool) {
  if (Number(id) === Number(actorId)) throw Object.assign(new Error('No puedes eliminar la cuenta con la que estás trabajando.'), {status:409});
  const client = await executor.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT id, user_type FROM users WHERE id = $1 FOR UPDATE', [id]);
    if (!found.rows[0]) throw Object.assign(new Error('Usuario no encontrado'), {status:404});
    // Remove account references, not the technical records themselves.
    await client.query('UPDATE support_tickets SET customer_id = NULL WHERE customer_id = $1', [id]);
    await client.query('UPDATE support_tickets SET operator_id = NULL WHERE operator_id = $1', [id]);
    await client.query("INSERT INTO ticket_history(ticket_id,changed_by,action,previous_value,new_value,observation) SELECT id,$2,'USUARIO_ELIMINADO',status,CASE WHEN status IN ('RESUELTO','CERRADO','CANCELADO') THEN status ELSE 'PENDIENTE' END,'Cuenta técnica eliminada; se retiró la asignación.' FROM support_tickets WHERE technician_id = $1", [id,actorId]);
    await client.query("UPDATE support_tickets SET technician_id = NULL, assigned_at = CASE WHEN status IN ('RESUELTO','CERRADO','CANCELADO') THEN assigned_at ELSE NULL END, scheduled_at = CASE WHEN status IN ('RESUELTO','CERRADO','CANCELADO') THEN scheduled_at ELSE NULL END, status = CASE WHEN status IN ('RESUELTO','CERRADO','CANCELADO') THEN status ELSE 'PENDIENTE' END, updated_at = CURRENT_TIMESTAMP WHERE technician_id = $1", [id]);
    await client.query('UPDATE conversations SET customer_id = NULL WHERE customer_id = $1', [id]);
    await client.query('UPDATE ticket_history SET changed_by = NULL WHERE changed_by = $1', [id]);
    await client.query('UPDATE evidences SET uploaded_by = NULL WHERE uploaded_by = $1', [id]);
    await client.query('UPDATE audit_logs SET actor_id = NULL WHERE actor_id = $1', [id]);
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    await client.query("INSERT INTO audit_logs (actor_id,action,entity_type,entity_id,details) VALUES ($1,'ELIMINAR_USUARIO','USER',$2,$3::jsonb)", [actorId,String(id),JSON.stringify({role:found.rows[0].user_type,accountDeleted:true})]);
    await client.query('COMMIT');
    return {success:true,message:'Cuenta eliminada definitivamente. Los registros técnicos se conservan sin la cuenta.'};
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
module.exports = {removeAccount};
