"""
=========================================================
SOLUTIONS.PY
Base de conocimiento de soluciones FTTH
Contiene:
- Problema
- Causa
- Pasos recomendados
- Prioridad
- Ticket requerido
Sistema Inteligente FTTH - ENTEL
=========================================================
"""
SOLUTIONS = {
    # =====================================================
    # SOLUCIÓN GENERAL PARA NO_INTERNET (NUEVA)
    # =====================================================
    "NO_INTERNET_GENERAL": {
        "code": "NO_INTERNET_GENERAL",
        "problem": "Tu servicio de internet no está funcionando correctamente.",
        "cause": "Puede ser un problema de conexión, configuración o señal.",
        "steps": [
            "1️⃣ Reinicia tu módem desconectándolo de la corriente por 30 segundos.",
            "2️⃣ Vuelve a conectarlo y espera 2 minutos.",
            "3️⃣ Verifica que todos los cables estén bien conectados.",
            "4️⃣ Revisa si la luz LOS o PON de tu módem está en rojo o apagada.",
            "5️⃣ Si después de estos pasos el internet no funciona, te ayudaré con el siguiente paso."
        ],
        "priority": "ALTA",
        "requires_ticket": False,
        "final_message": "Si después de reiniciar el módem y verificar los cables el internet no funciona, necesitaré más información sobre las luces de tu módem para ayudarte mejor."
    },
    # =====================================================
    # SOLUCIÓN GENERAL PARA INTERNET_LENTO (NUEVA)
    # =====================================================
    "INTERNET_LENTO_GENERAL": {
        "code": "INTERNET_LENTO_GENERAL",
        "problem": "Tu servicio de internet está funcionando con velocidad reducida.",
        "cause": "Puede ser por saturación de dispositivos, interferencia WiFi o problemas de configuración.",
        "steps": [
            "1️⃣ Reinicia tu módem desconectándolo por 30 segundos.",
            "2️⃣ Desconecta dispositivos que no estés usando (celulares, tablets, etc.).",
            "3️⃣ Realiza una prueba de velocidad en speedtest.net.",
            "4️⃣ Si usas WiFi, prueba conectarte por cable LAN para descartar interferencia."
        ],
        "priority": "MEDIA",
        "requires_ticket": False,
        "final_message": "Si después de estos pasos la velocidad sigue baja, generaré un ticket para revisión técnica."
    },
    # =====================================================
    # SOLUCIÓN GENERAL PARA WIFI_PASSWORD (NUEVA)
    # =====================================================
    "WIFI_PASSWORD_GENERAL": {
        "code": "WIFI_PASSWORD_GENERAL",
        "problem": "Recuperación de contraseña WiFi.",
        "cause": "El cliente no recuerda la contraseña de su red WiFi.",
        "steps": [
            "1️⃣ Ubica tu módem y revisa la etiqueta en la parte inferior o trasera.",
            "2️⃣ La contraseña suele estar escrita como 'Clave WPA' o 'Contraseña'.",
            "3️⃣ Si no la encuentras, puedes restablecer la configuración de fábrica.",
            "4️⃣ Presiona el botón reset del módem por 10 segundos (se reiniciará).",
            "5️⃣ La contraseña volverá a la que viene por defecto en la etiqueta."
        ],
        "priority": "BAJA",
        "requires_ticket": False,
        "final_message": "Si no puedes encontrar la contraseña o necesitas ayuda para restablecerla, avísame y te guiaré paso a paso."
    },
    # =====================================================
    # SOLUCIÓN GENERAL PARA HABLAR_OPERADOR (NUEVA)
    # =====================================================
    "HABLAR_OPERADOR_GENERAL": {
        "code": "HABLAR_OPERADOR_GENERAL",
        "problem": "El cliente solicita atención de un operador o técnico.",
        "cause": "El cliente necesita asistencia personalizada.",
        "steps": [
            "1️⃣ Un operador se contactará contigo en las próximas horas.",
            "2️⃣ Por favor, ten a mano tu número de contrato.",
            "3️⃣ Si es urgente, puedes llamar al número de atención de ENTEL."
        ],
        "priority": "MEDIA",
        "requires_ticket": True,
        "final_message": "He registrado tu solicitud. Un operador se comunicará contigo para brindarte la asistencia necesaria."
    },
    # =====================================================
    # SOLUCIÓN GENERAL PARA ESTADO_RECLAMO (NUEVA)
    # =====================================================
    "ESTADO_RECLAMO_GENERAL": {
        "code": "ESTADO_RECLAMO_GENERAL",
        "problem": "Consulta de estado de reclamo.",
        "cause": "El cliente quiere saber el estado de su ticket de atención.",
        "steps": [
            "1️⃣ Proporciona el número de ticket que se te entregó.",
            "2️⃣ Si no lo tienes, ingresa tu número de contrato y lo buscaremos.",
            "3️⃣ Te informaremos si está: Pendiente, En proceso, Resuelto, Cerrado.",
            "4️⃣ Si hay demora, podemos escalar tu caso a prioridad alta."
        ],
        "priority": "MEDIA",
        "requires_ticket": False,
        "final_message": "¿Tienes tu número de ticket a mano? Con él puedo consultar el estado exacto de tu reclamo."
    },
    # =====================================================
    # SOLUCIÓN GENERAL PARA TIEMPO_TECNICO (NUEVA)
    # =====================================================
    "TIEMPO_TECNICO_GENERAL": {
        "code": "TIEMPO_TECNICO_GENERAL",
        "problem": "Consulta de tiempo de llegada del técnico.",
        "cause": "El cliente quiere saber cuándo llegará el técnico a su domicilio.",
        "steps": [
            "1️⃣ El técnico tiene un horario estimado de llegada de 2 a 4 horas.",
            "2️⃣ Recibirás una notificación cuando el técnico esté en camino.",
            "3️⃣ Puedes consultar el estado de tu ticket en el sistema de seguimiento."
        ],
        "priority": "MEDIA",
        "requires_ticket": False,
        "final_message": "¿Tienes tu número de ticket? Con él puedo darte información más precisa sobre el estado de tu visita técnica."
    },
    # =====================================================
    # SOLUCIÓN GENERAL PARA STREAMING (NUEVA)
    # =====================================================
    "STREAMING_GENERAL": {
        "code": "STREAMING_GENERAL",
        "problem": "Problemas de reproducción de video o streaming.",
        "cause": "Ancho de banda insuficiente o muchas conexiones activas.",
        "steps": [
            "1️⃣ Desconecta otros dispositivos que estén usando internet.",
            "2️⃣ Reduce la calidad de video en la plataforma de streaming.",
            "3️⃣ Conecta el dispositivo por cable LAN en lugar de WiFi.",
            "4️⃣ Realiza una prueba de velocidad en speedtest.net.",
            "5️⃣ Si persiste, reinicia el módem por 30 segundos."
        ],
        "priority": "MEDIA",
        "requires_ticket": False,
        "final_message": "Si después de estos pasos el streaming sigue con problemas, generaré un ticket para revisión técnica."
    },
    # =====================================================
    # SOLUCIÓN GENERAL PARA CONSULTA_GENERAL (NUEVA)
    # =====================================================
    "CONSULTA_GENERAL": {
        "code": "CONSULTA_GENERAL",
        "problem": "Consulta general sobre el servicio FTTH.",
        "cause": "El cliente necesita información sobre el funcionamiento del servicio.",
        "steps": [
            "1️⃣ FTTH significa Fibra hasta el Hogar (Fiber To The Home).",
            "2️⃣ Es un servicio de internet de alta velocidad que usa fibra óptica.",
            "3️⃣ La fibra óptica ofrece mayor velocidad y estabilidad que el cobre.",
            "4️⃣ La velocidad contratada se mide en Mbps (megabits por segundo)."
        ],
        "priority": "BAJA",
        "requires_ticket": False,
        "final_message": "¿Tienes alguna otra pregunta sobre el servicio FTTH? Estoy aquí para ayudarte."
    },
    # =====================================================
    # SOLUCIÓN GENERAL PARA MODEM_PROBLEMAS (NUEVA)
    # =====================================================
    "MODEM_PROBLEMAS_GENERAL": {
        "code": "MODEM_PROBLEMAS_GENERAL",
        "problem": "Problemas físicos con el módem.",
        "cause": "El módem presenta temperatura alta, ruido o reinicios.",
        "steps": [
            "1️⃣ Verifica que el módem esté en un lugar ventilado.",
            "2️⃣ Asegúrate de que no tenga objetos encima.",
            "3️⃣ Si está muy caliente, apágalo y espera 10 minutos.",
            "4️⃣ Si el módem se reinicia solo, puede ser falla eléctrica."
        ],
        "priority": "MEDIA",
        "requires_ticket": False,
        "final_message": "Si el módem sigue con problemas, generaré un ticket para revisión del equipo."
    },
    # =====================================================
    # SOLUCIÓN GENERAL PARA INSTALACION_FTTH (NUEVA)
    # =====================================================
    "INSTALACION_FTTH_GENERAL": {
        "code": "INSTALACION_FTTH_GENERAL",
        "problem": "Consulta sobre instalación de FTTH.",
        "cause": "El cliente quiere contratar o saber sobre la instalación.",
        "steps": [
            "1️⃣ La instalación de FTTH es realizada por técnicos especializados.",
            "2️⃣ El proceso incluye: instalación de fibra, configuración del módem y pruebas.",
            "3️⃣ La instalación tiene un costo que varía según la zona.",
            "4️⃣ Puedes solicitar tu instalación en el multicentro o vía web."
        ],
        "priority": "BAJA",
        "requires_ticket": False,
        "final_message": "¿Te gustaría que te contacte un asesor comercial para más información sobre la instalación?"
    },
    # =====================================================
    # SOLUCIÓN GENERAL PARA FACTURACION (NUEVA)
    # =====================================================
    "FACTURACION_GENERAL": {
        "code": "FACTURACION_GENERAL",
        "problem": "Consulta sobre facturación del servicio.",
        "cause": "El cliente tiene dudas sobre el costo de su servicio.",
        "steps": [
            "1️⃣ Tu factura se genera mensualmente según el plan contratado.",
            "2️⃣ Puedes consultar tu factura en la app de ENTEL o en entel.bo.",
            "3️⃣ El pago se puede realizar en agencias, bancos o vía web.",
            "4️⃣ Si tienes descuentos o promociones, aparecen en tu factura."
        ],
        "priority": "BAJA",
        "requires_ticket": False,
        "final_message": "¿Necesitas ayuda con algún detalle específico de tu facturación?"
    },
    # =====================================================
    # FALLAS ÓPTICAS (ORIGINALES)
    # =====================================================
    "LOSS_SIGNAL": {
        "code": "LOSS_SIGNAL",
        "problem": "Pérdida de señal óptica.",
        "cause": "La ONT no recibe correctamente la señal óptica desde la central.",
        "steps": [
            "Verifique que el cable de fibra esté correctamente conectado.",
            "Compruebe que la fibra no esté doblada o dañada.",
            "Revise el conector óptico.",
            "Reinicie la ONT durante 10 segundos.",
            "Espere 3 minutos para la sincronización."
        ],
        "priority": "ALTA",
        "requires_ticket": True
    },
    "LOS_RED_NO_SERVICE": {
        "code": "LOS_RED_NO_SERVICE",
        "problem": "Falla de enlace óptico.",
        "cause": "La ONT no recibe señal desde la central OLT.",
        "steps": [
            "Verifique la conexión de fibra óptica.",
            "Revise si existe daño físico en la fibra.",
            "Reinicie la ONT.",
            "Si continúa la falla requiere revisión técnica."
        ],
        "priority": "ALTA",
        "requires_ticket": True
    },
    "PON_OFF": {
        "code": "PON_OFF",
        "problem": "Sin sincronización GPON.",
        "cause": "La ONT no logra comunicarse con la OLT.",
        "steps": [
            "Revise el cable de fibra.",
            "Reinicie la ONT.",
            "Espere la sincronización."
        ],
        "priority": "ALTA",
        "requires_ticket": True
    },
    # =====================================================
    # ENERGÍA (ORIGINALES)
    # =====================================================
    "POWER_OFF": {
        "code": "POWER_OFF",
        "problem": "Equipo sin alimentación eléctrica.",
        "cause": "La ONT o router no recibe energía.",
        "steps": [
            "Revise el adaptador eléctrico.",
            "Compruebe el tomacorriente.",
            "Reinicie el equipo."
        ],
        "priority": "MEDIA",
        "requires_ticket": False
    },
    "ROUTER_OFF": {
        "code": "ROUTER_OFF",
        "problem": "Router apagado.",
        "cause": "El equipo no está encendido correctamente.",
        "steps": [
            "Verifique el botón de encendido.",
            "Compruebe la fuente eléctrica.",
            "Reinicie el router."
        ],
        "priority": "MEDIA",
        "requires_ticket": False
    },
    # =====================================================
    # WIFI (ORIGINALES)
    # =====================================================
    "WIFI_GENERAL_FAILURE": {
        "code": "WIFI_GENERAL_FAILURE",
        "problem": "Problema de conexión WiFi.",
        "cause": "Interferencia o configuración incorrecta de la red inalámbrica.",
        "steps": [
            "Reinicie el router.",
            "Acérquese al equipo.",
            "Desconecte dispositivos innecesarios.",
            "Verifique contraseña WiFi."
        ],
        "priority": "MEDIA",
        "requires_ticket": False
    },
    # =====================================================
    # VELOCIDAD (ORIGINALES)
    # =====================================================
    "LOW_SPEED": {
        "code": "LOW_SPEED",
        "problem": "Velocidad de internet reducida.",
        "cause": "Saturación, interferencia WiFi o exceso de dispositivos.",
        "steps": [
            "Realice prueba de velocidad.",
            "Pruebe conexión mediante cable LAN.",
            "Reinicie el router.",
            "Desconecte equipos innecesarios."
        ],
        "priority": "MEDIA",
        "requires_ticket": False
    }
}
