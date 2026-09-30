const {pool} = require('../src/config/db');
const {overview} = require('../src/controllers/DashboardController');
const assert = require('node:assert/strict');
(async()=>{
  const users=(await pool.query("SELECT id,user_type FROM users WHERE user_type IN ('cliente','tecnico') AND is_active = TRUE")).rows;
  for(const user of users) {
    let data;
    await overview({user},{json:value=>{data=value;}},error=>{throw error;});
    const m=data.metrics;
    assert.equal(m.total,m.active+m.resolved+m.closed+m.cancelled);
    console.log({id:user.id,role:user.user_type,total:m.total,active:m.active,completed:m.resolved+m.closed,cancelled:m.cancelled});
  }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>pool.end());
