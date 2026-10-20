"""Casos de clientes reales: contexto persistido entre todos los turnos."""
import base64
import json
import unittest

from assistant_runner import process_message
from guided_answers import connection_type


class FriendlySupportTests(unittest.TestCase):
    def setUp(self):
        self.context = None

    def say(self, text):
        encoded = base64.urlsafe_b64encode(json.dumps(self.context).encode()).decode() if self.context else None
        result = process_message(text, '999', encoded)
        self.context = json.loads(json.dumps(result['context']))
        self.assertTrue(result['success'])
        self.assertIsNone(result['ticket'])
        return result['response']

    def test_reported_customer_conversation(self):
        self.assertIn('Lamento', self.say('mi servicio esta muy lento desde ayer'))
        self.assertIn('WiFi', self.say('si en todos los dispositivos'))
        response = self.say('por ambos')
        self.assertNotIn('¿Los dispositivos están conectados', response)
        self.assertNotIn('Acércate', response)
        self.assertIn('también ocurre por cable', response)
        self.assertIn('pausa', response.lower())
        self.assertEqual(self.context['diagnostic_facts']['connection_type'], 'both')
        self.assertEqual(self.context['diagnostic_facts']['reported_since'], 'desde ayer')
        self.assertIn('reinicio', self.say('si sigue lento'))
        self.assertIn('ticket', self.say('no, sigue igual'))
        self.assertEqual(self.context['conversation']['dialog_state'], 'WAITING_TICKET_CONFIRMATION')

    def test_short_connection_variants(self):
        for answer in ['por ambos', 'ambas', 'los dos', 'las dos', 'de las dos formas', 'por wifi y por cable algunos']:
            with self.subTest(answer=answer):
                self.context = None
                self.say('mi internet esta lento')
                self.say('en todos')
                response = self.say(answer)
                self.assertIn('también ocurre por cable', response)
                self.assertEqual(self.context['guided_flow']['step'], 2)

    def test_complete_description_skips_answered_questions(self):
        response = self.say('mi internet esta lento en todos los dispositivos por wifi y cable desde ayer')
        self.assertIn('también ocurre por cable', response)
        self.assertNotIn('¿Los dispositivos', response)

    def test_wifi_suggestion_and_improvement(self):
        self.say('mi internet esta lento')
        self.say('en todos')
        self.assertIn('cerca', self.say('solo wifi'))
        self.assertIn('Me alegra', self.say('si mejoro'))
        self.assertTrue(self.context['conversation']['finished'])

    def test_negative_answer_to_cable_test_means_improvement(self):
        self.say('mi internet esta lento en todos los dispositivos por cable')
        self.assertIn('Me alegra', self.say('no'))
        self.assertTrue(self.context['conversation']['finished'])

    def test_reference_is_scoped_to_connection_question(self):
        self.assertIsNone(connection_type('ambos'))
        self.assertEqual(connection_type('ambos', True), 'both')
        self.assertEqual(connection_type('wifi pero no probe cable', True), 'wifi')

    def test_failed_restart_not_requested_twice(self):
        self.say('mi internet esta lento')
        self.say('en todos')
        self.say('por ambos')
        response = self.say('ya reinicie y sigue igual')
        self.assertIn('ticket', response)
        self.assertNotIn('desconecta', response.lower())

    def test_other_support_openings_are_supportive(self):
        for message in ['no tengo internet', 'se corta a cada rato', 'mi router no prende', 'mi wifi tiene poca señal', 'el cable de fibra esta dañado', 'youtube no carga']:
            with self.subTest(message=message):
                self.context = None
                response = self.say(message)
                self.assertRegex(response.lower(), r'ayud|lamento|revisemos|revisar')
                self.assertLessEqual(response.count('?'), 1)
                self.assertTrue(response.strip())

    def test_single_wired_device_does_not_get_wifi_distance_advice(self):
        self.say('mi internet esta lento')
        response = self.say('solo en mi computadora conectada por cable')
        self.assertNotIn('cerca', response)
        self.assertEqual(self.context['guided_flow']['name'], 'ethernet_problem')

    def test_help_explains_connection_without_advancing(self):
        self.say('mi internet esta lento')
        self.say('en todos')
        self.assertIn('sin cables', self.say('no entiendo como hago'))
        self.assertEqual(self.context['guided_flow']['step'], 1)
        self.assertIn('también ocurre por cable', self.say('por ambos'))

    def test_cut_cable_does_not_repeat_damage_question(self):
        response = self.say('el cable de fibra esta cortado')
        self.assertIn('reparación técnica', response)
        self.assertIn('No lo manipules', response)
        self.assertEqual(self.context['conversation']['dialog_state'], 'WAITING_TICKET_CONFIRMATION')

    def test_recorded_diagnostic_question_matches_cable_branch(self):
        self.say('mi internet esta lento')
        self.say('en todos')
        question = self.say('por ambos')
        self.say('si sigue lento')
        recorded = self.context['diagnostic_answers'][-1]
        self.assertIn('por cable', recorded['question'])
        self.assertEqual(recorded['answer'], 'si sigue lento')
        self.assertTrue(question.endswith('¿Sigue lento en esa prueba?'))

    def test_no_to_application_still_failing_resolves_without_ticket(self):
        self.say('youtube no carga')
        self.say('tambien fallan otras paginas')
        self.say('nadie mas usa internet')
        response = self.say('no')
        self.assertIn('Me alegra', response)
        self.assertTrue(self.context['conversation']['finished'])


if __name__ == '__main__':
    unittest.main()
