# Diez conversaciones verificadas del asistente FTTH

Fecha de validación: 14 de octubre de 2026. Modelo: GPT-6.1 Sol.

Son transcripciones obtenidas mediante llamadas reales a OpenAI, búsqueda web real y el adaptador de producción del backend. Se usaron clientes ficticios: no se guardaron clientes, conversaciones ni reclamos en la base de datos durante estas evaluaciones. Las respuestas no fueron redactadas a mano.

Se verificaron **10 conversaciones y 51 turnos**. La conversación 09 usa un ticket ficticio para probar la consulta de estado; no representa un reclamo real. Un cierre por agradecimiento puede dejar la conversación disponible; los diagnósticos resueltos o reclamos rechazados muestran el cierre que decidió el backend.

La búsqueda se ejecuta en segundo plano, sin avisos de navegación. Las fuentes públicas usadas aparecen como enlaces. El backend aporta las funciones del sistema y consultas autorizadas; internet no determina el estado de una cuenta ni ejecuta trámites. Las tarifas citadas en estas pruebas son las encontradas en las fuentes en ese momento y están sujetas a sus condiciones.

Para probar la versión local: [abrir aplicación](http://localhost:5173/). Backend: http://localhost:3001/api/health. No se ha desplegado esta actualización al sitio público.

## 01 · Olor a quemado y visita

**Cliente:** buenos dias

**Asistente:** ¡Buenos días! ¿En qué puedo ayudarte?
if
**Cliente:** mi router huele a quemado

**Asistente:** Mantén distancia del equipo y no intentes abrirlo ni volver a encenderlo. ¿Quieres registrar un reclamo para revisión técnica?

**Cliente:** entonces tiene que venir alguien?

**Asistente:** Por el olor a quemado, el equipo necesita una revisión segura; soporte evaluará si hace falta una visita técnica. No puedo confirmar una visita ni una fecha. Mientras tanto, mantén distancia y no lo abras ni vuelvas a encenderlo; la autorización para registrar el reclamo sigue pendiente.

**Cliente:** y eso tiene costo?

**Asistente:** No tengo un costo vericado para la revisión o una posible visita. ENTEL publica la reposición del equipo de fibra sin costo por falla técnica, previo informe técnico; si el daño se debe a causas ajenas a ENTEL, publica Bs366 según el contrato de préstamo. El olor a quemado por sí solo no permite determinar cuál corresponde: mantén distancia y no vuelvas a encender el equipo. La autorización para registrar el reclamo sigue pendiente.

Fuentes: [1](https://www.entel.bo/HogarInternetFibra?utm_source=openai)

**Cliente:** no gracias, primero consultare el costo

**Asistente:** Entendido, no registraré ningún ticket. Si necesitas ayuda más adelante, aquí estaré.

## 02 · Traslado de domicilio

**Cliente:** hola

**Asistente:** ¡Hola! ¿En qué puedo ayudarte con tu servicio de internet o con la aplicación?

**Cliente:** me cambie de domicilio y quiero llevarme el equipo de internet

**Asistente:** Para usar tu internet en el nuevo domicilio necesitas gestionar un traslado con ENTEL: deben confirmar cobertura y factibilidad técnica y coordinar la instalación; no basta con llevar y conectar el equipo. No desconectes ni manipules la fibra; confirma con ENTEL cómo proceder con el equipo. Para Fibra Hogar se publica un cargo de Bs100 por traslado dentro de la misma ciudad, sujeto a factibilidad; otros paquetes pueden tener un cargo distinto. Puedes consultar el trámite al 103 desde un móvil ENTEL o al 800103638 desde un teléfono fijo; desde este chat no puedo ejecutar el traslado.

Fuentes: [1](https://www.entel.bo/HogarInternetFibra?utm_source=openai) · [2](https://www.entel.bo/activos/assets/pdf/internet_fibra/Internet%20Fibra.pdf?utm_source=openai)

**Cliente:** puedo conectarlo yo en la nueva casa?

**Asistente:** No basta con llevar el equipo y conectarlo en la nueva casa: ENTEL debe confirmar la cobertura y coordinar la instalación del servicio. No desconectes ni manipules la fibra; consulta cómo proceder con el equipo al gestionar el traslado. Desde este chat puedo orientarte, pero no realizar el trámite.

**Cliente:** que necesito para pedir el traslado?

**Asistente:** Para pedir el traslado, ENTEL debe verificar la cobertura y la factibilidad técnica en tu nueva dirección. Sus condiciones indican que debe mantenerse el mismo titular y la misma tecnología de acceso, y que el traslado se realiza dentro de la misma ciudad.
No tengo una lista oficial completa de documentos específicos para este trámite: ENTEL menciona documento de identidad y croquis como requisitos generales del servicio, pero debes confirmar cuáles exige para el traslado. Consulta también cómo proceder con el equipo; no desconectes ni manipules la fibra.

Fuentes: [1](https://www.entel.bo/HogarInternetFibra?utm_source=openai) · [2](https://www.entel.bo/entel/backend/activos/panel/docs/Prestaci%C3%B3n%20del%20servicio%20de%20acceso%20a%20Internet.pdf?utm_source=openai)

**Cliente:** gracias, voy a solicitarlo con ENTEL

**Asistente:** De nada. Espero que puedas coordinar el traslado sin inconvenientes.

## 03 · Lentitud y explicación del diagnóstico

**Cliente:** buenas tardes

**Asistente:** Buenas tardes. ¿En qué puedo ayudarte con tu servicio o la aplicación?

**Cliente:** mi internet esta lento

**Asistente:** Lamento el inconveniente; con gusto te ayudaré. Antes de revisar la conexión, ¿la falla ocurre en el domicilio donde tienes instalado el servicio?

**Cliente:** si, en mi domicilio

**Asistente:** ¿La lentitud ocurre en todos tus dispositivos, en algunos o solo en uno?

**Cliente:** por que me preguntas cuantos dispositivos?

**Asistente:** Te lo pregunto para distinguir si la lentitud afecta a la conexión en general o solo a un dispositivo. Así podemos elegir la prueba adecuada y evitar comprobaciones innecesarias; no necesito saber el número exacto de dispositivos.

**Cliente:** en todos, por wifi y por cable

**Asistente:** Como la lentitud ocurre en todos los dispositivos, tanto por WiFi como por cable, no parece limitarse a la cobertura WiFi. Pausa las descargas que estén en curso y prueba abrir una página web en un dispositivo conectado por cable. ¿La página sigue cargando lentamente?

**Cliente:** pause las descargas y ahora ya funciona bien

**Asistente:** Qué bueno que ya funciona bien. Las descargas pueden ocupar gran parte de la conexión y ralentizar los demás dispositivos; para evitarlo, puedes limitar su velocidad o dejarlas para cuando no estés usando internet.

## 04 · Fibra cortada

**Cliente:** hola

**Asistente:** ¡Hola! ¿En qué puedo ayudarte?

**Cliente:** no tengo internet, el cable de fibra esta cortado

**Asistente:** No manipules ni intentes reparar el cable. Lamento el inconveniente; con gusto te ayudaré. Antes de revisar la conexión, ¿la falla ocurre en el domicilio donde tienes instalado el servicio?

**Cliente:** si, en mi domicilio

**Asistente:** El cable de fibra cortado requiere revisión técnica; no lo manipules ni intentes repararlo. ¿Autorizas que se registre un reclamo por la falta de internet y el cable cortado?

**Cliente:** puedo unirlo con cinta mientras llega alguien?

**Asistente:** No, la cinta no restablece la conexión de fibra. Deja el cable como está: no intentes unirlo, manipularlo ni mirar sus extremos; requiere revisión técnica. Aún está pendiente tu autorización para registrar el reclamo y no hay una visita confirmada.

**Cliente:** no quiero registrar el reclamo por ahora, gracias

**Asistente:** Entendido, no registraré ningún ticket. Si necesitas ayuda más adelante, aquí estaré.

## 05 · Cobertura WiFi

**Cliente:** hola

**Asistente:** ¡Hola! ¿En qué puedo ayudarte con tu servicio de internet o con la aplicación?

**Cliente:** cerca del router funciona bien pero en mi cuarto el wifi esta lento

**Asistente:** Lamento el inconveniente; con gusto te ayudaré. Antes de revisar la conexión, ¿la falla ocurre en el domicilio donde tienes instalado el servicio?

**Cliente:** si, en mi casa

**Asistente:** Como cerca del router funciona bien y en tu cuarto va lento, parece un problema de cobertura WiFi: las paredes y otros obstáculos pueden debilitar la señal. Prueba usar el dispositivo en una zona del cuarto con menos obstáculos hacia el router, sin mover el equipo ni la fibra. Si necesitas mejorar la cobertura de forma permanente, se puede evaluar un punto de acceso adicional.

**Cliente:** por que pasa si tengo fibra?

**Asistente:** La fibra lleva internet hasta tu router, pero el WiFi es la conexión inalámbrica desde el router hasta tu dispositivo. Esa señal pierde fuerza con la distancia, las paredes y las interferencias, aunque tengas fibra. Como cerca del router funciona bien y en tu cuarto va lento, lo que describes apunta a una limitación de cobertura WiFi, no necesariamente a una falla de la fibra.

Fuentes: [1](https://www.tp-link.com/es/support/faq/468/?utm_source=openai) · [2](https://www.tp-link.com/es/support/faq/2435/?utm_source=openai)

**Cliente:** ya use el equipo cerca del router y ahora funciona bien, gracias

**Asistente:** ¡Qué bueno que ahora funciona bien! Eso apunta a una limitación de cobertura WiFi en tu cuarto, no necesariamente a una falla de la fibra. Si necesitas usarlo allí, podemos orientarte para mejorar la cobertura.

## 06 · Planes y tarifas actuales

**Cliente:** hola

**Asistente:** ¡Hola! ¿En qué puedo ayudarte con tu servicio de internet o con la aplicación?

**Cliente:** cuanto cuesta el plan de fibra de 100 megas de ENTEL?

**Asistente:** En la página oficial consultada no aparece un plan de 100 Mbps. El más cercano es el Simple S, de 120 Mbps, con una tarifa publicada de Bs169 al mes. Está sujeto a factibilidad técnica en tu domicilio; el precio y las condiciones deben confirmarse al contratar.

Fuentes: [1](https://www.entel.bo/HogarInternetFibra?utm_source=openai)

**Cliente:** el precio incluye instalacion?

**Asistente:** La página oficial consultada no indica si la instalación está incluida ni confirma un cargo por ella. Los Bs169 corresponden a la tarifa mensual del plan Simple S de 120 Mbps; antes de contratar, debes confirmar con ENTEL si hay un costo de instalación para tu domicilio.

Fuentes: [1](https://www.entel.bo/HogarInternetFibra?utm_source=openai)

**Cliente:** puedes cambiarme el plan desde aqui?

**Asistente:** No puedo cambiar tu plan desde este chat; la aplicación no permite gestionar planes contratados. El cambio debe solicitarse a ENTEL por sus canales comerciales oficiales, donde podrán confirmar las opciones disponibles, el precio y las condiciones para tu servicio.

**Cliente:** gracias, consultare con atencion comercial

**Asistente:** ¡De nada! En atención comercial podrán confirmarte las opciones y condiciones para cambiar tu plan.

## 07 · Reclamos y evidencias en el sistema

**Cliente:** buenas

**Asistente:** ¡Buenas! ¿En qué puedo ayudarte con tu servicio de internet o con la aplicación?

**Cliente:** como veo mis reclamos en este sistema?

**Asistente:** Entra a «Mis tickets» y selecciona el reclamo que quieras consultar. Allí podrás ver su estado, detalles, historial y evidencias; si tiene un técnico asignado, también aparecerán sus datos.

**Cliente:** puedo adjuntar un video y de cuanto tamaño?

**Asistente:** Sí, puedes adjuntar un video en formato MP4 de hasta 10 MB a tu conversación o a un ticket propio. Se permite un archivo por carga.

**Cliente:** como veo quien es mi tecnico?

**Asistente:** Entra a «Mis tickets» y abre el reclamo que quieres consultar. Si ya tiene un técnico asignado, sus datos aparecerán en el detalle del ticket.

**Cliente:** gracias, ya encontre Mis tickets

**Asistente:** ¡De nada! Desde allí puedes abrir tu reclamo y consultar los detalles de la atención.

## 08 · Cuenta y recuperación de acceso

**Cliente:** hola

**Asistente:** ¡Hola! ¿En qué puedo ayudarte con tu servicio de internet o con la aplicación?

**Cliente:** olvide la contraseña para entrar al sistema

**Asistente:** En la pantalla de acceso, selecciona «¿Olvidaste tu contraseña?» y sigue las instrucciones para recuperar el acceso. Desde este chat no puedo cambiar tu contraseña; no la compartas aquí.

**Cliente:** puedes cambiarla por mi desde aqui?

**Asistente:** No puedo cambiar tu contraseña desde este chat. Para recuperarla, selecciona «¿Olvidaste tu contraseña?» en la pantalla de acceso y sigue las instrucciones. No compartas tu contraseña aquí.

**Cliente:** eso cambia tambien la contraseña de mi wifi?

**Asistente:** No, recuperar la contraseña del sistema no cambia la de tu WiFi. Son distintas: una sirve para entrar a la aplicación y la otra para conectar tus dispositivos a la red WiFi.

**Cliente:** gracias, usare la opcion de recuperar contraseña

**Asistente:** ¡De nada! Usa «¿Olvidaste tu contraseña?» en la pantalla de acceso y sigue las instrucciones.

## 09 · Estado y visita de un ticket propio

*Ticket de prueba: TK-PRUEBA, pendiente y sin fecha de visita.*

**Cliente:** hola

**Asistente:** ¡Hola! ¿En qué puedo ayudarte con tu servicio de internet o con la aplicación?

**Cliente:** como esta mi reclamo?

**Asistente:** Tu reclamo TK-PRUEBA figura como pendiente.

**Cliente:** cuando viene el tecnico?

**Asistente:** Tu reclamo TK-PRUEBA figura como pendiente. Todavía no hay una fecha de visita registrada.

**Cliente:** puedes adelantar la visita para hoy?

**Asistente:** No puedo adelantar ni programar una visita desde el chat, y no hay una fecha de visita registrada. El personal de atención coordina las visitas según disponibilidad; no puedo garantizar que sea hoy. Puedes consultar en «Mis tickets» si se actualiza la atención de tu reclamo.

**Cliente:** gracias, revisare la fecha en Mis tickets

**Asistente:** De nada. En «Mis tickets» podrás consultar las actualizaciones de tu reclamo y la fecha de visita si llega a registrarse.

## 10 · Reinicio, RESET y continuidad

**Cliente:** buenos dias

**Asistente:** ¡Buenos días! ¿En qué puedo ayudarte con tu servicio de internet o con la aplicación?

**Cliente:** si reinicio el router se borra mi wifi?

**Asistente:** No, reiniciar el router apagándolo y encendiéndolo conserva el nombre y la contraseña de tu WiFi. No pulses el botón RESET: restaurar el equipo de fábrica sí puede borrar su configuración. Para reiniciarlo, desconecta solo la corriente durante un minuto, vuelve a conectarla y espera hasta tres minutos; no desconectes la fibra.

Fuentes: [1](https://www.tp-link.com/us/user-guides/tl-wr841n_v14/chapter-4-configure-the-router-in-wireless-router-mode?utm_source=openai) · [2](https://www.tp-link.com/es/support/faq/497/?utm_source=openai)

**Cliente:** y si mantengo presionado RESET?

**Asistente:** Mantener presionado RESET puede restaurar el router de fábrica y borrar su configuración, incluido el nombre y la contraseña del WiFi y los ajustes de internet. El efecto depende del modelo, así que no lo mantengas presionado. Para reiniciar sin borrar los ajustes, desconecta solo la corriente durante un minuto, vuelve a conectarla y espera hasta tres minutos; no desconectes la fibra.

Fuentes: [1](https://www.tp-link.com/es/support/faq/140/?utm_source=openai) · [2](https://www.tp-link.com/es/support/faq/497/?utm_source=openai)

**Cliente:** entonces como hago un reinicio normal?

**Asistente:** Para hacer un reinicio normal sin borrar la configuración de tu WiFi:
1. Desconecta únicamente el cable de corriente del router y espera un minuto.
2. Vuelve a conectarlo y espera hasta tres minutos para que arranque.
No pulses RESET ni desconectes el cable de fibra.

**Cliente:** entendido, gracias

**Asistente:** ¡De nada!

## Comprobación técnica

La salida y procedencia de cada turno se conservan en el archivo JSON adjunto. Las evaluaciones finales seleccionadas no tuvieron respuestas idénticas consecutivas, rechazos de validación ni caídas al respaldo por errores de OpenAI. La respuesta inmediata de seguridad, las confirmaciones y las consultas de estado usan el backend cuando corresponde.
