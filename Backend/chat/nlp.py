"""Carga controlada de spaCy para el asistente FTTH."""
from difflib import SequenceMatcher
from functools import lru_cache
import math
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

    def __init__(self, text, tokens=None, vector=None):
        self.text = _normalize(text)
        self.tokens = set(tokens or self.text.split())
        self.vector = vector

    def similarity(self, other):
        if not self.text or not getattr(other, "text", ""):
            return 0.0
        other_tokens = getattr(other, "tokens", set(other.text.split()))
        union = self.tokens | other_tokens
        token_score = len(self.tokens & other_tokens) / len(union) if union else 0.0
        sequence_score = SequenceMatcher(None, self.text, other.text).ratio()
        lexical = max(token_score, sequence_score * 0.85)
        other_vector = getattr(other, 'vector', None)
        if self.vector is not None and other_vector is not None:
            denominator = math.sqrt(sum(float(v)*float(v) for v in self.vector)) * math.sqrt(sum(float(v)*float(v) for v in other_vector))
            if denominator:
                cosine = sum(float(a)*float(b) for a,b in zip(self.vector, other_vector)) / denominator
                return max(lexical, max(0.0, min(1.0, cosine)) * 0.9)
        return lexical


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

    @lru_cache(maxsize=1024)
    def process(self, text):
        if not self.nlp:
            return BasicDocument(text)
        document = self.nlp.make_doc(text)
        tokens = {
            _normalize(token.lemma_ or token.text)
            for token in document
            if not token.is_space and not token.is_punct
        }
        # Los modelos md/lg aportan vectores reales; blank/sm conservan la
        # alternativa local. Nunca se descarga ni entrena dentro de un turno.
        vector = document.vector.copy() if document.has_vector else None
        return BasicDocument(text, tokens=tokens, vector=vector)

    def process_document(self, text):
        """Devuelve el Doc nativo requerido por PhraseMatcher y entidades."""
        if not self.nlp:
            return BasicDocument(text)
        return self.nlp(text)


nlp_processor = NLPProcessor()
