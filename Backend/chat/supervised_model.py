"""Optional supervised character TF-IDF centroid model; never replaces technical rules.
Training uses only reviewed questions. No raw conversation or automatic promotion.
"""
import argparse
import hashlib
import json
import math
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from knowledge_base import normalize_text

MODEL_DIR = Path(os.environ.get('ASSISTANT_MODEL_DIR', Path(__file__).with_name('models')))

def features(text):
    value = ' ' + normalize_text(text) + ' '
    return Counter(value[i:i+n] for n in (3,4,5) for i in range(len(value)-n+1))

def unit(vector):
    norm = math.sqrt(sum(v*v for v in vector.values())) or 1
    return {k:v/norm for k,v in vector.items()}

def fit(rows):
    documents=[features(r['text']) for r in rows];df=Counter()
    for doc in documents:df.update(doc.keys())
    idf={k:math.log((1+len(rows))/(1+n))+1 for k,n in df.items()}
    centroids=defaultdict(Counter)
    for row,doc in zip(rows,documents):centroids[row['intent']].update(unit({k:(1+math.log(v))*idf[k] for k,v in doc.items()}))
    return {'idf':idf,'centroids':{k:unit(v) for k,v in centroids.items()}}

def predict_model(model,text):
    v=unit({k:(1+math.log(n))*model['idf'][k] for k,n in features(text).items() if k in model['idf']})
    scores=sorted(((sum(n*centroid.get(k,0) for k,n in v.items()),label) for label,centroid in model['centroids'].items()),reverse=True)
    if not scores:return None,0,0
    return scores[0][1],scores[0][0],scores[0][0]-(scores[1][0] if len(scores)>1 else 0)

def split_groups(records, minimum=30):
    groups={};seen={}
    for record in records:
        if record.get('status')!='VALIDATED' or not record.get('privacyReviewed'):
            raise ValueError('El dataset contiene ejemplos sin validación técnica y de privacidad.')
        label=record['intent'];key=record['knowledgeKey'];texts=[record['question'],*record.get('variants',[])]
        for text in texts:
            clean=normalize_text(text)
            if re.search(r'@|https?://|\b\d{4,}\b|\[(?:correo|codigo|numero|dato privado)\]',clean):raise ValueError('Posibles datos privados en dataset.')
            if clean in seen and seen[clean]!=key:raise ValueError('Pregunta repetida en grupos distintos; deduplicar antes de entrenar.')
            for previous, group in seen.items():
                if group != key and SequenceMatcher(None,clean,previous).ratio() >= .94:
                    raise ValueError('Preguntas casi duplicadas entre grupos; agrupar antes de dividir el dataset.')
            seen[clean]=key
        groups[key]={'key':key,'intent':label,'texts':list(dict.fromkeys(texts))}
    labels=defaultdict(list)
    for group in groups.values():labels[group['intent']].append(group)
    if len(labels)<3 or any(len(v)<minimum for v in labels.values()):raise ValueError(f'Datos insuficientes: se requieren al menos 3 intenciones y {minimum} grupos distintos revisados por intención.')
    # Keep paraphrases from one knowledge item in the same split.
    result={'train':[],'validation':[],'test':[]}
    for label,items in labels.items():
        items.sort(key=lambda v:hashlib.sha256(v['key'].encode()).hexdigest())
        train=int(len(items)*.7);validation=max(1,int(len(items)*.15))
        for i,item in enumerate(items):
            split='train' if i<train else 'validation' if i<train+validation else 'test'
            result[split].extend({'text':t,'intent':label,'group':item['key']} for t in item['texts'])
    return result

def metrics(rows,predictions):
    labels=set(r['intent'] for r in rows);f1=[]
    for label in labels:
        tp=sum(r['intent']==label and p==label for r,p in zip(rows,predictions));fp=sum(r['intent']!=label and p==label for r,p in zip(rows,predictions));fn=sum(r['intent']==label and p!=label for r,p in zip(rows,predictions))
        f1.append(2*tp/(2*tp+fp+fn) if 2*tp+fp+fn else 0)
    return {'accuracy':sum(r['intent']==p for r,p in zip(rows,predictions))/len(rows),'macroF1':sum(f1)/len(f1),'count':len(rows)}

