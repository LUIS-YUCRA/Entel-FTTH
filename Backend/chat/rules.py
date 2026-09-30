"""
=========================================================
RULES.PY
Cargador central de reglas FTTH
Une todos los módulos de diagnóstico:
- Señal óptica
- Energía
- WiFi
- Velocidad
- Equipos
- Fibra óptica
- Nuevas reglas de configuración
Sistema FTTH - ENTEL
=========================================================
"""
# =====================================================
# Importar módulos de reglas
# =====================================================
from rules_signal import SIGNAL_RULES
from rules_power import POWER_RULES
from wifi_rules import WIFI_RULES
from speed_rules import SPEED_RULES
from device_rules import DEVICE_RULES
from fiber_rules import FIBER_RULES

# =====================================================
# Reglas generales (NUEVAS - para cubrir casos sin detalles)
# =====================================================
GENERAL_RULES = [
    {
        "code": "NO_INTERNET_GENERAL",
        "conditions": {
            "intent": "sin_internet",
            "problem": "sin_internet"
        },
        "problem": "Tu servicio de internet no está funcionando correctamente.",
        "cause": "Puede ser un problema de conexión, configuración o señal.",
        "priority": "alta",
        "confidence": 0.85,
        "ticket_required": True,
        "category": "general",
        "steps": [
            "1️⃣ Reinicia tu módem desconectándolo de la corriente por 30 segundos.",
            "2️⃣ Vuelve a conectarlo y espera 2 minutos.",
            "3️⃣ Verifica que todos los cables estén bien conectados.",
            "4️⃣ Revisa si la luz LOS o PON de tu módem está en rojo o apagada.",
            "5️⃣ Si después de estos pasos el internet no funciona, te ayudaré con el siguiente paso."
        ],
        "final_message": "Si después de reiniciar el módem y verificar los cables el internet no funciona, necesitaré más información sobre las luces de tu módem para ayudarte mejor."
    },
    {
        "code": "INTERNET_LENTO_GENERAL",
        "conditions": {
            "intent": "internet_lento"
        },
        "problem": "Tu servicio de internet está funcionando con velocidad reducida.",
        "cause": "Puede ser por saturación de dispositivos, interferencia WiFi o problemas de configuración.",
        "priority": "media",
        "confidence": 0.85,
        "ticket_required": False,
        "category": "general",
        "steps": [
            "1️⃣ Reinicia tu módem desconectándolo por 30 segundos.",
            "2️⃣ Desconecta dispositivos que no estés usando (celulares, tablets, etc.).",
            "3️⃣ Realiza una prueba de velocidad en speedtest.net.",
            "4️⃣ Si usas WiFi, prueba conectarte por cable LAN para descartar interferencia."
        ],
        "final_message": "Si después de estos pasos la velocidad sigue baja, generaré un ticket para revisión técnica."
    },
    {
        "code": "WIFI_PASSWORD_GENERAL",
        "conditions": {
            "intent": "wifi_password"
        },
        "problem": "Recuperación de contraseña WiFi.",
        "cause": "El cliente no recuerda la contraseña de su red WiFi.",
        "priority": "baja",
        "confidence": 0.90,
        "ticket_required": False,
        "category": "general",
        "steps": [
            "1️⃣ Ubica tu módem y revisa la etiqueta en la parte inferior o trasera.",
            "2️⃣ La contraseña suele estar escrita como 'Clave WPA' o 'Contraseña'.",
            "3️⃣ Si no la encuentras, puedes restablecer la configuración de fábrica.",
            "4️⃣ Presiona el botón reset del módem por 10 segundos (se reiniciará).",
            "5️⃣ La contraseña volverá a la que viene por defecto en la etiqueta."
        ],
        "final_message": "Si no puedes encontrar la contraseña o necesitas ayuda para restablecerla, avísame y te guiaré paso a paso."
    },
    {
        "code": "HABLAR_OPERADOR_GENERAL",
        "conditions": {
            "intent": "hablar_operador"
        },
        "problem": "El cliente solicita atención de un operador o técnico.",
        "cause": "El cliente necesita asistencia personalizada.",
        "priority": "media",
        "confidence": 0.90,
        "ticket_required": True,
        "category": "general",
        "steps": [
            "1️⃣ Un operador se contactará contigo en las próximas horas.",
            "2️⃣ Por favor, ten a mano tu número de contrato.",
            "3️⃣ Si es urgente, puedes llamar al número de atención de ENTEL."
        ],
        "final_message": "He registrado tu solicitud. Un operador se comunicará contigo para brindarte la asistencia necesaria."
    },
    {
        "code": "ESTADO_RECLAMO_GENERAL",
        "conditions": {
            "intent": "estado_reclamo"
        },
        "problem": "Consulta de estado de reclamo.",
        "cause": "El cliente quiere saber el estado de su ticket de atención.",
        "priority": "media",
        "confidence": 0.90,
        "ticket_required": False,
        "category": "general",
        "steps": [
            "1️⃣ Proporciona el número de ticket que se te entregó.",
            "2️⃣ Si no lo tienes, ingresa tu número de contrato y lo buscaremos.",
            "3️⃣ Te informaremos si está: Pendiente, En proceso, Resuelto, Cerrado.",
            "4️⃣ Si hay demora, podemos escalar tu caso a prioridad alta."
        ],
        "final_message": "¿Tienes tu número de ticket a mano? Con él puedo consultar el estado exacto de tu reclamo."
    },
    {
        "code": "TIEMPO_TECNICO_GENERAL",
        "conditions": {
            "intent": "tiempo_tecnico"
        },
        "problem": "Consulta de tiempo de llegada del técnico.",
        "cause": "El cliente quiere saber cuándo llegará el técnico a su domicilio.",
        "priority": "media",
        "confidence": 0.90,
        "ticket_required": False,
        "category": "general",
        "steps": [
            "1️⃣ El técnico tiene un horario estimado de llegada de 2 a 4 horas.",
            "2️⃣ Recibirás una notificación cuando el técnico esté en camino.",
            "3️⃣ Puedes consultar el estado de tu ticket en el sistema de seguimiento."
        ],
        "final_message": "¿Tienes tu número de ticket? Con él puedo darte información más precisa sobre el estado de tu visita técnica."
    },
    {
        "code": "STREAMING_GENERAL",
        "conditions": {
            "intent": "streaming"
        },
        "problem": "Problemas de reproducción de video o streaming.",
        "cause": "Ancho de banda insuficiente o muchas conexiones activas.",
        "priority": "media",
        "confidence": 0.85,
        "ticket_required": False,
        "category": "general",
        "steps": [
            "1️⃣ Desconecta otros dispositivos que estén usando internet.",
            "2️⃣ Reduce la calidad de video en la plataforma de streaming.",
            "3️⃣ Conecta el dispositivo por cable LAN en lugar de WiFi.",
            "4️⃣ Realiza una prueba de velocidad en speedtest.net.",
            "5️⃣ Si persiste, reinicia el módem por 30 segundos."
        ],
        "final_message": "Si después de estos pasos el streaming sigue con problemas, generaré un ticket para revisión técnica."
    },
    {
        "code": "CONSULTA_GENERAL",
        "conditions": {
            "intent": "consulta_general"
        },
        "problem": "Consulta general sobre el servicio FTTH.",
        "cause": "El cliente necesita información sobre el funcionamiento del servicio.",
        "priority": "baja",
        "confidence": 0.85,
        "ticket_required": False,
        "category": "general",
        "steps": [
            "1️⃣ FTTH significa Fibra hasta el Hogar (Fiber To The Home).",
            "2️⃣ Es un servicio de internet de alta velocidad que usa fibra óptica.",
            "3️⃣ La fibra óptica ofrece mayor velocidad y estabilidad que el cobre.",
            "4️⃣ La velocidad contratada se mide en Mbps (megabits por segundo)."
        ],
        "final_message": "¿Tienes alguna otra pregunta sobre el servicio FTTH? Estoy aquí para ayudarte."
    },
    {
        "code": "MODEM_PROBLEMAS_GENERAL",
        "conditions": {
            "intent": "modem_problemas"
        },
        "problem": "Problemas físicos con el módem.",
        "cause": "El módem presenta temperatura alta, ruido o reinicios.",
        "priority": "media",
        "confidence": 0.85,
        "ticket_required": False,
        "category": "general",
        "steps": [
            "1️⃣ Verifica que el módem esté en un lugar ventilado.",
            "2️⃣ Asegúrate de que no tenga objetos encima.",
            "3️⃣ Si está muy caliente, apágalo y espera 10 minutos.",
            "4️⃣ Si el módem se reinicia solo, puede ser falla eléctrica."
        ],
        "final_message": "Si el módem sigue con problemas, generaré un ticket para revisión del equipo."
    },
    {
        "code": "INSTALACION_FTTH_GENERAL",
        "conditions": {
            "intent": "instalacion_ftth"
        },
        "problem": "Consulta sobre instalación de FTTH.",
        "cause": "El cliente quiere contratar o saber sobre la instalación.",
        "priority": "baja",
        "confidence": 0.85,
        "ticket_required": False,
        "category": "general",
        "steps": [
            "1️⃣ La instalación de FTTH es realizada por técnicos especializados.",
            "2️⃣ El proceso incluye: instalación de fibra, configuración del módem y pruebas.",
            "3️⃣ La instalación tiene un costo que varía según la zona.",
            "4️⃣ Puedes solicitar tu instalación en el multicentro o vía web."
        ],
        "final_message": "¿Te gustaría que te contacte un asesor comercial para más información sobre la instalación?"
    },
    {
        "code": "FACTURACION_GENERAL",
        "conditions": {
            "intent": "facturacion"
        },
        "problem": "Consulta sobre facturación del servicio.",
        "cause": "El cliente tiene dudas sobre el costo de su servicio.",
        "priority": "baja",
        "confidence": 0.85,
        "ticket_required": False,
        "category": "general",
        "steps": [
            "1️⃣ Tu factura se genera mensualmente según el plan contratado.",
            "2️⃣ Puedes consultar tu factura en la app de ENTEL o en entel.bo.",
            "3️⃣ El pago se puede realizar en agencias, bancos o vía web.",
            "4️⃣ Si tienes descuentos o promociones, aparecen en tu factura."
        ],
        "final_message": "¿Necesitas ayuda con algún detalle específico de tu facturación?"
    }
]

