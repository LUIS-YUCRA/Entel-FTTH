"""Base de conocimiento conversacional para soporte ENTEL FTTH y móvil."""

from copy import deepcopy
import unicodedata


def normalize_text(value):
    normalized = " ".join(
        "".join(
            character
            for character in unicodedata.normalize("NFD", str(value).lower())
            if unicodedata.category(character) != "Mn"
        ).replace("¿", "").replace("?", "").replace("¡", "").replace("!", "").split()
    )
    corrections = {
        "clasese": "clases", "clasees": "clases", "internte": "internet",
        "wiffi": "wifi", "wifii": "wifi", "conecion": "conexion",
        "coneccion": "conexion", "enrutador": "router", "moden": "modem",
    }
    return " ".join(corrections.get(word, word) for word in normalized.split())


# Ejemplos coloquiales y variaciones frecuentes de los clientes.
KNOWLEDGE_INTENT_EXAMPLES = {
    "sin_internet": [
        "no tengo internet", "no funciona el internet", "se fue el internet",
        "no tenemos internet", "estamos sin internet", "nos quedamos sin internet",
        "el negocio esta sin internet", "la institucion esta sin internet",
        "no podemos cobrar por falta de internet", "no funciona el sistema de ventas",
        "no carga ninguna pagina", "estoy sin servicio", "no tengo conexion",
        "no puedo navegar", "no puedo entrar a internet", "no tengo acceso a internet",
        "no hay internet", "estoy sin internet", "no conecta", "no abre ninguna pagina",
        "no puedo entrar a google", "mi internet dejo de funcionar", "no hay servicio",
        "se cayo el internet", "no puedo usar el wifi", "no tengo wifi",
        "no puedo conectarme", "no funciona mi servicio", "sin conexion a internet",
    ],
    "internet_lento": [
        "mi internet esta lento", "internet lento", "esta muy lento", "demora mucho",
        "el internet esta muy lento", "tenemos el internet lento",
        "internet lento en todas las computadoras", "internet lento en la institucion",
        "internet lento en el negocio", "el sistema de ventas esta lento",
        "las paginas cargan lento", "todo esta lento", "descarga muy lento",
        "no llega la velocidad", "mi plan dice otra velocidad", "tengo mucha latencia",
        "esta muy pesado", "va lento", "no carga rapido", "la velocidad es baja",
        "tengo 100 megas pero navega lento", "el internet esta horrible", "tengo señal lenta",
    ],
    "streaming": [
        "no puedo ver videos", "netflix se congela", "netflix se traba",
        "youtube tarda", "youtube se pausa", "los videos no cargan",
        "se corta el video", "streaming lento", "las series se congelan",
        "clases virtuales", "videollamada se congela", "llamadas se cortan",
        "imagen se congela", "no escucho bien", "no escucha bien",
        "internet lento cuando estoy en clases", "internet lento cuando estoy en llamada",
        "llamada se corta", "problemas en videollamada",
    ],
    "router_restarts": [
        "mi router se apaga", "el router se reinicia", "se apaga solo",
        "cada rato se apaga", "se reinicia solo", "se apaga y prende",
        "las luces desaparecen", "el modem se reinicia", "el router falla",
        "pierde energia", "el modem esta caliente", "router sobrecalentado",
        "parpadea y se reinicia", "el equipo se reinicia cada rato",
        "mi router es antiguo", "mi router se calienta", "quiero cambiarlo",
    ],
    "router_power": [
        "router apagado", "modem apagado", "el router no prende",
        "router no prende", "no prende ninguna luz", "ninguna luz enciende",
        "el modem no funciona", "router no enciende", "modem no enciende",
        "mi bateria no enciende", "la bateria del router no enciende",
        "el adaptador no funciona", "el equipo no tiene energia",
        "parece que esta danado no prende", "no prende",
    ],
    "los_rojo": [
        "luz roja", "los rojo", "esta en rojo", "la luz los esta roja",
        "parpadea rojo", "mi modem tiene una luz roja", "esta encendida la luz roja",
        "la luz pon esta apagada", "led los rojo", "los parpadea en rojo",
    ],
    "fiber_cable_damage": [
        "el cable esta roto", "se rompio el cable", "el cable esta danado",
        "el cable esta cortado", "la fibra se rompio", "mi perro mordio el cable",
        "se doblo el cable", "la fibra esta partida", "cable de fibra suelto",
        "arrancaron el cable de internet", "cortaron mi fibra",
        "el cable de fibra esta danado", "mi cable de fibra esta danado",
        "mi cable de fibra esta roto", "el cable de fibra esta roto",
        "la fibra optica esta danada", "la fibra optica esta rota",
        "aplaste el cable de fibra", "cable de fibra aplastado", "pise el cable de fibra",
        "doble el cable del internet", "moviendo un mueble doble el cable",
        "cable de fibra esta cortado", "cable de fibra cortado",
    ],
    "wifi_not_visible": [
        "el wifi no aparece", "no sale mi wifi", "no encuentro la red",
        "mi celular no detecta la red", "no aparece el nombre del wifi",
        "desaparecio mi red wifi", "no veo mi wifi en el telefono",
        "la red inalambrica no aparece", "no puedo encontrar el ssid",
    ],
    "wifi_password": [
        "no puedo ingresar la contrasena", "olvide la clave del wifi",
        "no recuerdo mi contrasena", "como ver la clave del wifi",
        "quiero cambiar la contrasena wifi", "cambiar clave wifi",
        "la contrasena del wifi no funciona", "donde esta la clave wifi",
    ],
    "internet_intermittent": [
        "el internet se corta y vuelve", "se corta cada cinco minutos",
        "el internet va y vuelve", "se cae el sistema de pedidos",
        "los pedidos dejan de ingresar", "se corta el internet del negocio",
        "internet intermitente", "la conexion es inestable", "se desconecta solo",
        "se corta mientras navego", "va y vuelve", "pierdo conexion por momentos",
        "el wifi se desconecta a cada rato", "tengo cortes frecuentes",
    ],
    "wifi_weak": [
        "el wifi llega debil", "tengo poca senal wifi", "el wifi no llega a mi cuarto",
        "solo funciona cerca del router", "una raya de wifi", "wifi con poco alcance",
        "la senal wifi es baja", "en el segundo piso no llega el wifi",
        "casi no llega el wifi", "a mi cuarto casi no llega el wifi",
        "a mi habitacion casi no llega el wifi", "en mi habitacion casi no llega el wifi",
        "wifi se pierde", "se pierde el wifi", "planta baja", "primer piso",
    ],
    "ethernet_problem": [
        "el cable de red no funciona", "no conecta por ethernet", "puerto lan no funciona",
        "por cable no tengo internet", "mi computadora no conecta por cable",
        "cable utp sin conexion", "la red cableada no funciona",
    ],
    "single_device_issue": [
        "solo un celular no tiene internet", "funciona en todos menos en mi telefono",
        "solo mi computadora no conecta", "un dispositivo no tiene internet",
        "el wifi funciona en otros equipos", "solo falla en mi laptop",
        "solo mi laptop no conecta", "solo mi telefono no conecta",
        "mi celular no se conecta al internet", "mi celular no se conecta",
    ],
    "gaming_latency": [
        "tengo ping alto", "mucho lag al jugar", "los juegos tienen latencia",
        "se congela el juego online", "pierdo paquetes", "packet loss",
        "el ping sube demasiado", "lag en videojuegos",
    ],
    "website_only_issue": [
        "solo una pagina no abre", "no puedo entrar a una pagina pero hay internet",
        "algunas paginas no cargan", "una aplicacion no conecta",
        "internet funciona pero un sitio no", "error dns", "no resuelve la pagina",
    ],
    "storm_damage": [
        "hubo una tormenta y el router no prende", "router danado por tormenta",
        "despues de un rayo no enciende", "sobrecarga electrica en el modem",
        "se quemo el router", "olor a quemado en el modem", "tormenta electrica router",
    ],
    "cable_theft": [
        "robaron cables en mi barrio", "robo de cobre", "cortaron cables en la zona",
        "se robaron el cableado", "todo el barrio sin internet por robo",
        "robaron la fibra", "danaron el cableado del barrio",
        "robaron cables en mi zona", "robaron cables en el barrio",
        "robaron claves en mi barrio", "rabaron claves en mi barrio",
    ],
    "mobile_data_slow": [
        "mis datos moviles estan lentos", "internet movil lento", "4g lento", "5g lento",
        "tengo datos pero no carga", "los datos del celular no funcionan",
        "apenas carga una foto con datos", "mi navegacion movil esta lenta",
    ],
    "mobile_no_signal": [
        "no tengo senal de celular", "no puedo hacer llamadas", "sin servicio en el celular",
        "solo emergencias", "mi sim no tiene senal", "telefono sin cobertura",
        "no entran llamadas", "no salen llamadas", "celular sin red movil",
    ],
    "service_sla": [
        "cuanto tardan en arreglar el internet", "plazo de atencion",
        "tiempo para reparar mi servicio", "acuerdo de nivel de servicio",
        "en cuanto tiempo llega el tecnico", "cuanto demora una averia",
        "cuanto tiempo tienen para reparar", "plazo del ticket",
    ],
    "ftth_info": [
        "que es ftth", "como funciona la fibra optica", "diferencia entre fibra y cobre",
        "que significa fibra hasta el hogar", "para que sirve la ont",
    ],
    "instalacion_ftth": [
        "quiero contratar fibra", "como instalar internet en mi casa",
        "quiero una nueva instalacion", "hay cobertura de fibra en mi zona",
        "requisitos para instalar ftth", "quiero contratar internet hogar",
    ],
    "facturacion": [
        "quiero ver mi factura", "cuanto debo pagar", "donde pago el internet",
        "mi factura esta mal", "me cobraron de mas", "fecha de vencimiento de mi factura",
        "quiero consultar mi deuda", "como pagar mi servicio",
    ],
    "relocation_service": [
        "quiero trasladar mi internet", "me cambie de domicilio",
        "mover el servicio a otra casa", "traslado de linea ftth",
        "quiero cambiar la direccion de instalacion",
    ],
    "consulta_general": [
        "tengo una duda", "quiero consultar", "necesito informacion",
        "quiero preguntar algo", "tengo una consulta", "podria ayudarme",
        "quiero hacer una pregunta", "necesito orientacion",
    ],
    "router_restart_help": [
        "como reiniciar mi router", "como reinicio el router", "como reiniciar el modem",
        "quiero reiniciar mi router", "ayuda para reiniciar el router",
    ],
    "estado_reclamo": [
        "como va mi ticket", "estado de mi reclamo", "consultar mi ticket",
        "seguimiento de averia", "quiero saber el estado de mi caso",
    ],
    "tiempo_tecnico": [
        "cuando viene el tecnico", "tecnico no llega", "hora de visita tecnica",
        "demora del tecnico", "cuando atenderan mi ticket",
    ],
    "hablar_operador": [
        "quiero hablar con un operador", "necesito un tecnico", "soporte humano",
        "comunicarme con soporte", "quiero reportar un problema",
        "quiero que venga un tecnico", "quiero que vengan a solucionar mi internet",
        "que vengan a mi domicilio", "tecnico en mi domicilio",
        "necesito un tecnico en mi domicilio", "quiero una visita tecnica",
        "que solucionen mi servicio", "quiero atencion en mi casa",
    ],
    "router_general": [
        "router", "modem", "mi router", "mi modem", "problema con el router",
    ],
    "internet_general": [
        "internet", "wifi", "mi internet", "mi wifi", "problema de internet",
        "tengo problemas con mi red", "tengo problema con mi red",
        "tengo problema de mi servicio", "tengo un problema con internet",
    ],
    "saludo": [
        "hola", "buenos dias", "buenas tardes", "buenas noches", "que tal",
        "hola asistente", "buen dia",
    ],
    "agradecimiento": [
        "gracias", "muchas gracias", "te agradezco", "muy amable", "perfecto gracias",
    ],
    "despedida": [
        "adios", "hasta luego", "nos vemos", "hasta pronto", "gracias adios",
    ],
}


