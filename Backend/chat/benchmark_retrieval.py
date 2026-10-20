"""Calibrate retrieval thresholds against a small, labeled FTTH contrast set.
Input: approved PostgreSQL snapshot as JSON on stdin. No private transcripts.
"""
import json
import sys
import time
from statistics import median
import knowledge_retrieval as retrieval

CASES=[
 ('mi internet está lento','internet_lento','slow:device_scope',{},True),
 ('la conexión va muy lenta','internet_lento','slow:device_scope',{},True),
 ('internet demora al abrir páginas','internet_lento','slow:device_scope',{},True),
 ('la velocidad es baja','internet_lento','slow:device_scope',{},True),
 ('el internet tarda demasiado','internet_lento','slow:device_scope',{},True),
 ('la LOS está roja','los_rojo','outage:fiber_check',{'los_status':'red'},True),
 ('LOS parpadea roja y no tengo internet','sin_internet','outage:fiber_check',{'los_status':'red'},True),
 ('sin internet con luz LOS roja','sin_internet','outage:fiber_check',{'los_status':'red'},True),
 ('internet lento y sin internet','internet_lento','slow:device_scope',{},False),
 ('va lento y no tengo conexión','internet_lento','slow:device_scope',{},False),
 ('internet lento','sin_internet','slow:device_scope',{},False),
 ('internet lento','internet_lento',None,{},False),
 ('la LOS está roja','los_rojo','outage:fiber_check',{},False),
 ('la LOS está apagada','sin_internet','outage:fiber_check',{'los_status':'off'},False),
 ('mi esposa está enferma','internet_lento','slow:device_scope',{},False),
 ('quiero cocinar arroz','internet_lento','slow:device_scope',{},False),
 ('no gracias','sin_internet',None,{},False),
 ('cómo va mi ticket','estado_reclamo',None,{},False),
 ('tengo una duda','duda_general',None,{},False),
 ('el internet está lento','internet_lento','outage:fiber_check',{},False),
]

def run(snapshot):
 results=[]
 for threshold in (.65,.70,.75,.78,.80,.85,.90):
  retrieval.HIGH_THRESHOLD=threshold;tp=fp=fn=tn=0;elapsed=[];failures=[]
  for message,intent,key,facts,expected in CASES:
   start=time.perf_counter();answer,trace=retrieval.retrieve(message,intent,key,{'diagnostic_facts':facts},snapshot);elapsed.append((time.perf_counter()-start)*1000)
   selected=answer is not None
   tp+=int(selected and expected);fp+=int(selected and not expected);fn+=int(not selected and expected);tn+=int(not selected and not expected)
   if selected!=expected:failures.append(message)
  results.append({'threshold':threshold,'cases':len(CASES),'tp':tp,'fp':fp,'fn':fn,'tn':tn,'precision':tp/(tp+fp) if tp+fp else 0,'recall':tp/(tp+fn),'medianRetrievalMs':round(median(elapsed),3),'failures':failures})
 return results
if __name__=='__main__':print(json.dumps(run(json.load(sys.stdin)),ensure_ascii=False,indent=2))
