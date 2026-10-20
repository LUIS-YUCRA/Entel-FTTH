"""Base de conocimiento conversacional para soporte ENTEL FTTH y móvil."""

from copy import deepcopy
import unicodedata
import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from config import Config


def greeting(message, now=None):
    text = normalize_text(message)
    for explicit in ('buenos dias', 'buen dia', 'buenas tardes', 'buenas noches'):
        if explicit in text:
            label = {'buenos dias': 'Buenos días', 'buen dia': 'Buenos días',
                     'buenas tardes': 'Buenas tardes', 'buenas noches': 'Buenas noches'}[explicit]
            return f'¡{label}! ¿En qué puedo ayudarte?'
    try:
        zone = ZoneInfo('America/La_Paz')
    except ZoneInfoNotFoundError:
        # Windows sin base IANA: Bolivia usa UTC-4, sin horario estacional.
        zone = timezone(timedelta(hours=-4), 'America/La_Paz')
    instant = now or datetime.now(timezone.utc)
    if instant.tzinfo is None:
        raise ValueError('El reloj de prueba debe incluir zona horaria')
    hour = instant.astimezone(zone).hour
    morning, afternoon, night = (Config.GREETING_MORNING_HOUR,
                                Config.GREETING_AFTERNOON_HOUR, Config.GREETING_NIGHT_HOUR)
    if not 0 <= morning < afternoon < night <= 23:
        morning, afternoon, night = 5, 12, 19
    label = ('Buenos días' if morning <= hour < afternoon else
             'Buenas tardes' if afternoon <= hour < night else 'Buenas noches')
    return f'¡{label}! ¿En qué puedo ayudarte?'


# Sólo mensajes completos: un saludo delante de una falla no oculta la falla.
GENERAL_PATTERNS = (
    ('saludo', r'(?:hola+|ola|hey|saludos|buenas|que tal|como estas?|buenos dias|buen dia|buenas tardes|buenas noches)(?: (?:buenos dias|buenas tardes|buenas noches|que tal|como estas?))?'),
    ('duda_general', r'(?:tengo|tenia) (?:una |unas )?(?:duda|dudas|pregunta|preguntas)|(?:quiero|quisiera|puedo) (?:consultar|preguntar)(?: algo| una cosa)?'),
    ('solicitud_ayuda', r'(?:me )?(?:puedes|puede|podrias) ayudar(?:me)? con (?:mi |el )?(?:problema de (?:mi |el )?)?(?:servicio|conexion|internet)|me ayudas con (?:mi |el )?(?:servicio|conexion|internet)|(?:necesito|quiero|preciso) (?:tu |su )?ayuda|(?:me )?(?:puedes|podrias|puede) ayudar(?:me)?|ayuda(?:me)?(?: por favor)?|no se que hacer'),
    ('problema_general', r'(?:tengo|tenemos|hay) (?:un |una |unos |unas )?(?:problema|problemas|falla|fallas|inconveniente)(?: por favor)?'),
    ('agradecimiento', r'(?:muchas )?gracias(?: por (?:tu |la )?ayuda)?|te agradezco'),
    ('despedida', r'adios|hasta luego|hasta pronto|nos vemos|chau|chao'),
)


def general_intent(message):
    text = normalize_text(message)
    for intent, pattern in GENERAL_PATTERNS:
        if re.fullmatch(pattern, text):
            return intent
    return None


def conversational_reply(message, conversation):
    intent = general_intent(message)
    if intent == 'saludo':
        if re.search(r'como esta', normalize_text(message)):
            first = not conversation.get('greeted')
            conversation['greeted'] = True
            if first and re.search(r'buenos dias|buenas tardes|buenas noches', normalize_text(message)):
                return greeting(message).split(' ¿')[0] + ' Muy bien, gracias. ¿En qué puedo ayudarte?'
            return '¡Muy bien, gracias! ¿En qué puedo ayudarte?'
        if conversation.get('greeted'):
            return 'Dime, ¿en qué puedo ayudarte?'
        conversation['greeted'] = True
        return greeting(message)
    if intent == 'duda_general':
        text = normalize_text(message)
        return ('Dime, ¿qué necesitas saber?' if 'pregunt' in text else
                'Claro, ¿qué deseas consultar?' if 'consult' in text else 'Claro, ¿cuál es tu duda?')
    if intent == 'solicitud_ayuda' and re.search(r'servicio|conexion|internet', normalize_text(message)):
        return 'Por supuesto. Cuéntame qué sucede con tu conexión.'
    return {
        'problema_general': 'Cuéntame, ¿qué problema tienes?',
        'solicitud_ayuda': 'Claro, ¿en qué necesitas ayuda?',
        'agradecimiento': '¡Con gusto! ¿Necesitas algo más?',
        'despedida': '¡Hasta luego! Que te vaya bien.',
    }.get(intent)



