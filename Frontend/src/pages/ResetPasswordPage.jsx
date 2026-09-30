import {
  useParams,
  useNavigate
} from 'react-router-dom';

import {
  useState
} from 'react';

import {
  apiRequest
} from '../services/ApiService';

import logo
  from '../assets/entel_bolivia.webp';

import '../components/auth/AuthForms.css';

const ResetPasswordPage = () => {

  const { token } =
    useParams();

  const navigate =
    useNavigate();

  const [password, setPassword] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword
  ] = useState('');

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const [
    showPassword,
    setShowPassword
  ] = useState(false);

  const handleSubmit =
    async (e) => {

      e.preventDefault();

      setError('');
      setMessage('');

      if (
        password !==
        confirmPassword
      ) {

        setError(
          'Las contraseñas no coinciden'
        );

        return;
      }

      if (
        password.length < 8
      ) {

        setError(
          'La contraseña debe tener al menos 8 caracteres'
        );

        return;
      }

      try {

        setLoading(true);

        await apiRequest(
          '/password/reset-password',
          {
            method: 'POST',

            body:
              JSON.stringify({
                token,
                password
              })
          }
        );

        setMessage(
          'Contraseña actualizada correctamente'
        );

        setTimeout(() => {

          navigate('/login');

        }, 3000);

      } catch (err) {

        setError(
          err.message
        );

      } finally {

        setLoading(false);

      }
    };

  return (

    <div className="auth-form-container">

      <section className="auth-form-card">

        <div className="auth-logo">

          <img
            src={logo}
            alt="Entel Bolivia"
          />

        </div>

        <h1 className="auth-title">
          Nueva contraseña
        </h1>

        <p className="auth-helper-copy">
          Crea una contraseña segura
          para volver a ingresar
          a tu cuenta.
        </p>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          <div className="form-group">

            <label htmlFor="new-password">
              Nueva contraseña
            </label>

            <input
              id="new-password"
              className="form-control"
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              placeholder="••••••••"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              autoComplete="new-password"
              required
            />

          </div>

          <div className="form-group">

            <label htmlFor="confirm-password">
              Confirmar contraseña
            </label>

            <input
              id="confirm-password"
              className="form-control"
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
              autoComplete="new-password"
              required
            />

          </div>

          <button
            type="button"
            className="link-button"
            onClick={() =>
              setShowPassword(
                (v) => !v
              )
            }
          >

            {showPassword
              ? 'Ocultar contraseñas'
              : 'Mostrar contraseñas'}

          </button>

          {error && (

            <div
              className="error-message"
              role="alert"
            >
              {error}
            </div>

          )}

          {message && (

            <div
              className="recovery-success"
              role="status"
            >
              {message}
            </div>

          )}

          <button
            className="btn-primary"
            type="submit"
            disabled={loading}
          >

            {loading
              ? 'Actualizando...'
              : 'Guardar contraseña  →'}

          </button>

        </form>

      </section>

    </div>
  );
};

export default ResetPasswordPage;