TECHNICAL_INTENT_ORDER = [
    "storm_damage", "cable_theft", "fiber_cable_damage", "mobile_no_signal",
    "mobile_data_slow", "hablar_operador", "router_restarts", "router_power",
    "website_only_issue", "single_device_issue", "ethernet_problem", "gaming_latency",
    "wifi_weak", "wifi_password", "wifi_not_visible", "internet_intermittent", "streaming",
    "internet_lento", "sin_internet", "los_rojo", "router_restart_help", "service_sla", "ftth_info",
    "estado_reclamo", "tiempo_tecnico", "relocation_service",
    "instalacion_ftth", "facturacion",
]


SUPPORT_GUIDES = {
    "router_restart_help": {
        "flow": "message",
        "message": (
            "Para reiniciar el router de forma segura, desconéctalo de la corriente durante un minuto, "
            "vuelve a conectarlo y espera hasta tres minutos a que estabilicen sus luces. No presiones el botón RESET, "
            "porque puede borrar la configuración. Después comprueba si regresó el servicio."
        ),
    },
    "router_restarts": {
        "flow": "diagnosis",
        "diagnosis": {
            "code": "ROUTER_RESTARTING",
            "problem": "El router u ONT se apaga o reinicia de forma inesperada.",
            "cause": "Puede existir sobrecalentamiento, una fuente de poder inestable o una falla del equipo.",
            "steps": [
                "Coloca el equipo en un lugar ventilado y retira objetos que bloqueen sus rejillas.",
                "Desconéctalo durante 5 minutos para que se enfríe.",
                "Conéctalo directamente a un tomacorriente que sepas que funciona.",
                "Verifica que el adaptador no esté flojo, caliente, roto o con olor a quemado.",
                "Observa si vuelve a reiniciarse durante los siguientes minutos.",
            ],
            "priority": "MEDIA", "ticket_required": True,
            "final_message": "Si vuelve a apagarse o reiniciarse, el equipo debe ser revisado por un técnico.",
        },
    },
    "router_power": {
        "flow": "diagnosis",
        "diagnosis": {
            "code": "ROUTER_POWER_FAILURE",
            "problem": "El router, ONT, adaptador o respaldo de energía no enciende.",
            "cause": "Puede faltar energía, estar flojo el adaptador o existir una falla en la fuente de poder.",
            "steps": [
                "Confirma que el tomacorriente funciona conectando otro equipo de bajo consumo.",
                "Ajusta el conector de energía del router y revisa el botón de encendido.",
                "Si utilizas regulador o batería de respaldo, prueba temporalmente el adaptador original directo al tomacorriente.",
                "No uses el adaptador si está roto, demasiado caliente o tiene olor a quemado.",
            ],
            "priority": "BAJA", "ticket_required": True,
            "final_message": "Si ninguna luz enciende, puedo registrar un ticket para revisar el equipo y su fuente de poder.",
        },
    },
    "fiber_cable_damage": {
        "flow": "ticket_confirmation",
        "message": (
            "El cable de fibra óptica es delicado y no debe empalmarse ni manipularse sin herramientas especializadas. "
            "Evita doblarlo, pegarlo o mirar directamente al conector. La reparación por daño físico puede estar sujeta "
            "a evaluación técnica y a las condiciones vigentes del servicio."
        ),
        "diagnosis": {
            "code": "FIBER_CABLE_DAMAGED", "problem": "Cable de fibra óptica roto, cortado, doblado o mordido.",
            "cause": "Daño físico visible en la acometida o cable interior de fibra.",
            "steps": ["No manipules el extremo del cable.", "Mantén a personas y mascotas alejadas del área dañada."],
            "priority": "MEDIA", "ticket_required": True,
        },
    },
    "wifi_not_visible": {
        "flow": "diagnosis",
        "diagnosis": {
            "code": "WIFI_NETWORK_NOT_VISIBLE",
            "problem": "El nombre de la red WiFi no aparece en el celular o computadora.",
            "cause": "La radio WiFi puede estar desactivada, el router saturado o el dispositivo fuera de alcance.",
            "steps": [
                "Comprueba que el router esté encendido y que la luz WiFi o WLAN esté activa.",
                "Acércate al router y activa y desactiva el WiFi del celular.",
                "Reinicia el router y espera de 2 a 3 minutos.",
                "Busca también la red de 2.4 GHz si tu equipo no es compatible con 5 GHz.",
                "Evita restablecer el router de fábrica sin asistencia, porque se borrará su configuración.",
            ],
            "priority": "MEDIA", "ticket_required": False,
            "final_message": "Si la red continúa sin aparecer en ningún dispositivo, el WiFi del router requiere revisión.",
        },
    },
    "wifi_password": {
        "flow": "message",
        "message": (
            "Busca la clave WiFi en la etiqueta del router u ONT, identificada como WLAN Key, WPA Key o contraseña. "
            "Si la clave fue cambiada, puedes revisarla desde un dispositivo que ya esté conectado o solicitar ayuda "
            "para cambiarla. No restablezcas el router de fábrica por tu cuenta: puede borrar la configuración FTTH. "
            "Nunca compartas aquí contraseñas, códigos ni datos bancarios."
        ),
    },
    "wifi_weak": {
        "flow": "diagnosis",
        "diagnosis": {
            "code": "WIFI_WEAK_SIGNAL", "problem": "La señal WiFi tiene poco alcance en parte del domicilio.",
            "cause": "La distancia, muros, pisos, objetos metálicos o interferencias reducen la cobertura inalámbrica.",
            "steps": [
                "Coloca el router alto, abierto y lo más centrado posible en el domicilio.",
                "Evita esconderlo en muebles o ubicarlo junto a microondas, televisores y objetos metálicos.",
                "Usa 2.4 GHz para mayor alcance y 5 GHz cuando estés cerca y necesites más velocidad.",
                "Compara la conexión cerca del router para confirmar que el acceso FTTH funciona correctamente.",
                "Si la vivienda es amplia, evalúa una solución mesh o un punto de acceso correctamente cableado.",
            ],
            "priority": "BAJA", "ticket_required": False,
            "final_message": "La cobertura WiFi depende del entorno; ampliar señal no siempre implica una falla de la fibra.",
        },
    },
    "ethernet_problem": {
        "flow": "diagnosis",
        "diagnosis": {
            "code": "ETHERNET_CONNECTION_FAILURE", "problem": "Un equipo no obtiene conexión mediante cable de red.",
            "cause": "Puede fallar el cable Ethernet, el puerto LAN o la configuración de red del equipo.",
            "steps": [
                "Verifica que ambos conectores hagan clic y observa si enciende la luz del puerto LAN.",
                "Prueba otro cable Ethernet conocido y otro puerto LAN del router.",
                "Reinicia únicamente el equipo conectado y deja la obtención de IP y DNS en automático.",
                "Prueba el mismo cable con otro dispositivo para identificar dónde está la falla.",
            ],
            "priority": "MEDIA", "ticket_required": False,
            "final_message": "Si ningún puerto LAN funciona con cables y equipos distintos, el router requiere revisión.",
        },
    },
    "single_device_issue": {
        "flow": "message",
        "message": (
            "Si los demás equipos navegan, la fibra y el router probablemente están operativos. En el equipo afectado, "
            "olvida la red WiFi y vuelve a conectarte, activa y desactiva el modo avión, reinícialo y comprueba que fecha, "
            "hora, IP y DNS estén en automático. No generes una avería FTTH hasta probar otro dispositivo en la misma ubicación."
        ),
    },
    "gaming_latency": {
        "flow": "diagnosis",
        "diagnosis": {
            "code": "HIGH_LATENCY_GAMING", "problem": "Se presenta latencia alta, lag o pérdida de paquetes al jugar.",
            "cause": "Puede influir el WiFi, consumo simultáneo, la ruta hacia el servidor o la ubicación del servidor del juego.",
            "steps": [
                "Conecta la consola o computadora mediante cable Ethernet.",
                "Pausa descargas, copias en la nube y transmisiones de otros equipos.",
                "Selecciona un servidor de juego geográficamente cercano.",
                "Registra ping y pérdida de paquetes en distintos horarios y también fuera del juego.",
            ],
            "priority": "MEDIA", "ticket_required": False,
            "final_message": "Un ping alto dentro de un único juego no confirma por sí solo una falla del servicio FTTH.",
        },
    },
    "website_only_issue": {
        "flow": "message",
        "message": (
            "Si otras páginas funcionan, probablemente no existe una caída total del servicio. Prueba el sitio en modo "
            "privado, en otro navegador y en otro dispositivo; revisa que fecha y hora sean correctas y deja DNS en automático. "
            "Si solo falla una aplicación o página en varios tipos de conexión, el inconveniente puede estar en ese servicio."
        ),
    },
    "internet_intermittent": {
        "flow": "diagnosis",
        "diagnosis": {
            "code": "INTERNET_INTERMITTENT", "problem": "La conexión se corta y vuelve repetidamente.",
            "cause": "Puede deberse a interferencia WiFi, un cable flojo o pérdida intermitente de señal óptica.",
            "steps": [
                "Prueba la conexión cerca del router y, si es posible, mediante cable de red.",
                "Coloca el router en un lugar alto y alejado de microondas, televisores y objetos metálicos.",
                "Verifica si la luz LOS parpadea o se enciende en rojo durante el corte.",
                "Revisa que los cables estén firmes sin doblar la fibra.",
                "Anota la hora y frecuencia de los cortes para incluirlas en el diagnóstico.",
            ],
            "priority": "MEDIA", "ticket_required": True,
            "final_message": "Si también se corta por cable o la luz LOS cambia, corresponde una revisión técnica.",
        },
    },
    "storm_damage": {
        "flow": "ticket_confirmation",
        "message": (
            "Una descarga eléctrica puede dañar el adaptador o el router. Desconecta el equipo si está caliente, "
            "produce chispas o tiene olor a quemado; no intentes abrirlo ni uses otro adaptador incompatible."
        ),
        "diagnosis": {
            "code": "ELECTRICAL_STORM_DAMAGE", "problem": "Equipo sin funcionamiento después de una tormenta.",
            "cause": "Posible daño eléctrico en el adaptador, router u ONT.",
            "steps": ["Mantén el equipo desconectado si hay señales de daño.", "Solicita una revisión técnica segura."],
            "priority": "ALTA", "ticket_required": True,
        },
    },
    "cable_theft": {
        "flow": "ticket_confirmation",
        "message": (
            "No puedo confirmar desde aquí si existe un incidente zonal activo. Si observas cables caídos o dañados, "
            "no los toques y mantén distancia. Registrar el sector y tu servicio ayuda a relacionar el caso con una avería externa."
        ),
        "diagnosis": {
            "code": "EXTERNAL_NETWORK_DAMAGE", "problem": "Posible daño o robo de cableado en el sector.",
            "cause": "Avería externa que puede afectar a varios clientes de la zona.",
            "steps": ["Evita acercarte al cableado.", "Registra el barrio o referencia del lugar afectado."],
            "priority": "ALTA", "ticket_required": True,
        },
    },
    "mobile_data_slow": {
        "flow": "message",
        "message": (
            "Para datos móviles lentos: activa el modo avión durante 20 segundos y desactívalo, verifica que tengas "
            "saldo o paquete vigente, desactiva límites de datos y prueba en otra ubicación. También revisa que la red "
            "preferida esté en selección automática 4G/5G. Si continúa en varios lugares, comunica zona, hora y modelo a soporte móvil."
        ),
    },
    "mobile_no_signal": {
        "flow": "message",
        "message": (
            "Si el celular muestra “Sin servicio” o “Solo emergencias”, activa y desactiva el modo avión, reinicia el "
            "teléfono y deja la selección de red en automático. Prueba la SIM en otro equipo compatible si es posible. "
            "Si continúa en una zona con cobertura habitual, la SIM o la línea debe revisarse en soporte o en un Multicentro."
        ),
    },
    "service_sla": {
        "flow": "message",
        "message": (
            "El tiempo de atención depende de la zona, prioridad y complejidad. Como referencia operativa, muchos casos "
            "urbanos se programan dentro de 24 a 48 horas, pero no es una garantía automática. Daños externos extensos "
            "pueden requerir más tiempo. Revisa el estado real desde Mis tickets y las notificaciones."
        ),
    },
    "ftth_info": {
        "flow": "message",
        "message": (
            "FTTH significa fibra óptica hasta el hogar. La ONT convierte la señal óptica en conexión de red y WiFi. "
            "La fibra ofrece alta capacidad y estabilidad, pero el rendimiento WiFi también depende de distancia e interferencias."
        ),
    },
    "estado_reclamo": {
        "flow": "message",
        "message": (
            "Puedes revisar el estado real en la sección Mis tickets: Pendiente significa registrado; Asignado, que ya "
            "tiene técnico; En proceso, que está siendo atendido; y Resuelto o Cerrado, que finalizó. Las notificaciones "
            "mostrarán cada cambio. Si un ticket excede el plazo informado, solicita seguimiento usando su número."
        ),
    },
    "tiempo_tecnico": {
        "flow": "message",
        "message": (
            "La fecha y hora válidas son las que aparecen en el ticket y en las notificaciones. Si todavía figura Pendiente, "
            "el técnico aún no fue asignado. Cuando cambie a Asignado o En camino, revisa el detalle de la visita. "
            "No puedo prometer una hora diferente a la registrada por el sistema."
        ),
    },
    "hablar_operador": {
        "flow": "ticket_confirmation",
        "message": "Puedo registrar tu solicitud para que el equipo de soporte la atienda con el contexto de esta conversación.",
        "diagnosis": {
            "code": "HUMAN_SUPPORT_REQUEST", "problem": "El cliente solicita atención humana.",
            "cause": "La consulta requiere seguimiento de un operador o técnico.",
            "steps": ["Conserva el número de ticket para consultar su estado."],
            "priority": "MEDIA", "ticket_required": True,
        },
    },
    "instalacion_ftth": {
        "flow": "message",
        "message": (
            "Una instalación FTTH requiere validar cobertura y condiciones comerciales para la dirección exacta. "
            "La cuadrilla instala la acometida de fibra, la ONT/router y verifica niveles y navegación. Consulta los "
            "planes, requisitos, costos y agenda vigentes en los canales comerciales oficiales o en un Multicentro."
        ),
    },
    "facturacion": {
        "flow": "message",
        "message": (
            "Revisa el periodo, plan, descuentos, saldo anterior y fecha de vencimiento en tu factura. Para montos y "
            "pagos usa la aplicación, web o canales oficiales de ENTEL; no compartas aquí claves, PIN ni datos bancarios. "
            "Si identificas un cobro que no reconoces, registra un reclamo de facturación con el número de factura."
        ),
    },
    "relocation_service": {
        "flow": "message",
        "message": (
            "El traslado de FTTH depende de cobertura y disponibilidad técnica en la nueva dirección. No desconectes ni "
            "retires la fibra por tu cuenta. Solicita la validación con anticipación mediante los canales comerciales y "
            "ten disponibles el número de cliente, dirección actual y nueva dirección."
        ),
    },
    "consulta_general": {
        "flow": "message",
        "message": (
            "Claro. Puedo ayudarte con falta de internet, lentitud, cortes, luces LOS/PON, WiFi, router, cable de fibra, "
            "estado de tickets, visita técnica y orientación básica de red móvil. Cuéntame qué sucede y desde cuándo."
        ),
    },
    "router_general": {
        "flow": "message",
        "message": (
            "Cuéntame qué sucede con el router: ¿no enciende, se reinicia, está caliente, tiene una luz roja "
            "o las luces parecen normales pero no tienes internet? Con ese dato puedo darte un diagnóstico preciso."
        ),
    },
    "internet_general": {
        "flow": "message",
        "message": (
            "Indícame qué ocurre con la conexión: ¿no tienes internet, está lenta, se corta, el WiFi no aparece "
            "o solamente falla en un dispositivo? También dime desde cuándo sucede."
        ),
    },
}


