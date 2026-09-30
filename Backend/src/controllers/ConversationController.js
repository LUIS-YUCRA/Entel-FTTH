const Conversation = require('../models/Conversation');
const Ticket = require('../models/Ticket');
const { processAssistantMessage } = require('../services/AssistantBridge');
const { query } = require('../config/db');
const { normalizeFailure } = require('../services/FailureCatalog');
const { calculateTicketPriority } = require('../services/TicketPriorityService');

const normalizePriority = (value) => {
  const priority = String(value || 'MEDIA').toUpperCase();
  return ['BAJA', 'MEDIA', 'ALTA'].includes(priority) ? priority : 'MEDIA';
};



const create = async (req, res, next) => {
  try {
    const conversation = await Conversation.startNew(req.user.id, req.body.parentConversationId);
    return res.status(201).json({ success: true, conversation });
  } catch (error) {
    return next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message || message.length > 2000) {
      return res.status(400).json({
        message: 'El mensaje es obligatorio y no debe superar 2000 caracteres',
      });
    }

    const requestedConversation = await Conversation.findOwned(req.user.id, req.body.conversationId);
    if (req.body.conversationId && !requestedConversation) return res.status(404).json({ message: 'Conversación no encontrada.' });
    if (requestedConversation && (requestedConversation.status !== 'ACTIVA' || requestedConversation.ticket_id)) {
      return res.status(409).json({ message: 'Esta conversación ha finalizado. Abre un nuevo chat para describir otro problema.' });
    }

    const conversation = await Conversation.getOrCreate(
      req.user.id,
      req.body.conversationId,
    );
    await Conversation.addMessage(conversation.id, 'usuario', message);

    const customerProfile = await query(
      `SELECT address, zone, customer_category FROM customers WHERE user_id = $1`,
      [req.user.id],
    );
    const customer = customerProfile.rows[0] || {};

    const assistant = await processAssistantMessage({
      message,
      customerId: req.user.id,
      customer,
      context: conversation.assistant_context,
    });

    let persistedTicket = null;
    let responseText = assistant.response;
    if (assistant.ticket) {
      const source = assistant.ticket;
      const originalProblem = await Conversation.findOriginalProblem(conversation.id) || message;
      const failure = normalizeFailure({ ticket: source, intent: assistant.intent, diagnosis: assistant.diagnosis, context: assistant.context, originalMessage: originalProblem });
      const conversationText = await query(
        `SELECT STRING_AGG(content, ' ' ORDER BY created_at) AS content
         FROM conversation_messages WHERE conversation_id = $1 AND sender = 'usuario'`,
        [conversation.id],
      );
      const priority = calculateTicketPriority({
        basePriority: normalizePriority(source.priority),
        diagnosisCode: failure.code,
        text: conversationText.rows[0]?.content || originalProblem,
        customer,
      });
      persistedTicket = await Ticket.findRecentDuplicate(req.user.id, failure.code);
      const duplicate = Boolean(persistedTicket);
      if (!persistedTicket) {
        persistedTicket = await Ticket.create({
          customerId: req.user.id,
          title: failure.label,
          description: [originalProblem, ...(assistant.context?.diagnostic_answers || []).map(
            (answer) => `${answer.question}\nCliente: ${answer.answer}`,
          )].join('\n\n'),
          diagnosisCode: failure.code,
          cause: source.cause || assistant.diagnosis?.cause || 'Requiere revisión técnica en campo.',
          priority: priority.priority,
          confidence: Number(source.confidence || assistant.confidence || 0),
          customerAddress: customer.address || null,
          customerZone: customer.zone || null,
          customerCategory: customer.customer_category || 'HOGAR',
          reportedDurationHours: priority.durationHours,
          priorityReason: priority.reason,
        });
      }
      if (source.ticket_id) {
        responseText = responseText.replaceAll(source.ticket_id, persistedTicket.ticket_code);
      }
      responseText = `Ticket registrado: ${persistedTicket.ticket_code}\nEstado: ${persistedTicket.status || 'PENDIENTE'}\nFalla reportada: ${failure.label}\nPrioridad: ${persistedTicket.priority || priority.priority}\nTu solicitud quedó registrada para revisión técnica. La visita todavía debe coordinarse.`;
      if (duplicate) responseText = `Ya existe un ticket reciente para esta misma falla: ${persistedTicket.ticket_code}. No se creó un duplicado.`;
      await query(
        `UPDATE evidences SET ticket_id = $1
         WHERE conversation_id = $2 AND ticket_id IS NULL`,
        [persistedTicket.id, conversation.id],
      );
    }

    await Conversation.addMessage(
      conversation.id,
      'asistente',
      responseText,
      {
        intent: assistant.intent,
        confidence: assistant.confidence,
        diagnosis: assistant.diagnosis,
        ticketId: persistedTicket?.id || null,
      },
    );
    await Conversation.saveContext(
      conversation.id,
      { ...assistant.context, conversation: { ...assistant.context?.conversation, finished: Boolean(persistedTicket) || assistant.dialog_state === 'FINISHED' || Boolean(assistant.context?.conversation?.finished) } },
      persistedTicket?.id || null,
    );

    return res.json({
      success: true,
      conversationId: conversation.id,
      response: responseText,
      intent: assistant.intent,
      confidence: assistant.confidence,
      dialogState: persistedTicket ? 'FINISHED' : assistant.dialog_state,
      diagnosis: assistant.diagnosis,
      ticket: persistedTicket,
    });
  } catch (error) {
    return next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const conversations = await Conversation.list(req.user.id);
    res.json({ success: true, conversations });
  } catch (error) {
    next(error);
  }
};

const finish = async (req, res, next) => {
  try {
    const result = await Conversation.finish(req.params.id, req.user.id);
    if (!result) return res.status(404).json({ message: 'Conversación no encontrada' });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await Conversation.delete(req.params.id, req.user.id);
    if (!result) return res.status(404).json({ message: 'Conversación no encontrada' });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = { create, sendMessage, list, finish, remove };
