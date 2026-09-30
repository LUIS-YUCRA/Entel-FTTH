import { useEffect, useState } from 'react';
import {
  FaChartLine, FaCheckCircle, FaTicketAlt,
  FaTools, FaUserCog, FaUsers,
} from 'react-icons/fa';
import { ticketService } from '../../services/TicketService';
import { userService } from '../../services/UserService';
import AdminHeader from '../../components/Header/AdminHeader';
import Footer from '../../components/Footer/Footer';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    Promise.all([ticketService.list(), userService.list()])
      .then(([ticketData, userData]) => {
        setTickets(ticketData.tickets);
        setUsers(userData.users);
      })
      .catch(() => {});
  }, []);

  const countStatus = (status) => tickets.filter((item) => item.status === status).length;
  const resolved = tickets.filter((item) => ['RESUELTO', 'CERRADO'].includes(item.status)).length;
  const efficiency = tickets.length ? Math.round((resolved / tickets.length) * 100) : 0;

  return (
    <div className="admin-dashboard">
      <AdminHeader />
      <main className="admin-content">
        <div className="admin-welcome">
          <h1>Panel Administrativo FTTH</h1>
          <p>Control general del sistema de gestión de reclamos ENTEL</p>
        </div>

        <div className="admin-stats">
          <div className="admin-card"><FaTicketAlt /><h2>{tickets.length}</h2><span>Tickets totales</span></div>
          <div className="admin-card"><FaCheckCircle /><h2>{resolved}</h2><span>Resueltos</span></div>
          <div className="admin-card"><FaUsers /><h2>{users.filter((item) => item.user_type === 'cliente').length}</h2><span>Clientes</span></div>
          <div className="admin-card"><FaTools /><h2>{users.filter((item) => item.user_type === 'tecnico').length}</h2><span>Técnicos</span></div>
          <div className="admin-card"><FaUserCog /><h2>{users.filter((item) => item.user_type === 'operador').length}</h2><span>Operadores</span></div>
          <div className="admin-card"><FaChartLine /><h2>{efficiency}%</h2><span>Tasa de resolución</span></div>
        </div>

        <div className="admin-panels">
          <div className="panel-box">
            <h3>Tickets por Estado</h3>
            <div className="estado-item"><span>Pendientes</span><strong>{countStatus('PENDIENTE')}</strong></div>
            <div className="estado-item"><span>Asignados</span><strong>{countStatus('ASIGNADO')}</strong></div>
            <div className="estado-item"><span>En Proceso</span><strong>{countStatus('EN_PROCESO')}</strong></div>
            <div className="estado-item"><span>Resueltos</span><strong>{resolved}</strong></div>
          </div>
          <div className="panel-box">
            <h3>Resumen del Sistema</h3>
            <ul>
              <li>{users.filter((item) => item.is_active).length} usuarios activos.</li>
              <li>{tickets.filter((item) => item.priority === 'ALTA').length} tickets de prioridad alta.</li>
              <li>{tickets.filter((item) => !item.technician_id).length} tickets todavía sin técnico.</li>
              <li>{efficiency}% de los reclamos fueron resueltos o cerrados.</li>
            </ul>
          </div>
        </div>

        <div className="admin-table">
          <h2>Últimos Tickets Registrados</h2>
          <table>
            <thead><tr><th>ID</th><th>Cliente</th><th>Estado</th><th>Prioridad</th></tr></thead>
            <tbody>
              {tickets.slice(0, 8).map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.ticket_code}</td><td>{ticket.customer_name}</td>
                  <td>{ticket.status.replaceAll('_', ' ')}</td><td>{ticket.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
