"""Carga controlada de spaCy para el asistente FTTH."""
from difflib import SequenceMatcher
import sys
import unicodedata

try:
    import spacy
except ImportError:  # El motor de reglas debe funcionar aun sin la dependencia opcional.
    spacy = None

from config import Config


def _normalize(value):
    return " ".join(
        "".join(
            character
            for character in unicodedata.normalize("NFD", str(value).lower())
            if unicodedata.category(character) != "Mn"
        ).split()
    )


class BasicDocument:

    def __init__(self, text, tokens=None):
        self.text = _normalize(text)
        self.tokens = set(tokens or self.text.split())

    def similarity(self, other):
        if not self.text or not getattr(other, "text", ""):
            return 0.0
        other_tokens = getattr(other, "tokens", set(other.text.split()))
        union = self.tokens | other_tokens
        token_score = len(self.tokens & other_tokens) / len(union) if union else 0.0
        sequence_score = SequenceMatcher(None, self.text, other.text).ratio()
        return max(token_score, sequence_score * 0.85)


class NLPProcessor:
    def __init__(self):
        self.nlp = None
        self.backend = "local"
        self.model_name = None
        if spacy is None:
            return
        try:
            self.nlp = spacy.load(Config.SPACY_MODEL)
            self.backend = "spacy"
            self.model_name = Config.SPACY_MODEL
        except OSError:
            # No se descargan paquetes durante una petición HTTP.
            # El modelo vacío mantiene operativas las reglas y coincidencias.
            # El puente Node interpreta cualquier salida por stderr como un
            # diagnóstico fallido. El modelo vacío sigue usando spaCy real.
            self.nlp = spacy.blank("es")
            self.backend = "spacy"
            self.model_name = "es_blank"

    def process(self, text):
        if not self.nlp:
            return BasicDocument(text)
        document = self.nlp.make_doc(text)
        tokens = {
            _normalize(token.lemma_ or token.text)
            for token in document
            if not token.is_space and not token.is_punct
        }
        # La similitud permanece determinista para conservar los 30 flujos
        # aprobados; spaCy aporta tokenización española y entidades base.
        return BasicDocument(text, tokens=tokens)

    def process_document(self, text):
        """Devuelve el Doc nativo requerido por PhraseMatcher y entidades."""
        if not self.nlp:
            return BasicDocument(text)
        return self.nlp(text)


nlp_processor = NLPProcessor()
