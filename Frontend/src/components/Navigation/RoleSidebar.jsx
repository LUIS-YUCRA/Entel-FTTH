import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FaChartBar,
  FaClipboardList,
  FaHistory,
  FaHome,
  FaSignOutAlt,
  FaTicketAlt,
  FaTools,
  FaUser,
  FaUsers,
  FaBell,
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/AuthService';
import './RoleSidebar.css';
import entelLogo from '../../assets/logo.jpg';
const roleNavigation = {
  cliente: {
    label: 'Portal del cliente',
    profile: '/PerfilCliente',
    items: [
      { to: '/dashboard/cliente', label: 'Asistente', icon: FaHome },
      { to: '/Tickets', label: 'Mis tickets', icon: FaTicketAlt },
      { to: '/PerfilCliente', label: 'Mi perfil', icon: FaUser },
      { to: '/notificaciones', label: 'Notificaciones', icon: FaBell },
    ],
  },
  operador: {
    label: 'Centro de operaciones',
    profile: '/PerfilOperador',
    items: [
      { to: '/dashboard/operador', label: 'Panel', icon: FaHome },
      { to: '/TicketsOperador', label: 'Tickets', icon: FaTicketAlt },
      { to: '/TecnicoDisponible', label: 'Técnicos', icon: FaUsers },
      { to: '/PerfilOperador', label: 'Mi perfil', icon: FaUser },
      { to: '/notificaciones', label: 'Notificaciones', icon: FaBell },
    ],
  },
  tecnico: {
    label: 'Operaciones de campo',
    profile: '/dashboard/tecnico',
    items: [
      { to: '/dashboard/tecnico', label: 'Panel', icon: FaHome },
      { to: '/MisTickets', label: 'Mis tickets', icon: FaClipboardList },
      { to: '/HistorialTecnico', label: 'Historial', icon: FaHistory },
      { to: '/notificaciones', label: 'Notificaciones', icon: FaBell },
    ],
  },
  administrador: {
    label: 'Administración FTTH',
    profile: '/PerfilAdmin',
    items: [
      { to: '/dashboard/administrador', label: 'Panel', icon: FaHome },
      { to: '/GestionTecnicos', label: 'Gestión de técnicos', icon: FaTools },
      { to: '/GestionUsuarios', label: 'Usuarios', icon: FaUsers },
      { to: '/InstanciasServicio', label: 'Instancias de servicio', icon: FaClipboardList },
      { to: '/Reportes', label: 'Reportes', icon: FaChartBar },
      { to: '/PerfilAdmin', label: 'Mi perfil', icon: FaUser },
    ],
  },
};

const initials = (name = '') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'EN';

const RoleSidebar = ({ role }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const navigation = roleNavigation[role];
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    let objectUrl = '';
    let active = true;
    if (user?.has_profile_photo) authService.getProfilePhoto(user.id, user.profile_photo_updated_at).then((blob) => {
      if (blob && active) { objectUrl = URL.createObjectURL(blob); setPhotoUrl(objectUrl); }
    }).catch(() => { if (active) setPhotoUrl(''); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [user?.id, user?.has_profile_photo, user?.profile_photo_updated_at]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="role-sidebar" aria-label={`Navegación ${navigation.label}`}>
      <div className="sidebar-brand">
       <div className="brand-mark">
        <img
          src={entelLogo}
          alt="Logo ENTEL"
          className="brand-logo"
        />
      </div>
        <div>
          <strong>entel</strong>
          <span>{navigation.label}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navigation.items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            title={label}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-support">
        <FaTools aria-hidden="true" />
        <div>
          <strong>Red FTTH operativa</strong>
          <span>Datos sincronizados</span>
        </div>
      </div>

      <div className="sidebar-user">
        <NavLink to={navigation.profile} className="sidebar-avatar" aria-label="Abrir mi perfil" title="Abrir mi perfil">{photoUrl ? <img src={photoUrl} alt={`Foto de ${user?.full_name}`} /> : initials(user?.full_name)}</NavLink>
        <div className="sidebar-user-copy">
          <strong>{user?.full_name || 'Usuario ENTEL'}</strong>
          <span>{user?.email}</span>
        </div>
        <button type="button" onClick={handleLogout} title="Cerrar sesión" aria-label="Cerrar sesión">
          <FaSignOutAlt />
        </button>
      </div>
    </aside>
  );
};

export default RoleSidebar;
