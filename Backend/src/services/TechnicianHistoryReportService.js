const { query } = require('../config/db');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseHistoryRange = (from, to) => {
  if (!DATE_PATTERN.test(String(from || '')) || !DATE_PATTERN.test(String(to || ''))) {
    throw Object.assign(new Error('Selecciona un periodo válido para generar el historial.'), { status: 400 });
  }
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw Object.assign(new Error('La fecha Desde no puede ser posterior a Hasta.'), { status: 400 });
  }
  return { from, to };
};

const roundedAverage = (values) => {
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
};

const groupCount = (rows, property) => Object.entries(rows.reduce((result, row) => {
  const label = row[property] || 'NO REGISTRADO';
  result[label] = (result[label] || 0) + 1;
  return result;
}, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

const getTechnicianHistoryReport = async (technicianId, from, to) => {
  const range = parseHistoryRange(from, to);
  const [profileResult, ticketsResult] = await Promise.all([
    query(
      `SELECT u.id, u.full_name, u.email,
              COALESCE(tp.employee_code, 'No registrado') AS employee_code,
              COALESCE(tp.area, 'Soporte técnico FTTH') AS area,
              COALESCE(tp.specialty, 'FTTH general') AS specialty,
              COALESCE(tp.zone, 'No registrada') AS zone,
              COALESCE(tp.crew, 'No registrada') AS crew
       FROM users u
       LEFT JOIN technician_profiles tp ON tp.user_id = u.id
       WHERE u.id = $1 AND u.user_type = 'tecnico'`,
      [technicianId],
    ),
    query(
      `SELECT t.id, t.ticket_code, COALESCE(customer.full_name, 'Cuenta eliminada') AS customer_name,
              t.title, t.status, t.priority, t.assigned_at,
              COALESCE(t.closed_at, t.resolved_at, t.updated_at) AS completed_at,
              COALESCE(NULLIF(TRIM(t.solution), ''), 'Sin solución detallada registrada') AS solution
       FROM support_tickets t
       LEFT JOIN users customer ON customer.id = t.customer_id
       WHERE t.technician_id = $1
         AND t.status IN ('RESUELTO', 'CERRADO')
         AND (COALESCE(t.closed_at, t.resolved_at, t.updated_at) AT TIME ZONE 'America/La_Paz')::date
             BETWEEN $2::date AND $3::date
       ORDER BY completed_at DESC, t.id DESC`,
      [technicianId, range.from, range.to],
    ),
  ]);
  if (!profileResult.rows[0]) {
    throw Object.assign(new Error('Perfil técnico no encontrado.'), { status: 404 });
  }

  const tickets = ticketsResult.rows.map((ticket) => {
    const assignedAt = ticket.assigned_at ? new Date(ticket.assigned_at) : null;
    const completedAt = ticket.completed_at ? new Date(ticket.completed_at) : null;
    const durationHours = assignedAt && completedAt && completedAt >= assignedAt
      ? Math.round(((completedAt - assignedAt) / 3600000) * 100) / 100
      : null;
    return { ...ticket, duration_hours: durationHours };
  });
  const durations = tickets.map((ticket) => ticket.duration_hours).filter(Number.isFinite);

  return {
    generatedAt: new Date().toISOString(),
    range,
    technician: profileResult.rows[0],
    metrics: {
      completed: tickets.length,
      customers: new Set(tickets.map((ticket) => ticket.customer_name)).size,
      high_priority: tickets.filter((ticket) => ticket.priority === 'ALTA').length,
      average_resolution_hours: roundedAverage(durations),
    },
    distributions: {
      status: groupCount(tickets, 'status'),
      priority: groupCount(tickets, 'priority'),
    },
    tickets,
  };
};

module.exports = { getTechnicianHistoryReport, parseHistoryRange };
