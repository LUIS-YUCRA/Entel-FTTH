"""
=========================================================
RULES_POWER.PY
Reglas de diagnóstico relacionadas con energía eléctrica
del equipo FTTH.
Incluye:
- POWER apagado
- Router sin energía
- ONT apagada
- Fuente dañada
- Reinicios
- Voltaje inestable
- Sobrecalentamiento
Sistema FTTH - ENTEL
=========================================================
"""
POWER_RULES = [
    # =====================================================
    # 1. POWER APAGADO
    # =====================================================
    {
        "code": "POWER_OFF",
        "conditions": {
            "power": "apagado"
        },
        "problem":
            "Equipo sin alimentación eléctrica",
        "cause":
            "La ONT o router no recibe energía eléctrica.",
        "priority":
            "alta",
        "confidence":
            0.98,
        "ticket_required":
            False
    },
    # =====================================================
    # 2. ROUTER APAGADO
    # =====================================================
    {
        "code": "ROUTER_OFF",
        "conditions": {
            "device": "router",
            "power": "apagado"
        },
        "problem":
            "Router apagado",
        "cause":
            "El equipo no tiene alimentación.",
        "priority":
            "media",
        "confidence":
            0.96,
        "ticket_required":
            False
    },
    # =====================================================
    # 3. ONT APAGADA
    # =====================================================
    {
        "code": "ONT_OFF",
        "conditions": {
            "device": "ont",
            "power": "apagado"
        },
        "problem":
            "ONT apagada",
        "cause":
            "El equipo óptico no está encendido.",
        "priority":
            "alta",
        "confidence":
            0.97,
        "ticket_required":
            False
    },
    # =====================================================
    # 4. NO ENCIENDE
    # =====================================================
    {
        "code": "DEVICE_NO_POWER",
        "conditions": {
            "device_status": "no_enciende"
        },
        "problem":
            "Equipo no enciende",
        "cause":
            "Posible falla del adaptador o fuente eléctrica.",
        "priority":
            "alta",
        "confidence":
            0.95,
        "ticket_required":
            True
    },
    # =====================================================
    # 5. ADAPTADOR DESCONECTADO
    # =====================================================
    {
        "code": "POWER_ADAPTER_DISCONNECTED",
        "conditions": {
            "adapter": "desconectado"
        },
        "problem":
            "Adaptador desconectado",
        "cause":
            "El cable de alimentación no está conectado correctamente.",
        "priority":
            "media",
        "confidence":
            0.92,
        "ticket_required":
            False
    },
    # =====================================================
    # 6. FUENTE DAÑADA
    # =====================================================
    {
        "code": "POWER_SUPPLY_FAILURE",
        "conditions": {
            "adapter": "dañado"
        },
        "problem":
            "Fuente de alimentación defectuosa",
        "cause":
            "El adaptador no entrega energía estable.",
        "priority":
            "alta",
        "confidence":
            0.94,
        "ticket_required":
            True
    },
    # =====================================================
    # 7. REINICIOS CONSTANTES
    # =====================================================
    {
        "code": "DEVICE_RESTART",
        "conditions": {
            "restart": "constante"
        },
        "problem":
            "Reinicios frecuentes del equipo",
        "cause":
            "Posible falla eléctrica o daño del equipo.",
        "priority":
            "media",
        "confidence":
            0.90,
        "ticket_required":
            True
    },
    # =====================================================
    # 8. VOLTAJE INESTABLE
    # =====================================================
    {
        "code": "VOLTAGE_UNSTABLE",
        "conditions": {
            "voltage": "inestable"
        },
        "problem":
            "Problema de alimentación eléctrica",
        "cause":
            "Variaciones de voltaje afectan el funcionamiento.",
        "priority":
            "media",
        "confidence":
            0.91,
        "ticket_required":
            False
    },
    # =====================================================
    # 9. SOBRECARGA ELECTRICA
    # =====================================================
    {
        "code": "POWER_OVERLOAD",
        "conditions": {
            "power": "sobrecarga"
        },
        "problem":
            "Sobrecarga eléctrica",
        "cause":
            "El equipo puede estar conectado a una fuente inadecuada.",
        "priority":
            "media",
        "confidence":
            0.88,
        "ticket_required":
            False
    },
    # =====================================================
    # 10. EQUIPO CALIENTE
    # =====================================================
    {
        "code": "DEVICE_OVERHEAT",
        "conditions": {
            "temperature": "alta"
        },
        "problem":
            "Sobrecalentamiento del equipo",
        "cause":
            "El equipo no tiene ventilación adecuada.",
        "priority":
            "media",
        "confidence":
            0.89,
        "ticket_required":
            False
    },
    # =====================================================
    # 11. LED POWER PARPADEA
    # =====================================================
    {
        "code": "POWER_BLINK",
        "conditions": {
            "power": "parpadeando"
        },
        "problem":
            "Indicador POWER inestable",
        "cause":
            "Posible problema eléctrico o del equipo.",
        "priority":
            "media",
        "confidence":
            0.90,
        "ticket_required":
            True
    },
    # =====================================================
    # 12. CORTE ELECTRICO
    # =====================================================
    {
        "code": "HOME_POWER_FAILURE",
        "conditions": {
            "electricity": "sin_energia"
        },
        "problem":
            "Corte eléctrico domiciliario",
        "cause":
            "No existe suministro eléctrico.",
        "priority":
            "baja",
        "confidence":
            0.95,
        "ticket_required":
            False
    },
    # =====================================================
    # 13. FUENTE INTERMITENTE
    # =====================================================
    {
        "code": "POWER_INTERMITTENT",
        "conditions": {
            "power": "intermitente"
        },
        "problem":
            "Alimentación intermitente",
        "cause":
            "La fuente entrega energía irregular.",
        "priority":
            "media",
        "confidence":
            0.91,
        "ticket_required":
            True
    },
    # =====================================================
    # 14. EQUIPO BLOQUEADO
    # =====================================================
    {
        "code": "DEVICE_LOCKED",
        "conditions": {
            "device": "bloqueado"
        },
        "problem":
            "Equipo bloqueado",
        "cause":
            "El sistema requiere reinicio eléctrico.",
        "priority":
            "baja",
        "confidence":
            0.85,
        "ticket_required":
            False
    },
    # =====================================================
    # 15. FALLA GENERAL ENERGIA
    # =====================================================
    {
        "code": "GENERAL_POWER_FAILURE",
        "conditions": {
            "problem": "energia"
        },
        "problem":
            "Falla eléctrica del equipo FTTH",
        "cause":
            "No se puede garantizar alimentación estable.",
        "priority":
            "alta",
        "confidence":
            0.93,
        "ticket_required":
            True
    }
]
