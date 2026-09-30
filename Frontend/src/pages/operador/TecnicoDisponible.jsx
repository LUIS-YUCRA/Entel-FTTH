import { useEffect, useMemo, useState } from 'react';
import {
  FaClipboardCheck, FaSearch, FaTools, FaUserCheck,
  FaUserClock, FaUsers,
} from 'react-icons/fa';
import { ticketService } from '../../services/TicketService';
import { userService } from '../../services/UserService';
import { useAuth } from '../../context/AuthContext';
import OperadorHeader from '../../components/Header/OperadorHeader';
import AdminHeader from '../../components/Header/AdminHeader';
import Footer from '../../components/Footer/Footer';
import './TecnicoDisponible.css';

const TechnicianPhoto = ({ technician }) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let objectUrl = '';
    if (technician.has_profile_photo) userService.photo(technician.id).then((blob) => { if (blob) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); } }).catch(() => {});
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [technician.id, technician.has_profile_photo, technician.photoVersion]);
  return <div className="technician-photo">{url ? <img src={url} alt={`Foto de ${technician.full_name}`} /> : <div className="tecnico-avatar">👨‍🔧</div>}</div>;
};

const TecnicosDisponibles = () => {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const isAdmin = user?.user_type === 'administrador';

  useEffect(() => {
    ticketService.technicians()
      .then((data) => setTechnicians(data.technicians))
      .catch((requestError) => setError(requestError.message));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return technicians.filter((item) => item.full_name.toLowerCase().includes(term));
  }, [technicians, search]);

  const available = technicians.filter((item) => item.is_available !== false && item.active_tickets < (item.max_active_tickets || 8));
  const activeTasks = technicians.reduce((total, item) => total + item.active_tickets, 0);

  return (
    <div className="tecnicos-page">
      {isAdmin ? <AdminHeader /> : <OperadorHeader />}
      <main className="tecnicos-content">
        <div className="page-title">
          <h1>Gestión de Técnicos</h1>
          <p>Carga laboral actual obtenida</p>
        </div>
        {error && <div className="operator-error">{error}</div>}

        <div className="stats-grid">
          <div className="stat-card"><FaUsers /><h2>{technicians.length}</h2><span>Técnicos activos</span></div>
          <div className="stat-card"><FaUserCheck /><h2>{available.length}</h2><span>Disponibles</span></div>
          <div className="stat-card"><FaUserClock /><h2>{technicians.length - available.length}</h2><span>Carga completa</span></div>
          <div className="stat-card"><FaClipboardCheck /><h2>{activeTasks}</h2><span>Tareas activas</span></div>
        </div>

        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Buscar técnico por nombre..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="tecnicos-grid">
          {filtered.map((technician) => {
            const isAvailable = technician.is_available !== false && technician.active_tickets < (technician.max_active_tickets || 8);
            return (
              <div className="tecnico-card" key={technician.id}>
                <TechnicianPhoto technician={technician} />
                <h3>{technician.full_name}</h3>
                <span className={isAvailable ? 'estado disponible' : 'estado ocupado'}>
                  {isAvailable ? 'Disponible' : 'Carga completa'}
                </span>
                <div className="info-row"><FaTools /> {technician.area || 'Soporte técnico FTTH'}</div>
                <div className="info-row"><strong>Código:</strong> {technician.employee_code || `TEC-${String(technician.id).padStart(5, '0')}`}</div>
                <div className="info-row"><strong>Teléfono:</strong> {technician.phone || 'No registrado'}</div>
                <div className="info-row"><strong>Correo:</strong> {technician.email}</div>
                <div className="info-row"><strong>Cuadrilla:</strong> {technician.crew || 'No registrada'}</div>
                <div className="info-row"><strong>Zona:</strong> {technician.zone || 'No registrada'}</div>
                <div className="info-row"><strong>Especialidad:</strong> {technician.specialty || 'FTTH general'}</div>
                <div className="info-row"><FaClipboardCheck /> Tickets activos: {technician.active_tickets}/{technician.max_active_tickets || 8}</div>
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TecnicosDisponibles;
