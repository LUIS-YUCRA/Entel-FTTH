import unittest
from dialog_manager import dialog_manager
from memory import memory


class ConversationRegressionTests(unittest.TestCase):
    def setUp(self):
        memory.clear()

    def start(self, name, step=0):
        memory.context['guided_flow'] = {'name': name, 'step': step}
        memory.set_dialog_state('GUIDED_DIAGNOSIS')

    def say(self, message):
        return dialog_manager.process_message(message)['action']['message']

    def test_repeated_outage_does_not_answer_lights(self):
        self.start('sin_internet')
        for _ in range(3):
            self.assertIn('luz roja', self.say('no tengo internet'))
            self.assertEqual(memory.context['guided_flow']['step'], 0)

    def test_outage_replaces_slowness(self):
        self.start('internet_lento')
        self.assertIn('luz roja', self.say('no tengo internet'))
        self.assertEqual(memory.context['guided_flow']['name'], 'sin_internet')

    def test_yes_does_not_select_connection_type(self):
        self.start('internet_lento', 1)
        self.say('si')
        self.assertEqual(memory.context['guided_flow']['step'], 1)

    def test_red_light_contradicts_unpowered_router(self):
        self.start('router_power', 2)
        self.assertIn('recibe energía', self.say('sigue con luz roja'))
        self.assertIsNone(memory.get_diagnosis())

    def test_broken_fiber_skips_redundant_checks(self):
        self.start('sin_internet', 1)
        self.say('el cable de fibra esta cortado le cayo una rama')
        self.assertEqual(memory.get_dialog_state(), 'WAITING_TICKET_CONFIRMATION')

    def test_wall_does_not_confirm_ventilation(self):
        self.start('router_restarts', 1)
        self.say('esta colgado en mi pared')
        self.assertEqual(memory.context['guided_flow']['step'], 1)

    def test_scope_does_not_answer_frequency(self):
        self.start('internet_intermittent')
        self.say('Sí, afecta a todos los equipos y al sistema de pedidos')
        self.assertEqual(memory.context['guided_flow']['step'], 0)

    def test_photo_keeps_confirmation_pending(self):
        memory.set_dialog_state('WAITING_TICKET_CONFIRMATION')
        self.assertIn('evidencia', self.say('te mande una imagen de mi equipo'))
        self.assertIsNone(memory.get_ticket())

    def test_restoration_does_not_generate_ticket(self):
        self.start('sin_internet', 2)
        self.say('ya tengo internet')
        self.assertEqual(memory.get_dialog_state(), 'FINISHED')
        self.assertIsNone(memory.get_ticket())

    def test_normal_outage_to_ticket(self):
        self.start('sin_internet')
        for message in ['si hay luz roja', 'el cable esta bien conectado', 'sigue sin internet']:
            self.say(message)
        self.assertEqual(memory.get_dialog_state(), 'WAITING_TICKET_CONFIRMATION')
        self.say('si genere el ticket')
        self.assertEqual(memory.get_dialog_state(), 'FINISHED')
        self.assertIsNotNone(memory.get_ticket())

    def test_declining_ticket_finishes_conversation(self):
        memory.set_dialog_state('WAITING_TICKET_CONFIRMATION')
        self.say('no quiero generar ticket')
        self.assertEqual(memory.get_dialog_state(), 'FINISHED')
        self.assertIsNone(memory.get_ticket())

    def test_negative_restoration_is_not_success(self):
        self.start('sin_internet', 2)
        self.say('ya funciona pero sigue cortandose')
        self.assertNotEqual(memory.get_dialog_state(), 'FINISHED')


if __name__ == '__main__':
    unittest.main()
