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
        # Verificar si tiene mensaje final personalizado
        final_message = diagnosis.get("final_message")
        # Si tiene mensaje final, usarlo (nuevo formato)
        if final_message:
            text = ""
            # Título
            text += "🔎 DIAGNÓSTICO FTTH\n"
            text += "=" * 50 + "\n\n"
            # Problema
            text += "📌 PROBLEMA DETECTADO:\n"
            text += f"{diagnosis.get('problem', 'No identificado')}\n\n"
            # Causa
            text += "🔍 POSIBLE CAUSA:\n"
            text += f"{diagnosis.get('cause', 'Sin información')}\n\n"
            # Soluciones (pasos)
            steps = diagnosis.get("steps", [])
            if steps:
                text += "🛠️ PASOS RECOMENDADOS:\n"
                text += "-" * 30 + "\n"
                for step in steps:
                    text += f"{step}\n"
                text += "-" * 30 + "\n\n"
            # Prioridad
            priority = str(diagnosis.get("priority", "media")).lower()
            priority_icon = "🔴" if priority == "alta" else "🟡" if priority == "media" else "🟢"
            text += f"{priority_icon} Prioridad: {priority.upper()}\n\n"
            if diagnosis.get("priority_reason"):
                text += f"📍 Motivo de prioridad: {diagnosis['priority_reason']}\n\n"
            # Mensaje final personalizado
            text += "💬 " + final_message + "\n\n"
            # Ticket requerido
            if diagnosis.get("ticket_required", diagnosis.get("requires_ticket", False)):
                text += "⚠️ El problema requiere atención técnica.\n"
                text += "Puedo generar un ticket para que un técnico realice la revisión."
            else:
                text += "✅ Puede continuar probando estas recomendaciones."
            return text
        # Formato antiguo (compatibilidad)
        text = ""
        text += (
            "🔎 Diagnóstico FTTH\n"
        )
        text += (
            "====================\n\n"
        )
        # Código interno
        if diagnosis.get("code"):
            text += (
                f"Código: "
                f"{diagnosis['code']}\n\n"
            )
        # Problema
        text += (
            "Problema detectado:\n"
        )
        text += (
            diagnosis.get(
                "problem",
                "No identificado"
            )
            +
            "\n\n"
        )
        # Causa
        text += (
            "Posible causa:\n"
        )
        text += (
            diagnosis.get(
                "cause",
                "Sin información"
            )
            +
            "\n\n"
        )
        # Soluciones
        steps = diagnosis.get(
            "steps",
            []
        )
        if steps:
            text += (
                "Pasos recomendados:\n"
            )
            for index, step in enumerate(
                steps,
                start=1
            ):
                text += (
                    f"{index}. {step}\n"
                )
            text += "\n"
        # Prioridad
        if diagnosis.get(
            "priority"
        ):
            priority = str(diagnosis["priority"]).lower()
            priority_icon = "🔴" if priority == "alta" else "🟡" if priority == "media" else "🟢"
            text += (
                f"{priority_icon} Prioridad: "
                +
                priority
                +
                "\n\n"
            )
        # Confianza IA
        if diagnosis.get(
            "confidence"
        ):
            text += (
                "Confianza del diagnóstico: "
                +
                str(
                    diagnosis["confidence"]
                )
                +
                "\n\n"
            )
        # Ticket
        if diagnosis.get("ticket_required", diagnosis.get("requires_ticket", False)):
            text += (
                "⚠️ El problema requiere "
                "atención técnica.\n\n"
                "Puedo generar un ticket "
                "para que un técnico "
                "realice la revisión."
            )
        else:
            text += (
                "✅ Puede continuar "
                "probando estas recomendaciones."
            )
        return text
    # =====================================================
    # Mensaje creación ticket (MEJORADO)
    # =====================================================
    def ticket_message(
        self,
        action
    ):
        ticket = action.get(
            "ticket"
        )
        if ticket:
            ticket_id = ticket.get('ticket_id') or ticket.get('id')
            return (
                "🎫 ¡TICKET GENERADO CORRECTAMENTE!\n\n"
                f"📋 Número de ticket: {ticket_id}\n\n"
                "📌 Estado: PENDIENTE\n\n"
                "👨‍🔧 Un técnico revisará su servicio FTTH "
                "en las próximas horas.\n\n"
                "📱 Recibirá notificaciones sobre "
                "el estado de su reclamo.\n\n"
                "🙏 ¡Gracias por confiar en ENTEL!"
            )
        return (
            "❌ No se pudo generar el ticket técnico.\n\n"
            "Por favor, intenta nuevamente o comunícate "
            "al call center de ENTEL."
        )
    # =====================================================
    # Formatear estado de reclamo (NUEVA FUNCIÓN)
    # =====================================================
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
            estimado = tiempo_data.get("estimado", "2-4 horas")
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
            "⏳ El técnico está siendo asignado.\n\n"
            "Tiempo estimado de espera: 2-4 horas.\n"
            "Recibirá una notificación cuando esté en camino."
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
