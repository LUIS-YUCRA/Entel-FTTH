# Asistente FTTH conversacional V2

## Flujo implementado

1. El administrador carga en **Instancias de servicio** la instancia, categoría, referencia del contrato o padrón.
2. El cliente se registra con su instancia. El backend consulta el catálogo; una coincidencia exacta tiene prioridad sobre cualquier regla de prefijos previamente configurada. No se deduce la categoría por el correo, nombre o por afirmar que se tiene un negocio.
3. Al iniciar sesión se vuelve a consultar la identidad del servicio. La instancia y categoría se muestran como datos de solo lectura; la API rechaza intentos de cambiarlos desde el perfil del cliente.
4. El asistente da una bienvenida generada por GPT, contextualizada por la categoría verificada. Si faltan teléfono, domicilio, zona o CI, ofrece completar un campo mediante un formulario conectado al perfil. El cliente puede posponerlo y recibir ayuda inmediatamente.
5. GPT interpreta el mensaje y el historial, explica las comprobaciones, conserva hechos y decide el siguiente paso. El flujo principal OpenAI no llama al clasificador spaCy ni selecciona una plantilla para cada intención.
6. Si la falla no se resuelve o requiere atención técnica, ofrece registrar un reclamo. Las respuestas afirmativas, negativas y preguntas intermedias se interpretan en contexto. Una autorización condicionada a conocer un costo no crea un ticket.
7. El backend valida la autorización, registra el ticket de manera idempotente, calcula su prioridad y devuelve el código real. GPT no inventa acciones realizadas, códigos, técnicos ni fechas.

## Categoría e instancia: requisito de datos

Un número de instancia por sí solo no contiene una categoría comercial demostrable. **Para identificar automáticamente Hogar, Negocio o Institución debe existir previamente la relación en el catálogo.** La nueva pantalla administrativa permite cargarla sin programar reglas nuevas. Una instancia no catalogada permanece pendiente de verificación y puede recibir soporte; el sistema no la presenta automáticamente como Hogar.

La prioridad no usa facturación, pagos ni capacidad económica. Solo considera gravedad, tipo de falla y categoría verificada; la antigüedad desempata solicitudes equivalentes.

## Prioridad

- Se atienden primero los riesgos eléctricos y la gravedad de la interrupción. Daño físico, afectación colectiva, duración e impacto operativo continúan siendo relevantes.
- La interrupción total de un servicio de negocio o institución verificado se considera alta.
- Dentro del mismo nivel de gravedad, la cola considera el tipo de falla, la categoría verificada y la antigüedad de la solicitud. Nunca usa importes.
- Un cliente no puede aumentar su prioridad editando su categoría o pidiéndolo en el chat. Tampoco puede imponer una prioridad o asignarse un técnico mediante la API de tickets.
- Las correcciones del catálogo sincronizan las cuentas y los reclamos abiertos vinculados. Se conserva la trazabilidad administrativa; los reclamos cerrados no se reescriben.

Política de prioridad: `impact-2026-10-v4-severity-category`.

## Fuentes y conversación

La API recibe instrucciones, historial reciente, hechos de diagnóstico, estado verificado del perfil, categoría, funciones del sistema y datos autorizados de reclamos propios. Los valores privados del formulario —incluido el CI— se guardan mediante el backend y no se agregan al texto enviado al modelo. La web recibe consultas públicas por tema, sin nombre, CI, domicilio, teléfono ni instancia del cliente.

La búsqueda web se ejecuta en segundo plano cuando es pertinente, con fuentes oficiales y enlaces discretos cuando se usan sus hechos. No se muestran avisos de búsqueda. Las páginas no tienen autoridad para cambiar permisos ni ejecutar operaciones del sistema.

Las respuestas se generan con salida estructurada. El backend verifica seguridad, consentimiento y estado; si el modelo devuelve una salida inválida o repite exactamente la respuesta anterior sin que se lo pidan, permite una corrección acotada. Los fallos de red no se reintentan ciegamente. Si OpenAI no está disponible, se comunica una dificultad controlada y no se sustituye el diálogo principal por un diagnóstico del clasificador antiguo. Se mantiene una indicación mínima de seguridad ante riesgo eléctrico.