def train(records,baseline,minimum=30):
    split=split_groups(records,minimum);model=fit(split['train']);validation=split['validation']
    candidates=[]
    for threshold in (.65,.7,.75,.8,.85,.9,.95):
        selected=[(r,predict_model(model,r['text'])) for r in validation if baseline(r['text'])=='desconocido']
        accepted=[(r,p) for r,p in selected if p[1]>=threshold and p[2]>=.12]
        precision=sum(r['intent']==p[0] for r,p in accepted)/len(accepted) if accepted else 0
        if accepted and precision>=.95:candidates.append((len(accepted),threshold,precision))
    _,threshold,precision=max(candidates,default=(0,1.01,0))
    test=split['test'];base=[baseline(r['text']) for r in test];hybrid=[];changes=0;wrong=0
    for row,old in zip(test,base):
        predicted,confidence,margin=predict_model(model,row['text']);new=old
        if old=='desconocido' and confidence>=threshold and margin>=.12:new=predicted;changes+=1;wrong+=int(new!=row['intent'])
        hybrid.append(new)
    b=metrics(test,base);h=metrics(test,hybrid)
    version=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')+'-'+hashlib.sha256(json.dumps(records,sort_keys=True).encode()).hexdigest()[:10]
    return {'schema':1,'version':version,'model':model,'threshold':threshold,'margin':.12,'datasetHash':hashlib.sha256(json.dumps(records,sort_keys=True).encode()).hexdigest(),
      'splitCounts':{k:len(v) for k,v in split.items()},'baseline':b,'hybrid':h,'validationPrecision':precision,'testAdditions':changes,'testWrongAdditions':wrong,
      'promotable':bool(changes and not wrong and h['macroF1']>=b['macroF1'] and h['accuracy']>=b['accuracy'])}

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def load_version(directory,entry):
    if not entry or not re.fullmatch(r'[\w-]+',entry.get('version','')):return None
    path=directory/(entry['version']+'.json')
    if digest(path)!=entry['sha256']:raise ValueError('Hash del modelo no coincide.')
    artifact=json.loads(path.read_text(encoding='utf-8'))
    if artifact.get('schema')!=1 or not artifact.get('promotable'):raise ValueError('Modelo no aprobado.')
    return artifact

def promote(directory,version,regressions_passed):
    if not regressions_passed:raise ValueError('Primero deben pasar las regresiones.')
    if not re.fullmatch(r'[\w-]+',version):raise ValueError('Versión inválida.')
    path=directory/(version+'.json');entry={'version':version,'sha256':digest(path)}
    load_version(directory,entry)
    pointer=directory/'active.json';previous=json.loads(pointer.read_text())['current'] if pointer.exists() else None
    temporary=directory/'active.tmp';temporary.write_text(json.dumps({'current':entry,'previous':previous}),encoding='utf-8');os.replace(temporary,pointer)

def rollback(directory):
    pointer=directory/'active.json';data=json.loads(pointer.read_text());load_version(directory,data['previous'])
    temporary=directory/'active.tmp';temporary.write_text(json.dumps({'current':data['previous'],'previous':data['current']}),encoding='utf-8');os.replace(temporary,pointer)

def optional_prediction(text):
    try:
        pointer=MODEL_DIR/'active.json'
        if not pointer.exists():return None
        artifact=load_version(MODEL_DIR,json.loads(pointer.read_text())['current'])
        if not artifact:return None
        label,confidence,margin=predict_model(artifact['model'],text)
        if confidence>=artifact['threshold'] and margin>=artifact['margin']:return {'intent':label,'confidence':round(confidence,4),'model_version':artifact['version']}
    except (OSError,ValueError,KeyError,TypeError):return None
    return None

def main():
    parser=argparse.ArgumentParser();parser.add_argument('command',choices=['train','promote','rollback']);parser.add_argument('--dataset');parser.add_argument('--version');parser.add_argument('--directory',default=str(MODEL_DIR));args=parser.parse_args();directory=Path(args.directory)
    if args.command=='train':
        # Disable the optional candidate model when measuring the rules baseline.
        os.environ['ASSISTANT_MODEL_DISABLED']='1'
        from intent_classifier import classifier
        records=json.loads(Path(args.dataset).read_text(encoding='utf-8-sig'))
        artifact=train(records,lambda text:classifier.predict(text)['intent']);directory.mkdir(parents=True,exist_ok=True)
        path=directory/(artifact['version']+'.json')
        with path.open('x',encoding='utf-8') as file:json.dump(artifact,file,ensure_ascii=False)
        print(json.dumps({k:v for k,v in artifact.items() if k!='model'},ensure_ascii=False))
    elif args.command=='promote':
        result=subprocess.run([sys.executable,'-B','-m','unittest','discover','-s',str(Path(__file__).parent),'-p','test_*.py'],check=False)
        promote(directory,args.version,result.returncode==0);print('Modelo promovido con regresiones aprobadas.')
    else:rollback(directory);print('Versión anterior restaurada.')
if __name__=='__main__':main()
