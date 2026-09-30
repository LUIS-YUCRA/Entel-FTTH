const { query } = require('../config/db');
const Ticket = require('../models/Ticket');
const { dateRange } = require('../utils/DateRange');

const ticketScope = (user, alias = 't') => {
  if (user.user_type === 'cliente') {
    return { clause: `WHERE ${alias}.customer_id = $1`, params: [user.id] };
  }
  if (user.user_type === 'tecnico') {
    return { clause: `WHERE ${alias}.technician_id = $1`, params: [user.id] };
  }
  return { clause: '', params: [] };
};

const overview = async (req, res, next) => {
  try {
    if (req.user.user_type === 'cliente') {
      const dates = dateRange(req.query);
      const params = [req.user.id, ...dates];
      const period = ' AND ($2::timestamptz IS NULL OR created_at >= $2) AND ($3::timestamptz IS NULL OR created_at < $3)';
      const [tickets, conversations, evidences] = await Promise.all([
        query(`SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status NOT IN ('RESUELTO','CERRADO','CANCELADO'))::int AS active,
          COUNT(*) FILTER (WHERE status = 'RESUELTO')::int AS resolved,
          COUNT(*) FILTER (WHERE status = 'CERRADO')::int AS closed
          FROM support_tickets WHERE customer_id = $1${period}`, params),
        query(`SELECT COUNT(*)::int AS total FROM conversations WHERE customer_id = $1${period}`, params),
        query(`SELECT COUNT(*)::int AS total FROM evidences WHERE uploaded_by = $1${period}`, params),
      ]);
      return res.json({ metrics: tickets.rows[0], conversations: conversations.rows[0], evidences: evidences.rows[0] });
    }
    await Ticket.markOverdueReprogrammedVisits();
    const scope = ticketScope(req.user);
    const historyScope = ticketScope(req.user, 't');

    const [
      metricsResult,
      recentResult,
      monthlyResult,
      usersResult,
      activityResult,
      conversationResult,
      evidenceResult,
      zonesResult,
    ] = await Promise.all([
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status NOT IN ('RESUELTO','CERRADO','CANCELADO'))::int AS active,
           COUNT(*) FILTER (WHERE status = 'CANCELADO')::int AS cancelled,
           COUNT(*) FILTER (WHERE status = 'PENDIENTE')::int AS pending,
           COUNT(*) FILTER (WHERE status = 'ASIGNADO')::int AS assigned,
           COUNT(*) FILTER (WHERE status = 'EN_PROCESO')::int AS in_progress,
           COUNT(*) FILTER (WHERE status = 'RESUELTO')::int AS resolved,
           COUNT(*) FILTER (WHERE status = 'CERRADO')::int AS closed,
           COALESCE(SUM(missed_visit_count), 0)::int AS missed_visits,
           COUNT(*) FILTER (WHERE priority = 'ALTA')::int AS high_priority,
           COUNT(*) FILTER (
             WHERE technician_id IS NULL
             AND status NOT IN ('RESUELTO','CERRADO','CANCELADO')
           )::int AS unassigned,
           COALESCE(ROUND(AVG(
             EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
           ) FILTER (WHERE resolved_at IS NOT NULL)::numeric, 2), 0)::float
             AS average_resolution_hours
         FROM support_tickets t ${scope.clause}`,
        scope.params,
      ),
      query(
        `SELECT t.*, COALESCE(customer.full_name, 'Cuenta eliminada') AS customer_name,
                technician.full_name AS technician_name,
                operator.full_name AS operator_name
         FROM support_tickets t
         LEFT JOIN users customer ON customer.id = t.customer_id
         LEFT JOIN users technician ON technician.id = t.technician_id
         LEFT JOIN users operator ON operator.id = t.operator_id
         ${scope.clause}
         ORDER BY t.created_at DESC
         LIMIT 10`,
        scope.params,
      ),
      query(
        `SELECT date_trunc('month', t.created_at) AS month,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (
                  WHERE t.status IN ('RESUELTO','CERRADO')
                )::int AS resolved,
                COUNT(*) FILTER (
                  WHERE t.status NOT IN ('RESUELTO','CERRADO','CANCELADO')
                )::int AS pending
         FROM support_tickets t
         ${scope.clause}
         GROUP BY date_trunc('month', t.created_at)
         ORDER BY month DESC
         LIMIT 6`,
        scope.params,
      ),
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE is_active)::int AS active,
           COUNT(*) FILTER (WHERE user_type = 'cliente' AND is_active)::int AS clients,
           COUNT(*) FILTER (WHERE user_type = 'tecnico' AND is_active)::int AS technicians,
           COUNT(*) FILTER (WHERE user_type = 'operador' AND is_active)::int AS operators,
           COUNT(*) FILTER (WHERE user_type = 'administrador' AND is_active)::int AS administrators
         FROM users`,
      ),
      query(
        `SELECT h.id, h.action, h.previous_value, h.new_value,
                h.observation, h.created_at, t.ticket_code,
                COALESCE(customer.full_name, 'Cuenta eliminada') AS customer_name,
                COALESCE(actor.full_name, 'Cuenta eliminada') AS changed_by_name
         FROM ticket_history h
         JOIN support_tickets t ON t.id = h.ticket_id
         LEFT JOIN users customer ON customer.id = t.customer_id
         LEFT JOIN users actor ON actor.id = h.changed_by
         ${historyScope.clause}
         ORDER BY h.created_at DESC
         LIMIT 12`,
        historyScope.params,
      ),
      query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'ACTIVA')::int AS active
         FROM conversations
         WHERE customer_id = $1`,
        [req.user.id],
      ),
      query(
        'SELECT COUNT(*)::int AS total FROM evidences WHERE uploaded_by = $1',
        [req.user.id],
      ),
      query(
        `SELECT zone, COUNT(*)::int AS customers
         FROM customers
         WHERE zone IS NOT NULL AND TRIM(zone) <> ''
         GROUP BY zone
         ORDER BY zone`,
      ),
    ]);

    const metrics = metricsResult.rows[0];
    const resolvedTotal = metrics.resolved + metrics.closed;
    metrics.resolution_rate = metrics.total
      ? Math.round((resolvedTotal / metrics.total) * 100)
      : 0;

    const [dailyResult, weeklyResult, technicianResult] = await Promise.all([
      query(`SELECT date_trunc('day', t.created_at) AS period, COUNT(*)::int AS registered,
                    COUNT(*) FILTER (WHERE t.status IN ('RESUELTO','CERRADO'))::int AS attended
             FROM support_tickets t ${scope.clause}
             GROUP BY 1 ORDER BY 1 DESC LIMIT 31`, scope.params),
      query(`SELECT date_trunc('week', t.created_at) AS period, COUNT(*)::int AS registered,
                    COUNT(*) FILTER (WHERE t.status IN ('RESUELTO','CERRADO'))::int AS attended
             FROM support_tickets t ${scope.clause}
             GROUP BY 1 ORDER BY 1 DESC LIMIT 12`, scope.params),
      query(`SELECT u.id, u.full_name, COUNT(t.id)::int AS assigned,
                    COUNT(t.id) FILTER (WHERE t.status IN ('RESUELTO','CERRADO'))::int AS attended,
                    COALESCE(SUM(t.missed_visit_count),0)::int AS missed_visits,
                    CASE WHEN COUNT(t.id) = 0 THEN 0 ELSE
                      GREATEST(0, ROUND(COUNT(t.id) FILTER (WHERE t.status IN ('RESUELTO','CERRADO')) * 100.0 / COUNT(t.id))::int
                      - COALESCE(SUM(t.missed_visit_count),0)::int * 10) END AS efficiency
             FROM users u LEFT JOIN support_tickets t ON t.technician_id = u.id
             WHERE u.user_type = 'tecnico' GROUP BY u.id ORDER BY attended DESC, u.full_name`),
    ]);

    return res.json({
      success: true,
      role: req.user.user_type,
      generatedAt: new Date().toISOString(),
      metrics,
      users: usersResult.rows[0],
      conversations: conversationResult.rows[0],
      evidences: evidenceResult.rows[0],
      recentTickets: recentResult.rows,
      monthly: monthlyResult.rows.reverse(),
      daily: dailyResult.rows.reverse(),
      weekly: weeklyResult.rows.reverse(),
      technicianPerformance: technicianResult.rows,
      activity: activityResult.rows,
      zones: zonesResult.rows,
      system: {
        name: 'Sistema Inteligente de Reclamos FTTH',
        company: 'ENTEL Bolivia',
        database: process.env.DB_NAME,
        frontendUrl: process.env.FRONTEND_URL,
        sessionDuration: process.env.JWT_EXPIRES_IN || '24h',
        mailEnabled: Boolean(
          (process.env.SMTP_USER || process.env.EMAIL_USER)
          && (process.env.SMTP_PASSWORD || process.env.EMAIL_PASS)
        ),
        maxEvidenceMb: 10,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { overview };