# =====================================================
# Unificar todas las reglas
# =====================================================
RULES = []

RULES.extend(SIGNAL_RULES)
RULES.extend(POWER_RULES)
RULES.extend(WIFI_RULES)
RULES.extend(SPEED_RULES)
RULES.extend(DEVICE_RULES)
RULES.extend(FIBER_RULES)
RULES.extend(GENERAL_RULES)

# =====================================================
# Obtener todas las reglas
# =====================================================
def get_all_rules():
    return RULES

# =====================================================
# Buscar regla por código
# =====================================================
def find_rule(code):
    for rule in RULES:
        if rule["code"] == code:
            return rule
    return None

# =====================================================
# Buscar reglas por intención
# =====================================================
def find_rules_by_intent(intent):
    results = []
    for rule in RULES:
        conditions = rule.get("conditions", {})
        if conditions.get("intent") == intent:
            results.append(rule)
    return results

# =====================================================
# Buscar reglas por problema
# =====================================================
def find_rules_by_problem(problem):
    results = []
    for rule in RULES:
        conditions = rule.get("conditions", {})
        if conditions.get("problem") == problem:
            results.append(rule)
    return results

# =====================================================
# Cantidad de reglas cargadas
# =====================================================
def count_rules():
    return len(RULES)

# =====================================================
# Mostrar reglas cargadas (solo para debug, no usar en producción)
# =====================================================
def show_rules():
    pass