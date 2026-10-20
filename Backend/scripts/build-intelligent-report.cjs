const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'../..');const temp=path.join(root,'tmp');
const latest=pattern=>fs.readdirSync(temp).filter(name=>pattern.test(name)).sort().at(-1);
const journeyPath=path.join(temp,latest(/^intelligent-journeys-\d+$/),'resultados.json');
const journeys=JSON.parse(fs.readFileSync(journeyPath,'utf8'));
const httpPath=path.join(temp,latest(/^login-profile-live-\d+\.json$/));
const http=JSON.parse(fs.readFileSync(httpPath,'utf8'));if(!http.completed||journeys.results.length!==4)throw new Error('Incomplete validation');
const turns=journeys.results.flatMap(s=>s.turns);
if(turns.some(t=>t.provider!=='openai'))throw new Error('Review API fallbacks before delivery');
let md='# Validación del asistente conversacional V2\n\n';
md+='Pruebas con GPT-6.1 Sol real, búsqueda web y PostgreSQL. Los clientes de evaluación son ficticios. El recorrido HTTP crea una cuenta temporal y la elimina al terminar; las propuestas de ticket de las conversaciones no se guardan ni envían notificaciones. La persistencia y la cola se verifican adicionalmente con PostgreSQL dentro de transacciones revertidas.\n\n';
md+='## Registro, login, perfil y soporte por HTTP\n\n';
for(const check of http.checks)md+='- '+check+'\n';md+='\n';
for(const turn of http.turns)md+=(turn.message?'**Cliente:** '+turn.message:'**Inicio de sesión y bienvenida**')+'\n\n**Asistente:** '+turn.response+'\n\n';
for(const s of journeys.results){md+='## '+s.name+'\n\n';for(const turn of s.turns)md+=(turn.event==='welcome'?'**Bienvenida**':'**Cliente:** '+turn.message)+'\n\n**Asistente:** '+turn.response+'\n\n';}
md+='## Cómo probar la clasificación por instancia\n\n1. Ingresa como administrador y abre **Instancias de servicio**.\n2. Registra una instancia con su categoría real y una referencia del contrato o padrón.\n3. Registra o inicia sesión con la cuenta cliente vinculada a esa instancia. El perfil mostrará la categoría verificada como dato de solo lectura.\n4. Abre una conversación nueva: el asistente utilizará esa categoría y ofrecerá completar los datos faltantes, sin bloquear la atención.\n5. Prueba una falla, interrumpe con una duda y luego responde afirmativa o negativamente a la solución o al reclamo.\n\nSi la instancia no está en el catálogo, se muestra **Pendiente de verificación**: no se inventa la categoría . No existe una conexión a un padrón comercial externo de ENTEL.\n\n';
md+='Versión local: [abrir aplicación](http://localhost:5173/). Esta actualización no se ha desplegado al sitio público.\n\nDetalles técnicos y comandos de validación: `deploy/ASISTENTE_CONVERSACIONAL_V2.md`.\n';
const output=path.join(root,'VALIDACION_ASISTENTE_V2.md');fs.writeFileSync(output,md);
console.log(JSON.stringify({path:output,conversationTurns:turns.length,httpChecks:http.checks.length,allConversationTurnsFromOpenAI:true,httpReport:httpPath}));
