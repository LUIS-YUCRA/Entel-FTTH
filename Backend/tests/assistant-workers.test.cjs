const test=require('node:test');
const assert=require('node:assert/strict');
const {AssistantWorkerPool}=require('../src/services/AssistantWorkerPool');
const {resolvePythonPath}=require('../src/services/PythonRuntime');
const read=lines=>JSON.parse(lines.at(-1));

test('persistent Python workers isolate sequential customers and reload context', {timeout:60000},async()=>{
  const pool=new AssistantWorkerPool(resolvePythonPath,1);
  try{
    const first=read(await pool.run({message:'no tengo internet',customerId:'2001'}));
    const pid=pool.workers[0].child.pid;
    const other=read(await pool.run({message:'buenas tardes',customerId:'2002'}));
    assert.equal(other.context.customer.id,'2002');assert.equal(other.context.conversation.history.length,1);
    assert.equal(other.dialog_state,'START');assert.equal(pool.workers[0].child.pid,pid);
    const resumed=read(await pool.run({message:'si esta roja',customerId:'2001',encodedContext:Buffer.from(JSON.stringify(first.context)).toString('base64url')}));
    assert.equal(resumed.context.customer.id,'2001');assert.equal(resumed.context.conversation.history.length,2);
    assert.equal(resumed.context.diagnostic_facts.red_light,true);
    assert.equal(pool.workers[0].child.pid,pid);
    const failing=pool.run({message:'no tengo internet',customerId:'2003'});
    pool.workers[0].child.kill();
    await assert.rejects(()=>failing,e=>e.code==='PYTHON_EXIT'||e.code==='EPIPE');
    const recovered=read(await pool.run({message:'hola',customerId:'2003'}));
    assert.equal(recovered.success,true);assert.notEqual(pool.workers[0].child.pid,pid);
  }finally{pool.close();}
});

test('worker queue is bounded and shutdown rejects pending requests',async()=>{
  const pool=new AssistantWorkerPool(resolvePythonPath,1);
  pool.dispatch=()=>{};
  const pending=Array.from({length:32},()=>pool.run({message:'hola',customerId:'1'}));
  const settled=Promise.allSettled(pending);
  await assert.rejects(()=>pool.run({message:'hola',customerId:'2'}),e=>e.code==='ASSISTANT_BUSY');
  pool.close();
  assert.ok((await settled).every(r=>r.status==='rejected'));
});
