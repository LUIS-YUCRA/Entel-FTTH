import { useEffect, useState } from 'react';
import { authService } from '../../services/AuthService';
import { sessionStore } from '../../services/SessionStore';
import { useAuth } from '../../context/AuthContext';
import Footer from '../../components/Footer/Footer';
import Header from '../../components/Header/Header';
import ProfilePhoto from '../../components/ProfilePhoto';
import './PerfilCliente.css';

const EMPTY = {
  fullName: '', email: '', ci: '', phone: '',
  address: '', serviceNumber: '', zone: '', customerCategory: 'HOGAR',
};

const PerfilCliente = () => {
  const { updateProfile }=useAuth();
  const [form, setForm] = useState(EMPTY);
  const [categoryVerified,setCategoryVerified]=useState(false);
  const [initial, setInitial] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    authService.profile()
      .then(({ user }) => {
        setCategoryVerified(user.category_verified===true);
        const profile = {
          fullName: user.full_name || '',
          email: user.email || '',
          ci: user.ci || '',
          phone: user.phone || '',
          address: user.address || '',
          serviceNumber: user.service_number || '',
          zone: user.zone || '',
          customerCategory: user.customer_category || 'HOGAR',
        };
        setForm(profile);
        setInitial(profile);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const editable=Object.fromEntries(Object.entries(form).filter(([key])=>!['serviceNumber','customerCategory'].includes(key)));
      const { user } = await updateProfile(editable);
      setCategoryVerified(user.category_verified===true);
      const profile = {
        fullName: user.full_name || '', email: user.email || '',
        ci: user.ci || '', phone: user.phone || '',
        address: user.address || '', serviceNumber: user.service_number || '',
        zone: user.zone || '', customerCategory: user.customer_category || 'HOGAR',
      };
      setForm(profile);
      setInitial(profile);
      sessionStore.set('user', JSON.stringify(user));
      setMessage('Datos guardados correctamente.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="perfil-container">
      <Header />
      <main className="perfil-main">
        <section className="foto-section">
          <h3>PERFIL</h3>
          <div className="foto-card">
            <div className="foto-header">Cuenta del cliente</div>
            <div className="foto-content">
              <ProfilePhoto />
              <strong>{form.fullName || 'Cliente FTTH'}</strong>
            </div>
          </div>
        </section>

        <section className="datos-section">
          <h1>Mis Datos</h1>
          {loading && <div className="chat-error">Cargando perfil...</div>}
          {error && <div className="chat-error">{error}</div>}
          {message && <div className="recovery-success">{message}</div>}

          <div className="datos-grid">
            <div className="input-group"><label>Nombre completo</label><input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} /></div>
            <div className="input-group"><label>Correo electrónico</label><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></div>
            <div className="input-group"><label>CI</label><input value={form.ci} onChange={(e) => update('ci', e.target.value)} /></div>
            <div className="input-group"><label>Teléfono</label><input value={form.phone} onChange={(e) => update('phone', e.target.value)} /></div>
            <div className="input-group"><label>Dirección</label><input value={form.address} onChange={(e) => update('address', e.target.value)} /></div>
            <div className="input-group"><label>Zona</label><input value={form.zone} onChange={(e) => update('zone', e.target.value)} /></div>
            <div className="input-group"><label>Categoría del servicio</label><input value={categoryVerified?({HOGAR:'Hogar',NEGOCIO:'Negocio',INSTITUCION:'Institución'}[form.customerCategory]||form.customerCategory):'Pendiente de verificación'} readOnly disabled /><small>Se obtiene del registro de tu instancia y no puede editarse.</small></div>
            <div className="input-group"><label>Número de instancia</label><input value={form.serviceNumber} disabled aria-describedby="instance-note" /><small id="instance-note">Identificador de tu cuenta</small></div>
          </div>

          <div className="buttons-area">
            <button className="save-btn" type="button" onClick={save} disabled={saving || loading}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
            <button className="cancel-btn" type="button" onClick={() => setForm(initial)}>Cancelar</button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PerfilCliente;
