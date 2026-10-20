import base64
import json
import unittest
from assistant_runner import process_message
from guided_answers import ticket_decision


class NaturalTicketConsentTests(unittest.TestCase):
    def test_visit_requests_are_consent(self):
        for message in ['que un tecnico venga a mi domicilio', 'si que un tecnico venga a solucionar mi servicio', 'quiero que venga un técnico', 'necesito un tecnico en mi casa', 'manden un tecnico por favor', 'solicito una visita tecnica', 'quiero que lo revise un tecnico', 'no funciona, quiero que venga un tecnico', 'correcto']:
            with self.subTest(message=message):
                self.assertIs(ticket_decision(message), True)

    def test_negatives_take_precedence(self):
        for message in ['no quiero que un tecnico venga', 'no quiero que venga un tecnico', 'si pero no registres el ticket', 'no hace falta un tecnico', 'no venga un tecnico', 'no quiero una visita tecnica', 'no quiero']:
            with self.subTest(message=message):
                self.assertIs(ticket_decision(message), False)

    def test_questions_conditions_and_complaints_are_not_consent(self):
        for message in ['no funciona', 'sigue igual', 'cuando viene el tecnico', 'si es gratis quiero que venga un tecnico', 'quiero saber cuando viene el tecnico', 'es necesario que un tecnico venga', 'cuando venga un tecnico avisame', 'me dijeron que un tecnico venga']:
            with self.subTest(message=message):
                self.assertIsNone(ticket_decision(message))

    def test_reported_phrase_creates_proposal_in_one_turn_after_offer(self):
        context={'conversation':{'history':[],'dialog_state':'WAITING_TICKET_CONFIRMATION','finished':False},'intent':{'intent':'sin_internet','confidence':.95},'entities':{'lights':{}},'flags':{},'customer':{'id':'999'},'diagnosis':{'code':'SIN_INTERNET','problem':'Sin internet','cause':'Requiere revisión','ticket_required':True,'priority':'ALTA'}}
        for message in ['que un tecnico venga a mi domicilio','si que un tecnico venga a solucionar mi servicio']:
            encoded=base64.urlsafe_b64encode(json.dumps(context).encode()).decode()
            result=process_message(message,'999',encoded)
            self.assertTrue(result['success'])
            self.assertIsNotNone(result['ticket'])
            self.assertTrue(result['context']['diagnostic_facts']['ticket_confirmed'])
            self.assertEqual(result['dialog_state'],'FINISHED')

    def test_request_before_offer_does_not_create_ticket(self):
        result=process_message('quiero que venga un tecnico a mi domicilio','999')
        self.assertIsNone(result['ticket'])


if __name__=='__main__':
    unittest.main()
