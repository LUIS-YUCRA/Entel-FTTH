const crypto = require('node:crypto');
const database = require('../config/db');
const policy = require('../../chat/knowledge_policy.json');

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[¿?¡!,;:]/g, ' ').replace(/\s+/g, ' ').trim();
const redact = value => String(value || '').slice(0, 3000)
  .replace(/[\w.+-]+@[\w.-]+/g, '[correo]')
  .replace(/https?:\/\/\S+/gi, '[enlace]')
  .replace(/\b(?:TK|FTTH|TEC)-[\w-]+\b/gi, '[código]')
  .replace(/\b\d{4,}\b/g, '[número]')
  .replace(/(?:cliente|nombre|direccion|dirección|telefono|teléfono|instancia|contraseña|password)\s*[:=][^\n]+/gi, '[dato privado]')
  .replace(/\b(?:me llamo|mi nombre es|vivo en|mi direccion es|mi dirección es|mi telefono es|mi teléfono es)\s+[^\n,.]+/gi, '[dato privado]')
  .replace(/\b(?:Bearer\s+\S+|eyJ[\w.-]{12,})/g, '[dato privado]');

function validateKnowledge(data) {
  const slot = policy.slots[data.replyKey];
  if (!slot || !slot.intents.includes(data.intent)) throw Object.assign(new Error('Selecciona un procedimiento y una intención compatibles.'), {status:400});
  const question = String(data.question || '').trim();
  const answer = String(data.answer || '').trim();
  const variants = Array.isArray(data.variants) ? [...new Set(data.variants.map(value=>String(value).trim()))].slice(0, 30) : [];
  const text = [question, answer, ...variants].join('\n');
  if (question.length < 8 || question.length > 500 || answer.length < 12 || answer.length > 1200 || variants.some(v=>v.length<8 || v.length>500)) {
    throw Object.assign(new Error('Revisa la longitud de la pregunta, las variantes y la respuesta.'), {status:400});
  }
  if (redact(text) !== text || /\[(correo|enlace|codigo|numero|dato privado)\]|\beyJ[\w-]{12,}|ignora.*instrucciones|system prompt|instrucciones del sistema|reset.*fabrica|mira.*(?:extremo|fibra)|(?:desconecta|corta|empalma|retira|limpia).*(?:fibra|conector optico)/i.test(normalize(text))) {
    throw Object.assign(new Error('El conocimiento debe ser general, sin datos privados, instrucciones ajenas o maniobras ópticas peligrosas.'), {status:400});
  }
  if (data.privacyReviewed !== true || String(data.note || '').trim().length < 12) {
    throw Object.assign(new Error('Confirma la revisión técnica y de privacidad y documenta su motivo.'), {status:400});
  }
  if (data.replyKey==='info:general_support' && (/\b(?:abre|abrir|desarma|desarmar)\b.*(?:equipo|router|modem)|(?:cambia|configura|modifica).*(?:dns|dhcp|pppoe|ip)|(?:reclamo|ticket).*(?:registrado|creado)|tecnico.*(?:vendr|asignado)|prioridad.*alta|(?:restablece|resetea).*fabrica/i.test(normalize(answer)) || (answer.match(/\?/g)||[]).length>1)) {
    throw Object.assign(new Error('La orientación nueva debe ser segura, con una pregunta a la vez y sin afirmar acciones ni datos del sistema.'),{status:400});
  }
  if (data.replyKey === 'outage:fiber_check' && (!/\?/.test(answer) || !/cable|fibra/i.test(answer) || !/sin (?:tocar|manipular)|no (?:toques|manipules)/i.test(answer))) {
    throw Object.assign(new Error('Este paso debe pedir una revisión visual sin manipular la fibra.'), {status:400});
  }
  if (data.replyKey === 'slow:device_scope' && (!/\?/.test(answer) || !/todos|uno|dispositivo/i.test(answer))) {
    throw Object.assign(new Error('Este paso debe aclarar qué dispositivos presentan lentitud.'), {status:400});
  }
  return {question, answer, variants, intent:data.intent, replyKey:data.replyKey, conditions:slot.conditions};
}

