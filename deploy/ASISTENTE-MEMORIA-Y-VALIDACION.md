# Asistente FTTH: memoria revisada y correcciones conversacionales

Verificación local: 13 de octubre de 2026. No se realizó commit, push ni despliegue en Ubuntu.

## Resultado y alcance

Se corrigió el asistente existente. Se mantuvieron React/Vite, Express, PostgreSQL, AssistantBridge y el motor Python. No se sustituyó el chatbot ni se agregó Flask, un servicio externo de IA o una dependencia de pago. La recuperación de contraseña, SMTP, validación de correos y permisos de usuarios conservan los cambios anteriores.

Ahora se conservan los mensajes originales, se registra el análisis de cada turno del cliente actualizado y se proponen candidatos de conocimiento. Solo las versiones revisadas por administración pueden reutilizarse con otros clientes, en un paso de diagnóstico compatible. Guardar un chat o recibir una valoración positiva NO entrena ni aprueba automáticamente una respuesta.

## Auditoría y causas

Flujo real: `ClienteDashboard.jsx` → `ChatService.js` → `ConversationRoutes.js` → `ConversationController.js` → `AssistantBridge.js` → `PythonRuntime.js` → `assistant_runner.py` → clasificador/entidades/diálogo/soluciones/respuestas → PostgreSQL.

- `intent_classifier.py` combina reglas prioritarias y similitud con ejemplos de `intent_examples.py` y `knowledge_base.py`.
- `nlp.py` carga spaCy; localmente funciona con `es_blank`. Está instalado spaCy 3.8.15, pero no el modelo español con vectores. La similitud anterior utiliza tokens y comparación léxica, no un modelo generativo.
- `memory.py` contiene la sesión serializable; `dialog_manager.py` decide los pasos; `guided_flows.py` y `guided_answers.py` conservan los procedimientos.
- `ticket_service.py` produce una propuesta; `Ticket.js` guarda el ticket real, y el controlador confirma únicamente su código PostgreSQL.
- `conversations.assistant_context` guarda el estado; `conversation_messages` guarda mensajes. `conversation_details` es una vista, no una memoria compartida.

Las regresiones observadas se explicaban por patrones demasiado restrictivos para saludos y ayuda, falta de reconocimiento de una negativa cortés, y una aclaración general que podía interceptar la respuesta al reinicio. También faltaban hechos persistentes que distinguieran «ya reinicié y sigue mal» de una prueba todavía pendiente. La clasificación de una luz roja no distinguía suficientemente los nombres de sus indicadores.

Git contenía cambios locales anteriores, todavía sin commit. No se atribuye toda la regresión a un commit concreto ni se sobrescribieron esos cambios para reconstruir una supuesta versión anterior.

## Conversaciones conservadas

Antes y después de las pruebas: **66 conversaciones y 676 mensajes** (339 de clientes, 337 del asistente).

Huella de los mensajes, contenido y metadatos originales, antes y después:

`f19a4d049078e693ed6e987706841245`

Se crearon 337 candidatos separados: 326 requieren revisión, 9 están pendientes y 2 se validaron mediante revisión técnica local registrada en auditoría, sin suplantar una cuenta administradora.

- Mensaje histórico 598: se conserva la respuesta sobre si la lentitud afecta a todos los dispositivos o a uno.
- Mensaje histórico 43: se generalizó y corrigió la afirmación sobre LOS roja. Ahora expresa una posible pérdida de señal y solicita únicamente inspección visual, sin tocar la fibra.

No se borraron ni modificaron esos mensajes originales. Las inserciones de las pruebas se revirtieron; la prueba de concurrencia eliminó únicamente su conversación temporal creada expresamente para ella. Las secuencias pueden presentar saltos normales tras un rollback.

## Cambios de conversación

