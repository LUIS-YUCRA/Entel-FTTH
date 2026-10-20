import time
import os
from config import Config
from nlp import nlp_processor
from intent_examples import INTENTS
from knowledge_base import detect_direct_intent, normalize_text, KNOWLEDGE_INTENT_EXAMPLES
import re
class IntentClassifier:
    def __init__(self):
        self.threshold = Config.SIMILARITY_THRESHOLD
        # Preprocesar todos los ejemplos una sola vez
        self.intent_docs = {}
        examples_by_intent = {key: list(values) for key, values in INTENTS.items()}
        for key, values in KNOWLEDGE_INTENT_EXAMPLES.items():
            examples_by_intent.setdefault(key, []).extend(values)
        for intent, examples in examples_by_intent.items():
            self.intent_docs[intent] = [
                nlp_processor.process(normalize_text(example))
                for example in examples
            ]
        # print eliminado
    def predict(self, text):
        start_time = time.time()
        normalized_text = normalize_text(text)
        # Un síntoma negado no constituye una falla confirmada.
        if re.fullmatch(r'(?:mi |el |la )?(?:internet |conexion )?no (?:esta |es |va )?lent[oa]|no (?:hay|tengo|veo) (?:ninguna )?luz roja', normalized_text):
            return {'intent': 'desconocido', 'confidence': 0.0, 'scores': {}, 'processing_time_ms': 0}
        direct_intent = detect_direct_intent(normalized_text)
        if direct_intent:
            return {
                "intent": direct_intent,
                "confidence": 0.95,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2),
                "scores": {direct_intent: 0.95}
            }

        user_doc = nlp_processor.process(normalized_text)
        best_intent = None
        best_score = 0.0
        scores = {}
        for intent, docs in self.intent_docs.items():
            highest_similarity = 0.0
            for doc in docs:
                similarity = user_doc.similarity(doc)
                if similarity > highest_similarity:
                    highest_similarity = similarity
            scores[intent] = round(highest_similarity, 4)
            if highest_similarity > best_score:
                best_score = highest_similarity
                best_intent = intent
        elapsed = round((time.time() - start_time) * 1000, 2)
        ranked = sorted(scores.values(), reverse=True)
        margin = best_score - (ranked[1] if len(ranked) > 1 else 0)
        # Vectores similares entre intenciones merecen una aclaración.
        if margin < 0.04:
            best_score = min(best_score, self.threshold - 0.01)
        # Si la confianza es baja o la intención es desconocida
        # intentar detectar preguntas comunes sin coincidencia exacta
        if best_score < self.threshold or best_intent == "desconocido":
            best_intent = "desconocido"
            # Detectar preguntas clave
            text_lower = normalized_text
            # Contraseña WiFi: mencionar solamente "WiFi" no implica un problema de clave.
            if any(word in text_lower for word in ["contrasena", "clave wifi", "wlan key", "password"]):
                best_intent = "wifi_password"
                best_score = 0.70
            # Estado de reclamo
            elif any(word in text_lower for word in ["ticket", "reclamo", "número", "estado", "mi ticket"]):
                best_intent = "estado_reclamo"
                best_score = 0.70
            # Streaming / Videos
            elif any(word in text_lower for word in ["netflix", "youtube", "video", "streaming", "series", "peliculas"]):
                best_intent = "streaming"
                best_score = 0.70
            # Tiempo del técnico
            elif any(word in text_lower for word in ["técnico", "visita", "cuándo", "demora", "cuando viene", "hora de llegada"]):
                best_intent = "tiempo_tecnico"
                best_score = 0.70
            # Módem caliente
            elif any(word in text_lower for word in ["caliente", "calor", "temperatura", "quemado", "muy caliente"]):
                best_intent = "modem_problemas"
                best_score = 0.70
            # Cortes de internet
            elif any(word in text_lower for word in ["cortes", "se corta", "intermitente", "inestable"]):
                best_intent = "cortes_internet"
                best_score = 0.70
            # Velocidad baja
            elif any(word in text_lower for word in ["velocidad", "llega la velocidad", "contratada", "megas"]):
                best_intent = "velocidad_baja"
                best_score = 0.70
            # Consulta general
            elif any(word in text_lower for word in ["qué es", "cómo funciona", "para qué sirve", "ftth"]):
                best_intent = "consulta_general"
                best_score = 0.70
            # Instalación
            elif any(word in text_lower for word in ["instalación", "contratar", "instalar", "fibra"]):
                best_intent = "instalacion_ftth"
                best_score = 0.70
            # Facturación
            elif any(word in text_lower for word in ["factura", "pago", "costo", "precio", "debo pagar"]):
                best_intent = "facturacion"
                best_score = 0.70
            # Ayuda
            elif any(word in text_lower for word in ["ayuda", "ayudame", "necesito ayuda"]):
                best_intent = "solicitud_ayuda"
                best_score = 0.70
        if best_intent == 'desconocido' and os.getenv('ASSISTANT_MODEL_DISABLED') != '1':
            from supervised_model import optional_prediction
            learned = optional_prediction(text)
            if learned:
                return {**learned, 'processing_time_ms': elapsed, 'scores': scores}
        return {
            "intent": best_intent,
            "confidence": round(best_score, 4),
            "processing_time_ms": elapsed,
            "scores": scores,
            "margin": round(margin, 4)
        }

classifier = IntentClassifier()