def scope_reply(message, state="START"):
    """Responde consultas de alcance/portal sin consumir una respuesta técnica."""
    text = normalize_text(message).strip(' .,:;!¿?¡')
    direct = detect_direct_intent(text)
    if direct and direct not in ('consulta_general', 'saludo', 'agradecimiento', 'despedida'):
        return None
    if state == 'WAITING_TICKET_CONFIRMATION' and re.fullmatch(
        r'(si|no)( quiero| deseo)?( generar| registrar| genere| registre| crear)?( el| un)? ticket', text
    ):
        return None
    network = bool(re.search(
        r'\b(internet|internte|wifi|wi fi|wi-fi|wiffi|conexion|conectividad|fibra|ftth|'
        r'router|modem|ont|ethernet|lan|utp|ssid|ping|latencia|megas|mbps|'
        r'cable|cables|luz|luces|pon|los rojo|red|redes|senal|navegar|'
        r'videollamada|streaming|netflix|youtube)\b', text))
    portal = bool(re.search(r'\b(sistema|sistem|portal|plataforma|pagina web|cuenta|login|sesion|registrarme|registro|notificaciones|correo|ticket|tickets|reclamo)\b', text))

    if not network and re.search(r'\b(impresora|imprimir|tinta|toner|escane[ao]r)\b', text):
        return '¿La impresora no se conecta al WiFi o tiene otro problema? Solo puedo orientarte con la conexión a internet.'

    if not network and re.search(r'\b(contrasena|clave|password)\b', text):
        if portal or re.search(r'recuper|restablec|olvide|correo|gmail', text):
            return ('Para recuperar el acceso al sistema, abre Iniciar sesión, escribe el correo registrado '
                    'y pulsa «¿Olvidaste tu contraseña?» y «Enviar instrucciones». Revisa tu bandeja y Spam. '
                    'El enlace dura 15 minutos. No compartas aquí tu contraseña ni el enlace. '
                    'Si falla, dime el mensaje de error, sin datos secretos.')
        return '¿Te refieres a la contraseña de tu cuenta del sistema web o a la clave del WiFi de ENTEL?'
    if not network and portal:
        if re.search(r'notificacion|correo.*(llega|recib)|no.*(llega|recib).*correo', text):
            return ('Consulta la sección Notificaciones y revisa el correo registrado en tu perfil, '
                    'incluida la carpeta Spam. Que el aviso aparezca en la plataforma no garantiza que '
                    'el correo se haya entregado. ¿No aparece el aviso en el sistema o solo falta el correo?')
        if re.search(r'registr|crear.*cuenta|abrir.*cuenta', text):
            return ('En la pantalla de acceso pulsa «Crear cuenta». Completa tu nombre, número de instancia, '
                    'correo y contraseña según las indicaciones del formulario. Como cliente puedes usar '
                    'tu correo personal o institucional. Si aparece un error, copia el mensaje sin tu contraseña.')
        if re.search(r'entrar|ingresar|sesion|login|acceso', text):
            return ('Para ingresar utiliza el correo de tu cuenta registrada y tu contraseña. '
                    'Si no la recuerdas, usa «¿Olvidaste tu contraseña?». '
                    '¿Qué mensaje aparece al intentar iniciar sesión? No compartas tu contraseña.')
        if re.search(r'ticket|reclamo', text):
            return ('En «Mis tickets» puedes consultar el estado y los detalles de tus solicitudes. '
                    'No puedo confirmar desde este mensaje una fecha de visita ni un estado en tiempo real. '
                    '¿Quieres saber cómo consultar un ticket o reportar una falla de internet?')
        return ('Puedo orientarte sobre el sistema web de soporte de ENTEL. '
                '¿Te refieres a iniciar sesión, crear una cuenta, recuperar contraseña, '
                'consultar tickets o notificaciones? Indica qué intentas hacer y el error que aparece.')

    if network or general_intent(text):
        return None
    # Frases completas conocidas; no aceptar coincidencias parciales como «no» en «no puedon».
    if any(text == normalize_text(example).strip(' .,:;!¿?¡')
           for examples in KNOWLEDGE_INTENT_EXAMPLES.values() for example in examples):
        return None
    if re.fullmatch(r'(hola[ ,]*)?(buenos dias|buenas tardes|buenas noches)|hola|gracias|muchas gracias|adios|hasta luego', text):
        return None
    if re.search(r'\b(entel|factura|facturacion|plan|planes|tarifa|cobertura|instalacion|recarga|saldo|datos moviles)\b', text):
        return None
    if state != 'START':
        if re.fullmatch(r'(si|no|ok|listo|ya|bien|igual|correcto|no se|no entiendo|todavia no|aun no|lo hice|ya lo hice|ya probe|sigue igual|funciona|no funciona|no conecta|todos|uno|solo uno|solamente uno|ayer|hoy|desde ayer|desde hoy|por la noche|por la manana|todo el dia|cada rato|roja|rojo|verde|apagado|encendido)[ .!]*', text):
            return None
        if re.fullmatch(r'(desde |hace |cada )?\d+\s*(minutos?|horas?|dias?|semanas?|meses?)( atras)?', text):
            return None
        if re.search(r'\b(reinicie|reiniciado|desconecte|enchufe|conectado|conectados|ventilado|pared|equipos|dispositivos|imagen|foto|evidencia)\b', text):
            return None
    # Rechazar temas claramente ajenos; lo ambiguo merece una aclaración.
    if re.search(r'\b(esposa|mujer|salud|accidente|flojo|politica|receta|pizza|embarazo|menstruacion|futbol)\b|quien gano.*partido', text):
        return 'Ese tema está fuera del soporte de internet y del sistema web de ENTEL. ¿Tienes alguna consulta sobre esos servicios?'
    if detect_direct_intent(text):
        return None
    return None



def normalize_text(value):
    # Sólo se usa para análisis: nunca reemplaza el mensaje original persistido.
    normalized = ''.join(c for c in unicodedata.normalize('NFD', str(value).lower())
                         if unicodedata.category(c) != 'Mn')
    # No corregir dentro de emails, códigos, identificadores ni palabras compuestas.
    normalized = re.sub(r'[¿?¡!,;:]+', ' ', normalized)
    normalized = re.sub(r'\bwi[ -]fi\b', 'wifi', normalized)
    corrections = {
        'clasese': 'clases', 'clasees': 'clases', 'internte': 'internet',
        'intenert': 'internet', 'interent': 'internet', 'wify': 'wifi',
        'wiffi': 'wifi', 'wifii': 'wifi', 'ruter': 'router',
        'kiero': 'quiero', 'reiniciee': 'reinicie', 'conecion': 'conexion', 'coneccion': 'conexion', 'enrutador': 'router', 'moden': 'modem',
        'funka': 'funciona', 'funca': 'funciona',
        'interned': 'internet', 'internete': 'internet', 'intrnet': 'internet',
    }
    normalized = ' '.join(corrections.get(word, word) for word in normalized.split()).strip(' .')
    normalized = re.sub(r'\bno ay (internet|conexion|senal)\b', r'no hay \1', normalized)
    normalized = re.sub(r'\b(q|k) (ago|hago|pasa|puedo|debo)\b', r'que \2', normalized)
    normalized = re.sub(r'\bque ago\b', 'que hago', normalized)
    normalized = re.sub(r'\b(mi|el|sin|tengo|hay) inter\b', r'\1 internet', normalized)
    normalized = re.sub(r'\b(mi|el|sin|tengo|hay) net\b', r'\1 internet', normalized)
    normalized = re.sub(r'\bno (?:me )?agarra (?:mi |el )?wifi\b', 'no funciona el wifi', normalized)
    return normalized


