import test from 'node:test';
import assert from 'node:assert/strict';
import { hasIdleLimit, isIdleExpired, watchIdleSession } from '../src/services/IdleSession.js';
test('only administrator expires at two minutes',()=>{
 for(const role of ['cliente','tecnico','operador']) assert.equal(hasIdleLimit(role),false);
 for(const role of ['administrador']) assert.equal(hasIdleLimit(role),true);
 assert.equal(isIdleExpired(1000,120999),false);assert.equal(isIdleExpired(1000,121000),true);
});
test('human activity renews deadline; background checks and late activity do not',()=>{
 const target=new EventTarget();const documentTarget=new EventTarget();documentTarget.visibilityState='visible';
 let tick,heartbeat,time=1000,last=1000,expired=0,pings=0;
 target.setInterval=(fn)=>{tick=fn;return 1;};target.setTimeout=(fn)=>{heartbeat=fn;return 2;};target.clearInterval=()=>{};target.clearTimeout=()=>{};
 const stop=watchIdleSession({target,documentTarget,now:()=>time,readLastActivity:()=>last,writeLastActivity:value=>last=value,onExpire:()=>expired++,onActivity:()=>pings++});
 time=61000;tick();assert.equal(last,1000);
 target.dispatchEvent(new Event('keydown'));heartbeat();assert.equal(last,61000);assert.equal(pings,1);
 time=180999;tick();assert.equal(expired,0);
 time=181000;target.dispatchEvent(new Event('pointermove'));assert.equal(expired,1);assert.equal(last,61000);
 stop();
});
