import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaChartBar, FaCheckCircle, FaClock, FaFileExcel, FaFilePdf, FaFileWord, FaTicketAlt } from 'react-icons/fa';
import { dashboardService } from '../../services/DashboardService';
import AdminHeader from '../../components/Header/AdminHeader';
import Footer from '../../components/Footer/Footer';
import entelLogo from '../../assets/logo.jpg';
import './Reportes.css';

const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const initialRange = () => { const now = new Date(); return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: isoDate(now) }; };
const quickRange = (type) => {
  const now = new Date(); const start = new Date(now);
  if (type === 'day') return { from: isoDate(now), to: isoDate(now) };
  if (type === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (type === 'month') start.setDate(1);
  if (type === 'year') start.setMonth(0, 1);
  return { from: isoDate(start), to: isoDate(now) };
};
const number = (value) => new Intl.NumberFormat('es-BO').format(value || 0);
const Change = ({ value, inverse = false }) => {
  const favorable = inverse ? value <= 0 : value >= 0;
  return <span className={`change ${favorable ? 'positive' : 'negative'}`}>{value > 0 ? '+' : ''}{value}% vs. periodo anterior</span>;
};
const Distribution = ({ title, rows }) => {
  const total = rows.reduce((sum, item) => sum + item.value, 0); const max = Math.max(...rows.map((item) => item.value), 1);
  return <section className="chart-card"><h3>{title}</h3><div className="chart-legend"><i /> Tickets <span>Total: {total}</span></div><div className="horizontal-chart">
    {rows.map((item) => <div className="chart-row" key={item.label} title={`${item.label}: ${item.value} (${total ? Math.round(item.value * 100 / total) : 0}%)`}><span>{String(item.label).replaceAll('_',' ')}</span><div><i style={{ width:`${item.value * 100 / max}%` }} /></div><strong>{item.value} · {total ? Math.round(item.value * 100 / total) : 0}%</strong></div>)}
    {!rows.length && <p>No hay información en este periodo.</p>}
  </div></section>;
};
const palette = ['#1769e0','#12abd0','#f4a621','#7652c7','#36a96b','#e34d59','#60758d'];
const StatusDonut = ({ rows }) => {
  const total=rows.reduce((sum,item)=>sum+item.value,0); let cursor=0;
  const stops=rows.map((item,index)=>{ const start=cursor; cursor+=total ? item.value*100/total : 0; return `${palette[index%palette.length]} ${start}% ${cursor}%`; }).join(',');
  return <section className="chart-card"><h3>Tickets por estado</h3><div className="donut-layout"><div className="donut" style={{background:total?`conic-gradient(${stops})`:'#e8edf5'}}><div><strong>{total}</strong><span>Total</span></div></div><div className="donut-legend">{rows.map((item,index)=><div key={item.label}><i style={{background:palette[index%palette.length]}}/><span>{String(item.label).replaceAll('_',' ')}</span><strong>{item.value} ({total?Math.round(item.value*100/total):0}%)</strong></div>)}</div></div></section>;
};
const PriorityChart = ({ rows }) => { const max=Math.max(...rows.map((item)=>item.value),1); return <section className="chart-card"><h3>Tickets por prioridad</h3><div className="priority-chart">{rows.map((item,index)=><div key={item.label}><strong>{item.value}</strong><i style={{height:`${Math.max(8,item.value*100/max)}%`,background:['#e34d59','#f4a621','#36a96b'][index%3]}}/><span>{item.label}</span></div>)}</div><div className="chart-legend"><i/> Datos reales del periodo seleccionado</div></section>; };

const Reportes = () => {
  const [range, setRange] = useState(initialRange);
  const [draft, setDraft] = useState(initialRange);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');
  const [trendMode, setTrendMode] = useState('daily');
  const [previewFormat, setPreviewFormat] = useState('');
  const load = useCallback(async (selected) => { setLoading(true); setError(''); try { setData(await dashboardService.administrativeReport(selected.from, selected.to)); setRange(selected); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); } }, []);
  useEffect(() => {
    const selected = initialRange(); let active = true;
    dashboardService.administrativeReport(selected.from, selected.to)
      .then((report) => { if (active) { setData(report); setRange(selected); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const selectQuick = (type) => { const selected = quickRange(type); setDraft(selected); load(selected); };
  const exportReport = async (format) => { setDownloading(format); setError(''); try { await dashboardService.downloadReport(format, range.from, range.to); setPreviewFormat(''); } catch (downloadError) { setError(downloadError.message); } finally { setDownloading(''); } };
  const topTechnician = useMemo(() => data?.technicians?.find((item) => item.completed > 0), [data]);
  const metrics = data?.metrics;
  return <div className="reportes-admin"><AdminHeader /><main className="reportes-content">
    <header className="reportes-header"><h1>Reportes administrativos</h1><p>Indicadores profesionales calculados en tiempo real desde PostgreSQL.</p></header>
    <section className="report-filter"><div className="quick-periods"><button onClick={() => selectQuick('day')}>Hoy</button><button onClick={() => selectQuick('week')}>Esta semana</button><button onClick={() => selectQuick('month')}>Este mes</button><button onClick={() => selectQuick('year')}>Este año</button></div><label>Desde<input type="date" value={draft.from} onChange={(e) => setDraft((v) => ({...v,from:e.target.value}))} /></label><label>Hasta<input type="date" min={draft.from} value={draft.to} onChange={(e) => setDraft((v) => ({...v,to:e.target.value}))} /></label><button className="apply-filter" disabled={!draft.from || !draft.to || draft.from > draft.to} onClick={() => load(draft)}>Aplicar rango</button></section>
    {error && <div className="operator-error">{error}</div>}
    {loading || !data ? <div className="report-card">Cargando reporte...</div> : <>
      <div className="active-range">Periodo analizado: <strong>{range.from}</strong> al <strong>{range.to}</strong></div>
      <section className="reportes-kpis">
        <article className="kpi-card"><FaTicketAlt /><h2>{number(metrics.total)}</h2><span>Tickets registrados</span><Change value={data.comparison.total} /></article>
        <article className="kpi-card"><FaCheckCircle /><h2>{number(metrics.completed)}</h2><span>Tickets terminados</span><Change value={data.comparison.completed} /></article>
        <article className="kpi-card"><FaChartBar /><h2>{metrics.resolution_rate}%</h2><span>Tasa de resolución</span><small>SLA cumplido: {metrics.sla_compliance}%</small></article>
        <article className="kpi-card"><FaClock /><h2>{metrics.average_resolution_hours} h</h2><span>Tiempo medio de resolución</span><Change value={data.comparison.resolutionHours} inverse /></article>
      </section>
      <section className="time-metrics"><div><span>Asignación promedio</span><strong>{metrics.average_assignment_hours} h</strong></div><div><span>Llegada/atención promedio</span><strong>{metrics.average_arrival_hours} h</strong></div><div><span>Tickets abiertos</span><strong>{metrics.open}</strong></div><div><span>Mejor rendimiento</span><strong>{topTechnician?.full_name || 'Sin datos'}</strong></div></section>
      <section className="export-card"><div><h2>Exportar reporte profesional</h2><p>Primero podrás revisar una vista previa del documento completo.</p></div><div className="report-buttons"><button className="btn-pdf" disabled={downloading} onClick={() => setPreviewFormat('pdf')}><FaFilePdf />PDF</button><button className="btn-word" disabled={downloading} onClick={() => setPreviewFormat('docx')}><FaFileWord />Word</button><button className="btn-excel" disabled={downloading} onClick={() => setPreviewFormat('xlsx')}><FaFileExcel />Excel</button></div></section>
      <div className="charts-grid"><StatusDonut rows={data.distributions.status}/><Distribution title="Tickets por tipo de falla" rows={data.distributions.failure}/><PriorityChart rows={data.distributions.priority}/><Distribution title="Tickets por zona" rows={data.distributions.zone}/><Distribution title="Tickets por cuadrilla" rows={data.distributions.crew}/></div>
      <section className="resumen-card"><h2>Rendimiento por técnico</h2><p>La eficiencia descuenta 10 puntos por cada visita reprogramada incumplida.</p><table><thead><tr><th>Técnico</th><th>Código</th><th>Zona / Cuadrilla</th><th>Asignados</th><th>Terminados</th><th>Incumplimientos</th><th>Eficiencia</th><th>Promedio resolución</th></tr></thead><tbody>{data.technicians.map((item) => <tr key={item.id}><td>{item.full_name}</td><td>{item.employee_code}</td><td>{item.zone} / {item.crew}</td><td>{item.assigned}</td><td>{item.completed}</td><td>{item.missed_visits || 0}</td><td>{item.efficiency}%</td><td>{item.average_resolution_hours} h</td></tr>)}</tbody></table></section>
      <section className="chart-card daily-card"><div className="trend-header"><h3>Actividad de tickets</h3><div>{[['daily','Día'],['weekly','Semana'],['monthly','Mes'],['yearly','Año']].map(([value,label])=><button className={trendMode===value?'active':''} key={value} onClick={()=>setTrendMode(value)}>{label}</button>)}</div></div><div className="daily-chart">{(data.trends?.[trendMode] || data.daily).map((item) => <div key={item.period} title={`${item.registered} registrados, ${item.completed} terminados`}><strong>{item.registered}</strong><i style={{height:`${Math.max(6,item.registered*9)}px`}}/><span>{new Date(item.period).toLocaleDateString('es-BO',trendMode==='yearly'?{year:'numeric'}:trendMode==='monthly'?{month:'short',year:'2-digit'}:{day:'2-digit',month:'2-digit'})}</span></div>)}</div><div className="chart-legend"><i/> Registrados · cada barra utiliza datos agrupados directamente en PostgreSQL</div></section>
    </>}
    {previewFormat && data && <div className="report-preview-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa del reporte"><div className="report-preview-window">
      <div className="preview-toolbar"><div><strong>Vista previa · {previewFormat==='pdf'?'PDF':previewFormat==='docx'?'Word':'Excel'}</strong><span>Así se organizarán los datos en el documento.</span></div><div><button className="preview-close" onClick={() => setPreviewFormat('')}>Cerrar</button><button className="preview-download" disabled={Boolean(downloading)} onClick={() => exportReport(previewFormat)}>{downloading?'Generando archivo...':'Confirmar descarga'}</button></div></div>
      <div className={`report-paper preview-${previewFormat}`}>
        {previewFormat === 'xlsx' ? <>
          <div className="excel-tabs"><strong>Resumen</strong><span>Por estado</span><span>Por prioridad</span><span>Por falla</span><span>Rendimiento técnicos</span><span>Detalle tickets</span></div>
          <header><img src={entelLogo} alt="ENTEL"/><div><h1>Reporte administrativo ENTEL FTTH</h1><p>Libro de análisis · {range.from} al {range.to}</p></div></header>
          <div className="excel-grid"><div className="excel-row excel-head"><span>Indicador</span><span>Resultado</span><span>Comparación anterior</span><span>Interpretación</span></div>{[
            ['Tickets registrados',metrics.total,`${data.comparison.total}%`,'Volumen del periodo'],
            ['Tickets terminados',metrics.completed,`${data.comparison.completed}%`,'Atenciones completadas'],
            ['Tasa de resolución',`${metrics.resolution_rate}%`,'—','Indicador de eficacia'],
            ['Cumplimiento SLA',`${metrics.sla_compliance}%`,'—','Atenciones dentro de 24 h'],
            ['Tiempo medio de resolución',`${metrics.average_resolution_hours} h`,`${data.comparison.resolutionHours}%`,'Duración promedio'],
          ].map((row)=><div className="excel-row" key={row[0]}>{row.map((cell)=><span key={cell}>{cell}</span>)}</div>)}</div>
          <div className="preview-format-note">El archivo Excel incluye hojas separadas, filtros, encabezados congelados, porcentajes numéricos y configuración de impresión.</div>
        </> : <>
          <header><img src={entelLogo} alt="ENTEL"/><div><small>{previewFormat==='docx'?'INFORME INSTITUCIONAL':'INFORME EJECUTIVO'}</small><h1>Reporte administrativo ENTEL FTTH</h1><p>Periodo: {range.from} al {range.to}</p></div></header>
          <h2>Resumen ejecutivo</h2><div className="preview-kpis"><div><span>Registrados</span><strong>{metrics.total}</strong></div><div><span>Terminados</span><strong>{metrics.completed}</strong></div><div><span>Resolución</span><strong>{metrics.resolution_rate}%</strong></div><div><span>SLA 24 h</span><strong>{metrics.sla_compliance}%</strong></div></div>
          {previewFormat === 'pdf' ? <div className="preview-charts"><StatusDonut rows={data.distributions.status}/><Distribution title="Tickets por tipo de falla" rows={data.distributions.failure}/><PriorityChart rows={data.distributions.priority}/><Distribution title="Tickets por zona" rows={data.distributions.zone}/></div> : <>
            <h2>Indicadores operativos</h2><table><thead><tr><th>Indicador</th><th>Resultado</th></tr></thead><tbody><tr><td>Tiempo medio de asignación</td><td>{metrics.average_assignment_hours} h</td></tr><tr><td>Tiempo medio de llegada</td><td>{metrics.average_arrival_hours} h</td></tr><tr><td>Tiempo medio de resolución</td><td>{metrics.average_resolution_hours} h</td></tr></tbody></table>
            <h2>Rendimiento por técnico</h2><table><thead><tr><th>Técnico</th><th>Asignados</th><th>Terminados</th><th>Incumplimientos</th><th>Eficiencia</th></tr></thead><tbody>{data.technicians.map(t=><tr key={t.id}><td>{t.full_name}</td><td>{t.assigned}</td><td>{t.completed}</td><td>{t.missed_visits || 0}</td><td>{t.efficiency}%</td></tr>)}</tbody></table>
          </>}
          <footer>Sistema Inteligente de Reclamos FTTH · Documento institucional · Página 1</footer>
        </>}
      </div>
    </div></div>}
  </main><Footer /></div>;
};
export default Reportes;
