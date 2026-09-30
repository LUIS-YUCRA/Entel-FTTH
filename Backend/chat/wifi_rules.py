"""
=========================================================
WIFI_RULES.PY
Reglas de diagnóstico WiFi FTTH
Sistema FTTH - ENTEL
=========================================================
"""
WIFI_RULES = [
    # =====================================================
    # RED WIFI NO VISIBLE
    # =====================================================
    {
        "code": "WIFI_NOT_VISIBLE",
        "conditions": {
            "problem": "wifi_no_aparece"
        },
        "problem":
            "Red WiFi no visible",
        "cause":
            "El router puede tener desactivada la señal inalámbrica.",
        "priority":
            "media",
        "confidence":
            0.95,
        "ticket_required":
            False
    },
    # =====================================================
    # CONTRASEÑA WIFI
    # =====================================================
    {
        "code": "WIFI_PASSWORD_ERROR",
        "conditions": {
            "problem": "clave_wifi"
        },
        "problem":
            "Error de contraseña WiFi",
        "cause":
            "La clave ingresada no coincide con la configurada.",
        "priority":
            "baja",
        "confidence":
            0.94,
        "ticket_required":
            False
    },
    # =====================================================
    # SEÑAL DEBIL
    # =====================================================
    {
        "code": "WIFI_WEAK_SIGNAL",
        "conditions": {
            "problem":
                "wifi_debil"
        },
        "problem":
            "Señal WiFi débil",
        "cause":
            "Distancia excesiva o interferencias inalámbricas.",
        "priority":
            "media",
        "confidence":
            0.92,
        "ticket_required":
            False
    },
    # =====================================================
    # DESCONEXIONES
    # =====================================================
    {
        "code": "WIFI_DISCONNECT",
        "conditions": {
            "problem":
                "wifi_se_corta"
        },
        "problem":
            "Desconexiones frecuentes WiFi",
        "cause":
            "Posible interferencia o saturación de dispositivos.",
        "priority":
            "media",
        "confidence":
            0.93,
        "ticket_required":
            False
    },
    # =====================================================
    # WIFI LENTO
    # =====================================================
    {
        "code": "WIFI_SLOW",
        "conditions": {
            "problem":
                "wifi_lento"
        },
        "problem":
            "Velocidad WiFi lenta",
        "cause":
            "Interferencia, distancia o saturación.",
        "priority":
            "media",
        "confidence":
            0.94,
        "ticket_required":
            False
    },
    # =====================================================
    # INTERFERENCIA
    # =====================================================
    {
        "code": "WIFI_INTERFERENCE",
        "conditions": {
            "problem":
                "interferencia_wifi"
        },
        "problem":
            "Interferencia inalámbrica",
        "cause":
            "Otros equipos afectan la señal WiFi.",
        "priority":
            "media",
        "confidence":
            0.90,
        "ticket_required":
            False
    },
    # =====================================================
    # MUCHOS DISPOSITIVOS
    # =====================================================
    {
        "code": "WIFI_TOO_MANY_DEVICES",
        "conditions": {
            "problem":
                "muchos_dispositivos"
        },
        "problem":
            "Exceso de dispositivos conectados",
        "cause":
            "El router tiene demasiados clientes conectados.",
        "priority":
            "media",
        "confidence":
            0.91,
        "ticket_required":
            False
    },
    # =====================================================
    # WIFI DESACTIVADO
    # =====================================================
    {
        "code": "WIFI_DISABLED",
        "conditions": {
            "problem":
                "wifi_desactivado"
        },
        "problem":
            "WiFi desactivado",
        "cause":
            "La función inalámbrica del router está apagada.",
        "priority":
            "baja",
        "confidence":
            0.96,
        "ticket_required":
            False
    },
    # =====================================================
    # BANDA 2.4 GHZ
    # =====================================================
    {
        "code": "WIFI_24_FAILURE",
        "conditions": {
            "problem":
                "wifi_24"
        },
        "problem":
            "Problema en banda 2.4 GHz",
        "cause":
            "Posible saturación del canal inalámbrico.",
        "priority":
            "media",
        "confidence":
            0.88,
        "ticket_required":
            False
    },
    # =====================================================
    # BANDA 5 GHZ
    # =====================================================
    {
        "code": "WIFI_5G_FAILURE",
        "conditions": {
            "problem":
                "wifi_5g"
        },
        "problem":
            "Problema en banda 5 GHz",
        "cause":
            "Configuración o compatibilidad del dispositivo.",
        "priority":
            "media",
        "confidence":
            0.88,
        "ticket_required":
            False
    },
    # =====================================================
    # SIN ACCESO A INTERNET POR WIFI
    # =====================================================
    {
        "code": "WIFI_CONNECTED_NO_INTERNET",
        "conditions": {
            "problem":
                "wifi_sin_internet"
        },
        "problem":
            "Equipo conectado pero sin navegación",
        "cause":
            "Puede existir problema entre router y red FTTH.",
        "priority":
            "alta",
        "confidence":
            0.90,
        "ticket_required":
            True
    },
    # =====================================================
    # CONFIGURACION WIFI
    # =====================================================
    {
        "code": "WIFI_CONFIGURATION",
        "conditions": {
            "problem":
                "configuracion_wifi"
        },
        "problem":
            "Configuración WiFi incorrecta",
        "cause":
            "Parámetros inalámbricos incorrectos.",
        "priority":
            "media",
        "confidence":
            0.89,
        "ticket_required":
            False
    },
    # =====================================================
    # REINICIO ROUTER
    # =====================================================
    {
        "code": "WIFI_RESTART_REQUIRED",
        "conditions": {
            "problem":
                "reinicio_wifi"
        },
        "problem":
            "Reinicio recomendado",
        "cause":
            "El router puede requerir nueva sincronización.",
        "priority":
            "baja",
        "confidence":
            0.95,
        "ticket_required":
            False
    },
    # =====================================================
    # DISTANCIA ROUTER
    # =====================================================
    {
        "code": "WIFI_DISTANCE",
        "conditions": {
            "problem":
                "distancia_wifi"
        },
        "problem":
            "Distancia excesiva al router",
        "cause":
            "La señal disminuye por obstáculos físicos.",
        "priority":
            "baja",
        "confidence":
            0.93,
        "ticket_required":
            False
    },
    # =====================================================
    # FALLA GENERAL WIFI
    # =====================================================
    {
        "code": "WIFI_GENERAL_FAILURE",
        "conditions": {
            "intent":
                "problema_wifi"
        },
        "problem":
            "Falla general WiFi",
        "cause":
            "Se requiere diagnóstico adicional.",
        "priority":
            "media",
        "confidence":
            0.80,
        "ticket_required":
            False
    }
]
# print eliminado
print("Cantidad de reglas:", len(WIFI_RULES))
