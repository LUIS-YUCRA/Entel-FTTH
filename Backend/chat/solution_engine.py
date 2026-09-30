"""
=========================================================
SOLUTION_ENGINE.PY
Motor de soluciones FTTH
Consulta la base SOLUTIONS
Sistema Inteligente FTTH - ENTEL
=========================================================
"""
from solutions import SOLUTIONS
class SolutionEngine:
    def __init__(self):
        print(
            "Solution Engine FTTH cargado correctamente."
        )
    # =====================================================
    # Obtener solución
    # =====================================================
    def solve(self, diagnosis):
        if diagnosis is None:
            return self.default_solution()
        # Obtener el código de diagnóstico
        code = diagnosis.get("code")
        # Buscar solución por código
        solution = SOLUTIONS.get(code)
        # Si no hay solución específica, buscar por código general o usar default
        if solution is None:
            # Verificar si la diagnosis tiene steps propios
            if diagnosis.get("steps"):
                # Usar los steps de la diagnosis
                return {
                    "code": diagnosis.get("code", "UNKNOWN"),
                    "problem": diagnosis.get("problem", "Problema no identificado."),
                    "cause": diagnosis.get("cause", "Sin información."),
                    "steps": diagnosis.get("steps", [
                        "Reinicie la ONT y router.",
                        "Revise conexiones físicas.",
                        "Solicite soporte técnico si continúa la falla."
                    ]),
                    "priority": diagnosis.get("priority", "MEDIA"),
                    "requires_ticket": diagnosis.get("ticket_required", False),
                    "final_message": diagnosis.get("final_message", 
                        "Si después de estos pasos el problema persiste, se generará un ticket técnico.")
                }
            return self.default_solution()
        # Si hay solución, retornarla
        return solution
    # =====================================================
    # Solución por defecto
    # =====================================================
    def default_solution(self):
        return {
            "code":
            "UNKNOWN",
            "problem":
            "Problema no identificado.",
            "cause":
            "No existen datos suficientes.",
            "steps":[
                "Reinicie la ONT y router.",
                "Revise conexiones físicas.",
                "Solicite soporte técnico si continúa la falla."
            ],
            "priority":
            "MEDIA",
            "requires_ticket":
            False,
            "final_message":
            "Si después de estos pasos el problema persiste, se generará un ticket técnico."
        }
# =====================================================
# ÚNICA INSTANCIA GLOBAL
# =====================================================
solution_engine = SolutionEngine()
