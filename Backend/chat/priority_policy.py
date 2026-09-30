"""Política central de prioridad para reclamos FTTH de ENTEL."""

from copy import deepcopy
import unicodedata


def normalize_text(value):
    return " ".join(
        "".join(
            character
            for character in unicodedata.normalize("NFD", str(value).lower())
            if unicodedata.category(character) != "Mn"
        ).split()
    )


def _contains_any(text, phrases):
    return any(phrase in text for phrase in phrases)


def apply_priority_policy(diagnosis, context):
    """Aplica la prioridad solicitada usando falla, zona y tipo de cliente."""
    adjusted = deepcopy(diagnosis or {})
    history = context.get("conversation", {}).get("history", [])
    combined_text = normalize_text(" ".join(
        str(item.get("user", "")) for item in history if isinstance(item, dict)
    ))
    intent = context.get("intent", {}).get("intent", "desconocido")
    customer_category = normalize_text(
        (context.get("customer") or {}).get("customer_category", "HOGAR")
    ).upper()
    current = str(adjusted.get("priority", "MEDIA")).upper()
    reason = "Prioridad definida por el diagnóstico técnico."

    institution = _contains_any(combined_text, [
        "institucion", "hospital", "clinica", "centro de salud", "colegio",
        "escuela", "universidad", "alcaldia", "municipio", "empresa pequena",
        "pequena empresa", "negocio", "tienda", "oficina", "hotel", "farmacia",
        "restaurante", "unidad educativa", "sistema de ventas", "sistema de pedidos",
    ])
    populated_zone = _contains_any(combined_text, [
        "zona poblada", "zona urbana", "centro de la ciudad", "zona centrica",
        "barrio poblado", "muchos vecinos", "varias viviendas", "todo el barrio",
    ])
    medium_distance = _contains_any(combined_text, [
        "zona no tan alejada", "zona cercana", "cerca de la ciudad",
        "zona periurbana", "zona intermedia",
    ])
    remote_zone = _contains_any(combined_text, [
        "zona alejada", "zona rural", "comunidad alejada", "area remota",
        "lugar distante", "fuera del area urbana",
    ]) and not medium_distance
    service_problem = _contains_any(combined_text, [
        "internet", "wifi", "conexion", "servicio", "senal", "fibra",
    ])
    no_internet = intent == "sin_internet" or _contains_any(combined_text, [
        "no tengo internet", "sin internet", "no hay internet", "sin servicio",
        "no puedo navegar", "se fue el internet", "se cayo el internet",
    ])
    damaged_cable = intent == "fiber_cable_damage" or _contains_any(combined_text, [
        "cable danado", "cable roto", "cable cortado", "fibra danada",
        "fibra rota", "mordio el cable",
    ])
    slow_service = intent in ("internet_lento", "streaming") or _contains_any(combined_text, [
        "internet lento", "velocidad baja", "debajo del plan", "no llega la velocidad",
    ])
    powered_off = intent == "router_power" or _contains_any(combined_text, [
        "modem apagado", "router apagado", "modem no enciende", "router no enciende",
        "modem no prende", "router no prende",
    ])

    # La ubicación y el impacto colectivo tienen precedencia sobre la falla individual.
    if customer_category in ("NEGOCIO", "INSTITUCION"):
        current = "ALTA"
        reason = f"Cliente de categoría {customer_category}: impacto operativo elevado."
    elif (institution and service_problem) or populated_zone:
        current = "ALTA"
        reason = "Afecta a una institución, pequeña empresa o zona poblada."
    elif remote_zone:
        current = "BAJA"
        reason = "El reporte corresponde a una zona alejada o rural."
    elif medium_distance:
        current = "MEDIA"
        reason = "El reporte corresponde a una zona cercana o periurbana."
    elif powered_off:
        current = "ALTA"
        reason = "El equipo permanece apagado después de descartar energía y adaptador."
    elif no_internet:
        current = "ALTA"
        reason = "Existe pérdida total del servicio de internet."
    elif damaged_cable:
        current = "ALTA"
        reason = "Existe daño físico de fibra y pérdida del servicio."
    elif slow_service:
        current = "MEDIA"
        reason = "La degradación de velocidad requiere pruebas antes de escalar."

    adjusted["priority"] = current if current in ("ALTA", "MEDIA", "BAJA") else "MEDIA"
    adjusted["priority_reason"] = reason
    adjusted.setdefault("source_intent", intent)
    return adjusted
