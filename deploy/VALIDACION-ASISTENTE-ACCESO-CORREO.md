# Verificación del asistente, acceso por correo y notificaciones

Fecha: 12 de octubre de 2026. Cambios integrados en el proyecto local; no desplegados en Ubuntu ni enviados a GitHub por esta tarea.

## Causas encontradas

- La comparación con Git HEAD (6112ed4) mostró cuatro archivos Python con cambios previos sin commit. El filtro de alcance interceptaba saludos y consultas generales antes de registrar el contexto. Sus respuestas eran extensas.
- El clasificador descartaba similitudes inferiores al umbral, pero faltaba una intención de aclaración para «falla en mi internet». Así, una consulta pertinente terminaba como desconocida. Las distintas normalizaciones tampoco reconocían las mismas abreviaciones.
- AssistantEngine mantenía confirmaciones en atributos del proceso y DialogManager mantenía otras en memoria persistida. Como Node ejecuta Python por mensaje, el comportamiento variaba según la forma de invocación. La ruta antigua incluso proponía un ticket ante un simple «no» sin pedir confirmación.
- La comprobación de duplicados y la inserción de tickets eran operaciones separadas, susceptibles a reintentos simultáneos.
- isAllowedEmail devolvía true para cualquier correo de cliente: incluía ENTEL. La interfaz tampoco advertía esa reserva. El registro público ya asignaba el rol cliente; usar ese dominio no otorgaba por sí solo el rol administrador.
- El HTML de notificaciones había quedado reducido a título, texto y enlace. Adjuntaba un logo CID que el HTML nunca referenciaba.

## Arquitectura revisada

El recorrido es React/ChatService → ConversationController → AssistantBridge → PythonRuntime → assistant_runner → intent_classifier/entities → assistant_engine/dialog_manager → response_generator. Conversation guarda mensajes y contexto JSON en PostgreSQL; Ticket guarda el ticket real y Notification genera sus avisos.

Se revisaron nlp, memory, solution_engine, knowledge_base, guided_flows, guided_answers, reglas, extracción de entidades, ticket_service y ticket_engine. Se conservaron las intenciones, reglas, diez flujos guiados y las integraciones existentes. La presentación extensa de diagnósticos se sustituyó por pasos sucesivos: los pasos restantes se conservan y aparecen cuando el anterior no resuelve el problema.

## Comportamiento corregido

- Saludos explícitos respetados; saludos neutros usan el reloj real, convertido a America/La_Paz. Horarios por defecto: 05–11, 12–18, 19–04. Configurables con GREETING_MORNING_HOUR, GREETING_AFTERNOON_HOUR y GREETING_NIGHT_HOUR. Si Windows no dispone de datos IANA, se utiliza UTC−4 para Bolivia; Ubuntu debe tener tzdata.
- Consultas generales reciben una pregunta corta. Normalización interna de variantes frecuentes, conservando el mensaje original en el historial y en PostgreSQL.
- Una aclaración pendiente permite interpretar «no tengo» como falta de conexión. Interrupciones sociales, consultas informativas y temas ajenos no consumen respuestas del diagnóstico.
- Las respuestas de sí/no ya no se aceptan sólo por contener esas palabras dentro de un texto ajeno. Las luces ya informadas evitan una pregunta redundante.
- Confirmación de tickets centralizada en el diálogo persistido. Python propone; Node confirma únicamente tras guardar y muestra el código real de PostgreSQL.
- Ticket.create realiza comprobación de duplicado, inserción y auditoría dentro de una transacción con bloqueo PostgreSQL por cliente para las solicitudes del asistente. Los avisos se envían después del commit y los duplicados no vuelven a notificarse.
- Un turno simultáneo del mismo cliente recibe HTTP 409 mientras se procesa el anterior; otros clientes continúan. Los errores de Python conservan la respuesta controlada HTTP 503.

Ejemplo verificado:

> Cliente: buenas tardes
> Asistente: ¡Buenas tardes! ¿En qué puedo ayudarte?
>
> Cliente: tengo una duda
> Asistente: Claro, ¿cuál es tu duda?
>
> Cliente: tengo falla en mi internet q ago
> Asistente: Claro, te ayudaré. ¿No tienes internet o la conexión está lenta?
>
> Cliente: no tengo
> Asistente: ¿La luz LOS de tu equipo está roja? Si no distingues LOS, dime si ves alguna luz roja.