# Ejemplos coloquiales y variaciones frecuentes de los clientes.
KNOWLEDGE_INTENT_EXAMPLES = {
    "sin_internet": [
        "no tengo internet", "no funciona el internet", "se fue el internet",
        "no tenemos internet", "estamos sin internet", "nos quedamos sin internet",
        "el negocio esta sin internet", "la institucion esta sin internet",
        "no podemos cobrar por falta de internet", "no funciona el sistema de ventas",
        "no carga ninguna pagina", "estoy sin servicio", "no tengo conexion",
        "no puedo navegar", "no puedo entrar a internet", "no tengo acceso a internet",
        "no hay internet", "estoy sin internet", "no conecta", "no abre ninguna pagina",
        "no puedo entrar a google", "mi internet dejo de funcionar", "no hay servicio",
        "se cayo el internet", "no puedo usar el wifi", "no tengo wifi",
        "no puedo conectarme", "no funciona mi servicio", "sin conexion a internet",
    ],
    "internet_lento": [
        "mi internet esta lento", "internet lento", "esta muy lento", "demora mucho",
        "el internet esta muy lento", "tenemos el internet lento",
        "internet lento en todas las computadoras", "internet lento en la institucion",
        "internet lento en el negocio", "el sistema de ventas esta lento",
        "las paginas cargan lento", "todo esta lento", "descarga muy lento",
        "no llega la velocidad", "mi plan dice otra velocidad", "tengo mucha latencia",
        "esta muy pesado", "va lento", "no carga rapido", "la velocidad es baja",
        "tengo 100 megas pero navega lento", "el internet esta horrible", "tengo señal lenta",
    ],
    "streaming": [
        "no puedo ver videos", "netflix se congela", "netflix se traba",
        "youtube tarda", "youtube se pausa", "los videos no cargan",
        "se corta el video", "streaming lento", "las series se congelan",
        "clases virtuales", "videollamada se congela", "llamadas se cortan",
        "imagen se congela", "no escucho bien", "no escucha bien",
        "internet lento cuando estoy en clases", "internet lento cuando estoy en llamada",
        "llamada se corta", "problemas en videollamada",
    ],
    "router_restarts": [
        "mi router se apaga", "el router se reinicia", "se apaga solo",
        "cada rato se apaga", "se reinicia solo", "se apaga y prende",
        "las luces desaparecen", "el modem se reinicia", "el router falla",
        "pierde energia", "el modem esta caliente", "router sobrecalentado",
        "parpadea y se reinicia", "el equipo se reinicia cada rato",
        "mi router es antiguo", "mi router se calienta", "quiero cambiarlo",
    ],
    "router_power": [
        "router apagado", "modem apagado", "el router no prende",
        "router no prende", "no prende ninguna luz", "ninguna luz enciende",
        "el modem no funciona", "router no enciende", "modem no enciende",
        "mi bateria no enciende", "la bateria del router no enciende",
        "el adaptador no funciona", "el equipo no tiene energia",
        "parece que esta danado no prende", "no prende",
    ],
    "los_rojo": [
        "luz roja", "los rojo", "esta en rojo", "la luz los esta roja",
        "parpadea rojo", "mi modem tiene una luz roja", "esta encendida la luz roja",
        "la luz pon esta apagada", "led los rojo", "los parpadea en rojo",
    ],
    "fiber_cable_damage": [
        "el cable esta roto", "se rompio el cable", "el cable esta danado",
        "el cable esta cortado", "la fibra se rompio", "mi perro mordio el cable",
        "se doblo el cable", "la fibra esta partida", "cable de fibra suelto",
        "arrancaron el cable de internet", "cortaron mi fibra",
        "el cable de fibra esta danado", "mi cable de fibra esta danado",
        "mi cable de fibra esta roto", "el cable de fibra esta roto",
        "la fibra optica esta danada", "la fibra optica esta rota",
        "aplaste el cable de fibra", "cable de fibra aplastado", "pise el cable de fibra",
        "doble el cable del internet", "moviendo un mueble doble el cable",
        "cable de fibra esta cortado", "cable de fibra cortado",
    ],
    "wifi_not_visible": [
        "el wifi no aparece", "no sale mi wifi", "no encuentro la red",
        "mi celular no detecta la red", "no aparece el nombre del wifi",
        "desaparecio mi red wifi", "no veo mi wifi en el telefono",
        "la red inalambrica no aparece", "no puedo encontrar el ssid",
    ],
    "wifi_password": [
        "no puedo ingresar la contrasena", "olvide la clave del wifi",
        "no recuerdo mi contrasena", "como ver la clave del wifi",
        "quiero cambiar la contrasena wifi", "cambiar clave wifi",
        "la contrasena del wifi no funciona", "donde esta la clave wifi",
    ],
    "internet_intermittent": [
        "el internet se corta y vuelve", "se corta cada cinco minutos",
        "el internet va y vuelve", "se cae el sistema de pedidos",
        "los pedidos dejan de ingresar", "se corta el internet del negocio",
        "internet intermitente", "la conexion es inestable", "se desconecta solo",
        "se corta mientras navego", "va y vuelve", "pierdo conexion por momentos",
        "el wifi se desconecta a cada rato", "tengo cortes frecuentes",
    ],
    "wifi_weak": [
        "el wifi llega debil", "tengo poca senal wifi", "el wifi no llega a mi cuarto",
        "solo funciona cerca del router", "una raya de wifi", "wifi con poco alcance",
        "la senal wifi es baja", "en el segundo piso no llega el wifi",
        "casi no llega el wifi", "a mi cuarto casi no llega el wifi",
        "a mi habitacion casi no llega el wifi", "en mi habitacion casi no llega el wifi",
        "wifi se pierde", "se pierde el wifi", "planta baja", "primer piso",
    ],
    "ethernet_problem": [
        "el cable de red no funciona", "no conecta por ethernet", "puerto lan no funciona",
        "por cable no tengo internet", "mi computadora no conecta por cable",
        "cable utp sin conexion", "la red cableada no funciona",
    ],
    "single_device_issue": [
        "solo un celular no tiene internet", "funciona en todos menos en mi telefono",
        "solo mi computadora no conecta", "un dispositivo no tiene internet",
        "el wifi funciona en otros equipos", "solo falla en mi laptop",
        "solo mi laptop no conecta", "solo mi telefono no conecta",
        "mi celular no se conecta al internet", "mi celular no se conecta",
    ],
    "gaming_latency": [
        "tengo ping alto", "mucho lag al jugar", "los juegos tienen latencia",
        "se congela el juego online", "pierdo paquetes", "packet loss",
        "el ping sube demasiado", "lag en videojuegos",
    ],
    "website_only_issue": [
        "solo una pagina no abre", "no puedo entrar a una pagina pero hay internet",
        "algunas paginas no cargan", "una aplicacion no conecta",
        "internet funciona pero un sitio no", "error dns", "no resuelve la pagina",
    ],
    "storm_damage": [
        "hubo una tormenta y el router no prende", "router danado por tormenta",
        "despues de un rayo no enciende", "sobrecarga electrica en el modem",
        "se quemo el router", "olor a quemado en el modem", "tormenta electrica router",
    ],
    "cable_theft": [
        "robaron cables en mi barrio", "robo de cobre", "cortaron cables en la zona",
        "se robaron el cableado", "todo el barrio sin internet por robo",
        "robaron la fibra", "danaron el cableado del barrio",
        "robaron cables en mi zona", "robaron cables en el barrio",
        "robaron claves en mi barrio", "rabaron claves en mi barrio",
    ],
    "mobile_data_slow": [
        "mis datos moviles estan lentos", "internet movil lento", "4g lento", "5g lento",
        "tengo datos pero no carga", "los datos del celular no funcionan",
        "apenas carga una foto con datos", "mi navegacion movil esta lenta",
    ],
    "mobile_no_signal": [
        "no tengo senal de celular", "no puedo hacer llamadas", "sin servicio en el celular",
        "solo emergencias", "mi sim no tiene senal", "telefono sin cobertura",
        "no entran llamadas", "no salen llamadas", "celular sin red movil",
    ],
    "service_sla": [
        "cuanto tardan en arreglar el internet", "plazo de atencion",
        "tiempo para reparar mi servicio", "acuerdo de nivel de servicio",
        "en cuanto tiempo llega el tecnico", "cuanto demora una averia",
        "cuanto tiempo tienen para reparar", "plazo del ticket",
    ],
    "ftth_info": [
        "que es ftth", "como funciona la fibra optica", "diferencia entre fibra y cobre",
        "que significa fibra hasta el hogar", "para que sirve la ont",
    ],
    "instalacion_ftth": [
        "quiero contratar fibra", "como instalar internet en mi casa",
        "quiero una nueva instalacion", "hay cobertura de fibra en mi zona",
        "requisitos para instalar ftth", "quiero contratar internet hogar",
    ],
    "facturacion": [
        "quiero ver mi factura", "cuanto debo pagar", "donde pago el internet",
        "mi factura esta mal", "me cobraron de mas", "fecha de vencimiento de mi factura",
        "quiero consultar mi deuda", "como pagar mi servicio",
    ],
    "relocation_service": [
        "quiero trasladar mi internet", "me cambie de domicilio",
        "mover el servicio a otra casa", "traslado de linea ftth",
        "quiero cambiar la direccion de instalacion",
    ],
    "consulta_general": [
        "tengo una duda", "quiero consultar", "necesito informacion",
        "quiero preguntar algo", "tengo una consulta", "podria ayudarme",
        "quiero hacer una pregunta", "necesito orientacion",
    ],
    "router_restart_help": [
        "como reiniciar mi router", "como reinicio el router", "como reiniciar el modem",
        "quiero reiniciar mi router", "ayuda para reiniciar el router",
    ],
    "estado_reclamo": [
        "como va mi ticket", "estado de mi reclamo", "consultar mi ticket",
        "seguimiento de averia", "quiero saber el estado de mi caso",
    ],
    "tiempo_tecnico": [
        "cuando viene el tecnico", "tecnico no llega", "hora de visita tecnica",
        "demora del tecnico", "cuando atenderan mi ticket",
    ],
    "hablar_operador": [
        "quiero hablar con un operador", "necesito un tecnico", "soporte humano",
        "comunicarme con soporte", "quiero reportar un problema",
        "quiero que venga un tecnico", "quiero que vengan a solucionar mi internet",
        "que vengan a mi domicilio", "tecnico en mi domicilio",
        "necesito un tecnico en mi domicilio", "quiero una visita tecnica",
        "que solucionen mi servicio", "quiero atencion en mi casa",
    ],
    "router_general": [
        "router", "modem", "mi router", "mi modem", "problema con el router",
    ],
    "internet_general": [
        "internet", "wifi", "mi internet", "mi wifi", "problema de internet",
        "tengo problemas con mi red", "tengo problema con mi red",
        "tengo problema de mi servicio", "tengo un problema con internet",
    ],
    "saludo": [
        "hola", "buenos dias", "buenas tardes", "buenas noches", "que tal",
        "hola asistente", "buen dia",
    ],
    "agradecimiento": [
        "gracias", "muchas gracias", "te agradezco", "muy amable", "perfecto gracias",
    ],
    "despedida": [
        "adios", "hasta luego", "nos vemos", "hasta pronto", "gracias adios",
    ],
}


