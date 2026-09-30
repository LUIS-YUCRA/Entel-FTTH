import { useEffect, useMemo, useState } from 'react';
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardList,
  FaExclamationTriangle,
  FaEye,
  FaFilter,
  FaMapMarkerAlt,
  FaRoute,
  FaSearch,
  FaSpinner,
  FaTimes,
} from 'react-icons/fa';
import { ticketService } from '../../services/TicketService';
import TecnicoHeader from '../../components/Header/TecnicoHeader';
import Footer from '../../components/Footer/Footer';
import { EvidencePreviewModal, EvidenceThumbnail } from '../../components/EvidenceViewer/EvidenceViewer';
import './MisTickets.css';
import FeedbackDialog from '../../components/FeedbackDialog';

const PAGE_SIZE = 6;

const formatDate = (value, withTime = false) => {
  if (!value) return 'No programada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No programada';
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
};

const dateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const statusLabel = (status = '') => status.replaceAll('_', ' ');

const StatCard = ({ className, icon: Icon, label, value }) => (
  <article className={`technician-stat-card ${className}`}>
    <span className="technician-stat-icon"><Icon aria-hidden="true" /></span>
    <div><span>{label}</span><strong>{value}</strong></div>
  </article>
);

const MisTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState(null);
  const [notice, setNotice] = useState('');
  const [solution, setSolution] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [evidencePreview, setEvidencePreview] = useState(null);

  const openTicket = async (ticket) => {
    setSelected(ticket);
    setLoadingDetail(true);
    setError('');
    try {
      const data = await ticketService.get(ticket.id);
      setSelected(data.ticket);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    ticketService.list()
      .then((data) => {
        setTickets(data.tickets);
        if (data.tickets[0]) openTicket(data.tickets[0]);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));

    const interval = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const data = await ticketService.list();
        setTickets(data.tickets);
        setSelected((current) => {
          const refreshed = data.tickets.find((ticket) => ticket.id === current?.id);
          if (current && refreshed) return { ...current, ...refreshed };
          return refreshed || data.tickets[0] || null;
        });
      } catch { /* actualización silenciosa */ }
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const updateStatus = async (ticket, status) => {
    if (status === 'RESUELTO' && !solution.trim()) {
      setError('Registra la solución aplicada antes de marcar el ticket como resuelto.');
      return;
    }
    if (status === 'REPROGRAMADO' && (!scheduledAt || new Date(scheduledAt) <= new Date())) {
      setError('Indica una fecha y hora futuras para reprogramar la atención.');
      return;
    }
    setUpdating(ticket.id);
    try {
      const data = await ticketService.updateStatus(ticket.id, status, undefined, {
        solution: solution.trim() || undefined,
        scheduledAt: status === 'REPROGRAMADO' ? new Date(scheduledAt).toISOString() : undefined,
      });
      setTickets((current) => current.map((item) => (
        item.id === ticket.id ? { ...item, ...data.ticket } : item
      )));
      setSelected((current) => ({ ...current, ...data.ticket }));
      setAction(null);
      setNotice(status === 'REPROGRAMADO' ? 'Reprogramación aplicada.' : status === 'RESUELTO' ? 'Ticket finalizado: solución registrada y estado Resuelto.' : `Estado actualizado: ${statusLabel(status)}.`);
      setSolution('');
      setScheduledAt('');
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdating(null);
    }
  };

  const zones = useMemo(() => [...new Set(
    tickets.map((ticket) => ticket.customer_zone).filter(Boolean),
  )].sort((first, second) => first.localeCompare(second)), [tickets]);

  const filtered = useMemo(() => tickets.filter((ticket) => {
    const query = search.trim().toLowerCase();
    const scheduledDate = dateInputValue(ticket.scheduled_at || ticket.created_at);
    return (!statusFilter || ticket.status === statusFilter)
      && (!priorityFilter || ticket.priority === priorityFilter)
      && (!zoneFilter || ticket.customer_zone === zoneFilter)
      && (!dateFilter || scheduledDate === dateFilter)
      && (!query
        || String(ticket.ticket_code || '').toLowerCase().includes(query)
        || String(ticket.customer_name || '').toLowerCase().includes(query)
        || String(ticket.title || '').toLowerCase().includes(query));
  }), [tickets, search, statusFilter, priorityFilter, dateFilter, zoneFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleTickets = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const completed = tickets.filter((item) => ['RESUELTO', 'CERRADO'].includes(item.status)).length;
  const mapQuery = [selected?.customer_address, selected?.customer_zone].filter(Boolean).join(', ');

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setDateFilter('');
    setZoneFilter('');
    setPage(1);
  };

  return (
    <div className="mis-tickets-page">
      <TecnicoHeader />
      <main className="mis-tickets-content">
        <header className="technician-page-heading">
          <div><span>Operaciones de campo</span><h1>Mis tareas asignadas</h1><p>Consulta tus servicios programados y registra el avance de cada atención.</p></div>
          <span className="technician-online"><i /> Técnico FTTH</span>
        </header>

        {notice && <FeedbackDialog title="Atención actualizada" onClose={() => setNotice('')}><p>{notice}</p></FeedbackDialog>}

        <section className="technician-stats" aria-label="Resumen de tareas">
          <StatCard className="assigned" icon={FaClipboardList} label="Asignadas" value={tickets.length} />
          <StatCard className="high" icon={FaExclamationTriangle} label="Alta prioridad" value={tickets.filter((item) => item.priority === 'ALTA').length} />
          <StatCard className="progress" icon={FaSpinner} label="En proceso" value={tickets.filter((item) => item.status === 'EN_PROCESO').length} />
          <StatCard className="completed" icon={FaCheckCircle} label="Completadas" value={completed} />
        </section>

        <section className="technician-filter-panel" aria-label="Filtros de tareas">
          <label className="technician-search"><span>Buscar</span><div><FaSearch /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Ticket, cliente o falla" /></div></label>
          <label><span>Estado</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="">Todos</option><option value="ASIGNADO">Asignado</option><option value="EN_CAMINO">En camino</option><option value="EN_PROCESO">En proceso</option><option value="REPROGRAMADO">Reprogramado</option><option value="INCUMPLIMIENTO_VISITA">Incumplimiento de visita</option><option value="RESUELTO">Resuelto</option><option value="CERRADO">Cerrado</option></select></label>
          <label><span>Prioridad</span><select value={priorityFilter} onChange={(event) => { setPriorityFilter(event.target.value); setPage(1); }}><option value="">Todas</option><option value="ALTA">Alta</option><option value="MEDIA">Media</option><option value="BAJA">Baja</option></select></label>
          <label><span>Fecha</span><div className="technician-date"><FaCalendarAlt /><input aria-label="Fecha" type="date" value={dateFilter} onChange={(event) => { setDateFilter(event.target.value); setPage(1); }} /></div></label>
          <label><span>Zona</span><select value={zoneFilter} onChange={(event) => { setZoneFilter(event.target.value); setPage(1); }}><option value="">Todas</option>{zones.map((zone) => <option value={zone} key={zone}>{zone}</option>)}</select></label>
          <button type="button" className="technician-filter-button" onClick={() => setPage(1)}><FaFilter /> Filtrar</button>
          <button type="button" className="technician-clear-button" onClick={clearFilters}>Limpiar</button>
        </section>

        <div className="technician-workspace">
          <section className="technician-table-card" aria-label="Listado de tareas">
            <div className="technician-table-scroll">
              <table>
                <thead><tr><th>Ticket</th><th>Cliente</th><th>Tipo de falla</th><th>Prioridad</th><th>Programada</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>
                  {visibleTickets.map((ticket) => (
                    <tr className={selected?.id === ticket.id ? 'selected' : ''} key={ticket.id}>
                      <td><button type="button" className="ticket-code-button" onClick={() => openTicket(ticket)}>{ticket.ticket_code}</button></td>
                      <td><strong>{ticket.customer_name}</strong><small>{ticket.customer_zone || 'Zona no registrada'}</small></td>
                      <td>{ticket.title}</td>
                      <td><span className={`technician-priority priority-${String(ticket.priority || 'MEDIA').toLowerCase()}`}>{ticket.priority}</span></td>
                      <td>{formatDate(ticket.scheduled_at || ticket.created_at)}</td>
                      <td><span className={`technician-status status-${String(ticket.status || '').toLowerCase()}`}>{statusLabel(ticket.status)}</span></td>
                      <td><button type="button" className="technician-view-button" onClick={() => openTicket(ticket)} aria-label={`Ver detalle de ${ticket.ticket_code}`}><FaEye /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loading && <div className="technician-empty"><FaSpinner className="spin" /> Cargando tareas...</div>}
            {!loading && !filtered.length && <div className="technician-empty"><FaClipboardList /><strong>No existen tareas con esos filtros</strong><span>Prueba limpiando o cambiando los criterios de búsqueda.</span></div>}

            {!loading && filtered.length > 0 && <footer className="technician-table-footer">
              <span>Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} tareas</span>
              <nav aria-label="Paginación de tareas">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} aria-label="Página anterior"><FaChevronLeft /></button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <button type="button" className={number === page ? 'active' : ''} onClick={() => setPage(number)} key={number}>{number}</button>)}
                <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} aria-label="Página siguiente"><FaChevronRight /></button>
              </nav>
            </footer>}
          </section>

          <aside className="technician-detail-card">
            {selected ? <>
              <header><div><span>Detalle de tarea</span><h2>{selected.ticket_code}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Cerrar detalle"><FaTimes /></button></header>
              {loadingDetail && <p className="technician-detail-loading"><FaSpinner className="spin" /> Actualizando información...</p>}

              <dl className="technician-ticket-data">
                <div><dt>Cliente</dt><dd>{selected.customer_name}</dd></div>
                <div><dt>Zona</dt><dd>{selected.customer_zone || 'No registrada'}</dd></div>
                <div className="full"><dt>Dirección</dt><dd>{selected.customer_address || 'No registrada'}</dd></div>
                <div><dt>Prioridad</dt><dd><span className={`technician-priority priority-${String(selected.priority || 'MEDIA').toLowerCase()}`}>{selected.priority}</span></dd></div>
                <div><dt>Estado</dt><dd><span className={`technician-status status-${String(selected.status || '').toLowerCase()}`}>{statusLabel(selected.status)}</span></dd></div>
                <div className="full"><dt>Tipo de falla</dt><dd>{selected.title}</dd></div>
                <div className="full"><dt>Visita programada</dt><dd>{formatDate(selected.scheduled_at || selected.assigned_at, true)}</dd></div>
                {!!selected.missed_visit_count && <div className="full"><dt>Incumplimientos registrados</dt><dd>{selected.missed_visit_count} · penalización de {selected.missed_visit_count * 10} puntos en eficiencia</dd></div>}
              </dl>

              <section className="technician-description"><strong>Descripción del cliente</strong><p>{selected.description || 'Sin descripción registrada.'}</p>{selected.priority_reason && <small><FaExclamationTriangle /> {selected.priority_reason}</small>}</section>

              <section className="technician-location">
                <h3><FaMapMarkerAlt /> Ubicación</h3>
                {mapQuery ? <iframe title={`Ubicación de ${selected.customer_name}`} src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="technician-map-empty"><FaMapMarkerAlt /><span>El cliente no registró una ubicación.</span></div>}
              </section>

              <section className="technician-evidences">
                <h3>Evidencias <span>{selected.evidences?.length || 0}</span></h3>
                <div className="technician-evidence-grid">
                  {selected.evidences?.map((evidence) => (
                    <article className="technician-evidence-card" key={evidence.id}>
                      <EvidenceThumbnail evidence={evidence} />
                      <div><strong>{evidence.original_name}</strong><small>{Math.ceil(Number(evidence.size_bytes) / 1024)} KB</small></div>
                      <button type="button" onClick={() => setEvidencePreview(evidence)}>Abrir evidencia</button>
                    </article>
                  ))}
                </div>
                {!selected.evidences?.length && <p className="technician-no-evidence">No se adjuntaron evidencias.</p>}
              </section>

              <section className="technician-update-form">
                <h3>Actualizar atención</h3>
                <div className="technician-actions">
                  <button disabled={!!updating || !['ASIGNADO','REPROGRAMADO','INCUMPLIMIENTO_VISITA'].includes(selected.status)} onClick={() => updateStatus(selected, 'EN_CAMINO')}><FaRoute /> En camino</button>
                  <button disabled={!!updating || selected.status !== 'EN_CAMINO'} onClick={() => updateStatus(selected, 'EN_PROCESO')}><FaSpinner /> Iniciar atención</button>
                  <button className="warning" disabled={!!updating || !['ASIGNADO','EN_CAMINO','EN_PROCESO','INCUMPLIMIENTO_VISITA'].includes(selected.status)} onClick={() => {setScheduledAt('');setAction({ticket:selected,status:'REPROGRAMADO'});}}><FaCalendarAlt /> Reprogramar</button>
                  <button className="success" disabled={!!updating || selected.status !== 'EN_PROCESO'} onClick={() => {setSolution('');setAction({ticket:selected,status:'RESUELTO'});}}><FaCheckCircle /> Marcar resuelto</button>
                </div>
              </section>
            </> : <div className="technician-detail-empty"><FaEye /><strong>Selecciona una tarea</strong><span>Usa el botón de la tabla para consultar y actualizar todos sus datos.</span></div>}
          </aside>
        </div>
      </main>
      {evidencePreview && <EvidencePreviewModal evidence={evidencePreview} onClose={() => setEvidencePreview(null)} />}
      {action && <FeedbackDialog title={`${action.ticket.ticket_code} · ${action.status === 'REPROGRAMADO' ? 'Reprogramar visita' : 'Finalizar atención'}`} onClose={() => {if (!updating) setAction(null);}}>
        <form onSubmit={(event) => {event.preventDefault();updateStatus(action.ticket, action.status);}}>
          {action.status === 'REPROGRAMADO'
            ? <label>Nueva fecha y hora<input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>
            : <label>Solución del servicio<textarea required value={solution} onChange={(event) => setSolution(event.target.value)} placeholder="Describe el trabajo realizado y cómo verificaste el servicio." /></label>}
          <button disabled={!!updating} type="submit">{updating ? 'Guardando…' : action.status === 'REPROGRAMADO' ? 'Reprogramar' : 'Marcar resuelto'}</button>
        </form>
      </FeedbackDialog>}
      {error && <FeedbackDialog title="No se pudo completar la acción" onClose={() => setError('')}><p>{error}</p></FeedbackDialog>}
      <Footer />
    </div>
  );
};

export default MisTickets;
