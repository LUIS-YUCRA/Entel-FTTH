const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

const hasValidSignature = (buffer, mimeType) => {
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (mimeType === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/webp') return buffer.subarray(0, 4).toString() === 'RIFF'
    && buffer.subarray(8, 12).toString() === 'WEBP';
  if (mimeType === 'video/mp4') return buffer.subarray(4, 8).toString() === 'ftyp';
  return false;
};

const canAttach = async (user, conversationId, ticketId) => {
  if (conversationId) {
    const result = await query(
      'SELECT id FROM conversations WHERE id = $1 AND customer_id = $2',
      [conversationId, user.id],
    );
    return Boolean(result.rows[0]);
  }
  if (ticketId) {
    const params = [ticketId];
    let permission = '';
    if (user.user_type === 'cliente') {
      params.push(user.id);
      permission = 'AND customer_id = $2';
    } else if (user.user_type === 'tecnico') {
      params.push(user.id);
      permission = 'AND technician_id = $2';
    }
    const result = await query(
      `SELECT id FROM support_tickets WHERE id = $1 ${permission}`,
      params,
    );
    return Boolean(result.rows[0]);
  }
  return false;
};

const upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Debe adjuntar una imagen o video' });
    }
    const signature = Buffer.alloc(12);
    const descriptor = fs.openSync(req.file.path, 'r');
    const bytesRead = fs.readSync(descriptor, signature, 0, signature.length, 0);
    fs.closeSync(descriptor);
    if (!hasValidSignature(signature.subarray(0, bytesRead), req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'El contenido del archivo no coincide con un formato permitido' });
    }
    const { conversationId, ticketId } = req.body;
    const allowed = await canAttach(req.user, conversationId, ticketId);
    if (!allowed) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ message: 'No puede adjuntar evidencia a este registro' });
    }

    const result = await query(
      `INSERT INTO evidences (
        uploaded_by, conversation_id, ticket_id, original_name,
        stored_name, mime_type, size_bytes, file_path
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        req.user.id, conversationId || null, ticketId || null,
        req.file.originalname, req.file.filename, req.file.mimetype,
        req.file.size, req.file.path,
      ],
    );
    const evidence = result.rows[0];
    const evidenceType = evidence.mime_type.startsWith('video/') ? 'video' : 'imagen';
    const confirmation = `Gracias por subir ${evidenceType === 'imagen' ? 'una' : 'un'} ${evidenceType} de tu problema. La evidencia quedó guardada y será enviada junto con el diagnóstico al personal técnico.`;
    if (conversationId) {
      await query(
        `INSERT INTO conversation_messages (conversation_id, sender, content, metadata)
         VALUES ($1,'asistente',$2,$3::jsonb)`,
        [conversationId, confirmation, JSON.stringify({ evidenceId: evidence.id, evidenceType })],
      );
      await query(
        'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [conversationId],
      );
    }
    return res.status(201).json({ success: true, evidence, confirmation });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return next(error);
  }
};

const download = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT e.*
       FROM evidences e
       LEFT JOIN conversations c ON c.id = e.conversation_id
       LEFT JOIN support_tickets t ON t.id = e.ticket_id
       WHERE e.id = $1 AND (
         $2 IN ('operador','administrador')
         OR e.uploaded_by = $3 OR t.customer_id = $3
         OR t.technician_id = $3 OR c.customer_id = $3
       )`,
      [req.params.id, req.user.user_type, req.user.id],
    );
    const evidence = result.rows[0];
    if (!evidence || !fs.existsSync(evidence.file_path)) {
      return res.status(404).json({ message: 'Evidencia no encontrada' });
    }
    return res.download(path.resolve(evidence.file_path), evidence.original_name);
  } catch (error) {
    return next(error);
  }
};

module.exports = { upload, download };
