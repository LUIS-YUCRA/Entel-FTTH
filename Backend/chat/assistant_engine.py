"""
ASSISTANT_ENGINE.PY
Orquestador principal del asistente inteligente FTTH
Sistema Inteligente FTTH - ENTEL
"""
from dialog_manager import dialog_manager
from solution_engine import solution_engine
from response_generator import response_generator
from memory import memory
class AssistantEngine:
    def __init__(self):
        print(
            "Assistant Engine FTTH cargado correctamente."
        )
        # Estado de conversación
        self.waiting_confirmation = False
        self.pending_diagnosis = None
    # =====================================================
    # Procesar mensaje
    # =====================================================
    def process(self, message, intent=None, entities=None):
        # Todas las confirmaciones pasan por el estado persistido del diálogo.
        dialog_result = dialog_manager.process_message(
            message=message,
            intent=intent,
            entities=entities
        )
        # Verificar si dialog_result es un diccionario
        if isinstance(dialog_result, str):
            return {
                "response": dialog_result,
                "dialog": None,
                "diagnosis": None,
                "ticket": None
            }
        action = dialog_result.get(
            "action",
            {}
        )
        action_type = action.get(
            "type"
        )
        # -------------------------------------------------
        # Mensajes normales o preguntas
        # -------------------------------------------------
        if action_type in ["MESSAGE", "ASK"]:
            return {
                "response":
                response_generator.generate(
                    action
                ),
                "dialog":
                dialog_result,
                "diagnosis":
                None,
                "ticket":
                None
            }
        # -------------------------------------------------
        # Diagnóstico
        # -------------------------------------------------
        if action_type == "DIAGNOSIS":
            diagnosis_from_dialog = action.get("diagnosis")
            if diagnosis_from_dialog:
                # Guardar diagnóstico pendiente
                self.pending_diagnosis = diagnosis_from_dialog
                memory.get_context()["conversation"]["solution_step"] = 0
                response = response_generator.generate({
                    "type": "DIAGNOSIS",
                    "diagnosis": diagnosis_from_dialog
                })
                response += (
                    "\n\n"
                    "¿La conexión ya funciona?"
                )
                return {
                    "response": response,
                    "dialog": dialog_result,
                    "diagnosis": diagnosis_from_dialog,
                    "ticket": None
                }
        # -------------------------------------------------
        # Creación de ticket
        # -------------------------------------------------
        if action_type == "TICKET":
            ticket = action.get("ticket")
            return {
                "response":
                response_generator.generate(
                    action
                ),
                "dialog":
                dialog_result,
                "diagnosis":
                None,
                "ticket":
                ticket
            }
        # -------------------------------------------------
        # Error
        # -------------------------------------------------
        return {
            "response":
            "No pude procesar la solicitud.",
            "dialog":
            dialog_result,
            "diagnosis":
            None,
            "ticket":
            None
        }
    # =====================================================
    # Crear ticket desde diagnóstico
    # =====================================================
    def _create_ticket_from_diagnosis(self, diagnosis):
        if diagnosis is None:
            return {"response": "No hay diagnóstico para generar un ticket.", "dialog": None, "diagnosis": None, "ticket": None}
        memory.set_diagnosis(diagnosis)
        memory.set_dialog_state('WAITING_TICKET_CONFIRMATION')
        return {"response": "¿Deseas que registre un ticket para revisión técnica?",
                "dialog": None, "diagnosis": diagnosis, "ticket": None}
# =========================================================
# Instancia global
# =========================================================
assistant_engine = AssistantEngine()
