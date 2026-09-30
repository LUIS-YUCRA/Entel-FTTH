const { query } = require('../config/db');
const { dateRange } = require('../utils/DateRange');
const { isMailConfigured, sendNotificationEmail } = require('../utils/MailService');

class Notification {
  static async createForRole(userType, notification) {
    const recipients = await query(
      'SELECT id FROM users WHERE user_type = $1 AND is_active = TRUE ORDER BY id',
      [userType],
    );
    return Promise.all(recipients.rows.map(({ id }) => Notification.create({
      ...notification,
      userId: id,
    })));
  }

  static async create({ userId, ticketId = null, eventType, title, message }) {
    if (!userId) return null; // The account may have been permanently removed.
    const result = await query(
      `INSERT INTO notifications (user_id, ticket_id, event_type, title, message)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [userId, ticketId, eventType, title, message],
    );
    const notification = result.rows[0];
    const recipient = await query('SELECT email FROM users WHERE id = $1', [userId]);
    const email = recipient.rows[0]?.email;
    let emailStatus = 'NO_CONFIGURADO';
    if (email && isMailConfigured()) {
      try {
        await sendNotificationEmail(email, title, message);
        emailStatus = 'ENVIADA';
      } catch (error) {
        emailStatus = 'FALLIDA';
        console.error('notification_mail_failed', { notificationId: notification.id, code: error.code || 'SMTP_REJECTED', responseCode: error.responseCode || null, command: error.command || null });
      }
    }
    const updated = await query(
      'UPDATE notifications SET email_status = $1 WHERE id = $2 RETURNING *',
      [emailStatus, notification.id],
    );
    return updated.rows[0];
  }

  static async purgeExpired() {
    // Keep other roles unchanged; retention applies to customer notifications.
    return query(`DELETE FROM notifications n USING users u
      WHERE n.user_id = u.id AND u.user_type = 'cliente'
        AND n.created_at <= CURRENT_TIMESTAMP - INTERVAL '3 months'`);
  }

  static async list(userId, range = {}) {
    const dates = dateRange(range);
    const result = await query(
      `SELECT n.*, t.ticket_code
       FROM notifications n
       LEFT JOIN support_tickets t ON t.id = n.ticket_id
       WHERE n.user_id = $1
         AND ($2::timestamptz IS NULL OR n.created_at >= $2)
         AND ($3::timestamptz IS NULL OR n.created_at < $3)
         AND (n.created_at > CURRENT_TIMESTAMP - INTERVAL '3 months'
           OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = $1 AND u.user_type = 'cliente'))
       ORDER BY n.created_at DESC`,
      [userId, ...dates],
    );
    return result.rows;
  }

  static async markRead(id, userId) {
    const result = await query(
      `UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId],
    );
    return result.rows[0];
  }

  static async markAllRead(userId) {
    await query(
      `UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE user_id = $1`,
      [userId],
    );
  }
}

module.exports = Notification;
