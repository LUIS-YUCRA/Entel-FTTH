"""Flujos naturales y progresivos para las fallas FTTH más frecuentes."""

GUIDED_FLOWS = {
    "sin_internet": {
        "intents": {"sin_internet", "los_rojo", "problema_pon"},
        "messages": [
            "Lamento que estés sin servicio; te ayudaré a revisar qué ocurre. ¿Ves alguna luz roja en tu equipo de internet?",
            "Gracias por revisar las luces. Observa el cable delgado sin tocar ni desconectar la fibra: ¿presenta daños visibles o parece suelto?",
            "Probemos un reinicio sencillo para comprobar si el equipo recupera la conexión: desconéctalo solo de la corriente durante un minuto, vuelve a conectarlo y espera hasta tres minutos. ¿Regresó el internet?",
            "Gracias por realizar las pruebas; como la falla continúa, conviene que soporte revise la conexión. ¿Deseas que registre un ticket?",
        ],
        "diagnosis": {"code": "SIN_INTERNET", "problem": "Sin internet", "cause": "Posible pérdida de señal externa.", "priority": "ALTA", "ticket_required": True},
    },
    "internet_lento": {
        "intents": {"internet_lento", "velocidad_baja"},
        "messages": [
            "Lamento la lentitud; vamos a revisar juntos qué puede estar afectando tu conexión. ¿El problema ocurre en todos tus dispositivos o solamente en algunos?",
            "Gracias, eso nos ayuda a orientar la revisión. ¿Los dispositivos están conectados por WiFi o también probaste mediante cable?",
            "Para comprobar si influye la distancia, prueba una página cerca del equipo de internet y pausa las descargas o los videos en otros dispositivos. ¿La velocidad mejoró?",
            "Gracias por probarlo. Podemos comprobar si un reinicio ayuda: desconecta el equipo solo de la corriente durante un minuto, vuelve a conectarlo y espera hasta tres minutos. ¿Las páginas cargan mejor?",
            "La lentitud continúa después de las pruebas; soporte puede revisar la señal y el equipo para identificar la causa. ¿Deseas que registre un ticket?",
        ],
        "diagnosis": {"code": "INTERNET_LENTO", "problem": "Internet lento", "cause": "La conexión no mantiene la velocidad esperada.", "priority": "MEDIA", "ticket_required": True},
    },
    "internet_intermittent": {
        "intents": {"internet_intermittent", "cortes_internet"},
        "messages": [
            "Lamento esos cortes; te ayudaré a revisar cuándo se producen. ¿Esto sucede durante todo el día o solamente en determinados momentos?",
            "Gracias por contármelo. ¿Cuando se corta el internet cambian o se apagan las luces del router?",
            "Un cable suelto puede provocar cortes; revisa la conexión del cable de corriente y del cable de red, sin manipular la fibra. ¿Encontraste alguno suelto?",
            "Probemos si un reinicio estabiliza la conexión: desconecta el equipo de la corriente durante un minuto y espera hasta tres minutos después de conectarlo. ¿Vuelve a desconectarse?",
            "La conexión necesita una revisión. ¿Quieres que genere un ticket para atención técnica?",
        ],
        "diagnosis": {"code": "PROBLEMA_CONEXION", "problem": "Problema de conexión", "cause": "Conexión intermitente.", "priority": "MEDIA", "ticket_required": True},
    },
    "router_power": {
        "intents": {"router_power", "router"},
        "messages": [
            "Con gusto te ayudo; primero comprobaremos si el equipo recibe energía. ¿El cable de corriente está bien conectado al router y al enchufe?",
            "Gracias por comprobar la conexión. Si no hay daños, humedad ni olor a quemado, prueba el enchufe con otro aparato, por ejemplo un cargador. ¿El enchufe funciona?",
            "Probemos si el equipo puede volver a encender: desconéctalo de la corriente durante un minuto y vuelve a conectarlo. ¿Encendió alguna luz?",
            "Gracias por realizar las comprobaciones; el equipo o su adaptador podrían necesitar revisión. ¿Deseas registrar un ticket para que soporte lo revise?",
        ],
        "diagnosis": {"code": "ROUTER_DANADO", "problem": "Router dañado", "cause": "El equipo no enciende aunque existe energía en el enchufe.", "priority": "ALTA", "ticket_required": True},
    },
    "router_restarts": {
        "intents": {"router_restarts", "modem_problemas"},
        "messages": [
            "Lamento el inconveniente; revisemos cómo se comporta el equipo. ¿Continúa funcionando o se apaga y causa cortes de internet?",
            "La ventilación puede ayudar a evitar el calentamiento. ¿Está ubicado en un lugar ventilado y sin objetos encima?",
            "Podemos comprobar si mejora al enfriarse: desconéctalo de la corriente durante algunos minutos y vuelve a encenderlo. ¿El equipo continúa calentándose o apagándose?",
            "Gracias por probarlo; como el problema continúa, conviene que soporte revise el equipo. ¿Deseas que registre un ticket?",
        ],
        "diagnosis": {"code": "CAMBIO_EQUIPO", "problem": "Cambio de equipo", "cause": "El router se sobrecalienta y se apaga.", "priority": "MEDIA", "ticket_required": True},
    },
    "wifi_weak": {
        "intents": {"wifi_weak"},
        "messages": [
            "Con gusto te ayudo a revisar el alcance de la señal. ¿El internet funciona correctamente cuando estás cerca del router?",
            "Gracias, revisemos si algún obstáculo reduce la señal. ¿El router está dentro de un mueble, detrás de objetos grandes o cerca del piso?",
            "Si puedes hacerlo sin estirar ni mover la fibra, coloca el equipo en un lugar abierto, un poco elevado y sin objetos alrededor. ¿Mejoró la conexión desde tu habitación?",
            "La distancia o las paredes pueden reducir la señal. Es posible que se necesite mejorar la cobertura. ¿Deseas registrar un ticket para evaluar tu instalación?",
        ],
        "diagnosis": {"code": "WIFI_COBERTURA", "problem": "Problema de cobertura WiFi", "cause": "La señal WiFi no cubre todas las habitaciones.", "priority": "BAJA", "ticket_required": True},
    },
    "fiber_cable_damage": {
        "intents": {"fiber_cable_damage"},
        "messages": [
            "Lamento el problema con el cable; te ayudaré a orientar la revisión sin manipularlo. ¿El cable delgado que llega al router quedó muy doblado, aplastado o cortado?",
            "Gracias por describirlo; para evitar más daños, no intentes repararlo ni moverlo porque es delicado. ¿En el router aparece una luz roja?",
            "Con lo que me indicas, conviene que un técnico revise el cable y confirme si necesita reemplazo. ¿Deseas que registre el ticket?",
        ],
        "diagnosis": {"code": "PERDIDA_SENAL_OPTICA", "problem": "Pérdida de señal", "cause": "Posible daño en el cable de fibra reportado por el cliente.", "priority": "ALTA", "ticket_required": True},
    },
    "single_device_issue": {
        "intents": {"single_device_issue"},
        "messages": [
            "Con gusto te ayudo a revisar ese dispositivo. ¿Los otros celulares o computadoras sí tienen internet?",
            "Probemos una reconexión sencilla: en el dispositivo afectado, apaga y vuelve a encender el WiFi. ¿Ahora puedes conectarte?",
            "Si conoces la contraseña, puedes olvidar la red y volver a conectarte para renovar la conexión. ¿Ya funciona?",
            "Me alegra que el dispositivo vuelva a conectarse.",
        ],
        "resolved": True,
        "diagnosis": {"code": "PROBLEMA_CONEXION", "problem": "Problema de conexión en un dispositivo", "cause": "El dispositivo no logra conectarse después de reconfigurar el WiFi.", "priority": "BAJA", "ticket_required": True},
    },
    "ethernet_problem": {
        "intents": {"ethernet_problem"},
        "messages": [
            "Te ayudaré a revisar la conexión por cable. ¿El internet funciona normalmente en tu celular mediante WiFi?",
            "Gracias; comprobemos si el cable de red hace buen contacto en la computadora y el equipo de internet. Sin tocar la fibra, vuelve a conectar ambos extremos del cable de red. ¿Ya lo comprobaste?",
            "Una salida distinta puede ayudarnos a identificar dónde está la falla. Si el equipo tiene otra salida de red disponible, conecta allí el cable de la computadora. ¿Ahora funciona?",
            "Para comprobar si falla el cable de la computadora, ¿tienes otro cable de red que puedas probar?",
            "Gracias por las comprobaciones; el cable, la conexión de la computadora o una salida del equipo podrían necesitar revisión. ¿Deseas registrar un ticket?",
        ],
        "diagnosis": {"code": "PROBLEMA_CONEXION", "problem": "Problema de conexión", "cause": "Falla en la conexión por cable de red.", "priority": "BAJA", "ticket_required": True},
    },
    "streaming": {
        "intents": {"streaming"},
        "messages": [
            "Entiendo que esa interrupción resulta incómoda; revisemos si afecta solo a esa aplicación. ¿Las otras aplicaciones o páginas funcionan normalmente?",
            "Gracias, comprobemos si la conexión está muy ocupada. ¿Hay otros dispositivos viendo videos, descargando archivos o usando juegos al mismo tiempo?",
            "Si usas WiFi, prueba la aplicación cerca del equipo; si usas cable, pausa por un momento otras descargas y vuelve a probar. ¿Sigue fallando?",
            "Probemos si un reinicio ayuda: desconecta el equipo de la corriente durante un minuto y espera hasta tres minutos después de conectarlo. ¿La aplicación sigue fallando?",
            "Gracias por realizar las pruebas; conviene revisar la conexión para identificar por qué la aplicación sigue fallando. ¿Deseas que genere un ticket?",
        ],
        "diagnosis": {"code": "INTERNET_LENTO", "problem": "Internet lento", "cause": "La conexión no mantiene una velocidad estable en videollamadas.", "priority": "MEDIA", "ticket_required": True},
    },
}


def find_guided_flow(intent):
    for name, flow in GUIDED_FLOWS.items():
        if intent in flow.get("intents", set()):
            return name, flow
    return None, None
