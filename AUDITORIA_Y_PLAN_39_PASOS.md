# Auditoría y propuesta de integración de los 39 puntos

## Alcance y estado de esta entrega

Auditoría del código local del sistema existente. No se reemplaza el proyecto ni se consideran cumplidos los 39 puntos. Las correcciones del turno anterior se conservan. Esta entrega cumple la revisión previa solicitada en los puntos 37 y 38; la implementación amplia queda pendiente de aprobación expresa de esta propuesta, conforme al archivo proporcionado.

No se consultó el contenido de la base de datos operativa ni se aplicaron migraciones. Encontrar una tabla en SQL no demuestra que esté instalada o poblada. La inspección de interfaz es de código; queda pendiente comprobar visualmente la aplicación con sesiones de cada rol.

## 1. Arquitectura actual y dependencias

- Frontend: React, Vite, React Router; portales de cliente, operador, técnico y administrador.
- Backend: Express y Node.js CommonJS; PostgreSQL mediante `pg`; JWT y sesiones; multer para evidencias.
- Asistente: Python, clasificador de intenciones por expresiones y similitud, spaCy opcional y alternativa local, extractor de entidades, memoria serializada y flujos guiados.
- Persistencia: `users`, `customers`, `conversations`, `conversation_messages`, `support_tickets`, `evidences`, `ticket_history`, `notifications`, `audit_logs`, perfiles técnicos y sesiones.
- La migración 008 define `system_parameters` e `instance_classifications`. Esta última contiene prefijos, categoría y estado activo, pero no encontré su consumo en el código de registro.
- Reportes: servicio administrativo y servicio de historial técnico; exportaciones PDF, Word y Excel existentes.

Dependencia principal:

`ClienteDashboard → ChatService → ConversationRoutes → ConversationController → AssistantBridge → assistant_runner → classifier/extractor → AssistantEngine → DialogManager → memory → respuesta JSON → FailureCatalog/TicketPriorityService → Ticket → PostgreSQL → interfaz`.

Evidencias: `ClienteDashboard → ChatService → EvidenceRoutes/multer → EvidenceController → evidences + conversation_messages`. El envío actual de archivos ocurre después del mensaje, incluso cuando ese mensaje genera ticket.

Registro: `RegisterForm → AuthRoutes/ValidationMiddleware → AuthController.register → User.create → users/customers`.

Reportes: `Reportes/HistorialTecnico → servicios frontend → controladores de reportes → servicios SQL → generadores de documentos`.

## 2. Cómo funciona el asistente hoy

El backend añade ID de cliente, dirección, zona y categoría al contexto. Python restaura la memoria por solicitud, clasifica el mensaje, extrae entidades y selecciona un flujo. La memoria incluye intención, entidades, historial, diagnóstico, solución, ticket y estado.

Las mejoras anteriores agregaron validación por patrones para preguntas, cambio de lentitud a interrupción, detección de determinadas contradicciones y almacenamiento de preguntas/respuestas validadas. El mecanismo predominante sigue siendo un índice dentro de `guided_flows`, no un planificador de preguntas basado completamente en hechos.

Python propone el ticket; Node lo guarda y calcula de nuevo su prioridad. El catálogo ya da preferencia al código de diagnóstico final. El mensaje persistido ya evita prometer un horario de visita. Las evidencias se almacenan, pero no existe un analizador visual conectado en la ruta revisada.

## 3. Hallazgos priorizados

