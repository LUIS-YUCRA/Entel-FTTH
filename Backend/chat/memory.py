"""
MEMORY.PY
Memoria conversacional del Asistente Inteligente FTTH.
Responsable de almacenar el contexto completo de la conversación
entre el cliente y el asistente.
Sistema Inteligente FTTH - ENTEL
"""
import sys
class ConversationMemory:
    def __init__(self):
        self.clear()
    # =====================================================
    # Reiniciar conversación
    # =====================================================
    def clear(self):
        self.context = {
            # -----------------------------------------
            # Información de la conversación
            # -----------------------------------------
            "conversation": {
                "step": 0,
                "finished": False,
                "dialog_state": "START",
                "history": []
            },
            # -----------------------------------------
            # Intención detectada
            # -----------------------------------------
            "intent": {
                "intent": "desconocido",
                "confidence": 0.0
            },
            # -----------------------------------------
            # Entidades acumuladas
            # -----------------------------------------
            "entities": {
                "device": None,
                "problem": None,
                "indicator": None,
                "color": None,
                "time": None,
                "numbers": [],
                "raw_matches": [],
                "lights": {
                    "power": None,
                    "pon": None,
                    "los": None,
                    "wifi": None,
                    "internet_led": None
                }
            },
            # -----------------------------------------
            # Diagnóstico encontrado
            # -----------------------------------------
            "diagnosis": None,
            # -----------------------------------------
            # Solución propuesta
            # -----------------------------------------
            "solution": None,
            # -----------------------------------------
            # Ticket generado
            # -----------------------------------------
            "ticket": None,
            # -----------------------------------------
            # Información del cliente
            # -----------------------------------------
            "customer": None,
            # -----------------------------------------
            # Estados de conversación
            # -----------------------------------------
            "flags": {
                "waiting_confirmation": False,
                "waiting_ticket_confirmation": False
            }
        }
    def load_context(self, context):
        """Restaura un contexto previamente persistido por la API."""
        if not isinstance(context, dict) or not context:
            self.clear()
            return
        self.context = context
    # =====================================================
    # Actualizar memoria
    # =====================================================
    def update(self, intent, entities, message):
        # Guardar intención correctamente
        if intent and isinstance(intent, dict):
            self.context["intent"]["intent"] = intent.get(
                "intent",
                "desconocido"
            )
            self.context["intent"]["confidence"] = intent.get(
                "confidence",
                0
            )
        else:
            self.context["intent"]["intent"] = intent if intent else "desconocido"
            self.context["intent"]["confidence"] = 0.0
        # Actualizar entidades
        if entities and isinstance(entities, dict):
            old_entities = self.context["entities"]
            for key, value in entities.items():
                if key == "lights":
                    for light, state in value.items():
                        if state is not None:
                            old_entities["lights"][light] = state
                elif key == "raw_matches":
                    if value:
                        old_entities["raw_matches"] = value
                elif key in old_entities:
                    if value is not None:
                        old_entities[key] = value
                else:
                    old_entities[key] = value
            self.context["entities"] = old_entities
        # Agregar al historial
        self.context["conversation"]["history"].append({
            "user": message,
            "intent": self.context["intent"]["intent"],
            "timestamp": "now"
        })
        self.context["conversation"]["step"] += 1
    # =====================================================
    # Contexto completo
    # =====================================================
    def get_context(self):
        return self.context
    # =====================================================
    # Entidades
    # =====================================================
    def get_entities(self):
        return self.context["entities"]
    # =====================================================
    # Intent
    # =====================================================
    def get_intent(self):
        return self.context["intent"]
    # =====================================================
    # Diagnóstico
    # =====================================================
    def set_diagnosis(self, diagnosis):
        from priority_policy import apply_priority_policy

        adjusted = apply_priority_policy(diagnosis, self.context)
        # Se actualiza también el objeto recibido para que solution_engine
        # muestre exactamente la misma prioridad que luego tendrá el ticket.
        if isinstance(diagnosis, dict):
            diagnosis.clear()
            diagnosis.update(adjusted)
        self.context["diagnosis"] = adjusted
    def get_diagnosis(self):
        return self.context["diagnosis"]
    # =====================================================
    # Solución
    # =====================================================
    def set_solution(self, solution):
        self.context["solution"] = solution
    def get_solution(self):
        return self.context["solution"]
    # =====================================================
    # Ticket
    # =====================================================
    def set_ticket(self, ticket):
        self.context["ticket"] = ticket
    def get_ticket(self):
        return self.context["ticket"]
    # =====================================================
    # Cliente
    # =====================================================
    def set_customer(self, customer):
        self.context["customer"] = customer
    def get_customer(self):
        return self.context["customer"]
    # =====================================================
    # Estado del diálogo
    # =====================================================
    def set_dialog_state(self, state):
        self.context["conversation"]["dialog_state"] = state
    def get_dialog_state(self):
        return self.context["conversation"]["dialog_state"]
    # =====================================================
    # Confirmación de solución
    # =====================================================
    def set_waiting_confirmation(self, value=True):
        self.context["flags"]["waiting_confirmation"] = value
    def is_waiting_confirmation(self):
        return self.context["flags"]["waiting_confirmation"]
    # =====================================================
    # Confirmación de ticket
    # =====================================================
    def set_waiting_ticket_confirmation(self, value=True):
        self.context["flags"]["waiting_ticket_confirmation"] = value
    def is_waiting_ticket_confirmation(self):
        return self.context["flags"]["waiting_ticket_confirmation"]
    # =====================================================
    # Conversación finalizada
    # =====================================================
    def finish(self):
        self.context["conversation"]["finished"] = True
        self.context["conversation"]["dialog_state"] = "FINISHED"
    def is_finished(self):
        return self.context["conversation"]["finished"]
    # =====================================================
    # Historial
    # =====================================================
    def get_history(self):
        return self.context["conversation"]["history"]
    # =====================================================
    # Paso actual
    # =====================================================
    def get_step(self):
        return self.context["conversation"]["step"]
    # =====================================================
    # Mostrar memoria (Debug)
    # =====================================================
    def show(self):
        print("\n========== MEMORIA FTTH ==========")
        print("Estado :", self.get_dialog_state())
        print("Intent :", self.get_intent())
        # print eliminado
        for k, v in self.get_entities().items():
            print(f"  {k}: {v}")
        print("Diagnóstico :", self.get_diagnosis())
        print("Solución :", self.get_solution())
        print("Ticket :", self.get_ticket())
        print("Cliente :", self.get_customer())
        print("Historial :", len(self.get_history()))
        # print eliminado
# =====================================================
# Instancia global
# =====================================================
memory = ConversationMemory()
