const { pool, query } = require('../config/db');

class Conversation {
  static async startNew(customerId, parentConversationId = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let parentId = null;
      if (parentConversationId) {
        const parent = await client.query(
          'SELECT id FROM conversations WHERE id = $1 AND customer_id = $2',
          [parentConversationId, customerId],
        );
        parentId = parent.rows[0]?.id || null;
      }
      const created = await client.query(
        `INSERT INTO conversations (customer_id, parent_conversation_id)
         VALUES ($1,$2) RETURNING *`,
        [customerId, parentId],
      );
      await client.query('COMMIT');
      return created.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getOrCreate(customerId, conversationId = null) {
    if (conversationId) {
      const owned = await query(
        `SELECT * FROM conversations
         WHERE id = $1 AND customer_id = $2 AND status = 'ACTIVA'`,
        [conversationId, customerId],
      );
      if (owned.rows[0]) return owned.rows[0];
    }

    const active = await query(
      `SELECT * FROM conversations
       WHERE customer_id = $1 AND status = 'ACTIVA'
       ORDER BY updated_at DESC LIMIT 1`,
      [customerId],
    );
    if (active.rows[0]) return active.rows[0];

    const created = await query(
      `INSERT INTO conversations (customer_id)
       VALUES ($1) RETURNING *`,
      [customerId],
    );
    return created.rows[0];
  }

  static async findOwned(customerId, conversationId) {
    if (!conversationId) return null;
    const result = await query(
      'SELECT * FROM conversations WHERE id = $1 AND customer_id = $2',
      [conversationId, customerId],
    );
    return result.rows[0] || null;
  }

  static async addMessage(conversationId, sender, content, metadata = {}) {
    const result = await query(
      `INSERT INTO conversation_messages
       (conversation_id, sender, content, metadata)
       VALUES ($1,$2,$3,$4::jsonb) RETURNING *`,
      [conversationId, sender, content, JSON.stringify(metadata)],
    );
    await query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId],
    );
    return result.rows[0];
  }

  static async findOriginalProblem(conversationId) {
    const result = await query(
      `SELECT content FROM conversation_messages
       WHERE conversation_id = $1 AND sender = 'usuario'
         AND LOWER(TRIM(content)) NOT IN ('si','sí','no','ok','dale','de acuerdo')
       ORDER BY id ASC LIMIT 1`,
      [conversationId],
    );
    return result.rows[0]?.content || null;
  }

  static async saveContext(conversationId, context, ticketId = null) {
    const result = await query(
      `UPDATE conversations
       SET assistant_context = $1::jsonb,
           ticket_id = COALESCE($2, ticket_id),
           status = CASE WHEN $3 THEN 'FINALIZADA' ELSE status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [
        JSON.stringify(context || {}),
        ticketId,
        Boolean(ticketId || context?.conversation?.finished),
        conversationId,
      ],
    );
    return result.rows[0];
  }

  static async list(customerId) {
    const result = await query(
      `SELECT c.id, c.status, c.ticket_id, c.parent_conversation_id,
              c.created_at, c.updated_at, ticket.ticket_code,
              u.full_name AS customer_name, u.email AS customer_email,
              COALESCE(json_agg(
                json_build_object(
                  'id', m.id, 'sender', m.sender, 'content', m.content,
                  'metadata', m.metadata, 'created_at', m.created_at
                ) ORDER BY m.id ASC
              ) FILTER (WHERE m.id IS NOT NULL), '[]') AS messages
       FROM conversations c
       JOIN users u ON u.id = c.customer_id
       LEFT JOIN conversation_messages m ON m.conversation_id = c.id
       LEFT JOIN support_tickets ticket ON ticket.id = c.ticket_id
       WHERE c.customer_id = $1
       GROUP BY c.id, u.full_name, u.email, ticket.ticket_code
       ORDER BY c.updated_at DESC`,
      [customerId],
    );
    return result.rows;
  }

  static async finish(conversationId, customerId) {
    const result = await query(
      `UPDATE conversations
       SET status = 'FINALIZADA',
           assistant_context = jsonb_set(assistant_context, '{conversation}', COALESCE(assistant_context->'conversation', '{}'::jsonb) || '{"finished":true,"dialog_state":"FINISHED"}'::jsonb),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND customer_id = $2 RETURNING id`,
      [conversationId, customerId],
    );
    return result.rows[0];
  }

  static async delete(conversationId, customerId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owned = await client.query(
        'SELECT id FROM conversations WHERE id = $1 AND customer_id = $2 FOR UPDATE',
        [conversationId, customerId],
      );
      if (!owned.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      await client.query(
        `UPDATE evidences SET conversation_id = NULL
         WHERE conversation_id = $1 AND ticket_id IS NOT NULL`,
        [conversationId],
      );
      await client.query('DELETE FROM conversations WHERE id = $1', [conversationId]);
      await client.query('COMMIT');
      return owned.rows[0];
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Conversation;
