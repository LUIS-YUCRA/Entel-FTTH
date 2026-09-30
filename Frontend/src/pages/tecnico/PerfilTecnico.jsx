import { useEffect, useMemo, useState } from 'react';
import { FaAward, FaCalendarAlt, FaCheckCircle, FaClipboardList, FaEnvelope, FaIdBadge, FaMapMarkerAlt, FaPhoneAlt, FaTools, FaUserEdit, FaUsers } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/DashboardService';
import TecnicoHeader from '../../components/Header/TecnicoHeader';
import Footer from '../../components/Footer/Footer';
import ProfileEditor from '../../components/ProfileEditor';
import FeedbackDialog from '../../components/FeedbackDialog';
import ProfilePhoto from '../../components/ProfilePhoto';
import './PerfilTecnico.css';

const statusLabels={PENDIENTE:'Pendiente',ASIGNADO:'Asignado',EN_CAMINO:'En camino',EN_PROCESO:'En proceso',REPROGRAMADO:'Reprogramado',RESUELTO:'Resuelto',CERRADO:'Cerrado',INCUMPLIMIENTO_VISITA:'Visita incumplida',CANCELADO:'Cancelado'};
const shortDate=(value,withTime=false)=>{
  if(!value)return'Sin programar';
const date=new Date(value);if(Number.isNaN(date.getTime()))return'Sin programar';
  return new Intl.DateTimeFormat('es-BO',{day:'2-digit',month:'short',year:'numeric',...(withTime?{hour:'2-digit',minute:'2-digit'}:{})}).format(date);
};

