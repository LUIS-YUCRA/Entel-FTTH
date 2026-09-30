"""
=========================================================
DEVICE_RULES.PY
Reglas de diagnóstico para equipos FTTH
Router / ONT
Sistema FTTH - ENTEL
=========================================================
"""
DEVICE_RULES = [
    {
        "code": "ROUTER_OFF",
        "conditions": {
            "device": "router",
            "power": "apagado"
        },
        "problem": "Router apagado",
        "cause": "El equipo no tiene alimentación o fue apagado.",
        "priority": "media",
        "confidence": 0.95,
        "ticket_required": False
    },
    {
        "code": "ONT_OFF",
        "conditions": {
            "device": "ont",
            "power": "apagado"
        },
        "problem": "ONT apagada",
        "cause": "La terminal óptica no recibe energía.",
        "priority": "alta",
        "confidence": 0.96,
        "ticket_required": False
    },
    {
        "code": "DEVICE_NOT_RESPONDING",
        "conditions": {
            "keyword": "no responde"
        },
        "problem": "Equipo sin respuesta",
        "cause": "El router u ONT no responde correctamente.",
        "priority": "alta",
        "confidence": 0.90,
        "ticket_required": True
    },
    {
        "code": "ROUTER_RESTART",
        "conditions": {
            "keyword": "se reinicia"
        },
        "problem": "Reinicio constante del router",
        "cause": "Puede existir falla eléctrica o del equipo.",
        "priority": "media",
        "confidence": 0.92,
        "ticket_required": False
    },
    {
        "code": "ONT_RESTART",
        "conditions": {
            "keyword": "ont reinicia"
        },
        "problem": "Reinicio constante de ONT",
        "cause": "Problema de alimentación o hardware.",
        "priority": "alta",
        "confidence": 0.90,
        "ticket_required": True
    },
    {
        "code": "DEVICE_LOCKED",
        "conditions": {
            "keyword": "bloqueado"
        },
        "problem": "Equipo bloqueado",
        "cause": "El dispositivo dejó de responder por software.",
        "priority": "media",
        "confidence": 0.85,
        "ticket_required": False
    },
    {
        "code": "DEVICE_OVERHEAT",
        "conditions": {
            "keyword": "caliente"
        },
        "problem": "Sobrecalentamiento del equipo",
        "cause": "El equipo presenta temperatura elevada.",
        "priority": "media",
        "confidence": 0.88,
        "ticket_required": False
    },
    {
        "code": "POWER_ADAPTER_FAILURE",
        "conditions": {
            "keyword": "cargador"
        },
        "problem": "Falla del adaptador eléctrico",
        "cause": "La fuente de alimentación puede estar dañada.",
        "priority": "media",
        "confidence": 0.87,
        "ticket_required": True
    },
    {
        "code": "LAN_PORT_FAILURE",
        "conditions": {
            "keyword": "puerto lan"
        },
        "problem": "Puerto LAN defectuoso",
        "cause": "El puerto Ethernet presenta problemas.",
        "priority": "media",
        "confidence": 0.85,
        "ticket_required": True
    },
    {
        "code": "DEVICE_CONFIGURATION",
        "conditions": {
            "keyword": "configuracion router"
        },
        "problem": "Configuración incorrecta del equipo",
        "cause": "Parámetros internos incorrectos.",
        "priority": "media",
        "confidence": 0.86,
        "ticket_required": False
    },
    {
        "code": "FIRMWARE_FAILURE",
        "conditions": {
            "keyword": "actualizacion"
        },
        "problem": "Problema de firmware",
        "cause": "El software interno del equipo presenta errores.",
        "priority": "media",
        "confidence": 0.80,
        "ticket_required": True
    },
    {
        "code": "OLD_DEVICE",
        "conditions": {
            "keyword": "router antiguo"
        },
        "problem": "Equipo antiguo",
        "cause": "El hardware puede limitar el servicio.",
        "priority": "baja",
        "confidence": 0.82,
        "ticket_required": False
    },
    {
        "code": "DEVICE_RESET_REQUIRED",
        "conditions": {
            "keyword": "reset"
        },
        "problem": "Reinicio de fábrica requerido",
        "cause": "Configuración dañada del equipo.",
        "priority": "media",
        "confidence": 0.84,
        "ticket_required": False
    },
    {
        "code": "DEVICE_SIGNAL_FAILURE",
        "conditions": {
            "keyword": "sin señal router"
        },
        "problem": "Falla del equipo de acceso",
        "cause": "El router no recibe correctamente la conexión.",
        "priority": "alta",
        "confidence": 0.88,
        "ticket_required": True
    },
    {
        "code": "GENERAL_DEVICE_FAILURE",
        "conditions": {
            "keyword": "equipo dañado"
        },
        "problem": "Falla general del equipo",
        "cause": "El dispositivo requiere revisión técnica.",
        "priority": "alta",
        "confidence": 0.85,
        "ticket_required": True
    }
]