TECHNICAL_INTENT_ORDER = [
    "storm_damage", "cable_theft", "fiber_cable_damage", "mobile_no_signal",
    "mobile_data_slow", "hablar_operador", "router_restarts", "router_power",
    "website_only_issue", "single_device_issue", "ethernet_problem", "gaming_latency",
    "wifi_weak", "wifi_password", "wifi_not_visible", "internet_intermittent", "streaming",
    "internet_lento", "sin_internet", "los_rojo", "router_restart_help", "service_sla", "ftth_info",
    "estado_reclamo", "tiempo_tecnico", "relocation_service",
    "instalacion_ftth", "facturacion",
]


SUPPORT_GUIDES = {
    "router_restart_help": {
        "flow": "message",
        "message": (
            "Para reiniciar el router de forma segura, desconéctalo de la corriente durante un minuto, "
            "vuelve a conectarlo y espera hasta tres minutos a que estabilicen sus luces. No presiones el botón RESET, "
            "porque puede borrar la configuración. Después comprueba si regresó el servicio."
        ),
    },
    "router_restarts": {
        "flow": "diagnosis",
        "diagnosis": {
            "code": "ROUTER_RESTARTING",
            "problem": "El router u ONT se apaga o reinicia de forma inesperada.",
            "cause": "Puede existir sobrecalentamiento, una fuente de poder inestable o una falla del equipo.",
            "steps": [
                "Coloca el equipo en un lugar ventilado y retira objetos que bloqueen sus rejillas.",
                "Desconéctalo durante 5 minutos para que se enfríe.",
                "Conéctalo directamente a un tomacorriente que sepas que funciona.",
                "Verifica que el adaptador no esté flojo, caliente, roto o con olor a quemado.",
                "Observa si vuelve a reiniciarse durante los siguientes minutos.",
            ],
            "priority": "MEDIA", "ticket_required": True,
            "final_message": "Si vuelve a apagarse o reiniciarse, el equipo debe ser revisado por un técnico.",
        },
    },
    "router_power": {
        "flow": "diagnosis",
        "diagnosis": {
            "code": "ROUTER_POWER_FAILURE",
            "problem": "El router, ONT, adaptador o respaldo de energía no enciende.",
            "cause": "Puede faltar energía, estar flojo el adaptador o existir una falla en la fuente de poder.",
            "steps": [
                "Confirma que el tomacorriente funciona conectando otro equipo de bajo consumo.",
                "Ajusta el conector de energía del router y revisa el botón de encendido.",
                "Si utilizas regulador o batería de respaldo, prueba temporalmente el adaptador original directo al tomacorriente.",
                "No uses el adaptador si está roto, demasiado caliente o tiene olor a quemado.",
            ],
            "priority": "BAJA", "ticket_required": True,
            "final_message": "Si ninguna luz enciende, puedo registrar un ticket para revisar el equipo y su fuente de poder.",
        },
    },
    "fiber_cable_damage": {
        "flow": "ticket_confirmation",
        "message": (
            "El cable de fibra óptica es delicado y no debe empalmarse ni manipularse sin herramientas especializadas. "
            "Evita doblarlo, pegarlo o mirar directamente al conector. La reparación por daño físico puede estar sujeta "
            "a evaluación técnica y a las condiciones vigentes del servicio."
        ),
        "diagnosis": {
            "code": "FIBER_CABLE_DAMAGED", "problem": "Cable de fibra óptica roto, cortado, doblado o mordido.",
            "cause": "Daño físico visible en la acometida o cable interior de fibra.",
            "steps": ["No manipules el extremo del cable.", "Mantén a personas y mascotas alejadas del área dañada."],
            "priority": "MEDIA", "ticket_required": True,
        },
    },
    "wifi_not_visible": {
        "flow": "diagnosis",
        "diagnosis": {
            "code": "WIFI_NETWORK_NOT_VISIBLE",
            "problem": "El nombre de la red WiFi no aparece en el celular o computadora.",
            "cause": "La radio WiFi puede estar desactivada, el router saturado o el dispositivo fuera de alcance.",
            "steps": [
                "Comprueba que el router esté encendido y que la luz WiFi o WLAN esté activa.",
                "Acércate al router y activa y desactiva el WiFi del celular.",
                "Reinicia el router y espera de 2 a 3 minutos.",
                "Busca también la red de 2.4 GHz si tu equipo no es compatible con 5 GHz.",
                "Evita restablecer el router de fábrica sin asistencia, porque se borrará su configuración.",
            ],
            "priority": "MEDIA", "ticket_required": False,
            "final_message": "Si la red continúa sin aparecer en ningún dispositivo, el WiFi del router requiere revisión.",
        },
    },
    "wifi_password": {
        "flow": "message",
        "message": (
            "Busca la clave WiFi en la etiqueta del router u ONT, identificada como WLAN Key, WPA Key o contraseña. "
            "Si la clave fue cambiada, puedes revisarla desde un dispositivo que ya esté conectado o solicitar ayuda "
            "para cambiarla. No restablezcas el router de fábrica por tu cuenta: puede borrar la configuración FTTH. "
            "Nunca compartas aquí contraseñas, códigos ni datos bancarios."
        ),
    },
    "wifi_weak": {
        "flow": "diagnosis",
        "diagnosis": {
            "code": "WIFI_WEAK_SIGNAL", "problem": "La señal WiFi tiene poco alcance en parte del domicilio.",
            "cause": "La distancia, muros, pisos, objetos metálicos o interferencias reducen la cobertura inalámbrica.",
            "steps": [
                "Coloca el router alto, abierto y lo más centrado posible en el domicilio.",
                "Evita esconderlo en muebles o ubicarlo junto a microondas, televisores y objetos metálicos.",
                "Usa 2.4 GHz para mayor alcance y 5 GHz cuando estés cerca y necesites más velocidad.",
                "Compara la conexión cerca del router para confirmar que el acceso FTTH funciona correctamente.",
                "Si la vivienda es amplia, evalúa una solución mesh o un punto de acceso correctamente cableado.",
            ],
            "priority": "BAJA", "ticket_required": False,
            "final_message": "La cobertura WiFi depende del entorno; ampliar señal no siempre implica una falla de la fibra.",
        },
    },
    "ethernet_problem": {
        "flow": "diagnosis",
        "diagnosis": {
            "code": "ETHERNET_CONNECTION_FAILURE", "problem": "Un equipo no obtiene conexión mediante cable de red.",
            "cause": "Puede fallar el cable Ethernet, el puerto LAN o la configuración de red del equipo.",
            "steps": [
                "Verifica que ambos conectores hagan clic y observa si enciende la luz del puerto LAN.",
                "Prueba otro cable Ethernet conocido y otro puerto LAN del router.",
                "Reinicia únicamente el equipo conectado y deja la obtención de IP y DNS en automático.",
                "Prueba el mismo cable con otro dispositivo para identificar dónde está la falla.",
            ],
            "priority": "MEDIA", "ticket_required": False,
            "final_message": "Si ningún puerto LAN funciona con cables y equipos distintos, el router requiere revisión.",
        },
    },
    "single_device_issue": {
        "flow": "message",
        "message": (
            "Si los demás equipos navegan, la fibra y el router probablemente están operativos. En el equipo afectado, "
            "olvida la red WiFi y vuelve a conectarte, activa y desactiva el modo avión, reinícialo y comprueba que fecha, "
            "hora, IP y DNS estén en automático. No generes una avería FTTH hasta probar otro dispositivo en la misma ubicación."
        ),
    },
    "gaming_latency": {
        "flow": "diagnosis",
        "diagnosis": {
            "code": "HIGH_LATENCY_GAMING", "problem": "Se presenta latencia alta, lag o pérdida de paquetes al jugar.",
            "cause": "Puede influir el WiFi, consumo simultáneo, la ruta hacia el servidor o la ubicación del servidor del juego.",
            "steps": [
                "Conecta la consola o computadora mediante cable Ethernet.",
                "Pausa descargas, copias en la nube y transmisiones de otros equipos.",
                "Selecciona un servidor de juego geográficamente cercano.",
                "Registra ping y pérdida de paquetes en distintos horarios y también fuera del juego.",
            ],
            "priority": "MEDIA", "ticket_required": False,
            "final_message": "Un ping alto dentro de un único juego no confirma por sí solo una falla del servicio FTTH.",
        },
    },
    "website_only_issue": {
        "flow": "message",
        "message": (
            "Si otras páginas funcionan, probablemente no existe una caída total del servicio. Prueba el sitio en modo "
            "privado, en otro navegador y en otro dispositivo; revisa que fecha y hora sean correctas y deja DNS en automático. "
            "Si solo falla una aplicación o página en varios tipos de conexión, el inconveniente puede estar en ese servicio."
        ),
    },
    "internet_intermittent": {
        "flow": "diagnosis",
        "diagnosis": {
            "code": "INTERNET_INTERMITTENT", "problem": "La conexión se corta y vuelve repetidamente.",
            "cause": "Puede deberse a interferencia WiFi, un cable flojo o pérdida intermitente de señal óptica.",
            "steps": [
                "Prueba la conexión cerca del router y, si es posible, mediante cable de red.",
                "Coloca el router en un lugar alto y alejado de microondas, televisores y objetos metálicos.",
                "Verifica si la luz LOS parpadea o se enciende en rojo durante el corte.",
                "Revisa que los cables estén firmes sin doblar la fibra.",
                "Anota la hora y frecuencia de los cortes para incluirlas en el diagnóstico.",
            ],
            "priority": "MEDIA", "ticket_required": True,
            "final_message": "Si también se corta por cable o la luz LOS cambia, corresponde una revisión técnica.",
        },
    },
    "storm_damage": {
        "flow": "ticket_confirmation",
        "message": (
            "Una descarga eléctrica puede dañar el adaptador o el router. Desconecta el equipo si está caliente, "
            "produce chispas o tiene olor a quemado; no intentes abrirlo ni uses otro adaptador incompatible."
        ),
        "diagnosis": {
            "code": "ELECTRICAL_STORM_DAMAGE", "problem": "Equipo sin funcionamiento después de una tormenta.",
            "cause": "Posible daño eléctrico en el adaptador, router u ONT.",
            "steps": ["Mantén el equipo desconectado si hay señales de daño.", "Solicita una revisión técnica segura."],
            "priority": "ALTA", "ticket_required": True,
        },
    },
    "cable_theft": {
        "flow": "ticket_confirmation",
        "message": (
            "No puedo confirmar desde aquí si existe un incidente zonal activo. Si observas cables caídos o dañados, "
            "no los toques y mantén distancia. Registrar el sector y tu servicio ayuda a relacionar el caso con una avería externa."
        ),
        "diagnosis": {
            "code": "EXTERNAL_NETWORK_DAMAGE", "problem": "Posible daño o robo de cableado en el sector.",
            "cause": "Avería externa que puede afectar a varios clientes de la zona.",
            "steps": ["Evita acercarte al cableado.", "Registra el barrio o referencia del lugar afectado."],
            "priority": "ALTA", "ticket_required": True,
        },
    },
    "mobile_data_slow": {
        "flow": "message",
        "message": (
            "Para datos móviles lentos: activa el modo avión durante 20 segundos y desactívalo, verifica que tengas "
            "saldo o paquete vigente, desactiva límites de datos y prueba en otra ubicación. También revisa que la red "
            "preferida esté en selección automática 4G/5G. Si continúa en varios lugares, comunica zona, hora y modelo a soporte móvil."
        ),
    },
    "mobile_no_signal": {
        "flow": "message",
        "message": (
            "Si el celular muestra “Sin servicio” o “Solo emergencias”, activa y desactiva el modo avión, reinicia el "
            "teléfono y deja la selección de red en automático. Prueba la SIM en otro equipo compatible si es posible. "
            "Si continúa en una zona con cobertura habitual, la SIM o la línea debe revisarse en soporte o en un Multicentro."
        ),
    },
    "service_sla": {
        "flow": "message",
        "message": (
            "El tiempo de atención depende de la zona, prioridad y disponibilidad técnica. Consulta la programación confirmada en Mis tickets."
        ),
    },
    "ftth_info": {
        "flow": "message",
        "message": (
            "FTTH significa fibra óptica hasta el hogar. La ONT convierte la señal óptica en conexión de red y WiFi. "
            "La fibra ofrece alta capacidad y estabilidad, pero el rendimiento WiFi también depende de distancia e interferencias."
        ),
    },
    "estado_reclamo": {
        "flow": "message",
        "message": (
            "Puedes revisar el estado real en la sección Mis tickets: Pendiente significa registrado; Asignado, que ya "
            "tiene técnico; En proceso, que está siendo atendido; y Resuelto o Cerrado, que finalizó. Las notificaciones "
            "mostrarán cada cambio. Si un ticket excede el plazo informado, solicita seguimiento usando su número."
        ),
    },
    "tiempo_tecnico": {
        "flow": "message",
        "message": (
            "La fecha y hora válidas son las que aparecen en el ticket y en las notificaciones. Si todavía figura Pendiente, "
            "el técnico aún no fue asignado. Cuando cambie a Asignado o En camino, revisa el detalle de la visita. "
            "No puedo prometer una hora diferente a la registrada por el sistema."
        ),
    },
    "hablar_operador": {
        "flow": "ticket_confirmation",
        "message": "Puedo registrar tu solicitud para que el equipo de soporte la atienda con el contexto de esta conversación.",
        "diagnosis": {
            "code": "HUMAN_SUPPORT_REQUEST", "problem": "El cliente solicita atención humana.",
            "cause": "La consulta requiere seguimiento de un operador o técnico.",
            "steps": ["Conserva el número de ticket para consultar su estado."],
            "priority": "MEDIA", "ticket_required": True,
        },
    },
    "instalacion_ftth": {
        "flow": "message",
        "message": (
            "Una instalación FTTH requiere validar cobertura y condiciones comerciales para la dirección exacta. "
            "La cuadrilla instala la acometida de fibra, la ONT/router y verifica niveles y navegación. Consulta los "
            "planes, requisitos, costos y agenda vigentes en los canales comerciales oficiales o en un Multicentro."
        ),
    },
    "facturacion": {
        "flow": "message",
        "message": (
            "Revisa el periodo, plan, descuentos, saldo anterior y fecha de vencimiento en tu factura. Para montos y "
            "pagos usa la aplicación, web o canales oficiales de ENTEL; no compartas aquí claves, PIN ni datos bancarios. "
            "Si identificas un cobro que no reconoces, registra un reclamo de facturación con el número de factura."
        ),
    },
    "relocation_service": {
        "flow": "message",
        "message": (
            "El traslado de FTTH depende de cobertura y disponibilidad técnica en la nueva dirección. No desconectes ni "
            "retires la fibra por tu cuenta. Solicita la validación con anticipación mediante los canales comerciales y "
            "ten disponibles el número de cliente, dirección actual y nueva dirección."
        ),
    },
    "consulta_general": {
        "flow": "message",
        "message": (
            "Claro, ¿qué necesitas saber sobre tu servicio?"
        ),
    },
    "router_general": {
        "flow": "message",
        "message": (
            "Cuéntame qué sucede con el router: ¿no enciende, se reinicia, está caliente, tiene una luz roja "
            "o las luces parecen normales pero no tienes internet? Con ese dato puedo darte un diagnóstico preciso."
        ),
    },
    "internet_general": {
        "flow": "message",
        "message": (
            "Indícame qué ocurre con la conexión: ¿no tienes internet, está lenta, se corta, el WiFi no aparece "
            "o solamente falla en un dispositivo? También dime desde cuándo sucede."
        ),
    },
}

