import json
import tempfile
import unittest
from pathlib import Path
from supervised_model import split_groups, fit, predict_model, train, promote, rollback, load_version

class SupervisedTrainingTests(unittest.TestCase):
    def rows(self):
        samples={
          'internet_lento':['internet lento al navegar en mi casa','conexión lenta cuando descargo documentos','lentitud en todos mis equipos de oficina','internet demasiado lento desde ayer'],
          'sin_internet':['no tengo internet desde esta mañana','sin conexión en todos los dispositivos','no hay internet en mi vivienda','perdí el acceso a internet por completo'],
          'facturacion':['duda sobre el pago de mi factura','consulta de facturación del servicio','necesito entender el cobro mensual','como puedo consultar mi factura'],
        }
        return [dict(knowledgeKey=f'{label}-{i}',intent=label,question=text,variants=[],status='VALIDATED',privacyReviewed=True) for label,texts in samples.items() for i,text in enumerate(texts)]
    def test_insufficient_realistic_volume_blocks_training(self):
        with self.assertRaisesRegex(ValueError,'Datos insuficientes'):split_groups(self.rows())
    def test_group_split_no_leakage_and_deduplicates(self):
        rows=self.rows();rows[0]['variants']=['mi internet funciona demasiado despacio']
        splits=split_groups(rows,minimum=3)
        groups={k:{r['group'] for r in v} for k,v in splits.items()}
        self.assertFalse(groups['train']&groups['validation']);self.assertFalse(groups['train']&groups['test']);self.assertFalse(groups['test']&groups['validation'])
        rows.append({**rows[0],'knowledgeKey':'conflicting'})
        with self.assertRaisesRegex(ValueError,'repetida'):split_groups(rows,minimum=3)
    def test_unreviewed_and_private_examples_rejected(self):
        for change in [{'status':'PENDING'},{'privacyReviewed':False},{'question':'mi correo es prueba@example.com'}]:
            rows=self.rows();rows[0].update(change)
            with self.assertRaises(ValueError):split_groups(rows,minimum=3)
    def test_parameters_are_fitted_and_test_metrics_exist(self):
        rows=[{'text':r['question'],'intent':r['intent']} for r in self.rows()]
        model=fit(rows)
        self.assertEqual(predict_model(model,'consulta sobre mi factura mensual')[0],'facturacion')
        artifact=train(self.rows(),lambda text:'desconocido',minimum=3)
        self.assertIn('idf',artifact['model']);self.assertGreater(artifact['splitCounts']['test'],0);self.assertIn('macroF1',artifact['hybrid'])
    def test_promotion_hash_regression_gate_and_rollback(self):
        with tempfile.TemporaryDirectory(prefix="test-model-", dir=Path(__file__).resolve().parent) as directory:
            root=Path(directory)
            for version in ('test-v1','test-v2'):
                (root/(version+'.json')).write_text(json.dumps({'schema':1,'promotable':True,'version':version}))
            with self.assertRaises(ValueError):promote(root,'test-v1',False)
            promote(root,'test-v1',True);promote(root,'test-v2',True)
            self.assertEqual(json.loads((root/'active.json').read_text())['current']['version'],'test-v2')
            rollback(root);entry=json.loads((root/'active.json').read_text())['current'];self.assertEqual(entry['version'],'test-v1')
            (root/'test-v1.json').write_text('{}')
            with self.assertRaises(ValueError):load_version(root,entry)
    def test_failed_evaluation_cannot_promote(self):
        with tempfile.TemporaryDirectory(prefix="test-model-", dir=Path(__file__).resolve().parent) as directory:
            root=Path(directory);(root/'failed.json').write_text(json.dumps({'schema':1,'promotable':False}))
            with self.assertRaises(ValueError):promote(root,'failed',True)
if __name__=='__main__':unittest.main()
