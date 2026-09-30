#!/usr/bin/env python
"""Puente JSON entre Node.js y el asistente FTTH."""
import base64
import json
import os
import sys
import traceback

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

    context = decode_context(encoded_context)
    context_customer = context.get("customer") if isinstance(context, dict) else None
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

    intent_result = classifier.predict(message)
    entities = extractor.extract(message)
    result = assistant_engine.process(message, intent_result, entities)

    return {
        "success": True,
        "response": result.get("response", ""),
        "intent": intent_result.get("intent"),
        "confidence": intent_result.get("confidence", 0),
        "diagnosis": result.get("diagnosis"),
        "ticket": result.get("ticket"),
        "dialog_state": memory.get_dialog_state(),
        "context": memory.get_context(),
    }


def main():
    if len(sys.argv) < 2:
        raise ValueError("Se requiere un mensaje")

    message = sys.argv[1]
    customer_id = sys.argv[2] if len(sys.argv) > 2 else None
    encoded_context = sys.argv[3] if len(sys.argv) > 3 else None
    return process_message(message, customer_id, encoded_context)


if __name__ == "__main__":
    try:
        print(json.dumps(main(), ensure_ascii=False))
    except Exception as error:
        print(json.dumps({
            "success": False,
            "error": str(error),
            "traceback": traceback.format_exc(),
            "response": "Ocurrió un error al procesar tu mensaje.",
        }, ensure_ascii=False))
