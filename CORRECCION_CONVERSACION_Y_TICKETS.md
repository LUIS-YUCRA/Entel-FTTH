# Corrección de consultas y tickets del asistente

## Hallazgos comprobados

La auditoría local encontró una respuesta rechazada con SHAPE_OR_LENGTH y tres respuestas bloqueadas con OPENAI_DAILY_BUDGET. El consumo registrado al revisar era 0,944872 USD; el resto no alcanzaba para la reserva conservadora de otra llamada. Esto corresponde al límite diario de 1 USD configurado en el sistema, que el usuario pidió mantener.

El validador anterior limitaba a 1400 caracteres y excluía cifras de los identificadores de intención. No se conserva la salida original rechazada, por lo que no se atribuye ese rechazo concreto a uno solo de esos dos controles. Ambos impedían respuestas técnicas válidas.

El ticket anterior se reutilizaba por cliente + diagnóstico abierto, sin distinguir conversación. Se limitó la búsqueda a la conversación actual, conservando protección frente a reintentos del mismo turno. No se modificó ni cerró TK-049.

## Cambios aplicados

- Hasta 6000 caracteres para instrucciones y explicaciones; pasos numerados cuando correspondan.
- Identificadores como wifi_5ghz son válidos.
- Salida mínima 2048 tokens y recuperación acotada de una respuesta truncada con mayor espacio, respetando el presupuesto.
- Menos llamadas web redundantes para preguntas técnicas estables.
- Aviso específico cuando el presupuesto impide continuar y motivo del error disponible para el siguiente turno, sin contaminar el historial con respuestas de error repetidas.
- Guía WiFi general útil sin obligar a conocer antes el modelo. No se inventa una IP o credenciales universales; se explica cómo encontrar la puerta de enlace y se pide el modelo solo para precisar menús.
- Respuesta honesta a preguntas sobre fotos: el adjunto se guarda como evidencia y actualmente GPT no lo recibe para analizarlo.

## Ejemplo de respuesta esperada: cambiar la clave WiFi

Este ejemplo ilustra el comportamiento solicitado; no es una nueva respuesta obtenida de una llamada pagada.

Puedes cambiarla si tienes acceso autorizado a la administración del equipo:

1. Conéctate a tu red WiFi o por cable al router.
2. En los detalles de esa conexión, busca la dirección de puerta de enlace o router. La dirección depende del equipo y su configuración.
3. Abre esa dirección en la barra de direcciones del navegador.
4. Inicia sesión con las credenciales de administración autorizadas. Son distintas de la contraseña del WiFi; no las compartas en el chat.
5. Busca WiFi, WLAN o Wireless y entra en la seguridad de tu red. Los nombres cambian según modelo y firmware.
6. Cambia la clave de la red correcta. Si existen redes separadas de 2,4 y 5 GHz, revisa cuál quieres modificar o si comparten configuración.
7. Guarda con Apply o Save. El WiFi puede desconectarse temporalmente al aplicar el cambio.
8. Reconecta tus dispositivos con la nueva contraseña.

No pulses RESET ni cambies WAN, VLAN o fibra. Si el proveedor restringe el acceso, solicita el cambio a soporte. Para precisar los menús, indica solo la marca y el modelo completo de la etiqueta, ocultando contraseñas y códigos de acceso.

## Verificación

- Suite general: 160 pruebas; 152 correctas tras corregir una comparación de arreglos entre contextos VM; ocho opcionales de base de datos omitidas en esa ejecución.
- PostgreSQL real: tres pruebas correctas con rollback. Incluye dos chats con el mismo diagnóstico que reciben tickets distintos y un reintento que conserva el segundo ticket. Notificaciones sustituidas por un contador; no se enviaron comunicaciones ni quedaron tickets ficticios.
- Pruebas de salida larga, intención 5 GHz, límite diario, historial después de un error, pregunta de imágenes y recuperación por truncamiento: correctas con API simulada.
- No se hicieron nuevas llamadas pagadas a GPT durante esta corrección. Las comprobaciones simuladas verifican la integración; no garantizan textos exactos del modelo en producción.
- Backend local reiniciado. El despliegue público requiere actualizar su backend con estos archivos.
