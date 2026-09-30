
import uuid
from datetime import datetime
class TicketEngine:
    def __init__(self):
        print(
            "Ticket FTTH cargado correctamente."
        )
    # =====================================================
    # Crear ticket
    # =====================================================
    def create_ticket(
        self,
        diagnosis,
        customer=None
    ):
        if diagnosis is None:
            return {
                "created": False,
                "message":
                "No existe diagnóstico."
            }
        ticket = {
            "ticket_id":
            self.generate_ticket_id(),
            "created_at":
            datetime.now().isoformat(),
            "customer":
            customer
            if customer
            else "Cliente no identificado",
            "code":
            diagnosis.get(
                "code"
            ),
            "problem":
            diagnosis.get(
                "problem"
            ),
            "cause":
            diagnosis.get(
                "cause"
            ),
            "priority":
            diagnosis.get(
                "priority",
                "MEDIA"
            ),
            "confidence":
            diagnosis.get(
                "confidence",
                0
            ),
            "status":
            "PENDIENTE"
        }
        return {
            "created": True,
            "ticket": ticket
        }
    # =====================================================
    # Generar código ticket
    # =====================================================
    def generate_ticket_id(
        self
    ):
        return (
            "TK-"
            +
            uuid.uuid4()
            .hex[:8]
            .upper()
        )
    # =====================================================
    # Validar necesidad ticket
    # =====================================================
    def requires_ticket(
        self,
        diagnosis
    ):
        if diagnosis is None:
            return False
        return diagnosis.get(
            "ticket_required",
            False
        )
ticket_engine = TicketEngine()
