"""
Servicio de dominio para generar tickets desde el diagnóstico.

La persistencia se realiza únicamente en la API Node.js para mantener una
sola transacción, un solo esquema PostgreSQL y evitar tickets duplicados.
"""
from ticket_engine import ticket_engine


class TicketService:
    def create_ticket(self, diagnosis, customer=None):
        if diagnosis is None:
            return {"created": False, "message": "Diagnóstico vacío."}
        if not ticket_engine.requires_ticket(diagnosis):
            return {"created": False, "message": "No requiere ticket."}
        return ticket_engine.create_ticket(diagnosis, customer)


ticket_service = TicketService()