| Gravedad | Hallazgo comprobado en código | Consecuencia | Corrección propuesta |
|---|---|---|---|
| CRÍTICO | `User.updateOwnProfile` acepta `customerCategory` y `serviceNumber` del cliente | Categoría e instancia no son datos autoritativos; la categoría influye en prioridad | Resolver desde servicio validado y excluir estos campos del autoeditor |
| CRÍTICO | `EvidenceController.canAttach` valida conversación y retorna sin validar simultáneamente ticket si se proporcionan ambos | Puede vincular una conversación propia con un ticket ajeno | Validar cada entidad y su relación, derivar ticket desde conversación |
| ALTO | `getOrCreate` acepta ID inválido, ajeno o finalizado como motivo para buscar/crear otra conversación | Se oculta el error y se puede mezclar la intención del envío | ID explícito debe existir, pertenecer al usuario y estar activo; rechazar lo contrario |
| ALTO | No existe bloqueo estricto de evidencias por estado; se permiten mensajes de cortesía al finalizar | Incumple inmutabilidad del historial | `FINALIZADA` como equivalente compatible de bloqueo; rechazar escrituras |
| ALTO | El cliente abre conversación nueva automáticamente al escribir en una finalizada | El usuario no decide explícitamente iniciar asistencia | Deshabilitar controles y usar botón Nueva conversación |
| ALTO | Se suben archivos después de la respuesta que puede cerrar el chat | Al imponer bloqueo se perdería el envío esperado | Subir a conversación activa antes del mensaje; solo confirmar ticket cuando terminen |
| ALTO | Duplicados: consulta y creación separadas; ventana fija de cinco minutos | Dos solicitudes concurrentes pueden crear duplicados | Transacción, exclusión concurrente por servicio y clave idempotente |
| ALTO | Ticket, evidencia y finalización no comparten una transacción | Una operación puede quedar parcialmente completada | Unidad transaccional y notificaciones posteriores al commit |
| ALTO | Dos políticas de prioridad: categoría basta para ALTA; reglas geográficas y temporales diferentes | Resultados distintos para una misma falla | Un único motor autoritativo configurable |
| ALTO | Segmentos limitados a HOGAR/NEGOCIO/INSTITUCION; sin relación de servicio/contrato verificada en registro | No se cumple identificación automática de cuatro segmentos | Catálogo de servicios y segmentos compatible con datos existentes |
| ALTO | Validación conversacional todavía por expresiones e índices | Respuestas mixtas, cambios y negaciones no cubiertos pueden fallar | Hechos estructurados, eventos múltiples y selección de pregunta útil |
| MEDIO | Listado de tickets ordenado por fecha descendente | No existe orden de atención por puntuación ni protección de espera | Puntuación base y componente dinámico de antigüedad |
| MEDIO | `findOriginalProblem` puede devolver un saludo introductorio | Descripción inicial pobre | Resumen técnico desde hechos, conservando relato original |
| MEDIO | SLA administrativo fijo de 24 horas | No representa SLA configurable por servicio/política | Versionar política y guardar fecha límite al crear ticket |
| MEDIO | Alta prioridad en overview incluye tickets terminados | KPI no equivale a Alta activa | Filtrar estados abiertos |
| MEDIO | Reportes no tienen instrumentación específica del asistente | No se miden contradicciones, cambios ni resolución automática real | Eventos estructurados y métricas con denominadores definidos |
| MEDIO | Eliminación del historial físico está disponible | Conflicto con historial cerrado solo de consulta | Conservar registros cerrados; ocultamiento personal si se requiere |
| BAJO | Dos funciones sin uso en RegisterForm | Lint falla | Retirar o integrar funciones en el cambio del registro |

## 4. Arquitectura propuesta

### Servicio y segmento autoritativos

Mantener `customers.service_number` por compatibilidad. Introducir relación con servicio existente/importado y un catálogo de segmentos canónicos: RESIDENCIAL, COMERCIAL, INSTITUCIONAL, EMPRESARIAL_PEQUENA. Traducir valores heredados sin destruirlos. El segmento se resuelve en backend; la frase «mi restaurante» identifica impacto, no acredita un contrato comercial.

Reutilizar `instance_classifications` únicamente con reglas verificadas y administradas. Su existencia no autoriza inventar prefijos. Preferir coincidencia exacta con servicio y titular autorizado. Una instancia desconocida debe quedar pendiente de validación; no asignar un segmento contractual supuesto. La operación real requiere cargar el catálogo auténtico de instancias y sus segmentos.

### Diálogo por contexto

