# Atención amable y comprensión contextual — 13 de octubre de 2026

## Fallos comprobados y correcciones

| Archivo | Fallo o mejora | Corrección | Verificación |
| --- | --- | --- | --- |
| `Backend/chat/guided_answers.py` | «Por ambos» no respondía al paso WiFi/cable | Resolución contextual de ambos, ambas y las dos formas; conservación del tipo de conexión | Variantes y negaciones; la referencia fuera de esa pregunta no se interpreta como conexión |
| `Backend/chat/dialog_manager.py` | Lentitud por cable recibía sugerencias de distancia WiFi | Orientación según conexión y alcance; omitir datos ya contestados | Transcripción reportada, descripción completa y dispositivo único por cable |
| `Backend/chat/guided_flows.py` | Atención demasiado directa, sin explicar el propósito de las pruebas | Mensajes amables con explicación breve, una pregunta por turno y pasos sencillos | Guías de ausencia de internet, lentitud, cortes, energía, cobertura, cable y aplicaciones |
| `Backend/chat/dialog_manager.py` | Un sí/no podía conducir al ticket aunque hubiera mejoría | Interpretación según la pregunta pendiente y cierre cuando se confirma mejoría | WiFi mejoró, cable dejó de estar lento y aplicación dejó de fallar |
| `Backend/chat/knowledge_base.py` | «Mi WiFi tiene poca señal» pedía una aclaración genérica | Reconocimiento de cobertura débil expresada de distintas maneras | Prueba de apertura de soporte |
| `Backend/chat/dialog_manager.py` | El diagnóstico guardaba el texto estático de una pregunta aunque se hubiera elegido una rama distinta | Guardar la pregunta contextual enviada junto a la respuesta del cliente | Prueba de pregunta por cable; historial original permanece en PostgreSQL |

Se conservan el historial, el orden de los mensajes, los permisos, las confirmaciones de reclamos y el aislamiento por cliente. No hay dependencias nuevas ni migraciones en esta modificación.

## Guardado y aprendizaje

Cada turno completado guarda la pregunta original, la respuesta del asistente, el análisis y el contexto. El trabajador de conocimiento revisa los nuevos mensajes cada 30 segundos y al iniciar el servidor; crea candidatas anonimizadas, evita duplicados y vincula cada respuesta con su candidata. La revisión administrativa y la aprobación técnica preceden a la incorporación al conocimiento utilizado por el asistente.

Se amplió la prueba real Node → Python → PostgreSQL para ejecutar los cinco turnos reportados, comprobar diez mensajes en orden y verificar que las cinco respuestas tengan una candidata. Los datos de esa prueba se revierten al terminar. La prueba también comprueba que el cliente B utiliza conocimiento aprobado a partir de A sin recibir el historial privado de A.

Guardar conversaciones no equivale a entrenar automáticamente un modelo. Las respuestas incorrectas y los datos privados no deben convertirse directamente en conocimiento. La recuperación de conocimiento aprobado y el modelo supervisado existentes siguen sus flujos de validación.

## Validación

Comando reproducible desde `Backend`: `node scripts/validate-assistant.cjs --database`.

Resultado final: **108 pruebas Python y 84 pruebas Node aprobadas, ninguna omitida**. Incluye PostgreSQL real, persistencia, aprendizaje, memoria entre procesos, permisos, privacidad, concurrencia, reintentos y confirmación de tickets. Informe: `deploy/ASISTENTE-validacion-real.json`. Nuevos casos conversacionales: `Backend/chat/test_friendly_support.py`.

Se reinició el backend local y sus trabajadores antiguos para cargar esta versión. Para probar el diagnóstico desde el principio, abrir una nueva conversación: las conversaciones existentes conservan su paso anterior y su historial.

## Límites prácticos

El asistente es especializado en soporte FTTH. Ante información insuficiente debe aclarar la consulta o solicitar revisión; no puede garantizar una solución a cualquier pregunta ni inventar planes, causas o visitas. El tono más amable no sustituye la comprobación técnica: conviene valorar las respuestas reales y revisar las candidatas antes de aprobarlas.
