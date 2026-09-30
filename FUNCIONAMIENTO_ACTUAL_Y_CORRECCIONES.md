# Funcionamiento actual del sistema FTTH

Descripción del código revisado y las correcciones locales realizadas. Los 39 puntos del plan anterior no deben considerarse implementados por esta entrega.

## Registro e inicio de sesión

El cliente se registra con nombre, correo, contraseña e instancia. El backend valida formato y requisitos de contraseña, comprueba correo duplicado y guarda usuario y perfil de cliente. La contraseña se almacena mediante bcrypt. El catálogo automático de cuatro segmentos propuesto todavía no está integrado; registrar una instancia no equivale a verificarla contra un contrato del proveedor.

Al iniciar sesión se comprueban correo, contraseña y cuenta activa. Hay un límite de intentos fallidos por correo/IP. Un acceso correcto genera token y refresh token, registra sesión y último inicio. Las rutas de backend comprueban autenticación y rol. El frontend envía al portal correspondiente: cliente, operador, técnico o administrador. Una recarga completa de la aplicación actualmente limpia la sesión del frontend: puede ser necesario volver a ingresar.

La recuperación de contraseña genera un enlace temporal y lo intenta enviar por SMTP. El correo institucional exigido por el sistema valida el dominio; no demuestra que exista el buzón.

## Cliente: asistencia, tickets y seguimiento

El cliente describe la falla en el asistente. Node envía contexto a Python; se identifican intención y entidades, y se conserva memoria conversacional. Las correcciones previas impiden algunos avances indebidos, detectan el cambio de lentitud a falta de internet y reconocen contradicciones como equipo sin energía seguido de luz roja. El diagnóstico sigue basado en reglas y patrones, sin verificación directa de la red ni análisis visual automático conectado.

Si la falla persiste se ofrece ticket; el backend guarda el diagnóstico, prioridad y descripción, intenta evitar duplicados recientes y vincula evidencia. El cliente puede consultar estados y técnico asignado. La confirmación ya no garantiza una visita «en las próximas horas».

Las imágenes se guardan como evidencia; una confirmación de recepción no significa que se haya interpretado la imagen. El bloqueo estricto del chat y el resto de la transformación conversacional permanecen en la propuesta previa.

## Operador

Consulta la cola de tickets, datos del cliente y disponibilidad del personal. Asigna un técnico y una fecha futura de visita. El ticket registra la asignación y se generan notificaciones para el cliente y el técnico. El perfil permite editar datos propios y foto.

Se simplificó el perfil: una fotografía editable en la cabecera, formulario de nombre/correo sin otra fotografía y sección de fecha de registro/último acceso. Los indicadores globales se denominan «Tickets del sistema» para no atribuir todo el trabajo al operador conectado.

## Técnico

Consulta sus tickets y evidencias. La secuencia principal es ASIGNADO → EN_CAMINO → EN_PROCESO → RESUELTO. Reprogramar es una alternativa desde estados de atención permitidos. Se valida la transición en backend y se deshabilitan los botones que no corresponden.

Reprogramar abre un cuadro que solicita fecha y hora futuras. Resolver abre un cuadro que exige describir la solución aplicada. Los avisos de resultado aparecen centrados. RESUELTO significa trabajo técnico terminado; CERRADO sigue siendo otro estado del sistema.

La foto del técnico se puede cambiar desde su perfil y editor. Se reutiliza el almacenamiento autenticado existente; la foto se guarda al seleccionarla, y los demás datos se guardan con Guardar cambios.

## Cómo interpretar los indicadores

- Registrados o recibidos en total: todos los tickets del alcance del usuario.
- Activos: todos excepto RESUELTO, CERRADO y CANCELADO; incluye EN_CAMINO, REPROGRAMADO e INCUMPLIMIENTO_VISITA.
- Atendidos/solucionados: RESUELTO + CERRADO.
- Visitas pendientes futuras: tickets abiertos con fecha programada posterior al momento actual. Es un subconjunto de activos; no se suman ambos valores.
- Eficiencia vigente: porcentaje de terminados sobre recibidos, menos 10 puntos por visita incumplida, con mínimo cero. Se muestra su explicación; no es una medida de calidad técnica por sí sola.

Ejemplo de Mario comprobado: 23 = 21 activos + 2 resueltos. Los 19 del cálculo anterior omitían un ticket en camino y otro con visita incumplida.

Ejemplo de técnico: 12 recibidos, 4 terminados y ningún cancelado dejan 8 activos. Con una visita incumplida, round(4/12 × 100) − 10 = 23%. Tener tres visitas futuras no contradice los ocho activos: los demás pueden estar sin fecha, vencidos o en otra etapa.

Se unificó el cálculo frontend con el listado completo de tickets visibles, y el backend entrega el campo active. La agenda dejó de depender de los diez tickets recientes del resumen. La compilación frontend y el proceso backend deben corresponder a la versión nueva; se reinició el backend local para cargarla.

## Administrador y eliminación

Gestión de usuarios muestra todas las cuentas y sus roles. Crear personal solo admite operador y técnico, con nombre, correo y contraseña; el resto del perfil se completa posteriormente. Tiene validación específica y ya no utiliza el registro de clientes que exigía instancia.

Eliminar y Desactivar son operaciones diferentes. Desactivar conserva cuenta y datos; Eliminar borra físicamente la fila de users y, por las relaciones configuradas, sus credenciales/sesiones y perfiles dependientes. Los registros técnicos se conservan sin referencia a la cuenta eliminada. Si se elimina un técnico, sus trabajos abiertos quedan pendientes de reasignación y se registra el cambio en historial. Los trabajos terminados conservan sus fechas.

La cuenta con la que se está trabajando no se puede eliminar a sí misma. No se han elegido ni eliminado usuarios reales durante estas pruebas. La pantalla conserva una confirmación antes de la eliminación irreversible. La propuesta de los 39 puntos no se ha aplicado en su totalidad.

## Corrección de correos

La función buildNotificationEmail estaba incompleta: no devolvía destinatario, asunto ni cuerpo. Se completó, se escapa HTML y se cierra la conexión incluso si falla. Se registran códigos técnicos de error sin imprimir credenciales.

La verificación real de conexión y autenticación SMTP pasó. No se envió un correo de prueba ni se comprobó entrega a cada buzón. El proveedor puede aceptar un mensaje y después rechazarlo; «enviado» no certifica lectura ni entrega en bandeja de entrada. Las 22 notificaciones fallidas encontradas permanecen como historial, sin reenvío masivo ni cambios ficticios de estado.

## Reportes y comprobaciones

Se conservan dashboard, reporte administrativo y rendimiento/historial técnico con exportaciones. El SLA administrativo fijo y las políticas de prioridad separadas siguen siendo mejoras pendientes del plan de 39 puntos.

Pruebas de esta entrega: regresiones de correo, alta de personal, transiciones y eliminación; tests de contadores; prueba de eliminación real con PostgreSQL dentro de transacción revertida; compilación y lint frontend. No se ha certificado el recorrido visual completo con sesiones de todos los roles ni la entrega final de correos.
