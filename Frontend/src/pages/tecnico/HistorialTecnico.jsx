import { useEffect, useMemo, useState } from 'react';
import { FaFileExcel, FaFilePdf, FaFileWord, FaTimes } from 'react-icons/fa';
import { ticketService } from '../../services/TicketService';
import TecnicoHeader from '../../components/Header/TecnicoHeader';
import Footer from '../../components/Footer/Footer';
import { useAuth } from '../../context/AuthContext';
import entelLogo from '../../assets/logo.jpg';
import {
  completedTicketsForPeriod, dateRange, historyRows, periodLabel, reportRange,
} from '../../utils/technicianHistoryExport';
import './HistorialTecnico.css';

const formatDateTime = (value) => (value ? new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'short', timeStyle: 'short',
}).format(new Date(value)) : 'No registrada');
const durationText = (value) => (Number.isFinite(value) ? `${value} h` : 'No calculable');

const HistorialTecnico = () => {
  const [tickets, setTickets] = useState([]);
  const [period, setPeriod] = useState('all');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');
  const [previewFormat, setPreviewFormat] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const { user } = useAuth();

  useEffect(() => {
    ticketService.list()
      .then((data) => setTickets(data.tickets))
      .catch((requestError) => setError(requestError.message));
  }, []);
  useEffect(() => {
    if (!previewFormat) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setPreviewFormat(''); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [previewFormat]);

  const filtered = useMemo(() => {
    if (period === 'all') return tickets;
    const selectedRange = dateRange(period, new Date(), range);
    if (!selectedRange) return [];
    return tickets.filter((item) => {
      const ticketDate = new Date(item.assigned_at || item.created_at);
      return ticketDate >= selectedRange.start && ticketDate <= selectedRange.end;
    });
  }, [tickets, period, range]);

  const completed = useMemo(
    () => completedTicketsForPeriod(tickets, period, new Date(), range),
    [tickets, period, range],
  );
  const previewRows = useMemo(() => historyRows(completed), [completed]);
  const selectedRange = useMemo(() => reportRange(period, new Date(), range), [period, range]);
  const averageDuration = useMemo(() => {
    const durations = previewRows.map((row) => row.duration).filter(Number.isFinite);
    return durations.length
      ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 100) / 100
      : 0;
  }, [previewRows]);
  const metrics = {
    completed: previewRows.length,
    customers: new Set(previewRows.map((row) => row.customer_name)).size,
    highPriority: previewRows.filter((row) => row.priority === 'ALTA').length,
    averageDuration,
  };
  const validSelection = Boolean(selectedRange && completed.length);

  const openPreview = (format) => {
    setError('');
    if (!selectedRange) {
      setError('Selecciona un periodo o completa las fechas Desde y Hasta.');
      return;
    }
    if (!completed.length) {
      setError('No existen trabajos finalizados en el periodo seleccionado.');
      return;
    }
    setPreviewFormat(format);
  };
  const handleDownload = async () => {
    if (!previewFormat || !selectedRange) return;
    setError('');
    setExporting(previewFormat);
    try {
      await ticketService.downloadHistory(previewFormat, selectedRange.from, selectedRange.to);
      setPreviewFormat('');
    } catch (exportError) {
      setError(exportError.message);
    } finally {
      setExporting('');
    }
  };

  const formatName = previewFormat === 'pdf' ? 'PDF' : previewFormat === 'docx' ? 'Word' : 'Excel';
  return (
    <div className="historial-page">
      <TecnicoHeader />
      <main className="historial-content">
        <header className="history-heading"><span>OPERACIONES FTTH</span><h1>Historial de trabajos</h1><p>Consulta tus atenciones y genera documentos institucionales con datos reales del sistema.</p></header>
        <section className="history-filter" aria-label="Filtro del historial">
          <div className="history-period-select"><label htmlFor="history-period">Periodo</label><select id="history-period" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">Todo el historial</option><option value="day">Hoy</option><option value="week">Esta semana</option><option value="month">Este mes</option><option value="custom">Rango de fechas</option></select></div>
          <div className="history-date-range"><label htmlFor="history-from">Desde<input id="history-from" type="date" value={range.from} onChange={(event) => { setRange((current) => ({ ...current, from: event.target.value })); setPeriod('custom'); }} /></label><label htmlFor="history-to">Hasta<input id="history-to" type="date" value={range.to} min={range.from || undefined} onChange={(event) => { setRange((current) => ({ ...current, to: event.target.value })); setPeriod('custom'); }} /></label></div>
          <span className="history-record-count"><strong>{filtered.length}</strong> registros encontrados</span>
        </section>
        <section className="history-export">
          <div><span className="history-export-eyebrow">DOCUMENTACIÓN</span><strong>Descargar trabajos finalizados</strong><small>{period === 'all' ? 'Elige un periodo para preparar el documento.' : `${completed.length} trabajos terminados · ${periodLabel(period, range)}`}</small></div>
          <div className="history-export-buttons">
            <button className="export-pdf" type="button" disabled={!validSelection || Boolean(exporting)} onClick={() => openPreview('pdf')}><FaFilePdf /><span>Vista previa PDF</span></button>
            <button className="export-word" type="button" disabled={!validSelection || Boolean(exporting)} onClick={() => openPreview('docx')}><FaFileWord /><span>Vista previa Word</span></button>
            <button className="export-excel" type="button" disabled={!validSelection || Boolean(exporting)} onClick={() => openPreview('xlsx')}><FaFileExcel /><span>Vista previa Excel</span></button>
          </div>
        </section>
        {error && <div className="history-error" role="alert">{error}</div>}
        <section className="history-table-card"><div className="history-table-title"><div><h2>Registro operativo</h2><p>Asignaciones y cambios de estado registrados en PostgreSQL.</p></div><span>{filtered.length} tickets</span></div><div className="history-table-wrap"><table><thead><tr><th>Ticket</th><th>Cliente</th><th>Estado</th><th>Detalle</th><th>Fecha de asignación</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><strong className="history-ticket-code">{item.ticket_code}</strong></td><td>{item.customer_name}</td><td><span className={`history-status history-status-${String(item.status).toLowerCase()}`}>{String(item.status).replaceAll('_', ' ')}</span></td><td>{item.title}</td><td>{formatDateTime(item.assigned_at || item.created_at)}</td></tr>)}{!filtered.length && <tr><td className="history-empty" colSpan="5">No existen registros para el periodo seleccionado.</td></tr>}</tbody></table></div></section>

        {previewFormat && <div className="history-preview-backdrop" role="dialog" aria-modal="true" aria-label={`Vista previa del historial en ${formatName}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewFormat(''); }}><div className="history-preview-window">
          <div className="history-preview-toolbar"><div><strong>Vista previa · {formatName}</strong><span>La descarga conservará esta organización con formato nativo.</span></div><div><button className="history-preview-close" type="button" disabled={Boolean(exporting)} onClick={() => setPreviewFormat('')}><FaTimes /> Cerrar</button><button className="history-preview-download" type="button" disabled={Boolean(exporting)} onClick={handleDownload}>{exporting ? 'Generando archivo...' : 'Confirmar descarga'}</button></div></div>
          <div className={`history-report-paper history-preview-${previewFormat}`}>
            {previewFormat === 'xlsx' && <div className="history-excel-tabs"><strong>Resumen ejecutivo</strong><span>Trabajos finalizados</span><span>Soluciones registradas</span></div>}
            <header><img src={entelLogo} alt="ENTEL" /><div><small>{previewFormat === 'xlsx' ? 'LIBRO DE CONTROL OPERATIVO' : 'INFORME INSTITUCIONAL'}</small><h1>Historial de trabajos finalizados</h1><p>ENTEL Bolivia · Periodo {selectedRange.from} al {selectedRange.to}</p></div></header>
            <section className="history-report-technician"><strong>{user?.full_name}</strong><span>{user?.employee_code || 'Código no registrado'} · {user?.specialty || 'FTTH general'} · {user?.technician_zone || 'Zona no registrada'}</span></section>
            <section className="history-preview-kpis"><div><span>Finalizados</span><strong>{metrics.completed}</strong></div><div><span>Clientes atendidos</span><strong>{metrics.customers}</strong></div><div><span>Prioridad alta</span><strong>{metrics.highPriority}</strong></div><div><span>Promedio resolución</span><strong>{metrics.averageDuration} h</strong></div></section>
            <h2>Detalle de trabajos finalizados</h2>
            <div className="history-preview-table"><table><thead><tr><th>Ticket</th><th>Cliente</th><th>Trabajo</th><th>Prioridad</th><th>Finalización</th><th>Duración</th><th>Solución aplicada</th></tr></thead><tbody>{previewRows.slice(0, 6).map((row) => <tr key={row.id}><td>{row.ticket_code}</td><td>{row.customer_name}</td><td>{row.title}</td><td>{row.priority}</td><td>{formatDateTime(row.completedAt)}</td><td>{durationText(row.duration)}</td><td>{row.solutionLabel}</td></tr>)}</tbody></table></div>
            {previewRows.length > 6 && <p className="history-preview-more">La descarga incluirá también los {previewRows.length - 6} trabajos restantes del periodo.</p>}
            <footer>Sistema Inteligente de Reclamos FTTH · Documento institucional · Página 1</footer>
          </div>
        </div></div>}
      </main>
      <Footer />
    </div>
  );
};

export default HistorialTecnico;
