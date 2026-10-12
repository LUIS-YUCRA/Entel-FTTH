import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiLock } from 'react-icons/fi';
import { apiRequest } from '../services/ApiService';
import { sessionStore } from '../services/SessionStore';
import logo from '../assets/entel_bolivia.webp';
import '../components/auth/AuthForms.css';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/password/reset-password', {
        method: 'POST', silent: true, body: JSON.stringify({ token, password }),
      });
      sessionStore.clear();
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <section className="auth-form-card">
        <div className="auth-logo"><img src={logo} alt="Entel Bolivia" /></div>
        <h1 className="auth-title">Nueva contraseña</h1>
        <p className="auth-helper-copy">Crea una contraseña segura para volver a ingresar a tu cuenta.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {[
            { id: 'new-password', label: 'Nueva contraseña', value: password, setValue: setPassword, visible: showPassword, toggle: setShowPassword },
            { id: 'confirm-password', label: 'Confirmar contraseña', value: confirmPassword, setValue: setConfirmPassword, visible: showConfirmation, toggle: setShowConfirmation },
          ].map((field) => (
            <div className="form-group" key={field.id}>
              <label htmlFor={field.id}>{field.label}</label>
              <div className="input-shell password-input-container">
                <span className="input-icon" aria-hidden="true"><FiLock /></span>
                <input id={field.id} className="form-control password-input"
                  type={field.visible ? 'text' : 'password'} placeholder="••••••••"
                  value={field.value} onChange={(event) => field.setValue(event.target.value)}
                  autoComplete="new-password" minLength={8} required disabled={loading} />
                <button type="button" className="password-toggle" disabled={loading}
                  onClick={() => field.toggle((visible) => !visible)}
                  aria-controls={field.id} aria-pressed={field.visible}
                  aria-label={`${field.visible ? 'Ocultar' : 'Mostrar'} ${field.label.toLowerCase()}`}>
                  {field.visible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                </button>
              </div>
            </div>
          ))}
          {error && <div className="error-message" role="alert">{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading} aria-busy={loading}
            aria-label={loading ? 'Guardando contraseña' : 'Guardar contraseña'}>
            {loading ? <span className="auth-button-spinner" aria-hidden="true" /> : 'Guardar contraseña'}
          </button>
        </form>
      </section>
    </div>
  );
};
export default ResetPasswordPage;