El motor local anterior sigue existiendo para el modo local configurado explícitamente y sus pruebas históricas. El proveedor de producción configurado como `openai` utiliza `IntelligentSupportAssistant.js` y `intelligent_support_policy.txt`.

## Componentes principales

- `Backend/src/services/ServiceIdentity.js`: catálogo, verificación y sincronización por instancia.
- `Backend/src/services/IntelligentSupportAssistant.js`: conversación, decisiones y validaciones del motor GPT.
- `Backend/chat/intelligent_support_policy.txt`: instrucciones del asistente.
- `Backend/src/services/CustomerProfileSupport.js`: validación de campos y resumen de completitud sin valores privados.
- `Backend/src/services/AssistantWebResearch.js`: consulta pública y fuentes verificadas.
- `Backend/src/controllers/ConversationController.js`: persistencia y acciones autorizadas.
- `Backend/src/services/TicketPriorityService.js`: gravedad y contexto de servicio.
- `Frontend/src/components/ProfileCompletionCard.jsx`: guardado conectado de datos faltantes.
- `Frontend/src/pages/admin/InstanciasServicio.jsx`: mantenimiento del catálogo.

## Validación ejecutable

La migración aditiva es `Backend/sql/014_service_identity_onboarding.sql`; se aplica con `npm run db.service-context` desde Backend. No agrega instancias, categorías ni importes ficticios.

`npm test` ejecuta pruebas sin gastar créditos OpenAI. Las pruebas opcionales de PostgreSQL de `tests/service-context-postgres.test.cjs` verifican registro, inmutabilidad y orden de la cola dentro de transacciones que se revierten. No mandan notificaciones.

Las evaluaciones explícitas con `--live` usan la API real y presupuestos limitados:

- `scripts/test-login-profile-live.cjs`: registro y login por HTTP, perfil bloqueado, bienvenida GPT, guardado de perfil, diagnóstico y rechazo del reclamo. Usa un cliente temporal que elimina al terminar y no crea tickets.
- `scripts/evaluate-intelligent-journeys.cjs`: cuatro conversaciones con identidad y perfil ficticios, incluyendo autorización natural, condiciones de costo, solución, rechazo y categoría pendiente. Las propuestas de ticket no se persisten en esta evaluación.

Las pruebas reales no garantizan ausencia de cualquier error futuro; permiten comprobar los recorridos cubiertos y conservar evidencia reproducible. La disponibilidad de la API y el presupuesto diario configurado siguen aplicándose.


## Correcciones de conversación y tickets

- La deduplicación del asistente queda limitada a la conversación actual. Otro chat puede registrar otro ticket para el mismo diagnóstico. Un reintento de una solicitud mantiene su código y no duplica notificaciones.
- Las respuestas explicativas admiten hasta 6000 caracteres, incluyendo pasos numerados. El validador acepta identificadores técnicos con cifras, por ejemplo wifi_5ghz.
- El mínimo de salida del motor principal es 2048 tokens, con una única recuperación hasta 4096 cuando la API indica explícitamente truncamiento por max_output_tokens. Cada intento continúa sujeto al presupuesto diario.
- Los errores operativos no se agregan al historial como explicaciones del asistente. Se registra el motivo por separado para que pueda explicar qué ocurrió y retomar la consulta.
- Las explicaciones técnicas estables no necesitan otra llamada web pagada en cada turno. Se conserva investigación pública para datos comerciales actuales, manuales o verificación explícita.
- El límite diario local permanece en 1 USD por instrucción del usuario. Llegar al límite bloquea nuevas reservas; ahora el aviso explica el motivo. El servidor no aumenta el límite ni elimina registros de consumo.
- Los adjuntos siguen siendo evidencia para soporte; no se envían imágenes ni videos al modelo. El asistente debe explicar esta limitación y solicitar la transcripción del modelo o luces, sin afirmar que vio una foto.