Conservar motor Python y contratos de API. Incorporar un analizador de eventos múltiples y hechos con fuente, momento y confianza: falla inicial/actual, alcance, impacto, inicio declarado, alimentación, LOS/PON, fibra, reinicio y resultado. Separar hechos de hipótesis.

Orden: detectar cancelación/consulta/evidencia/solicitud, extraer hechos, resolver contradicciones, actualizar problema, evaluar si se resolvió, comprobar si requiere técnico, seleccionar una pregunta aún necesaria. No avanzar porque llegó texto.

Las respuestas «no sé» deben admitir ruta alternativa o escalamiento, no repreguntas infinitas. Responder consultas sin perder diagnóstico. Guardar el consentimiento para ticket cuando exista; no interpretarlo como prueba de que reiniciar funcionó. Un daño físico concluyente permite omitir comprobaciones irrelevantes.

### Prioridad, orden y SLA

Node será autoridad de prioridad; Python devolverá severidad e impacto y dejará de aplicar una política paralela. Parametrizar criterios, pesos, umbrales y versión. Severidad determina BAJA/MEDIA/ALTA; segmento e impacto influyen en la puntuación sin hacer ALTA una consulta de contraseña.

Persistir `priority_score` base, desglose, motivo y versión. Calcular puntuación efectiva por antigüedad al consultar la cola, con desempate por fecha e ID. No limitar indefinidamente el envejecimiento por debajo de otras clases: comprobar mediante simulación que tickets antiguos son promovidos. Distinguir duración declarada de la falla y tiempo real en espera desde creación.

SLA configurable con objetivo de primera atención y resolución, fecha límite y versión conservada por ticket. No convertir «desde ayer» en exactamente 24 horas sin indicar estimación ni usar asignación como sinónimo automático de primera atención.

### Ticket y bloqueo atómicos

Mantener estado `FINALIZADA` como equivalente de solo lectura, con motivo de cierre y marca temporal. No es necesario renombrarlo a LOCKED. Rechazar mensajes, adjuntos y modificaciones de conversaciones finalizadas desde backend; frontend refleja la misma regla.

La confirmación transaccional bloquea concurrencia, verifica duplicado del servicio, crea o vincula ticket, vincula evidencias, guarda resumen y contexto y cierra conversación. Las notificaciones se emiten de forma idempotente después del commit. Nunca devolver éxito antes de persistencia.

### Evidencia y observabilidad

Guardar tipo, fecha, autor y relaciones; indicar número real de adjuntos. Sin analizador visual disponible, mostrar evidencia para revisión técnica y estado «sin análisis automático». No fingir lectura visual. Preparar interfaz opcional de analizador sin contratar ni transmitir imágenes a un tercero automáticamente.

Eventos técnicos sin texto privado innecesario: intento de diálogo, clasificación, cambio de falla, contradicción, pregunta, aclaración, evidencia, prioridad, ticket, duplicado evitado, cierre y error. Reutilizar `audit_logs` para acciones administrativas y agregar eventos de diagnóstico si el volumen/consultas lo justifican.

## 5. Cambios de datos propuestos

- Migración nueva, aditiva e idempotente; no editar retroactivamente migraciones históricas.
- Catálogo de segmentos y relación de servicio con instancia, titular y estado; convivencia con categorías heredadas.
- Ampliación compatible de `instance_classifications` o relación con catálogo canónico, sin filas de prefijos ficticias.
- Tickets: service_id, segmento al registrar, diagnóstico estructurado JSONB, impacto, score, desglose/versiones y objetivos SLA.
- Conversaciones: service_id, motivo/fecha de cierre; hechos versionados dentro de `assistant_context` existente.
- Eventos de diagnóstico: conversación, tipo, momento y datos mínimos para métricas.
- Parámetros: reutilizar `system_parameters` para valores enteros; una tabla versionada específica para reglas que necesiten JSON o varias dimensiones, sin forzar JSON en su columna INTEGER.
- Índices de cola, servicio, conversación y métricas. Idempotencia compatible con la regla de duplicados; no imponer unicidad histórica por cliente/falla.
- Migración de legado no inventa SLA, instancias verificadas, análisis visual ni resoluciones automáticas pasadas. Información no disponible se muestra como tal.

