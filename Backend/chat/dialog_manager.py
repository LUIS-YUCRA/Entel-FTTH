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
from knowledge_base import get_support_guide, detect_direct_intent, scope_reply, conversational_reply, general_intent, normalize_text
from guided_flows import GUIDED_FLOWS, find_guided_flow
from guided_answers import answers_question, service_restored, fiber_broken, matches, ticket_decision, update_facts
from customer_language import definition
from datetime import datetime, timezone, timedelta



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
        context = memory.get_context()
        conversation = context['conversation']
        state = memory.get_dialog_state()
        if customer:
            memory.set_customer(customer)
        if state == 'WAITING_TICKET_CONFIRMATION' and ticket_decision(message) is not None:
            memory.record_message(message)
            return self.process_ticket_confirmation(message)
        progress = context.get('guided_flow') or {}
        incoming_name, incoming_flow = find_guided_flow(detect_direct_intent(message))
        if incoming_flow and progress.get('name') and incoming_name != progress['name'] and not answers_question(progress['name'], progress.get('step', 0), message):
            # Guardar el problema anterior sin reutilizar sus síntomas en otro.
            context.setdefault('previous_issues', []).append({'problem': context.get('reported_problem'), 'facts': context.get('diagnostic_facts', {}), 'flow': progress.get('name')})
            context['previous_issues'] = context['previous_issues'][-3:]
            context['diagnostic_facts'] = {}
            context['reported_problem'] = message
            context['diagnostic_answers'] = []
            context['diagnosis'] = None
            context['solution'] = None
        facts = update_facts(context, message)
        text = normalize_text(message)
        if re.search(r'chispas|(?:olor|huele|oliendo).*quemad|humo', text):
            memory.record_message(message)
            memory.set_diagnosis({'code':'ELECTRICAL_STORM_DAMAGE','problem':'Posible riesgo eléctrico','cause':'El cliente reporta señales de daño eléctrico.','ticket_required':True,'priority':'ALTA'})
            memory.set_dialog_state('WAITING_TICKET_CONFIRMATION')
            context['reported_problem'] = message
            return self.guided_response('Mantén distancia del equipo y no intentes abrirlo ni volver a encenderlo. ¿Quieres registrar un reclamo para revisión técnica?')
        if state == 'WAITING_TICKET_CONFIRMATION' and ticket_decision(message) is None and re.search(r'venir|viene|vendr|visita|alguien|necesario|hace falta', text) and not context.get('_ticket_lookup', {}).get('requested'):
            memory.record_message(message)
            return self.guided_response('Puede ser necesaria una visita técnica; soporte evaluará el problema y confirmará si hace falta. Registrar el reclamo permite solicitar esa revisión. ¿Quieres que registre el reclamo?')
        if context.get('_ticket_lookup', {}).get('requested'):
            lookup = context['_ticket_lookup']
            memory.record_message(message)
            ticket = lookup.get('ticket')
            if not ticket:
                return self.guided_response('No encontré ese ticket entre tus solicitudes. Puedes revisar el número en Mis tickets.')
            answer = f"Tu reclamo {ticket['ticket_code']} figura como {ticket['status'].replace('_', ' ').lower()}."
            if re.search(r'quien|asign|telefono|contacto|tecnico', text):
                if ticket.get('technician_name'):
                    answer += f" El técnico asignado es {ticket['technician_name']}."
                    if ticket.get('technician_phone'):
                        answer += f" Su teléfono de atención es {ticket['technician_phone']}."
                else:
                    answer += ' Todavía no figura un técnico asignado.'
            scheduled = ticket.get('scheduled_at')
            if scheduled:
                try:
                    instant = datetime.fromisoformat(str(scheduled).replace('Z', '+00:00'))
                    if instant.tzinfo is not None:
                        local = instant.astimezone(timezone(timedelta(hours=-4)))
                        answer += f" La visita está programada para el {local:%d/%m/%Y} a las {local:%H:%M} (hora de Bolivia)."
                except (ValueError, TypeError):
                    pass
            elif re.search(r'cuando|fecha|hora|vendr|visita', text):
                answer += ' Todavía no hay una fecha de visita registrada.'
            if re.search(r'cambiar|reprogram', text):
                answer += ' Puedes solicitar la reprogramación desde Mis tickets; la nueva fecha requiere confirmación del equipo de atención.'
            return self.guided_response(answer)
        if re.search(r'mismo problema|problema de ayer|lo de ayer|otra vez lo mismo', text):
            previous = (context.get('_private_history') or [None])[0]
            memory.record_message(message)
            if not previous:
                return self.guided_response('No encuentro un diagnóstico anterior disponible en tu historial. ¿Qué ocurre ahora con tu conexión?')
            conversation['previous_issue_pending'] = previous
            label = {'internet_lento':'lentitud','sin_internet':'falta de internet','los_rojo':'una luz LOS roja'}.get(previous['intent'], 'una falla de conexión')
            return self.guided_response(f'En tu consulta anterior reportaste {label}. ¿Es el mismo problema ahora?')
        if conversation.get('previous_issue_pending'):
            decision = ticket_decision(message)
            if decision is False:
                conversation.pop('previous_issue_pending', None)
                memory.record_message(message)
                return self.guided_response('Entendido. ¿Qué problema tienes ahora?')
            if decision is True:
                previous = conversation.pop('previous_issue_pending')
                memory.update({'intent': 'sin_internet' if previous['intent'] == 'los_rojo' else previous['intent'], 'confidence': 0.9}, None, message)
                memory.set_dialog_state('START')
                return self.analyze_problem()
        # Interrupciones sociales/informativas se registran sin consumir el paso pendiente.
        reply = conversational_reply(message, conversation)
        if reply:
            if state == 'START':
                context['intent'] = {'intent': general_intent(message), 'confidence': 0.95}
            memory.record_message(message)
            if general_intent(message) == 'despedida':
                memory.finish()
            return self.guided_response(reply)
        reply = scope_reply(message, 'CLARIFYING' if conversation.get('pending_clarification') else state)
        if reply:
            memory.record_message(message)
            return self.guided_response(reply)

        text = normalize_text(message)
        detected = detect_direct_intent(message)
        guide = get_support_guide(detected)
        if state != 'START' and guide and guide.get('flow') == 'message':
            memory.record_message(message)
            return self.guided_response(guide['message'])
        if conversation.get('pending_clarification') == 'connectivity':
            if re.fullmatch(r'no tengo(?: nada)?|no hay|ninguna|sin conexion|no funciona(?: nada| en absoluto)?', text):
                detected = 'sin_internet'
            elif re.fullmatch(r'(?:esta |muy |va )?lent[oa]', text):
                detected = 'internet_lento'
            elif re.fullmatch(r'se corta(?: a cada rato)?|a ratos|por momentos', text):
                detected = 'cortes_internet'
        if detected and not general_intent(message) and not (guide and guide.get('flow') == 'message'):
            context.setdefault('reported_problem', message)
        progress = context.get('guided_flow') or {}
        pending_answer = state == 'GUIDED_DIAGNOSIS' and answers_question(progress.get('name'), progress.get('step', 0), message)
        if detected in ('problema_internet_general', 'problema_wifi_general') and not pending_answer:
            memory.update({'intent': detected, 'confidence': 0.95}, entities, message)
            # Una descripción imprecisa durante el diagnóstico conserva la pregunta pendiente.
            if state == 'GUIDED_DIAGNOSIS':
                progress = context.get('guided_flow', {})
                flow = GUIDED_FLOWS.get(progress.get('name'))
                if flow:
                    return self.guided_response(flow['messages'][progress.get('step', 0)])
            conversation['pending_clarification'] = 'connectivity'
            return self.guided_response('¿Tu WiFi se desconecta o está lento?' if detected == 'problema_wifi_general'
                                        else 'Claro, te ayudaré. ¿No tienes internet o la conexión está lenta?')
        if detected and conversation.pop('pending_clarification', None):
            intent = {'intent': detected, 'confidence': 0.95}
            memory.set_dialog_state('START')
        if intent is None:
            intent = {'intent': detected or memory.get_intent().get('intent', 'desconocido'), 'confidence': 0.95 if detected else 0}
        if state != 'START' and isinstance(intent, dict) and (intent.get('intent') == 'desconocido' or pending_answer):
            intent = memory.get_intent().copy()
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
        if intent == 'technical_definition':
            return self.guided_response(definition(memory.get_history()[-1]['user']))
        if intent == 'contracted_plan':
            return self.guided_response('No tengo datos verificados de tu plan contratado en este sistema. Puedes consultarlo en tu contrato o en los canales oficiales de ENTEL.')
        flow_name, flow = find_guided_flow(intent)
        if flow:
            memory.get_context()["guided_flow"] = {"name": flow_name, "step": 0}
            memory.set_dialog_state("GUIDED_DIAGNOSIS")
            if flow_name == 'fiber_cable_damage' and context.get('diagnostic_facts', {}).get('fiber_damage_visible'):
                memory.set_diagnosis(dict(flow['diagnosis']))
                memory.set_dialog_state('WAITING_TICKET_CONFIRMATION')
                return self.guided_response('Lamento el daño que reportas; un cable cortado necesita reparación técnica. No lo manipules ni intentes unirlo. ¿Deseas que registre un ticket para solicitar la revisión?')
            if intent in ('los_rojo', 'problema_pon'):
                memory.get_context()['guided_flow']['step'] = 1
                return self.guided_response('Esa luz puede indicar que la señal de internet no está llegando correctamente. ¿El cable tiene daños visibles, sin tocarlo?', 'outage:fiber_check' if intent == 'los_rojo' and context.get('diagnostic_facts', {}).get('los_status') == 'red' else None)
            if flow_name == 'internet_lento' and context.get('diagnostic_facts', {}).get('device_scope') == 'single':
                return self.ask_single_device_distance()
            if flow_name == 'internet_lento' and context.get('diagnostic_facts', {}).get('device_scope') == 'all':
                context['guided_flow']['step'] = 2 if context.get('diagnostic_facts', {}).get('connection_type') else 1
                return self.guided_response(self.guided_message(flow_name, context['guided_flow']['step']))
            if flow_name == 'single_device_issue' and context.get('diagnostic_facts', {}).get('device_scope') == 'single':
                context['guided_flow']['step'] = 1
                return self.guided_response(flow['messages'][1])
            category = (context.get('customer') or {}).get('customer_category')
            if flow_name == 'internet_lento' and category in ('INSTITUCION', 'NEGOCIO'):
                return self.guided_response('¿La lentitud afecta a todos los dispositivos o solo a algunos?', 'slow:device_scope')
            return self.guided_response(flow["messages"][0], "slow:device_scope" if flow_name == "internet_lento" else None)
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
                "message": "¿Puedes contarme un poco más sobre lo que ocurre?",
                "reply_key": "info:general_support" if intent == 'desconocido' else None
            },
            "intent": memory.get_intent(),
            "entities": memory.get_entities()
        }

    def ask_single_device_distance(self):
        if memory.get_context().get('diagnostic_facts', {}).get('connection_type') == 'cable':
            memory.get_context()['guided_flow'] = {'name': 'ethernet_problem', 'step': 0}
            return self.guided_response(GUIDED_FLOWS['ethernet_problem']['messages'][0])
        memory.get_context()['guided_flow'] = {'name': 'internet_lento', 'step': 0, 'branch': 'single_distance'}
        return self.guided_response('Gracias, revisemos ese dispositivo. ¿También está lento cuando estás cerca del equipo de internet?')

    def guided_message(self, name, step):
        facts = memory.get_context().get('diagnostic_facts', {})
        if name == 'internet_lento' and step == 2 and facts.get('connection_type') in ('both', 'cable'):
            return ('Gracias por comprobarlo; si también ocurre por cable, conviene revisar la conexión completa. '
                    'Pausa por un momento las descargas o los videos que estén en uso y abre una página en el dispositivo conectado por cable. '
                    '¿Sigue lento en esa prueba?')
        return GUIDED_FLOWS[name]['messages'][step]

    def guided_response(self, message, reply_key=None):
        progress = memory.get_context().get('guided_flow')
        if progress:
            progress['last_question'] = message
        if re.search(r'(desconecta|reinicia).*(router|modem|equipo|corriente)', normalize_text(message)):
            memory.get_context().setdefault('diagnostic_facts', {})['router_restart_requested'] = True
        return {
            "action": {"type": "ASK", "message": message, "reply_key": reply_key},
            "intent": memory.get_intent(),
            "entities": memory.get_entities()
        }

    def process_guided_diagnosis(self, message):
        progress = memory.get_context().get("guided_flow") or {}
        flow = GUIDED_FLOWS.get(progress.get("name"))
        if not flow:
            memory.set_dialog_state("START")
            return self.analyze_problem()

        facts = memory.get_context().setdefault('diagnostic_facts', {})
        text = normalize_text(message)
        if service_restored(message):
            memory.finish()
            return self.guided_response('Me alegra que la conexión haya vuelto. No registraré un ticket.')
        if progress.get('branch') == 'single_distance':
            if re.fullmatch(r'no(?: cerca funciona bien)?|cerca funciona(?: bien)?|no cerca funciona bien', text) or facts.get('works_near_router'):
                facts['works_near_router'] = True
                memory.get_context()['guided_flow'] = {'name': 'wifi_weak', 'step': 1}
                return self.guided_response('La distancia o las paredes pueden reducir la señal. ¿El equipo está dentro de un mueble o detrás de objetos grandes?')
            if re.fullmatch(r'si(?: tambien)?|tambien|sigue igual', text):
                memory.get_context()['guided_flow'] = {'name': 'single_device_issue', 'step': 1}
                return self.guided_response(GUIDED_FLOWS['single_device_issue']['messages'][1])
            return self.guided_response('Para comprobar el alcance, ¿también falla cuando estás al lado del equipo de internet?')
        if progress.get('name') == 'internet_lento' and progress.get('step') == 0 and facts.get('device_scope') == 'single':
            return self.ask_single_device_distance()
        if progress.get('name') == 'streaming' and progress.get('step') == 0:
            if re.search(r'^(?:si|si funcionan)|otras.*funcionan|solo|solamente', text) and not re.search(r'no funcionan|tambien fallan', text):
                memory.get_context()['guided_flow'] = {'name': 'streaming', 'step': 0, 'branch': 'application_only'}
                return self.guided_response('Parece limitado a esa aplicación. Ciérrala y vuelve a abrirla; ¿también falla en otro dispositivo?')
        if progress.get('branch') == 'application_only':
            if re.fullmatch(r'si|tambien falla|en todos|en ambos', text):
                progress['branch'] = 'application_checked'
                return self.guided_response('Si solo falla esa aplicación en varios dispositivos, puede ser un problema de ese servicio. ¿Las demás páginas siguen funcionando?')
            if re.fullmatch(r'no|solo en este|en el otro funciona', text):
                memory.get_context()['guided_flow'] = {'name': 'single_device_issue', 'step': 1}
                return self.guided_response('Parece limitado a ese dispositivo. Cierra y vuelve a abrir la aplicación; ¿ahora funciona?')
            return self.guided_response('Si las otras páginas funcionan, no parece una interrupción general. Prueba esa aplicación en otro dispositivo para comprobar si la falla sigue allí.')
        if progress.get('name') == 'router_power' and progress.get('step') == 1 and re.fullmatch(r'no|no funciona|el enchufe no funciona', text):
            return self.guided_response('Puede haber un problema en el enchufe. No intentes repararlo ni pruebes adaptadores distintos; solicita que una persona calificada revise la alimentación eléctrica.')
        if progress.get('name') == 'sin_internet':
            optical = facts.get('los_status') == 'red' or facts.get('pon_status') == 'off'
            if (optical or facts.get('red_light')) and facts.get('fiber_checked'):
                return self.offer_outage_ticket('La conexión sigue fallando y reportaste una luz roja. Hace falta una revisión técnica para confirmar la causa.')
            if optical and int(progress.get('step', 0)) == 0:
                progress['step'] = 1
                facts.pop('light_names_pending', None)
                return self.guided_response('Esa luz puede indicar un problema con la señal de internet. ¿Ves daños en el cable, sin tocarlo?', 'outage:fiber_check' if facts.get('los_status') == 'red' else None)
            if int(progress.get('step', 0)) == 0 and re.search(r'varias luces|luces rojas', text):
                facts['light_names_pending'] = True
                return self.guided_response('¿Qué nombres tienen las luces rojas: LOS, PON o Internet?')
            if facts.get('light_names_pending') and not optical:
                if facts.get('router_restart_result') == 'failed':
                    return self.offer_outage_ticket('El servicio sigue fallando después del reinicio; hace falta revisar el equipo y la señal.')
                if not re.search(r'no se|no distingo|no puedo leer|internet|pon|los', text):
                    return self.guided_response('Gracias por revisar. Falta identificar la luz: ¿puedes leer LOS, PON o Internet junto a ella?')
                facts.pop('light_names_pending', None)
            if int(progress.get('step', 0)) >= 1 and facts.get('fiber_checked') and facts.get('router_restart_result') == 'failed':
                return self.offer_outage_ticket('Ya revisaste el cable y el reinicio no recuperó la conexión.')
            if int(progress.get('step', 0)) == 2 and facts.get('router_restart_attempted') and not facts.get('router_restart_result'):
                return self.guided_response('¿Volvió el internet después del reinicio o sigue sin funcionar?')

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
            "router_power", "ethernet_problem", "streaming", "sin_internet",
            "internet_lento", "internet_intermittent", "single_device_issue"
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
        simple_answer = re.fullmatch(r'(si|no)(?: (?:gracias|ahora|ya))?', text)
        resolved_answer = {
            ('wifi_weak', 2): 'si',
            ('ethernet_problem', 2): 'si',
            ('streaming', 2): 'no',
            ('streaming', 3): 'no',
        }.get((progress['name'], current_step))
        if simple_answer and simple_answer.group(1) == resolved_answer:
            facts['service_restored'] = True
            memory.finish()
            return self.guided_response('¡Me alegra que la prueba haya dado resultado! Si el problema vuelve, cuéntame qué sucede y te ayudaré a revisarlo.')
        if re.search(r'no entiendo|no se como|como (?:lo )?hago|como pruebo', text):
            explanations = {
                ('internet_lento', 1): 'Con gusto te explico: WiFi es la conexión sin cables; por cable significa conectar la computadora directamente al equipo de internet. ¿Cuál estás usando?',
                ('sin_internet', 0): 'Claro, solo mira las luces de la parte frontal del equipo, sin desconectar nada. ¿Alguna está roja?',
                ('internet_lento', 2): ('Claro, basta con abrir una página que uses habitualmente y observar si tarda en cargar. '
                                       'Prueba en el dispositivo conectado por cable.' if facts.get('connection_type') in ('both', 'cable') else
                                       'Claro, lleva tu celular cerca del equipo de internet y abre una página que uses habitualmente.') +
                                      (' ¿Sigue lento en esa prueba?' if facts.get('connection_type') in ('both', 'cable') else ' ¿La velocidad mejoró?'),
            }
            return self.guided_response(explanations.get((progress['name'], current_step), 'Con gusto te acompaño paso a paso. ' + self.guided_message(progress['name'], current_step)))
        if progress['name'] == 'internet_lento' and current_step in (2, 3):
            cable_test = current_step == 2 and facts.get('connection_type') in ('both', 'cable')
            # El sí/no se interpreta según la pregunta realmente enviada.
            resolved = (re.fullmatch(r'no(?: ya no)?|ya no(?: esta lento)?', text) if cable_test
                        else re.fullmatch(r'si(?: mejoro| ahora cargan mejor)?|mejoro|ahora cargan mejor', text))
            if resolved:
                facts['service_restored'] = True
                memory.finish()
                return self.guided_response('¡Me alegra que la conexión haya mejorado! Si pausaste descargas, retómalas una por una para comprobar cuál afecta la velocidad. Si la lentitud vuelve, aquí estaré para ayudarte.')
        if not answers_question(progress['name'], current_step, message):
            return self.guided_response(
                ('Para seguir ayudándote, necesito aclarar cómo hiciste la prueba. ¿Fue por WiFi, por cable o por ambos?'
                 if progress['name'] == 'internet_lento' and current_step == 1 else
                 'Vamos paso a paso. ' + self.guided_message(progress['name'], current_step))
            )
        memory.get_context().setdefault('diagnostic_answers', []).append({
            'flow': progress['name'], 'step': current_step,
            'question': progress.get('last_question', self.guided_message(progress['name'], current_step)), 'answer': message,
        })
        next_step = int(progress.get("step", 0)) + 1
        if progress.get('name') == 'internet_lento' and next_step == 1 and facts.get('connection_type'):
            next_step = 2
        if progress.get('name') == 'internet_lento' and next_step == 3 and facts.get('router_restart_result') == 'failed':
            next_step = 4
        if progress.get('name') == 'sin_internet' and next_step == 1 and facts.get('fiber_checked'):
            next_step = 2
        if progress.get('name') == 'sin_internet' and next_step == 2 and facts.get('router_restart_result') == 'failed':
            return self.offer_outage_ticket('El reinicio que ya realizaste no recuperó el servicio.')
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
        return self.guided_response(self.guided_message(progress['name'], next_step))
    def offer_outage_ticket(self, reason):
        facts = memory.get_context().setdefault('diagnostic_facts', {})
        diagnosis = dict(GUIDED_FLOWS['sin_internet']['diagnosis'])
        if facts.get('los_status') == 'red' or facts.get('pon_status') == 'off':
            diagnosis.update(code='PERDIDA_SENAL_OPTICA', cause='Posible pérdida de señal óptica según los indicadores reportados.')
        memory.set_diagnosis(diagnosis)
        memory.set_dialog_state('WAITING_TICKET_CONFIRMATION')
        facts['ticket_offered'] = True
        return self.guided_response(f'{reason} ¿Deseas que registre un ticket?')

    def process_support_guide(self, intent):
        """Convierte una entrada de la base de conocimiento en una acción."""
        guide = get_support_guide(intent)
        if not guide:
            return None

        flow = guide.get("flow")
        if flow == "message":
            return {
                "action": {"type": "MESSAGE", "message": guide["message"], "reply_key": f"info:{intent}"},
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
            memory.set_dialog_state("WAITING_TICKET_CONFIRMATION")
            return self.guided_response("¿Confirmas que deseas registrar un ticket para revisión técnica?")
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
        if any(re.search(r"\b" + re.escape(word) + r"\b", text) for word in negative):
            solution = memory.get_solution() or {}
            steps = solution.get('steps') or []
            conversation = memory.get_context()['conversation']
            next_step = conversation.get('solution_step', 0) + 1
            if next_step < len(steps):
                conversation['solution_step'] = next_step
                return self.guided_response(f"{steps[next_step]} ¿El problema se solucionó?")
            memory.set_dialog_state("WAITING_TICKET_CONFIRMATION")
            return {
                "action": {
                    "type": "ASK",
                    "message": "Entiendo que el problema no se ha solucionado.\n\n¿Deseas generar un ticket para que un técnico revise tu servicio FTTH?"
                },
                "intent": memory.get_intent(),
                "entities": memory.get_entities()
            }
        if any(re.search(r"\b" + re.escape(word) + r"\b", text) for word in positive):
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
        decision = ticket_decision(message)
        if decision is False:
            memory.get_context().setdefault('diagnostic_facts', {})['ticket_confirmed'] = False
            memory.finish()
            return self.guided_response('Entendido, no registraré ningún ticket. Si necesitas ayuda más adelante, aquí estaré.')
        if decision is True:
            memory.get_context().setdefault('diagnostic_facts', {})['ticket_confirmed'] = True
            memory.set_dialog_state('CREATING_TICKET')
            return self.create_ticket()
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
        # Consentimiento inequívoco; «quiero saber» o «si cuesta...» no lo son.
        accepted = re.fullmatch(
            r'(si|ok|correcto|acepto|claro|dale|adelante|de acuerdo)( por favor)?|'
            r'(si )?(quiero |deseo |por favor )?(generar|genera|genere|registrar|registra|registre|crear|crea|cree) (el |un )?(ticket|reclamo)( tecnico)?( por favor)?', text)
        if accepted:
            memory.set_dialog_state("CREATING_TICKET")
            return self.create_ticket()
        return {
            "action": {
                "type": "ASK",
                "message": "Puedo registrar la falla para revisión técnica. ¿Quieres que cree el ticket?"
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
                    "message": "Prepararé la solicitud; el sistema confirmará el número cuando quede registrada."
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
