const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');

function load(file, overrides) {
  overrides = {'../services/AssistantKnowledgeService':{knowledge:{approved:async()=>[]},normalize:value=>String(value).toLowerCase()},'../services/AssistantTurns':{turns:{fail:async()=>{}}},...overrides};
  const filename = path.resolve(__dirname, '../src', file);
  const realRequire = createRequire(filename);
  const module = {exports:{}};
  const context = {module, exports:module.exports, __dirname:path.dirname(filename), console,
    process:{env:{SMTP_HOST:'smtp.example.test',SMTP_PORT:'587',SMTP_USER:'sender@example.test',SMTP_PASSWORD:'test-only'}},
    require:(name)=>Object.hasOwn(overrides,name)?overrides[name]:realRequire(name)};
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),context,{filename});
  return module.exports;
}

test('notification includes recipient, subject, text and escaped HTML',async()=>{
  let sent; let closed=false;
  const mail=load('utils/MailService.js',{nodemailer:{createTransport:()=>({sendMail:async(payload)=>{sent=payload;return {accepted:[payload.to]};},close:()=>{closed=true;}})}});
  await mail.sendNotificationEmail('customer@example.test','Ticket <047>','Trabajo <script>');
  assert.equal(sent.to,'customer@example.test'); assert.equal(sent.subject,'Ticket <047>');
  assert.match(sent.text,/Trabajo/); assert.match(sent.html,/&lt;script&gt;/);assert.ok(closed);
});
test('SMTP failure closes connection and remains an error',async()=>{
  let closed=false;
  const mail=load('utils/MailService.js',{nodemailer:{createTransport:()=>({sendMail:async()=>{throw Object.assign(new Error('SMTP denied'),{code:'EAUTH'});},close:()=>{closed=true;}})}});
  await assert.rejects(()=>mail.sendNotificationEmail('a@example.test','Title','Body'),/SMTP denied/);assert.ok(closed);
});
const validation=require('../src/middleware/ValidationMiddleware');
function response(){return {code:200,body:null,status(value){this.code=value;return this;},json(value){this.body=value;return this;}};}
test('administrator can create technician without service instance',()=>{
  let next=false;const res=response();validation.validateStaff({body:{fullName:'Técnico Prueba',email:'test@entel.bo',password:'StrongTest1!',userType:'tecnico'}},res,()=>{next=true;});assert.ok(next);
});
test('staff creation rejects administrator role',()=>{
  const res=response();validation.validateStaff({body:{userType:'administrador'}},res,()=>assert.fail('must reject'));assert.equal(res.code,400);
});
function ticketController(state){let updated=false;const model={findVisibleById:async()=>({id:1,status:state}),updateStatus:async()=>{updated=true;return {id:1};}};return {controller:load('controllers/TicketController.js',{'../models/Ticket':model}),updated:()=>updated};}
test('assigned ticket cannot skip travel and start attention',async()=>{
  const {controller,updated}=ticketController('ASIGNADO');const res=response();
  await controller.updateStatus({params:{id:1},user:{id:2,user_type:'tecnico'},body:{status:'EN_PROCESO'}},res,error=>{throw error;});
  assert.equal(res.code,409);assert.equal(updated(),false);
});
test('rescheduling only requires a future date',async()=>{
  const {controller,updated}=ticketController('ASIGNADO');const res=response();
  await controller.updateStatus({params:{id:1},user:{id:2,user_type:'tecnico'},body:{status:'REPROGRAMADO',scheduledAt:new Date(Date.now()+86400000).toISOString()}},res,error=>{throw error;});assert.equal(res.code,200);assert.ok(updated());
});
test('resolution requires documented solution',async()=>{
  const {controller,updated}=ticketController('EN_PROCESO');const res=response();
  await controller.updateStatus({params:{id:1},user:{id:2,user_type:'tecnico'},body:{status:'RESUELTO'}},res,error=>{throw error;});assert.equal(res.code,400);assert.equal(updated(),false);
});
test('delete calls DELETE and does not deactivate',async()=>{
  let removed=false;const controller=load('controllers/UserController.js',{'../models/User':{},'../config/db':{},'../services/AccountRemovalService':{removeAccount:async(id,actor)=>{assert.equal(id,3);assert.equal(actor,1);removed=true;return {success:true};}}});
  const res=response();await controller.remove({params:{id:3},user:{id:1}},res,error=>{throw error;});assert.equal(res.code,200);assert.ok(removed);
});
test('self deletion is explicit conflict instead of deactivation',async()=>{
  const controller=load('controllers/UserController.js',{'../models/User':{},'../config/db':{},'../services/AccountRemovalService':{removeAccount:async()=>{throw {status:409,message:'No puedes eliminar tu cuenta'};}}});
  const res=response();await controller.remove({params:{id:3},user:{id:1}},res,error=>{throw error;});assert.equal(res.code,409);
});
