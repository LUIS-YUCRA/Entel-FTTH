const { pool, query } = require('../config/db');
const Notification = require('./Notification');

const technicianContact = (data) => data?.technician_name ? [
  `Técnico: ${data.technician_name}`,
  `Código: ${data.employee_code || 'No registrado'}`,
  `Área: ${data.area || 'Soporte técnico FTTH'}`,
  `Especialidad: ${data.specialty || 'FTTH general'}`,
  `Teléfono: ${data.phone || 'No registrado'}`,
  `Correo: ${data.technician_email || 'No registrado'}`,
  `Cuadrilla: ${data.crew || 'No registrada'}`,
  `Zona: ${data.zone || 'No registrada'}`,
].join('\n') : '';

const customerNotification = (data, status, summary) => [
  `Cliente: ${data.customer_name || 'Cliente ENTEL'}`,
  `Ticket: ${data.ticket_code}`,
  `Estado actualizado: ${String(status).replaceAll('_', ' ')}`,
  '',
  summary,
  data.scheduled_at ? `Fecha y hora de visita: ${new Date(data.scheduled_at).toLocaleString('es-BO', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/La_Paz' })}` : null,
  data.non_resolution_reason ? `Motivo de reprogramación: ${data.non_resolution_reason}` : null,
  '',
  technicianContact(data) || 'Técnico: Pendiente de asignación',
].filter((line) => line !== null).join('\n');

const BASE_SELECT = `
  SELECT t.*,
         COALESCE(customer.full_name, 'Cuenta eliminada') AS customer_name,
         customer.email AS customer_email,
         COALESCE(t.customer_address, customer_profile.address) AS customer_address,
         COALESCE(t.customer_zone, customer_profile.zone) AS customer_zone,
         COALESCE(t.customer_category, customer_profile.customer_category, 'HOGAR') AS customer_category,
         technician.full_name AS technician_name,
         technician.email AS technician_email,
         (technician.profile_photo IS NOT NULL) AS technician_has_photo,
         technician_profile.employee_code AS technician_employee_code,
         technician_profile.area AS technician_area,
         technician_profile.phone AS technician_phone,
         technician_profile.crew AS technician_crew,
         technician_profile.zone AS technician_zone,
         technician_profile.specialty AS technician_specialty,
         operator.full_name AS operator_name
  FROM support_tickets t
  LEFT JOIN users customer ON customer.id = t.customer_id
  LEFT JOIN customers customer_profile ON customer_profile.user_id = customer.id
  LEFT JOIN users technician ON technician.id = t.technician_id
  LEFT JOIN technician_profiles technician_profile ON technician_profile.user_id = technician.id
  LEFT JOIN users operator ON operator.id = t.operator_id
`;

class Ticket {
  static async markOverdueReprogrammedVisits() {
    const result = await query(
      `WITH overdue AS (
         UPDATE support_tickets
         SET status = 'INCUMPLIMIENTO_VISITA',
             missed_visit_count = missed_visit_count + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE status = 'REPROGRAMADO'
           AND scheduled_at IS NOT NULL
           AND scheduled_at < CURRENT_TIMESTAMP
         RETURNING id, technician_id, scheduled_at
       )
       INSERT INTO ticket_history
         (ticket_id, changed_by, action, previous_value, new_value, observation)
       SELECT id, technician_id, 'INCUMPLIMIENTO_VISITA', 'REPROGRAMADO',
              'INCUMPLIMIENTO_VISITA',
              'La fecha reprogramada venció sin que el técnico iniciara la atención.'
       FROM overdue
       WHERE technician_id IS NOT NULL
       RETURNING ticket_id`,
    );
    return result.rowCount;
  }

  static async generateCode() {
    const result = await query("SELECT nextval('support_ticket_code_seq') AS number");
    return `TK-${String(result.rows[0].number).padStart(3, '0')}`;
  }

  static async findRecentDuplicate(customerId, diagnosisCode) {
    const result = await query(
      `SELECT * FROM support_tickets
       WHERE customer_id = $1 AND diagnosis_code = $2
         AND status NOT IN ('CERRADO','CANCELADO')
         AND created_at >= NOW() - INTERVAL '5 minutes'
       ORDER BY created_at DESC LIMIT 1`,
      [customerId, diagnosisCode],
    );
    return result.rows[0] || null;
  }

