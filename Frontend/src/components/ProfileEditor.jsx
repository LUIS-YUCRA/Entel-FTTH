import { useMemo, useState } from 'react';
import { FaSave, FaTimes, FaUserEdit } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './ProfileEditor.css';
import ProfilePhoto from './ProfilePhoto';

const profileForm = (user) => ({
  fullName: user?.full_name || '',
  email: user?.email || '',
  zone: user?.technician_zone || '',
  specialty: user?.specialty || 'FTTH general',
  maxActiveTickets: user?.max_active_tickets ?? 8,
  isAvailable: user?.is_available !== false,
  employeeCode: user?.employee_code || `TEC-${String(user?.id || '').padStart(5, '0')}`,
  area: user?.area || 'Soporte técnico FTTH',
  technicianPhone: user?.technician_phone || '',
  crew: user?.crew || '',
});

const normalize = (form) => ({
  ...form,
  fullName: form.fullName.trim(),
  email: form.email.trim().toLowerCase(),
  zone: form.zone.trim(),
  specialty: form.specialty.trim(),
  employeeCode: form.employeeCode.trim(),
  area: form.area.trim(),
  technicianPhone: form.technicianPhone.trim(),
  crew: form.crew.trim(),
  maxActiveTickets: Number(form.maxActiveTickets),
});

const validate = (form, userType) => {
  if (form.fullName.length < 3) return 'El nombre completo debe tener al menos 3 caracteres.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Ingresa un correo electrónico válido.';
  if (userType === 'cliente' && /(^|\.)entel\.bo$/i.test(form.email.split('@')[1] || '')) return 'Los correos @entel.bo están reservados para el personal registrado por el administrador.';
  if (userType !== 'cliente' && !/^(?:gmail\.com|outlook\.com|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*(?:emi\.edu\.bo|entel\.bo))$/i.test(form.email.split('@')[1] || '')) {
    return 'Utiliza Gmail, Outlook o un correo institucional de EMI o ENTEL.';
  }
  if (userType === 'tecnico' && (!Number.isInteger(form.maxActiveTickets) || form.maxActiveTickets < 1 || form.maxActiveTickets > 30)) {
    return 'La carga máxima debe ser un número entero entre 1 y 30.';
  }
  return '';
};

const ProfileEditor = ({ onCancel, onSaved, showPhoto = false }) => {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState(() => profileForm(user));
  const [baseline, setBaseline] = useState(() => profileForm(user));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(normalize(form)) !== JSON.stringify(normalize(baseline)),
    [form, baseline],
  );
  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
    setError('');
  };

  const save = async (event) => {
    event.preventDefault();
    const payload = normalize(form);
    const validationError = validate(payload, user?.user_type);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!dirty) {
      setMessage('No hay cambios pendientes por guardar.');
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await updateProfile(payload);
      const savedForm = profileForm(response.user);
      setForm(savedForm);
      setBaseline(savedForm);
      setMessage('Perfil actualizado y guardado correctamente.');
      onSaved?.(response.user);
    } catch (requestError) {
      setError(requestError.message || 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="profile-editor" onSubmit={save} aria-busy={saving}>
      <div className="profile-editor-heading">
        <div><FaUserEdit aria-hidden="true" /><div><h3>Editar información personal</h3><p>Actualiza tus datos y confirma con “Guardar cambios”.</p></div></div>
        {onCancel && <button className="profile-editor-close" type="button" onClick={onCancel} aria-label="Cerrar edición"><FaTimes /></button>}
      </div>
      <div className="profile-editor-grid">
        {showPhoto && <div className="profile-editor-photo"><ProfilePhoto /><small>La foto se guarda al seleccionarla.</small></div>}
        <label>Nombre completo<input required minLength="3" disabled={saving} value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} /></label>
        <label>Correo institucional<input required type="email" disabled={saving} value={form.email} onChange={(event) => updateField('email', event.target.value)} /></label>
        {user?.user_type === 'tecnico' && <>
          <label>Zona de cobertura<input disabled={saving} value={form.zone} onChange={(event) => updateField('zone', event.target.value)} placeholder="Ej. Shinahota centro" /></label>
          <label>Especialidad<input disabled={saving} value={form.specialty} onChange={(event) => updateField('specialty', event.target.value)} /></label>
          <label>Carga máxima activa<input required type="number" min="1" max="30" step="1" disabled={saving} value={form.maxActiveTickets} onChange={(event) => updateField('maxActiveTickets', event.target.value)} /></label>
          <label>Código de empleado<input required disabled={saving} value={form.employeeCode} onChange={(event) => updateField('employeeCode', event.target.value)} /></label>
          <label>Área<input required disabled={saving} value={form.area} onChange={(event) => updateField('area', event.target.value)} /></label>
          <label>Teléfono<input type="tel" disabled={saving} value={form.technicianPhone} onChange={(event) => updateField('technicianPhone', event.target.value)} /></label>
          <label>Cuadrilla<input disabled={saving} value={form.crew} onChange={(event) => updateField('crew', event.target.value)} /></label>
          <label className="profile-availability"><input type="checkbox" disabled={saving} checked={form.isAvailable} onChange={(event) => updateField('isAvailable', event.target.checked)} /><span>Disponible para nuevas asignaciones</span></label>
        </>}
      </div>
      <div className="profile-editor-feedback" aria-live="polite">
        {error && <p className="profile-editor-error">{error}</p>}
        {message && <p className="profile-editor-success">{message}</p>}
      </div>
      <div className="profile-editor-actions">
        {onCancel && <button className="profile-editor-cancel" type="button" disabled={saving} onClick={onCancel}>Cancelar</button>}
        <button className="profile-editor-save" type="submit" disabled={saving || !dirty}><FaSave /> {saving ? 'Guardando...' : 'Guardar cambios'}</button>
      </div>
    </form>
  );
};

export default ProfileEditor;
