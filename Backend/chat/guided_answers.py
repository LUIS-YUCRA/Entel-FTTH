"""Validation of answers to the pending question; no state changes here."""
import re
import unicodedata


def normalized(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text.lower())
                   if unicodedata.category(c) != 'Mn')


def matches(text, pattern):
    return bool(re.search(pattern, normalized(text)))


def service_restored(text):
    return (matches(text, r'ya (tengo internet|funciona|cargan)|volvio el internet|se soluciono|ahora funciona')
            and not matches(text, r'\bno\b|\bsin\b|pero|sigue|corta|apaga'))


def fiber_broken(text):
    return (matches(text, r'(cable|fibra).*(cortad|rot[oa]|partid)|esta (cortado|roto).*cable')
            and not matches(text, r'\bno (esta|se encuentra|hay)'))


# A yes/no answer is accepted only for a yes/no question.
ANSWER_PATTERNS = {
    'sin_internet': [r'\b(si|no)\b|roj[oa]|verde|luz|luces|enciende', r'conectad|suelto|doblado|bien|cortad|roto', r'no|sin internet|sigue|igual|regreso|volvio|funciona|cargan'],
    'internet_lento': [r'todos|uno|una|solamente|solo|equipos', r'wifi|wi fi|cable|ethernet', r'\b(si|no)\b|mejor|igual|sigue', r'\b(si|no)\b|cargan|mejor|igual|sigue'],
    'internet_intermittent': [r'todo el dia|momentos|manana|noche|tarde|cada|siempre|horas|minutos', r'\b(si|no)\b|luz|luces|apaga|cambia', r'\b(si|no)\b|cables|conectad|suelto|bien', r'corta|desconecta|sigue|igual|reinicie|funciona'],
    'router_power': [r'\b(si|no)\b|conectad|bien', r'\b(si|no)\b|funciona|normal|cargador', r'\b(si|no)\b|luz|luces|enciende|funciona|prende'],
    'router_restarts': [r'apaga|cortes|funcionando', r'\b(si|no)\b|ventilad|objetos|abierto|caliente', r'apag|calienta|sigue|igual|funciona|\bno\b'],
    'wifi_weak': [r'\b(si|no)\b|funciona|cerca', r'\b(si|no)\b|mueble|piso|mesa|pared', r'probe|igual|mejor|sigue|funciona'],
    'fiber_cable_damage': [r'doblad|aplastad|cortad|roto|danad', r'\b(si|no)\b|roja|luz|luces'],
    'single_device_issue': [r'\b(si|no)\b|otros|todos|funcionan', r'hice|listo|probe|sigue|conecta|funciona', r'conecta|funciona|solucion|\bno\b'],
    'ethernet_problem': [r'\b(si|no)\b|funciona', r'\b(si|no)\b|conectad|hice|listo', r'probe|hice|igual|funciona|sigue', r'\b(si|no)\b|tengo|probe'],
    'streaming': [r'\b(si|no)\b|sucede|tambien', r'\b(si|no)\b|otros|nadie', r'\b(si|no)\b|congela|sigue|mejor', r'reinicie|igual|sigue|funciona'],
}


def answers_question(flow, step, text):
    patterns = ANSWER_PATTERNS.get(flow, [])
    if step >= len(patterns):
        return False
    # Repeating the symptom is not an answer about lights, cables or scope.
    if normalized(text).strip(' .!') in ('no tengo internet', 'sin internet', 'mi internet esta lento'):
        return flow == 'sin_internet' and step == 2
    if matches(text, r'imagen|foto|no entiendo|no se|no he reiniciado|todavia no reinicie'):
        return False
    return matches(text, patterns[step])
