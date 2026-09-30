"""
=========================================================
SPEED_RULES.PY
Reglas de diagnóstico para problemas
de velocidad FTTH
Sistema FTTH - ENTEL
=========================================================
"""
SPEED_RULES = [
    {
        "code": "LOW_SPEED",
        "conditions": {
            "intent": "internet_lento"
        },
        "problem": "Velocidad de internet reducida",
        "cause": "La conexión presenta menor velocidad de la esperada.",
        "priority": "media",
        "confidence": 0.95,
        "ticket_required": False
    },
    {
        "code": "HIGH_LATENCY",
        "conditions": {
            "keyword": "latencia"
        },
        "problem": "Alta latencia en la conexión",
        "cause": "Existe retraso en la comunicación de datos.",
        "priority": "media",
        "confidence": 0.90,
        "ticket_required": False
    },
    {
        "code": "PACKET_LOSS",
        "conditions": {
            "keyword": "perdida paquetes"
        },
        "problem": "Pérdida de paquetes",
        "cause": "La comunicación presenta interrupciones en la transmisión.",
        "priority": "alta",
        "confidence": 0.92,
        "ticket_required": True
    },
    {
        "code": "NETWORK_CONGESTION",
        "conditions": {
            "keyword": "muchos usuarios"
        },
        "problem": "Congestión de red",
        "cause": "Saturación temporal del servicio.",
        "priority": "media",
        "confidence": 0.85,
        "ticket_required": False
    },
    {
        "code": "BANDWIDTH_LIMIT",
        "conditions": {
            "keyword": "velocidad contratada"
        },
        "problem": "Limitación de ancho de banda",
        "cause": "La velocidad puede estar limitada por el plan contratado.",
        "priority": "media",
        "confidence": 0.88,
        "ticket_required": False
    },
    {
        "code": "SPEED_TEST_REQUIRED",
        "conditions": {
            "keyword": "test velocidad"
        },
        "problem": "Se requiere prueba de velocidad",
        "cause": "Es necesario comparar velocidad contratada y recibida.",
        "priority": "baja",
        "confidence": 0.90,
        "ticket_required": False
    },
    {
        "code": "SLOW_BROWSING",
        "conditions": {
            "keyword": "navegacion lenta"
        },
        "problem": "Navegación lenta",
        "cause": "Puede existir problema de red o DNS.",
        "priority": "media",
        "confidence": 0.87,
        "ticket_required": False
    },
    {
        "code": "DNS_FAILURE",
        "conditions": {
            "keyword": "no abre paginas"
        },
        "problem": "Problema DNS",
        "cause": "El equipo no resuelve correctamente dominios.",
        "priority": "media",
        "confidence": 0.86,
        "ticket_required": False
    },
    {
        "code": "VIDEO_BUFFERING",
        "conditions": {
            "keyword": "videos lentos"
        },
        "problem": "Problemas de streaming",
        "cause": "La velocidad disponible no permite reproducción estable.",
        "priority": "media",
        "confidence": 0.85,
        "ticket_required": False
    },
    {
        "code": "UPLOAD_LOW",
        "conditions": {
            "keyword": "subida lenta"
        },
        "problem": "Baja velocidad de subida",
        "cause": "Problema relacionado con capacidad upstream.",
        "priority": "media",
        "confidence": 0.85,
        "ticket_required": False
    },
    {
        "code": "DOWNLOAD_LOW",
        "conditions": {
            "keyword": "descarga lenta"
        },
        "problem": "Baja velocidad de descarga",
        "cause": "Problema relacionado con capacidad downstream.",
        "priority": "media",
        "confidence": 0.88,
        "ticket_required": False
    },
    {
        "code": "PEAK_HOUR_CONGESTION",
        "conditions": {
            "keyword": "noche"
        },
        "problem": "Congestión en horario pico",
        "cause": "Alta demanda de usuarios.",
        "priority": "media",
        "confidence": 0.82,
        "ticket_required": False
    },
    {
        "code": "MULTI_DEVICE_LIMIT",
        "conditions": {
            "keyword": "muchos dispositivos"
        },
        "problem": "Exceso de dispositivos conectados",
        "cause": "El ancho de banda se distribuye entre varios equipos.",
        "priority": "media",
        "confidence": 0.90,
        "ticket_required": False
    },
    {
        "code": "SPEED_CONFIGURATION",
        "conditions": {
            "keyword": "configuracion"
        },
        "problem": "Configuración incorrecta de red",
        "cause": "Parámetros del equipo pueden estar afectados.",
        "priority": "media",
        "confidence": 0.84,
        "ticket_required": False
    },
    {
        "code": "GENERAL_SPEED_FAILURE",
        "conditions": {
            "keyword": "internet lento"
        },
        "problem": "Falla general de velocidad",
        "cause": "La conexión presenta degradación.",
        "priority": "media",
        "confidence": 0.80,
        "ticket_required": False
    }
]
