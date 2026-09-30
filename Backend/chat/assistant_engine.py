"""
ASSISTANT_ENGINE.PY
Orquestador principal del asistente inteligente FTTH
Sistema Inteligente FTTH - ENTEL
"""
from dialog_manager import dialog_manager
from solution_engine import solution_engine
from response_generator import response_generator
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
        message_lower = message.lower().strip()
        # =================================================
        # ¿Está esperando confirmación?
        # =================================================
        if self.waiting_confirmation:
            # ---------------------------------------------
            # El usuario indica que SI funcionó
            # ---------------------------------------------
            if message_lower in [
                "si",
                "sí",
                "funciono",
                "funcionó",
                "ya funciona",
                "solucionado",
                "resuelto",
                "listo",
                "ok",
                "perfecto"
            ]:
                self.waiting_confirmation = False
                self.pending_diagnosis = None
                return {
                    "response":
                    (
                        "Excelente.\n\n"
                        "Me alegra que el problema se haya solucionado.\n"
                        "Si necesitas ayuda nuevamente estaré disponible."
                    ),
                    "dialog": None,
                    "diagnosis": None,
                    "ticket": None
                }
            # ---------------------------------------------
            # El usuario indica que NO funcionó
            # ---------------------------------------------
            if message_lower in [
                "no",
                "no funciona",
                "continua",
                "continúa",
                "sigue igual",
                "persiste",
                "no se soluciono",
                "no se solucionó",
                "igual",
                "sigue"
            ]:
                self.waiting_confirmation = False
                # Generar ticket automáticamente
                return self._create_ticket_from_diagnosis(self.pending_diagnosis)
            return {
                "response":
                (
                    "Por favor responde únicamente:\n\n"
                    "SI\n"
                    "o\n"
                    "NO"
                ),
                "dialog": None,
                "diagnosis": self.pending_diagnosis,
                "ticket": None
            }
        # -------------------------------------------------
        # Procesar conversación con dialog_manager
        # -------------------------------------------------
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
                self.waiting_confirmation = True
                response = response_generator.generate({
                    "type": "DIAGNOSIS",
                    "diagnosis": diagnosis_from_dialog
                })
                response += (
                    "\n\n"
                    "¿Los pasos recomendados solucionaron el problema?\n"
                    "Responde SI o NO"
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
        from ticket_service import ticket_service
        from memory import memory
        if diagnosis is None:
            return {
                "response": "No hay diagnóstico para generar un ticket.",
                "dialog": None,
                "diagnosis": None,
                "ticket": None
            }
        customer = memory.get_customer()
        # Asegurar que el diagnóstico tenga ticket_required = True
        if not diagnosis.get("ticket_required", False):
            diagnosis["ticket_required"] = True
        result = ticket_service.create_ticket(
            diagnosis,
            customer
        )
        if result.get("created"):
            ticket = result["ticket"]
            memory.set_ticket(ticket)
            memory.finish()
            self.waiting_confirmation = False
            self.pending_diagnosis = None
            return {
                "response": f"🎫 ¡TICKET GENERADO CORRECTAMENTE!\n\n📋 Número de ticket: {ticket['ticket_id']}\n\n📌 Estado: PENDIENTE\n\n👨‍🔧 Un técnico revisará su servicio FTTH en las próximas horas.\n\n📱 Recibirá notificaciones sobre el estado de su reclamo.\n\n¡Gracias por confiar en ENTEL!",
                "dialog": None,
                "diagnosis": diagnosis,
                "ticket": ticket
            }
        return {
            "response": "❌ No fue posible generar el ticket técnico. Por favor, intenta nuevamente.",
            "dialog": None,
            "diagnosis": diagnosis,
            "ticket": None
        }
# =========================================================
# Instancia global
# =========================================================
assistant_engine = AssistantEngine()
