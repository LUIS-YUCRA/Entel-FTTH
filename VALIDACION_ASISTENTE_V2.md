# Validación del asistente conversacional V2

Pruebas con GPT-6.1 Sol real, búsqueda web y PostgreSQL. Los clientes de evaluación son ficticios. El recorrido HTTP crea una cuenta temporal y la elimina al terminar; las propuestas de ticket de las conversaciones no se guardan ni envían notificaciones. La persistencia y la cola se verifican adicionalmente con PostgreSQL dentro de transacciones revertidas.

## Registro, login, perfil y soporte por HTTP

- Registro reconoce la categoría del catálogo.
- Login devuelve instancia y categoría verificadas, sin contraseña.
- API rechaza cambiar instancia o categoría desde el perfil.
- Cliente no puede modificar el catálogo administrativo.
- Formulario de perfil guarda el campo pedido por el asistente.
- La falla interrumpe la carga del perfil y recibe atención inmediata.
- Los valores privados del formulario no se agregan al historial enviado a GPT.

**Inicio de sesión y bienvenida**

**Asistente:** ¡Bienvenido a ENTEL Shinahota! Estoy aquí para ayudarte con el servicio de internet de tu negocio. Si deseas, puedes completar tu teléfono en el formulario del perfil para facilitar el contacto durante la atención; también puedes pedir soporte de inmediato.

**Cliente:** Ya completé el dato que me pediste en mi perfil.

**Asistente:** Tu teléfono ya quedó registrado. Si deseas, puedes completar tu dirección en el formulario del perfil para facilitar la ubicación del servicio; también puedes pedir soporte de inmediato.

**Cliente:** Lo demás después. Mi internet está lento en todos los dispositivos, por WiFi y por cable.

**Asistente:** Dejamos el resto del perfil para después. Como la lentitud ocurre tanto por WiFi como por cable, no parece ser solo un problema de cobertura inalámbrica. Pausa temporalmente las descargas y los videos en los demás dispositivos y prueba abrir una página en una computadora conectada por cable: ¿sigue lenta?

**Cliente:** Sigue lento aun con un solo equipo, sin descargas. Ya reinicié y continúa igual.

**Asistente:** La lentitud continúa incluso con un solo equipo, sin descargas y después de reiniciar; corresponde solicitar una revisión técnica. ¿Autorizas que registremos un reclamo?

**Cliente:** No registres ningún reclamo por ahora, gracias.

**Asistente:** De acuerdo, no registraremos ningún reclamo por ahora. Si más adelante deseas retomar la revisión, podemos continuar desde lo que ya probaste.

## Perfil pendiente y falla urgente

**Bienvenida**

**Asistente:** ¡Bienvenido a soporte FTTH de ENTEL Shinahota! Puedes completar tu teléfono en el formulario del perfil para facilitar el contacto durante la atención. Si necesitas ayuda con tu servicio, puedes pedir soporte de inmediato, sin completar el perfil.

**Cliente:** Ya completé mi teléfono en el perfil.

**Asistente:** Tu teléfono ya quedó registrado. Si deseas, puedes completar tu dirección en el formulario del perfil para facilitar la ubicación del servicio; también puedes pedir soporte de inmediato sin completarla.

**Cliente:** Lo demás después. Ahora no tengo internet y no puedo cobrar a mis clientes.

**Asistente:** Dejamos el resto del perfil para después. Entiendo que no tienes internet y eso te impide cobrar a tus clientes. ¿Qué luces ves encendidas en el router: hay alguna roja o marcada como LOS?

**Cliente:** la luz LOS esta roja y ya reinicie pero no funciona

**Asistente:** La luz LOS roja puede indicar falta de señal de fibra. Como ya reiniciaste y sigues sin internet, corresponde una revisión técnica; no hace falta repetir el reinicio ni manipular la fibra. ¿Autorizas que registremos un reclamo técnico por esta falla que te impide cobrar a tus clientes?

**Cliente:** entonces tiene que venir alguien?

**Asistente:** La falla necesita revisión técnica y podría requerir que alguien vaya al lugar, pero eso se confirma al evaluar el reclamo; aún no hay una visita programada. La autorización para registrarlo sigue pendiente.

**Cliente:** sí, pero primero dime si tiene costo

**Asistente:** No tengo un costo oficial verificado para la revisión o una posible visita en tu servicio; no puedo asegurarte que sea gratuita. Puedes confirmarlo con atención de Internet de ENTEL al 800 10 3638. Por ahora no registraré el reclamo: tu autorización queda pendiente hasta aclarar el costo.

