import time
import unicodedata
from config import Config
from nlp import nlp_processor
from intent_examples import INTENTS
from knowledge_base import detect_direct_intent
class IntentClassifier:
    def __init__(self):
        self.threshold = Config.SIMILARITY_THRESHOLD
        # Preprocesar todos los ejemplos una sola vez
        self.intent_docs = {}
        for intent, examples in INTENTS.items():
            self.intent_docs[intent] = [
                nlp_processor.process(example)
                for example in examples
            ]
        # print eliminado
    def predict(self, text):
        start_time = time.time()
        normalized_text = "".join(
            character for character in unicodedata.normalize("NFD", text.lower())
            if unicodedata.category(character) != "Mn"
        )
        direct_intent = detect_direct_intent(normalized_text)
        if direct_intent:
            return {
                "intent": direct_intent,
                "confidence": 0.95,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2),
                "scores": {direct_intent: 0.95}
            }

        user_doc = nlp_processor.process(text)
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
        # Si la confianza es baja o la intención es desconocida
        # intentar detectar preguntas comunes sin coincidencia exacta
        if best_score < self.threshold or best_intent == "desconocido":
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
                best_intent = "saludo"
                best_score = 0.70
        return {
            "intent": best_intent,
            "confidence": round(best_score, 4),
            "processing_time_ms": elapsed,
            "scores": scores
        }

    @staticmethod
    def _detect_direct_intent(text):
        """Clasificación determinista para las fallas FTTH más frecuentes."""
        if any(phrase in text for phrase in [
            "adios", "hasta luego", "nos vemos", "hasta pronto"
        ]):
            return "despedida"
        if any(phrase in text for phrase in [
            "hola", "buenos dias", "buenas tardes", "buenas noches"
        ]):
            return "saludo"
        if any(phrase in text for phrase in [
            "gracias", "muchas gracias", "te agradezco"
        ]):
            return "agradecimiento"
        if any(phrase in text for phrase in [
            "no tengo internet", "no hay internet", "sin internet",
            "sin conexion", "internet caido", "no puedo navegar",
            "no funciona internet", "no tengo servicio"
        ]):
            return "sin_internet"
        if any(phrase in text for phrase in [
            "internet lento", "internet esta lento", "conexion lenta",
            "esta lenta", "muy lento", "tarda mucho", "velocidad baja",
            "descarga lenta", "se congela"
        ]):
            return "internet_lento"
        if ("los" in text and any(color in text for color in ["rojo", "roja"])):
            return "los_rojo"
        if any(device in text for device in ["modem", "router"]):
            if any(state in text for state in [
                "apagado", "no enciende", "no prende", "no funciona"
            ]):
                return "router"
        if "wifi" in text and any(problem in text for problem in [
            "no conecta", "falla", "lento", "sin internet", "no aparece"
        ]):
            return "problema_wifi"
        if any(phrase in text for phrase in [
            "se corta", "va y vuelve", "intermitente", "inestable",
            "se desconecta"
        ]):
            return "cortes_internet"
        return None
classifier = IntentClassifier()
