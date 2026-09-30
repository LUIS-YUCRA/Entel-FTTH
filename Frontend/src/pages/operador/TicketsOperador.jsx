import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaCalendarAlt,
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
  ? `Técnico: ${humanize(item.new_value)}`
  : actionLabel(item.action, item.new_value);

const TicketsOperador = () => {
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
  const [loadingDetails, setLoadingDetails] = useState(false);
  const selectedRef = useRef(null);
  const isAdmin = user?.user_type === 'administrador';

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const openTicket = async (ticket) => {
    setSelected(ticket);
    setTechnicianId(ticket.technician_id || '');
    setNextStatus(ticket.status || 'EN_PROCESO');
    setScheduledAt(toDateTimeInput(ticket.scheduled_at));
    setLoadingDetails(true);
    setError('');
    try {
      const data = await ticketService.get(ticket.id);
      setSelected(data.ticket);
      setTechnicianId(data.ticket.technician_id || '');
      setNextStatus(data.ticket.status || 'EN_PROCESO');
      setScheduledAt(toDateTimeInput(data.ticket.scheduled_at));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingDetails(false);
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
        if (ticketData.tickets[0]) openTicket(ticketData.tickets[0]);
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
          const detail = await ticketService.get(selectedRef.current.id);
          setSelected(detail.ticket);
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

  const active = tickets.filter((ticket) => !['CERRADO', 'CANCELADO'].includes(ticket.status));
  const resolvedToday = tickets.filter((ticket) => (
    ticket.resolved_at
    && new Date(ticket.resolved_at).toDateString() === new Date().toDateString()
  ));

  const mergeTicket = (updated) => {
    setTickets((current) => current.map((item) => (
      item.id === updated.id ? { ...item, ...updated } : item
    )));
    setSelected((current) => ({ ...current, ...updated }));
  };

  const assign = async () => {
    if (!selected || !technicianId) {
      setError('Selecciona un técnico responsable.');
      return;
    }
    if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) {
      setError('Selecciona una fecha y hora futura para la visita técnica.');
      return;
    }
    setSaving(true);
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
      await openTicket({ ...selected, ...data.ticket });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!selected) return;
    if (nextStatus === 'REPROGRAMADO' && (!observation.trim() || !scheduledAt || new Date(scheduledAt).getTime() <= Date.now())) {
      setError('Para reprogramar indica el motivo y una nueva fecha y hora futura.');
      return;
    }
    if (['CERRADO', 'CANCELADO'].includes(nextStatus)) {
      if (!observation.trim()) {
        setError(`Describe el motivo antes de marcar el ticket como ${humanize(nextStatus).toLowerCase()}.`);
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
      await openTicket({ ...selected, ...data.ticket });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tickets-operador">
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
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="ASIGNADO">Asignado</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="RESUELTO">Resuelto</option>
            <option value="CERRADO">Cerrado</option>
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
            <option value="">Todas las prioridades</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>
          <select value={technicianFilter} onChange={(event) => setTechnicianFilter(event.target.value)}>
            <option value="">Todos los técnicos</option>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>{technician.full_name}</option>
            ))}
          </select>
          <button
            type="button"
            className="clear-filters"
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setPriorityFilter('');
              setTechnicianFilter('');
            }}
          >
            Limpiar
          </button>
        </section>

        <section className="ticket-control-layout">
          <div className="ticket-queue">
            <div className="queue-heading">
              <div>
                <h2>Cola de atención</h2>
                <span>{filtered.length} de {tickets.length} tickets</span>
              </div>
              <FaTicketAlt />
            </div>
            <div className="ticket-list">
              {filtered.map((ticket) => (
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
          </div>

          <div className="ticket-detail-panel">
            {!selected ? (
              <div className="detail-empty">
                <FaTicketAlt />
                <h2>Selecciona un ticket</h2>
                <p>Aquí verás el diagnóstico, evidencias, historial y acciones disponibles.</p>
              </div>
            ) : (
              <>
                <div className="detail-heading">
                  <div>
                    <p>Detalle del ticket</p>
                    <h2>{selected.ticket_code}</h2>
                  </div>
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
                      <section className="evidence-section">
                        <div className="subsection-heading">
                          <h3>Evidencias</h3>
                          <span>{selected.evidences?.length || 0} archivos</span>
                        </div>
                        <div className="evidence-grid">
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
                          <h3>Conversación del diagnóstico</h3>
                          <span>{selected.conversation?.length || 0} mensajes</span>
                        </div>
                        <div className="history-timeline">
                          {selected.conversation?.map((message) => (
                            <article key={message.id}>
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
                                  : item.changed_by_name} · {formatDate(item.created_at, true)}</p>
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

                    <section className="ticket-action-panel">
                      <div className="action-field">
                        <label htmlFor="ticket-status">Actualizar estado</label>
                        <select id="ticket-status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="ASIGNADO">Asignado</option>
                          <option value="EN_CAMINO">En camino</option>
                          <option value="EN_PROCESO">En proceso</option>
                          <option value="REPROGRAMADO">Reprogramado</option>
                          <option value="RESUELTO">Resuelto</option>
                          <option value="CERRADO">Cerrado</option>
                          <option value="CANCELADO">Cancelado</option>
                        </select>
                      </div>
                      <div className="action-field technician-field">
                        <label htmlFor="ticket-technician">Técnico responsable</label>
                        <select id="ticket-technician" value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
                          <option value="">Seleccionar técnico</option>
                          {technicians.map((technician) => (
                            <option key={technician.id} value={technician.id}>
                              {technician.full_name} · {technician.zone || 'sin zona'} · {technician.active_tickets}/{technician.max_active_tickets || 8}
                            </option>
                          ))}
                        </select>
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
                        <label htmlFor="ticket-scheduled-at">Fecha y hora de visita</label>
                        <input id="ticket-scheduled-at" type="datetime-local" value={scheduledAt} min={toDateTimeInput(new Date())} onChange={(event) => setScheduledAt(event.target.value)} />
                        <small>{nextStatus === 'REPROGRAMADO' ? 'Indica la nueva fecha; el motivo es obligatorio.' : 'Se enviará al cliente al asignar el técnico.'}</small>
                      </div>
                      <div className="ticket-action-buttons">
                        <button type="button" className="assign-button" onClick={assign} disabled={saving || !technicianId}>
                          <FaUserCog /> Asignar técnico
                        </button>
                        <button type="button" className="save-button" onClick={saveStatus} disabled={saving}>
                          <FaCheckCircle /> {saving ? 'Guardando...' : 'Guardar estado'}
                        </button>
                      </div>
                    </section>
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      {evidencePreview && <EvidencePreviewModal evidence={evidencePreview} onClose={() => setEvidencePreview(null)} />}
      <Footer />
    </div>
  );
};

export default TicketsOperador;
