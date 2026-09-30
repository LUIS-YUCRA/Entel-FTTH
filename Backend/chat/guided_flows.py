"""Flujos naturales y progresivos para las fallas FTTH más frecuentes."""

GUIDED_FLOWS = {
    "sin_internet": {
        "intents": {"sin_internet"},
        "messages": [
            "Entiendo. Voy a ayudarte a revisar el problema. ¿En tu router aparece alguna luz roja?",
            "Gracias. Revisa con cuidado que el cable delgado conectado al router no esté doblado, suelto o cortado. ¿El cable se encuentra bien conectado?",
            "Desconecta el router de la corriente durante un minuto y luego vuelve a conectarlo. Espera unos minutos y dime si regresó el internet.",
            "La falla podría encontrarse fuera de tu domicilio y necesita revisión. ¿Deseas que registre un ticket para que un técnico revise tu servicio?",
        ],
        "diagnosis": {"code": "SIN_INTERNET", "problem": "Sin internet", "cause": "Posible pérdida de señal externa.", "priority": "ALTA", "ticket_required": True},
    },
    "internet_lento": {
        "intents": {"internet_lento", "velocidad_baja"},
        "messages": [
            "Te ayudaré a revisar la lentitud. ¿El problema ocurre en todos tus dispositivos o solamente en uno?",
            "¿Los dispositivos están conectados por WiFi o también probaste mediante cable?",
            "Acércate al router y prueba nuevamente. También desconecta por unos segundos los dispositivos que no estés usando. ¿La velocidad mejoró?",
            "Reinicia el router desconectándolo durante un minuto. Cuando vuelva a encender, revisa si las páginas cargan mejor.",
            "Será necesario revisar la señal y el equipo. ¿Deseas que registre un ticket?",
        ],
        "diagnosis": {"code": "INTERNET_LENTO", "problem": "Internet lento", "cause": "La conexión no mantiene la velocidad esperada.", "priority": "MEDIA", "ticket_required": True},
    },
    "internet_intermittent": {
        "intents": {"internet_intermittent", "cortes_internet"},
        "messages": [
            "Entiendo. ¿Esto sucede durante todo el día o solamente en determinados momentos?",
            "¿Cuando se corta el internet cambian o se apagan las luces del router?",
            "Verifica que el cable de corriente y los demás cables estén conectados firmemente. ¿Encontraste algún cable suelto?",
            "Reinicia el router y espera unos minutos. Luego dime si vuelve a desconectarse.",
            "La conexión necesita una revisión. ¿Quieres que genere un ticket para atención técnica?",
        ],
        "diagnosis": {"code": "PROBLEMA_CONEXION", "problem": "Problema de conexión", "cause": "Conexión intermitente.", "priority": "MEDIA", "ticket_required": True},
    },
    "router_power": {
        "intents": {"router_power", "router"},
        "messages": [
            "Revisemos primero la alimentación. ¿El cable de corriente está bien conectado al router y al enchufe?",
            "Prueba el enchufe conectando otro aparato, por ejemplo un cargador. ¿El enchufe funciona?",
            "Desconecta el router durante un minuto y vuelve a conectarlo. ¿Encendió alguna luz?",
            "Es posible que el router o su adaptador estén dañados. ¿Deseas registrar un ticket para revisar o reemplazar el equipo?",
        ],
        "diagnosis": {"code": "ROUTER_DANADO", "problem": "Router dañado", "cause": "El equipo no enciende aunque existe energía en el enchufe.", "priority": "ALTA", "ticket_required": True},
    },
    "router_restarts": {
        "intents": {"router_restarts", "modem_problemas"},
        "messages": [
            "Entiendo. ¿El equipo continúa funcionando o se apaga y causa cortes de internet?",
            "¿Está ubicado en un lugar ventilado y sin objetos encima?",
            "Desconéctalo durante algunos minutos y vuelve a encenderlo. ¿El equipo continúa calentándose o apagándose?",
            "El equipo necesita una revisión y posiblemente un reemplazo. ¿Deseas que registre un ticket?",
        ],
        "diagnosis": {"code": "CAMBIO_EQUIPO", "problem": "Cambio de equipo", "cause": "El router se sobrecalienta y se apaga.", "priority": "MEDIA", "ticket_required": True},
    },
    "wifi_weak": {
        "intents": {"wifi_weak"},
        "messages": [
            "Te ayudaré a revisar la cobertura. ¿El internet funciona correctamente cuando estás cerca del router?",
            "¿El router está dentro de un mueble, detrás de objetos grandes o cerca del piso?",
            "Colócalo en un lugar abierto, un poco elevado y sin objetos alrededor. Luego prueba nuevamente desde tu habitación.",
            "La distancia o las paredes pueden reducir la señal. Es posible que se necesite mejorar la cobertura. ¿Deseas registrar un ticket para evaluar tu instalación?",
        ],
        "diagnosis": {"code": "WIFI_COBERTURA", "problem": "Problema de cobertura WiFi", "cause": "La señal WiFi no cubre todas las habitaciones.", "priority": "BAJA", "ticket_required": True},
    },
    "fiber_cable_damage": {
        "intents": {"fiber_cable_damage"},
        "messages": [
            "Entiendo. ¿El cable delgado que llega al router quedó muy doblado, aplastado o cortado?",
            "No intentes repararlo ni moverlo demasiado porque es delicado. ¿En el router aparece una luz roja?",
            "El cable necesita ser revisado o reemplazado por un técnico. ¿Deseas que registre el ticket?",
        ],
        "diagnosis": {"code": "PERDIDA_SENAL_OPTICA", "problem": "Pérdida de señal", "cause": "El cable de fibra está dañado.", "priority": "ALTA", "ticket_required": True},
    },
    "single_device_issue": {
        "intents": {"single_device_issue"},
        "messages": [
            "Verifiquemos si el problema está en el celular o en el servicio. ¿Otros celulares o computadoras sí tienen internet?",
            "En tu celular, apaga y vuelve a encender el WiFi. Después selecciona nuevamente tu red.",
            "Selecciona la red, elige “Olvidar red” y vuelve a ingresar la contraseña cuidadosamente. ¿Ahora se conectó?",
            "Excelente. El problema se solucionó en el celular y no es necesario generar un ticket.",
        ],
        "resolved": True,
        "diagnosis": {"code": "PROBLEMA_CONEXION", "problem": "Problema de conexión en un dispositivo", "cause": "El dispositivo no logra conectarse después de reconfigurar el WiFi.", "priority": "BAJA", "ticket_required": True},
    },
    "ethernet_problem": {
        "intents": {"ethernet_problem"},
        "messages": [
            "¿El internet funciona normalmente en tu celular mediante WiFi?",
            "Revisa que el cable de la computadora esté conectado firmemente en ambos extremos. ¿Puedes desconectarlo y volverlo a conectar?",
            "Si el router tiene otro espacio disponible para el cable, conéctalo allí y prueba nuevamente.",
            "¿Tienes otro cable que puedas probar?",
            "El cable, la conexión de la computadora o una salida del router podrían necesitar revisión. ¿Deseas registrar un ticket?",
        ],
        "diagnosis": {"code": "PROBLEMA_CONEXION", "problem": "Problema de conexión", "cause": "Falla en la conexión por cable de red.", "priority": "BAJA", "ticket_required": True},
    },
    "streaming": {
        "intents": {"streaming"},
        "messages": [
            "Entiendo. ¿También sucede cuando haces una videollamada desde otro dispositivo?",
            "¿Hay otros dispositivos viendo videos, descargando archivos o usando juegos al mismo tiempo?",
            "Acércate al router e intenta nuevamente la videollamada. ¿Sigue congelándose?",
            "Reinicia el router durante un minuto y realiza una última prueba.",
            "La conexión necesita una revisión para determinar por qué no mantiene una velocidad estable. ¿Deseas que genere un ticket?",
        ],
        "diagnosis": {"code": "INTERNET_LENTO", "problem": "Internet lento", "cause": "La conexión no mantiene una velocidad estable en videollamadas.", "priority": "MEDIA", "ticket_required": True},
    },
}


def find_guided_flow(intent):
    for name, flow in GUIDED_FLOWS.items():
        if intent in flow.get("intents", set()):
            return name, flow
    return None, None