## 6. Vistas y reportes: conservar, combinar y simplificar

La clasificación siguiente es funcional según rutas/código. No se elimina una vista por ser similar sin comprobar permisos y uso.

| Vista o grupo | Clase | Decisión |
|---|---|---|
| Asistente e historial cliente | A esencial | Conservar, separar visualmente diagnóstico activo e historial bloqueado |
| Tickets cliente/operador/técnico | A esencial | Conservar permisos y acciones; compartir filtros y presentación |
| Panel administrador/operador | B combinable | Mantener resumen por rol y reutilizar KPI/drill-down |
| Técnicos disponibles / Gestión de técnicos | B reutilizado | Ya usan el mismo componente; no crear otro módulo |
| Gestión de usuarios | A esencial | Mantener; añadir administración de servicios/segmentos con permisos |
| Historial técnico y exportaciones | A esencial | Mantener evidencia de trabajo, compartir selector temporal |
| Reportes administrativos | A esencial, contenido B combinable | Una vista con secciones Operación, Fallas, Clientes y Asistente |
| Perfiles y notificaciones | A esencial | Conservar; integrar perfil/configuración en navegación coherente |
| Dashboard genérico no importado por AppRouter | E candidato | Verificar imports restantes antes de retirar; sin eliminación en esta fase |
| Textos permanentes «Red FTTH operativa/Datos sincronizados» | D bajo valor si no hay comprobación | Sustituir por estado comprobado o retirar indicador |
| Vista previa de exportación | A útil | Conservar; corregir indicadores junto con exportadores |

No encontré una pantalla distinta por cada período: Reportes ya cambia día/semana/mes/año para tendencias. Hay que reutilizarlo y añadir selector común de rango, no duplicarlo.

Mantener operaciones, fallas, clientes, asistente y rendimiento técnico. Fusionar gráficos secundarios detrás de pestañas/drill-down. No eliminar exportaciones PDF/Word/Excel. El ejecutivo tendrá resumen inicial reducido; las métricas adicionales estarán disponibles sin mostrar todos los gráficos simultáneamente.

Métricas: MTTA desde creación hasta primera atención registrada; MTTR desde creación hasta resolución; asignación se mide por separado. Backlog a una fecha no es solo abiertos creados dentro del rango. Tasas del asistente excluyen saludos y consultas no técnicas, y diferencian resolución confirmada de cancelación/abandono. La ventana temporal empleará America/La_Paz y fin exclusivo coherente en backend.

## 7. Matriz de los 39 requisitos

