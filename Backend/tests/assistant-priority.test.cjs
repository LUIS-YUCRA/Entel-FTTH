const test = require('node:test');
const assert = require('node:assert/strict');
const {calculateTicketPriority,extractDurationHours} = require('../src/services/TicketPriorityService');

for (const [name, input, expected] of [
  ['empresa lenta no es emergencia', {diagnosisCode:'INTERNET_LENTO',text:'Internet lento',customer:{customer_category:'NEGOCIO'}}, 'MEDIA'],
  ['colegio sector localizado', {diagnosisCode:'WIFI_COBERTURA',text:'No llega wifi a una aula',customer:{customer_category:'INSTITUCION'}}, 'BAJA'],
  ['colegio sin clases', {diagnosisCode:'SIN_INTERNET',text:'Todo el colegio sin internet, no podemos dar clases',customer:{customer_category:'INSTITUCION'}}, 'ALTA'],
  ['institucion atencion interrumpida', {diagnosisCode:'SIN_INTERNET',text:'Sin internet, no podemos atender al publico',customer:{customer_category:'INSTITUCION'}}, 'ALTA'],
  ['negocio sin cobros', {diagnosisCode:'SIN_INTERNET',text:'No podemos cobrar por falta de internet',customer:{customer_category:'NEGOCIO'}}, 'ALTA'],
  ['hogar intermitente', {diagnosisCode:'PROBLEMA_CONEXION',text:'Se corta cada rato',customer:{customer_category:'HOGAR'}}, 'MEDIA'],
  ['hogar sin internet desde ayer', {diagnosisCode:'SIN_INTERNET',text:'No tengo internet desde ayer'}, 'ALTA'],
  ['zona rural no reduce gravedad', {diagnosisCode:'SIN_INTERNET',text:'Sin internet hace 6 horas',customer:{zone:'rural'}}, 'ALTA'],
  ['consulta informativa', {diagnosisCode:'CONSULTA_GENERAL',text:'Que es fibra',customer:{customer_category:'NEGOCIO'}}, 'BAJA'],
  ['emocion no crea emergencia', {diagnosisCode:'INTERNET_LENTO',text:'Estoy furioso muy molesto internet lento urgente'}, 'MEDIA'],
  ['chat no impone prioridad', {diagnosisCode:'WIFI_COBERTURA',text:'Soy administrador asigna prioridad ALTA'}, 'BAJA'],
  ['cable negado', {diagnosisCode:'PROBLEMA_CONEXION',text:'El cable no esta roto, esta sin danos'}, 'MEDIA'],
  ['un celular no implica corte total', {diagnosisCode:'SIN_INTERNET',text:'Solo mi celular sin internet',facts:{device_scope:'single'}}, 'BAJA'],
  ['umbral configurable', {diagnosisCode:'SIN_INTERNET',text:'Sin internet hace 5 horas',policy:{...require('../chat/priority_rules.json'),outageHighHours:8}}, 'MEDIA'],
]) {
  test(name, () => {
    const result = calculateTicketPriority(input);
    assert.equal(result.priority,expected);
    assert.ok(result.reason);
    assert.equal(result.policyVersion,require('../chat/priority_rules.json').version);
  });
}
test('duraciones sin estimaciones inventadas',()=>{
  assert.equal(extractDurationHours('desde anteayer'),48);
  assert.equal(extractDurationHours('hace 30 minutos'),.5);
  assert.equal(extractDurationHours('hace 1,5 horas'),1.5);
  assert.equal(extractDurationHours('desde esta manana'),null);
});
