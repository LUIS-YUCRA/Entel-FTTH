"""
=========================================================
RESPONSE_GENERATOR.PY
Generador inteligente de respuestas FTTH
Convierte las acciones del asistente en mensajes
comprensibles para el cliente.
Sistema Inteligente FTTH - ENTEL
=========================================================
"""
class ResponseGenerator:
    def __init__(self):
        print(
            "Response Generator FTTH cargado correctamente."
        )
    # =====================================================
    # Método principal
    # =====================================================
    def generate(self, action):
        if action is None:
            return (
                "No pude procesar la información "
                "del problema."
            )
        response_type = action.get(
            "type",
            "MESSAGE"
        )
        # =================================================
        # Mensaje normal
        # =================================================
        if response_type == "MESSAGE":
            return action.get(
                "message",
                "Hola, ¿en qué puedo ayudarte?"
            )
        # =================================================
        # Pregunta al usuario
        # =================================================
        if response_type == "ASK":
            return action.get(
                "message",
                "Necesito más información."
            )
        # =================================================
        # Diagnóstico técnico
        # =================================================
        if response_type == "DIAGNOSIS":
            diagnosis = action.get(
                "diagnosis"
            )
            if diagnosis is None:
                return (
                    "No pude determinar "
                    "el diagnóstico del servicio."
                )
            return self.format_diagnosis(
                diagnosis
            )
        # =================================================
        # Creación de ticket
        # =================================================
        if response_type == "TICKET":
            return self.ticket_message(
                action
            )
        # =================================================
        # Consulta de estado (NUEVO)
        # =================================================
        if response_type == "ESTADO_RECLAMO":
            return self.format_estado_reclamo(
                action
            )
        # =================================================
        # Tiempo del técnico (NUEVO)
        # =================================================
        if response_type == "TIEMPO_TECNICO":
            return self.format_tiempo_tecnico(
                action
            )
        return (
            "No tengo una respuesta "
            "disponible para este caso."
        )
    # =====================================================
    # Formatear diagnóstico (MEJORADO)
    # =====================================================
    def format_diagnosis(
        self,
        diagnosis
    ):
        steps = diagnosis.get('steps') or []
        if steps:
            return str(steps[0])
        return 'Podría requerirse una revisión técnica para identificar la causa.'

    def ticket_message(
        self,
        action
    ):
        # Python sólo propone: Node confirma después de guardar en PostgreSQL.
        return 'La solicitud está lista para registrarse.'

    def format_estado_reclamo(
        self,
        action
    ):
        ticket_data = action.get("ticket_data", {})
        if ticket_data:
            estado = ticket_data.get("estado", "PENDIENTE")
            ticket_id = ticket_data.get("ticket_id", "No disponible")
            fecha = ticket_data.get("fecha", "No disponible")
            tecnico = ticket_data.get("tecnico", "No asignado")
            estado_icon = "🔴" if estado == "PENDIENTE" else "🟡" if estado == "EN_PROCESO" else "🟢" if estado == "RESUELTO" else "🔵"
            return (
                "📋 ESTADO DE SU RECLAMO\n"
                "=" * 40 + "\n\n"
                f"🎫 Ticket: {ticket_id}\n"
                f"{estado_icon} Estado: {estado}\n"
                f"📅 Fecha: {fecha}\n"
                f"👨‍🔧 Técnico: {tecnico}\n\n"
                "📱 Recibirá notificaciones cuando haya cambios.\n\n"
                "¿Necesita algo más?"
            )
        return (
            "🔍 No encontré información de su reclamo.\n\n"
            "Por favor, proporcione su número de ticket "
            "para consultarlo."
        )
    # =====================================================
    # Formatear tiempo del técnico (NUEVA FUNCIÓN)
    # =====================================================
    def format_tiempo_tecnico(
        self,
        action
    ):
        tiempo_data = action.get("tiempo_data", {})
        if tiempo_data:
            estimado = tiempo_data.get("estimado", "Sin horario confirmado")
            tecnico = tiempo_data.get("tecnico", "No asignado")
            estado = tiempo_data.get("estado", "PENDIENTE")
            estado_icon = "🔴" if estado == "PENDIENTE" else "🟡" if estado == "EN_CAMINO" else "🟢" if estado == "LLEGO" else "🔵"
            mensaje = (
                "⏰ TIEMPO DE LLEGADA DEL TÉCNICO\n"
                "=" * 40 + "\n\n"
            )
            if estado == "EN_CAMINO":
                mensaje += "🚐 El técnico está en camino.\n"
            elif estado == "LLEGO":
                mensaje += "✅ El técnico ha llegado.\n"
            else:
                mensaje += "⏳ El técnico está siendo asignado.\n"
            mensaje += (
                f"\n👨‍🔧 Técnico: {tecnico}\n"
                f"⏱️ Tiempo estimado: {estimado}\n"
                f"{estado_icon} Estado: {estado}\n\n"
                "📱 Recibirá notificaciones en tiempo real.\n"
                "📍 Puede seguir la ubicación del técnico en el mapa."
            )
            return mensaje
        return (
            "Consulta la fecha de visita en Mis tickets. No tengo un horario confirmado para tu solicitud."
        )
    # =====================================================
    # Obtener mensaje de bienvenida (NUEVA FUNCIÓN)
    # =====================================================
    def get_welcome_message(self, nombre=None):
        if nombre:
            return (
                f"👋 ¡Hola {nombre}!\n\n"
                "Soy el Asistente Inteligente FTTH de ENTEL.\n"
                "Estoy aquí para ayudarte con tu servicio de internet.\n\n"
                "Puedo ayudarte con:\n"
                "📡 Problemas de conexión\n"
                "🐌 Velocidad lenta\n"
                "🔌 Problemas con el módem\n"
                "📋 Consultar tu reclamo\n\n"
                "Cuéntame, ¿qué problema tienes?"
            )
        return (
            "👋 ¡Hola! Soy el Asistente Inteligente FTTH de ENTEL.\n\n"
            "Estoy aquí para ayudarte con tu servicio de internet.\n\n"
            "Puedo ayudarte con:\n"
            "📡 Problemas de conexión\n"
            "🐌 Velocidad lenta\n"
            "🔌 Problemas con el módem\n"
            "📋 Consultar tu reclamo\n\n"
            "Cuéntame, ¿qué problema tienes?"
        )
    # =====================================================
    # Obtener mensaje de despedida (NUEVA FUNCIÓN)
    # =====================================================
    def get_farewell_message(self):
        return (
            "👋 ¡Hasta luego!\n\n"
            "Gracias por comunicarte con ENTEL.\n"
            "Si necesitas ayuda nuevamente, aquí estaré.\n\n"
            "¡Que tengas un excelente día! 🌟"
        )
    # =====================================================
    # Obtener mensaje de agradecimiento (NUEVA FUNCIÓN)
    # =====================================================
    def get_thanks_message(self):
        return (
            "🌟 ¡Gracias a ti!\n\n"
            "Es un placer ayudarte.\n"
            "Si necesitas algo más, aquí estoy.\n\n"
            "¡Que tengas un excelente día! 😊"
        )
    # =====================================================
    # Obtener mensaje de error (NUEVA FUNCIÓN)
    # =====================================================
    def get_error_message(self, error_type="default"):
        errors = {
            "conexion": (
                "❌ No pude conectarme al sistema.\n\n"
                "Por favor, verifica tu conexión a internet "
                "e intenta nuevamente."
            ),
            "ticket": (
                "❌ No pude generar el ticket.\n\n"
                "Por favor, intenta nuevamente o comunícate "
                "al call center de ENTEL."
            ),
            "default": (
                "❌ Ocurrió un error inesperado.\n\n"
                "Por favor, intenta nuevamente más tarde."
            )
        }
        return errors.get(error_type, errors["default"])
# =========================================================
# Instancia global
# =========================================================
response_generator = ResponseGenerator()
