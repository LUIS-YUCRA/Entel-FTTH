const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const {createRequire}=require('node:module');
const {pool}=require('../src/config/db');const {ServiceIdentity}=require('../src/services/ServiceIdentity');
test.after(()=>pool.end());
test('real PostgreSQL: service identity, registration and immutable customer fields',{skip:process.env.FTTH_TEST_DATABASE!=='1',timeout:30000},async()=>{
  const client=await pool.connect();let savepoint=0;const stack=[];
  const adapter={query:(...args)=>client.query(...args),pool:{connect:async()=>({query:async(sql,args)=>{
    if(sql==='BEGIN'){const name='service_test_'+(++savepoint);stack.push(name);return client.query('SAVEPOINT '+name);}
    if(sql==='COMMIT')return client.query('RELEASE SAVEPOINT '+stack.pop());
    if(sql==='ROLLBACK'){const name=stack.pop();await client.query('ROLLBACK TO SAVEPOINT '+name);return client.query('RELEASE SAVEPOINT '+name);}
    return client.query(sql,args);
  },release(){}})}};
  const filename=path.resolve(__dirname,'../src/models/User.js');const actual=createRequire(filename);const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,console,require:name=>name==='../config/db'?adapter:actual(name)});const User=module.exports;
  const instance=String(Date.now())+'91';const email='service-test-'+crypto.randomUUID()+'@example.invalid';
  try{
    await client.query('BEGIN');
    const actor=(await client.query("INSERT INTO users(full_name,email,password,user_type) VALUES('PRUEBA TRANSACCIONAL',$1,'not-a-real-login','cliente') RETURNING id",[email])).rows[0].id;
    const repo=new ServiceIdentity(adapter);
    await repo.save({serviceNumber:instance,customerCategory:'INSTITUCION',monthlyFeeBob:1000,reference:'Contrato ficticio solo en transacción de prueba'},actor);
    const user=await User.create({fullName:'Registro de prueba',email:'registration-'+email,password:'TestOnly123!',userType:'cliente',serviceNumber:instance});
    let profile=await User.findProfileById(user.id);
    assert.equal(profile.customer_category,'INSTITUCION');assert.equal(profile.category_verified,true);
    await User.updateOwnProfile(user.id,{phone:'71234567',serviceNumber:'8888888888',customerCategory:'HOGAR'},'cliente');
    profile=await User.findProfileById(user.id);assert.equal(profile.service_number,instance);assert.equal(profile.customer_category,'INSTITUCION');assert.equal(profile.phone,'71234567');
    await repo.save({serviceNumber:instance,customerCategory:'NEGOCIO',monthlyFeeBob:350,reference:'Corrección administrativa de contrato de prueba'},actor);
    profile=await User.findProfileById(user.id);assert.equal(profile.customer_category,'NEGOCIO');
    await repo.refresh(user.id);assert.equal((await User.findProfileById(user.id)).category_source,'INSTANCE');
    assert.equal(await repo.resolve(instance+'9'),null);
  }finally{await client.query('ROLLBACK');client.release();}
});

test('real queue: severity, failure type and category determine the queue',{skip:process.env.FTTH_TEST_DATABASE!=='1',timeout:30000},async()=>{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');const tag=crypto.randomUUID().slice(0,12);
    const customerId=(await client.query("INSERT INTO users(full_name,email,password,user_type) VALUES('QA COLA',$1,'not-a-real-login','cliente') RETURNING id",['qa-queue-'+tag+'@example.invalid'])).rows[0].id;
    const samples=[['ELECTRICAL_STORM_DAMAGE','ALTA','HOGAR',100],['SIN_INTERNET','ALTA','INSTITUCION',1000],['SIN_INTERNET','ALTA','HOGAR',500],['SIN_INTERNET','ALTA','INSTITUCION',350],['SIN_INTERNET','ALTA','INSTITUCION',null],['INTERNET_LENTO','MEDIA','NEGOCIO',9999]];
    const ids=[];
    for(const [index,sample] of samples.entries()){
      ids.push((await client.query(`INSERT INTO support_tickets(ticket_code,customer_id,title,description,diagnosis_code,priority,customer_category,customer_category_verified) VALUES($1,$2,'QA cola','Prueba con rollback',$3,$4,$5,TRUE) RETURNING id`,['TQ-'+tag+'-'+index,customerId,...sample.slice(0,3).slice(0,3)])).rows[0].id);
    }
    const filename=path.resolve(__dirname,'../src/models/Ticket.js');const actual=createRequire(filename);const module={exports:{}};
    vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,console,require:name=>name==='../config/db'?{query:(...args)=>client.query(...args)}:actual(name)});
    const Ticket=module.exports;Ticket.markOverdueReprogrammedVisits=async()=>{};
    const ordered=(await Ticket.findVisible({id:customerId,user_type:'operador'})).map(t=>t.id).filter(id=>ids.includes(id));
    assert.deepEqual(ordered,[ids[0],ids[1],ids[3],ids[4],ids[2],ids[5]]);
  }finally{await client.query('ROLLBACK');client.release();}
});

test('PostgreSQL: new chat creates another ticket and same request reuses its own ticket',{skip:process.env.FTTH_TEST_DATABASE!=='1',timeout:30000},async()=>{
 const client=await pool.connect();let n=0;const stack=[];let notifications=0;
 const adapter={query:(...a)=>client.query(...a),pool:{connect:async()=>({query:async(sql,args)=>{if(sql==='BEGIN'){const s='ticket_test_'+(++n);stack.push(s);return client.query('SAVEPOINT '+s);}if(sql==='COMMIT')return client.query('RELEASE SAVEPOINT '+stack.pop());if(sql==='ROLLBACK'){const s=stack.pop();await client.query('ROLLBACK TO SAVEPOINT '+s);return client.query('RELEASE SAVEPOINT '+s);}return client.query(sql,args);},release(){}})}};
 const filename=path.resolve(__dirname,'../src/models/Ticket.js'),actual=createRequire(filename),module={exports:{}};
 vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,console,require:name=>name==='../config/db'?adapter:name==='./Notification'?{create:async()=>{notifications++;},createForRole:async()=>{notifications++;}}:actual(name)});
 try{
 await client.query('BEGIN');const tag=crypto.randomUUID();
 const userId=(await client.query("INSERT INTO users(full_name,email,password,user_type) VALUES('QA TICKET CHAT',$1,'not-a-real-login','cliente') RETURNING id",['qa-chat-ticket-'+tag+'@example.invalid'])).rows[0].id;
 const a=(await client.query('INSERT INTO conversations(customer_id) VALUES($1) RETURNING id',[userId])).rows[0].id;
 const b=(await client.query('INSERT INTO conversations(customer_id) VALUES($1) RETURNING id',[userId])).rows[0].id;
 const input={customerId:userId,title:'Sin internet QA',description:'Prueba transaccional, sin notificaciones reales',diagnosisCode:'SIN_INTERNET',deduplicate:true};
 const first=await module.exports.create({...input,conversationId:a,assistantTurnKey:a+':test'});
 await client.query('UPDATE conversations SET ticket_id=$2 WHERE id=$1',[a,first.id]);
 const second=await module.exports.create({...input,conversationId:b,assistantTurnKey:b+':test'});
 assert.notEqual(second.id,first.id);assert.notEqual(second.ticket_code,first.ticket_code);
 const retry=await module.exports.create({...input,conversationId:b,assistantTurnKey:b+':test'});
 assert.equal(retry.id,second.id);assert.equal(retry.reused,true);assert.equal(notifications,4);
 }finally{await client.query('ROLLBACK');client.release();}
});