Antes, la tercera entrada devolvía «No pude identificar tu problema con claridad».

## Correos y acceso

| Operación | Resultado |
|---|---|
| Cliente: Gmail, Outlook, est.emi.edu.bo, otros edu.bo y dominios institucionales válidos | Permitido |
| Cliente: entel.bo, mayúsculas o subdominios de entel.bo | Bloqueado |
| Registro público con un rol técnico/operador/administrador solicitado manualmente | Bloqueado |
| Técnico/operador con ENTEL creado en Gestión de usuarios por administrador | Permitido |
| Cliente existente con ENTEL: login, token previo y renovación | Bloqueado |
| Recuperación de contraseña del personal ENTEL | Conservada |

Un administrador debe corregir el correo de las cuentas de cliente ENTEL creadas anteriormente. No se eliminaron cuentas ni se cambiaron roles o contraseñas. La reserva se aplica también a edición de perfil y edición administrativa. Se conservaron los otros dominios que ya admitía la política del personal.

El correo de notificación recuperó fondo claro, encabezado azul, logo integrado, bloque de información, botón y pie institucional. Se conservaron remitente, destinatario, asunto, texto, credenciales SMTP y URL /notificaciones (dominio en producción, localhost en desarrollo). No se modificó la plantilla de recuperación. El logo utiliza el recurso existente Frontend/src/assets/entel_bolivia.webp.

## Archivos modificados

Rutas relativas a la raíz SistemaFTTH:

| Archivo | Cambio |
|---|---|
| Backend/chat/assistant_engine.py | Una única autoridad para las confirmaciones; pasos de solución y propuesta de ticket |
| Backend/chat/assistant_runner.py | Análisis normalizado y contexto efectivo |
| Backend/chat/config.py | Horarios configurables de saludo |
| Backend/chat/dialog_manager.py | Aclaraciones, interrupciones, memoria, pasos y consentimiento |
| Backend/chat/guided_answers.py | Validación contextual de respuestas |
| Backend/chat/guided_flows.py | Preguntas breves, LOS/PON y revisión visual segura de fibra |
| Backend/chat/intent_classifier.py | Normalización compartida e intención de ayuda |
| Backend/chat/knowledge_base.py | Saludos, expresiones informales, clasificación y alcance |
| Backend/chat/memory.py | Historial original limitado y marcas de tiempo reales |
| Backend/chat/response_generator.py | Respuestas breves y eliminación de confirmaciones/horarios inventados |
| Backend/src/controllers/ConversationController.js | Concurrencia por cliente, resumen del problema y confirmación real |
| Backend/src/models/Ticket.js | Transacción y deduplicación atómica |
| Backend/src/controllers/AuthController.js | Registro cliente, login, perfil y renovación según dominio/rol |
| Backend/src/controllers/UserController.js | Creación exclusiva por administrador y validación de edición |
| Backend/src/controllers/PasswordController.js | Validación inicial neutral para conservar recuperación del personal |
| Backend/src/middleware/AuthMiddleware.js | Bloqueo de sesiones previas de clientes con ENTEL |
| Backend/src/middleware/ValidationMiddleware.js | Dominio reservado y validación sintáctica |
| Backend/src/utils/MailService.js | Sólo diseño de notificaciones y logo inline |
| Frontend/src/components/auth/RegisterForm.jsx | Advertencia/bloqueo inmediato de ENTEL |
| Frontend/src/components/ProfileEditor.jsx | Reserva de ENTEL al editar clientes |
| Backend/chat/test_natural_conversation.py | Nuevas pruebas de conversación |
| Backend/tests/assistant-integration.test.cjs | Puente real, errores, persistencia, tickets y concurrencia |
| Backend/tests/email-access.test.cjs | Roles, dominios, recuperación y correo |
| deploy/VALIDACION-ASISTENTE-ACCESO-CORREO.md | Este informe |

## Pruebas ejecutadas

