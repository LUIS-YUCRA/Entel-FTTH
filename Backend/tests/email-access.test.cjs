const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const validation = require('../src/middleware/ValidationMiddleware');

function load(file, overrides, env = process.env) {
  const filename = path.resolve(__dirname, '../src', file);
  const actual = createRequire(filename);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, console: { log() {}, error() {} }, process: {env},
    __dirname: path.dirname(filename), Buffer, require: name => Object.hasOwn(overrides, name) ? overrides[name] : actual(name) });
  return module.exports;
}
const response = () => ({code:200, status(code) {this.code=code;return this;}, json(body) {this.body=body;return this;}});
const fail = error => {throw error;};

test('customer domains allow personal/institutional and reserve ENTEL including subdomains', () => {
  for (const email of ['a@gmail.com','a@outlook.com','a@est.emi.edu.bo','a@docentes.umss.edu.bo','a@empresa.com.bo']) {
    assert.equal(validation.isAllowedEmail(email, 'cliente'), true, email);
  }
  for (const email of ['a@entel.bo',' A@ENTEL.BO ','a@staff.entel.bo','a@entel.bo.','a@@gmail.com']) {
    assert.equal(validation.isAllowedEmail(email, 'cliente'), false, email);
  }
  assert.equal(validation.isAllowedEmail('a@entel.bo', 'tecnico'), true);
  assert.equal(validation.isAllowedEmail('a@entel.bo', 'operador'), true);
});

test('public registration blocks ENTEL and forged staff role before database writes', async () => {
  const controller = load('controllers/AuthController.js', {'../models/User':{findByEmail:()=>assert.fail('must not query/create')},
    '../utils/jwtHelper':{}, '../config/db':{}});
  for (const body of [{email:'a@ENTEL.BO'}, {email:'a@gmail.com',userType:'administrador'}, {email:'a@gmail.com',userType:'tecnico'}]) {
    const res = response(); await controller.register({body},res,fail); assert.equal(res.code,400);
  }
});

for (const role of ['cliente','tecnico','operador','administrador']) {
  test(`ENTEL login uses stored role: ${role}`, async () => {
    const user = {id:1,email:'a@entel.bo',user_type:role,is_active:true,password:'hash'};
    const controller = load('controllers/AuthController.js', {
      '../models/User': {findByEmail:async()=>user,verifyPassword:async()=>true,updateLastLogin:async()=>{}},
      '../utils/jwtHelper':{generateToken:()=> 'access',generateRefreshToken:()=> 'refresh'},
      '../config/db':{query:async()=>({rows:[]})},
    });
    const res = response();
    await controller.login({body:{email:user.email,password:'test',userType:'administrador'},ip:'test',get:()=>''},res,fail);
    assert.equal(res.code,role === 'cliente' ? 401 : 200);
  });
}

test('existing client ENTEL sessions and refresh tokens are rejected',async()=>{
  const user={id:1,email:'a@entel.bo',user_type:'cliente',is_active:true};
  const overrides={'../models/User':{findById:async()=>user},'../utils/jwtHelper':{verifyToken:()=>({userId:1}),verifyRefreshToken:()=>({userId:1})},'../config/db':{query:async()=>({rows:[{id:1}]})}};
  const res=response();await load('middleware/AuthMiddleware.js',overrides).authenticate({headers:{authorization:'Bearer test'}},res,()=>assert.fail('must reject'));
  assert.equal(res.code,403);
  const refreshed=response();await load('controllers/AuthController.js',overrides).refreshToken({body:{refreshToken:'test'}},refreshed,fail);
  assert.equal(refreshed.code,401);
});

test('client cannot change own email to ENTEL; admin can correct an old client email',async()=>{
  const res=response();const controller=load('controllers/AuthController.js',{'../models/User':{},'../utils/jwtHelper':{},'../config/db':{}});
  await controller.updateProfile({body:{email:'a@entel.bo'},user:{id:1,user_type:'cliente'}},res,fail);
  assert.equal(res.code,400);
  let updated=false;
  const admin=load('controllers/UserController.js',{'../models/User':{findById:async()=>({id:2,user_type:'cliente'}),update:async()=>{updated=true;return {id:2,user_type:'cliente'};},updateOwnProfile:async()=>({id:2,user_type:'cliente'})},'../config/db':{query:async()=>({rows:[]})},'../services/AccountRemovalService':{}});
  const ok=response();await admin.update({params:{id:2},user:{id:1,user_type:'administrador'},body:{email:'a@gmail.com'}},ok,fail);
  assert.equal(ok.code,200);assert.ok(updated);
});

test('only administrator creates staff; staff validation still accepts ENTEL',async()=>{
  const controller=load('controllers/UserController.js',{'../models/User':{},'../config/db':{},'../services/AccountRemovalService':{}});
  for(const role of ['cliente','operador','tecnico']){
    const res=response();await controller.create({body:{userType:'tecnico',email:'a@entel.bo'},user:{user_type:role}},res,fail);assert.equal(res.code,403);
  }
  let accepted=false;validation.validateStaff({body:{fullName:'Técnico Prueba',email:'a@entel.bo',password:'TestOnly123!',userType:'tecnico'}},response(),()=>accepted=true);
  assert.ok(accepted);
});

test('ENTEL staff password recovery is not blocked by the customer policy',async()=>{
  let sent=false;
  const controller=load('controllers/PasswordController.js',{'../models/User':{findByEmail:async()=>({id:1,user_type:'tecnico',is_active:true})},jsonwebtoken:{sign:()=> 'test-token'},'../utils/MailService':{sendRecoveryEmail:async()=>{sent=true;return {};}}});
  const res=response();await controller.forgotPassword({body:{email:'a@entel.bo'}},res,fail);assert.equal(res.code,200);assert.ok(sent);
});

test('notification layout embeds logo, escapes data and preserves production/local links and envelope',()=>{
  for(const env of ['production','development']){
    const mail=load('utils/MailService.js',{nodemailer:{}},{NODE_ENV:env});
    const result=mail.buildNotificationEmail('recipient@example.com','TK-001 <test>','Cliente: Prueba\n<script>alert(1)</script>');
    assert.equal(result.to,'recipient@example.com');assert.equal(result.subject,'TK-001 <test>');
    assert.match(result.html,/lang="es"/);assert.match(result.html,/src="cid:entel-logo"/);
    assert.equal(result.attachments[0].contentDisposition,'inline');
    assert.match(result.html,/&lt;script&gt;/);assert.doesNotMatch(result.html,/<script>/);
    const origin=env==='production'?'https://servicioftth.com':'http://localhost:5173';
    assert.ok(result.html.includes(`${origin}/notificaciones`));assert.ok(result.text.includes(`${origin}/notificaciones`));
    assert.match(result.html,/border-left:4px solid/);
  }
});
