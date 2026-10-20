import { useEffect,useState } from 'react';
import { apiRequest } from '../../services/ApiService';
import AdminHeader from '../../components/Header/AdminHeader';
import Footer from '../../components/Footer/Footer';
import './GestionUsuarios.css';
import './InstanciasServicio.css';
const EMPTY={serviceNumber:'',customerCategory:'HOGAR',reference:'',active:true};
export default function InstanciasServicio(){
  const [items,setItems]=useState([]);const [form,setForm]=useState(EMPTY);const [error,setError]=useState('');const [message,setMessage]=useState('');const [saving,setSaving]=useState(false);const [search,setSearch]=useState('');
  const load=()=>apiRequest('/service-instances').then(data=>setItems(data.items));
  useEffect(()=>{load().catch(e=>setError(e.message));},[]);
  const save=async event=>{event.preventDefault();setSaving(true);setError('');setMessage('');try{await apiRequest('/service-instances',{method:'POST',body:JSON.stringify(form)});await load();setForm(EMPTY);setMessage('Instancia guardada. La categoría se actualizó en las cuentas vinculadas.');}catch(e){setError(e.message);}finally{setSaving(false);}};
  const field=(key,value)=>setForm(old=>({...old,[key]:value}));
  return <div className="usuarios-admin"><AdminHeader/><main className="usuarios-content">
    <h1>Instancias de servicio</h1>
    <p>Relaciona cada instancia con la categoría de su contrato. La prioridad considera gravedad, tipo de falla y categoría verificada; no considera importes. Los clientes no pueden modificar estos datos.</p>
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    <form onSubmit={save} className="service-instance-form">
      <label>Instancia<input required inputMode="numeric" pattern="[0-9]{4,20}" value={form.serviceNumber} onChange={e=>field('serviceNumber',e.target.value)} /></label>
      <label>Categoría<select value={form.customerCategory} onChange={e=>field('customerCategory',e.target.value)}><option value="HOGAR">Hogar</option><option value="NEGOCIO">Negocio</option><option value="INSTITUCION">Institución</option></select></label>
      <label>Referencia del contrato o padrón<input required minLength={6} maxLength={500} value={form.reference} onChange={e=>field('reference',e.target.value)} /></label>
      <label><input type="checkbox" checked={form.active} onChange={e=>field('active',e.target.checked)} /> Registro activo</label>
      <button type="submit" disabled={saving}>{saving?'Guardando…':'Guardar instancia'}</button>
    </form>
    <label>Buscar instancia<input value={search} onChange={e=>setSearch(e.target.value)} /></label>
    <div style={{overflowX:'auto',marginTop:16}}><table><thead><tr><th>Instancia</th><th>Categoría</th><th>Referencia</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{items.filter(i=>i.service_number.includes(search.trim())).map(i=><tr key={i.service_number}><td>{i.service_number}</td><td>{i.customer_category}</td><td>{i.reference}</td><td>{i.active?'Activo':'Inactivo'}</td><td><button type="button" onClick={()=>setForm({serviceNumber:i.service_number,customerCategory:i.customer_category,reference:i.reference,active:i.active})}>Editar</button></td></tr>)}</tbody></table>{!items.length&&<p>Aún no hay instancias clasificadas. Carga las del padrón o contrato; el sistema no inventará categorías para las desconocidas.</p>}</div>
  </main><Footer/></div>;
}
