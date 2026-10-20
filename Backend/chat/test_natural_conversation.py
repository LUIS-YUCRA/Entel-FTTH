"""Regresiones del contrato conversacional; sin correo ni tickets reales."""
import base64
import json
import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

from assistant_runner import process_message
from knowledge_base import greeting, normalize_text, detect_direct_intent
from config import Config
from memory import memory
from dialog_manager import dialog_manager
from guided_flows import GUIDED_FLOWS
from guided_answers import ANSWER_PATTERNS


class NaturalConversationTests(unittest.TestCase):
    def setUp(self):
        self.context = None
        memory.clear()

    def say(self, text):
        encoded = base64.urlsafe_b64encode(json.dumps(self.context).encode()).decode() if self.context else None
        result = process_message(text, '999', encoded)
        # JSON roundtrip simulates separate Python processes and database persistence.
        self.context = json.loads(json.dumps(result['context']))
        self.assertTrue(result['success'])
        self.assertTrue(result['response'].strip())
        return result

    def test_hour_boundaries(self):
        for hour, minute, expected in [(4,59,'noches'),(5,0,'días'),(11,59,'días'),
                                       (12,0,'tardes'),(18,59,'tardes'),(19,0,'noches'),(0,0,'noches')]:
            with self.subTest(hour=hour, minute=minute):
                instant = datetime(2026,10,12,hour,minute,tzinfo=timezone(timedelta(hours=-4)))
                self.assertIn(expected, greeting('hola', instant.astimezone(timezone.utc)))

    def test_configurable_hours(self):
        with patch.object(Config, 'GREETING_NIGHT_HOUR', 18):
            self.assertIn('noches', greeting('hola', datetime(2026,10,12,22,tzinfo=timezone.utc)))

    def test_explicit_greetings_override_clock(self):
        for text, expected in [('buenas tardes','tardes'),('buenos días','días'),('buenas noches','noches')]:
            self.assertIn(expected, greeting(text, datetime(2026,10,12,13,tzinfo=timezone.utc)))

    def test_greeting_variants(self):
        for text in ['hola','holaa','ola','buenas','qué tal','cómo estás','hey','saludos']:
            with self.subTest(text=text):
                self.context = None
                result = self.say(text)
                self.assertIn('¿En qué puedo ayudarte?', result['response'])
                self.assertEqual(result['intent'], 'saludo')
                self.assertLess(len(result['response']), 85)

    def test_does_not_repeat_greeting(self):
        self.say('hola')
        self.assertEqual(self.say('hola')['response'], 'Dime, ¿en qué puedo ayudarte?')

    def test_general_questions(self):
        cases = {'tengo una duda':'¿cuál es tu duda?', 'tengo una pregunta':'¿qué necesitas saber?',
                 'quiero consultar algo':'¿qué deseas consultar?', 'tengo un problema':'¿qué problema tienes?',
                 'necesito ayuda':'¿en qué necesitas ayuda?', 'me puedes ayudar':'ayuda', 'no sé qué hacer':'ayuda'}
        for text, expected in cases.items():
            with self.subTest(text=text):
                self.assertIn(expected,self.say(text)['response'])

    def test_reported_regression_and_context(self):
        self.say('buenas tardes')
        self.say('tengo una duda')
        result = self.say('tengo falla en mi internet q ago')
        self.assertEqual(result['intent'],'problema_internet_general')
        self.assertIn('¿No tienes internet o la conexión está lenta?',result['response'])
        result = self.say('no tengo')
        self.assertEqual(result['intent'],'sin_internet')
        self.assertIn('luz roja',result['response'])

    def test_fragment_after_general_problem(self):
        self.say('tengo un problema')
        self.assertIn('conexión está lenta',self.say('con mi internet')['response'])
        self.assertIn('luz roja',self.say('no tengo')['response'])

    def test_normalization_preserves_identifiers(self):
        for text in ['TK-001','q123','internte@example.com','inter-921875','Router_AB12','ago2026']:
            self.assertEqual(normalize_text(text),text.lower())
        self.assertEqual(normalize_text('  NO AY intenert!! '),'no hay internet')
        self.assertEqual(normalize_text('mi inter q ago'),'mi internet que hago')
        self.assertEqual(normalize_text('mi wify y mi ruter'),'mi wifi y mi router')

    def test_original_message_preserved(self):
        original = 'Tengo FALLA en mi intenert q ago!!'
        self.say(original)
        self.assertEqual(self.context['conversation']['history'][-1]['user'],original)

    def test_technical_recognition(self):
        cases = {'no ay intenert':'sin_internet','se me fue el internet':'sin_internet',
                 'mi internet está fallando':'problema_internet_general','mi wifi anda mal':'problema_wifi_general',
                 'mi ruter no prende':'router_power','se corta a cada rato':'cortes_internet',
                 'no tengo señal':'sin_internet','luz LOS roja':'los_rojo','PON apagada':'problema_pon'}
        for text, intent in cases.items():
            with self.subTest(text=text):
                self.assertEqual(detect_direct_intent(text),intent)

    def test_social_and_off_topic_do_not_consume_pending_step(self):
        self.say('no tengo internet')
        for text in ['tengo una duda','gracias','mi mujer no está bien de salud','mi compañero es un flojo']:
            self.say(text)
            self.assertEqual(self.context['guided_flow']['step'],0)
        self.assertIn('fibra',self.say('sí está roja')['response'])

    def test_topic_switch(self):
        self.say('internet lento')
        self.say('ahora no tengo internet')
        self.assertEqual(self.context['guided_flow']['name'],'sin_internet')

    def test_known_los_skips_question_already_answered(self):
        self.assertIn('daños visibles',self.say('luz LOS roja')['response'])
        self.assertEqual(self.context['guided_flow']['step'],1)

    def test_ticket_only_after_explicit_confirmation(self):
        for text in ['no tengo internet','sí está roja','el cable está bien conectado','sigue sin internet']:
            self.assertIsNone(self.say(text)['ticket'])
        for text in ['quiero saber si cuesta','si cuesta no quiero','tengo una duda']:
            self.assertIsNone(self.say(text)['ticket'])
        # A fresh pending request tests consent without the previous explicit refusal.
        self.context = None
        for text in ['no tengo internet','sí está roja','el cable está bien conectado','sigue sin internet']:
            self.say(text)
        result = self.say('sí genere el ticket')
        self.assertIsNotNone(result['ticket'])
        self.assertNotIn('TK-',result['response'])  # Only Node may confirm the real DB code.
        self.assertEqual(result['dialog_state'],'FINISHED')

    def test_solution_negative_requires_consent(self):
        memory.set_dialog_state('WAITING_SOLUTION_CONFIRMATION')
        result = dialog_manager.process_message('no funciona')
        self.assertEqual(memory.get_dialog_state(),'WAITING_TICKET_CONFIRMATION')
        self.assertIsNone(memory.get_ticket())

    def test_all_solution_steps_retained(self):
        memory.set_solution({'steps':['Primero','Segundo','Tercero']})
        memory.set_dialog_state('WAITING_SOLUTION_CONFIRMATION')
        self.assertIn('Segundo',dialog_manager.process_message('no')['action']['message'])
        self.assertIn('Tercero',dialog_manager.process_message('no')['action']['message'])
        dialog_manager.process_message('no')
        self.assertEqual(memory.get_dialog_state(),'WAITING_TICKET_CONFIRMATION')

    def test_restored_closes_without_ticket(self):
        self.say('no tengo internet')
        result = self.say('ya tengo internet')
        self.assertEqual(result['dialog_state'],'FINISHED')
        self.assertIsNone(result['ticket'])

    def test_every_guided_flow_has_answer_validation(self):
        for name, flow in GUIDED_FLOWS.items():
            self.assertEqual(len(ANSWER_PATTERNS[name]),len(flow['messages'])-1,name)

    def test_information_detour_retains_diagnostic_question(self):
        self.say('no tengo internet')
        self.assertIn('fibra óptica', self.say('que es ftth')['response'])
        self.assertEqual(self.context['guided_flow']['step'], 0)
        self.assertIn('fibra', self.say('si esta roja')['response'])

    def test_unrelated_negative_does_not_answer_lights(self):
        self.say('no tengo internet')
        self.say('no he comido nada')
        self.assertEqual(self.context['guided_flow']['step'], 0)

    def test_ticket_summary_keeps_problem_not_greeting(self):
        self.say('hola')
        self.say('tengo un problema')
        self.say('mi internet esta fallando')
        self.assertEqual(self.context['reported_problem'], 'mi internet esta fallando')

    def test_history_is_bounded(self):
        with patch.object(Config, 'MAX_HISTORY',3):
            for _ in range(5):
                self.say('tengo una duda')
            self.assertEqual(len(self.context['conversation']['history']),3)

    def test_unknown_is_clarification_not_invented_diagnosis(self):
        result = self.say('xyz abc 987')
        self.assertEqual(result['response'],'¿Puedes contarme un poco más sobre lo que ocurre?')
        self.assertIsNone(result['diagnosis'])


if __name__ == '__main__':
    unittest.main()
