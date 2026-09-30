"""
=========================================================
INTENT_EXAMPLES.PY
Ejemplos de entrenamiento para el asistente FTTH
=========================================================
"""
INTENTS = {
    # ----------------------------
    # SALUDOS
    # ----------------------------
    "saludo": [
        "hola",
        "hola buenos dias",
        "buenos dias",
        "buenas tardes",
        "buenas noches",
        "que tal",
        "como estas",
        "necesito ayuda",
        "quisiera ayuda",
        "hola asistente"
    ],
    # ----------------------------
    # DESPEDIDA
    # ----------------------------
    "despedida": [
        "adios",
        "hasta luego",
        "nos vemos",
        "gracias adios",
        "hasta pronto"
    ],
    # ----------------------------
    # AGRADECIMIENTO
    # ----------------------------
    "agradecimiento": [
        "gracias",
        "muchas gracias",
        "te agradezco",
        "muy amable",
        "perfecto gracias"
    ],
    # ----------------------------
    # SIN INTERNET
    # ----------------------------
    "sin_internet": [
        "no tengo internet",
        "no funciona internet",
        "no hay internet",
        "me quede sin internet",
        "no puedo navegar",
        "internet caido",
        "no carga ninguna pagina",
        "sin conexion",
        "no tengo servicio",
        "no puedo conectarme"
    ],
    # ----------------------------
    # INTERNET LENTO
    # ----------------------------
    "internet_lento": [
        "internet lento",
        "mi internet esta lento",
        "la conexion esta lenta",
        "descarga muy lenta",
        "el internet esta muy lento",
        "las paginas tardan mucho",
        "el internet se congela",
        "la velocidad es baja"
    ],
    # ----------------------------
    # WIFI
    # ----------------------------
    "problema_wifi": [
        "no conecta wifi",
        "wifi lento",
        "el wifi falla",
        "wifi sin internet",
        "no aparece el wifi",
        "problemas con wifi",
        "mi celular no conecta al wifi",
        "wifi desconectado"
    ],
    # ----------------------------
    # ROUTER
    # ----------------------------
    "router": [
        "router apagado",
        "modem apagado",
        "el router no prende",
        "el modem no funciona",
        "problema con router",
        "router reiniciando",
        "router dañado",
        "router parpadeando",
        "router no conecta",
        "modem no enciende"
    ],
    # ----------------------------
    # LUZ LOS
    # ----------------------------
    "los_rojo": [
        "la luz los esta roja",
        "los rojo",
        "indicador los rojo",
        "la luz roja del router",
        "parpadea la luz los"
    ],
    # ----------------------------
    # CAMBIO WIFI
    # ----------------------------
    "cambiar_wifi": [
        "quiero cambiar mi contraseña",
        "cambiar contraseña wifi",
        "como cambio el nombre del wifi",
        "cambiar nombre del wifi",
        "quiero cambiar el wifi"
    ],
    # ----------------------------
    # HABLAR OPERADOR
    # ----------------------------
    "hablar_operador": [
        "quiero hablar con un operador",
        "necesito un tecnico",
        "quiero soporte tecnico",
        "comunicarme con soporte",
        "quiero reportar un problema"
    ],
    # ----------------------------
    # CONTRASEÑA WIFI (NUEVA)
    # ----------------------------
    "wifi_password": [
        "no recuerdo mi contraseña",
        "cómo encuentro la contraseña del wifi",
        "contraseña de mi red",
        "perdí la contraseña del módem",
        "cómo ver la clave del wifi",
        "no sé la contraseña del internet"
    ],
    # ----------------------------
    # STREAMING / VIDEOS (NUEVA)
    # ----------------------------
    "streaming": [
        "netflix se traba",
        "los videos no cargan",
        "youtube se pausa",
        "no puedo ver series",
        "streaming lento",
        "se corta el video"
    ],
    # ----------------------------
    # CONSULTA GENERAL (NUEVA)
    # ----------------------------
    "consulta_general": [
        "qué significa la luz",
        "cómo funciona el servicio",
        "para qué sirve el módem",
        "qué es FTTH",
        "diferencia entre fibra y cobre",
        "velocidad contratada",
        "precios de internet"
    ],
    # ----------------------------
    # ESTADO DE RECLAMO (NUEVA)
    # ----------------------------
    "estado_reclamo": [
        "mi ticket",
        "estado de mi reclamo",
        "saber mi ticket",
        "cómo va mi reclamo",
        "número de ticket",
        "consultar mi reclamo"
    ],
    # ----------------------------
    # TIEMPO DEL TÉCNICO (NUEVA)
    # ----------------------------
    "tiempo_tecnico": [
        "cuándo viene el técnico",
        "hora de llegada técnico",
        "demora del técnico",
        "técnico no llega",
        "visita técnica demorada"
    ],
    # ----------------------------
    # CORTES DE INTERNET (NUEVA)
    # ----------------------------
    "cortes_internet": [
        "se corta el internet",
        "el internet se va y vuelve",
        "cortes frecuentes",
        "la conexion es inestable",
        "se desconecta solo",
        "parpadea la conexion"
    ],
    # ----------------------------
    # PROBLEMAS DE VELOCIDAD (NUEVA)
    # ----------------------------
    "velocidad_baja": [
        "no llega la velocidad",
        "velocidad contratada no llega",
        "menos velocidad de la que pago",
        "la velocidad es menor",
        "no tengo la velocidad completa"
    ],
    # ----------------------------
    # MODEM PROBLEMAS (NUEVA)
    # ----------------------------
    "modem_problemas": [
        "el modem hace ruido",
        "el modem está caliente",
        "modem sobrecalentado",
        "modem se reinicia solo",
        "el modem se apaga solo"
    ],
    # ----------------------------
    # INSTALACION FTTH (NUEVA)
    # ----------------------------
    "instalacion_ftth": [
        "quiero contratar FTTH",
        "instalacion de fibra",
        "como instalar FTTH",
        "quiero fibra optica",
        "instalacion de internet"
    ],
    # ----------------------------
    # FACTURACION (NUEVA)
    # ----------------------------
    "facturacion": [
        "mi factura",
        "costo del servicio",
        "precio de internet",
        "cuanto debo pagar",
        "pago de internet"
    ]
}

# Ampliación con lenguaje cotidiano, expresiones móviles y fallas externas.
from knowledge_base import KNOWLEDGE_INTENT_EXAMPLES

INTENTS.update(KNOWLEDGE_INTENT_EXAMPLES)