function candidateFrom(row) {
  const question = normalize(row.question);
  let replyKey = row.metadata?.replyKey || null;
  let intent = row.metadata?.intent || 'desconocido';
  let proposedQuestion = row.question || '';
  if (!replyKey && /\blos\b.*roj|roj.*\blos\b/.test(question) && /cable|fibra/i.test(row.content)) {
    replyKey='outage:fiber_check'; intent='los_rojo'; proposedQuestion='No tengo internet y la luz LOS está roja.';
  } else if (!replyKey && /lent/.test(question) && /todos.*dispositivos|dispositivos.*uno/i.test(row.content)) {
    replyKey='slow:device_scope'; intent='internet_lento'; proposedQuestion='Mi internet está lento.';
  }
  const flags=[];
  if (!policy.slots[replyKey]) {replyKey=null;flags.push('contexto_no_verificado');}
  if (/no entendi|no pude identificar|contarme un poco/i.test(normalize(row.content))) flags.push('respuesta_generica');
  if (/TK-|FTTH-|proximas horas|2-4 horas|24 a 48/i.test(normalize(row.content))) flags.push('datos_o_plazos_particulares');
  if (row.content.includes('\uFFFD') || String(row.question).includes('\uFFFD')) flags.push('codificacion_danada');
  if (row.previous_answer === row.content) flags.push('respuesta_repetida');
  if (redact(row.content)!==row.content || redact(proposedQuestion)!==proposedQuestion) flags.push('datos_redactados_revisar');
  const solutionConfirmed = /ya funciona|ya tengo internet|se soluciono|volvio el internet/.test(normalize(row.next_question)) && !/no |pero|sigue/.test(normalize(row.next_question));
  return {question:redact(proposedQuestion), answer:redact(row.content), intent, replyKey, flags, solutionConfirmed};
}