const PerfilTecnico=()=>{
  const{user}=useAuth();const[data,setData]=useState(null);const[error,setError]=useState('');
  const[editing,setEditing]=useState(false);const[profileMessage,setProfileMessage]=useState('');
  useEffect(()=>{dashboardService.overview().then(setData).catch((requestError)=>setError(requestError.message));},[]);
  const metrics=data?.metrics;
  const performance=data?.technicianPerformance?.find((item)=>Number(item.id)===Number(user?.id));
  const tickets=useMemo(()=>data?.allTickets||data?.recentTickets||[],[data?.allTickets,data?.recentTickets]);
  const upcomingVisits=useMemo(()=>tickets.filter((ticket)=>ticket.scheduled_at&&new Date(ticket.scheduled_at)>=new Date()&&!['RESUELTO','CERRADO','CANCELADO'].includes(ticket.status)).sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at)),[tickets]);
  const attended=Number(metrics?.resolved||0)+Number(metrics?.closed||0);
  const activeTickets=Number(metrics?.active||0);
  const joinedAt=user?.created_at?shortDate(user.created_at):'No registrada';
    return <div className="perfil-tecnico"><TecnicoHeader/><main className="perfil-content">
      <section className="technician-hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            Técnico FTTH</span>
            <h1>Bienvenido, {user?.full_name||'técnico'}</h1>
            <p>{user?.specialty||'Instalación, mantenimiento y solución de fallas en redes FTTH.'}</p>
        </div>
        <div className={`availability-pill ${user?.is_available===false?'busy':''}`}>
          <i/> {user?.is_available===false?'No disponible':'Disponible'}
        </div>
      </section>
      {error&&<div className="technician-error">{error}</div>}{profileMessage&&
      <FeedbackDialog title="Perfil guardado" onClose={()=>setProfileMessage('')}>
        <p>{profileMessage}</p></FeedbackDialog>}
      <section className="technician-kpis" aria-label="Indicadores del técnico">
        <article className="kpi-card blue"><FaClipboardList/>
          <div>
            <span>Tickets activos</span>
              <strong>{activeTickets}</strong>
                <small>{metrics?.total??0} recibidos en total · {attended} terminados · {metrics?.cancelled??0} cancelados</small>
          </div>
          </article>
        <article className="kpi-card green"><FaCalendarAlt/>
          <div>
            <span>Visitas pendientes</span>
              <strong>{upcomingVisits.length}</strong>
                <small>Visitas abiertas con fecha futura</small>
          </div>
          </article>
        <article className="kpi-card violet"><FaCheckCircle/>
          <div><span>Tickets atendidos</span>
            <strong>{attended}</strong>
              <small>Resueltos y cerrados</small>
          </div>
        </article>
        <article className="kpi-card amber"><FaAward/>
          <div><span>Eficiencia</span>
            <strong>{performance?.efficiency??metrics?.resolution_rate??0}%</strong>
              <small>{performance?.missed_visits??metrics?.missed_visits??0} visitas incumplidas · resolución {metrics?.resolution_rate??0}% menos 10 puntos por incumplimiento</small>
          </div>
        </article>
      </section>
      <div className="technician-dashboard-grid">
        <div className="technician-main-column">
          <section className="dashboard-panel">
            <div className="panel-heading"><div><FaCalendarAlt/>
              <h2>Próximas visitas</h2>
                </div><span>{upcomingVisits.length} programadas</span></div>
                  <div className="dashboard-table-wrap">
                    <table className="dashboard-table">
                      <thead><tr><th>Fecha y hora</th><th>Cliente</th><th>Dirección</th><th>Estado</th></tr></thead>
                        <tbody>{upcomingVisits.map((ticket)=>
                          <tr key={ticket.id}>
                            <td className="date-cell">
                              {shortDate(ticket.scheduled_at,true)}
                            </td><td>{ticket.customer_name}</td>
                              <td>{ticket.customer_address||ticket.customer_zone||'No registrada'}</td>
                                <td><span className={`status-chip status-${ticket.status?.toLowerCase()}`}>{statusLabels[ticket.status]||ticket.status}</span></td>
                          </tr>)}{!upcomingVisits.length&&<tr>
                            <td colSpan="4" className="empty-row">No tienes visitas próximas programadas.</td>
                            </tr>
                       }</tbody>
                    </table>
                  </div>
          </section>
        <section className="dashboard-panel">
          <div className="panel-heading"><div><FaClipboardList/>
            <h2>Mis tickets recientes</h2>
              </div><span>Últimos {Math.min(tickets.length,6)}</span>
          </div>
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead><tr><th>Ticket</th><th>Cliente</th><th>Problema</th><th>Estado</th><th>Registro</th></tr></thead>
                <tbody>{tickets.slice(0,6).map((ticket)=>
                  <tr key={ticket.id}>
                    <td className="ticket-code">
                      {ticket.ticket_code}
                    </td><td>{ticket.customer_name}</td>
                      <td>{ticket.title}</td>
                    <td><span className={`status-chip status-${ticket.status?.toLowerCase()}`}>{statusLabels[ticket.status]||ticket.status}</span></td>
                      <td>{shortDate(ticket.created_at)}</td>
                        </tr>)}{!tickets.length&&<tr>
                      <td colSpan="5" className="empty-row">Aún no tienes tickets registrados.</td>
                        </tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div><aside className="technician-profile-panel">
        <div className="profile-panel-title">
          <div><FaIdBadge/><h2>Mi perfil</h2></div>
            <button type="button" onClick={()=>{setProfileMessage('');setEditing(true);}}>
              <FaUserEdit/> 
              Editar</button>
        </div>
        <ProfilePhoto />
        <div className="profile-detail"><FaIdBadge/>
          <div><span>Nombre completo</span>
            <strong>{user?.full_name}</strong>
          </div>
        </div>
        <div className="profile-detail"><FaEnvelope/><div>
          <span>Correo institucional</span>
            <strong>{user?.email}</strong>
        </div></div><div className="profile-detail"><FaPhoneAlt/><div>
          <span>Teléfono</span>
          <strong>{user?.technician_phone||'No registrado'}</strong>
        </div></div><div className="profile-detail"><FaTools/><div>
          <span>Especialidad</span>
            <strong>{user?.specialty||'FTTH general'}</strong>
        </div></div><div className="profile-detail"><FaMapMarkerAlt/><div>
          <span>Zona de trabajo</span>
            <strong>{user?.technician_zone||'No registrada'}</strong>
        </div></div><div className="profile-detail"><FaCalendarAlt/><div>
          <span>Fecha de ingreso</span>
            <strong>{joinedAt}</strong>
        </div></div><div className="profile-detail"><FaIdBadge/><div>
          <span>Código de empleado</span>
            <strong>{user?.employee_code||`TEC-${String(user?.id||'').padStart(5,'0')}`}</strong>
        </div></div>
          <h3>Información operativa</h3>
        <div className="profile-detail soft"><FaUsers/><div> 
          <span>Cuadrilla</span>
            <strong>{user?.crew||'Sin asignar'}</strong>
              </div></div><div className="profile-detail soft"><FaTools/><div>
                <span>Área</span>
                  <strong>{user?.area||'Soporte técnico FTTH'}</strong>
        </div></div><div className="commitment-note"><FaAward/><div>
          <strong>Tu trabajo impulsa la calidad de la red</strong>
            <span>Cada visita cumplida mejora la experiencia de nuestros clientes.</span>
        </div></div>
      </aside></div>{editing&&<div className="profile-editor-backdrop" role="dialog" aria-modal="true" aria-label="Editar perfil del técnico" onMouseDown={(event)=>{if(event.target===event.currentTarget)setEditing(false);}}>
        <div className="profile-editor-dialog">
          <ProfileEditor showPhoto onCancel={()=>setEditing(false)} onSaved={()=>{setEditing(false);setProfileMessage('Tus datos se actualizaron correctamente. Los cambios ya están visibles en el perfil.');}}/>
        </div></div>
    }</main>
    <Footer/>
    </div>;
};
export default PerfilTecnico;
