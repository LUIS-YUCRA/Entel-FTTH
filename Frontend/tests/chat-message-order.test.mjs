import test from 'node:test';
import assert from 'node:assert/strict';
import {orderChatMessages} from '../src/utils/chatMessageOrder.js';

test('an inverted API response cannot put the assistant before its question',()=>{
  const question={id:'101',sender:'usuario',content:'hola buenas tardes',created_at:'2026-10-13T18:00:00Z'};
  const answer={id:'102',sender:'asistente',content:'¡Buenas tardes!',created_at:question.created_at};
  const received=[answer,question];
  assert.deepEqual(orderChatMessages(received),[question,answer]);
  assert.deepEqual(received,[answer,question]);
});
test('multiple turns and large PostgreSQL identifiers retain insertion order',()=>{
  const messages=['9007199254741004','9007199254741001','9007199254741003','9007199254741002'].map(id=>({id}));
  assert.deepEqual(orderChatMessages(messages).map(m=>m.id),['9007199254741001','9007199254741002','9007199254741003','9007199254741004']);
});
test('provisional messages keep their place and empty history is supported',()=>{
  const messages=[{id:1},{id:'local-request-uuid'},{id:2}];
  assert.deepEqual(orderChatMessages(messages),messages);
  assert.deepEqual(orderChatMessages(null),[]);
});
