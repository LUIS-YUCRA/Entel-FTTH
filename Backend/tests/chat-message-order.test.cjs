const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');

function model(query, file = 'Conversation.js') {
  const filename = path.resolve(__dirname, '../src/models', file);
  const actual = createRequire(filename);
  const module = {exports:{}};
  vm.runInNewContext(fs.readFileSync(filename,'utf8'), {
    module, require: name => name === '../config/db' ? {query} : name === './Notification' ? {} : actual(name),
  });
  return module.exports;
}

test('history and original question use insertion order, independent of timestamps', async () => {
  const queries = [];
  const Conversation = model(async (sql,params) => {queries.push({sql,params});return {rows:[]};});
  await Conversation.list(7);
  await Conversation.findOriginalProblem(12);
  await model(async(sql,params)=>{queries.push({sql,params});return {rows:[]};},'Ticket.js').findConversationMessages(9);
  assert.match(queries[0].sql, /\) ORDER BY m\.id ASC/);
  assert.equal(queries[0].params[0],7);
  assert.match(queries[1].sql, /ORDER BY id ASC LIMIT 1/);
  assert.match(queries[2].sql, /ORDER BY m\.id ASC/);
});

test('PostgreSQL keeps each answer below its question when all timestamps match', {
  skip: process.env.FTTH_TEST_DATABASE !== '1',
}, async () => {
  const {pool} = require('../src/config/db');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owner = (await client.query("SELECT user_id FROM customers ORDER BY user_id LIMIT 1")).rows[0]?.user_id;
    assert.ok(owner,'requires an existing customer');
    const conversation = (await client.query('INSERT INTO conversations(customer_id) VALUES($1) RETURNING id',[owner])).rows[0].id;
    const expected = [
      ['usuario','hola'], ['asistente','¡Buenas tardes! ¿En qué puedo ayudarte?'],
      ['usuario','tengo una duda con mi servicio de internet'], ['asistente','Claro, ¿qué necesitas saber sobre tu servicio?'],
      ['usuario','solo en algunos dispositivos que estan alejados'], ['asistente','¿Los dispositivos están conectados por WiFi?'],
    ];
    for (const [sender,content] of expected) {
      await client.query('INSERT INTO conversation_messages(conversation_id,sender,content) VALUES($1,$2,$3)',[conversation,sender,content]);
    }
    const timestamps = await client.query('SELECT COUNT(DISTINCT created_at)::int n FROM conversation_messages WHERE conversation_id=$1',[conversation]);
    assert.equal(timestamps.rows[0].n,1,'NOW() is the same throughout the transaction');
    const Conversation = model((...args)=>client.query(...args));
    for(let reload=0;reload<3;reload++) {
      const stored = (await Conversation.list(owner)).find(row=>row.id===conversation);
      assert.deepEqual(stored.messages.map(message=>[message.sender,message.content]),expected);
    }
    assert.equal(await Conversation.findOriginalProblem(conversation),'hola');
  } finally {
    await client.query('ROLLBACK');client.release();await pool.end();
  }
});
