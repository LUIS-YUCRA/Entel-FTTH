const { query } = require('../config/db');
const Ticket = require('../models/Ticket');

const parseRange = (from, to) => {
  const today = new Date();
  const defaultTo = today.toISOString().slice(0, 10);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const fromText = from || monthStart;
  const toText = to || defaultTo;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromText) || !/^\d{4}-\d{2}-\d{2}$/.test(toText)) throw Object.assign(new Error('Las fechas deben usar el formato AAAA-MM-DD.'), { status: 400 });
  const start = new Date(`${fromText}T00:00:00.000Z`);
  const inclusiveEnd = new Date(`${toText}T00:00:00.000Z`);
  if (start > inclusiveEnd) throw Object.assign(new Error('La fecha Desde no puede ser posterior a Hasta.'), { status: 400 });
  const end = new Date(inclusiveEnd); end.setUTCDate(end.getUTCDate() + 1);
  const duration = end - start;
  return { from: fromText, to: toText, start, end, previousStart: new Date(start - duration), previousEnd: start };
};

const pctChange = (current, previous) => previous ? Math.round(((current - previous) / previous) * 1000) / 10 : (current ? 100 : 0);

const getAdministrativeReport = async (from, to) => {
  await Ticket.markOverdueReprogrammedVisits();
  const range = parseRange(from, to);
  const params = [range.start.toISOString(), range.end.toISOString()];
  const metricSql = `SELECT COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE status IN ('RESUELTO','CERRADO'))::int AS completed,
    COUNT(*) FILTER (WHERE status NOT IN ('RESUELTO','CERRADO','CANCELADO'))::int AS open,
    COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (assigned_at-created_at))/3600) FILTER (WHERE assigned_at IS NOT NULL)::numeric,2),0)::float AS average_assignment_hours,
    COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at-created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL)::numeric,2),0)::float AS average_resolution_hours,
    COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at-created_at <= INTERVAL '24 hours')::int AS within_sla
    FROM support_tickets WHERE created_at >= $1 AND created_at < $2`;
  const groupQuery = (column, joins = '', excludeMissing = false) => query(`SELECT COALESCE(NULLIF(TRIM(${column}),''),'No registrado') AS label, COUNT(*)::int AS value FROM support_tickets t ${joins} WHERE t.created_at >= $1 AND t.created_at < $2 ${excludeMissing ? `AND NULLIF(TRIM(${column}),'') IS NOT NULL` : ''} GROUP BY 1 ORDER BY value DESC, label`, params);
  const canonicalFailure = `CASE
    WHEN t.diagnosis_code IN ('SIN_INTERNET','NO_INTERNET_AFTER_RESTART') THEN 'Sin internet'
    WHEN t.diagnosis_code IN ('INTERNET_LENTO','WIRED_SLOWNESS') THEN 'Internet lento'
    WHEN t.diagnosis_code IN ('PROBLEMA_CONEXION') THEN 'Problema de conexión'
    WHEN t.diagnosis_code IN ('ROUTER_DANADO','ROUTER_POWER_FAILURE') THEN 'Router dañado'
    WHEN t.diagnosis_code IN ('CAMBIO_EQUIPO','ROUTER_RESTARTING') THEN 'Cambio de equipo'
    WHEN t.diagnosis_code IN ('PERDIDA_SENAL_OPTICA','FIBER_CABLE_DAMAGED','LOSS_SIGNAL') THEN 'Pérdida de señal óptica'
    WHEN t.diagnosis_code = 'WIFI_COBERTURA' THEN 'Problema de cobertura WiFi'
    ELSE 'Falla FTTH general' END`;
  const trendQuery = (unit) => query(`SELECT date_trunc('${unit}',created_at) AS period, COUNT(*)::int AS registered, COUNT(*) FILTER (WHERE status IN ('RESUELTO','CERRADO'))::int AS completed FROM support_tickets WHERE created_at >= $1 AND created_at < $2 GROUP BY 1 ORDER BY 1`, params);
  const [metrics, previous, status, priority, failure, zone, crew, daily, weekly, monthly, yearly, technicians, tickets, arrival] = await Promise.all([
    query(metricSql, params),
    query(metricSql, [range.previousStart.toISOString(), range.previousEnd.toISOString()]),
    groupQuery('t.status'), groupQuery('t.priority'), groupQuery(canonicalFailure),
    groupQuery('COALESCE(tp_zone.zone,c.zone)', 'LEFT JOIN customers c ON c.user_id=t.customer_id LEFT JOIN technician_profiles tp_zone ON tp_zone.user_id=t.technician_id', true),
    groupQuery('tp.crew', 'LEFT JOIN technician_profiles tp ON tp.user_id=t.technician_id', true),
    trendQuery('day'), trendQuery('week'), trendQuery('month'), trendQuery('year'),
    query(`SELECT u.id,u.full_name,COALESCE(tp.employee_code,'No registrado') AS employee_code,COALESCE(tp.zone,'No registrada') AS zone,COALESCE(tp.crew,'No registrada') AS crew,
      COUNT(t.id)::int AS assigned,COUNT(t.id) FILTER(WHERE t.status IN('RESUELTO','CERRADO'))::int AS completed,
      COALESCE(SUM(t.missed_visit_count),0)::int AS missed_visits,
      CASE WHEN COUNT(t.id)=0 THEN 0 ELSE GREATEST(0,
        ROUND(COUNT(t.id) FILTER(WHERE t.status IN('RESUELTO','CERRADO'))*100.0/COUNT(t.id))::int
        - COALESCE(SUM(t.missed_visit_count),0)::int * 10) END AS efficiency,
      COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM(t.resolved_at-t.assigned_at))/3600) FILTER(WHERE t.resolved_at IS NOT NULL AND t.assigned_at IS NOT NULL)::numeric,2),0)::float AS average_resolution_hours
      FROM users u LEFT JOIN technician_profiles tp ON tp.user_id=u.id LEFT JOIN support_tickets t ON t.technician_id=u.id AND t.created_at >= $1 AND t.created_at < $2 WHERE u.user_type='tecnico' GROUP BY u.id,tp.employee_code,tp.zone,tp.crew ORDER BY completed DESC,efficiency DESC,u.full_name`, params),
    query(`SELECT t.ticket_code,c.full_name AS customer,t.title,t.status,t.priority,COALESCE(tc.full_name,'Sin asignar') AS technician,t.created_at,t.assigned_at,t.resolved_at,COALESCE(t.closed_at,t.resolved_at) AS completed_at FROM support_tickets t LEFT JOIN users c ON c.id=t.customer_id LEFT JOIN users tc ON tc.id=t.technician_id WHERE t.created_at >= $1 AND t.created_at < $2 ORDER BY t.created_at DESC`, params),
    query(`SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM(first_attention.created_at-t.assigned_at))/3600)::numeric,2),0)::float AS average_arrival_hours FROM support_tickets t JOIN LATERAL (SELECT MIN(h.created_at) AS created_at FROM ticket_history h WHERE h.ticket_id=t.id AND h.new_value IN('EN_CAMINO','EN_PROCESO')) first_attention ON first_attention.created_at IS NOT NULL WHERE t.created_at >= $1 AND t.created_at < $2 AND t.assigned_at IS NOT NULL`, params),
  ]);
  const current = metrics.rows[0]; const prior = previous.rows[0];
  current.average_arrival_hours = arrival.rows[0].average_arrival_hours;
  current.resolution_rate = current.total ? Math.round(current.completed * 100 / current.total) : 0;
  current.sla_compliance = current.completed ? Math.round(current.within_sla * 100 / current.completed) : 0;
  return {
    generatedAt: new Date().toISOString(), range: { from: range.from, to: range.to }, metrics: current,
    comparison: { total: pctChange(current.total, prior.total), completed: pctChange(current.completed, prior.completed), resolutionHours: pctChange(current.average_resolution_hours, prior.average_resolution_hours), previous: prior },
    distributions: { status: status.rows, priority: priority.rows, failure: failure.rows, zone: zone.rows, crew: crew.rows },
    daily: daily.rows, trends: { daily:daily.rows, weekly:weekly.rows, monthly:monthly.rows, yearly:yearly.rows }, technicians: technicians.rows, tickets: tickets.rows,
    slaHours: 24,
  };
};

module.exports = { getAdministrativeReport, parseRange };
