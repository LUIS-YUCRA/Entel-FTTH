import { useEffect, useState } from 'react';
import { FaClipboardCheck, FaTicketAlt, FaUsers, FaWifi } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { ticketService } from '../../services/TicketService';
import Footer from '../../components/Footer/Footer';
import OperadorHeader from '../../components/Header/OperadorHeader';
import './OperadorDashboard.css';

const OperadorDashboard = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  useEffect(() => {
    Promise.all([ticketService.list(), ticketService.technicians()])
      .then(([ticketData, technicianData]) => {
        setTickets(ticketData.tickets);
        setTechnicians(technicianData.technicians);
      })
      .catch(() => {});
  }, []);

  const pending = tickets.filter((item) => item.status === 'PENDIENTE').length;
  const assigned = tickets.filter((item) => ['ASIGNADO', 'EN_PROCESO'].includes(item.status)).length;
  const resolved = tickets.filter((item) => ['RESUELTO', 'CERRADO'].includes(item.status)).length;
  const resolutionRate = tickets.length ? Math.round((resolved / tickets.length) * 100) : 0;

  return (
    <div className="operador-container">
      <OperadorHeader />
      <main className="dashboard-content">
        <div className="welcome-box">
          <h1>Bienvenido, {user?.full_name}</h1>
          <p>Centro de Gestión de Reclamos FTTH</p>
        </div>
        <div className="cards-grid">
          <div className="card"><FaTicketAlt /><h2>{pending}</h2><span>Tickets pendientes</span></div>
          <div className="card"><FaClipboardCheck /><h2>{assigned}</h2><span>Asignados o en proceso</span></div>
          <div className="card"><FaUsers /><h2>{technicians.length}</h2><span>Técnicos activos</span></div>
          <div className="card"><FaWifi /><h2>{resolutionRate}%</h2><span>Tasa de resolución</span></div>
        </div>
        <div className="table-card">
          <h2>Últimos Tickets</h2>
          <table>
            <thead><tr><th>ID</th><th>Cliente</th><th>Falla</th><th>Estado</th></tr></thead>
            <tbody>
              {tickets.slice(0, 5).map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.ticket_code}</td><td>{ticket.customer_name}</td>
                  <td>{ticket.title}</td>
                  <td><span className={`estado ${ticket.status.toLowerCase()}`}>{ticket.status.replaceAll('_', ' ')}</span></td>
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

export default OperadorDashboard;
