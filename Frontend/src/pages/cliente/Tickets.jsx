import Pagination from '../../components/Pagination';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaCheckCircle, FaClock, FaDownload, FaSearch, FaTicketAlt, FaTimes, FaTools,
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { ticketService } from '../../services/TicketService';
import { userService } from '../../services/UserService';
import Footer from '../../components/Footer/Footer';
import Header from '../../components/Header/Header';
import './Tickets.css';

const displayStatus = (status) => String(status || '').replaceAll('_', ' ');
const historyLabel = (item) => item.action === 'ASIGNACION_TECNICO'
  ? 'Técnico asignado'
  : item.action === 'CAMBIO_ESTADO'
    ? `Técnico: ${displayStatus(item.new_value)}`
    : displayStatus(item.action);

const TechnicianCard = ({ ticket, onClose }) => {
  const [photoUrl, setPhotoUrl] = useState('');
  useEffect(() => {
    let objectUrl = '';
    if (ticket.technician_id && ticket.technician_has_photo) userService.photo(ticket.technician_id).then((blob) => {
      if (blob) { objectUrl = URL.createObjectURL(blob); setPhotoUrl(objectUrl); }
    }).catch(() => {});
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [ticket.technician_id, ticket.technician_has_photo]);
  return <div className="technician-modal-overlay" role="dialog" aria-modal="true" aria-label="Información del técnico"><section className="technician-modal">
    <button type="button" className="technician-modal-close" onClick={onClose} aria-label="Cerrar"><FaTimes /></button>
    <div className="technician-modal-avatar">{photoUrl ? <img src={photoUrl} alt={`Foto de ${ticket.technician_name}`} /> : <FaTools />}</div>
    <span className="technician-modal-label">Técnico asignado</span><h2>{ticket.technician_name}</h2>
    <div className="technician-modal-data"><p><span>Código de empleado</span><strong>{ticket.technician_employee_code || 'No registrado'}</strong></p><p><span>Área</span><strong>{ticket.technician_area || 'Soporte técnico FTTH'}</strong></p><p><span>Especialidad</span><strong>{ticket.technician_specialty || 'FTTH general'}</strong></p><p><span>Teléfono</span><strong>{ticket.technician_phone || 'No registrado'}</strong></p><p><span>Correo institucional</span><strong>{ticket.technician_email || 'No registrado'}</strong></p><p><span>Cuadrilla</span><strong>{ticket.technician_crew || 'No registrada'}</strong></p><p><span>Zona de trabajo</span><strong>{ticket.technician_zone || 'No registrada'}</strong></p></div>
  </section></div>;
};

const EvidencePreview = ({ evidence, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  useEffect(() => {
    let objectUrl = '';
    ticketService.loadEvidence(evidence)
      .then((blob) => { objectUrl = URL.createObjectURL(blob); setPreviewUrl(objectUrl); })
      .catch((requestError) => setPreviewError(requestError.message));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [evidence]);
  return <div className="evidence-preview-overlay" role="dialog" aria-modal="true" aria-label="Vista previa de evidencia">
    <section className="evidence-preview-modal">
      <div className="evidence-preview-heading"><div><span>Evidencia del ticket</span><h2>{evidence.original_name}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar vista previa"><FaTimes /></button></div>
      <div className="evidence-preview-content">
        {!previewUrl && !previewError && <p>Cargando evidencia...</p>}
        {previewError && <p className="chat-error">{previewError}</p>}
        {previewUrl && evidence.mime_type.startsWith('image/') && <img src={previewUrl} alt={`Evidencia ${evidence.original_name}`} />}
        {previewUrl && evidence.mime_type.startsWith('video/') && <video src={previewUrl} controls><track kind="captions" /></video>}
      </div>
      <div className="evidence-preview-actions"><button type="button" className="secondary" onClick={onClose}>Cerrar</button><button type="button" onClick={() => ticketService.downloadEvidence(evidence)}><FaDownload /> Descargar evidencia</button></div>
    </section>
  </div>;
};

const Tickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [technicianCard, setTechnicianCard] = useState(null);
  const [evidencePreview, setEvidencePreview] = useState(null);
  const detailRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const openTicket = async (ticket) => {
    setSelected(ticket);
    setLoadingDetail(true);
    try {
      const data = await ticketService.get(ticket.id);
      setSelected(data.ticket);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingDetail(false);
      window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }
  };

  useEffect(() => {
    ticketService.list()
      .then((data) => {
        setTickets(data.tickets);
        if (data.tickets[0]) {
          ticketService.get(data.tickets[0].id)
            .then((detail) => setSelected(detail.ticket))
            .catch(() => setSelected(data.tickets[0]));
        }
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
    const interval = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const data = await ticketService.list();
        setTickets(data.tickets);
        if (selectedRef.current?.id) {
          const detail = await ticketService.get(selectedRef.current.id);
          setSelected(detail.ticket);
        }
      } catch { /* actualización silenciosa */ }
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const filtered = useMemo(
    () => tickets.filter((ticket) => (
      ticket.ticket_code.toLowerCase().includes(search.trim().toLowerCase())
    )),
    [tickets, search],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleTickets = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const active = tickets.filter((ticket) => (
    !['RESUELTO', 'CERRADO', 'CANCELADO'].includes(ticket.status)
  )).length;
  const resolved = tickets.filter((ticket) => (
    ['RESUELTO', 'CERRADO'].includes(ticket.status)
  )).length;

  return (
    <div className="tickets-container">
      <Header />
      <main className="tickets-content">
        <header className="client-tickets-heading">
          <div>
            <p className="page-eyebrow">Seguimiento de atención</p>
            <h1>Mis tickets</h1>
            <p>Consulta el avance, técnico responsable y diagnóstico de tu reclamo.</p>
          </div>
          <div className="client-account-label"><span>Cliente</span><strong>{user?.full_name}</strong></div>
        </header>

        <section className="client-ticket-kpis">
          <article><FaTicketAlt /><div><strong>{tickets.length}</strong><span>Tickets registrados</span></div></article>
          <article><FaClock /><div><strong>{active}</strong><span>En atención</span></div></article>
          <article><FaCheckCircle /><div><strong>{resolved}</strong><span>Solucionados</span></div></article>
          <article><FaTools /><div><strong>{tickets.filter((ticket) => ticket.technician_id).length}</strong><span>Con técnico asignado</span></div></article>
        </section>

        <div className="client-ticket-toolbar">
          <div className="search-box">
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar por ID de ticket"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
          <span>{filtered.length} resultados</span>
        </div>

        {error && <div className="chat-error">{error}</div>}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID Ticket</th>
                <th>Tipo de falla</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Técnico</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="empty-state">Cargando tickets...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    No tienes tickets registrados.
                  </td>
                </tr>
              ) : visibleTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.ticket_code}</td>
                  <td>{ticket.title}</td>
                  <td><span className={`prioridad ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></td>
                  <td><span className={`estado ${ticket.status.toLowerCase()}`}>{displayStatus(ticket.status)}</span></td>
                  <td>{ticket.technician_name ? <button type="button" className="technician-name-button" onClick={() => setTechnicianCard(ticket)}>{ticket.technician_name}</button> : 'Sin asignar'}</td>
                  <td>{new Date(ticket.created_at).toLocaleString('es-BO')}</td>
                  <td><button type="button" className="view-ticket-button" onClick={() => openTicket(ticket)}>Ver detalle</button></td>
                </tr>
              ))}
            </tbody>
          </table>

        
        </div>

        {!loading && filtered.length > 0 && <Pagination page={currentPage} pageSize={pageSize} total={filtered.length} noun="tickets" onPageChange={setPage} />}
        {selected && (
          <section className="client-ticket-detail" ref={detailRef} tabIndex="-1">
            {loadingDetail && <div className="chat-error">Actualizando detalle...</div>}
            <div className="client-ticket-detail-heading">
              <div><span>Ticket seleccionado</span><h2>{selected.ticket_code}</h2></div>
              <div>
                <span className={`prioridad ${selected.priority.toLowerCase()}`}>{selected.priority}</span>
                <span className={`estado ${selected.status.toLowerCase()}`}>{displayStatus(selected.status)}</span>
                <button type="button" className="close-ticket-detail" onClick={() => setSelected(null)} aria-label="Cerrar detalle"><FaTimes /></button>
              </div>
            </div>
            <div className="client-ticket-detail-grid">
              <div><span>Problema reportado</span><strong>{selected.title}</strong></div>
              <div><span>Técnico responsable</span><strong>{selected.technician_name ? <button type="button" className="technician-name-button" onClick={() => setTechnicianCard(selected)}>{selected.technician_name}</button> : 'Pendiente de asignación'}</strong></div>
              <div><span>Diagnóstico</span><strong>{displayStatus(selected.diagnosis_code || 'En evaluación')}</strong></div>
              <div><span>Fecha de registro</span><strong>{new Date(selected.created_at).toLocaleString('es-BO')}</strong></div>
            </div>
            <div className="client-ticket-description">
              <span>Descripción</span>
              <p>{selected.description}</p>
              {selected.cause && <p><strong>Causa probable:</strong> {selected.cause}</p>}
              {selected.solution && <p><strong>Solución aplicada:</strong> {selected.solution}</p>}
              {selected.non_resolution_reason && <p><strong>Motivo de reprogramación:</strong> {selected.non_resolution_reason}</p>}
              {selected.scheduled_at && <p><strong>Nueva fecha:</strong> {new Date(selected.scheduled_at).toLocaleString('es-BO')}</p>}
            </div>
            <div className="client-ticket-detail-grid">
              <div>
                <span>Historial</span>
                <strong>{selected.history?.length || 0} actualizaciones</strong>
              </div>
              <div>
                <span>Evidencias</span>
                <strong>{selected.evidences?.length || 0} archivos</strong>
                {selected.evidences?.map((evidence) => (
                  <button key={evidence.id} type="button" className="view-ticket-button" onClick={() => setEvidencePreview(evidence)}>
                    {evidence.original_name}
                  </button>
                ))}
              </div>
            </div>
            <div className="client-ticket-history">
              <div className="client-ticket-history-heading">
                <span>Historial completo</span>
                <strong>{(selected.history?.length || 0) + 1} eventos</strong>
              </div>
              <article>
                <span className="client-history-dot" />
                <div><strong>Ticket registrado</strong><p>{new Date(selected.created_at).toLocaleString('es-BO')}</p></div>
              </article>
              {selected.history?.map((item) => (
                <article key={item.id}>
                  <span className="client-history-dot" />
                  <div>
                    <strong>{historyLabel(item)}</strong>
                    <p>{item.action === 'ASIGNACION_TECNICO'
                      ? item.technician_name
                      : item.changed_by_name} · {new Date(item.created_at).toLocaleString('es-BO')}</p>
                    {item.action === 'CAMBIO_ESTADO' && item.previous_value && (
                      <small>{displayStatus(item.previous_value)} → {displayStatus(item.new_value)}</small>
                    )}
                    {item.observation && <small>{item.observation}</small>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        {technicianCard && <TechnicianCard ticket={technicianCard} onClose={() => setTechnicianCard(null)} />}
        {evidencePreview && <EvidencePreview evidence={evidencePreview} onClose={() => setEvidencePreview(null)} />}
      </main>
      <Footer />
    </div>
  );
};

export default Tickets;