| Punto | Situación encontrada | Entrega verificable propuesta |
|---|---|---|
| 1 Objetivo | Cadena integrada existente | Mejorar la misma cadena, sin segundo sistema |
| 2 Flujo | Parcial; servicio/bloqueo incompletos | Prueba de autenticación a seguimiento |
| 3 Segmentos | Tres categorías heredadas | Cuatro segmentos canónicos con compatibilidad |
| 4 Identificación | Instancia numérica; catálogo sin consumo en registro | Resolver instancia autoritativa; impedir edición cliente |
| 5 Contexto | ID, dirección, zona, categoría | Servicio, instancia, estado y tickets abiertos visibles al propietario |
| 6 Cambio de falla | Lentitud a falta de internet corregido previamente | Mantener prueba y ampliar a información más precisa |
| 7 No avanzar solo | Validación parcial por patrones | Eventos y hechos antes de decidir siguiente acción |
| 8 Clasificación múltiple | Predomina una intención | Lista de eventos por mensaje y precedencia probada |
| 9 Memoria | Entidades e historial, aún índice guiado | Hechos estructurados con fuente y estado desconocido |
| 10 Evolución | Algunos cambios soportados | Historial de hipótesis y diagnóstico actual |
| 11 Redundancia | Fibra cortada ya tiene atajo | Selección de preguntas según datos faltantes |
| 12 Contradicciones | Luz roja/alimentación parcialmente cubierto | Registro y resolución sin borrar relato |
| 13 Indicadores | Luz roja genérica frecuente | Distinguir LOS/PON/POWER o mantener desconocido |
| 14 Evidencias | Persistencia existente | Relación validada, estado de análisis y conteo real |
| 15 Adaptación | Preguntas principalmente genéricas | Preguntas por segmento e impacto ya conocido |
| 16 Prioridad | Dos motores contradictorios | Motor único configurable con severidad base |
| 17 Orden | Fecha descendente | Score y razón explicables |
| 18 Aging | Sin implementación localizada | Cola con envejecimiento y prueba de no relegación |
| 19 Ticket | Guardado parcial no atómico | Transacción, datos estructurados y duplicados concurrentes |
| 20 Confirmación | Mensaje backend ya mejorado | Resumen con causa preliminar, prioridad y evidencia reales |
| 21 Bloqueo | Insuficiente en ambos lados | Rechazo backend y controles deshabilitados |
| 22 Aviso | No implementado como bloqueo estricto | Aviso visible con Nueva conversación |
| 23 Nueva conversación | Existe; también apertura implícita | Creación explícita independiente y controles habilitados |
| 24 Historial | Existe y permite eliminación | Solo lectura de cerradas, sin pérdida de trazabilidad |
| 25 Reportes | Rango existente | Selector común con los seis modos |
| 26 Ejecutivo | KPI parciales | Alta activa, SLA, tiempos y tendencias coherentes |
| 27 Operación | Parcial | Filtros, backlog, vencimientos y tiempos correctos |
| 28 Fallas | Catálogo agrupa causas distintas | Taxonomía compatible, evolución y reincidencias |
| 29 Clientes | No reporte completo por cuatro segmentos | Clientes/tickets/MTTR/reincidencia por segmento |
| 30 Asistente | Sin eventos suficientes | Instrumentación y tasas desde datos nuevos verificables |
| 31 Temporal | Tendencias ya reutilizadas | Mantener una vista con granularidad y rango comunes |
| 32 Navegación | Separada por roles | Consolidación conservando acciones y permisos |
| 33 UX | Componentes existentes | Filtros compartidos, paginación, errores y prueba responsive |
| 34 Seguridad | Propiedad parcial y relaciones incompletas | Tests de IDs ajenos, estado y segmento no manipulable |
| 35 Observabilidad | Auditoría de algunas operaciones | Eventos de diagnóstico y errores correlacionados |
| 36 Pruebas | 11 regresiones previas pasan | Nueve casos del archivo + concurrencia y permisos |
| 37 Método | Auditoría realizada sobre código | Implementación incremental con pruebas por lote |
| 38 Entrega previa | Este documento | Aprobación antes de implementar cambios grandes |
| 39 Principio | Aún predominan pasos | Contexto y evidencia deciden pregunta o escalamiento |

## 8. Archivos y orden recomendado de implementación

Las rutas de esta sección son relativas a este documento. Los nombres nuevos son propuestas; se conservarán contratos públicos salvo extensión compatible.

