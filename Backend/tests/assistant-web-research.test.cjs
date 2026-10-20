const test=require('node:test');const assert=require('node:assert/strict');
const {createWebResearch,researchTopic,publicSource}=require('../src/services/AssistantWebResearch');
const {pool}=require('../src/config/db');test.after(()=>pool.end());
test('search selects only public topic templates, preserving private and account queries',()=>{
  assert.equal(researchTopic('me mude de domicilio y quiero llevar el equipo'),'relocation');
  assert.equal(researchTopic('cuanto cuesta el plan de 100 megas'),'plans');
  assert.equal(researchTopic('como adjunto evidencia a mi ticket'),null);
  assert.equal(researchTopic('mi contraseña es privada'),null);
  assert.equal(researchTopic('y eso cuanto cuesta','relocation'),'billing');
});
test('research excludes customer content, tracks tool charges and caches verified citations',async()=>{
  const calls=[];const settlements=[];
  const run=createWebResearch({apiKey:'fake',model:'gpt-6.1-sol',usage:{reserve:async()=>7,settle:async(...args)=>settlements.push(args)},fetchImpl:async(url,args)=>{calls.push(JSON.parse(args.body));return {ok:true,json:async()=>({status:'completed',usage:{input_tokens:100,output_tokens:100},output:[{type:'web_search_call'},{type:'message',content:[{type:'output_text',text:'Consulta la cobertura.',annotations:[{type:'url_citation',url:'https://www.entel.bo/fibra',title:'Fibra ENTEL'},{type:'url_citation',url:'https://entel.bo.attacker.invalid',title:'Untrusted'}]}]}]})};}});
  const result=await run({topic:'relocation',customerId:'PRIVATE-ID',conversationId:'PRIVATE-CHAT'});
  assert.equal(result.status,'verified');assert.equal(result.sources.length,1);assert.equal(calls[0].tools[0].type,'web_search');
  assert.ok(!JSON.stringify(calls).includes('PRIVATE'));assert.equal(settlements[0][1].toolCostUsd,.03);
  assert.equal((await run({topic:'relocation'})).cached,true);assert.equal(calls.length,1);
});
test('failed or uncited search never becomes verified information',async()=>{
  const run=createWebResearch({apiKey:'fake',model:'gpt-6.1-sol',usage:{reserve:async()=>1,settle:async()=>{}},fetchImpl:async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'web_search_call'},{content:[{type:'output_text',text:'Unverified claim'}]}]})})});
  assert.equal((await run({topic:'plans'})).status,'unverified');
  assert.equal(publicSource({url:'javascript:alert(1)'},['entel.bo']),null);
});

test('backend ticket lookup is scoped to the authenticated owner including technician details',async()=>{
  const {KnowledgeRepository}=require('../src/services/AssistantKnowledgeService');const calls=[];
  const repo=new KnowledgeRepository({query:async(sql,args)=>{calls.push({sql,args});return {rows:[]};}});
  assert.equal(await repo.ownTicket('owner-1','TK-123'),null);
  assert.match(calls[0].sql,/t.customer_id=\$1/);assert.match(calls[0].sql,/technician_name/);assert.deepEqual(calls[0].args,['owner-1','TK-123']);
});