| Entrada o situación | Resultado comprobado |
|---|---|
| «buenas noches como esta» | Respuesta social breve; reconoce el saludo explícito y no cae en desconocimiento. |
| «puedes ayudarme con mi problema de mi servicio» | Pide describir lo que ocurre con la conexión. |
| «tengo falla en mi internet q ago» | Reconoce una falla general y pregunta si no hay internet o está lento. |
| «hay varias luces rojas» | Pregunta si son LOS, PON o Internet; no asume que todas son LOS. |
| LOS roja + cable visualmente bien | Ofrece revisión técnica, sin repetir un reinicio innecesario. |
| «no regreso el internet sigue hay fallas» después del reinicio | Avanza al ofrecimiento de ticket. |
| «no gracias» ante el ticket | Finaliza sin registrar ticket. |
| «mismo problema de ayer» | Consulta únicamente el historial del cliente autenticado y confirma si se repite. |
| Consulta del estado de un ticket | Utiliza el ticket perteneciente al cliente; no inventa estados de otros usuarios. |

Ejemplo validado:

Cliente: no tengo acceso a internet

Asistente: ¿La luz LOS de tu equipo está roja? Si no distingues LOS, dime si ves alguna luz roja.

Cliente: hay varias luces rojas

Asistente: ¿Qué nombres tienen las luces rojas: LOS, PON o Internet?

Cliente: la LOS está roja

Asistente: La luz LOS roja puede indicar pérdida de señal óptica. ¿Ves daños en el cable de fibra, sin tocarlo?

Cliente: el cable está todo bien, no tiene daños

Asistente: La luz óptica que reportaste y la revisión del cable sugieren una falla de señal que requiere revisión técnica. ¿Deseas que registre un ticket?

Cliente: no gracias

Asistente: Entendido, no registraré ningún ticket. Si necesitas ayuda más adelante, aquí estaré.

## Tres memorias y privacidad

1. **Sesión:** intención, pregunta pendiente, hechos declarados, inspección del cable, reinicio solicitado/realizado/resultado y consentimiento.
2. **Historial propio:** hasta cinco conversaciones anteriores del usuario autenticado, consultadas cuando hace referencia a un problema anterior. Solo se suministra un resumen permitido al motor. No se reutiliza una LOS roja de ayer como un hecho confirmado de hoy.
3. **Conocimiento compartido:** preguntas generales, variantes y respuestas revisadas, con intención, paso, condiciones, versión y vencimiento. No incluye identificadores de clientes ni transcripciones completas.

Los candidatos reciben redacción básica de correos, códigos, números y datos etiquetados. Esa redacción no sustituye la revisión humana: un nombre o dirección en texto libre puede requerir corrección manual. Los candidatos y sus versiones solo son accesibles al administrador. Las valoraciones de clientes están limitadas a respuestas de sus propias conversaciones.

El motor recupera contenido mediante conceptos FTTH y similitud léxica, con guardas de intención, paso y hechos. No son embeddings neuronales. `pgvector` no está disponible en la instalación local; con dos entradas revisadas no se justifica instalar otro servicio. La comparación es local y explicable. Si no hay coincidencia válida o falla la consulta del conocimiento, se mantienen las reglas existentes.

Inicialmente se habilitaron seis procedimientos revisables: revisión visual ante LOS roja, alcance de lentitud, información FTTH, facturación, instalación y orientación de clave WiFi. Las demás funciones del asistente siguen disponibles mediante sus reglas; añadir nuevos procedimientos reutilizables requiere definir y probar sus condiciones.

## Persistencia, reintentos y tickets

La migración `011_assistant_learning.sql` es adicional. Crea:

- `assistant_turns`: original, identificador de petición, intento, estado, respuesta, análisis y tiempos.
- `assistant_knowledge_candidates`: propuestas con su fuente histórica, estado y revisión.
- `assistant_knowledge_versions`: versiones generales vigentes/obsoletas/rechazadas, sin transcripción privada.
- `assistant_feedback`: valoración propia de una respuesta.
- `support_tickets.assistant_turn_key` e índice único para impedir repetir el mismo ticket por un reintento.

