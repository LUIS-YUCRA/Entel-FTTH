import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
const LABELS={phone:'Teléfono de contacto',address:'Domicilio del servicio',zone:'Zona o localidad',ci:'Carné de identidad (CI)'};
export default function ProfileCompletionCard({ field, disabled, onSaved }) {
  const { updateProfile }=useAuth();const [value,setValue]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  if(!LABELS[field])return null;
  const save=async event=>{
    event.preventDefault();if(busy||disabled||!value.trim())return;
    setBusy(true);setError('');
    try{await updateProfile({[field]:value.trim()});setValue('');await onSaved(field);}catch(e){setError(e.message);}finally{setBusy(false);}
  };
  return <form className="assistant-profile-card" onSubmit={save}>
    <label htmlFor={'assistant-profile-'+field}>{LABELS[field]}</label>
    <input id={'assistant-profile-'+field} value={value} type={field==='phone'?'tel':'text'} autoComplete={field==='phone'?'tel':field==='address'?'street-address':'off'} maxLength={field==='address'?250:field==='zone'?120:24} onChange={e=>setValue(e.target.value)} disabled={disabled||busy} required />
    <small>Se guardará en tu perfil. Puedes continuar con tu consulta sin completarlo ahora.</small>
    {error&&<p role="alert">{error}</p>}
    <button type="submit" disabled={disabled||busy||!value.trim()}>{busy?'Guardando…':'Guardar en mi perfil'}</button>
  </form>;
}
