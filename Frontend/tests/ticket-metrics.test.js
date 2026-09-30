import test from 'node:test';
import assert from 'node:assert/strict';
import {ticketMetrics} from '../src/utils/ticketMetrics.js';
test('Mario: 23 total, 21 active, 2 resolved including travel and missed visit',()=>{
  const tickets=[...Array(12).fill({status:'PENDIENTE'}),...Array(6).fill({status:'ASIGNADO'}),{status:'EN_PROCESO'},{status:'EN_CAMINO'},{status:'INCUMPLIMIENTO_VISITA'},...Array(2).fill({status:'RESUELTO'})];
  const result=ticketMetrics(tickets);assert.equal(result.total,23);assert.equal(result.active,21);assert.equal(result.resolved,2);
});
test('technician: 12 received minus 4 completed leaves 8 active',()=>{
  const result=ticketMetrics([...Array(8).fill({status:'ASIGNADO'}),...Array(4).fill({status:'RESUELTO'})]);
  assert.equal(result.active,8);assert.equal(result.resolution_rate,33);
});
test('cancelled and closed tickets do not count as active',()=>{
  const result=ticketMetrics([{status:'CANCELADO'},{status:'CERRADO'},{status:'REPROGRAMADO'}]);assert.equal(result.active,1);assert.equal(result.cancelled,1);
});