class KnowledgeRepository {
  constructor(db=database) { this.db=db; this.approvedCache=null; }
  async approved() {
    if(this.approvedCache && this.approvedCache.expires>Date.now())return this.approvedCache.rows;
    const result=await this.db.query(`SELECT id, knowledge_key, version, question, variants, answer, intent, reply_key, conditions, policy_version
      FROM assistant_knowledge_versions WHERE status='VALIDATED' AND valid_until>NOW() AND policy_version=ANY($1::text[]) ORDER BY id DESC LIMIT 300`,[[policy.version,...(policy.compatibleVersions||[])]]);
    this.approvedCache={rows:result.rows,expires:Date.now()+30000};
    return result.rows;
  }
  async privateHistory(customerId, conversationId) {
    const result=await this.db.query(`SELECT c.id, c.created_at, c.assistant_context, t.ticket_code, t.status ticket_status
      FROM conversations c LEFT JOIN support_tickets t ON t.id=c.ticket_id AND t.customer_id=c.customer_id
      WHERE c.customer_id=$1 AND c.id<>$2 ORDER BY c.created_at DESC,c.id DESC LIMIT 5`,[customerId,conversationId]);
    const allowed=new Set(['sin_internet','los_rojo','internet_lento','velocidad_baja','internet_intermittent','cortes_internet','router_power','ethernet_problem','wifi_weak','single_device_issue']);
    return result.rows.map(row=>{
      const ctx=row.assistant_context||{};
      const intent=ctx.guided_flow?.name || ctx.intent?.intent;
      return {intent:allowed.has(intent)?intent:null, createdAt:row.created_at,
        losRed:ctx.diagnostic_facts?.los_status==='red' || ctx.entities?.lights?.los==='rojo',
        ticketCode:row.ticket_code || null, ticketStatus:row.ticket_status || null};
    }).filter(row=>row.intent);
  }
  async ownTicket(customerId, code) {
    const result=await this.db.query(`SELECT t.ticket_code, t.status, t.scheduled_at,
      technician.full_name AS technician_name, profile.phone AS technician_phone
      FROM support_tickets t LEFT JOIN users technician ON technician.id=t.technician_id
      LEFT JOIN technician_profiles profile ON profile.user_id=technician.id
      WHERE t.customer_id=$1 AND ($2::text IS NULL OR t.ticket_code=$2) ORDER BY t.created_at DESC LIMIT 1`,[customerId,code||null]);
    return result.rows[0] || null;
  }
  async collect(limit=40) {
    const rows=await this.db.query(`SELECT a.id,a.content,a.metadata,q.content question,n.content next_question,p.content previous_answer
      FROM conversation_messages a
      LEFT JOIN assistant_knowledge_candidates k ON k.source_message_id=a.id
      JOIN LATERAL (SELECT content FROM conversation_messages WHERE conversation_id=a.conversation_id AND sender='usuario' AND id<a.id ORDER BY id DESC LIMIT 1) q ON TRUE
      LEFT JOIN LATERAL (SELECT content FROM conversation_messages WHERE conversation_id=a.conversation_id AND sender='usuario' AND id>a.id ORDER BY id LIMIT 1) n ON TRUE
      LEFT JOIN LATERAL (SELECT content FROM conversation_messages WHERE conversation_id=a.conversation_id AND sender='asistente' AND id<a.id ORDER BY id DESC LIMIT 1) p ON TRUE
      WHERE a.sender='asistente' AND k.id IS NULL AND NOT (a.metadata ? 'knowledgeCandidateId') ORDER BY a.id LIMIT $1`,[Math.min(Math.max(Number(limit)||40,1),200)]);
    let inserted=0;
    for(const row of rows.rows){
      const item=candidateFrom(row);
      const fingerprint=crypto.createHash('sha256').update([normalize(item.question),item.intent,item.replyKey||'',normalize(item.answer)].join('|')).digest('hex');
      const client=await this.db.pool.connect();
      try{
        await client.query('BEGIN');
        const locked=await client.query("SELECT id FROM conversation_messages WHERE id=$1 AND NOT (metadata ? 'knowledgeCandidateId') FOR UPDATE",[row.id]);
        if(!locked.rows.length){await client.query('COMMIT');continue;}
        const result=await client.query(`INSERT INTO assistant_knowledge_candidates(source_message_id,question,answer,intent,reply_key,conditions,quality_flags,solution_confirmed,status,fingerprint)
          VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10)
          ON CONFLICT(fingerprint) WHERE fingerprint IS NOT NULL DO UPDATE
          SET occurrence_count=assistant_knowledge_candidates.occurrence_count+1,last_seen_at=NOW() RETURNING id,occurrence_count`,
        [row.id,item.question,item.answer,item.intent,item.replyKey,JSON.stringify(policy.slots[item.replyKey]?.conditions||{}),JSON.stringify(item.flags),item.solutionConfirmed,item.flags.length?'NEEDS_REVIEW':'PENDING',fingerprint]);
        await client.query("UPDATE conversation_messages SET metadata=metadata || jsonb_build_object('knowledgeCandidateId',$2::bigint) WHERE id=$1",[row.id,result.rows[0].id]);
        await client.query('COMMIT');
        inserted+=Number(result.rows[0].occurrence_count)===1?1:0;
      }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
    }
    return {scanned:rows.rows.length,inserted};
  }
  async list(status, after=0) {
    const result=await this.db.query(`SELECT c.*, (SELECT rating FROM assistant_feedback f WHERE f.message_id=c.source_message_id) feedback
      FROM assistant_knowledge_candidates c WHERE ($1::text IS NULL OR status=$1) AND id>$2 ORDER BY id LIMIT 50`,[status||null,Number(after)||0]);
    return result.rows;
  }
  async review(id,data,reviewerId=null) {
    if (!['VALIDATED','REJECTED','USEFUL','NEEDS_REVIEW','OBSOLETE'].includes(data.status)) throw Object.assign(new Error('Evaluación inválida.'),{status:400});
    const validated=data.status==='VALIDATED'?validateKnowledge(data):null;
    const client=await this.db.pool.connect();
    try{
      await client.query('BEGIN');
      const found=await client.query('SELECT * FROM assistant_knowledge_candidates WHERE id=$1 FOR UPDATE',[id]);
      if(!found.rows[0])throw Object.assign(new Error('Candidato no encontrado.'),{status:404});
      const candidate=found.rows[0]; let key=candidate.knowledge_key; let version=null;
      if(validated){
        key=key||crypto.createHash('sha256').update(validated.replyKey+'|'+normalize(validated.question)).digest('hex');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[key]);
        await client.query("UPDATE assistant_knowledge_versions SET status='OBSOLETE' WHERE knowledge_key=$1 AND status='VALIDATED'",[key]);
        const inserted=await client.query(`INSERT INTO assistant_knowledge_versions(knowledge_key,version,question,variants,answer,intent,reply_key,conditions,status,policy_version,review_note,valid_until)
          SELECT $1::varchar,COALESCE(MAX(version),0)+1,$2,$3::jsonb,$4,$5,$6,$7::jsonb,'VALIDATED',$8,$9,NOW()+INTERVAL '180 days'
          FROM assistant_knowledge_versions WHERE knowledge_key=$1::varchar RETURNING id,version`,
        [key,validated.question,JSON.stringify(validated.variants),validated.answer,validated.intent,validated.replyKey,JSON.stringify(validated.conditions),policy.version,String(data.note).slice(0,1000)]);
        version=inserted.rows[0];
      } else if(key && ['OBSOLETE','REJECTED'].includes(data.status)) {
        await client.query('UPDATE assistant_knowledge_versions SET status=$2 WHERE knowledge_key=$1 AND status=\'VALIDATED\'',[key,data.status]);
      }
      await client.query(`UPDATE assistant_knowledge_candidates SET status=$2, reviewed_at=NOW(),reviewer_id=$3,review_note=$4,knowledge_key=$5 WHERE id=$1`,[id,data.status,reviewerId,String(data.note||'').slice(0,1000),key]);
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,details) VALUES($1,'REVISAR_CONOCIMIENTO','ASSISTANT_KNOWLEDGE',$2,$3::jsonb)`,[reviewerId,String(id),JSON.stringify({status:data.status,version,policy:policy.version})]);
      await client.query('COMMIT');this.approvedCache=null;return {candidateId:id,status:data.status,version};
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  }
  async feedback(customerId,messageId,rating,comment='') {
    if(![-1,1].includes(rating))throw Object.assign(new Error('Valoración inválida.'),{status:400});
    const result=await this.db.query(`INSERT INTO assistant_feedback(message_id,customer_id,rating,comment)
      SELECT m.id,c.customer_id,$3,$4 FROM conversation_messages m JOIN conversations c ON c.id=m.conversation_id
      WHERE m.id=$1 AND c.customer_id=$2 AND m.sender='asistente'
      ON CONFLICT(message_id) DO UPDATE SET rating=EXCLUDED.rating,comment=EXCLUDED.comment,updated_at=NOW() RETURNING message_id,rating`,[messageId,customerId,rating,String(comment).slice(0,500)]);
    if(!result.rows[0])throw Object.assign(new Error('Respuesta no encontrada.'),{status:404});
    return result.rows[0];
  }
  async metrics() {
    const result=await this.db.query(`SELECT
      (SELECT count(*) FROM assistant_knowledge_candidates) candidates,
      (SELECT count(*) FROM assistant_knowledge_versions WHERE status='VALIDATED' AND valid_until>NOW()) validated,
      (SELECT count(*) FROM assistant_knowledge_candidates WHERE status='REJECTED') rejected,
      (SELECT count(*) FROM assistant_feedback WHERE rating=1) useful_votes,
      (SELECT count(*) FROM assistant_feedback WHERE rating=-1) negative_votes,
      (SELECT count(*) FROM assistant_turns WHERE status='FAILED') failed_turns,
      (SELECT count(*) FROM assistant_turns WHERE analysis->'retrieval'->>'selected'='true') retrieved_turns,
      (SELECT round(avg(EXTRACT(EPOCH FROM completed_at-started_at)*1000)) FROM assistant_turns WHERE status='COMPLETED') mean_latency_ms`);
    return result.rows[0];
  }
}
const knowledge=new KnowledgeRepository();
let collecting=false;
async function collectSafely(){
  if(collecting)return; collecting=true;
  try{return await knowledge.collect();}catch(error){console.error('Evaluación de conocimiento pendiente:',error.code||'UNAVAILABLE');}finally{collecting=false;}
}
function startKnowledgeWorker(){const timer=setInterval(collectSafely,30000);timer.unref();setImmediate(collectSafely);return timer;}
module.exports={knowledge,KnowledgeRepository,normalize,redact,validateKnowledge,candidateFrom,policy,startKnowledgeWorker};
