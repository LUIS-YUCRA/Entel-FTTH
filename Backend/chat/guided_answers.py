"""Validation of answers to the pending question; no state changes here."""
import re
import json
from pathlib import Path
from knowledge_base import normalize_text

_CONSENT_POLICY = json.loads(Path(__file__).with_name('ticket_consent_policy.json').read_text(encoding='utf-8'))


def normalized(text):
    return normalize_text(text)


def matches(text, pattern):
    return bool(re.search(pattern, normalized(text)))


def service_restored(text):
    return (matches(text, r'ya (tengo internet|funciona|cargan)|volvio el internet|se soluciono|ahora funciona')
            and not matches(text, r'\bno\b|\bsin\b|pero|sigue|corta|apaga'))


def fiber_broken(text):
    return (matches(text, r'(cable|fibra).*(cortad|rot[oa]|partid)|esta (cortado|roto).*cable')
            and not matches(text, r'\bno (esta|se encuentra|hay)|no (?:se )?(?:rompio|corto)|no tiene danos|sin danos'))


def connection_type(message, pending_connection=False):
    """Resuelve referencias cortas sólo cuando la pregunta trata de la conexión."""
    text = normalized(message)
    wifi = bool(re.search(r'\bwi ?fi\b|inalambric', text))
    cable = bool(re.search(r'\bcable\b|ethernet|alambrad', text))
    if pending_connection and re.search(r'\bamb[oa]s\b|las dos|los dos|de las dos formas|de ambas maneras', text):
        return 'both'
    if wifi and cable:
        if re.search(r'no (?:he |lo |por |probe |uso )*(?:cable|ethernet)|sin cable', text):
            return 'wifi'
        if re.search(r'no (?:por |uso )*wi ?fi|sin wi ?fi', text):
            return 'cable'
        return 'both'
    return 'wifi' if wifi else 'cable' if cable else None


# A yes/no answer is accepted only for a yes/no question.
ANSWER_PATTERNS = {
    'sin_internet': [r'\b(si|no)\b|roj[oa]|verde|luz|luces|enciende|apagad', r'\b(si|no)\b|conectad|suelto|doblado|bien|cortad|roto|danos', r'\bno\b|sin internet|sigue|igual|regreso|volvio|funciona|cargan'],
    'internet_lento': [r'todos|uno|una|solamente|solo|equipos', r'wifi|wi fi|cable|ethernet', r'\b(si|no)\b|mejor|igual|sigue', r'\b(si|no)\b|cargan|mejor|igual|sigue'],
    'internet_intermittent': [r'todo el dia|momentos|manana|noche|tarde|cada|siempre|horas|minutos', r'\b(si|no)\b|luz|luces|apaga|cambia', r'\b(si|no)\b|cables|conectad|suelto|bien', r'corta|desconecta|sigue|igual|reinicie|funciona'],
    'router_power': [r'\b(si|no)\b|conectad|bien', r'\b(si|no)\b|funciona|normal|cargador', r'\b(si|no)\b|luz|luces|enciende|funciona|prende'],
    'router_restarts': [r'apaga|cortes|funcionando', r'\b(si|no)\b|ventilad|objetos|abierto|caliente', r'apag|calienta|sigue|igual|funciona|\bno\b'],
    'wifi_weak': [r'\b(si|no)\b|funciona|cerca', r'\b(si|no)\b|mueble|piso|mesa|pared', r'probe|igual|mejor|sigue|funciona'],
    'fiber_cable_damage': [r'doblad|aplastad|cortad|roto|danad', r'\b(si|no)\b|roja|luz|luces'],
    'single_device_issue': [r'\b(si|no)\b|otros|todos|funcionan', r'hice|listo|probe|sigue|conecta|funciona', r'conecta|funciona|solucion|\bno\b'],
    'ethernet_problem': [r'\b(si|no)\b|funciona', r'\b(si|no)\b|conectad|hice|listo', r'probe|hice|igual|funciona|sigue', r'\b(si|no)\b|tengo|probe'],
    'streaming': [r'\b(si|no)\b|sucede|tambien|otras|paginas|normal|funcionan|solo|solamente', r'\b(si|no)\b|otros|nadie', r'\b(si|no)\b|congela|sigue|mejor|fall', r'reinicie|igual|sigue|funciona'],
}


def answers_question(flow, step, text):
    if flow == 'internet_lento' and step == 1:
        return connection_type(text, pending_connection=True) is not None
    patterns = ANSWER_PATTERNS.get(flow, [])
    if step >= len(patterns):
        return False
    # Repeating the symptom is not an answer about lights, cables or scope.
    if normalized(text).strip(' .!') in ('no tengo internet', 'sin internet', 'mi internet esta lento'):
        return flow == 'sin_internet' and step == 2
    if matches(text, r'imagen|foto|no entiendo|no se|no he reiniciado|todavia no reinicie'):
        return False
    pattern = patterns[step]
    # «no he comido» no contesta una pregunta sobre luces. El sí/no aislado
    # se admite sólo donde la pregunta permite esa respuesta.
    yes_no = r'\b(si|no)\b' in pattern or r'\bno\b' in pattern
    if yes_no and re.fullmatch(r'(si|no)( por ahora| claro| todavia)?', normalized(text)):
        return True
    semantic = pattern.replace(r'\b(si|no)\b|', '').replace(r'\bno\b|', '').replace(r'|\bno\b', '')
    return matches(text, semantic)


