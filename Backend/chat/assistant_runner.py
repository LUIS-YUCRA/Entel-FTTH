#!/usr/bin/env python
"""Puente JSON entre Node.js y el asistente FTTH."""
import base64
import json
import os
import sys
import traceback
import re

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)


def decode_context(encoded):
    if not encoded:
        return None
    padded = encoded + ("=" * (-len(encoded) % 4))
    raw = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
    return json.loads(raw)


def process_message(message, customer_id=None, encoded_context=None):
    from assistant_engine import assistant_engine
    from intent_classifier import classifier
    from entities import extractor
    from memory import memory
    from knowledge_base import normalize_text
    from knowledge_retrieval import retrieve
    from nlp import nlp_processor
    from customer_language import customer_reply

    context = decode_context(encoded_context)
    snapshot = (context or {}).pop('_knowledge_snapshot', [])
    private_history = (context or {}).pop('_private_history', [])
    ticket_lookup = (context or {}).pop('_ticket_lookup', {})
    context_customer = context.get("customer") if isinstance(context, dict) else None
    if context_customer and customer_id and str(context_customer.get('id')) != str(customer_id):
        # Una identidad distinta nunca hereda memoria de otro cliente.
        context = None
        context_customer = None
        private_history = []
        ticket_lookup = {}
    required_sections = {"conversation", "intent", "entities", "flags"}
    if isinstance(context, dict) and required_sections.issubset(context):
        memory.load_context(context)
    else:
        memory.clear()

    if context_customer:
        memory.set_customer(context_customer)

    if customer_id and customer_id not in ("null", "None"):
        customer = dict(memory.get_customer() or {})
        customer["id"] = customer_id
        memory.set_customer(customer)

    memory.get_context()['_private_history'] = private_history
    memory.get_context()['_ticket_lookup'] = ticket_lookup
    intent_result = classifier.predict(message)
    entities = extractor.extract(normalize_text(message))
    result = assistant_engine.process(message, intent_result, entities)

    reply_key = ((result.get('dialog') or {}).get('action') or {}).get('reply_key')
    effective_intent = memory.get_intent().get('intent')
    answer, retrieval = retrieve(message, effective_intent, reply_key, memory.get_context(), snapshot)
    if answer and not result.get('ticket'):
        result['response'] = answer
    result['response'] = customer_reply(result.get('response', ''), message)
    conversation = memory.get_context()['conversation']
    if re.search(r'estoy cansad|harto|molest|furioso|nunca funciona', normalize_text(message)) and not conversation.get('empathy_shown'):
        result['response'] = 'Lamento las molestias. ' + result['response']
        conversation['empathy_shown'] = True
    memory.get_context().pop('_private_history', None)
    memory.get_context().pop('_ticket_lookup', None)
    return {
        "action_type": ((result.get("dialog") or {}).get("action") or {}).get("type"),
        "normalized_message": normalize_text(message),
        "reply_key": reply_key,
        "retrieval": retrieval,
        "model_version": intent_result.get("model_version", "rules-semantic-v2"),
        "nlp_backend": nlp_processor.model_name or nlp_processor.backend,
        "success": True,
        "response": result.get("response", ""),
        "intent": memory.get_intent().get("intent"),
        "confidence": intent_result.get("confidence", 0),
        "diagnosis": result.get("diagnosis"),
        "ticket": result.get("ticket"),
        "dialog_state": memory.get_dialog_state(),
        "context": memory.get_context(),
    }


def main():
    if len(sys.argv) < 2:
        raise ValueError("Se requiere un mensaje")

    if sys.argv[1] == '--stdin':
        payload = json.load(sys.stdin)
        return process_message(payload['message'], payload.get('customerId'), payload.get('encodedContext'))
    message = sys.argv[1]
    customer_id = sys.argv[2] if len(sys.argv) > 2 else None
    encoded_context = sys.argv[3] if len(sys.argv) > 3 else None
    return process_message(message, customer_id, encoded_context)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == '--worker':
        # Cada trabajador atiende un turno a la vez, restaura la memoria desde
        # PostgreSQL y conserva únicamente modelos/tokenizadores entre turnos.
        for line in sys.stdin:
            try:
                payload = json.loads(line)
                result = process_message(payload['message'], payload.get('customerId'), payload.get('encodedContext'))
            except Exception as error:
                result = {'success': False, 'error': type(error).__name__, 'response': 'No pude procesar el mensaje.'}
            print(json.dumps(result, ensure_ascii=False), flush=True)
        sys.exit(0)
    try:
        print(json.dumps(main(), ensure_ascii=False))
    except Exception as error:
        print(json.dumps({
            "success": False,
            "error": str(error),
            "traceback": traceback.format_exc(),
            "response": "Ocurrió un error al procesar tu mensaje.",
        }, ensure_ascii=False))