El cliente actualizado envía un UUID por turno y lo conserva al reintentar en la misma pantalla. PostgreSQL bloquea turnos simultáneos de una conversación. Mensaje del cliente, respuesta, estado y resultado se guardan en una transacción. Si Python falla, queda registrado el intento fallido y no un intercambio a medias. Un turno completado devuelve su respuesta guardada incluso si la conversación ya terminó. Los clientes antiguos sin UUID conservan compatibilidad, pero no reciben todas estas garantías nuevas.

El ticket se confirma después de guardarse en PostgreSQL. Su clave de reintento dura más que la ventana anterior de cinco minutos. Las credenciales SMTP y el diseño de correo no se modificaron en esta mejora.

La comunicación Node–Python transporta el contenido por entrada estándar, evitando el límite de longitud de argumentos de Windows y la exposición del contexto en la línea de comandos. Los errores del motor continúan convirtiéndose en un HTTP 503 controlado.

## Administración y valoración

Entra como administrador → **Conocimiento del asistente** (`/ConocimientoAsistente`).

1. Filtra candidatos pendientes o que requieren revisión.
2. Pulsa **Evaluar respuesta**.
3. Selecciona el procedimiento; corrige pregunta, variantes y respuesta.
4. Elimina cualquier dato personal y revisa la precisión técnica.
5. Escribe el motivo, marca la revisión y pulsa **Validar y publicar**.

«Útil» todavía no publica. Se puede rechazar o retirar conocimiento y publicar una versión anterior como una nueva revisión. Las versiones tienen vigencia de 180 días; las vencidas dejan de recuperarse. El trabajador de candidatos se ejecuta cada 30 segundos, en lotes; no aprueba contenido.

Por solicitud del usuario, se retiraron los botones **Me ayudó / No me ayudó** del chat. La revisión y validación de conocimiento permanece en el administrador.

## Entrenamiento supervisado

`supervised_model.py` implementa un clasificador opcional de centroides TF-IDF de caracteres. Ajusta pesos con ejemplos revisados, agrupa variantes para no repartirlas entre entrenamiento y evaluación, rechaza duplicados entre grupos y separa entrenamiento/validación/prueba. Solo puede complementar una intención desconocida: no reemplaza reglas técnicas, consentimiento ni el control del diálogo.

Se requieren al menos **3 intenciones con 30 grupos revisados distintos por intención**. Es un umbral mínimo conservador de ingeniería, no una garantía estadística de calidad. La validación calibra la aceptación; la promoción exige mejora sin nuevas clasificaciones incorrectas en el conjunto de prueba, un hash íntegro y regresiones aprobadas. El modelo anterior se puede restaurar.

Prueba con los datos locales: **2 grupos revisados; entrenamiento correctamente bloqueado por datos insuficientes**. No se entrenó ni activó un modelo real con esos dos ejemplos. Las pruebas de ajuste, evaluación, promoción y rollback usan fixtures separados.

Desde `Backend`:

```sh
node scripts/assistant-knowledge.cjs export /ruta/privada/revisados.json
python chat/supervised_model.py train --dataset /ruta/privada/revisados.json
python chat/supervised_model.py promote --version VERSION_EVALUADA
python chat/supervised_model.py rollback
```

La exportación no sobrescribe un archivo existente. No usar chats crudos como dataset. `ASSISTANT_MODEL_DIR` permite ubicar los artefactos fuera del código; preservar sus versiones para rollback. `ASSISTANT_MODEL_DISABLED=1` desactiva el complemento sin quitar las reglas.

## Pruebas y medidas

- **58 pruebas Python aprobadas:** saludos, normalización, contexto, flujos existentes, consentimiento, óptica, reinicios, recuperación, entrenamiento y versiones.
- **64 pruebas backend aprobadas, sin omisiones:** incluye PostgreSQL real, cliente A → candidato → validación → recuperación por cliente B, aislamiento, permisos, feedback, fallos transaccionales, concurrencia, reintentos y puente Python. También continúan pasando las regresiones previas de acceso y correo con transporte simulado.
- **7 pruebas frontend aprobadas.**
- **129 pruebas unitarias/integración/regresión aprobadas en total.**
- Prueba adicional de navegador Chrome: formulario del administrador, confirmación de privacidad, UUID del cliente, ausencia de botones de valoración, escritorio y móvil sin desbordamiento ni errores JavaScript. La API de esta prueba visual está simulada; la integración real PostgreSQL se prueba separadamente.
- ESLint y compilación Vite aprobados.
- No se enviaron correos reales ni se crearon tickets reales durante esta validación.

