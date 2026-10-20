// Explicit local HTTP integration with a temporary synthetic customer. No mail or tickets.
require('../src/config/env');
const crypto=require('node:crypto');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const {pool}=require('../src/config/db');const app=require('../src/App');
async function main(){
  if(!process.argv.includes('--live'))throw new Error('LIVE_FLAG_REQUIRED');
  const stamp=Date.now();const instance='90'+stamp;const email='qa-intelligent-'+crypto.randomUUID()+'@example.invalid';const password='Qa!'+crypto.randomBytes(14).toString('hex');
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/api';let userId;let token;
  const report={started:new Date().toISOString(),scope:'HTTP real de registro, login, perfil y conversación con GPT; cliente temporal eliminado al terminar, sin registro de tickets ni notificaciones externas.',checks:[],turns:[]};
  const request=async(route,body,method='POST')=>{const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};};
  const output=path.resolve(__dirname,'../../tmp/login-profile-live-'+stamp+'.json');
  const save=()=>fs.writeFileSync(output,JSON.stringify(report,null,2));
  try{
    await pool.query(`INSERT INTO service_instances(service_number,customer_category,reference) VALUES($1,'NEGOCIO','QA temporal: prueba automática, eliminar al finalizar')`,[instance]);
    const registered=await request('/auth/register',{fullName:'Cliente temporal QA',email,password,serviceNumber:instance});assert.equal(registered.status,201);userId=registered.data.user.id;
    assert.equal(registered.data.user.customer_category,'NEGOCIO');assert.equal(registered.data.user.category_verified,true);report.checks.push('Registro reconoce la categoría del catálogo.');
    const login=await request('/auth/login',{email,password});assert.equal(login.status,200);token=login.data.token;
    assert.equal(login.data.user.customer_category,'NEGOCIO');assert.equal(login.data.user.service_number,instance);assert.ok(!Object.hasOwn(login.data.user,'password'));report.checks.push('Login devuelve instancia y categoría verificadas, sin contraseña.');
    const immutable=await request('/auth/profile',{customerCategory:'INSTITUCION',serviceNumber:'00000001'},'PATCH');assert.equal(immutable.status,400);report.checks.push('API rechaza cambiar instancia o categoría desde el perfil.');
    const forbidden=await request('/service-instances',{serviceNumber:instance,customerCategory:'INSTITUCION',reference:'Intento de cliente'});assert.equal(forbidden.status,403);report.checks.push('Cliente no puede modificar el catálogo administrativo.');
    const opened=await request('/conversations',{welcome:true});assert.equal(opened.status,201);const conversation=opened.data.conversation;
    const welcome=conversation.messages[0];report.turns.push({stage:'Bienvenida',response:welcome.content,profileRequest:welcome.metadata.profileRequest});
    const field=welcome.metadata.profileRequest;assert.ok(['phone','address','zone','ci'].includes(field));
    const values={phone:'70000005',address:'Calle ficticia QA 123',zone:'Zona ficticia QA',ci:'1234567 QA'};
    const updated=await request('/auth/profile',{[field]:values[field]},'PATCH');assert.equal(updated.status,200);assert.equal(updated.data.user[field],values[field]);report.checks.push('Formulario de perfil guarda el campo pedido por el asistente.');
    const send=async(message)=>{
      const r=await request('/conversations/message',{message,conversationId:conversation.id,requestId:crypto.randomUUID()});assert.equal(r.status,200);assert.equal(r.data.ticket,null,'This test must never create a ticket or send notifications.');
      report.turns.push({message,response:r.data.response,profileRequest:r.data.profileRequest,state:r.data.dialogState,provider:r.data.assistantSource});save();return r;
    };
    await send('Ya completé el dato que me pediste en mi perfil.');
    const urgent=await send('Lo demás después. Mi internet está lento en todos los dispositivos, por WiFi y por cable.');
    assert.equal(urgent.data.profileRequest,null);report.checks.push('La falla interrumpe la carga del perfil y recibe atención inmediata.');
    await send('Sigue lento aun con un solo equipo, sin descargas. Ya reinicié y continúa igual.');
    await send('No registres ningún reclamo por ahora, gracias.');
    const ctx=(await pool.query('SELECT assistant_context FROM conversations WHERE id=$1 AND customer_id=$2',[conversation.id,userId])).rows[0].assistant_context;
    assert.ok(!JSON.stringify(ctx.openai_history).includes(values[field]));assert.equal(ctx.customer.service_number,instance);assert.equal(ctx.customer.customer_category,'NEGOCIO');
    report.checks.push('Los valores privados del formulario no se agregan al historial enviado a GPT.');
    report.completed=new Date().toISOString();save();console.log(JSON.stringify({checks:report.checks,turns:report.turns,report:output}));
  }finally{
    if(userId){await pool.query('DELETE FROM audit_logs WHERE actor_id=$1',[userId]);await pool.query('DELETE FROM users WHERE id=$1 AND email=$2',[userId,email]);}
    await pool.query('DELETE FROM service_instances WHERE service_number=$1 AND reference=$2',[instance,'QA temporal: prueba automática, eliminar al finalizar']);
    await new Promise(resolve=>server.close(resolve));await pool.end();
  }
}
main().catch(error=>{console.error(error.code||error.message);process.exitCode=1;});
