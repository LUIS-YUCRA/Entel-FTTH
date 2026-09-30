import { useEffect, useState } from 'react';
import {
  FaCalendarAlt, FaChartLine, FaEnvelope,
  FaTicketAlt, FaUsers, FaUserShield,
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/DashboardService';
import AdminHeader from '../../components/Header/AdminHeader';
import Footer from '../../components/Footer/Footer';
import ProfileEditor from '../../components/ProfileEditor';
import ProfilePhoto from '../../components/ProfilePhoto';
import './PerfilAdmin.css';

const PerfilAdmin = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardService.overview().then(setData).catch((requestError) => setError(requestError.message));
  }, []);

  return (
    <div className="perfil-admin">
      <AdminHeader />
      <main className="perfil-admin-content">
        <h1>Perfil del administrador</h1>
        {error && <div className="operator-error">{error}</div>}
        <div className="admin-profile-card">
          <ProfilePhoto />
          <div><h2>{user?.full_name}</h2><p>Administrador del sistema FTTH</p></div>
        </div>
        <ProfileEditor />

        <div className="admin-info-grid">
          <div className="info-card">
            <h3>Información registrada</h3>
            <div className="info-row"><FaEnvelope /><span>{user?.email}</span></div>
            <div className="info-row"><FaUserShield /><span>ID ADM-{String(user?.id).padStart(5, '0')}</span></div>
            <div className="info-row"><FaCalendarAlt /><span>Registro: {new Date(user?.created_at).toLocaleDateString('es-BO')}</span></div>
          </div>
          <div className="info-card">
            <h3>Permisos del sistema</h3>
            <ul><li>Gestión de usuarios</li><li>Supervisión de tickets</li><li>Reportes globales</li><li>Control de accesos</li></ul>
          </div>
        </div>

        <div className="admin-stats">
          <div className="stat-box"><FaUsers /><h2>{data?.users.total ?? '—'}</h2><span>Usuarios registrados</span></div>
          <div className="stat-box"><FaTicketAlt /><h2>{data?.metrics.total ?? '—'}</h2><span>Tickets gestionados</span></div>
          <div className="stat-box"><FaChartLine /><h2>{data?.metrics.resolution_rate ?? '—'}%</h2><span>Tasa de resolución</span></div>
          <div className="stat-box"><FaUsers /><h2>{data?.users.technicians ?? '—'}</h2><span>Técnicos activos</span></div>
        </div>

        <div className="activity-card">
          <h3>Actividad real reciente</h3>
          <table>
            <thead><tr><th>Fecha</th><th>Ticket</th><th>Actividad</th><th>Responsable</th></tr></thead>
            <tbody>
              {data?.activity.slice(0, 6).map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.created_at).toLocaleString('es-BO')}</td>
                  <td>{item.ticket_code}</td><td>{item.action.replaceAll('_', ' ')}</td>
                  <td>{item.changed_by_name}</td>
                </tr>
              ))}
              {data && !data.activity.length && <tr><td colSpan="4">Sin actividad registrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PerfilAdmin;
