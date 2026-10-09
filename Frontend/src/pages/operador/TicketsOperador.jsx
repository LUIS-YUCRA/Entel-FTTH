import Pagination from '../../components/Pagination';
import ResponsiveFilterSelect from '../../components/ResponsiveFilterSelect';
import ResponsiveDateFilter from '../../components/ResponsiveDateFilter';
import FeedbackDialog from '../../components/FeedbackDialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaCalendarAlt,
  FaTimes,
  FaCheckCircle,
  FaClipboardCheck,
  FaClock,
  FaExclamationTriangle,
  FaFileAlt,
  FaSearch,
  FaTicketAlt,
  FaUser,
  FaUserClock,
  FaUserCog,
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { ticketService } from '../../services/TicketService';
import OperadorHeader from '../../components/Header/OperadorHeader';
import AdminHeader from '../../components/Header/AdminHeader';
import Footer from '../../components/Footer/Footer';
import { EvidencePreviewModal, EvidenceThumbnail } from '../../components/EvidenceViewer/EvidenceViewer';
import './TicketsOperador.css';

const isFutureVisit = value => /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) && Number.isFinite(new Date(value).getTime()) && new Date(value).getTime() > Date.now();
const humanize = (value) => String(value || 'Sin dato').replaceAll('_', ' ');
const formatDate = (value, withTime = false) => {
  if (!value) return 'Sin registro';
  return new Date(value).toLocaleString('es-BO', withTime
    ? { dateStyle: 'short', timeStyle: 'short' }
    : { dateStyle: 'medium' });
};
const toDateTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const actionLabel = (action) => ({
  CAMBIO_ESTADO: 'Estado actualizado',
  ASIGNACION_TECNICO: 'Técnico asignado',
}[action] || humanize(action));

const historyLabel = (item) => item.action === 'CAMBIO_ESTADO'
  ? 'Estado actualizado'
  : actionLabel(item.action, item.new_value);