Recuperación: conjunto pequeño de 20 casos etiquetados, sobre las dos versiones realmente aprobadas en PostgreSQL. Con umbral **0.85**: 8 recuperaciones correctas y 12 abstenciones correctas; cero falsos positivos en ese conjunto. 0.90 omitió «la velocidad es baja». Antes de ampliar el reconocimiento de esa expresión, la exploración inicial tenía una omisión en 18 casos. Archivos: `ASISTENTE-recuperacion-antes.json` y `ASISTENTE-recuperacion-metricas.json`.

La mediana de comparación local fue aproximadamente 0.22 ms; NO incluye PostgreSQL ni lanzamiento de Python. Una llamada real al puente con recuperación demoró 1.82 segundos en este equipo. Esto no constituye una prueba de carga del servidor ni una promesa de exactitud universal. El conjunto de calibración debe ampliarse con consultas nuevas revisadas.

## Verificación local

Desde la raíz del proyecto, PowerShell:

```powershell
& Backend/.venv312/Scripts/python.exe -B -X utf8 -m unittest discover -s Backend/chat -p 'test_*.py' -q
$env:ASSISTANT_DB_TEST='1'
$env:FTTH_TEST_DATABASE='1'
node --test Backend/tests/*.test.cjs
node --test Frontend/tests/*.test.js
npm --prefix Frontend run lint
npm --prefix Frontend run build
```

Las pruebas de base necesitan clientes existentes y una base local/de pruebas. Mantienen rollback y limpian exclusivamente sus propios registros temporales. No ejecutarlas contra producción.

Reinicia tu backend local si no utilizas nodemon, abre el frontend y crea un **nuevo chat** para comprobar el flujo completo. Las conversaciones ya finalizadas permanecen finalizadas; no se reescriben sus respuestas antiguas. Prueba la conversación de arriba y otra de lentitud. Como administrador, revisa el menú nuevo.

El script visual requiere Playwright disponible y Chrome: `PLAYWRIGHT_MODULE` puede señalar una instalación ya existente. Ejecuta `node Frontend/tests/assistant-learning-browser.cjs` después del build. No se agregó esa dependencia a producción.

## Ubuntu: actualización necesaria

La migración 011 ya se aplicó únicamente a la base local. **Subir a GitHub no aplica esa migración en Ubuntu ni copia las dos respuestas validadas locales.**

1. Haz el respaldo habitual de la base y programa la actualización del backend.
2. Lleva el código revisado al servidor conservando su `.env` y configuración SMTP actuales.
3. Desde `Backend`, aplica solo la migración adicional de esta mejora:

```sh
node scripts/assistant-knowledge.cjs migrate
node scripts/assistant-knowledge.cjs collect
node scripts/assistant-knowledge.cjs metrics
```

No se recomienda reejecutar todas las migraciones históricas únicamente para instalar esta función. El script anterior aplica solo `011_assistant_learning.sql`.

4. Conserva el entorno Python del servidor. `PYTHON_PATH` debe apuntar a su intérprete Linux, por ejemplo `/ruta/SistemaFTTH/Backend/.venv/bin/python`; nunca copies la ruta Windows. No hay dependencias Python nuevas. Usa los requirements existentes si necesitas reconstruir el entorno.
5. Reinicia el proceso backend con el gestor que ya utilices (PM2 o systemd).
6. Compila `Frontend` con `npm ci` y `npm run build`, y publica `dist` en la ubicación que Nginx ya sirve. El backend debe estar actualizado y migrado antes de usar el cliente nuevo.
7. Mantén el proxy `/api` y el fallback de la aplicación React para rutas como `/ConocimientoAsistente`. Verifica acceso, nuevo chat y revisión de conocimiento con las cuentas correspondientes.
8. Revisa y publica conocimiento desde el administrador del servidor. La colección deja todo pendiente; no importa automáticamente la validación local. Los historiales privados no deben copiarse solo para trasladar estas dos respuestas generales.