| Lote | Archivos principales | Riesgo y control |
|---|---|---|
| 1 Datos autoritativos | Backend/sql/nueva migración; models/User.js; controllers/AuthController.js; ValidationMiddleware.js; nuevo servicio de clasificación; ProfileEditor.jsx/RegisterForm.jsx | ALTO: registros existentes. Migración aditiva, compatibilidad y tests de instancia desconocida |
| 2 Bloqueo y atomicidad | models/Conversation.js y Ticket.js; ConversationController.js; EvidenceController.js; rutas; ClienteDashboard.jsx; ChatService.js | ALTO: concurrencia/adjuntos. Transacción y pruebas de doble envío, fallo parcial, IDs cruzados |
| 3 Diagnóstico dinámico | chat/dialog_manager.py, memory.py, guided_answers.py, guided_flows.py, assistant_engine.py, assistant_runner.py; analizador de eventos; AssistantBridge.js | ALTO: regresiones. Reutilizar patrones útiles y corpus conversacional antes de sustituir cada flujo |
| 4 Prioridad/cola | TicketPriorityService.js; priority_policy.py; FailureCatalog.js; Ticket.js; TicketsOperador.jsx/MisTickets.jsx | ALTO: orden operativo. Motor único, parámetros versionados, pruebas y simulación de espera |
| 5 Reportes/observabilidad | DashboardController.js; AdministrativeReportService.js; TechnicianHistoryReportService.js; controladores/exportadores; Reportes.jsx y paneles; componentes compartidos | MEDIO: definiciones. Consultas verificadas con fixtures, no inventar datos históricos |
| 6 UX y aceptación | AppRouter.jsx; RoleSidebar.jsx; pantallas por rol; estilos; suites backend/frontend/Python | MEDIO: navegación. Conservar rutas, probar roles y tamaños de pantalla |

No se requiere incorporar un proveedor de IA externo para implementar eventos, memoria, prioridad o bloqueo. La comprensión abierta y visión solo se afirmarán si se incorpora y valida un motor que las soporte realmente.

## 9. Plan de pruebas y criterios de aceptación

1. Conservar las once regresiones existentes y añadir cada caso 1–9 del archivo, a través de API cuando corresponda.
2. Variantes de negación, repetición, respuesta irrelevante, imagen más consentimiento, cambio de diagnóstico después de solicitar ticket y resolución sin ticket.
3. Segmento de servicio comercial validado + restaurante + pedidos bloqueados: impacto verdadero, sin que la frase altere el contrato.
4. Contraseña empresarial mantiene baja severidad. Dos interrupciones idénticas se ordenan por puntuación explicada. Ticket antiguo asciende con política de aging.
5. Conversación finalizada rechaza texto y adjuntos incluso si se llama API directamente; usuario ajeno tampoco puede consultar/modificar por ID.
6. Adjuntos seleccionados antes del consentimiento quedan asociados antes del cierre. Fallo de subida no muestra ticket con evidencia ficticia.
7. Dos solicitudes concurrentes e idénticas generan un solo ticket. Fallo inyectado revierte ticket/cierre/enlaces coherentemente. Reintento idempotente devuelve resultado existente.
8. Nueva conversación tiene ID distinto, memoria limpia y mismo servicio validado; la anterior permanece bloqueada.
9. Reportes con conjunto controlado: denominadores, rangos locales, SLA por versión, backlog previo y estados cancelados. Datos faltantes no se convierten en ceros de desempeño.
10. Build y lint frontend; integración PostgreSQL aislada; revisión visual responsive por rol; exportaciones mantienen consistencia con indicadores.

## 10. Resultado comprobado de la auditoría

- `python -m unittest discover -s chat -p test_dialog_regressions.py -v`: 11 pruebas aprobadas.
- `npm.cmd run build`: compilación aprobada.
- `npm.cmd run lint`: falla en dos funciones no usadas de `Frontend/src/components/auth/RegisterForm.jsx`, líneas 109 y 113: getEmailPlaceholder y getEmailHelperText.
- No se ejecutaron pruebas de API con PostgreSQL ni se revisó la interfaz con sesión real. No se aplicaron los cambios de esta propuesta.
- No se modificó código funcional en esta fase; se añadió este documento y la compilación regeneró el artefacto local dist.

## 11. Decisión solicitada

Aprobar la implementación de los seis lotes descritos, manteniendo las mejoras previas y las pruebas por lote. El catálogo real de instancias/segmentos y los objetivos contractuales de SLA deben provenir de datos válidos; el desarrollo puede incluir su administración y pruebas con fixtures, pero no afirmar clasificación o SLA reales sin esas fuentes.

Esta aprobación se solicita exclusivamente porque el punto 38 del archivo del usuario dice: «Después de mi aprobación, implementar los cambios progresivamente».
