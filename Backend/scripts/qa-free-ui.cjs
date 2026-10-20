require('../src/config/env');
const fs=require('node:fs'),path=require('node:path'),express=require('express'),crypto=require('node:crypto');
const db=require('../src/config/db');
const recording=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../tmp/login-profile-live-1792018504685.json'),'utf8'));
// Fail closed: this isolated UI test never calls OpenAI, sends mail or creates tickets.
global.fetch=async()=>{throw new Error('External requests blocked in free UI QA');};
require('../src/services/AssistantBridge').processAssistantMessage=async p=>{
 const turn=p.event==='welcome'?recording.turns[0]:recording.turns.find(t=>t.message===p.message)||(/^Ya completé mi teléfono en el perfil/.test(p.message)?recording.turns[1]:null);
 if(!turn)throw new Error('QA_REPLAY_MESSAGE_NOT_RECORDED');
 return {success:true,response:turn.response,provider:'qa-recorded-replay',intent:'soporte',confidence:1,dialog_state:'START',action_type:'RESPOND',profile_request:turn.profileRequest||null,context:{...(p.context||{}),profile_request:turn.profileRequest||null,customer:{customer_category:p.customer.customer_category,category_verified:p.customer.category_verified}}};
};
require('../src/models/Ticket').create=async()=>{throw new Error('QA_TICKETS_DISABLED');};
const app=require('../src/App');
const serverApp=express();const dist=path.resolve(__dirname,'../../Frontend/dist-qa');
serverApp.use('/api',(req,res,next)=>{req.url='/api'+req.url;app(req,res,next);});
serverApp.use(express.static(dist,{index:false}));
serverApp.get('/{*path}',(req,res)=>res.type('html').send(fs.readFileSync(path.join(dist,'index.html'),'utf8').replace('<body>','<body><div style="position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#fff3bf;color:#392c00;padding:7px;text-align:center;font:13px Arial">PRUEBA LOCAL SIN CRÉDITOS · Cuenta ficticia · Respuestas grabadas de una validación anterior de GPT</div>')));
const instance='90'+Date.now(),email='capturas-'+crypto.randomUUID()+'@example.invalid',password='QaLocal!12345';let userId,server;
async function main(){
 await db.query("INSERT INTO service_instances(service_number,customer_category,reference) VALUES($1,'NEGOCIO','QA capturas temporal')",[instance]);
 const user=await require('../src/models/User').create({fullName:'Cliente de prueba',email,password,userType:'cliente',serviceNumber:instance});userId=user.id;
 server=serverApp.listen(4173,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:4173/login',email,password,instance,mode:'RECORDED_REPLAY_NO_API_CREDIT'})));
}
async function cleanup(){if(server)await new Promise(r=>server.close(r));if(userId){await db.query('DELETE FROM audit_logs WHERE actor_id=$1',[userId]);await db.query('DELETE FROM users WHERE id=$1 AND email=$2',[userId,email]);}await db.query("DELETE FROM service_instances WHERE service_number=$1 AND reference='QA capturas temporal'",[instance]);await db.pool.end();process.exit();}
process.on('SIGINT',cleanup);process.on('SIGTERM',cleanup);process.stdin.on('data',d=>{if(String(d).includes('quit'))cleanup();});
main().catch(e=>{console.error(e.message);cleanup();});


