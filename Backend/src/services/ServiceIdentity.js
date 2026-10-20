const database=require('../config/db');
const CATEGORIES=['HOGAR','NEGOCIO','INSTITUCION'];
const PROFILE_FIELDS=['phone','address','zone','ci'];
const missingProfile=customer=>PROFILE_FIELDS.filter(key=>!String(customer?.[key]||'').trim());
function validateInstance(data){
  const serviceNumber=String(data.serviceNumber||'').trim();
  const category=String(data.customerCategory||'').toUpperCase();
  const reference=String(data.reference||'').trim();
  if(!/^\d{4,20}$/.test(serviceNumber)||!CATEGORIES.includes(category)||reference.length<6||reference.length>500)throw Object.assign(new Error('Indica una instancia válida, su categoría, una referencia verificable.'),{status:400});
  return {serviceNumber,category,reference,active:data.active!==false};
}
class ServiceIdentity {
  constructor(db=database){this.db=db;}
  async resolve(serviceNumber,db=this.db){
    const number=String(serviceNumber||'').trim();
    if(!/^\d{4,20}$/.test(number))return null;
    const exact=await db.query('SELECT customer_category, active FROM service_instances WHERE service_number=$1',[number]);
    if(exact.rows[0])return exact.rows[0].active?{...exact.rows[0],source:'INSTANCE',verified:true}:null;
    // Prefix rules are used only when an administrator has configured a verified rule.
    const prefix=await db.query(`SELECT customer_category FROM instance_classifications WHERE active=TRUE AND $1 LIKE instance_prefix || '%' ORDER BY length(instance_prefix) DESC LIMIT 1`,[number]);
    return prefix.rows[0]?{...prefix.rows[0],source:'PREFIX',verified:true}:null;
  }
  async refresh(customerId){
    const client=await this.db.pool.connect();
    try{
      await client.query('BEGIN');
      const row=await client.query('SELECT service_number FROM customers WHERE user_id=$1 FOR UPDATE',[customerId]);
      if(row.rows[0]){
        const identity=await this.resolve(row.rows[0].service_number,client);
        await client.query(`UPDATE customers SET customer_category=COALESCE($2,customer_category), category_verified=$3, category_source=$4 WHERE user_id=$1`,[customerId,identity?.customer_category||null,Boolean(identity),identity?.source||null]);
      }
      await client.query('COMMIT');
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  }
  async list(){return (await this.db.query('SELECT service_number,customer_category,reference,active,updated_at FROM service_instances ORDER BY updated_at DESC LIMIT 500')).rows;}
  async save(data,actorId){
    const value=validateInstance(data);const client=await this.db.pool.connect();
    try{
      await client.query('BEGIN');
      const result=await client.query(`INSERT INTO service_instances(service_number,customer_category,reference,active,updated_by) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(service_number) DO UPDATE SET customer_category=EXCLUDED.customer_category,reference=EXCLUDED.reference,active=EXCLUDED.active,updated_by=EXCLUDED.updated_by,updated_at=NOW() RETURNING *`,[value.serviceNumber,value.category,value.reference,value.active,actorId]);
      await client.query(`UPDATE customers SET customer_category=$2, category_verified=$3, category_source=CASE WHEN $3 THEN 'INSTANCE' ELSE NULL END, updated_at=NOW() WHERE service_number=$1`,[value.serviceNumber,value.category,value.active]);
      const synchronized=await client.query(`UPDATE support_tickets t SET customer_category=CASE WHEN $3 THEN $2::varchar ELSE NULL END,
        customer_category_verified=$3,
        priority=CASE WHEN $3 AND $2 IN ('NEGOCIO','INSTITUCION') AND t.diagnosis_code IN ('SIN_INTERNET','ROUTER_DANADO','PERDIDA_SENAL_OPTICA') THEN 'ALTA' ELSE t.priority END,
        priority_reason=CASE WHEN $3 AND $2 IN ('NEGOCIO','INSTITUCION') AND t.diagnosis_code IN ('SIN_INTERNET','ROUTER_DANADO','PERDIDA_SENAL_OPTICA') AND t.priority<>'ALTA' THEN 'Interrupción total de un servicio con categoría comercial verificada por instancia.' ELSE t.priority_reason END
        WHERE t.customer_id IN (SELECT user_id FROM customers WHERE service_number=$1) AND t.status NOT IN ('RESUELTO','CERRADO','CANCELADO')`,[value.serviceNumber,value.category,value.active]);
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,details) VALUES($1,'CLASIFICAR_INSTANCIA','SERVICIO',$2,$3::jsonb)`,[actorId,value.serviceNumber,JSON.stringify({category:value.category,active:value.active,reference:value.reference,synchronizedOpenTickets:synchronized.rowCount||0})]);
      await client.query('COMMIT');return result.rows[0];
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  }
}
module.exports={ServiceIdentity,serviceIdentity:new ServiceIdentity(),CATEGORIES,PROFILE_FIELDS,missingProfile,validateInstance};