- Python: 36 pruebas aprobadas, incluidas las 12 regresiones existentes.
- Backend Node: 55 pruebas aprobadas. Incluyen procesos Python reales con clientes aislados y restauración de contexto; tres llamadas completaron el escenario en aproximadamente 3,6 segundos en la ejecución final local. No es un benchmark de carga del servidor.
- PostgreSQL local: inserción temporal de conversación, guardado de texto original y contexto JSON, lectura de vuelta y ROLLBACK. Sin registros de prueba permanentes; las secuencias de IDs pueden avanzar por la inserción transaccional.
- Frontend: 7 pruebas existentes aprobadas, ESLint aprobado y compilación Vite aprobada.
- Navegador Chrome sobre el frontend compilado: ENTEL se rechaza antes de enviar la solicitud; est.emi.edu.bo llega a la API simulada. No se crearon usuarios.
- Vista de correo: revisada a 1080 y 375 píxeles; sin desbordamiento horizontal en móvil. Se comprobó escape de HTML y vinculación del logo CID.
- Pruebas SMTP con dobles de prueba; no se enviaron nuevos correos reales durante esta tarea.

Total de las suites automatizadas: 98 pruebas aprobadas (55 + 36 + 7), además de la comprobación funcional en navegador y la inspección visual.

## Repetir localmente

Desde la raíz del repositorio, PowerShell:

```powershell
& Backend/.venv312/Scripts/python.exe -B -X utf8 -m unittest discover -s Backend/chat -p 'test_*.py'
$env:ASSISTANT_DB_TEST='1'
node --test Backend/tests/*.test.cjs
Remove-Item Env:ASSISTANT_DB_TEST
Set-Location Frontend
npm run lint
npm run build
node --test tests/*.test.*
```

La prueba PostgreSQL usa la configuración existente del backend y necesita un cliente existente. Sin ASSISTANT_DB_TEST=1 se omite esa prueba real. No ejecutarla contra producción como parte de un despliegue automático.

Para comprobar manualmente, abrir una conversación NUEVA y repetir el ejemplo anterior; después probar una consulta fuera de tema, volver al diagnóstico y rechazar/confirmar la creación de ticket. Los chats ya cerrados conservan su estado.

## Despliegue Ubuntu

1. Revisar y subir los archivos indicados; no subir .env, entornos virtuales ni node_modules.
2. Actualizar el checkout del servidor con el commit revisado. Conservar el .env y la configuración SMTP actuales.
3. Mantener Node y dependencias fijadas por los package-lock.json del proyecto; esta tarea no añadió dependencias npm o Python. Instalar con npm ci si el despliegue lo requiere.
4. El servicio necesita Python compatible con el proyecto (probado localmente con 3.12 y spaCy 3.8.15). En Ubuntu, preparar python3-venv y tzdata si faltan; usar el entorno Python Linux existente o crear Backend/.venv e instalar Backend/requirements.txt. No copiar el entorno de Windows. El modelo es_core_news_md sigue siendo opcional: localmente no estaba instalado y se probó el modo de respaldo de spaCy.
5. Verificar que PYTHON_PATH, si está definido, apunte al Python de Ubuntu; PythonRuntime también detecta Backend/.venv/bin/python. No modificar las credenciales existentes.
6. Compilar Frontend con npm run build y publicar su dist en la ubicación que Nginx ya sirve. Conservar Frontend/src/assets/entel_bolivia.webp accesible al backend para el logo del correo.
7. Reiniciar el servicio backend mediante su gestor actual (PM2 o systemd) y verificar los logs. No es necesario cambiar Nginx ni ejecutar migraciones por esta tarea.
8. Usar un solo worker de backend para garantizar el bloqueo conversacional implementado por cliente. La deduplicación de tickets sí está protegida por PostgreSQL entre procesos, pero varios workers requerirían además coordinación distribuida del contexto antes de escalar.
9. Probar registro, login del personal, nueva conversación y una notificación en el dominio una vez desplegado. Esta tarea no comprobó el Ubuntu remoto.

## Límites pendientes

Las pruebas cubren escenarios definidos; no garantizan comprender cualquier frase posible. Se conserva el motor híbrido de reglas y similitud, sin modelos generativos ni servicios nuevos. No se hizo una prueba de carga exhaustiva ni una prueba visual de entrega en todos los clientes de correo. El diseño se verificó localmente; la clasificación de un mensaje como Spam no se corrige únicamente con HTML. No se modificaron ajustes de entregabilidad o del servidor.
