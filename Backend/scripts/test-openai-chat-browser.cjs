// Real localhost UI -> Express -> OpenAI -> PostgreSQL. Explicit opt-in only.
require('../src/config/env');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const {pool}=require('../src/config/db');const {generateToken}=require('../src/utils/jwtHelper');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const directory=path.resolve(__dirname,'../../tmp/openai-integration');fs.mkdirSync(directory,{recursive:true});
const report={startedAt:new Date().toISOString(),scope:'Live localhost UI, backend, OpenAI and PostgreSQL, synthetic account',turns:[],checks:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');
let owner,browser;
(async()=>{
  if(!process.argv.includes('--live'))throw new Error('LIVE_FLAG_REQUIRED');
  if(process.env.ASSISTANT_PROVIDER!=='openai')throw new Error('PROVIDER_NOT_ENABLED');
  const current=Number((await pool.query("SELECT COALESCE(SUM(COALESCE(estimated_usd,reserved_usd)),0) total FROM assistant_api_usage WHERE billing_day=(NOW() AT TIME ZONE 'America/La_Paz')::date")).rows[0].total);
  // Three paid requests, each capped below US$0.10 by context/output limits.
  // The earlier standalone evaluation reserved < US$0.39; together < US$1.
  if(current>.15)throw new Error('LIVE_TEST_BUDGET_NOT_AVAILABLE');
  const email='integracion-openai-'+Date.now()+'@example.test';
  const user=(await pool.query("INSERT INTO users(full_name,email,password,user_type) VALUES('Prueba integración OpenAI',$1,'NO_PASSWORD_LOGIN_FOR_TEST','cliente') RETURNING id,full_name,email,user_type",[email])).rows[0];owner=user.id;
  await pool.query("INSERT INTO customers(user_id,service_number,address,zone,customer_category) VALUES($1,$2,'Ubicación sintética de prueba','Zona de prueba','HOGAR')",[owner,'TEST_'+Date.now()]);
  const token=generateToken(user);await pool.query("INSERT INTO sessions(user_id,token,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 hour')",[owner,token]);
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.addInitScript(({token,user})=>{sessionStorage.setItem('token',token);sessionStorage.setItem('user',JSON.stringify(user));sessionStorage.setItem('lastActivityAt',String(Date.now()));},{token,user});
  await page.goto('http://127.0.0.1:5173/dashboard/cliente');
  await page.locator('#route-content[aria-busy="false"]').waitFor({timeout:30000});
  await page.getByRole('button',{name:'Nueva conversación',exact:true}).click();
  await page.locator('.conversation-history-item.active').waitFor();
  const questions=['mi servicio esta muy lento desde ayer en todos los dispositivos','si en mi casa','por ambos','si sigue lento','que partido se juega mañana'];
  let conversationId;
  for(const [index,question] of questions.entries()){
    const waiting=page.waitForResponse(response=>response.url().includes('/api/conversations/message')&&response.request().method()==='POST',{timeout:90000});
    await page.getByPlaceholder('Escribe aquí lo que sucede con tu internet...').fill(question);
    await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
    const response=await waiting;const data=await response.json();
    report.turns.push({question,response:data.response,httpStatus:response.status(),source:data.assistantSource});save();
    assert.equal(response.status(),200);assert.ok(data.response);conversationId=data.conversationId;
    await page.locator('.chat-message.asistente p').filter({hasText:data.response}).last().waitFor({timeout:10000});
    await page.waitForFunction(()=>!document.querySelector('.chat-message[role="status"]'));
    if(index===0)assert.match(data.response,/domicilio/);
    if(index>=1&&index<=3){
      if(data.assistantSource!=='openai'){
        const last=(await pool.query("SELECT metadata FROM conversation_messages WHERE conversation_id=$1 AND sender='asistente' ORDER BY id DESC LIMIT 1",[conversationId])).rows[0];
        report.turns.at(-1).fallbackReason=last.metadata.apiFallbackReason;report.turns.at(-1).validationIssues=last.metadata.apiValidationIssues;save();
      }
      assert.equal(data.assistantSource,'openai','expected the real model, not local fallback');
    }
    if(index===2){assert.doesNotMatch(data.response,/¿.*WiFi.*cable.*ambos/);assert.doesNotMatch(data.response,/ac[eé]rcate/i);}
    if(index===4)assert.match(data.response,/servicio de internet/);
  }
  const stored=(await pool.query('SELECT sender,content,metadata FROM conversation_messages WHERE conversation_id=$1 ORDER BY id',[conversationId])).rows;
  assert.equal(stored.length,questions.length*2);
  assert.deepEqual(stored.filter(x=>x.sender==='usuario').map(x=>x.content),questions);
  const context=(await pool.query('SELECT assistant_context FROM conversations WHERE id=$1',[conversationId])).rows[0].assistant_context;
  assert.equal(context.service_location.confirmed,true);assert.equal(context.diagnostic_facts.connection_type,'both');
  assert.equal((await pool.query('SELECT count(*) n FROM support_tickets WHERE customer_id=$1',[owner])).rows[0].n,'0');
  const usage=(await pool.query('SELECT id,status,estimated_usd,reserved_usd,usage FROM assistant_api_usage WHERE customer_id=$1 ORDER BY id',[owner])).rows;
  assert.equal(usage.length,3);assert.ok(usage.every(x=>x.status==='COMPLETED'));
  report.usage=usage;report.estimatedUsd=usage.reduce((sum,x)=>sum+Number(x.estimated_usd),0);
  report.reservedUsd=usage.reduce((sum,x)=>sum+Number(x.reserved_usd),0);assert.ok(report.reservedUsd<.3);
  await page.reload();await page.locator('#route-content[aria-busy="false"]').waitFor();await page.locator('.chat-message').nth(9).waitFor();
  const displayed=await page.locator('.conversation-panel .chat-message').evaluateAll(elements=>elements.map(element=>({sender:element.classList.contains('usuario')?'usuario':'asistente',content:element.querySelector('p').textContent,top:element.getBoundingClientRect().top})));
  assert.deepEqual(displayed.map(({sender,content})=>({sender,content})),stored.map(({sender,content})=>({sender,content})));
  for(let i=0;i<displayed.length;i+=2)assert.ok(displayed[i+1].top>displayed[i].top);
  await page.screenshot({path:path.join(directory,'localhost-openai-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(directory,'localhost-openai-mobile.png'),fullPage:true});
  assert.equal(report.errors.length,0);
  report.checks=['Real authenticated frontend and backend','Location before diagnosis','Three real OpenAI responses','Both interpreted with history','Off-topic redirected','Ten messages persisted in order','Context persisted','Reload preserves order','No ticket without consent','Desktop and mobile','No browser JavaScript errors'];
  report.success=true;report.finishedAt=new Date().toISOString();save();
  console.log(JSON.stringify({success:true,turns:report.turns,costUsd:report.estimatedUsd,reservedUsd:report.reservedUsd,checks:report.checks,report:path.join(directory,'report.json')}));
})().catch(error=>{report.success=false;report.failure=error.message;save();console.error('Integration test failed: '+error.message);process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();
  if(owner){
    const attempted=(await pool.query('SELECT id,status,estimated_usd,reserved_usd,usage FROM assistant_api_usage WHERE customer_id=$1 ORDER BY id',[owner])).rows;
    report.usage=attempted;report.estimatedUsd=attempted.reduce((sum,x)=>sum+Number(x.estimated_usd||0),0);report.reservedUsd=attempted.reduce((sum,x)=>sum+Number(x.reserved_usd),0);save();
    // Remove only this synthetic account and its unapproved learning candidates.
    await pool.query("DELETE FROM assistant_knowledge_candidates WHERE source_message_id IN (SELECT m.id FROM conversation_messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.customer_id=$1) AND status<>'VALIDATED'",[owner]);
    await pool.query('DELETE FROM conversations WHERE customer_id=$1',[owner]);
    await pool.query('DELETE FROM users WHERE id=$1 AND email LIKE \'integracion-openai-%@example.test\'',[owner]);
    report.testAccountRemoved=true;save();
  }
  await pool.end();
});