  static async create(data) {
    const {
      customerId,
      operatorId = null,
      technicianId = null,
      title,
      description,
      diagnosisCode = null,
      cause = null,
      priority = 'MEDIA',
      confidence = 0,
      customerAddress = null,
      customerZone = null,
      customerCategory = 'HOGAR',
      reportedDurationHours = null,
      priorityReason = null,
    } = data;
    const ticketCode = await Ticket.generateCode();

    const result = await query(
      `INSERT INTO support_tickets (
        ticket_code, customer_id, operator_id, technician_id, title,
        description, diagnosis_code, cause, priority, confidence,
        customer_address, customer_zone, customer_category,
        reported_duration_hours, priority_reason
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
      [
        ticketCode, customerId, operatorId, technicianId, title,
        description, diagnosisCode, cause, priority, confidence,
        customerAddress, customerZone, customerCategory,
        reportedDurationHours, priorityReason,
      ],
    );
    const ticket = result.rows[0];
    await query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
       VALUES ($1,'CREAR_TICKET','TICKET',$2,$3::jsonb)`,
      [customerId, String(ticket.id), JSON.stringify({ ticketCode: ticket.ticket_code, priority: ticket.priority })],
    );
    await Notification.create({
      userId: customerId,
      ticketId: ticket.id,
      eventType: 'TICKET_CREADO',
      title: `${ticket.ticket_code} · Reclamo registrado`,
      message: 'Tu reclamo fue registrado correctamente y está pendiente de revisión.',
    });
    await Notification.createForRole('operador', {
      ticketId: ticket.id,
      eventType: priority === 'ALTA' ? 'TICKET_NUEVO_PRIORIDAD_ALTA' : 'TICKET_NUEVO_COLA',
      title: `${ticket.ticket_code} · ${priority === 'ALTA' ? 'Nuevo ticket prioritario' : 'Nuevo ticket en cola'}`,
      message: `${title}. Cliente pendiente de revisión y asignación técnica. Prioridad: ${priority}.`,
    });
    return ticket;
  }

  static async findVisible(user) {
    await Ticket.markOverdueReprogrammedVisits();
    const params = [];
    let where = '';
    if (user.user_type === 'cliente') {
      params.push(user.id);
      where = 'WHERE t.customer_id = $1';
    } else if (user.user_type === 'tecnico') {
      params.push(user.id);
      where = 'WHERE t.technician_id = $1';
    }
    const result = await query(
      `${BASE_SELECT} ${where}
       ORDER BY t.created_at DESC, t.id DESC`,
      params,
    );
    return result.rows;
  }

  static async findVisibleById(id, user) {
    await Ticket.markOverdueReprogrammedVisits();
    const params = [id];
    let permission = '';
    if (user.user_type === 'cliente') {
      params.push(user.id);
      permission = 'AND t.customer_id = $2';
    } else if (user.user_type === 'tecnico') {
      params.push(user.id);
      permission = 'AND t.technician_id = $2';
    }
    const result = await query(
      `${BASE_SELECT} WHERE t.id = $1 ${permission}`,
      params,
    );
    return result.rows[0];
  }

  static async findHistory(id) {
    const result = await query(
      `SELECT h.id, h.action, h.previous_value, h.new_value,
              h.observation, h.created_at,
              actor.full_name AS actor_name,
              assigned.full_name AS technician_name,
              COALESCE(assigned.full_name, actor.full_name) AS changed_by_name
       FROM ticket_history h
       LEFT JOIN users actor ON actor.id = h.changed_by
       LEFT JOIN users assigned
         ON h.action = 'ASIGNACION_TECNICO'
        AND assigned.id::text = h.new_value
       WHERE h.ticket_id = $1
       ORDER BY h.created_at ASC`,
      [id],
    );
    return result.rows;
  }

  static async findEvidences(id) {
    const result = await query(
      `SELECT id, original_name, mime_type, size_bytes, created_at
       FROM evidences
       WHERE ticket_id = $1
       ORDER BY created_at DESC`,
      [id],
    );
    return result.rows;
  }