# Orientaciones revisadas para clientes: una acción o explicación breve.
SUPPORT_GUIDES['wifi_password']['message'] = (
    'Puedes buscar la contraseña WiFi en la etiqueta del equipo o consultarla en un dispositivo que ya esté conectado. '
    'Si fue cambiada y no puedes recuperarla, solicita ayuda a soporte; evita restablecer el equipo de fábrica. '
    'No compartas la contraseña en este chat.'
)
SUPPORT_GUIDES['ftth_info']['message'] = (
    'FTTH significa fibra óptica hasta el hogar: el internet llega por un cable de fibra hasta tu vivienda. '
    'La señal WiFi dentro de casa también depende de la distancia y las paredes.'
)
SUPPORT_GUIDES['website_only_issue']['message'] = (
    '¿Las otras páginas o aplicaciones funcionan normalmente? Si solo falla una, prueba abrirla en otro navegador para comparar.'
)
SUPPORT_GUIDES['instalacion_ftth']['message'] = (
    'La instalación depende de la cobertura en tu dirección. Consulta los requisitos, precios y fechas disponibles en los canales oficiales de ENTEL.'
)
SUPPORT_GUIDES['router_general']['message'] = '¿Qué sucede con tu equipo de internet?'
SUPPORT_GUIDES['internet_general']['message'] = '¿Tu conexión no funciona, está lenta o se corta?'



