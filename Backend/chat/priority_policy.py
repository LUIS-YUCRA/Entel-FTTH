"""Prioridad preliminar; el backend calcula y registra la decisión definitiva."""
from copy import deepcopy
import json
import re
from pathlib import Path
from knowledge_base import normalize_text

RULES = json.loads(Path(__file__).with_name('priority_rules.json').read_text(encoding='utf-8'))

def apply_priority_policy(diagnosis, context):
    adjusted = deepcopy(diagnosis or {})
    text = normalize_text(context.get('reported_problem', ''))
    facts = context.get('diagnostic_facts', {})
    category = str((context.get('customer') or {}).get('customer_category', 'HOGAR')).upper()
    code = adjusted.get('code', '')
    outage = code in RULES['outageCodes'] or context.get('intent', {}).get('intent') == 'sin_internet'
    impact = bool(re.search(r'no (?:podemos|puedo) (?:cobrar|atender|vender)|no funciona.*(?:ventas|cobros)|operaciones (?:criticas )?(?:detenidas|paralizadas)|impide.*(?:clases|ventas|atencion)|no (?:hay|podemos dar) clases', text))
    priority = 'MEDIA'
    reason = 'Impacto pendiente de verificar por el backend.'
    if code in RULES.get('safetyCodes', []):
        priority, reason = 'ALTA', 'Indicios de daño eléctrico reportados.'
    elif facts.get('device_scope') == 'single' or code in RULES['minorCodes']:
        priority, reason = 'BAJA', 'Problema localizado sin interrupción general reportada.'
    elif facts.get('fiber_damage_visible') or (impact and (outage or category in RULES['criticalCategories'])):
        priority, reason = 'ALTA', 'Daño físico o interrupción operativa reportados.'
    elif outage and re.search(r'desde ayer|desde anteayer', text):
        priority, reason = 'ALTA', 'Interrupción total prolongada reportada.'
    adjusted.update(priority=priority, priority_reason=reason, priority_policy=RULES['version'])
    adjusted.setdefault('source_intent', context.get('intent', {}).get('intent'))
    return adjusted
