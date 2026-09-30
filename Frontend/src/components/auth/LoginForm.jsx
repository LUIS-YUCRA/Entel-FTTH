import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/AuthService';
import AuthLink from './AuthLink';
import logo from '../../assets/entel_bolivia.webp';
import './AuthForms.css';

/* =========================================================
   ICONOS
========================================================= */

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21a8 8 0 0 0-16 0" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const WifiIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M8.5 16a6 6 0 0 1 7 0" />
    <path d="M12 20h.01" />
  </svg>
);

const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const EyeIcon = ({ hidden }) => (
  hidden ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
);

/* =========================================================
   LOGIN
========================================================= */

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recovering, setRecovering] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    if (!state?.registered) return undefined;

    const timer = setTimeout(() => {
      navigate('/login', {
        replace: true,
        state: null
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [state?.registered, navigate]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Correo electrónico inválido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await login({
        email: formData.email.trim(),
        password: formData.password
      });

      switch (response.user.user_type) {
        case 'cliente':
          navigate('/dashboard/cliente');
          break;

        case 'operador':
          navigate('/dashboard/operador');
          break;

        case 'tecnico':
          navigate('/dashboard/tecnico');
          break;

        case 'administrador':
          navigate('/dashboard/administrador');
          break;

        default:
          navigate('/dashboard');
      }
    } catch (error) {
      setErrors({
        submit: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({
        email: 'Ingresa tu correo electrónico primero'
      });
      return;
    }

    setRecovering(true);
    setRecoveryMessage('');

    try {
      const result = await authService.forgotPassword(
        formData.email.trim()
      );

      setRecoveryMessage(result.message);
      setShowForgotPassword(false);
    } catch (error) {
      setErrors({
        submit: error.message || 'Error al procesar la solicitud'
      });
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="auth-form-container">
      <section className="auth-form-card login-card">

        {/* LOGO */}
        <div className="auth-logo">
          <img src={logo} alt="Entel Bolivia" />
        </div>

        {/* TÍTULO */}
        <h1 className="auth-title">
          Bienvenido a <strong>ENTEL</strong>
        </h1>

        {state?.registered && (
          <div className="recovery-success" role="status">
            Cuenta creada correctamente. Ya puedes iniciar sesión.
          </div>
        )}

        {/* FORMULARIO */}
        <form
          onSubmit={handleSubmit}
          className="auth-form"
          noValidate
        >
          {errors.submit && (
            <div className="error-message" role="alert">
              {errors.submit}
            </div>
          )}

          {/* CORREO */}
          <div className="form-group">
            <label htmlFor="email">
              Correo electrónico o institucional
            </label>

            <div className="input-shell">
              <span className="input-icon">
                <UserIcon />
              </span>

              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ejemplo@ejemplo.com"
                autoComplete="username"
                required
                className={`form-control ${errors.email ? 'error' : ''}`}
              />
            </div>

            {errors.email && (
              <span className="error-text">
                {errors.email}
              </span>
            )}
          </div>

          {/* CONTRASEÑA */}
          <div className="form-group">
            <label htmlFor="password">
              Contraseña
            </label>

            <div className="input-shell password-input-container">
              <span className="input-icon">
                <LockIcon />
              </span>

              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`form-control password-input ${
                  errors.password ? 'error' : ''
                }`}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
              >
                <EyeIcon hidden={!showPassword} />
              </button>
            </div>

            {errors.password && (
              <span className="error-text">
                {errors.password}
              </span>
            )}
          </div>

          {/* BOTÓN */}
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            <span>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </span>

            {!loading && (
              <span className="button-arrow">→</span>
            )}
          </button>
        </form>

        {/* RECUPERACIÓN */}
        <div className="forgot-password">
          {recoveryMessage && (
            <p className="recovery-success">
              {recoveryMessage}
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowForgotPassword((prev) => !prev)}
            className="link-button"
          >
            ¿Olvidaste tu contraseña?
          </button>

          {showForgotPassword && (
            <div className="forgot-password-form">
              <p>
                Se enviará un correo a:
                {' '}
                <strong>
                  {formData.email || '(ingresa tu correo primero)'}
                </strong>
              </p>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={recovering}
                className="btn-secondary"
              >
                {recovering
                  ? 'Enviando...'
                  : 'Enviar instrucciones'}
              </button>
            </div>
          )}
        </div>

        {/* CREAR CUENTA */}
        <div className="auth-footer">
          <p>¿No tienes una cuenta?</p>

          <AuthLink
            to="/register"
            className="link-primary"
          >
            Crear Cuenta
          </AuthLink>
        </div>

        {/* SEGURIDAD */}
        <div className="auth-trust-row">

          <div className="auth-trust-item">
            <ShieldIcon />
            <span>Seguro</span>
          </div>

          <div className="auth-trust-item">
            <WifiIcon />
            <span>Confiable</span>
          </div>

          <div className="auth-trust-item">
            <PeopleIcon />
            <span>
              Siempre
              <br />
              contigo
            </span>
          </div>

        </div>

      </section>
    </div>
  );
};

export default LoginForm;