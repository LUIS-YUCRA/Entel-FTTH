"""Recuperación local explicable: conceptos FTTH + similitud léxica y guardas de estado.

No es un modelo generativo ni un embedding neuronal. La fuente es el snapshot de
versiones aprobadas que Node obtiene de PostgreSQL; nunca los chats privados.
"""
import json
import math
import os
import re
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path
from knowledge_base import normalize_text
from nlp import nlp_processor

POLICY = json.loads(Path(__file__).with_name('knowledge_policy.json').read_text(encoding='utf-8'))
def threshold(name, default):
    try:
        value = float(os.getenv(name, str(default)))
        return value if math.isfinite(value) and 0 < value <= 1 else default
    except ValueError:
        return default


HIGH_THRESHOLD = threshold('KNOWLEDGE_HIGH_THRESHOLD', 0.85)
REVIEW_THRESHOLD = min(threshold('KNOWLEDGE_REVIEW_THRESHOLD', 0.55), HIGH_THRESHOLD)


def concepts(text, facts=None):
    value = normalize_text(text)
    tags = Counter()
    patterns = {
        'outage': r'no (?:tengo|funciona|navega|da)|sin (?:internet|conexion)|se (?:me )?fue|no agarra|se cayo',
        'optical_red': r'\blos\b.*roj|roj.*\blos\b',
        'slow': r'lent|baja velocidad|velocidad (?:es |esta )?baja|demora|tarda|no llega la velocidad',
        'fiber': r'fibra|optica',
        'wifi': r'wifi|inalambric',
        'device': r'router|modem|ont|equipo',
        'billing': r'factur|cobro|pago|saldo',
        'installation': r'instala|contrata|cobertura',
        'password': r'clave|contrasena',
        'ftth_info': r'que es ftth|significa ftth|fibra hasta el hogar',
    }
    for key, pattern in patterns.items():
        if re.search(pattern, value):
            tags[key] = 1 if key in ('device', 'wifi', 'fiber') else 3
    if re.search(r'no (?:esta |es |va )?lent', value):
        tags.pop('slow', None)
    if (facts or {}).get('los_status') == 'red':
        tags['optical_red'] = 3
    return tags


def score(query, example, facts=None):
    a, b = concepts(query, facts), concepts(example)
    lexical = SequenceMatcher(None, normalize_text(query), normalize_text(example)).ratio()
    if not a or not b:
        hybrid = lexical if normalize_text(query) == normalize_text(example) else lexical * 0.7
    else:
        cosine = sum(v*b.get(k, 0) for k,v in a.items()) / (math.sqrt(sum(v*v for v in a.values())) * math.sqrt(sum(v*v for v in b.values())))
        hybrid = 0.85*cosine + 0.15*lexical
    # Semántica real sólo cuando el modelo local aporta vectores. Mantener
    # las guardas de intención/estado por encima de cualquier similitud.
    document = nlp_processor.process(normalize_text(query))
    example_doc = nlp_processor.process(normalize_text(example))
    if document.vector is not None and example_doc.vector is not None:
        hybrid = max(hybrid, document.similarity(example_doc))
    if a.get('outage') and a.get('slow') and not (b.get('outage') and b.get('slow')):
        hybrid = min(hybrid, HIGH_THRESHOLD - .01)
    return hybrid


def retrieve(message, intent, reply_key, context, candidates):
    method = 'spacy-vectors-ftth-hybrid-v2' if nlp_processor.nlp is not None and nlp_processor.nlp.vocab.vectors_length else 'ftth-concepts-lexical-v2'
    trace = {'selected': False, 'method': method, 'policy': POLICY['version']}
    if not reply_key or reply_key not in POLICY['slots']:
        return None, trace
    facts = context.get('diagnostic_facts') or {}
    slot = POLICY['slots'][reply_key]
    if slot.get('allowedStates') and context.get('conversation', {}).get('dialog_state') not in slot['allowedStates']:
        return None, trace
    if any(facts.get(key) != value for key,value in slot['conditions'].items()):
        return None, trace
    query = message
    if not concepts(query):
        query = context.get('reported_problem', message)
    ranked = []
    for item in candidates[:300]:
        allowed_versions = [POLICY['version'], *POLICY.get('compatibleVersions', [])]
        if item.get('reply_key') != reply_key or item.get('policy_version') not in allowed_versions:
            continue
        if item.get('policy_version') != POLICY['version'] and reply_key == 'info:general_support':
            continue
        if item.get('intent') not in slot['intents'] or intent not in slot['intents']:
            continue
        if any(facts.get(key) != value for key,value in (item.get('conditions') or {}).items()):
            continue
        examples = [item['question'], *(item.get('variants') or [])]
        similarity = max(score(query, example, facts) for example in examples)
        ranked.append((similarity, item))
    if not ranked:
        return None, trace
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    similarity, best = ranked[0]
    trace.update(score=round(similarity,4), knowledgeId=str(best['id']), version=best['version'])
    if similarity < HIGH_THRESHOLD:
        trace['requiresReview'] = similarity >= REVIEW_THRESHOLD
        return None, trace
    trace['selected'] = True
    return best['answer'], trace
