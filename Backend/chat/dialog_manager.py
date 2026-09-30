"""
DIALOG_MANAGER.PY
Administrador del flujo conversacional
del Asistente Inteligente FTTH.
Controla:
- Estados del diálogo
- Diagnóstico progresivo
- Preguntas de seguimiento
- Confirmaciones
- Creación de tickets
Sistema Inteligente FTTH - ENTEL
"""
import re
import unicodedata

from memory import memory
from rules import get_all_rules
from solution_engine import solution_engine
from ticket_service import ticket_service
from response_generator import response_generator
from knowledge_base import get_support_guide, detect_direct_intent
from guided_flows import GUIDED_FLOWS, find_guided_flow
from guided_answers import answers_question, service_restored, fiber_broken, matches


def normalize_text(value):
    return "".join(
        character for character in unicodedata.normalize("NFD", value.lower().strip())
        if unicodedata.category(character) != "Mn"
    )


class DialogManager:
    def __init__(self):
        print(" Dialog Manager FTTH cargado")
    def process_message(
        self,
        message,
        intent=None,
        entities=None,
        customer=None
    ):
        # Guardar cliente
        if customer:
            memory.set_customer(customer)
        # Actualizar memoria NLP
        if intent is not None:
            memory.update(intent, entities, message)
        state = memory.get_dialog_state()
        if state == "GUIDED_DIAGNOSIS":
            return self.process_guided_diagnosis(message)
        if state == "WAITING_SOLUTION_CONFIRMATION" and self.is_new_problem(message):
            memory.set_dialog_state("START")
            return self.analyze_problem()
        
        if state == "START":
            return self.analyze_problem()
        elif state == "ASKING_INITIAL_RESTART":
            return self.process_initial_restart(message)
        elif state == "ASKING_CONNECTION_TYPE":
            return self.process_connection_type(message)
        elif state == "ASKING_LIGHTS":
            return self.process_lights_response(message, entities)
        elif state == "ASKING_CABLE":
            return self.process_cable_response(message, entities)
        elif state == "ASKING_RESTART":
            return self.process_restart_response(message, entities)
        elif state == "WAITING_SOLUTION_CONFIRMATION":
            return self.process_solution_confirmation(message)
        elif state == "WAITING_TICKET_CONFIRMATION":
            return self.process_ticket_confirmation(message)
        elif state == "CREATING_TICKET":
            return self.create_ticket()
        elif state == "FINISHED":
            return {
                "action": {
                    "type": "MESSAGE",
                    "message": "La conversación ha finalizado. Gracias por comunicarse con ENTEL."
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        return {
            "action": {
                "type": "MESSAGE",
                "message": "No pude determinar el estado de la conversación."
            },
            "intent": memory.get_intent(),
            "entities": memory.get_entities()
        }
    # =====================================================
    # Analizar problema - PRIMERA PREGUNTA
    # =====================================================
    def analyze_problem(self):
        context = memory.get_context()
        intent = context["intent"].get("intent", "desconocido")
        entities = context["entities"]
        flow_name, flow = find_guided_flow(intent)
        if flow:
            memory.get_context()["guided_flow"] = {"name": flow_name, "step": 0}
            memory.set_dialog_state("GUIDED_DIAGNOSIS")
            return self.guided_response(flow["messages"][0])
        guide_result = self.process_support_guide(intent)
        if guide_result:
            return guide_result
        if intent == "despedida":
            memory.finish()
            return {
                "action": {
                    "type": "MESSAGE",
                    "message": (
                        "¡Hasta luego! Gracias por comunicarte con ENTEL. "
                        "Cuando necesites ayuda, inicia una nueva consulta."
                    )
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        if intent == "saludo":
            return {
                "action": {
                    "type": "ASK",
                    "message": "¡Hola! Cuéntame qué problema tienes con tu servicio de internet."
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        if intent == "agradecimiento":
            return {
                "action": {
                    "type": "MESSAGE",
                    "message": "Con gusto. ¿Necesitas ayuda con algo más de tu servicio FTTH?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        # Verificar si tenemos información suficiente
        problem = entities.get("problem")
        lights = entities.get("lights", {})
        # Si el cliente ya mencionó el estado de las luces
        if lights.get("los") or lights.get("pon") or lights.get("power"):
            # Intentar encontrar una regla con la información disponible
            diagnosis = self.search_rule()
            if diagnosis:
                memory.set_diagnosis(diagnosis)
                solution = solution_engine.solve(diagnosis)
                memory.set_solution(solution)
                memory.set_dialog_state("WAITING_SOLUTION_CONFIRMATION")
                return {
                    "action": {
                        "type": "DIAGNOSIS",
                        "diagnosis": solution
                    },
                    "intent": memory.get_intent(),
                    "entities": memory.get_entities()
                }
        # Si no hay suficiente información, hacer preguntas de seguimiento
        if intent == "sin_internet" or problem == "sin_internet":
            memory.set_dialog_state("ASKING_INITIAL_RESTART")
            return {
                "action": {
                    "type": "ASK",
                    "message": (
                        "Lamento el inconveniente. Primero reinicia el router: "
                        "desconéctalo de la corriente durante 1 minuto, vuelve a "
                        "enchufarlo y espera hasta 3 minutos. ¿Ya lo hiciste? "
                        "Indícame también si el servicio volvió o sigue sin funcionar."
                    )
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        elif intent in ("internet_lento", "velocidad_baja", "streaming"):
            memory.set_dialog_state("ASKING_CONNECTION_TYPE")
            return {
                "action": {
                    "type": "ASK",
                    "message": (
                        "Entiendo que la conexión está lenta. Para aislar la causa, "
                        "¿estás conectado por WiFi o mediante cable de red directo al router?"
                    )
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        # Para otras intenciones, intentar buscar una regla
        diagnosis = self.search_rule()
        if diagnosis:
            memory.set_diagnosis(diagnosis)
            solution = solution_engine.solve(diagnosis)
            memory.set_solution(solution)
            memory.set_dialog_state("WAITING_SOLUTION_CONFIRMATION")
            return {
                "action": {
                    "type": "DIAGNOSIS",
                    "diagnosis": solution
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        # Si no hay regla, pedir más información
        return {
            "action": {
                "type": "ASK",
                "message": "No pude identificar tu problema con claridad. ¿Puedes describir con más detalle lo que está pasando con tu servicio de internet?"
            },
            "intent": memory.get_intent(),
            "entities": memory.get_entities()
        }

    def guided_response(self, message):
        return {
            "action": {"type": "ASK", "message": message},
            "intent": memory.get_intent(),
            "entities": memory.get_entities()
        }

    def process_guided_diagnosis(self, message):
        progress = memory.get_context().get("guided_flow") or {}
        flow = GUIDED_FLOWS.get(progress.get("name"))
        if not flow:
            memory.set_dialog_state("START")
            return self.analyze_problem()

        if service_restored(message):
            memory.finish()
            return self.guided_response("Me alegra que el servicio haya vuelto. No es necesario generar un ticket. Si vuelve a fallar, cuéntame qué sucede.")
        if fiber_broken(message):
            memory.set_diagnosis(dict(GUIDED_FLOWS['fiber_cable_damage']['diagnosis']))
            memory.set_dialog_state('WAITING_TICKET_CONFIRMATION')
            return self.guided_response("El cable reportado como cortado necesita revisión técnica. No intentes unirlo. ¿Deseas que registre el ticket?")
        if progress.get('name') == 'router_power' and matches(message, r'roj[oa]|encendio|hay luz'):
            memory.get_context()['guided_flow'] = {'name': 'sin_internet', 'step': 0}
            return self.guided_response("Si hay una luz encendida, el equipo sí recibe energía. ¿Qué indicador está rojo: LOS, PON o Internet? Si no puedes leerlo, descríbelo.")

        direct_intent = detect_direct_intent(message)
        new_flow_name, new_flow = find_guided_flow(direct_intent)
        switchable_flows = {
            "fiber_cable_damage", "wifi_weak", "router_restarts",
            "router_power", "ethernet_problem", "streaming", "sin_internet"
        }
        if (
            new_flow and new_flow_name in switchable_flows
            and new_flow_name != progress.get("name")
            and {new_flow_name, progress.get("name")} != {"internet_lento", "streaming"}
        ):
            if new_flow_name == "fiber_cable_damage" and any(
                phrase in normalize_text(message) for phrase in [
                    "cable cortado", "cable esta cortado", "cable de fibra esta cortado",
                    "fibra cortada", "fibra esta cortada", "fibra esta cortado",
                    "cable roto", "fibra rota",
                    "le cayo una rama", "rama corto"
                ]
            ):
                memory.set_diagnosis(dict(new_flow["diagnosis"]))
                memory.get_context()["guided_flow"] = {
                    "name": new_flow_name,
                    "step": len(new_flow["messages"]) - 1,
                }
                memory.set_dialog_state("WAITING_TICKET_CONFIRMATION")
                return self.guided_response(
                    "Entiendo: el cable de fibra está cortado y necesita reparación técnica. "
                    "No lo manipules ni intentes unirlo porque es delicado. "
                    "¿Deseas que registre un ticket para que un técnico lo repare?"
                )
            memory.get_context()["guided_flow"] = {"name": new_flow_name, "step": 0}
            memory.set_dialog_state("GUIDED_DIAGNOSIS")
            return self.guided_response(new_flow["messages"][0])

        current_step = int(progress.get('step', 0))
        if not answers_question(progress['name'], current_step, message):
            return self.guided_response(
                "Para continuar necesito aclarar este dato. " + flow['messages'][current_step]
            )
        memory.get_context().setdefault('diagnostic_answers', []).append({
            'flow': progress['name'], 'step': current_step,
            'question': flow['messages'][current_step], 'answer': message,
        })
        next_step = int(progress.get("step", 0)) + 1
        progress["step"] = next_step
        messages = flow["messages"]
        if next_step >= len(messages):
            memory.set_dialog_state("START")
            return self.analyze_problem()

        is_last = next_step == len(messages) - 1
        if is_last and flow.get("resolved"):
            text = normalize_text(message)
            still_failing = any(phrase in text for phrase in [
                "sigue igual", "sigue lo mismo", "no conecta", "no funciona",
                "continua igual", "todavia no", "aun no", "no se conecto"
            ])
            solved = any(phrase in text for phrase in [
                "ya funciona", "ya conecto", "se conecto", "ahora funciona",
                "ahora conecta", "problema solucionado"
            ])
            if still_failing:
                memory.set_diagnosis(dict(flow["diagnosis"]))
                memory.set_dialog_state("WAITING_TICKET_CONFIRMATION")
                return self.guided_response(
                    "Entiendo, el celular sigue sin conectarse después de volver a configurar la red. "
                    "¿Deseas que registre un ticket para que soporte revise el caso?"
                )
            if not solved:
                progress["step"] = next_step - 1
                return self.guided_response(
                    "Para confirmar: después de olvidar la red e ingresar nuevamente la contraseña, "
                    "¿el celular ya se conectó o sigue sin funcionar?"
                )
            memory.finish()
            return {
                "action": {"type": "MESSAGE", "message": messages[next_step]},
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        if is_last:
            memory.set_diagnosis(dict(flow["diagnosis"]))
            memory.set_dialog_state("WAITING_TICKET_CONFIRMATION")
        return self.guided_response(messages[next_step])
    def process_support_guide(self, intent):
        """Convierte una entrada de la base de conocimiento en una acción."""
        guide = get_support_guide(intent)
        if not guide:
            return None

        flow = guide.get("flow")
        if flow == "message":
            return {
                "action": {"type": "MESSAGE", "message": guide["message"]},
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }

        diagnosis = guide.get("diagnosis")
        if diagnosis:
            memory.set_diagnosis(diagnosis)
            solution = solution_engine.solve(diagnosis)
            memory.set_solution(solution)

        if flow == "ticket_confirmation":
            memory.set_dialog_state("WAITING_TICKET_CONFIRMATION")
            return {
                "action": {
                    "type": "ASK",
                    "message": (
                        f"{guide.get('message', '')}\n\n"
                        "¿Deseas que registre un ticket para que soporte técnico revise el caso?"
                    ).strip()
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }

        if flow == "diagnosis" and diagnosis:
            memory.set_dialog_state("WAITING_SOLUTION_CONFIRMATION")
            return {
                "action": {"type": "DIAGNOSIS", "diagnosis": memory.get_solution()},
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        return None

    def process_initial_restart(self, message):
        """Gestiona el primer descarte para una pérdida total del servicio."""
        text = normalize_text(message)
        persists = any(phrase in text for phrase in [
            "sigue sin funcionar", "sigue igual", "no funciona", "no volvio",
            "continua sin internet", "persiste", "todavia no", "aun no"
        ])
        restarted = any(phrase in text for phrase in [
            "si", "ya", "lo hice", "reinicie", "desconecte", "volvi a enchufar"
        ])
        resolved = any(phrase in text for phrase in [
            "ya funciona", "volvio el internet", "se soluciono", "ya tengo internet"
        ])
        not_restarted = any(phrase in text for phrase in [
            "no lo hice", "no he reiniciado", "todavia no reinicie", "aun no reinicie"
        ])

        if persists and restarted:
            diagnosis = {
                "code": "NO_INTERNET_AFTER_RESTART",
                "problem": "El servicio continúa sin internet después de reiniciar el router.",
                "cause": "Puede existir una pérdida de señal óptica o una avería externa.",
                "steps": [
                    "Mantén el router encendido para permitir las pruebas remotas.",
                    "No dobles ni desconectes el cable de fibra óptica.",
                ],
                "priority": "ALTA",
                "ticket_required": True,
            }
            memory.set_diagnosis(diagnosis)
            memory.set_solution(solution_engine.solve(diagnosis))
            memory.set_dialog_state("WAITING_TICKET_CONFIRMATION")
            return {
                "action": {
                    "type": "ASK",
                    "message": (
                        "Entendido. Como ya reiniciaste el router y el servicio sigue sin funcionar, "
                        "el problema puede ser externo. ¿Deseas que registre un ticket de avería "
                        "con los datos de tu cuenta para que un técnico revise la conexión?"
                    )
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }

        if resolved:
            memory.finish()
            return {
                "action": {
                    "type": "MESSAGE",
                    "message": "Excelente, el servicio volvió después del reinicio. No es necesario generar un ticket."
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }

        if not_restarted:
            return {
                "action": {
                    "type": "ASK",
                    "message": (
                        "Hazlo ahora: desconecta el router durante 1 minuto, vuelve a enchufarlo "
                        "y espera hasta 3 minutos. Luego dime si el internet volvió o sigue sin funcionar."
                    )
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }

        if persists:
            return {
                "action": {
                    "type": "ASK",
                    "message": "¿Alcanzaste a reiniciar el router durante 1 minuto y el problema continuó?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }

        if restarted:
            return {
                "action": {
                    "type": "ASK",
                    "message": "Gracias. Después del reinicio, ¿el internet volvió o sigue sin funcionar?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }

        return {
            "action": {
                "type": "ASK",
                "message": "¿Ya reiniciaste el router durante 1 minuto? Responde si volvió el servicio o si sigue sin funcionar."
            },
            "intent": memory.get_intent(),
            "entities": memory.get_entities()
        }

    def is_new_problem(self, message):
        """Permite cambiar de tema sin quedar atrapado en una pregunta de SÍ/NO."""
        text = normalize_text(message)
        if any(phrase in text for phrase in [
            "sigue", "persiste", "no se soluciono", "todavia falla",
            "aun falla", "ya funciona", "se soluciono",
        ]):
            return False
        intent = memory.get_intent().get("intent", "desconocido")
        diagnosis = memory.get_diagnosis() or {}
        source_intent = diagnosis.get("source_intent", "desconocido")
        switchable = {
            "storm_damage", "cable_theft", "fiber_cable_damage", "router_restarts",
            "router_power", "los_rojo", "wifi_not_visible", "internet_intermittent",
            "ethernet_problem", "gaming_latency", "mobile_no_signal",
            "mobile_data_slow", "sin_internet", "internet_lento",
        }
        return intent in switchable and intent != source_intent

    def process_connection_type(self, message):
        """Separa una posible falla WiFi de una degradación del acceso FTTH."""
        text = normalize_text(message)
        is_wifi = any(term in text for term in ["wifi", "wi fi", "inalambrico", "celular"])
        is_wired = any(term in text for term in ["cable", "lan", "ethernet", "utp", "directo al router"])

        if not is_wifi and not is_wired:
            return {
                "action": {
                    "type": "ASK",
                    "message": "Para continuar, indícame si la prueba la haces por WiFi o por cable de red directo al router."
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }

        if is_wifi:
            diagnosis = {
                "code": "WIFI_SLOWNESS",
                "problem": "La lentitud se presenta mediante WiFi.",
                "cause": "Puede existir distancia, interferencia, saturación del canal o varios equipos consumiendo ancho de banda.",
                "steps": [
                    "Haz una prueba cerca del router y pausa descargas o transmisiones en otros equipos.",
                    "Si puedes, compara la velocidad mediante cable de red directo al router.",
                    "Coloca el router en un punto alto, abierto y alejado de microondas u objetos metálicos.",
                    "Revisa los dispositivos conectados y cambia la clave WiFi si reconoces alguno que no autorizaste.",
                ],
                "priority": "MEDIA",
                "ticket_required": False,
                "final_message": "La comparación por cable permite saber si la causa está en el WiFi o en el servicio FTTH.",
            }
        else:
            diagnosis = {
                "code": "WIRED_SLOWNESS",
                "problem": "La conexión continúa lenta mediante cable de red.",
                "cause": "Puede existir consumo simultáneo, un cable Ethernet defectuoso o degradación del servicio.",
                "steps": [
                    "Pausa descargas y desconecta temporalmente otros equipos de la red.",
                    "Prueba con otro cable Ethernet y otro puerto LAN del router.",
                    "Reinicia el router durante 1 minuto y repite una prueba de velocidad.",
                    "Anota la velocidad de descarga, subida, latencia y la hora de la medición.",
                ],
                "priority": "MEDIA",
                "ticket_required": True,
                "final_message": "Si la velocidad por cable sigue muy por debajo del plan, corresponde registrar una revisión técnica.",
            }

        memory.set_diagnosis(diagnosis)
        memory.set_solution(solution_engine.solve(diagnosis))
        memory.set_dialog_state("WAITING_SOLUTION_CONFIRMATION")
        return {
            "action": {"type": "DIAGNOSIS", "diagnosis": memory.get_solution()},
            "intent": memory.get_intent(),
            "entities": memory.get_entities()
        }

    # =====================================================
    # Procesar respuesta sobre luces
    # =====================================================
    def process_lights_response(self, message, entities):
        lights = entities.get("lights", {})
        los = lights.get("los")
        pon = lights.get("pon")
        power = lights.get("power")
        # Guardar las luces en memoria
        memory.update(
            memory.get_intent(),
            {"lights": lights, "problem": "sin_internet"},
            message
        )
        # CASO 1: Luz LOS en rojo
        if los == "rojo":
            memory.set_dialog_state("ASKING_CABLE")
            return {
                "action": {
                    "type": "ASK",
                    "message": "🔴 La luz LOS en rojo indica que el cable de fibra óptica no está recibiendo señal.\n\n"
                               "¿Has revisado el cable de fibra óptica? ¿Está bien conectado al módem y a la pared?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        # CASO 2: Módem apagado
        if power == "apagado":
            memory.set_dialog_state("WAITING_TICKET_CONFIRMATION")
            return {
                "action": {
                    "type": "ASK",
                    "message": "⚫ Tu módem está apagado.\n\n"
                               "Por favor, verifica que esté conectado a la corriente y que el tomacorriente funcione.\n\n"
                               "¿Quieres que genere un ticket para que un técnico revise tu equipo?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        # CASO 3: Todo parece normal
        if los == "verde" and pon == "verde":
            memory.set_dialog_state("ASKING_RESTART")
            return {
                "action": {
                    "type": "ASK",
                    "message": "✅ Las luces de tu módem parecen estar normales.\n\n"
                               "A veces un reinicio simple puede solucionar el problema. ¿Has intentado reiniciar el módem?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        # CASO 4: No se detectaron luces
        if los is None and pon is None:
            return {
                "action": {
                    "type": "ASK",
                    "message": "No pude identificar las luces de tu módem. ¿Puedes describir qué ves?\n\n"
                               "Por ejemplo: ¿Ves alguna luz roja, verde o apagada? ¿Parpadea alguna luz?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        # Si llegamos aquí, no se reconoció el estado
        return self.analyze_problem()
    # =====================================================
    # Procesar respuesta sobre el cable
    # =====================================================
    def process_cable_response(self, message, entities):
        message_lower = message.lower().strip()
        message_normalized = normalize_text(message_lower)
        # Detectar si el cable está bien o mal
        cable_mal = any(word in message_normalized for word in [
            "mal", "danado", "roto", "doblado", "suelto", "desconectado"
        ])
        cable_bien = any(word in message_normalized for word in [
            "bien", "conectado", "correcto"
        ])
        if cable_mal:
            # Generar ticket directamente
            diagnosis = {
                "code": "FIBER_CABLE_DAMAGED",
                "problem": "Cable de fibra óptica dañado o desconectado.",
                "cause": "El cliente reporta que el cable de fibra está dañado o desconectado.",
                "priority": "ALTA",
                "ticket_required": True,
                "steps": [
                    "No intentes reparar el cable tú mismo.",
                    "Un técnico especializado debe realizar la reparación.",
                    "Se generará un ticket de atención prioritaria."
                ],
                "final_message": "El cable de fibra está dañado y necesita reparación técnica."
            }
            memory.set_diagnosis(diagnosis)
            memory.set_dialog_state("CREATING_TICKET")
            return self.create_ticket()
        if cable_bien:
            memory.set_dialog_state("ASKING_RESTART")
            return {
                "action": {
                    "type": "ASK",
                    "message": "El cable está bien conectado, pero la luz LOS sigue en rojo. Esto indica que el problema podría estar en la red externa.\n\n"
                               "Vamos a intentar reiniciar el módem. ¿Has intentado reiniciarlo?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        else:
            return {
                "action": {
                    "type": "ASK",
                    "message": "No entendí si el cable está bien o mal. ¿Puedes confirmar si el cable de fibra está correctamente conectado?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
    # =====================================================
    # Procesar respuesta sobre reinicio
    # =====================================================
    def process_restart_response(self, message, entities):
        message_lower = message.lower().strip()
        reinicio_hecho = any(word in message_lower for word in ["si", "sí", "ya", "reinicié", "reinicio", "hice", "listo"])
        reinicio_no = any(word in message_lower for word in ["no", "todavía", "aún", "no he", "no hice"])
        if reinicio_hecho:
            # Buscar diagnóstico con la información actual
            diagnosis = self.search_rule()
            if diagnosis:
                memory.set_diagnosis(diagnosis)
                solution = solution_engine.solve(diagnosis)
                memory.set_solution(solution)
                memory.set_dialog_state("WAITING_SOLUTION_CONFIRMATION")
                return {
                    "action": {
                        "type": "DIAGNOSIS",
                        "diagnosis": solution
                    },
                    "intent": memory.get_intent(),
                    "entities": memory.get_entities()
                }
            # Si no hay diagnóstico específico, ofrecer ticket
            memory.set_dialog_state("WAITING_TICKET_CONFIRMATION")
            return {
                "action": {
                    "type": "ASK",
                    "message": "Ya reiniciaste el módem y el problema persiste. Esto indica que puede ser un problema técnico más complejo.\n\n"
                               "¿Quieres que genere un ticket para que un técnico revise tu servicio?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        elif reinicio_no:
            return {
                "action": {
                    "type": "ASK",
                    "message": "Te recomiendo reiniciar el módem ahora mismo:\n\n"
                               "1️⃣ Desconecta el módem de la corriente.\n"
                               "2️⃣ Espera 30 segundos.\n"
                               "3️⃣ Vuelve a conectarlo.\n"
                               "4️⃣ Espera 2 minutos a que se reinicie completamente.\n\n"
                               "¿Ya lo hiciste? ¿El internet volvió a funcionar?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        else:
            return {
                "action": {
                    "type": "ASK",
                    "message": "¿Has intentado reiniciar el módem? Es un paso simple que muchas veces soluciona el problema."
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
    # =====================================================
    # Buscar diagnóstico en reglas
    # =====================================================
    def search_rule(self):
        context = memory.get_context()
        entities = context["entities"]
        intent = context["intent"]
        intent_name = intent.get("intent", "desconocido")
        for rule in get_all_rules():
            conditions = rule.get("conditions", {})
            match = True
            matched_conditions = []
            for key, value in conditions.items():
                if key == "intent":
                    if intent_name == value:
                        matched_conditions.append(f"intent:{value}✓")
                    else:
                        match = False
                        break
                elif key == "problem":
                    problem_value = entities.get("problem")
                    if problem_value and problem_value == value:
                        matched_conditions.append(f"problem:{value}✓")
                    else:
                        match = False
                        break
                elif key == "device":
                    device_value = entities.get("device")
                    if device_value and device_value == value:
                        matched_conditions.append(f"device:{value}✓")
                    else:
                        match = False
                        break
                elif key in ["los", "pon", "power", "wifi", "internet_led"]:
                    lights = entities.get("lights", {})
                    light_value = lights.get(key)
                    if light_value is None:
                        light_value = entities.get(key)
                    if light_value and light_value == value:
                        matched_conditions.append(f"{key}:{value}✓")
                    else:
                        match = False
                        break
                else:
                    if key in entities:
                        if entities.get(key) == value:
                            matched_conditions.append(f"{key}:{value}✓")
                        else:
                            match = False
                            break
                    else:
                        match = False
                        break
            if match:
                return rule
        return None
    # =====================================================
    # Procesar respuesta solución (confirmación)
    # =====================================================
    def process_solution_confirmation(self, message):
        text = normalize_text(message)
        if not text:
            return {
                "action": {
                    "type": "ASK",
                    "message": "Por favor responde SÍ o NO. ¿El problema se solucionó?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        negative = [
            "no", "sigue igual", "continua", "no funciona", "persiste",
            "sigue", "no se soluciono", "todavia falla", "aun falla"
        ]
        positive = [
            "si", "funciona", "solucionado", "ya funciona", "correcto",
            "listo", "ok", "perfecto", "excelente", "volvio"
        ]

        requests_technical_review = any(phrase in text for phrase in [
            "necesito tecnico", "visita tecnica", "venga a mi domicilio",
            "necesito que lo revisen", "quiero que lo revisen",
            "que lo revise un tecnico", "que revisen mi servicio"
        ])
        # Pedir que revisen el servicio ya expresa una solicitud inequívoca de
        # atención técnica, aunque el cliente no use una respuesta formal.
        if requests_technical_review:
            memory.set_dialog_state("CREATING_TICKET")
            return self.create_ticket()
        if memory.get_intent().get("intent") == "hablar_operador":
            memory.set_dialog_state("WAITING_TICKET_CONFIRMATION")
            return {
                "action": {
                    "type": "ASK",
                    "message": "Puedo registrar la visita. ¿Confirmas que deseas generar el ticket técnico?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }

        # Una negación siempre tiene prioridad en respuestas mixtas como
        # "sí, lo hice, pero sigue sin funcionar".
        if any(word in text for word in negative):
            memory.set_dialog_state("WAITING_TICKET_CONFIRMATION")
            return {
                "action": {
                    "type": "ASK",
                    "message": "Entiendo que el problema no se ha solucionado.\n\n¿Deseas generar un ticket para que un técnico revise tu servicio FTTH?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        if any(word in text for word in positive):
            memory.finish()
            return {
                "action": {
                    "type": "MESSAGE",
                    "message": "Excelente. Me alegra que tu servicio haya sido solucionado.\n\nSi necesitas ayuda nuevamente, estaré aquí para ti."
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        return {
            "action": {
                "type": "ASK",
                "message": "No entendí tu respuesta. ¿El problema se solucionó? Responde SI o NO."
            },
            "intent": memory.get_intent(),
            "entities": memory.get_entities()
        }
    # =====================================================
    # Confirmación de ticket
    # =====================================================
    def process_ticket_confirmation(self, message):
        text = normalize_text(message)
        if matches(message, r'imagen|foto|video') and not matches(message, r'\bsi\b|genera|registre|registra|crea el ticket'):
            return self.guided_response("Puedes adjuntar la evidencia con el botón de archivos; el sistema confirmará cuando esté guardada. ¿Deseas también que registre el ticket técnico?")
        if not text:
            return {
                "action": {
                    "type": "ASK",
                    "message": "¿Deseas generar un ticket para que un técnico revise tu servicio? Responde SI o NO."
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        if any(phrase in text for phrase in [
            "no quiero", "mejor no", "cancelar", "dejar", "despues", "luego",
            "no generes", "no genere", "no registres", "no registre", "no crear"
        ]) or text == "no":
            memory.finish()
            return {
                "action": {
                    "type": "MESSAGE",
                    "message": "Entendido. Si necesitas ayuda nuevamente puedes comunicarte con ENTEL.\n\n¡Que tengas un excelente día!"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        affirmative_phrases = [
            "por favor", "quiero", "genera", "generar", "genere",
            "registra", "registrar", "registre", "crea", "crear", "cree",
            "dale", "continua", "adelante", "de acuerdo", "que venga",
            "que vengan", "solucionar mi servicio", "necesito un tecnico",
            "registre el ticket", "genera el ticket"
        ]
        affirmative_words = {"si", "ok", "correcto", "acepto", "claro"}
        has_affirmative_word = any(
            re.search(rf"\b{re.escape(word)}\b", text)
            for word in affirmative_words
        )
        if has_affirmative_word or any(
            phrase in text for phrase in affirmative_phrases
        ):
            memory.set_dialog_state("CREATING_TICKET")
            return self.create_ticket()
        return {
            "action": {
                "type": "ASK",
                "message": "No entendí tu respuesta. ¿Deseas generar un ticket técnico? Responde SI o NO."
            },
            "intent": memory.get_intent(),
            "entities": memory.get_entities()
        }
    # =====================================================
    # Crear ticket
    # =====================================================
    def create_ticket(self):
        diagnosis = memory.get_diagnosis()
        customer = memory.get_customer()
        if diagnosis is None:
            intent = memory.get_intent().get('intent') or "falla_ftth"
            entities = memory.get_entities() or {}
            problem = entities.get("problem") or intent
            labels = {
                "sin_internet": "Sin internet",
                "internet_lento": "Internet lento",
                "slow_internet": "Internet lento",
                "problema_conexion": "Problema de conexión",
                "connection_problem": "Problema de conexión",
                "router_danado": "Router dañado",
                "router_damage": "Router dañado",
                "cambio_equipo": "Cambio de equipo",
                "equipment_change": "Cambio de equipo",
                "los_rojo": "Pérdida de señal óptica (LOS rojo)",
            }
            problem_label = labels.get(
                problem, labels.get(intent, str(problem).replace("_", " ").title())
            )
            diagnosis = {
                "code": str(intent).upper(),
                "problem": problem_label,
                "cause": "La falla reportada no pudo solucionarse mediante el asistente.",
                "priority": "MEDIA",
                "ticket_required": True
            }
        # Una confirmación explícita de visita siempre escala el diagnóstico.
        diagnosis["ticket_required"] = True
        result = ticket_service.create_ticket(diagnosis, customer)
        if result.get("created"):
            ticket = result["ticket"]
            memory.set_ticket(ticket)
            memory.finish()
            return {
                "action": {
                    "type": "TICKET",
                    "ticket": ticket,
                    "message": f"🎫 ¡TICKET GENERADO CORRECTAMENTE!\n\n📋 Número de ticket: {ticket['ticket_id']}\n\n📌 Estado: PENDIENTE\n\n👨‍🔧 Un técnico revisará su servicio FTTH en las próximas horas.\n\n📱 Recibirá notificaciones sobre el estado de su reclamo.\n\n¡Gracias por confiar en ENTEL!"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        return {
            "action": {
                "type": "MESSAGE",
                "message": "❌ No fue posible generar el ticket técnico. Por favor, intenta nuevamente o comunícate al call center de ENTEL."
            },
            "intent": memory.get_intent(),
            "entities": memory.get_entities()
        }
# =====================================================
# Instancia global
# =====================================================
dialog_manager = DialogManager()