Versiones locales observadas: Node 24.12.0, Python 3.12.14, spaCy 3.8.15, PostgreSQL 18.4. No se exige cambiar la versión del PostgreSQL de producción por esta migración; debe comprobarse allí antes de actualizar. Se preservaron los archivos de dependencias existentes.

Variables opcionales nuevas: `KNOWLEDGE_HIGH_THRESHOLD` (0.85), `KNOWLEDGE_REVIEW_THRESHOLD` (0.55), `ASSISTANT_MODEL_DIR`, `ASSISTANT_MODEL_DISABLED`. No necesitas definirlas para el funcionamiento local actual.

## Archivos de esta mejora

Motor modificado: `Backend/chat/assistant_runner.py`, `dialog_manager.py`, `guided_answers.py`, `knowledge_base.py`, `intent_classifier.py`.

Motor añadido: `Backend/chat/knowledge_policy.json`, `knowledge_retrieval.py`, `supervised_model.py`, `benchmark_retrieval.py`, `test_learning_conversation.py`, `test_supervised_model.py`.

Integración modificada: `Backend/server.js`, `Backend/src/App.js`, `Backend/src/controllers/ConversationController.js`, `Backend/src/models/Ticket.js`, `Backend/src/routes/ConversationRoutes.js`, `Backend/src/services/AssistantBridge.js`, `Backend/src/services/PythonRuntime.js`.

Integración añadida: `Backend/src/services/AssistantKnowledgeService.js`, `AssistantTurns.js`, `Backend/src/routes/AssistantKnowledgeRoutes.js`, `Backend/sql/011_assistant_learning.sql`, `Backend/scripts/assistant-knowledge.cjs`.

Frontend modificado: `Frontend/src/pages/cliente/ClienteDashboard.jsx`, `Frontend/src/services/ChatService.js`, `Frontend/src/router/AppRouter.jsx`, `Frontend/src/components/Navigation/RoleSidebar.jsx`.

Frontend añadido: `Frontend/src/pages/admin/ConocimientoAsistente.jsx`, `ConocimientoAsistente.css`, `Frontend/src/pages/cliente/AssistantFeedback.css`, `Frontend/tests/assistant-learning-browser.cjs`.

Pruebas backend: añadido `Backend/tests/assistant-learning.test.cjs`; ampliado `assistant-integration.test.cjs` y `python-runtime.test.cjs`; aislados mocks en `customer-portal.test.cjs` y `portal-regressions.test.cjs` para no consultar PostgreSQL desde pruebas unitarias.

Documentación añadida: este informe y los dos JSON de mediciones. Los demás cambios mostrados por Git —incluidos autenticación, correo, `assistant_engine.py`, `response_generator.py`, configuración y pruebas previas— ya estaban pendientes y se conservaron.

## Límites pendientes

- No hay un modelo generativo ni comprensión abierta de cualquier tema. Las respuestas provienen de reglas y conocimiento aprobado.
- La recuperación consulta hasta 300 versiones vigentes; para una base mucho mayor conviene evaluar índices/vectorización y más ejemplos antes de cambiar arquitectura.
- Se mantiene el proceso Python por petición de la integración existente. La carga del modelo ocurre por proceso, no en un servicio residente compartido. Las mediciones locales no sustituyen una prueba de concurrencia/carga en Ubuntu.
- Los seis procedimientos revisables iniciales son deliberadamente acotados para no reemplazar preguntas técnicas incompatibles. Su ampliación requiere pruebas de contexto.
- Los datos locales aún no justifican activar un clasificador reentrenado.
- No se ha verificado ni desplegado este cambio en el dominio. El ingeniero debe ejecutar la migración y comprobar el entorno de producción antes de declararlo operativo allí.
