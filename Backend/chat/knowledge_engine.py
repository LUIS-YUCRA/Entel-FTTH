"""
=========================================================
KNOWLEDGE_ENGINE.PY
Motor de conocimiento FTTH
Evalúa reglas FTTH y selecciona
el diagnóstico más probable.
Sistema Experto FTTH - ENTEL
=========================================================
"""
from rules import RULES
class KnowledgeEngine:
    def __init__(self):
        print(
            "Knowledge Engine FTTH cargado correctamente."
        )
    # =====================================================
    # Evaluación principal
    # =====================================================
    def evaluate(self, context):
        entities = context.get(
            "entities",
            {}
        )
        intent = context.get(
            "intent",
            "desconocido"
        )
        matches = []
        for rule in RULES:
            result = self.match_rule(
                rule,
                intent,
                entities
            )
            if result["matched"]:
                matches.append({
                    "rule": rule,
                    "score": result["score"],
                    "priority":
                    result["priority"]
                })
        if matches:
            matches.sort(
                key=lambda x: (
                    x["score"],
                    x["priority"]
                ),
                reverse=True
            )
            best = matches[0]
            return self.format_result(
                best["rule"],
                best["score"]
            )
        return self.unknown_problem()
    # =====================================================
    # Comparador inteligente
    # =====================================================
    def match_rule(
        self,
        rule,
        intent,
        entities
    ):
        conditions = rule.get(
            "conditions",
            {}
        )
        lights = entities.get(
            "lights",
            {}
        )
        score = 0
        weight = 0
        # -------------------------------------
        # INTENT
        # -------------------------------------
        if "intent" in conditions:
            weight += 10
            # Comparar intención
            if intent == conditions["intent"]:
                score += 10
            else:
                return {
                    "matched": False,
                    "score": 0
                }
        # -------------------------------------
        # PROBLEMA
        # -------------------------------------
        if "problem" in conditions:
            weight += 15
            # Comparar problema
            problem_value = entities.get("problem")
            if problem_value and problem_value == conditions["problem"]:
                score += 15
            else:
                return {
                    "matched": False,
                    "score": 0
                }
        # -------------------------------------
        # DISPOSITIVO
        # -------------------------------------
        if "device" in conditions:
            weight += 10
            # Comparar dispositivo
            device_value = entities.get("device")
            if device_value and device_value == conditions["device"]:
                score += 10
            else:
                return {
                    "matched": False,
                    "score": 0
                }
        # -------------------------------------
        # LUCES FTTH (LOS, PON, POWER, WIFI, INTERNET_LED)
        # -------------------------------------
        light_weights = {
            "los": 40,
            "pon": 25,
            "power": 10,
            "wifi": 15,
            "internet_led": 10
        }
        for light, value in conditions.items():
            if light in light_weights:
                weight += light_weights[light]
                # Obtener el valor de la luz desde entities o desde el campo directo
                light_value = None
                if light in lights:
                    light_value = lights[light]
                # Si no está en lights, buscar en entities directamente
                if light_value is None and light in entities:
                    light_value = entities[light]
                if light_value == value:
                    score += light_weights[light]
                else:
                    return {
                        "matched": False,
                        "score": 0
                    }
        if weight == 0:
            return {
                "matched": False,
                "score": 0
            }
        confidence = score / weight
        return {
            "matched": True,
            "score": confidence,
            "priority":
            self.priority_value(
                rule.get(
                    "priority",
                    "media"
                )
            )
        }
    # =====================================================
    # Prioridad
    # =====================================================
    def priority_value(self, priority):
        values = {
            "alta": 3,
            "ALTA": 3,
            "media": 2,
            "MEDIA": 2,
            "baja": 1,
            "BAJA": 1
        }
        return values.get(
            priority,
            1
        )
    # =====================================================
    # Resultado final
    # =====================================================
    def format_result(
        self,
        rule,
        score
    ):
        confidence = round(
            min(score, 1),
            2
        )
        return {
            "code":
            rule["code"],
            "problem":
            rule["problem"],
            "cause":
            rule["cause"],
            "priority":
            rule["priority"],
            "confidence":
            confidence,
            "ticket_required":
            rule["ticket_required"],
            "category":
            rule.get(
                "category",
                "general"
            )
        }
    # =====================================================
    # Sin diagnóstico
    # =====================================================
    def unknown_problem(self):
        return {
            "code":
            "UNKNOWN",
            "problem":
            "Problema no identificado.",
            "cause":
            "No existen suficientes datos.",
            "priority":
            "media",
            "confidence":
            0.30,
            "ticket_required":
            False,
            "category":
            "unknown"
        }
# =========================================================
# Instancia global
# =========================================================
knowledge_engine = KnowledgeEngine()