const TicketsOperador = () => {
  useEffect(() => {
    const closePopovers = event => {
      const selector = '.operator-tickets-content details.mobile-filter-select, .operator-tickets-content details.mobile-date-filter';
      const current = event.target.closest(selector);
      document.querySelectorAll(selector).forEach(panel => {
        if (panel !== current) panel.open = false;
      });
      if (current && event.target.closest('summary')) {
        const bounds = current.querySelector('summary').getBoundingClientRect();
        const height = current.classList.contains('mobile-date-filter') ? 350 : 250;
        current.dataset.direction = window.innerHeight - bounds.bottom < height && bounds.top > height ? 'up' : 'down';
      }
    };
    document.addEventListener('pointerdown', closePopovers);
    document.addEventListener('focusin', closePopovers);
    return () => {
      document.removeEventListener('pointerdown', closePopovers);
      document.removeEventListener('focusin', closePopovers);
    };
  }, []);
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [technicianFilter, setTechnicianFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [technicianId, setTechnicianId] = useState('');
  const [nextStatus, setNextStatus] = useState('EN_PROCESO');
  const [observation, setObservation] = useState('');
  const [evidencePreview, setEvidencePreview] = useState(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const showActionError = (message, field) => setFeedback({ title: 'Revisa los datos', message, field });
  const closeFeedback = () => {
    const field = feedback?.field;
    setFeedback(null);
    if (field) requestAnimationFrame(() => {
      const target = document.querySelector(field);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus({ preventScroll: true });
    });
  };
  const [loadingDetails, setLoadingDetails] = useState(false);
  const selectedRef = useRef(null);
  const detailRef = useRef(null);
  const requestId = useRef(0);
  const [page, setPage] = useState(1);
  const [navigation, setNavigation] = useState(0);
  useEffect(() => {
    if (!navigation) return;
    const frame = requestAnimationFrame(() => {
      detailRef.current?.focus({ preventScroll: true });
      detailRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [navigation]);
  const closeDetail = () => { requestId.current += 1; selectedRef.current = null; setSelected(null); setLoadingDetails(false); };

  const isAdmin = user?.user_type === 'administrador';

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const openTicket = async (ticket) => {
    const request = ++requestId.current;
    selectedRef.current = ticket;
    setNavigation(current => current + 1);
    setSelected(ticket);
    setTechnicianId(ticket.technician_id || '');
    setNextStatus(ticket.status || 'EN_PROCESO');
    setScheduledAt(toDateTimeInput(ticket.scheduled_at));
    setLoadingDetails(true);
    setError('');
    try {
      const data = await ticketService.get(ticket.id);
      if (request !== requestId.current) return;
      setSelected(data.ticket);
      setTechnicianId(data.ticket.technician_id || '');
      setNextStatus(data.ticket.status || 'EN_PROCESO');
      setScheduledAt(toDateTimeInput(data.ticket.scheduled_at));
    } catch (requestError) {
      if (request === requestId.current) setError(requestError.message);
    } finally {
      if (request === requestId.current) setLoadingDetails(false);
    }
  };

  useEffect(() => {
    Promise.all([
      ticketService.list(),
      ticketService.technicians(),
    ])
      .then(([ticketData, technicianData]) => {
        setTickets(ticketData.tickets);
        setTechnicians(technicianData.technicians);

      })
      .catch((requestError) => setError(requestError.message));
    const interval = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const [ticketData, technicianData] = await Promise.all([
          ticketService.list(), ticketService.technicians(),
        ]);
        setTickets(ticketData.tickets);
        setTechnicians(technicianData.technicians);
        if (selectedRef.current?.id) {
          const id = selectedRef.current.id;
          const request = requestId.current;
          const detail = await ticketService.get(id);
          if (request === requestId.current && selectedRef.current?.id === id) setSelected(detail.ticket);
        }
      } catch { /* conserva los datos visibles y reintenta en el siguiente ciclo */ }
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets.filter((ticket) => (
      (!term
        || ticket.ticket_code.toLowerCase().includes(term)
        || ticket.customer_name.toLowerCase().includes(term)
        || ticket.title.toLowerCase().includes(term))
      && (!statusFilter || ticket.status === statusFilter)
      && (!priorityFilter || ticket.priority === priorityFilter)
      && (!technicianFilter || String(ticket.technician_id || '') === technicianFilter)
    ));
  }, [tickets, search, statusFilter, priorityFilter, technicianFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, totalPages);
  const pageTickets = filtered.slice((currentPage - 1) * 5, currentPage * 5);

  const active = tickets.filter((ticket) => !['CERRADO', 'CANCELADO'].includes(ticket.status));
  const resolvedToday = tickets.filter((ticket) => (
    ticket.resolved_at
    && new Date(ticket.resolved_at).toDateString() === new Date().toDateString()
  ));

  const mergeTicket = (updated) => {
    setTickets((current) => current.map((item) => (
      item.id === updated.id ? { ...item, ...updated } : item
    )));
    setSelected((current) => current?.id === updated.id ? { ...current, ...updated } : current);
  };

  const assign = async () => {
    if (saving) return;
    if (selected?.technician_id) {
      showActionError('Este ticket ya tiene un técnico responsable asignado.');
      return;
    }
    if (!selected || !technicianId) {
      showActionError('Selecciona un técnico responsable antes de asignar el ticket.', '#ticket-technician');
      return;
    }
    if (!isFutureVisit(scheduledAt)) {
      showActionError('Selecciona una fecha y hora luego vuelve a asignar técnico.', window.matchMedia('(max-width: 900px)').matches ? '.operator-mobile-schedule summary' : '#ticket-scheduled-at');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = await ticketService.assign(
        selected.id,
        Number(technicianId),
        observation.trim(),
        new Date(scheduledAt).toISOString(),
      );
      const technician = technicians.find((item) => item.id === Number(technicianId));
      mergeTicket({ ...data.ticket, technician_name: technician?.full_name });
      setNextStatus('ASIGNADO');
      setObservation('');
      if (selectedRef.current?.id === selected.id) await openTicket({ ...selected, ...data.ticket });
      setFeedback({ title: 'Técnico asignado', message: `Se asignó ${technician?.full_name || 'el técnico seleccionado'} al ticket ${selected.ticket_code}. Visita: ${formatDate(scheduledAt, true)}.` });
    } catch (requestError) {
      setFeedback({ title: 'No se pudo asignar el técnico', message: requestError.message });
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!selected || saving) return;
    if (nextStatus === 'ASIGNADO' && !selected.technician_id) {
      showActionError('Asigna un técnico responsable antes de guardar cambios. Selecciona el técnico, indica fecha y hora futura. Elegir un técnico en la lista todavía no lo asigna al ticket.', '#ticket-technician');
      return;
    }
    if (nextStatus === selected.status) {
      showActionError(`El ticket ya está en estado ${humanize(selected.status)}. Selecciona un estado diferente y vuelve a guardar cambios.`, '#ticket-status');
      return;
    }
    if (nextStatus === 'REPROGRAMADO' && (!observation.trim() || !isFutureVisit(scheduledAt))) {
      showActionError('Para reprogramar, escribe el motivo y selecciona una nueva fecha y hora.', '#ticket-observation');
      return;
    }
    if (['CERRADO', 'CANCELADO'].includes(nextStatus)) {
      if (!observation.trim()) {
        showActionError(`Describe el motivo antes de marcar el ticket como ${humanize(nextStatus).toLowerCase()}.`, '#ticket-observation');
        return;
      }
      if (!window.confirm(`¿Confirmas cambiar ${selected.ticket_code} a ${humanize(nextStatus)}? Esta acción quedará auditada.`)) return;
    }
    setError('');
    setSaving(true);
    try {
      const data = await ticketService.updateStatus(
        selected.id,
        nextStatus,
        observation.trim(),
        nextStatus === 'REPROGRAMADO' ? {
          scheduledAt: new Date(scheduledAt).toISOString(),
          nonResolutionReason: observation.trim(),
        } : {},
      );
      mergeTicket(data.ticket);
      setObservation('');
      if (selectedRef.current?.id === selected.id) await openTicket({ ...selected, ...data.ticket });
      setFeedback({ title: 'Cambios guardados', message: `El ticket ${selected.ticket_code} se actualizó a ${humanize(nextStatus)}.` });
    } catch (requestError) {
      setFeedback({ title: 'No se pudieron guardar los cambios', message: requestError.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tickets-operador">
      {feedback && <FeedbackDialog title={feedback.title} tone={feedback.title === 'Revisa los datos' ? 'warning' : feedback.title.startsWith('No se') ? 'error' : 'success'} hint={feedback.field ? '' : undefined} onClose={closeFeedback}><p>{feedback.message}</p></FeedbackDialog>}
      {isAdmin ? <AdminHeader /> : <OperadorHeader />}
      <main className="tickets-content operator-tickets-content">
        <header className="operator-page-heading">
          <div>
            <p className="page-eyebrow">{isAdmin ? 'Administración y seguimiento' : 'Centro de operaciones'}</p>
            <h1>Visualización y control de tickets</h1>
            <p>Prioriza reclamos, revisa el diagnóstico y coordina la atención técnica.</p>
          </div>
          <div className="operator-session">
            <span>{isAdmin ? 'Administrador' : 'Operador'}</span>
            <strong>{user?.full_name}</strong>
          </div>
        </header>

        <section className="operator-kpis">
          <article><FaTicketAlt /><div><strong>{active.length}</strong><span>Tickets activos</span></div></article>
          <article className="danger"><FaExclamationTriangle /><div><strong>{active.filter((item) => item.priority === 'ALTA').length}</strong><span>Prioridad alta</span></div></article>
          <article className="warning"><FaUserClock /><div><strong>{active.filter((item) => !item.technician_id).length}</strong><span>Sin asignar</span></div></article>
          <article className="success"><FaClipboardCheck /><div><strong>{resolvedToday.length}</strong><span>Resueltos hoy</span></div></article>
        </section>

        {error && <div className="operator-error">{error}</div>}

        <section className="ticket-filter-bar">
          <div className="operator-search">
            <FaSearch />
            <input
              type="search"
              placeholder="Buscar ticket, cliente o tipo de falla"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
          <ResponsiveFilterSelect value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="ASIGNADO">Asignado</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="RESUELTO">Resuelto</option>
            <option value="CERRADO">Cerrado</option>
          </ResponsiveFilterSelect>
          <ResponsiveFilterSelect value={priorityFilter} onChange={(event) => { setPriorityFilter(event.target.value); setPage(1); }}>
            <option value="">Todas las prioridades</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </ResponsiveFilterSelect>
          <ResponsiveFilterSelect value={technicianFilter} onChange={(event) => { setTechnicianFilter(event.target.value); setPage(1); }}>
            <option value="">Todos los técnicos</option>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>{technician.full_name}</option>
            ))}
          </ResponsiveFilterSelect>
          <button
            type="button"
            className="clear-filters"
            onClick={() => {
              setPage(1);
              setSearch('');
              setStatusFilter('');
              setPriorityFilter('');
              setTechnicianFilter('');
            }}
          >
            Limpiar
          </button>
        </section>

        <section className={`ticket-control-layout${selected ? '' : ' detail-closed'}`}>
          <div className="ticket-queue">
            <div className="queue-heading">
              <div>
                <h2>Cola de atención</h2>
                <span>{filtered.length} de {tickets.length} tickets</span>
              </div>
              <FaTicketAlt />
            </div>
            <div className="ticket-list">
              {pageTickets.map((ticket) => (
                <button
                  type="button"
                  key={ticket.id}
                  className={`ticket-list-item${selected?.id === ticket.id ? ' selected' : ''}`}
                  onClick={() => openTicket(ticket)}
                >
                  <div className="ticket-list-icon"><FaFileAlt /></div>
                  <div className="ticket-list-copy">
                    <div className="ticket-list-topline">
                      <strong>{ticket.ticket_code}</strong>
                      <span className={`prioridad ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
                    </div>
                    <h3>{ticket.customer_name}</h3>
                    <p>{ticket.title}</p>
                    <div className="ticket-list-meta">
                      <span><FaClock /> {formatDate(ticket.created_at, true)}</span>
                      <span className={`estado ${ticket.status.toLowerCase()}`}>{humanize(ticket.status)}</span>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="queue-empty">
                  <FaSearch />
                  <strong>No hay coincidencias</strong>
                  <span>Cambia o limpia los filtros.</span>
                </div>
              )}
            </div>
            {filtered.length > 0 && <Pagination page={currentPage} pageSize={5} total={filtered.length} noun="tickets" label="Paginación de cola de atención" onPageChange={setPage} />}
          </div>

          {selected && <div className="ticket-detail-panel" ref={detailRef} tabIndex={-1} aria-label="Detalle del ticket">
                <div className="detail-heading">
                  <div>
                    <p>Detalle del ticket</p>
                    <h2>{selected.ticket_code}</h2>
                  </div>
                  <button type="button" className="operator-detail-close" aria-label="Cerrar detalle" onClick={closeDetail}><FaTimes /></button>
                  <div className="detail-badges">
                    <span className={`prioridad ${selected.priority.toLowerCase()}`}>{selected.priority}</span>
                    <span className={`estado ${selected.status.toLowerCase()}`}>{humanize(selected.status)}</span>
                  </div>
                </div>

                {loadingDetails ? (
                  <div className="detail-loading">Cargando información real del ticket...</div>
                ) : (
                  <>
                    <div className="ticket-facts">
                      <div><FaUser /><span>Cliente</span><strong>{selected.customer_name}</strong></div>
                      <div><FaCalendarAlt /><span>Fecha de creación</span><strong>{formatDate(selected.created_at, true)}</strong></div>
                      <div><FaUserCog /><span>Técnico responsable</span><strong>{selected.technician_name || 'Sin asignar'}</strong></div>
                      <div><FaCheckCircle /><span>Diagnóstico</span><strong>{humanize(selected.diagnosis_code || 'Pendiente')}</strong></div>
                      <div><FaClock /><span>Visita programada</span><strong>{formatDate(selected.scheduled_at, true)}</strong></div>
                    </div>

                    <div className="diagnosis-block">
                      <div>
                        <span>Tipo de falla</span>
                        <h3>{selected.title}</h3>
                      </div>
                      {selected.cause && <p><strong>Causa probable:</strong> {selected.cause}</p>}
                    </div>

                    <div className="ticket-detail-columns">
                      <div className="ticket-detail-column">
                      <section className="evidence-section">
                        <div className="subsection-heading">
                          <h3>Evidencias</h3>
                          <span>{selected.evidences?.length || 0} archivos</span>
                        </div>
                        <div className={`evidence-grid${selected.evidences?.length ? '' : ' evidence-grid-empty'}`}>
                          {selected.evidences?.map((evidence) => (
                            <article key={evidence.id}>
                              <EvidenceThumbnail evidence={evidence} />
                              <strong>{evidence.original_name}</strong>
                              <span>{Math.max(1, Math.round(evidence.size_bytes / 1024))} KB</span>
                              <button type="button" onClick={() => setEvidencePreview(evidence)}>Abrir evidencia</button>
                            </article>
                          ))}
                          {!selected.evidences?.length && (
                            <div className="subsection-empty">El cliente no adjuntó evidencias.</div>
                          )}
                        </div>
                      </section>

                      <section className="history-section">
                        <div className="subsection-heading">
                          <h3>Conversación del diagnóstico</h3>
                          <span>{selected.conversation?.length || 0} mensajes</span>
                        </div>
                        <div className="diagnosis-conversation" tabIndex={0} aria-label="Mensajes del diagnóstico">
                          {selected.conversation?.map((message) => (
                            <article key={message.id} className={message.sender === 'usuario' ? 'customer-message' : 'assistant-message'}>
                              <span className="timeline-dot" />
                              <div>
                                <strong>{message.sender === 'usuario'
                                  ? `Cliente · ${message.customer_name || selected.customer_name}`
                                  : 'Asistente FTTH'}</strong>
                                <p>{message.content}</p>
                              </div>
                            </article>
                          ))}
                          {!selected.conversation?.length && <div className="subsection-empty">No existe conversación asociada.</div>}
                        </div>
                      </section>

                      </div>
                      <div className="ticket-detail-column">
                      <section className="location-section">
                        <div className="subsection-heading">
                          <h3>Ubicación del domicilio</h3>
                          <span>{selected.customer_zone || 'Zona no registrada'}</span>
                        </div>
                        {selected.customer_address || selected.customer_zone ? (
                          <>
                            <div className="customer-map">
                              <iframe
                                title={`Ubicación de ${selected.customer_name}`}
                                src={`https://www.google.com/maps?q=${encodeURIComponent([selected.customer_address, selected.customer_zone, 'Bolivia'].filter(Boolean).join(', '))}&output=embed`}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                              />
                            </div>
                            <p className="customer-address"><strong>Dirección:</strong> {selected.customer_address || 'Referencia por zona'} · <strong>Zona:</strong> {selected.customer_zone || 'No registrada'}</p>
                            <a className="open-map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([selected.customer_address, selected.customer_zone, 'Bolivia'].filter(Boolean).join(', '))}`} target="_blank" rel="noreferrer">Abrir en Google Maps</a>
                          </>
                        ) : <div className="subsection-empty">El cliente todavía no registró la ubicación de su domicilio.</div>}
                      </section>

                      <section className="history-section">
                        <div className="subsection-heading">
                          <h3>Historial</h3>
                          <span>{(selected.history?.length || 0) + 1} eventos</span>
                        </div>
                        <div className="history-timeline">
                          <article>
                            <span className="timeline-dot" />
                            <div><strong>Ticket registrado</strong><p>{formatDate(selected.created_at, true)}</p></div>
                          </article>
                          {selected.history?.map((item) => (
                            <article key={item.id}>
                              <span className="timeline-dot" />
                              <div>
                                <strong>{historyLabel(item)}</strong>
                                <p>{item.action === 'ASIGNACION_TECNICO'
                                  ? item.technician_name
                                  : `Realizado por: ${item.changed_by_name || 'Usuario no disponible'}`} · {formatDate(item.created_at, true)}</p>
                                {item.action === 'CAMBIO_ESTADO' && item.previous_value && (
                                  <small>{humanize(item.previous_value)} → {humanize(item.new_value)}</small>
                                )}
                                {item.observation && <small>{item.observation}</small>}
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    </div>

                    </div>
                    <section className="ticket-action-panel">
                      <div className="action-field">
                        <label htmlFor="ticket-status">Actualizar estado</label>
                        <ResponsiveFilterSelect id="ticket-status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="ASIGNADO">Asignado</option>
                          <option value="EN_CAMINO">En camino</option>
                          <option value="EN_PROCESO">En proceso</option>
                          <option value="REPROGRAMADO">Reprogramado</option>
                          <option value="RESUELTO">Resuelto</option>
                          <option value="CERRADO">Cerrado</option>
                          <option value="CANCELADO">Cancelado</option>
                        </ResponsiveFilterSelect>
                      </div>
                      <div className="action-field technician-field">
                        <label htmlFor="ticket-technician">Técnico responsable</label>
                        <ResponsiveFilterSelect id="ticket-technician" value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
                          <option value="">Seleccionar técnico</option>
                          {technicians.map((technician) => (
                            <option key={technician.id} value={technician.id}>
                              {technician.full_name} · {technician.zone || 'sin zona'} · {technician.active_tickets}/{technician.max_active_tickets || 8}
                            </option>
                          ))}
                        </ResponsiveFilterSelect>
                      </div>
                      <div className="action-field observation-field">
                        <label htmlFor="ticket-observation">Acción realizada u observación</label>
                        <textarea
                          id="ticket-observation"
                          rows="2"
                          value={observation}
                          onChange={(event) => setObservation(event.target.value)}
                          placeholder="Describe la coordinación o acción aplicada..."
                        />
                      </div>
                      <div className="action-field schedule-field">
                        <label htmlFor="ticket-scheduled-at">Fecha de visita </label>
                        <div className="operator-desktop-schedule"><input id="ticket-scheduled-at" type="datetime-local" value={scheduledAt} min={toDateTimeInput(new Date())} onChange={(event) => setScheduledAt(event.target.value)} /></div>
                        <div className="operator-mobile-schedule"><ResponsiveDateFilter value={scheduledAt.split('T')[0] || ''} onChange={date => setScheduledAt(date ? `${date}T${scheduledAt.split('T')[1] || ''}` : '')} /><label>Hora de visita<input aria-label="Hora de visita" type="text" inputMode="numeric" placeholder="HH:mm" maxLength={5} pattern="([01][0-9]|2[0-3]):[0-5][0-9]" value={scheduledAt.split('T')[1] || ''} onChange={event => { const date = scheduledAt.split('T')[0] || ''; const digits = event.target.value.replace(/[^0-9]/g, '').slice(0, 4); const time = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits; setScheduledAt(`${date}T${time}`); }} disabled={saving} /></label></div>
                        <small>{nextStatus === 'REPROGRAMADO' ? 'Indica la nueva fecha; el motivo es obligatorio.' : ''}</small>
                      </div>
                      <div className="ticket-action-buttons">
                        <button type="button" className="assign-button" onClick={assign} disabled={saving || Boolean(selected.technician_id)} title={selected.technician_id ? 'Este ticket ya tiene un técnico responsable' : 'Asignar técnico y programar visita'}>
                          <FaUserCog /> {saving ? 'Procesando…' : selected.technician_id ? 'Técnico ya asignado' : 'Asignar técnico'}
                        </button>
                        <button type="button" className="save-button" onClick={saveStatus} disabled={saving}>
                          <FaCheckCircle /> {saving ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                      </div>
                    </section>
                  </>
                )}
          </div>}
        </section>
      </main>
      {evidencePreview && <EvidencePreviewModal evidence={evidencePreview} onClose={() => setEvidencePreview(null)} />}
      <Footer />
    </div>
  );
};

export default TicketsOperador;
