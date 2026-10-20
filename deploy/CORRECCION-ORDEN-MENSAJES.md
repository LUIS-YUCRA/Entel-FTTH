# Corrección del orden de preguntas y respuestas

El historial se ordenaba únicamente por `created_at`. PostgreSQL asigna el mismo `NOW()` a los mensajes insertados en una transacción, por lo que pregunta y respuesta podían empatar. Al consultar nuevamente el historial no había un orden definido entre ambos.

Se utiliza ahora `conversation_messages.id ASC`, que conserva el orden de inserción: primero el cliente y después el asistente. La corrección se aplica al historial del chat, a la consulta del primer mensaje y a la conversación asociada a un ticket. No requiere migración ni modifica o elimina los mensajes existentes.

Archivos: `Backend/src/models/Conversation.js`, `Backend/src/models/Ticket.js`, nueva prueba `Backend/tests/chat-message-order.test.cjs` y ampliación de `Frontend/tests/assistant-learning-browser.cjs`.

Verificación: dos pruebas aprobadas, incluida una transacción real de PostgreSQL con seis mensajes que comparten exactamente la misma fecha. Se consulta tres veces el historial y se comprueba la secuencia cliente/asistente. La prueba de Chrome verifica el orden del DOM y que cada respuesta esté físicamente debajo de su pregunta, también al recargar y tras reintentar un envío fallido. Sus datos de interfaz son simulados; los datos PostgreSQL se revierten al finalizar.

La interfaz también normaliza el historial por ID mediante `Frontend/src/utils/chatMessageOrder.js` y `Frontend/src/services/ChatService.js`, incluso si la API devuelve los mensajes invertidos. Conserva la posición de los mensajes provisionales y maneja IDs grandes sin perder precisión. `ClienteDashboard.jsx` evita que una carga inicial tardía del historial sobrescriba un envío o una selección de conversación posteriores.

Verificación adicional: tres pruebas unitarias del orden en frontend aprobadas; compilación y lint aprobados. La prueba de Chrome recibe intencionalmente el historial invertido y verifica las posiciones visuales después de recargar, reintentar y realizar otro envío. Captura: `tmp/assistant-ui/message-order-fixed.png`. Las respuestas usadas en esta prueba visual son simuladas.

Activado en localhost: se reinició el proceso del backend de esta carpeta. `/api/health` en el puerto 3001 devuelve HTTP 200. Vite en el puerto 5173 devuelve HTTP 200 y sirve tanto la normalización del historial como la protección contra cargas tardías. No se realizó despliegue al servidor público desde esta sesión.
