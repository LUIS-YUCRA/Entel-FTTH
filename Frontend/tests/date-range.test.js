import test from 'node:test';
import assert from 'node:assert/strict';
import { presetRange, rangeParams } from '../src/utils/dateRange.js';
test('week starts Monday and month starts on day one',()=>{
  const now = new Date(2026,8,23,12);
  assert.deepEqual(presetRange('week',now),{from:'2026-09-21',to:'2026-09-23'});
  assert.deepEqual(presetRange('month',now),{from:'2026-09-01',to:'2026-09-23'});
  assert.deepEqual(presetRange('day',now),{from:'2026-09-23',to:'2026-09-23'});
  assert.deepEqual(presetRange('all',now),{from:'',to:''});
});
test('same-day search includes the entire local day and excludes next midnight',()=>{
  const params=new URLSearchParams(rangeParams({from:'2026-09-23',to:'2026-09-23'}));
  assert.equal(new Date(params.get('from')).getDate(),23);
  assert.equal(new Date(params.get('to')).getDate(),24);
  assert.equal(new Date(params.get('to')).getHours(),0);
  assert.equal(rangeParams({from:'',to:''}),'');
});
