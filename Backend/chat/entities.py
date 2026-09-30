"""
=========================================================
ENTITIES.PY
Extractor inteligente de entidades FTTH
Sistema FTTH - ENTEL
=========================================================
"""
import re

from nlp import nlp_processor
from phrase_matcher import phrase_matcher
class EntityExtractor:
    def __init__(self):
        print(
            "Extractor de entidades FTTH cargado correctamente."
        )
    # =====================================================
    # Extraer entidades
    # =====================================================
    def extract(self, text):
        doc = nlp_processor.process_document(text)
        matches = phrase_matcher.find_matches(text)
        entities = {
            # Dispositivo principal
            "device": None,
            # Problema detectado
            "problem": None,
            # Estado de indicadores
            "lights": {
                "los": None,
                "pon": None,
                "power": None,
                "wifi": None,
                "internet_led": None
            },
            # Compatibilidad con módulos anteriores
            "indicator": None,
            "color": None,
            # Tiempo
            "time": None,
            # Números
            "numbers": [],
            # Información original
            "raw_matches": matches
        }
        # =====================================================
        # Procesar resultados del PhraseMatcher
        # =====================================================
        last_indicator = None
        for match in matches:
            label = match["label"]
            value = match["normalized"]
            # -----------------------------
            # Dispositivo
            # -----------------------------
            if label == "DEVICE":
                if entities["device"] is None:
                    entities["device"] = value
            # -----------------------------
            # Problema
            # -----------------------------
            elif label == "PROBLEM":
                if entities["problem"] is None:
                    entities["problem"] = value
            # -----------------------------
            # Indicador luminoso
            # -----------------------------
            elif label == "INDICATOR":
                last_indicator = value
                # compatibilidad
                if entities["indicator"] is None:
                    entities["indicator"] = value
            # -----------------------------
            # Color / estado
            # -----------------------------
            elif label == "COLOR":
                entities["color"] = value
                # Asociar color al último indicador encontrado
                if last_indicator in entities["lights"]:
                    entities["lights"][last_indicator] = value
        # =====================================================
        # Tiempo
        # =====================================================
        text_lower = text.lower()
        time_expressions = [
            "hoy",
            "ayer",
            "anoche",
            "esta mañana",
            "esta tarde",
            "esta noche",
            "desde ayer",
            "desde hoy",
            "hace una hora",
            "hace dos horas",
            "hace varios dias",
            "hace varios días"
        ]
        for expression in time_expressions:
            if expression in text_lower:
                entities["time"] = expression
                break
        # =====================================================
        # Tiempo detectado por spaCy
        # =====================================================
        if entities["time"] is None:
            for ent in getattr(doc, "ents", []):
                if ent.label_ in [
                    "DATE",
                    "TIME"
                ]:
                    entities["time"] = ent.text
                    break
        # =====================================================
        # Números
        # =====================================================
        try:
            tokens = list(doc)
        except TypeError:
            tokens = []
        if tokens:
            for token in tokens:
                if token.like_num:
                    entities["numbers"].append(token.text)
        else:
            entities["numbers"].extend(re.findall(r"\b\d+(?:[.,]\d+)?\b", text))
        return entities
# Instancia global
extractor = EntityExtractor()
