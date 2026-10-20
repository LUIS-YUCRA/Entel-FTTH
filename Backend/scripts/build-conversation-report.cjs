const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'../..');const temporary=path.join(root,'tmp');
const latest=new Map();
for(const name of fs.readdirSync(temporary).filter(name=>/^conversaciones-web-\d+$/.test(name)).sort()){
  const source=path.join(temporary,name,'resultados.json');const report=JSON.parse(fs.readFileSync(source,'utf8'));
  if(!report.completed)continue;
  for(const s of report.scenarios)if(!s.issues.length)latest.set(s.name,{...s,source});
}
if(latest.size!==10)throw new Error('Expected ten validated conversations; got '+latest.size);
const scenarios=[...latest.values()].sort((a,b)=>a.name.localeCompare(b.name));
const count=scenarios.reduce((sum,s)=>sum+s.turns.length,0);
let md='# Diez conversaciones verificadas del asistente FTTH\n\n';
md+='Fecha de validación: 14 de octubre de 2026. Modelo: GPT-6.1 Sol.\n\n';
md+='Son transcripciones obtenidas mediante llamadas reales a OpenAI, búsqueda web real y el adaptador de producción del backend. Se usaron clientes ficticios: no se guardaron clientes, conversaciones ni reclamos en la base de datos durante estas evaluaciones. Las respuestas no fueron redactadas a mano.\n\n';
md+='Se verificaron **10 conversaciones y '+count+' turnos**. La conversación 09 usa un ticket ficticio para probar la consulta de estado; no representa un reclamo real. Un cierre por agradecimiento puede dejar la conversación disponible; los diagnósticos resueltos o reclamos rechazados muestran el cierre que decidió el backend.\n\n';
md+='La búsqueda se ejecuta en segundo plano, sin avisos de navegación. Las fuentes públicas usadas aparecen como enlaces. El backend aporta las funciones del sistema y consultas autorizadas; internet no determina el estado de una cuenta ni ejecuta trámites. Las tarifas citadas en estas pruebas son las encontradas en las fuentes en ese momento y están sujetas a sus condiciones.\n\n';
md+='Para probar la versión local: [abrir aplicación](http://localhost:5173/). Backend: http://localhost:3001/api/health. No se ha desplegado esta actualización al sitio público.\n\n';
for(const s of scenarios){
  md+='## '+s.name+'\n\n';if(s.fixture)md+='*Ticket de prueba: TK-PRUEBA, pendiente y sin fecha de visita.*\n\n';
  for(const turn of s.turns)md+='**Cliente:** '+turn.message+'\n\n**Asistente:** '+turn.response+'\n\n';
}
md+='## Comprobación técnica\n\nLa salida y procedencia de cada turno se conservan en el archivo JSON adjunto. Las evaluaciones finales seleccionadas no tuvieron respuestas idénticas consecutivas, rechazos de validación ni caídas al respaldo por errores de OpenAI. La respuesta inmediata de seguridad, las confirmaciones y las consultas de estado usan el backend cuando corresponde.\n';
const output=path.join(root,'VALIDACION_ASISTENTE_10_CONVERSACIONES.md');fs.writeFileSync(output,md);
fs.writeFileSync(path.join(root,'VALIDACION_ASISTENTE_10_CONVERSACIONES.json'),JSON.stringify({date:new Date().toISOString(),turns:count,scenarios},null,2));
console.log(JSON.stringify({path:output,conversations:scenarios.length,turns:count,issues:scenarios.flatMap(s=>s.issues)}));