def detect_direct_intent(text):
    """Detecta primero la falla técnica y deja saludos para el final."""
    normalized = normalize_text(text)

    # Las expresiones de impacto comercial o institucional no deben confundirse
    # con una solicitud para instalar un servicio nuevo.
    if any(phrase in normalized for phrase in [
        "no tenemos internet", "estamos sin internet", "nos quedamos sin internet",
        "negocio esta sin internet", "institucion esta sin internet",
        "no podemos cobrar por falta de internet", "no funciona el sistema de ventas",
    ]):
        return "sin_internet"

    # Si el cliente declara explícitamente lentitud, se conserva ese diagnóstico
    # aunque también mencione clases, videollamadas o aplicaciones del negocio.
    if any(phrase in normalized for phrase in [
        "internet esta lento", "internet esta muy lento", "internet muy lento",
        "tenemos el internet lento", "conexion esta lenta", "conexion muy lenta",
    ]):
        return "internet_lento"

    for intent in TECHNICAL_INTENT_ORDER:
        for phrase in KNOWLEDGE_INTENT_EXAMPLES.get(intent, []):
            if normalize_text(phrase) in normalized:
                return intent

    for intent in ("router_general", "internet_general"):
        if any(
            normalize_text(phrase) == normalized
            for phrase in KNOWLEDGE_INTENT_EXAMPLES[intent]
        ):
            return intent

    for phrase in KNOWLEDGE_INTENT_EXAMPLES["consulta_general"]:
        if normalize_text(phrase) in normalized:
            return "consulta_general"

    short_message = len(normalized.split()) <= 6
    for intent in ["despedida", "agradecimiento", "saludo"]:
        if short_message and any(
            normalize_text(phrase) == normalized
            for phrase in KNOWLEDGE_INTENT_EXAMPLES[intent]
        ):
            return intent
    return None


def get_support_guide(intent):
    guide = SUPPORT_GUIDES.get(intent)
    return deepcopy(guide) if guide else None
