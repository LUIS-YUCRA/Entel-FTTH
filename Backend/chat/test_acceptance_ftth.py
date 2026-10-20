"""Aceptación ejecutable: 30 escenarios y límites de contexto/seguridad."""
import base64
import json
import unittest
from assistant_runner import process_message
from nlp import BasicDocument


class AcceptanceTests(unittest.TestCase):
    def setUp(self):
        self.context = None

    def say(self, message, customer='1001', profile=None, **extra):
        context = dict(self.context or {})
        context.update(extra)
        if profile:
            context['customer'] = dict(profile, id=customer)
        encoded = base64.urlsafe_b64encode(json.dumps(context).encode()).decode()
        result = process_message(message, customer, encoded)
        self.assertTrue(result['success'])
        self.assertTrue(result['response'].strip())
        self.assertLess(len(result['response']), 650)
        self.assertNotRegex(result['response'], r'\b(?:GPON|ONT|NAP|DNS|DHCP|PPPoE|OLT)\b')
        self.assertNotRegex(result['response'].lower(), r'(?:abre|desconecta|mira|empalma) (?:la fibra|el conector|el equipo por dentro)')
        self.context = json.loads(json.dumps(result['context']))
        return result

    def test_01_saludo(self):
        self.assertIn('Buenas tardes', self.say('Buenas tardes')['response'])

    def test_02_consulta(self):
        self.assertIn('cuál es tu duda', self.say('Tengo una duda')['response'])

    def test_03_sin_conexion(self):
        self.assertEqual(self.say('No tengo internet')['intent'], 'sin_internet')

    def test_04_errores(self):
        self.say('tengo falla en mi intenert q ago')
        result = self.say('no funciona nada')
        self.assertEqual(result['intent'], 'sin_internet')
        self.assertIn('luz roja', result['response'])

    def test_05_luz_roja(self):
        result = self.say('Mi aparato tiene una luz roja')
        self.assertNotIn('los_status', result['context']['diagnostic_facts'])
        self.assertIn('sin tocarlo', result['response'])

    def test_06_lentitud(self):
        self.assertEqual(self.say('Esta lento ps')['intent'], 'internet_lento')

    def test_07_cortes(self):
        self.assertIn(self.say('Se corta a cada rato')['intent'], ('cortes_internet','internet_intermittent'))

    def test_08_cobertura(self):
        self.assertEqual(self.say('El wifi no llega a mi cuarto')['intent'], 'wifi_weak')

    def test_09_clave(self):
        self.assertEqual(self.say('Olvide la clave del wifi')['intent'], 'wifi_password')

    def test_10_youtube(self):
        self.assertIn('otras aplicaciones', self.say('YouTube no carga')['response'])

    def test_11_netflix(self):
        self.assertEqual(self.say('Netflix se interrumpe')['intent'], 'streaming')

    def test_12_clases(self):
        self.assertEqual(self.say('Mis clases virtuales estan afectadas')['intent'], 'streaming')

    def test_13_colegio(self):
        result = self.say('Todo el colegio esta sin internet', profile={'customer_category':'INSTITUCION'})
        self.assertEqual(result['intent'], 'sin_internet')

    def test_14_institucion(self):
        self.assertEqual(self.say('La institucion esta sin internet')['intent'], 'sin_internet')

    def test_15_ventas(self):
        self.assertEqual(self.say('No funciona el sistema de ventas')['intent'], 'sin_internet')

    def test_16_cobros(self):
        self.assertEqual(self.say('No podemos cobrar por falta de internet')['intent'], 'sin_internet')

    def test_17_celular(self):
        self.assertEqual(self.say('Mi celular no conecta')['intent'], 'single_device_issue')

    def test_18_computadora(self):
        self.assertEqual(self.say('Mi computadora no conecta')['intent'], 'single_device_issue')

    def test_19_apagado(self):
        self.assertEqual(self.say('Mi equipo de internet esta apagado')['intent'], 'router_power')

    def test_20_cable(self):
        self.assertEqual(self.say('El cable esta cortado')['intent'], 'fiber_cable_damage')

    def test_21_tormenta(self):
        result = self.say('Mi router no funciona despues de una tormenta')
        self.assertIsNone(result['ticket'])
        self.assertNotIn('abre', result['response'].lower())

    def test_22_estado(self):
        result = self.say('Como va mi reclamo', _ticket_lookup={'requested':True,'ticket':{'ticket_code':'TK-432','status':'ASIGNADO'}})
        self.assertIn('TK-432', result['response'])
        self.assertIn('asignado', result['response'])

    def test_23_visita(self):
        result = self.say('Cuando vendran', _ticket_lookup={'requested':True,'ticket':{'ticket_code':'TK-432','status':'ASIGNADO','scheduled_at':'2026-10-15T14:30:00Z'}})
        self.assertIn('15/10/2026', result['response'])
        self.assertIn('10:30', result['response'])

    def test_24_repetido(self):
        self.say('No tengo internet')
        self.say('no tengo internet')
        self.assertEqual(self.context['guided_flow']['step'], 0)
        self.assertIsNone(self.context['ticket'])

    def test_25_continuidad(self):
        self.say('Internet lento')
        self.say('Solo en mi celular')
        result = self.say('No, cerca funciona bien')
        self.assertEqual(self.context['guided_flow']['name'], 'wifi_weak')
        self.assertNotIn('todos', result['response'])

    def test_26_plan(self):
        self.assertIn('No tengo datos verificados', self.say('Que plan tengo contratado')['response'])

    def test_27_facturacion(self):
        self.assertEqual(self.say('Tengo una duda sobre mi factura')['intent'], 'facturacion')

    def test_28_molestia(self):
        result = self.say('Estoy cansado, este internet nunca funciona')
        self.assertIn('?', result['response'])
        self.assertIsNone(result['ticket'])

    def test_29_fuera_del_servicio(self):
        self.assertIn('soporte de internet', self.say('Como preparar una pizza')['response'])
        self.context = None
        self.assertEqual(self.say('No puedo ver el partido por internet')['intent'], 'streaming')

    def test_30_consulta_nueva(self):
        result = self.say('Cuando enciendo una maquina del negocio se reinicia el equipo de internet')
        self.assertIsNone(result['ticket'])
        self.assertNotIn('confirmado', result['response'])
        self.assertNotEqual(result['intent'], 'desconocido')

    def test_negaciones_no_afirmadas(self):
        result = self.say('No hay luz roja')
        self.assertNotEqual(result['intent'], 'los_rojo')
        self.assertIsNone(result['ticket'])

    def test_separacion_de_clientes(self):
        self.say('luz LOS roja')
        result = self.say('Hola', customer='1002')
        self.assertEqual(len(result['context']['conversation']['history']), 1)
        self.assertNotIn('los_status', result['context'].get('diagnostic_facts', {}))

    def test_vectores_reales_y_alternativa(self):
        a = BasicDocument('enunciado uno', vector=[1,0])
        b = BasicDocument('otra frase', vector=[1,0])
        self.assertAlmostEqual(a.similarity(b), .9)
        self.assertLess(BasicDocument('enunciado uno').similarity(BasicDocument('otra frase')), .9)

    def test_aplicacion_no_se_confunde_con_corte_general(self):
        self.say('YouTube no carga')
        self.say('Si, las otras paginas funcionan')
        self.assertEqual(self.context['guided_flow']['branch'], 'application_only')
        self.assertIsNone(self.context['diagnosis'])

    def test_conocimiento_nuevo_requiere_estado_y_version(self):
        from knowledge_retrieval import retrieve, POLICY
        item={'id':80,'version':1,'question':'Una consulta tecnica completamente nueva', 'variants':[],
              'answer':'Comprueba si ocurre también en otro dispositivo.', 'intent':'desconocido',
              'reply_key':'info:general_support','conditions':{},'policy_version':POLICY['version']}
        for state in ('GUIDED_DIAGNOSIS','WAITING_TICKET_CONFIRMATION','FINISHED'):
            answer,_=retrieve(item['question'],'desconocido',item['reply_key'],{'conversation':{'dialog_state':state}},[item])
            self.assertIsNone(answer)
        answer,_=retrieve(item['question'],'desconocido',item['reply_key'],{'conversation':{'dialog_state':'START'}},[item])
        self.assertEqual(answer,item['answer'])

    def test_negativa_no_inventa_estado_los(self):
        self.say('no tengo internet')
        self.say('no')
        self.assertFalse(self.context['diagnostic_facts']['red_light'])
        self.assertNotIn('los_status',self.context['diagnostic_facts'])

    def test_seguridad_electrica_no_recomienda_reencender(self):
        result=self.say('Mi equipo tiene olor a quemado y sale humo')
        self.assertIn('no intentes',result['response'])
        self.assertEqual(result['dialog_state'],'WAITING_TICKET_CONFIRMATION')
        self.assertIsNone(result['ticket'])


if __name__ == '__main__':
    unittest.main()
