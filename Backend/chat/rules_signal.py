"""
=========================================================
RULES_SIGNAL.PY
Reglas de diagnóstico para señal óptica FTTH
Incluye:
- LOS rojo
- LOS apagado
- LOS parpadeando
- pérdida de señal óptica
- fibra desconectada
- baja potencia óptica
Sistema FTTH - ENTEL
=========================================================
"""
SIGNAL_RULES = [
    # =====================================================
    # 1. LOS ROJO
    # =====================================================
    {
        "code": "LOSS_SIGNAL",
        "conditions": {
            "intent": "sin_internet",
            "problem": "sin_internet",
            "los": "rojo"
        },
        "problem": "Pérdida de señal óptica",
        "cause":
            "La ONT no recibe correctamente la señal óptica desde la central.",
        "priority": "alta",
        "confidence": 0.99,
        "ticket_required": True
    },
    # =====================================================
    # 2. LOS ROJO SIN INTERNET
    # =====================================================
    {
        "code": "LOS_RED_NO_SERVICE",
        "conditions": {
            "los": "rojo",
            "internet": "sin_servicio"
        },
        "problem":
            "Falla de enlace óptico",
        "cause":
            "Existe pérdida entre la ONT del cliente y la OLT de ENTEL.",
        "priority":
            "alta",
        "confidence":
            0.98,
        "ticket_required":
            True
    },
    # =====================================================
    # 3. LOS PARPADEANDO
    # =====================================================
    {
        "code": "LOS_BLINKING",
        "conditions": {
            "los": "parpadeando"
        },
        "problem":
            "Señal óptica inestable",
        "cause":
            "La potencia óptica recibida presenta variaciones.",
        "priority":
            "alta",
        "confidence":
            0.95,
        "ticket_required":
            True
    },
    # =====================================================
    # 4. LOS APAGADO
    # =====================================================
    {
        "code": "LOS_OFF",
        "conditions": {
            "los": "apagado",
            "problem": "sin_internet"
        },
        "problem":
            "Indicador LOS apagado sin conexión",
        "cause":
            "La ONT no muestra alarma óptica pero no existe comunicación.",
        "priority":
            "media",
        "confidence":
            0.85,
        "ticket_required":
            False
    },
    # =====================================================
    # 5. FIBRA DESCONECTADA
    # =====================================================
    {
        "code": "FIBER_DISCONNECTED",
        "conditions": {
            "fiber": "desconectada"
        },
        "problem":
            "Fibra óptica desconectada",
        "cause":
            "El conector óptico no está correctamente instalado.",
        "priority":
            "alta",
        "confidence":
            0.97,
        "ticket_required":
            True
    },
    # =====================================================
    # 6. FIBRA DOBLADA
    # =====================================================
    {
        "code": "FIBER_BEND",
        "conditions": {
            "fiber": "doblada"
        },
        "problem":
            "Fibra óptica doblada",
        "cause":
            "La curvatura afecta la transmisión de luz óptica.",
        "priority":
            "media",
        "confidence":
            0.90,
        "ticket_required":
            False
    },
    # =====================================================
    # 7. CABLE FIBRA DAÑADO
    # =====================================================
    {
        "code": "FIBER_DAMAGE",
        "conditions": {
            "fiber": "dañada"
        },
        "problem":
            "Daño físico en fibra óptica",
        "cause":
            "El cable presenta cortes o deterioro físico.",
        "priority":
            "alta",
        "confidence":
            0.96,
        "ticket_required":
            True
    },
    # =====================================================
    # 8. SIN POTENCIA OPTICA
    # =====================================================
    {
        "code": "NO_OPTICAL_POWER",
        "conditions": {
            "optical_power": "ausente"
        },
        "problem":
            "Ausencia de potencia óptica",
        "cause":
            "La ONT no recibe señal desde la red FTTH.",
        "priority":
            "alta",
        "confidence":
            0.98,
        "ticket_required":
            True
    },
    # =====================================================
    # 9. BAJA POTENCIA OPTICA
    # =====================================================
    {
        "code": "LOW_OPTICAL_POWER",
        "conditions": {
            "optical_power": "baja"
        },
        "problem":
            "Baja potencia óptica",
        "cause":
            "La señal llega con niveles inferiores al recomendado.",
        "priority":
            "media",
        "confidence":
            0.94,
        "ticket_required":
            True
    },
    # =====================================================
    # 10. MICRO CORTES
    # =====================================================
    {
        "code": "OPTICAL_INTERMITTENCE",
        "conditions": {
            "connection": "intermitente"
        },
        "problem":
            "Intermitencia de conexión",
        "cause":
            "Variaciones en la señal óptica o conectores defectuosos.",
        "priority":
            "media",
        "confidence":
            0.91,
        "ticket_required":
            True
    },
    # =====================================================
    # 11-20 RESERVADAS PARA AMPLIACIÓN
    # =====================================================
    {
        "code": "OLT_NO_RESPONSE",
        "conditions": {
            "olt": "sin_respuesta"
        },
        "problem":
            "Sin comunicación con OLT",
        "cause":
            "La ONT perdió comunicación con la central.",
        "priority":
            "alta",
        "confidence":
            0.97,
        "ticket_required":
            True
    },
    {
        "code": "OPTICAL_SIGNAL_DROP",
        "conditions": {
            "signal": "caida"
        },
        "problem":
            "Caída de señal óptica",
        "cause":
            "Interrupción temporal del enlace FTTH.",
        "priority":
            "alta",
        "confidence":
            0.95,
        "ticket_required":
            True
    },
    {
        "code": "ONT_UNREGISTERED",
        "conditions": {
            "ont": "no_registrada"
        },
        "problem":
            "ONT no registrada",
        "cause":
            "El equipo no aparece registrado en la OLT.",
        "priority":
            "alta",
        "confidence":
            0.96,
        "ticket_required":
            True
    },
    {
        "code": "OPTICAL_CONNECTOR",
        "conditions": {
            "connector": "problema"
        },
        "problem":
            "Problema en conector óptico",
        "cause":
            "El conector puede estar flojo o contaminado.",
        "priority":
            "media",
        "confidence":
            0.90,
        "ticket_required":
            False
    },
    {
        "code": "SIGNAL_WEAK",
        "conditions": {
            "signal": "debil"
        },
        "problem":
            "Señal óptica débil",
        "cause":
            "Nivel óptico insuficiente.",
        "priority":
            "media",
        "confidence":
            0.90,
        "ticket_required":
            True
    }
]