  static async findConversationMessages(id) {
    const result = await query(
      `SELECT m.id, m.sender, m.content, m.metadata, m.created_at,
              COALESCE(customer.full_name, 'Cuenta eliminada') AS customer_name
       FROM conversation_messages m
       JOIN conversations c ON c.id = m.conversation_id
       LEFT JOIN users customer ON customer.id = c.customer_id
       WHERE c.ticket_id = $1
       ORDER BY m.created_at ASC`,
      [id],
    );
    return result.rows;
  }

  static async updateStatus(id, status, userId, observation = null, details = {}) {
    const client = await pool.connect();
    let currentTicket;
    let ticket;
    try {
      await client.query('BEGIN');
      const current = await client.query(
        `SELECT t.status, t.customer_id, t.technician_id, t.operator_id, t.ticket_code,
                COALESCE(customer.full_name, 'Cuenta eliminada') AS customer_name,
                u.full_name AS technician_name, u.email AS technician_email,
                p.employee_code, p.area, p.specialty, p.phone, p.crew, p.zone
         FROM support_tickets t
         LEFT JOIN users customer ON customer.id = t.customer_id
         LEFT JOIN users u ON u.id = t.technician_id
         LEFT JOIN technician_profiles p ON p.user_id = u.id
         WHERE t.id = $1 FOR UPDATE OF t`,
        [id],
      );
      if (!current.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      currentTicket = current.rows[0];
      if ((details.expectedStatus && currentTicket.status !== details.expectedStatus)
        || (details.technicianId && Number(currentTicket.technician_id) !== Number(details.technicianId))) {
        throw Object.assign(new Error('La atención cambió. Actualiza la tarea antes de continuar.'), { status: 409 });
      }
      if (currentTicket.status === status) {
        const error = new Error(`El ticket ya se encuentra en estado ${status.replaceAll('_', ' ')}`);
        error.status = 409;
        throw error;
      }
      const result = await client.query(
        `UPDATE support_tickets
         SET status = $1::varchar,
             resolved_at = CASE WHEN $1::varchar IN ('RESUELTO','CERRADO') THEN CURRENT_TIMESTAMP ELSE resolved_at END,
             closed_at = CASE WHEN $1::varchar = 'CERRADO' THEN CURRENT_TIMESTAMP ELSE closed_at END,
             solution = COALESCE($3, solution),
             non_resolution_reason = COALESCE($4, non_resolution_reason),
             scheduled_at = COALESCE($5, scheduled_at),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [status, id, details.solution || null, details.nonResolutionReason || null, details.scheduledAt || null],
      );
      ticket = result.rows[0];
      await client.query(
        `INSERT INTO ticket_history
         (ticket_id, changed_by, action, previous_value, new_value, observation)
         VALUES ($1,$2,'CAMBIO_ESTADO',$3::text,$4::text,$5)`,
        [id, userId, currentTicket.status, status, observation],
      );
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
         VALUES ($1,'CAMBIAR_ESTADO_TICKET','TICKET',$2,$3::jsonb)`,
        [userId, String(id), JSON.stringify({ from: currentTicket.status, to: status })],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    const labels = {
      EN_CAMINO: 'El técnico se encuentra en camino.',
      EN_PROCESO: 'La atención técnica ha iniciado.',
      REPROGRAMADO: 'La atención fue reprogramada. Revisa el detalle del ticket.',
      RESUELTO: 'El reclamo fue marcado como resuelto.',
      CERRADO: 'El reclamo fue cerrado.',
      CANCELADO: 'El reclamo fue cancelado.',
    };
    const notificationData = {
      ...currentTicket,
      scheduled_at: ticket.scheduled_at,
      non_resolution_reason: ticket.non_resolution_reason,
    };
    await Notification.create({
      userId: currentTicket.customer_id,
      ticketId: id,
      eventType: `ESTADO_${status}`,
      title: `${currentTicket.ticket_code} · ${status.replaceAll('_', ' ')}`,
      message: customerNotification(
        notificationData,
        status,
        labels[status] || `El estado del reclamo cambió a ${status.replaceAll('_', ' ')}.`,
      ),
    });
    if (currentTicket.operator_id && ['REPROGRAMADO', 'RESUELTO', 'CANCELADO'].includes(status)) {
      const operatorMessages = {
        REPROGRAMADO: 'La atención técnica fue reprogramada. Revisa la nueva fecha y el motivo.',
        RESUELTO: 'El técnico marcó el ticket como resuelto. Revisa la solución antes de cerrar el reclamo.',
        CANCELADO: 'El ticket fue cancelado. Revisa el motivo registrado.',
      };
      await Notification.create({
        userId: currentTicket.operator_id,
        ticketId: id,
        eventType: `OPERADOR_${status}`,
        title: `${currentTicket.ticket_code} · ${status.replaceAll('_', ' ')}`,
        message: operatorMessages[status],
      });
    }
    return ticket;
  }

  static async assign(id, technicianId, operatorId, observation = null, scheduledAt = null) {
    const technician = await query(
      `SELECT u.id, COALESCE(p.is_available, TRUE) AS is_available,
              COALESCE(p.max_active_tickets, 8) AS max_active_tickets,
              COUNT(t.id) FILTER (
                WHERE t.status IN ('ASIGNADO','EN_CAMINO','EN_PROCESO','REPROGRAMADO','INCUMPLIMIENTO_VISITA')
              )::int AS active_tickets
       FROM users u
       LEFT JOIN technician_profiles p ON p.user_id = u.id
       LEFT JOIN support_tickets t ON t.technician_id = u.id
       WHERE u.id = $1 AND u.user_type = 'tecnico' AND u.is_active = TRUE
       GROUP BY u.id, p.user_id`,
      [technicianId],
    );
    if (!technician.rows[0]) {
      const error = new Error('El técnico seleccionado no existe o está inactivo');
      error.status = 400;
      throw error;
    }
    if (!technician.rows[0].is_available
      || technician.rows[0].active_tickets >= technician.rows[0].max_active_tickets) {
      const error = new Error('El técnico no está disponible o alcanzó su carga máxima');
      error.status = 409;
      throw error;
    }

    const result = await query(
      `UPDATE support_tickets
       SET technician_id = $1, operator_id = $2, status = 'ASIGNADO',
           assigned_at = CURRENT_TIMESTAMP, scheduled_at = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [technicianId, operatorId, scheduledAt, id],
    );
    if (!result.rows[0]) return null;
    await query(
      `INSERT INTO ticket_history
       (ticket_id, changed_by, action, new_value, observation)
       VALUES ($1,$2,'ASIGNACION_TECNICO',$3,$4)`,
      [id, operatorId, String(technicianId), observation],
    );
    await query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
       VALUES ($1,'ASIGNAR_TECNICO','TICKET',$2,$3::jsonb)`,
      [operatorId, String(id), JSON.stringify({ technicianId: Number(technicianId), scheduledAt })],
    );
    const assigned = await query(
      `SELECT t.customer_id, t.ticket_code, t.scheduled_at, COALESCE(customer.full_name, 'Cuenta eliminada') AS customer_name,
              u.full_name AS technician_name,
              u.email AS technician_email, p.employee_code, p.area,
              p.specialty, p.phone, p.crew, p.zone
       FROM support_tickets t LEFT JOIN users customer ON customer.id = t.customer_id
       JOIN users u ON u.id = t.technician_id
       LEFT JOIN technician_profiles p ON p.user_id = u.id
       WHERE t.id = $1`,
      [id],
    );
    const data = assigned.rows[0];
    await Promise.all([
      Notification.create({
        userId: data.customer_id,
        ticketId: id,
        eventType: 'TECNICO_ASIGNADO',
        title: `${data.ticket_code} · Técnico asignado`,
        message: customerNotification(
          data,
          'ASIGNADO',
          `${data.technician_name} fue asignado para atender tu reclamo y realizará una visita en el horario programado.`,
        ),
      }),
      Notification.create({
        userId: technicianId,
        ticketId: id,
        eventType: 'TAREA_ASIGNADA',
        title: `${data.ticket_code} · Nueva tarea`,
        message: `Tienes una nueva atención técnica asignada. Visita programada: ${new Date(data.scheduled_at).toLocaleString('es-BO', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/La_Paz' })}.`,
      }),
    ]);
    return result.rows[0];
  }
}

module.exports = Ticket;
module.exports.customerNotification = customerNotification;
module.exports.technicianContact = technicianContact;
