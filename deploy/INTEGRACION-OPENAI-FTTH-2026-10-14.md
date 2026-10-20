# OpenAI integrado al chat FTTH — 14 de octubre de 2026

El chat de localhost utiliza GPT-6.1 Sol mediante Responses API, exclusivamente desde Express. La clave permanece en `Backend/.env`. Se mantiene la interfaz existente, el orden de mensajes, la autenticación y la separación de clientes.

## Recorrido

React → `/api/conversations/message` → identidad y datos autorizados en PostgreSQL → guardas de alcance y ubicación → interpretación local de apoyo → OpenAI con procedimientos y contexto acotado → validación de estructura y contenido → persistencia del turno → respuesta en React.

Ante una falla técnica nueva se confirma el domicilio registrado. Si falta ubicación se solicita la zona, sin modificar automáticamente el perfil. Los datos de ubicación que el cliente aporta en ese paso se conservan en su contexto; se sustituye su texto por una confirmación al enviar el historial a OpenAI. Se conservan la pregunta y respuesta originales en PostgreSQL.

Las consultas claramente ajenas se redirigen sin llamar a la API. Otras consultas se evalúan con el modelo y el contexto. El modelo tiene instrucciones de alcance FTTH y produce JSON estricto; Express comprueba las acciones, los hechos, los códigos permitidos, las preguntas múltiples y recomendaciones peligrosas. El texto JSON no se muestra al cliente. No se garantiza que esta muestra cubra toda expresión posible.

## Memoria, conocimiento y reclamos

- Contexto y últimos turnos del mismo cliente recuperados desde la conversación autenticada.
- Procedimientos de seguridad en `Backend/chat/openai_support_policy.txt`.
- Conocimiento aprobado, relevante a la intención y con condiciones de uso satisfechas, incorporado como datos; no como instrucciones de autoridad.
- Mensajes originales, respuestas, análisis, origen del motor, consumo y motivos de respaldo guardados en PostgreSQL.
- Las consultas de tickets y antecedentes privados utilizan el backend autorizado; no se envía la base de datos al modelo.
- OpenAI puede proponer una revisión y ofrecer un reclamo. Un consentimiento inequívoco pasa al motor de dominio existente. Express registra y confirma únicamente el código realmente persistido, con deduplicación y prioridad calculada por el servidor.
- El aprendizaje mantiene candidatas para revisión humana. La integración no entrena automáticamente el modelo con los chats.

## Consumo y respaldo

Migración aditiva e idempotente: `Backend/sql/013_openai_usage.sql`. Tabla `assistant_api_usage`: reserva, uso, costo estimado y estado de cada llamada. Una exclusión transaccional en PostgreSQL serializa las reservas para que los procesos compartan el mismo presupuesto. El día se calcula con hora de Bolivia.

Configuración inicial en `Backend/.env`:

```dotenv
ASSISTANT_PROVIDER=openai
OPENAI_MODEL=gpt-6.1-sol
OPENAI_DAILY_BUDGET_USD=1
OPENAI_MAX_OUTPUT_TOKENS=1024
OPENAI_TIMEOUT_MS=45000
```

La clave `OPENAI_API_KEY` ya configurada no se reproduce en este documento. No se necesitan dependencias nuevas: se utiliza `fetch` de Node.js y la biblioteca `pg` existente. Ejecutar con Node.js 18 o posterior; validado en el entorno Node.js 24 del proyecto.

El límite es para las llamadas realizadas por este backend; no limita otras aplicaciones que utilicen la misma cuenta o clave. Se reserva conservadoramente el costo antes de llamar y se ajusta con el uso reportado. Las peticiones cuyo cobro no se puede determinar conservan su reserva. Se contemplan los tokens de escritura de caché y no se descuentan los descuentos de lectura de caché, por lo que la estimación puede superar la factura real. No hay reintentos automáticos pagados.

Ante falta de saldo, límite diario, errores de red, respuesta incompleta o validación fallida se utiliza el motor local. Las suites automáticas normales bloquean las llamadas pagadas. `ASSISTANT_PROVIDER=local` permite volver al motor anterior; reiniciar el backend después de cambiar la configuración. No se eliminan conversaciones.

## Verificación

Comandos:

```text
Backend: node scripts/migrate-assistant.cjs
Backend: node scripts/validate-assistant.cjs --database
Frontend: npm run build
Frontend: npm run lint
```

La prueba explícita `Backend/scripts/test-openai-chat-browser.cjs --live` requiere Playwright y consume saldo. No debe ejecutarse como prueba rutinaria. Verifica desde Chrome la página real `http://127.0.0.1:5173/dashboard/cliente`, usando una cuenta sintética y una sesión real temporal. Elimina la cuenta y sus conversaciones al finalizar, conservando el registro anónimo de gasto.

La prueba real aprobada comprobó: ubicación antes del diagnóstico, tres respuestas de OpenAI, interpretación de «por ambos», rechazo de fútbol ajeno al servicio, diez mensajes persistidos en orden, contexto conservado, recuperación al recargar, ausencia de tickets sin consentimiento, diseño en escritorio y móvil y ausencia de errores JavaScript.

Reporte de navegador: `tmp/openai-integration/report.json`. Capturas: `tmp/openai-integration/localhost-openai-desktop.png` y `localhost-openai-mobile.png`. Resultado de las suites: `deploy/ASISTENTE-validacion-real.json`.

Las comprobaciones en navegador necesitaron seis llamadas reales en total, incluyendo una ejecución inicial donde se rechazó una respuesta y se confirmó el respaldo. El validador distingue ahora el reinicio por corriente de la manipulación de fibra. Costo conservador de esas seis llamadas: US$0,026687. Sumado a la evaluación directa anterior de US$0,022658: US$0,049345, inferior al presupuesto autorizado de US$1. El costo es una estimación de tokens, no una lectura de la factura.

## Archivos principales

- `Backend/src/services/OpenAIAssistant.js`: alcance, ubicación, contexto, llamada y validación.
- `Backend/src/services/OpenAIUsage.js`: reserva y registro de consumo.
- `Backend/src/services/AssistantBridge.js`: selección del proveedor y respaldo Python.
- `Backend/src/controllers/ConversationController.js`: integración y metadata persistida.
- `Backend/chat/openai_support_policy.txt`: instrucciones y procedimientos FTTH.
- `Backend/tests/openai-assistant.test.cjs` y `openai-usage.test.cjs`: seguridad, contexto, consentimiento y presupuesto.
- `Frontend/src/pages/cliente/ClienteDashboard.jsx`: indicador de atención actualizado; el envío y el historial mantienen su contrato.

## Límites prácticos

La integración actual procesa texto. Las imágenes adjuntas siguen guardándose como evidencias del sistema; no se envían a visión de OpenAI en este cambio. No se implementó búsqueda web, modificación automática de planes, facturas o visitas ni acceso directo del modelo a SQL. Las acciones sensibles conservan los permisos y recorridos existentes. El conocimiento técnico nuevo requiere revisión y pruebas antes de publicarse.

Para iniciar pruebas manuales: recargar el navegador y abrir una nueva conversación. Confirmar la ubicación cuando se solicite y describir la falla. Las conversaciones anteriores conservan su historial.
