import { useEffect, useState } from 'react';
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardCheck,
  FaIdBadge,
  FaTicketAlt,
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/DashboardService';
import Footer from '../../components/Footer/Footer';
import OperadorHeader from '../../components/Header/OperadorHeader';
import ProfileEditor from '../../components/ProfileEditor';
import ProfilePhoto from '../../components/ProfilePhoto';
import './PerfilOperador.css';

const PerfilOperador = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardService.overview().then(setData).catch((requestError) => setError(requestError.message));
  }, []);

  const metrics = data?.metrics;
  const resolved = metrics ? metrics.resolved + metrics.closed : null;
  const resolutionRate = metrics?.resolution_rate;
  const registrationDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('es-BO')
    : 'No disponible';

  return (
    <div className="perfil-operador operator-profile-page">
      <OperadorHeader />
      <main className="operator-profile-main">
        <div className="operator-profile-content">
          <header className="operator-profile-heading">
            <div>
              <span>Cuenta institucional</span>
              <h1>Mi perfil de operador</h1>
              <p>Administra tu cuenta y consulta el resumen general de operaciones.</p>
            </div>
            <div className={`operator-account-status ${user?.is_active ? 'active' : 'inactive'}`}>
              <FaCheckCircle />
              {user?.is_active ? 'Cuenta activa' : 'Cuenta inactiva'}
            </div>
          </header>

          {error && <div className="operator-profile-error" role="alert">{error}</div>}

          <section className="operator-profile-overview">
            <div className="operator-profile-identity">
              <ProfilePhoto />
              <div>
                <span className="operator-role">Operador FTTH</span>
                <h2>{user?.full_name || 'Operador ENTEL'}</h2>
                <p>Centro de operaciones y gestión de reclamos.</p>
                <span className="operator-code">
                  <FaIdBadge /> OP-{String(user?.id || 0).padStart(5, '0')}
                </span>
              </div>
            </div>

            <div className="operator-profile-metrics" aria-label="Resumen general del sistema">
              <article>
                <span className="operator-metric-icon"><FaTicketAlt /></span>
                <strong>{metrics?.total ?? '—'}</strong>
                <small>Tickets del sistema</small>
              </article>
              <article>
                <span className="operator-metric-icon"><FaClipboardCheck /></span>
                <strong>{resolved ?? '—'}</strong>
                <small>Tickets resueltos</small>
              </article>
              <article>
                <span className="operator-metric-icon"><FaCheckCircle /></span>
                <strong>{resolutionRate ?? '—'}{resolutionRate != null && '%'}</strong>
                <small>Tasa de resolución</small>
              </article>
            </div>
          </section>

          <div className="operator-profile-columns">
            <ProfileEditor />

            <section className="operator-profile-details">
              <div className="operator-details-heading">
                <span>Actividad de la cuenta</span>
                <h2>Acceso y registro</h2>
              </div>
              <div className="operator-details-list">
                <article>
                  <span className="operator-detail-icon"><FaCalendarAlt /></span>
                  <div>
                    <strong>Fecha de registro</strong>
                    <p>{registrationDate}</p>
                  </div>
                </article>
                <article>
                  <span className="operator-detail-icon"><FaClipboardCheck /></span>
                  <div>
                    <strong>Último inicio de sesión registrado</strong>
                    <p>{user?.last_login ? new Date(user.last_login).toLocaleString('es-BO') : 'No disponible'}</p>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PerfilOperador;
