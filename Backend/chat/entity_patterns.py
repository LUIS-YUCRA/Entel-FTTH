"""
=========================================================
ENTITY_PATTERNS.PY
Patrones de entidades para el asistente FTTH
Sistema FTTH - ENTEL
=========================================================
"""
# =========================================================
# DISPOSITIVOS
# =========================================================
DEVICES = {
    "router": [
        "router",
        "modem",
        "módem",
        "equipo",
        "dispositivo",
        "aparato"
    ],
    "ont": [
        "ont",
        "onu",
        "terminal",
        "equipo ont",
        "equipo onu"
    ]
}
# =========================================================
# INDICADORES LUMINOSOS
# =========================================================
INDICATORS = {
    "los": [
        "los",
        "luz los",
        "led los"
    ],
    "pon": [
        "pon",
        "luz pon",
        "led pon"
    ],
    "power": [
        "power",
        "energia",
        "energía",
        "luz power",
        "led power"
    ],
    "wifi": [
        "wifi",
        "wi-fi",
        "wlan",
        "luz wifi",
        "led wifi"
    ],
    "internet_led": [
        "luz internet",
        "led internet"
    ]
}
# =========================================================
# ESTADOS Y COLORES
# =========================================================
COLORS = {
    "rojo": [
        "rojo",
        "roja"
    ],
    "verde": [
        "verde"
    ],
    "apagado": [
        "apagado",
        "apagada",
        "sin luz",
        "no prende",
        "no enciende"
    ],
    "encendido": [
        "encendido",
        "encendida",
        "prendido",
        "prendida"
    ],
    "parpadeando": [
        "parpadeando",
        "parpadea",
        "intermitente",
        "titilando",
        "parpadeando lentamente",
        "parpadeando rápido"
    ]
}
# =========================================================
# PROBLEMAS
# =========================================================
PROBLEMS = {
    "sin_internet": [
        "sin internet",
        "no tengo internet",
        "internet caido",
        "internet caído",
        "sin conexion",
        "sin conexión",
        "no puedo navegar",
        "no funciona internet",
        "no carga internet",
        "no hay internet"
    ],
    "internet_lento": [
        "internet lento",
        "conexion lenta",
        "conexión lenta",
        "muy lento",
        "internet muy lento",
        "navega lento",
        "todo carga lento"
    ],
    "problema_wifi": [
        "wifi",
        "wi-fi",
        "no conecta wifi",
        "problema wifi",
        "no aparece wifi",
        "no puedo conectar al wifi"
    ],
    "router": [
        "router dañado",
        "router mal",
        "router no prende",
        "router apagado"
    ]
}
# =========================================================
# EXPRESIONES DE TIEMPO
# =========================================================
TIME_EXPRESSIONS = [
    "hoy",
    "ayer",
    "anoche",
    "esta mañana",
    "esta tarde",
    "esta noche",
    "desde ayer",
    "desde hoy",
    "desde anoche",
    "hace una hora",
    "hace dos horas",
    "hace tres horas",
    "hace varios dias",
    "hace varios días",
    "desde hace una hora",
    "desde hace dos horas"
]
