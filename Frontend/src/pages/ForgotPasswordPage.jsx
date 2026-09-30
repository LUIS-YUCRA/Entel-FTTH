import { useState } from 'react';

import { Link } from 'react-router-dom';

import {
  authService
} from '../services/AuthService';

import logo
  from '../assets/entel_bolivia.webp';

import '../components/auth/AuthForms.css';

const ForgotPasswordPage = () => {

  const [email, setEmail] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const handleSubmit =
    async (event) => {

      event.preventDefault();

      setError('');
      setSuccess('');
      setLoading(true);

      try {

        const result =
          await authService
            .forgotPassword(
              email.trim()
            );

        setSuccess(
          result.message
        );

      } catch (requestError) {

        setError(
          requestError.message
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
          Recuperar contraseña
        </h1>

        <p className="auth-helper-copy">
          Ingresa el correo asociado a
          tu cuenta y te enviaremos
          las instrucciones.
        </p>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          <div className="form-group">

            <label htmlFor="recovery-email">
              Correo electrónico
            </label>

            <input
              id="recovery-email"
              className="form-control"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              required
            />

          </div>

          {error && (

            <div
              className="error-message"
              role="alert"
            >
              {error}
            </div>

          )}

          {success && (

            <div
              className="recovery-success"
              role="status"
            >
              {success}
            </div>

          )}

          <button
            className="btn-primary"
            type="submit"
            disabled={loading}
          >

            {loading
              ? 'Enviando...'
              : 'Enviar instrucciones  →'}

          </button>

        </form>

        <div className="auth-footer">

          <Link
            className="link-primary"
            to="/login"
          >
            Volver a iniciar sesión
          </Link>

        </div>

      </section>

    </div>
  );
};

export default ForgotPasswordPage;