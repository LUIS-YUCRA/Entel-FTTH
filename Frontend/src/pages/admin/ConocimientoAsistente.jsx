import {useEffect,useState} from 'react';
import AdminHeader from '../../components/Header/AdminHeader';
import {apiRequest} from '../../services/ApiService';
import './ConocimientoAsistente.css';
const statuses={PENDING:'Pendiente',NEEDS_REVIEW:'Requiere revisión',USEFUL:'Útil, sin publicar',VALIDATED:'Validado',REJECTED:'Rechazado',OBSOLETE:'Obsoleto'};
export default function ConocimientoAsistente(){
  const [data,setData]=useState({items:[],policy:{slots:{}},metrics:{}});
  const [status,setStatus]=useState('');const [after,setAfter]=useState(0);
  const [form,setForm]=useState(null);const [versions,setVersions]=useState([]);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const load=async()=>{const result=await apiRequest(`/assistant-knowledge?status=${status}&after=${after}`);setData(result);};
  useEffect(()=>{let active=true;apiRequest(`/assistant-knowledge?status=${status}&after=${after}`).then(result=>{if(active)setData(result);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[status,after]);
  const edit=async(item)=>{setForm({...item,replyKey:item.reply_key||'',variants:'',note:'',privacyReviewed:false});setVersions([]);try{const history=(await apiRequest(`/assistant-knowledge/${item.id}/versions`)).versions;setVersions(history);const latest=history[0];if(latest)setForm({...item,question:latest.question,answer:latest.answer,intent:latest.intent,replyKey:latest.reply_key,variants:latest.variants.join('\n'),note:'',privacyReviewed:false});}catch(e){setError(e.message);}};
  const save=async(nextStatus)=>{setBusy(true);setError('');try{await apiRequest(`/assistant-knowledge/${form.id}`,{method:'PATCH',body:JSON.stringify({...form,status:nextStatus,variants:form.variants.split('\n').filter(Boolean)})});setForm(null);await load();}catch(e){setError(e.message);}finally{setBusy(false);}};
  const restore=async(version)=>{setBusy(true);setError('');try{await apiRequest(`/assistant-knowledge/${form.id}/restore/${version}`,{method:'POST',body:JSON.stringify({privacyReviewed:form.privacyReviewed,note:form.note})});setForm(null);await load();}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <div className="knowledge-layout"><AdminHeader/><main className="knowledge-page"><h1>Conocimiento del asistente</h1>
    <p>Las conversaciones se conservan como evidencia. Solo las respuestas revisadas y validadas pueden orientar a otros clientes.</p>
    <div className="knowledge-metrics"><span>Candidatos: {data.metrics.candidates||0}</span><span>Vigentes: {data.metrics.validated||0}</span><span>Valoraciones positivas: {data.metrics.useful_votes||0}</span><span>Negativas: {data.metrics.negative_votes||0}</span></div>
    {error&&<p role="alert">{error}</p>}
    <div className="knowledge-controls"><label>Estado <select value={status} onChange={e=>{setStatus(e.target.value);setAfter(0);}}><option value="">Todos</option>{Object.entries(statuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    <button disabled={busy} onClick={async()=>{setBusy(true);try{await apiRequest('/assistant-knowledge/collect',{method:'POST'});await load();}catch(e){setError(e.message);}finally{setBusy(false);}}}>Revisar conversaciones pendientes</button></div>
    {form&&<section className="knowledge-editor"><h2>Revisar candidato {form.id}</h2><p>Elimina nombres, correos, direcciones, códigos y detalles particulares. Verifica que el consejo corresponda al paso indicado.</p>
      <label>Procedimiento<select value={form.replyKey} onChange={e=>setForm({...form,replyKey:e.target.value,intent:data.policy.slots[e.target.value]?.intents[0]||''})}><option value="">Seleccionar</option>{Object.entries(data.policy.slots).map(([key,value])=><option key={key} value={key}>{value.label||key}</option>)}</select></label>
      <label>Intención<select value={form.intent} onChange={e=>setForm({...form,intent:e.target.value})}>{(data.policy.slots[form.replyKey]?.intents||[form.intent]).map(i=><option key={i}>{i}</option>)}</select></label>
      <label>Pregunta general<textarea value={form.question} onChange={e=>setForm({...form,question:e.target.value})}/></label>
      <label>Otras formas de preguntar (una por línea)<textarea value={form.variants} onChange={e=>setForm({...form,variants:e.target.value})}/></label>
      <label>Respuesta revisada<textarea value={form.answer} onChange={e=>setForm({...form,answer:e.target.value})}/></label>
      <label>Motivo de la evaluación<textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
      <label><input type="checkbox" checked={form.privacyReviewed} onChange={e=>setForm({...form,privacyReviewed:e.target.checked})}/> Revisé la precisión técnica y confirmé que no contiene datos personales.</label>
      <div className="knowledge-controls"><button disabled={busy||!form.privacyReviewed} onClick={()=>save('VALIDATED')}>Validar y publicar</button><button disabled={busy} onClick={()=>save('USEFUL')}>Marcar útil</button><button disabled={busy} onClick={()=>save('REJECTED')}>Rechazar</button><button disabled={busy} onClick={()=>save('OBSOLETE')}>Retirar</button><button onClick={()=>setForm(null)}>Cerrar</button></div>
      {versions.length>0&&<><h3>Versiones anteriores</h3>{versions.map(v=><div key={v.id}><strong>Versión {v.version} · {statuses[v.status]}</strong><p>{v.answer}</p><button disabled={busy||!form.privacyReviewed} onClick={()=>restore(v.version)}>Publicar esta respuesta como nueva versión</button></div>)}</>}
    </section>}
    <div className="knowledge-list">{data.items.map(item=><article key={item.id}><span>{statuses[item.status]}</span><h2>{item.question}</h2><p>{item.answer}</p>{item.quality_flags.length>0&&<small>Revisar: {item.quality_flags.join(', ')}</small>}<button onClick={()=>edit(item)}>Evaluar respuesta</button></article>)}</div>
    {!data.items.length&&<p>No hay candidatos en esta página.</p>}
    <div className="knowledge-controls"><button disabled={!after} onClick={()=>setAfter(0)}>Primera página</button><button disabled={data.items.length<50} onClick={()=>setAfter(data.items.at(-1).id)}>Siguiente página</button></div>
  </main></div>;
}