def detect_direct_intent(text):
    """Detecta primero la falla técnica y deja saludos para el final."""
    normalized = normalize_text(text)

    social = general_intent(normalized)
    if social:
        return social
    if re.search(r'\b(?:factura|facturacion|cobro indebido)\b', normalized):
        return 'facturacion'
    if re.search(r'\b(?:equipo|router|modem)\b.*(?:se reinicia|se apaga solo)|se reinicia (?:el |mi )?(?:equipo|router|modem)', normalized):
        return 'router_restarts'
    if re.search(r'\blent[oa]\b(?: ps| pues| nomas)?$', normalized) and not re.search(r'\bno\b', normalized):
        return 'internet_lento'
    # Descartar síntomas negados antes de buscar ejemplos y similitudes.
    normalized = re.sub(r'\bno (?:hay|tengo|veo|tiene|presenta) (?:ninguna |una )?luz roja\b', '', normalized)
    normalized = re.sub(r'\b(?:la )?luz (?:los )?no (?:esta|es) roja\b', '', normalized)
    normalized = re.sub(r'\bno (?:esta |es |va )?lent[oa]\b', '', normalized)
    if re.search(r'\bwi ?fi\b', normalized) and re.search(r'poca (?:senal|cobertura)|senal (?:muy )?(?:baja|debil)|no llega|lejos|alejad', normalized):
        return 'wifi_weak'
    if re.search(r'\b(?:internet|wifi|conexion)\b.*\bno funciona\b|no (?:me )?carga nada|no funciona nada|se fue la senal', normalized):
        return 'sin_internet'
    if re.search(r'\b(?:internet|wifi|conexion)\b.*(?:anda mal|no va bien)', normalized):
        return 'problema_wifi_general' if 'wifi' in normalized else 'problema_internet_general'
    if re.search(r'\b(?:youtube|netflix|whatsapp|video|partido|transmision|clases virtuales|videollamada)\b', normalized) and re.search(r'no (?:puedo ver|carga|funciona)|se (?:detiene|interrumpe|congela|traba)|afectad|cort', normalized):
        return 'streaming'
    if re.search(r'\b(?:celular|telefono|computadora|laptop)\b.*\bno (?:conecta|se conecta|tiene internet)\b', normalized):
        return 'single_device_issue'
    if re.search(r'\b(?:equipo|aparato)\b.*(?:apagado|no prende|no enciende)', normalized):
        return 'router_power'
    if re.search(r'\b(?:nap|dns|dhcp|gpon|ont|olt|pon|los)\b', normalized) and re.search(r'que es|significa|para que sirve', normalized):
        return 'technical_definition'
    if re.search(r'\bplan\b.*contrat|que plan tengo|mi plan actual', normalized):
        return 'contracted_plan'
    if re.search(r'\blos\b.*\broj[oa]\b|\bluz roja\b', normalized):
        return 'los_rojo'
    if re.search(r'\bpon\b.*(apag|parpade|no enciende)', normalized):
        return 'problema_pon'
    if re.search(r'\b(celular|movil|sim)\b', normalized) and re.search(r'sin (senal|servicio)|no tengo senal', normalized):
        return 'mobile_no_signal'
    if re.search(r'mi internet esta muerto|(?:mi )?(internet|wifi|conexion) (?:no agarra|se cayo)|no da internet|se me fue la senal', normalized):
        return 'sin_internet'
    if re.search(r'no (?:me |nos )?(?:funciona|anda|sirve) (?:el |mi )?(internet|wifi)|\b(no tengo|no hay|sin) (?:internet|conexion|senal)\b|se me fue el internet', normalized):
        return 'sin_internet'

    # Las expresiones de impacto comercial o institucional no deben confundirse
    # con una solicitud para instalar un servicio nuevo.
    if any(phrase in normalized for phrase in [
        "no tenemos internet", "estamos sin internet", "nos quedamos sin internet",
        "negocio esta sin internet", "institucion esta sin internet",
        "no podemos cobrar por falta de internet", "no funciona el sistema de ventas",
    ]):
        return "sin_internet"

    # Si el cliente declara explícitamente lentitud, se conserva ese diagnóstico
    # aunque también mencione clases, videollamadas o aplicaciones del negocio.
    if any(phrase in normalized for phrase in [
        "internet esta lento", "internet esta muy lento", "internet muy lento",
        "tenemos el internet lento", "conexion esta lenta", "conexion muy lenta",
    ]):
        return "internet_lento"

    for intent in TECHNICAL_INTENT_ORDER:
        for phrase in KNOWLEDGE_INTENT_EXAMPLES.get(intent, []):
            if re.search(r"(?<!\w)" + re.escape(normalize_text(phrase)) + r"(?!\w)", normalized):
                return intent

    if re.search(r'\b(se corta|se desconecta|intermitente|inestable)\b', normalized):
        return 'cortes_internet'
    if re.search(r'\b(internet|conexion|wifi)\b', normalized):
        if re.search(r'\blent[oa]\b|velocidad (?:es |esta )?baja', normalized):
            return 'internet_lento'
        if re.search(r'fall|problema|anda mal|no anda bien|no va bien', normalized) or re.fullmatch(r'(con )?(mi |el |la )?(internet|conexion|wifi)', normalized):
            return 'problema_wifi_general' if 'wifi' in normalized else 'problema_internet_general'

    for intent in ("router_general", "internet_general"):
        if any(
            normalize_text(phrase) == normalized
            for phrase in KNOWLEDGE_INTENT_EXAMPLES[intent]
        ):
            return intent

    for phrase in KNOWLEDGE_INTENT_EXAMPLES["consulta_general"]:
        if re.search(r"(?<!\w)" + re.escape(normalize_text(phrase)) + r"(?!\w)", normalized):
            return "consulta_general"

    short_message = len(normalized.split()) <= 6
    for intent in ["despedida", "agradecimiento", "saludo"]:
        if short_message and any(
            normalize_text(phrase) == normalized
            for phrase in KNOWLEDGE_INTENT_EXAMPLES[intent]
        ):
            return intent
    return None


def get_support_guide(intent):
    guide = SUPPORT_GUIDES.get(intent)
    return deepcopy(guide) if guide else None
