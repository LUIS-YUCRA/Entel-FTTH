import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOutletContext } from 'react-router-dom';
import AuthLink from './AuthLink';
import logo from '../../assets/entel_bolivia.webp';
import './AuthForms.css';

const FieldIcon = ({ type }) => {
  const icons = {
    service: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 7h8M8 11h8M8 15h5" />
      </>
    ),

    user: (
      <>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),

    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),

    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    )
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      {icons[type]}
    </svg>
  );
};

const RegisterForm = () => {
  const { register } = useAuth();
  const { transitionTo } = useOutletContext();

  const [formData, setFormData] = useState({
    fullName: '',
    serviceNumber: '',
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!success) return undefined;

    const timer = setTimeout(() => {
      transitionTo('/login', {
        replace: true,
        state: {
          registered: true
        }
      });
    }, 2200);

    return () => clearTimeout(timer);
  }, [success, transitionTo]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'El nombre completo es requerido';
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!/^\d{4,20}$/.test(formData.serviceNumber.trim())) {
      newErrors.serviceNumber =
        'El número de instancia es obligatorio y debe ser numérico';
    }

    if (!formData.email) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Correo electrónico inválido';
    } else if (/(^|\.)entel\.bo$/i.test(formData.email.trim().split('@')[1] || '')) {
      newErrors.email = 'Los correos @entel.bo son exclusivos del personal registrado por el administrador. Usa tu correo personal o institucional.';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password =
        'La contraseña debe tener al menos 8 caracteres';
    } else if (formData.password.length > 20) {
      newErrors.password =
        'La contraseña no debe exceder 20 caracteres';
    } else if (
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(
        formData.password
      )
    ) {
      newErrors.password =
        'Incluye mayúscula, minúscula, número y símbolo';
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
      await register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        serviceNumber: formData.serviceNumber.trim()
      });

      setSuccess(true);

      setFormData({
        fullName: '',
        serviceNumber: '',
        email: '',
        password: ''
      });
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

  if (success) {
    return (
      <div className="auth-form-container">
        <section className="auth-form-card success-card">

          <div className="auth-logo">
            <img src={logo} alt="Entel Bolivia" />
          </div>

          <div className="success-message">
            <div className="auth-success-icon">
              ✓
            </div>

            <h2>¡Registro Exitoso!</h2>

            <p>
              Tu cuenta ha sido creada correctamente.
              En un momento te llevaremos al inicio de sesión.
            </p>

            <AuthLink
              to="/login"
              className="btn-primary success-button"
            >
              Ir a Iniciar Sesión
            </AuthLink>
          </div>

        </section>
      </div>
    );
  }

  return (
    <div className="auth-form-container">

      <section className="auth-form-card register-card">

        <div className="auth-logo">
          <img src={logo} alt="Entel Bolivia" />
        </div>

        <h1 className="auth-title">
          Crea tu cuenta
        </h1>

        <form
          onSubmit={handleSubmit}
          className="auth-form"
          noValidate
        >

          {errors.submit && (
            <div className="error-message">
              {errors.submit}
            </div>
          )}

          {/* NÚMERO DE INSTANCIA */}
          <div className="form-group">

            <label htmlFor="serviceNumber">
              Número de instancia
            </label>

            <div className="input-shell">

              <span className="input-icon">
                <FieldIcon type="service" />
              </span>

              <input
                type="text"
                inputMode="numeric"
                id="serviceNumber"
                name="serviceNumber"
                value={formData.serviceNumber}
                onChange={handleChange}
                placeholder="Ej. 12345678"
                required
                minLength={4}
                maxLength={20}
                pattern="[0-9]{4,20}"
                className={`form-control ${
                  errors.serviceNumber ? 'error' : ''
                }`}
              />

            </div>

            {errors.serviceNumber && (
              <span className="error-text">
                {errors.serviceNumber}
              </span>
            )}

          </div>

          {/* NOMBRE */}
          <div className="form-group">

            <label htmlFor="fullName">
              Nombre completo
            </label>

            <div className="input-shell">

              <span className="input-icon">
                <FieldIcon type="user" />
              </span>

              <input
                type="text"
                id="fullName"
                name="fullName"
                required
                autoComplete="name"
                minLength={3}
                maxLength={150}
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Juan Pérez"
                className={`form-control ${
                  errors.fullName ? 'error' : ''
                }`}
              />

            </div>

            {errors.fullName && (
              <span className="error-text">
                {errors.fullName}
              </span>
            )}

          </div>

          {/* CORREO */}
          <div className="form-group">

            <label htmlFor="email">
              Correo electrónico
            </label>

            <div className="input-shell">

              <span className="input-icon">
                <FieldIcon type="mail" />
              </span>

              <input
                type="email"
                id="email"
                name="email"
                required
                autoComplete="email"
                maxLength={180}
                value={formData.email}
                onChange={handleChange}
                placeholder="ejemplo@gmail.com"
                className={`form-control ${
                  errors.email ? 'error' : ''
                }`}
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
                <FieldIcon type="lock" />
              </span>

              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                required
                autoComplete="new-password"
                minLength={8}
                maxLength={20}
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
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>

            </div>

            {errors.password && (
              <span className="error-text">
                {errors.password}
              </span>
            )}

          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            aria-busy={loading}
            aria-label={loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          >
            <span>
              {loading ? <span className="auth-button-spinner" aria-hidden="true" /> : 'Crear Cuenta'}
            </span>

            {!loading && (
              <span className="button-arrow">→</span>
            )}
          </button>

        </form>

        <div className="auth-footer">

          <p>¿Ya tienes una cuenta?</p>

          <AuthLink
            to="/login"
            className="link-primary"
          >
            Iniciar Sesión
          </AuthLink>

        </div>

      </section>

    </div>
  );
};

export default RegisterForm;
