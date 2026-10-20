"""Presentación sencilla; conserva por separado el diagnóstico técnico interno."""
import re
from knowledge_base import normalize_text

DEFINITIONS = {
    'nap': 'Es una caja de conexión que suele estar en los postes y distribuye internet a varias viviendas.',
    'ont': 'Es el equipo que recibe la señal del cable de fibra y permite conectarte a internet.',
    'los': 'Es una luz que avisa cuando el equipo no recibe correctamente la señal de internet.',
    'pon': 'Es una luz que muestra si el equipo está conectado a la red de fibra del proveedor.',
    'dns': 'Es un servicio que ayuda a encontrar las páginas cuando escribes sus nombres.',
    'dhcp': 'Permite que tus dispositivos reciban automáticamente los datos necesarios para conectarse a la red.',
    'gpon': 'Es una tecnología para distribuir internet por fibra a varias viviendas.',
    'olt': 'Es un equipo del proveedor que envía el servicio hacia las conexiones de fibra de los clientes.',
}

def definition(message):
    text = normalize_text(message)
    for term, answer in DEFINITIONS.items():
        if re.search(r'\b' + term + r'\b', text):
            return answer
    return '¿Qué término necesitas que te explique?'

def customer_reply(answer, message):
    # No ocultar etiquetas solicitadas expresamente por el cliente.
    if re.search(r'que es|significa|para que sirve', normalize_text(message)):
        return answer
    substitutions = (
        (r'\b(?:router\s*/\s*ONT|ONT\s*/\s*router|router|módem|modem|ONT)\b', 'equipo de internet'),
        (r'\b(?:la )?luz LOS roja\b', 'la luz roja'),
        (r'\b(?:la )?luz PON apagada\b', 'la luz de conexión apagada'),
        (r'\bseñal óptica\b', 'señal de internet'),
        (r'\bEthernet\b', 'cable de red'),
        (r'\bFTTH\b', 'internet por fibra'),
    )
    for pattern, replacement in substitutions:
        answer = re.sub(pattern, replacement, answer, flags=re.I)
    return answer
