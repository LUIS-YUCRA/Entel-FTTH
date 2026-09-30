"""
=========================================================
FIBER_RULES.PY
Reglas de diagnóstico para fallas físicas
de fibra óptica FTTH
Sistema FTTH - ENTEL
=========================================================
"""
FIBER_RULES = [
    {
        "code": "FIBER_CUT",
        "conditions": {
            "keyword": "fibra cortada"
        },
        "problem": "Fibra óptica cortada",
        "cause": "El cable de fibra presenta una interrupción física.",
        "priority": "alta",
        "confidence": 0.98,
        "ticket_required": True
    },
    {
        "code": "FIBER_BEND",
        "conditions": {
            "keyword": "fibra doblada"
        },
        "problem": "Fibra óptica doblada",
        "cause": "La curvatura excesiva afecta la transmisión óptica.",
        "priority": "media",
        "confidence": 0.90,
        "ticket_required": False
    },
    {
        "code": "FIBER_DAMAGE",
        "conditions": {
            "keyword": "fibra dañada"
        },
        "problem": "Daño físico en fibra óptica",
        "cause": "El cable presenta deterioro físico.",
        "priority": "alta",
        "confidence": 0.95,
        "ticket_required": True
    },
    {
        "code": "FIBER_DISCONNECTED",
        "conditions": {
            "keyword": "fibra desconectada"
        },
        "problem": "Fibra óptica desconectada",
        "cause": "La conexión entre la ONT y la red óptica está interrumpida.",
        "priority": "alta",
        "confidence": 0.96,
        "ticket_required": True
    },
    {
        "code": "FIBER_CONNECTOR_LOOSE",
        "conditions": {
            "keyword": "conector flojo"
        },
        "problem": "Conector óptico flojo",
        "cause": "El conector no está correctamente ajustado.",
        "priority": "media",
        "confidence": 0.88,
        "ticket_required": False
    },
    {
        "code": "FIBER_CONNECTOR_DIRTY",
        "conditions": {
            "keyword": "conector sucio"
        },
        "problem": "Conector óptico contaminado",
        "cause": "La suciedad afecta la potencia óptica.",
        "priority": "media",
        "confidence": 0.90,
        "ticket_required": False
    },
    {
        "code": "OPTICAL_SOCKET_DAMAGE",
        "conditions": {
            "keyword": "roseta dañada"
        },
        "problem": "Roseta óptica dañada",
        "cause": "El punto terminal de fibra presenta daño.",
        "priority": "alta",
        "confidence": 0.93,
        "ticket_required": True
    },
    {
        "code": "DROP_CABLE_FAILURE",
        "conditions": {
            "keyword": "cable exterior"
        },
        "problem": "Falla en cable drop",
        "cause": "El tramo de fibra hacia el domicilio presenta problemas.",
        "priority": "alta",
        "confidence": 0.92,
        "ticket_required": True
    },
    {
        "code": "HOME_INSTALLATION_DAMAGE",
        "conditions": {
            "keyword": "instalacion dañada"
        },
        "problem": "Daño en instalación domiciliaria",
        "cause": "La infraestructura interna requiere revisión.",
        "priority": "media",
        "confidence": 0.85,
        "ticket_required": True
    },
    {
        "code": "FIBER_LOW_SIGNAL",
        "conditions": {
            "keyword": "señal baja"
        },
        "problem": "Baja potencia óptica",
        "cause": "La señal recibida por la ONT es insuficiente.",
        "priority": "alta",
        "confidence": 0.94,
        "ticket_required": True
    },
    {
        "code": "FIBER_ATTENUATION",
        "conditions": {
            "keyword": "atenuacion"
        },
        "problem": "Atenuación óptica elevada",
        "cause": "Existe pérdida de potencia en el enlace.",
        "priority": "alta",
        "confidence": 0.91,
        "ticket_required": True
    },
    {
        "code": "OUTSIDE_PLANT_FAILURE",
        "conditions": {
            "keyword": "poste fibra"
        },
        "problem": "Falla en planta externa",
        "cause": "Existe posible problema en infraestructura externa.",
        "priority": "alta",
        "confidence": 0.89,
        "ticket_required": True
    },
    {
        "code": "FIBER_MAINTENANCE_REQUIRED",
        "conditions": {
            "keyword": "requiere mantenimiento"
        },
        "problem": "Mantenimiento de fibra requerido",
        "cause": "La instalación necesita revisión técnica.",
        "priority": "media",
        "confidence": 0.87,
        "ticket_required": True
    },
    {
        "code": "FIBER_VISUAL_CHECK",
        "conditions": {
            "keyword": "revisar cable"
        },
        "problem": "Inspección visual de fibra",
        "cause": "Se requiere verificar estado físico del cable.",
        "priority": "baja",
        "confidence": 0.80,
        "ticket_required": False
    },
    {
        "code": "GENERAL_FIBER_FAILURE",
        "conditions": {
            "keyword": "problema fibra"
        },
        "problem": "Falla general de fibra óptica",
        "cause": "La conexión física presenta anomalías.",
        "priority": "alta",
        "confidence": 0.85,
        "ticket_required": True
    }
]
