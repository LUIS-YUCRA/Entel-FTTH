"""
=========================================================
PHRASE_MATCHER.PY
Detector de entidades FTTH mediante spaCy PhraseMatcher
Sistema FTTH - ENTEL
=========================================================
"""
import re
import unicodedata

try:
    from spacy.matcher import PhraseMatcher
except ImportError:
    PhraseMatcher = None

from nlp import nlp_processor
from entity_patterns import (
    DEVICES,
    INDICATORS,
    COLORS,
    PROBLEMS
)
class FTTHPhraseMatcher:
    def __init__(self):
        self.matcher = None
        if PhraseMatcher is not None and nlp_processor.nlp is not None:
            self.matcher = PhraseMatcher(nlp_processor.nlp.vocab, attr="LOWER")
        self.fallback_patterns = []
        # Diccionario para normalizar términos
        self.normalized_terms = {}
        self._load_patterns()
        # print eliminado
    # =====================================================
    # Agregar patrones
    # =====================================================
    def _add_patterns(self, label, dictionary):
        patterns = []
        for normalized_value, synonyms in dictionary.items():
            for synonym in synonyms:
                self.normalized_terms[
                    synonym.lower()
                ] = normalized_value
                if self.matcher is not None:
                    patterns.append(nlp_processor.nlp(synonym))
                else:
                    self.fallback_patterns.append((label, synonym, normalized_value))
        if self.matcher is not None:
            self.matcher.add(label, patterns)
    # =====================================================
    # Cargar patrones
    # =====================================================
    def _load_patterns(self):
        self._add_patterns(
            "DEVICE",
            DEVICES
        )
        self._add_patterns(
            "INDICATOR",
            INDICATORS
        )
        self._add_patterns(
            "COLOR",
            COLORS
        )
        self._add_patterns(
            "PROBLEM",
            PROBLEMS
        )
    # =====================================================
    # Buscar entidades
    # =====================================================
    def find_matches(self, text):
        if self.matcher is None:
            return self._find_matches_without_spacy(text)

        doc = nlp_processor.process_document(text)
        matches = self.matcher(doc)
        results = []
        seen = set()
        for match_id, start, end in matches:
            label = doc.vocab.strings[match_id]
            original_text = doc[start:end].text
            normalized = self.normalized_terms.get(
                original_text.lower(),
                original_text.lower()
            )
            key = (
                label,
                normalized,
                start,
                end
            )
            if key in seen:
                continue
            seen.add(key)
            results.append({
                "label": label,
                "text": original_text,
                "normalized": normalized,
                "start": start,
                "end": end
            })
        # =====================================================
        # Eliminar coincidencias solapadas
        # Conserva la coincidencia más larga
        # =====================================================
        results.sort(
            key=lambda x: (
                x["start"],
                -(x["end"] - x["start"])
            )
        )
        filtered = []
        occupied = set()
        for entity in results:
            overlap = False
            for position in range(
                entity["start"],
                entity["end"]
            ):
                if position in occupied:
                    overlap = True
                    break
            if overlap:
                continue
            filtered.append(entity)
            for position in range(
                entity["start"],
                entity["end"]
            ):
                occupied.add(position)
        return filtered

    @staticmethod
    def _normalize(value):
        return "".join(
            character
            for character in unicodedata.normalize("NFD", str(value).lower())
            if unicodedata.category(character) != "Mn"
        )

    def _find_matches_without_spacy(self, text):
        """Coincidencia determinista usada cuando spaCy no está instalado."""
        words = re.findall(r"[\wáéíóúüñ]+", text.lower(), flags=re.UNICODE)
        normalized_words = [self._normalize(word) for word in words]
        results = []
        seen = set()

        for label, synonym, normalized_value in self.fallback_patterns:
            phrase_words = re.findall(
                r"[\wáéíóúüñ]+", self._normalize(synonym), flags=re.UNICODE
            )
            width = len(phrase_words)
            if not width:
                continue
            for start in range(len(words) - width + 1):
                end = start + width
                if normalized_words[start:end] != phrase_words:
                    continue
                key = (label, normalized_value, start, end)
                if key in seen:
                    continue
                seen.add(key)
                results.append({
                    "label": label,
                    "text": " ".join(words[start:end]),
                    "normalized": normalized_value,
                    "start": start,
                    "end": end,
                })

        results.sort(key=lambda item: (item["start"], -(item["end"] - item["start"])))
        filtered = []
        occupied = set()
        for entity in results:
            positions = set(range(entity["start"], entity["end"]))
            if occupied & positions:
                continue
            filtered.append(entity)
            occupied.update(positions)
        return filtered
# =====================================================
# Instancia global
# =====================================================
phrase_matcher = FTTHPhraseMatcher()
