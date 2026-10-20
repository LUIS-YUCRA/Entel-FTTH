const test=require('node:test');const assert=require('node:assert/strict');
const {OpenAIUsage}=require('../src/services/OpenAIUsage');const {pool}=require('../src/config/db');
test.after(()=>pool.end());
test('daily reservation locks before checking and persists across backend processes',async()=>{
  const calls=[];const db={pool:{connect:async()=>({query:async(sql,args)=>{calls.push({sql,args});return {rows:sql.includes('SUM')?[{total:'0.8'}]:sql.includes('INSERT')?[{id:'9'}]:[]};},release(){calls.push({sql:'RELEASE'});}})}};
  const repo=new OpenAIUsage(db);assert.equal(await repo.reserve({customerId:1,model:'gpt-6.1-sol',amount:.1,limit:1}),'9');
  assert.match(calls[1].sql,/advisory/);assert.match(calls[2].sql,/America\/La_Paz/);assert.match(calls[3].sql,/INSERT/);assert.equal(calls[3].args[3],'0.100000');
});
test('daily limit rejection rolls back without reserving or calling OpenAI',async()=>{
  const calls=[];const db={pool:{connect:async()=>({query:async sql=>{calls.push(sql);return {rows:sql.includes('SUM')?[{total:'0.99'}]:[]};},release(){}})}};
  await assert.rejects(()=>new OpenAIUsage(db).reserve({model:'gpt-6.1-sol',amount:.1,limit:1}),e=>e.code==='OPENAI_DAILY_BUDGET');assert.equal(calls.at(-1),'ROLLBACK');assert.ok(!calls.some(x=>x.includes('INSERT')));
});
test('uncertain timeouts retain reservation; known rejected requests release it',async()=>{
  const calls=[];const repo=new OpenAIUsage({query:async(sql,args)=>calls.push(args)});
  await repo.settle(1,{status:'UNKNOWN'});assert.equal(calls[0][1],null);
  await repo.settle(2,{status:'FAILED',errorCode:'OPENAI_HTTP_429'});assert.equal(calls[1][1],0);
  const cost=await repo.settle(3,{usage:{input_tokens:1000,output_tokens:100,input_tokens_details:{cached_tokens:500,cache_write_tokens:100}}});assert.equal(cost,.00305);
});
test('PostgreSQL reservation, real cost and budget refusal are transactional',{skip:process.env.FTTH_TEST_DATABASE!=='1'},async()=>{
  const client=await pool.connect();let number=0;const stack=[];
  const adapter={query:(...args)=>client.query(...args),pool:{connect:async()=>({query:async(sql,args)=>{
    if(sql==='BEGIN'){const name='usage_'+(++number);stack.push(name);return client.query('SAVEPOINT '+name);}
    if(sql==='COMMIT')return client.query('RELEASE SAVEPOINT '+stack.pop());
    if(sql==='ROLLBACK'){const name=stack.pop();await client.query('ROLLBACK TO SAVEPOINT '+name);return client.query('RELEASE SAVEPOINT '+name);}
    return client.query(sql,args);
  },release(){}})}};
  try{
    await client.query('BEGIN');const repo=new OpenAIUsage(adapter);
    const total=Number((await client.query("SELECT COALESCE(SUM(COALESCE(estimated_usd,reserved_usd)),0) total FROM assistant_api_usage WHERE billing_day=(NOW() AT TIME ZONE 'America/La_Paz')::date")).rows[0].total);
    const id=await repo.reserve({model:'gpt-6.1-sol',amount:.1,limit:total+.15});
    await assert.rejects(()=>repo.reserve({model:'gpt-6.1-sol',amount:.1,limit:total+.15}),e=>e.code==='OPENAI_DAILY_BUDGET');
    await repo.settle(id,{usage:{input_tokens:1000,output_tokens:100}});
    const row=(await client.query('SELECT * FROM assistant_api_usage WHERE id=$1',[id])).rows[0];assert.equal(row.status,'COMPLETED');assert.equal(Number(row.estimated_usd),.003);
  }finally{await client.query('ROLLBACK');client.release();}
});


test('zero disables the daily cap while preserving usage records', async () => {
  const calls=[];
  const repo=new OpenAIUsage({pool:{connect:async()=>({
    query:async(sql,args)=>{calls.push({sql,args});return {rows:sql.includes('INSERT')?[{id:'unlimited'}]:[]};},release(){}
  })}});
  assert.equal(await repo.reserve({model:'gpt-6.1-sol',amount:.2,limit:0}),'unlimited');
  assert.ok(calls.some(call=>call.sql.includes('INSERT')));
  assert.ok(!calls.some(call=>call.sql.includes('SUM')||call.sql.includes('advisory')));
  assert.equal(calls.at(-1).sql,'COMMIT');
});
test('invalid budgets still reject before accessing the database', async () => {
  const repo=new OpenAIUsage({pool:{connect:()=>{throw new Error('unexpected connection');}}});
  for (const limit of [-1,NaN,Infinity]) {
    await assert.rejects(()=>repo.reserve({amount:.1,limit}),error=>error.code==='OPENAI_BUDGET_CONFIG');
  }
});
