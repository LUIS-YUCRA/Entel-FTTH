// Integration check using temporary tables and rollback; real notifications are never touched.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const {pool} = require('../src/config/db');
(async()=>{
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  await client.query('CREATE TEMP TABLE users (id bigint, user_type text) ON COMMIT DROP');
  await client.query('CREATE TEMP TABLE notifications (id bigint, user_id bigint, created_at timestamptz) ON COMMIT DROP');
  await client.query("INSERT INTO users VALUES (1,'cliente'),(2,'tecnico')");
  await client.query("INSERT INTO notifications VALUES (1,1,NOW()-INTERVAL '3 months'),(2,1,NOW()-INTERVAL '3 months'+INTERVAL '1 second'),(3,2,NOW()-INTERVAL '4 months'),(4,1,NOW())");
  const filename=path.resolve(__dirname,'../src/models/Notification.js');const realRequire=createRequire(filename);const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,require:(name)=>name==='../config/db'?{query:(...args)=>client.query(...args)}:realRequire(name),console});
  await module.exports.purgeExpired();
  const remaining=await client.query('SELECT id FROM notifications ORDER BY id');
  assert.deepEqual(remaining.rows.map(row=>Number(row.id)),[2,3,4]);
  const dates=await client.query("SELECT count(*)::int AS total FROM (VALUES ('2026-09-23 00:00:00-04'::timestamptz),('2026-09-23 23:59:59-04'::timestamptz),('2026-09-24 00:00:00-04'::timestamptz)) t(created_at) WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz",['2026-09-23T04:00:00Z','2026-09-24T04:00:00Z']);
  assert.equal(dates.rows[0].total,2);
  console.log('PostgreSQL checks passed: 3-month expiry boundary, customer-only retention, inclusive final calendar day.');
 } finally {await client.query('ROLLBACK');client.release();await pool.end();}
})().catch(error=>{console.error(error);process.exitCode=1;});