Fuentes: [1](https://www.entel.bo/WebTransparencia?utm_source=openai)

**Cliente:** de una, registralo por favor

**Asistente:** De acuerdo, solicito el registro del reclamo por la falta de internet con luz LOS roja, que persiste tras el reinicio y te impide cobrar a tus clientes. El costo de una posible revisión o visita aún no está confirmado.

## Institución y respuesta negativa contextual

**Bienvenida**

**Asistente:** ¡Bienvenido al soporte FTTH de ENTEL Shinahota! ¿En qué podemos ayudarte con tu servicio de internet?

**Cliente:** el internet esta lento en todas las computadoras, por wifi y por cable

**Asistente:** Como la lentitud afecta tanto al WiFi como al cable, no parece ser solo un problema de cobertura WiFi. Pausa las descargas y actualizaciones en las computadoras y prueba abrir una página en una conectada por cable. ¿Sigue lenta después de esa prueba?

**Cliente:** estamos dando clases por videollamada y no se puede continuar

**Asistente:** Entiendo: la lentitud está impidiendo continuar las clases por videollamada. ¿La página en la computadora conectada por cable sigue lenta después de pausar las descargas y actualizaciones?

**Cliente:** pause las descargas y ahora funciona bien

**Asistente:** Bien, al pausar las descargas el internet volvió a funcionar correctamente. Para evitar que afecten las videollamadas, deja las descargas y actualizaciones para después de las clases.

## Instancia sin clasificación y límites de categoría

**Bienvenida**

**Asistente:** ¡Bienvenido a soporte FTTH de ENTEL Shinahota! ¿En qué podemos ayudarte con tu servicio de internet?

**Cliente:** mi cuenta dice categoria pendiente, puedo poner institucion para que me atiendan primero?

**Asistente:** «Categoría pendiente» significa que aún falta verificarla en el padrón de ENTEL. No puedes cambiarla desde el chat ni desde tu perfil, y elegir «institución» no permite adelantar la atención. Esto no te impide recibir soporte; si tienes una falla, puedes contarme qué ocurre.

**Cliente:** quien debe cargar esa categoria?

**Asistente:** La categoría la carga o verifica el personal administrador autorizado en el padrón de instancias del sistema. No te corresponde elegirla ni cambiarla desde tu perfil; mientras esté pendiente, puedes recibir soporte normalmente.

**Cliente:** gracias

**Asistente:** ¡De nada! Estoy aquí cuando necesites ayuda con tu servicio.

## Hogar, rechazo de ticket y consulta posterior

**Bienvenida**

**Asistente:** ¡Bienvenido al soporte FTTH de ENTEL Shinahota! ¿En qué podemos ayudarte con tu servicio de internet?

**Cliente:** mi fibra esta cortada y no tengo internet

**Asistente:** La fibra cortada requiere revisión técnica; un reinicio no resolverá el corte. No toques, desconectes ni intentes reparar la fibra. ¿Autorizas que registremos un reclamo técnico por el corte y la falta de internet?

**Cliente:** no quiero registrar el ticket por ahora

**Asistente:** Está bien, no registraremos el ticket por ahora. La fibra cortada necesita revisión técnica: no la toques ni intentes repararla. Cuando quieras retomar el reclamo, puedes decírmelo.

**Cliente:** y puedo unir el cable con cinta mientras tanto?

**Asistente:** No, la cinta no restablece la conexión de una fibra cortada. No intentes unirla, manipular los extremos ni repararla: necesita revisión técnica. Por ahora puedes usar datos móviles si los tienes; no registraremos un ticket sin tu autorización.

**Cliente:** entendido gracias

**Asistente:** De nada. Si más adelante quieres solicitar la revisión técnica, puedes decírmelo por aquí.

## Cómo probar la clasificación por instancia

1. Ingresa como administrador y abre **Instancias de servicio**.
2. Registra una instancia con su categoría real y una referencia del contrato o padrón.
3. Registra o inicia sesión con la cuenta cliente vinculada a esa instancia. El perfil mostrará la categoría verificada como dato de solo lectura.
4. Abre una conversación nueva: el asistente utilizará esa categoría y ofrecerá completar los datos faltantes, sin bloquear la atención.
5. Prueba una falla, interrumpe con una duda y luego responde afirmativa o negativamente a la solución o al reclamo.

Si la instancia no está en el catálogo, se muestra **Pendiente de verificación**: no se inventa la categoría . No existe una conexión a un padrón comercial externo de ENTEL.

Versión local: [abrir aplicación](http://localhost:5173/). Esta actualización no se ha desplegado al sitio público.

Detalles técnicos y comandos de validación: `deploy/ASISTENTE_CONVERSACIONAL_V2.md`.
