const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const {createRequire}=require('node:module');
function load(file,overrides){const filename=path.resolve(__dirname,'../src',file);const actual=createRequire(filename);const module={exports:{}};vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,console,process,__dirname:path.dirname(filename),require:name=>Object.hasOwn(overrides,name)?overrides[name]:actual(name)});return module.exports;}
function response(){return {code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
for(const role of ['cliente','tecnico','operador','administrador'])test(`idle authentication policy for ${role}`,async()=>{
 const calls=[];const middleware=load('middleware/AuthMiddleware.js',{'../utils/jwtHelper':{verifyToken:()=>({userId:1})},'../models/User':{findById:async()=>({id:1,user_type:role,is_active:true})},'../config/db':{query:async(sql)=>{calls.push(sql);return {rows:[{id:3,idle_expired:true}]};}}});
 const res=response();let allowed=false;await middleware.authenticate({headers:{authorization:'Bearer test'}},res,()=>allowed=true);
 const limited=role === 'administrador';assert.equal(allowed,!limited);assert.equal(res.code,limited?401:200);assert.equal(calls.some(sql=>sql.startsWith('DELETE')),limited);
});
test('refresh token cannot renew an idle privileged session',async()=>{
 let query='';const controller=load('controllers/AuthController.js',{'../models/User':{findById:async()=>({id:1,user_type:'administrador',is_active:true})},'../utils/jwtHelper':{verifyRefreshToken:()=>({userId:1})},'../config/db':{query:async(sql,params)=>{query=sql;assert.equal(params[2],true);return {rows:[]};}}});
 const res=response();await controller.refreshToken({body:{refreshToken:'test'}},res,()=>{});assert.equal(res.code,401);assert.match(query,/last_activity_at > NOW\(\) - INTERVAL '2 minutes'/);
});
test('customer logout revokes only session and keeps unfinished chats',async()=>{
 const calls=[];const controller=load('controllers/AuthController.js',{'../models/User':{},'../utils/jwtHelper':{},'../config/db':{query:async(sql)=>{calls.push(sql);return {rows:[]};}}});
 await controller.logout({user:{id:1,user_type:'cliente'},headers:{authorization:'Bearer test'}},response(),error=>{throw error;});assert.equal(calls.length,1);assert.match(calls[0],/DELETE FROM sessions/);
});
test('opening another chat preserves existing conversation states',async()=>{
 const calls=[];const client={query:async(sql)=>{calls.push(sql);return {rows:[{id:2,status:'ACTIVA'}]};},release(){}};
 const Conversation=load('models/Conversation.js',{'../config/db':{pool:{connect:async()=>client}}});const created=await Conversation.startNew(1);assert.equal(created.status,'ACTIVA');assert.ok(calls.every(sql=>!sql.includes('UPDATE conversations')));
});

test('another login preserves existing sessions',async()=>{
 const calls=[];const user={id:1,user_type:'cliente',email:'test@example.com',is_active:true,password:'hash'};
 const controller=load('controllers/AuthController.js',{'../models/User':{findByEmail:async()=>user,findProfileById:async()=>({...user,service_number:'1234567',customer_category:'NEGOCIO',category_verified:true}),verifyPassword:async()=>true,updateLastLogin:async()=>{}},'../services/ServiceIdentity':{serviceIdentity:{refresh:async(id)=>{assert.equal(id,user.id);}}},'../utils/jwtHelper':{generateToken:()=> 'access',generateRefreshToken:()=> 'refresh'},'../config/db':{query:async(sql)=>{calls.push(sql);return {rows:[]};}}});
 const res=response();await controller.login({body:{email:user.email,password:'test'},ip:'test',get:()=>''},res,error=>{throw error;});
 assert.equal(res.code,200);assert.equal(res.body.success,true);assert.deepEqual(calls.filter(sql=>sql.startsWith('DELETE FROM sessions')),['DELETE FROM sessions WHERE expires_at <= NOW()']);
 assert.equal(res.body.user.customer_category,'NEGOCIO');assert.equal(res.body.user.category_verified,true);assert.ok(!Object.hasOwn(res.body.user,'password'));
});
for(const role of ['cliente','tecnico','operador'])test(`refresh ignores inactivity for ${role}`,async()=>{
 const controller=load('controllers/AuthController.js',{'../models/User':{findById:async()=>({id:1,user_type:role,is_active:true})},'../utils/jwtHelper':{verifyRefreshToken:()=>({userId:1}),generateToken:()=> 'renewed'},'../config/db':{query:async(sql,params)=>{if(sql.includes('SELECT'))assert.equal(params[2],false);return {rows:[{id:3}]};}}});
 const res=response();await controller.refreshToken({body:{refreshToken:'test'}},res,()=>{});assert.equal(res.code,200);assert.equal(res.body.token,'renewed');
});
