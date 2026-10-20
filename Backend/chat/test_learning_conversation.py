"""State/consent/privacy and contextual retrieval regressions (no SMTP/DB writes)."""
import base64
import json
import unittest
from assistant_runner import process_message
from knowledge_retrieval import retrieve, POLICY, score
from guided_answers import ticket_decision

class LearningConversationTests(unittest.TestCase):
    def setUp(self): self.context = None
    def say(self, text, **extra):
        context = dict(self.context or {}); context.update(extra)
        encoded = base64.urlsafe_b64encode(json.dumps(context).encode()).decode()
        result = process_message(text, '999', encoded)
        self.context = json.loads(json.dumps(result['context']))
        return result
    def test_exact_reported_conversation_optical(self):
        self.assertIn('ayudarte',self.say('hola')['response'])
        self.assertIn('Muy bien',self.say('buenas noches como esta')['response'])
        self.assertIn('cuál es tu duda',self.say('tengo una duda')['response'])
        self.assertIn('conexión',self.say('puedes ayudarme con mi problema de mi servicio')['response'])
        self.assertIn('luz roja',self.say('no tengo acceso a internet')['response'])
        self.assertIn('nombres',self.say('hay varias luces rojas')['response'])
        result=self.say('la LOS esta roja')
        self.assertIn('sin tocarlo',result['response'])
        self.assertEqual(result['reply_key'],'outage:fiber_check')
        result=self.say('el cable esta todo bien no tiene daños')
        self.assertEqual(result['dialog_state'],'WAITING_TICKET_CONFIRMATION')
        self.assertNotIn('reinic',result['response'])
        result=self.say('no gracias')
        self.assertEqual(result['dialog_state'],'FINISHED');self.assertIsNone(result['ticket'])
    def test_restart_failure_does_not_repeat(self):
        self.say('no tengo acceso a internet')
        self.say('la LOS esta apagada')
        self.assertIn('corriente',self.say('el cable esta todo bien no tiene daños')['response'])
        result=self.say('no regreso el internet sigue hay fallas')
        self.assertEqual(result['dialog_state'],'WAITING_TICKET_CONFIRMATION')
        self.assertNotIn('Desconecta',result['response'])
        self.assertIsNone(self.say('no gracias')['ticket'])
    def test_contextual_los_confirmation_skips_restart(self):
        self.say('no tengo internet')
        self.say('sí está roja')
        result=self.say('el cable está bien sin daños')
        self.assertEqual(result['dialog_state'],'WAITING_TICKET_CONFIRMATION')
        self.assertNotIn('reinicia',result['response'].lower())
    def test_premature_restart_report_is_remembered(self):
        self.say('no tengo internet ya reinicie y no funciona')
        self.say('la LOS esta apagada')
        result=self.say('el cable esta bien sin daños')
        self.assertEqual(result['dialog_state'],'WAITING_TICKET_CONFIRMATION')
    def test_polite_consent(self):
        for text in ['no gracias','mejor no','por ahora no','no quiero ticket gracias','después','prefiero esperar','no generes el ticket']:
            with self.subTest(text=text):self.assertIs(ticket_decision(text),False)
        for text in ['sí','sí quiero','genere un ticket','si por favor','dale']:
            with self.subTest(text=text):self.assertIs(ticket_decision(text),True)
        for text in ['no funciona','no tengo internet','si sigue mal','mi amigo dice si']:
            with self.subTest(text=text):self.assertIsNone(ticket_decision(text))
    def test_explicit_pon_is_not_los(self):
        result=self.say('la luz PON esta apagada')
        self.assertEqual(result['context']['diagnostic_facts']['pon_status'],'off');self.assertNotIn('LOS roja',result['response'])
    def test_old_issue_does_not_assert_old_los_current(self):
        result=self.say('tengo el mismo problema de ayer',_private_history=[{'intent':'los_rojo'}])
        self.assertIn('anterior',result['response'])
        result=self.say('si')
        self.assertIn('luz roja',result['response'])
        self.assertNotIn('_private_history',result['context'])
    def test_ticket_state_is_real_scoped_input(self):
        result=self.say('como va mi ticket',_ticket_lookup={'requested':True,'ticket':{'ticket_code':'TK-REAL','status':'EN_CAMINO'}})
        self.assertIn('TK-REAL',result['response']);self.assertIn('en camino',result['response'])
        self.assertNotIn('_ticket_lookup',result['context'])
    def test_no_other_user_ticket_fallback(self):
        self.assertIn('No encontré',self.say('estado del ticket TK-888',_ticket_lookup={'requested':True,'ticket':None})['response'])
    def test_resolved_precedes_previous_optical_facts(self):
        self.say('la luz LOS esta roja')
        self.assertEqual(self.say('ya tengo internet')['dialog_state'],'FINISHED')

class RetrievalTests(unittest.TestCase):
    def entry(self, **kwargs):
        return dict(id=4,version=2,question='Mi internet está lento.',variants=[],answer='¿Sucede en todos tus dispositivos o solamente en uno?',intent='internet_lento',reply_key='slow:device_scope',conditions={},policy_version=POLICY['version'],**kwargs)
    def test_paraphrase_selects_stored_answer(self):
        item=self.entry();answer,trace=retrieve('mi conexión va muy lenta','internet_lento','slow:device_scope',{},[item])
        self.assertEqual(answer,item['answer']);self.assertTrue(trace['selected']);self.assertEqual(trace['knowledgeId'],'4')
    def test_no_record_different_step_intent_or_policy(self):
        item=self.entry()
        for intent,key in [('sin_internet','slow:device_scope'),('internet_lento',None),('internet_lento','outage:fiber_check')]:
            self.assertIsNone(retrieve('internet lento',intent,key,{},[item])[0])
        item['policy_version']='obsolete';self.assertIsNone(retrieve('internet lento','internet_lento','slow:device_scope',{},[item])[0])
    def test_optical_requires_confirmed_fact(self):
        item=self.entry();item.update(intent='los_rojo',reply_key='outage:fiber_check',question='La LOS está roja',conditions={'los_status':'red'})
        self.assertIsNone(retrieve('La LOS está roja','los_rojo','outage:fiber_check',{},[item])[0])
        self.assertIsNotNone(retrieve('La LOS está roja','los_rojo','outage:fiber_check',{'diagnostic_facts':{'los_status':'red'}},[item])[0])
    def test_score_distinguishes_unrelated_content(self):
        self.assertGreater(score('internet muy lento','la conexion esta lenta'),.78)
        self.assertLess(score('quiero cocinar arroz','internet lento'),.55)
    def test_ambiguous_symptoms_remain_with_rules_for_clarification(self):
        answer,trace=retrieve('internet lento y sin internet','internet_lento','slow:device_scope',{},[self.entry()])
        self.assertIsNone(answer);self.assertTrue(trace['requiresReview'])
    def test_runner_uses_snapshot_without_persisting_it(self):
        c=LearningConversationTests();c.setUp();item=self.entry()
        result=c.say('mi internet está lento',_knowledge_snapshot=[item])
        self.assertEqual(result['response'],item['answer']);self.assertTrue(result['retrieval']['selected'])
        self.assertNotIn('_knowledge_snapshot',result['context'])
if __name__=='__main__':unittest.main()