def ticket_decision(message):
    """Sólo consentimiento de ticket; «no funciona» no significa rechazarlo."""
    text = normalized(message).strip(' .!')
    if any(re.search(pattern, text) for pattern in _CONSENT_POLICY['negative']):
        return False
    if any(re.search(pattern, text) for pattern in _CONSENT_POLICY['uncertain']):
        return None
    if any(re.search(pattern, text) for pattern in _CONSENT_POLICY['positive']):
        return True
    return None


def update_facts(context, message):
    """Hechos declarados, no diagnósticos inferidos. Conserva acciones por sesión."""
    facts = context.setdefault('diagnostic_facts', {})
    text = normalized(message)
    if re.search(r'\bluz roja\b|\bluces rojas\b', text) and not re.search(r'\bno (?:hay|tengo|veo|tiene)|ninguna luz roja', text):
        facts['red_light'] = True
    if re.search(r'\b(?:desde ayer|desde hoy|desde anteayer|hace \d+ (?:horas?|dias?|minutos?))\b', text):
        facts['reported_since'] = re.search(r'\b(?:desde ayer|desde hoy|desde anteayer|hace \d+ (?:horas?|dias?|minutos?))\b', text).group()
    if re.search(r'\b(?:solo|solamente) (?:en )?(?:mi |el |un )?(?:celular|telefono|computadora|laptop|dispositivo)\b', text):
        facts['device_scope'] = 'single'
    elif re.search(r'\btodos (?:mis |los |tus )?(?:dispositivos|equipos|celulares)|todo el (?:colegio|negocio)|toda la institucion', text):
        facts['device_scope'] = 'all'
    if re.search(r'\b(?:cerca (?:del |de mi )?(?:router|equipo)|al lado)\b', text):
        if re.search(r'funciona bien|funciona normal|si funciona|cerca funciona', text) and not re.search(r'\bno funciona', text):
            facts['works_near_router'] = True
    if re.search(r'(?:no |ninguna )luz roja|no (?:hay|tengo|veo|tiene) (?:ninguna )?luz roja|no esta roja', text):
        facts['red_light'] = False
        facts.pop('los_status', None)
    if re.search(r'\blos\b.*roj|roj.*\blos\b', text) and not re.search(r'\bno (?:esta|hay|se ve)\b', text):
        facts['los_status'] = 'red'
    if re.search(r'\bpon\b.*(?:apag|no enciende)', text) and not re.search(r'\bno (?:esta|se encuentra) apag', text):
        facts['pon_status'] = 'off'
    if re.search(r'\blos\b.*apagad', text):
        facts['los_status'] = 'off'
    progress = context.get('guided_flow') or {}
    pending_connection = progress.get('name') == 'internet_lento' and progress.get('step') == 1
    connection = connection_type(message, pending_connection)
    if connection and (progress.get('name') == 'internet_lento' or matches(message, r'lent|velocidad|conexion|conectad')):
        facts['connection_type'] = connection
    if progress.get('name') == 'internet_lento' and progress.get('step') == 0:
        if re.fullmatch(r'(?:si )?(?:en )?todos(?: los dispositivos| mis dispositivos)?', text):
            facts['device_scope'] = 'all'
        elif re.fullmatch(r'(?:solo |solamente )?(?:en )?uno', text):
            facts['device_scope'] = 'single'
    if re.search(r'\balgunos\b|\bvarios\b', text) and (progress.get('step') == 0 or matches(message, r'dispositiv|lent')):
        facts['device_scope'] = 'some'
    if progress.get('name') == 'sin_internet' and progress.get('step') == 0 and not facts.get('light_names_pending'):
        if re.fullmatch(r'si(?: esta roja| es roja)?|esta roja', text):
            facts['red_light'] = True
        elif re.fullmatch(r'no(?: esta roja)?|esta apagada', text):
            facts['red_light'] = False
    if re.search(r'(cable|fibra)', text) and re.search(r'bien|sin danos|no (?:tiene|hay|veo) danos|revis', text):
        facts['fiber_checked'] = True
        facts['fiber_damage_visible'] = False
    if fiber_broken(message):
        facts['fiber_checked'] = True
        facts['fiber_damage_visible'] = True
    restarted = bool(re.search(r'ya (?:lo )?reinicie|reiniciado|ya (?:lo )?hice|eso ya revise', text))
    failed = bool(re.search(r'no (?:regreso|volvio|funciona|cambio)|sigue (?:igual|sin|hay|fall)|todavia (?:no|falla)|aun (?:no|falla)', text))
    if restarted and not re.search(r'no (?:he |lo )?reinici|todavia no', text):
        if 'reinici' in text or facts.get('router_restart_requested'):
            facts['router_restart_attempted'] = True
    if failed and facts.get('router_restart_requested'):
        facts['router_restart_attempted'] = True
    if facts.get('router_restart_attempted') and failed:
        facts['router_restart_result'] = 'failed'
    if service_restored(message):
        facts['service_restored'] = True
        if facts.get('router_restart_attempted'):
            facts['router_restart_result'] = 'resolved'
    return facts
