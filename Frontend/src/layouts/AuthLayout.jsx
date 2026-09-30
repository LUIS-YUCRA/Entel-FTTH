import {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import {
  Outlet,
  useLocation,
  useNavigate
} from 'react-router-dom';

import fondo from '../assets/fondo_login.png';

import './AuthLayout.css';

export default function AuthLayout() {

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const timer =
    useRef(null);

  const [leaving, setLeaving] =
    useState(false);

  const transitionTo =
    useCallback(
      (to, options) => {

        if (timer.current) {
          return;
        }

        setLeaving(true);

        const duration =
          window
            .matchMedia(
              '(prefers-reduced-motion: reduce)'
            )
            .matches
            ? 0
            : 180;

        timer.current =
          setTimeout(() => {

            navigate(
              to,
              options
            );

            setLeaving(false);

            timer.current =
              null;

          }, duration);

      },
      [navigate]
    );

  useEffect(() => {

    return () => {
      clearTimeout(
        timer.current
      );
    };

  }, []);

  return (

    <main
      className="auth-layout"
      style={{
        backgroundImage:
          `url(${fondo})`
      }}
    >

      <div
        className="auth-layout-overlay"
        aria-hidden="true"
      />

      <div
        className={`auth-content ${
          leaving
            ? 'auth-leaving'
            : ''
        }`}
        key={location.pathname}
      >

        <Outlet
          context={{
            transitionTo
          }}
        />

      </div>

    </main>
  );
}