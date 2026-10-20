# Consentimiento natural para reclamos técnicos

El diálogo diagnosticó la falla correctamente, pero la validación de consentimiento exigía afirmaciones aisladas o comandos muy específicos. «Que un técnico venga a mi domicilio» no coincidía con esa validación y volvía a ofrecer el reclamo.

Se incorporó una política compartida en `Backend/chat/ticket_consent_policy.json`. Tanto `OpenAIAssistant.js` como `guided_answers.py` la utilizan, evitando discrepancias entre Express y el motor Python.

Después de ofrecer el reclamo se aceptan solicitudes claras de atención como:

- «Que un técnico venga a mi domicilio».
- «Sí, que un técnico venga a solucionar mi servicio».
- «Quiero que venga un técnico».
- «Necesito un técnico en mi casa».
- «Manden un técnico por favor».
- «Solicito una visita técnica».

La solicitud se considera consentimiento y pasa directamente al motor de dominio, sin una nueva pregunta de sí/no y sin llamar a OpenAI. El ticket solo se confirma cuando Express lo persiste. Las negaciones prevalecen; las consultas informativas, quejas y condiciones de costo no equivalen a consentimiento.

La interpretación de ubicación se mantiene separada: pedir un técnico no confirma automáticamente el domicilio. Antes de ofrecer un reclamo se conserva el recorrido de diagnóstico y confirmación correspondiente.

Pruebas: 113 Python y 117 Node aprobadas con PostgreSQL real. Se reprodujeron ambas frases de la conversación y se verificó que generan la propuesta de ticket en un turno desde el estado de confirmación, usando el motor Python real. Se verificaron negaciones, preguntas, condiciones, texto ambiguo y ausencia de creación automática antes de ofrecer el reclamo. No se enviaron notificaciones ni se gastó saldo de OpenAI.

Regresiones: `Backend/chat/test_natural_ticket_consent.py` y `Backend/tests/openai-assistant.test.cjs`. No requiere entrenamiento, dependencias nuevas ni migración SQL.
