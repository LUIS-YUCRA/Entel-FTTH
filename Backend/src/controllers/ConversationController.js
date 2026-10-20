const { knowledge, normalize } = require('../services/AssistantKnowledgeService');
const { turns } = require('../services/AssistantTurns');
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
    if(req.body.welcome===true){
      const customer=await require('../models/User').findProfileById(req.user.id);
      const assistant=await processAssistantMessage({message:'Inicio de atención',event:'welcome',customerId:req.user.id,conversationId:conversation.id,customer,context:conversation.assistant_context});
      const metadata={provider:assistant.provider,profileRequest:assistant.profile_request||null};
      const saved=await Conversation.addMessage(conversation.id,'asistente',assistant.response,metadata);
      await Conversation.saveContext(conversation.id,assistant.context);
      conversation.messages=[{...saved,sender:'asistente',content:assistant.response,metadata}];
    }
    return res.status(201).json({ success: true, conversation });
  } catch (error) {
    return next(error);
  }
};

// Un solo turno por cliente en este worker; otros clientes continúan en paralelo.
const activeMessages = new Set();
const sendMessage = async (req, res, next) => {
  const customerKey = String(req.user.id);
  if (activeMessages.has(customerKey)) {
    return res.status(409).json({ message: 'Espera la respuesta anterior antes de enviar otro mensaje.' });
  }
  activeMessages.add(customerKey);
  let turn;
  const started = Date.now();
  try {
    const message = String(req.body.message || '').trim();
    if (!message || message.length > 2000) {
      return res.status(400).json({
        message: 'El mensaje es obligatorio y no debe superar 2000 caracteres',
      });
    }

    const requestId = req.body.requestId;
    if (requestId && (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId) || !req.body.conversationId)) return res.status(400).json({message:'Identificador de turno inválido.'});
    if (requestId) {
      const cached = await turns.cached(req.user.id, req.body.conversationId, requestId, message);
      if (cached) return res.json(cached);
    }
    const requestedConversation = await Conversation.findOwned(req.user.id, req.body.conversationId);
    if (req.body.conversationId && !requestedConversation) return res.status(404).json({ message: 'Conversación no encontrada.' });
    if (requestedConversation && (requestedConversation.status !== 'ACTIVA' || requestedConversation.ticket_id)) {
      return res.status(409).json({ message: 'Esta conversación ha finalizado. Abre un nuevo chat para describir otro problema.' });
    }

    let conversation = await Conversation.getOrCreate(
      req.user.id,
      req.body.conversationId,
    );
    if (requestId) {
      turn = await turns.claim(req.user.id, conversation.id, requestId, message);
      if (turn.cached) return res.json(turn.cached);
      conversation = turn.conversation;
    } else await Conversation.addMessage(conversation.id, 'usuario', message);

    const normalizedMessage = normalize(message);
    const asksNavigation=/^(?:como|donde)\b.*(?:veo|ver|consult|encuentr|adjunt)/.test(normalizedMessage);
    const needsTicket = !asksNavigation&&/estado.*(?:ticket|reclamo)|(?:ticket|reclamo).*estado|como (?:va|esta) mi (?:ticket|reclamo)|ya.*asign.*tecnico|quien.*(?:mi|el) tecnico|(?:telefono|contacto).*(?:mi|el) tecnico|cuando.*(?:vienen|vendran|vendr[aá]|visita|tecnico)|por que.*pendiente|(?:cambiar|reprogramar).*(?:fecha|visita)/.test(normalizedMessage);
    const code = message.match(/\bTK-\d+\b/i)?.[0]?.toUpperCase();
    // Independent reads run together before supplying the same verified context.
    const [approved, privateHistory, ticketLookup, customerProfile] = await Promise.all([
      knowledge.approved().catch(error => {
        console.error('Conocimiento no disponible; se usan reglas:', error.code || 'UNAVAILABLE');
        return [];
      }),
      /mismo problema|problema de ayer|lo de ayer|otra vez lo mismo/.test(normalizedMessage)
        ? knowledge.privateHistory(req.user.id, conversation.id) : [],
      needsTicket ? knowledge.ownTicket(req.user.id, code).then(ticket => ({requested: true, ticket})) : {},
      query(`SELECT ci, phone, address, service_number, zone, customer_category, category_verified, category_source FROM customers WHERE user_id = $1`, [req.user.id]),
    ]);
    let customer = customerProfile.rows[0] || {};
    let modelMessage=message;let savedProfileField=null;
    const {captureRequestedField}=require('../services/CustomerProfileSupport');
    const requestedProfileField=conversation.assistant_context?.profile_request;
    const captured=!String(customer?.[requestedProfileField]||'').trim()?captureRequestedField(message,requestedProfileField):null;
    if(captured){
      customer=await require('../models/User').updateOwnProfile(req.user.id,{[captured.field]:captured.value},'cliente');
      savedProfileField=captured.field;
      modelMessage='El cliente proporcionó el dato solicitado del perfil; el backend confirmó que se guardó. Continúa sin repetir su valor.';
    }

    const assistant = await processAssistantMessage({
      message:modelMessage,
      customerId: req.user.id,
      conversationId: conversation.id,
      customer,
      context: conversation.assistant_context,
      knowledge: approved, privateHistory, ticketLookup,savedProfileField,
    });

    let persistedTicket = null;
    let responseText = assistant.response;
    if (assistant.ticket) {
      const source = assistant.ticket;
      const originalProblem = assistant.context?.reported_problem || await Conversation.findOriginalProblem(conversation.id) || message;
      const failure = normalizeFailure({ ticket: source, intent: assistant.intent, diagnosis: assistant.diagnosis, context: assistant.context, originalMessage: originalProblem });
      const currentIssueText = [originalProblem, assistant.context?.diagnostic_facts?.reported_since || '',assistant.context?.diagnostic_facts?.impact_statement||'',
        ...(assistant.context?.diagnostic_answers || []).map(answer=>answer.answer)].join(' ');
      const priority = calculateTicketPriority({
        basePriority: normalizePriority(source.priority),
        diagnosisCode: failure.code,
        text: currentIssueText,
        customer,
        facts: assistant.context?.diagnostic_facts || {},
      });
      persistedTicket = await Ticket.create({
        deduplicate: true,
        conversationId:conversation.id,
        assistantTurnKey: requestId ? `${conversation.id}:${requestId}` : `conversation:${conversation.id}`,
        customerId: req.user.id,
        title: failure.label,
        description: [originalProblem,assistant.context?.diagnostic_facts?.impact_statement||'', ...(assistant.context?.diagnostic_answers || []).map(
          (answer) => `${answer.question}\nCliente: ${answer.answer}`,
        )].join('\n\n'),
        diagnosisCode: failure.code,
        cause: source.cause || assistant.diagnosis?.cause || 'Requiere revisión técnica en campo.',
        priority: priority.priority,
        confidence: Number(source.confidence || assistant.confidence || 0),
        customerAddress: customer.address || null,
        customerZone: customer.zone || null,
        customerCategory: customer.category_verified===true?customer.customer_category:null,
        customerCategoryVerified:customer.category_verified===true,
        reportedDurationHours: priority.durationHours,
        priorityReason: priority.reason,
      });
      const duplicate = Boolean(persistedTicket.reused);
      if (source.ticket_id) {
        responseText = responseText.replaceAll(source.ticket_id, persistedTicket.ticket_code);
      }
      responseText = `🎫 ¡TICKET GENERADO CORRECTAMENTE!

📋 Número de ticket: ${persistedTicket.ticket_code}

📌 Estado: PENDIENTE

👨‍🔧 Un técnico revisará su servicio FTTH en las próximas horas.

📱 Recibirá notificaciones sobre el estado de su reclamo.

🙏 ¡Gracias por confiar en ENTEL!`;
      if (duplicate) responseText = `Ya existe un reclamo abierto para esta misma falla: ${persistedTicket.ticket_code}. Puedes consultar su estado en Mis tickets.`;
      await query(
        `UPDATE evidences SET ticket_id = $1
         WHERE conversation_id = $2 AND ticket_id IS NULL`,
        [persistedTicket.id, conversation.id],
      );
    }

    const analysis = {
      intent: assistant.intent, confidence: assistant.confidence, diagnosis: assistant.diagnosis,
      ticketId: persistedTicket?.id || null, normalizedMessage: assistant.normalized_message,
      entities: assistant.context?.entities, facts: assistant.context?.diagnostic_facts,
      actionType: assistant.action_type, dialogState: assistant.dialog_state, replyKey: assistant.reply_key,
      retrieval: assistant.retrieval, nlpBackend: assistant.nlp_backend, modelVersion: assistant.model_version, latencyMs: Date.now()-started,
      provider: assistant.provider || 'local', scope: assistant.scope,
      apiUsageId: assistant.api_usage_id, apiUsage: assistant.api_usage, apiFallbackReason: assistant.api_fallback_reason,
      apiValidationIssues: assistant.api_validation_issues,
      profileRequest: assistant.profile_request||null,
      webResearch: assistant.web_research, sources: assistant.sources,
    };
    const context = { ...assistant.context, conversation: { ...assistant.context?.conversation, finished: Boolean(persistedTicket) || assistant.dialog_state === 'FINISHED' || Boolean(assistant.context?.conversation?.finished) } };
    const response = {success:true, conversationId:conversation.id, response:responseText,
      intent:assistant.intent, confidence:assistant.confidence, dialogState:persistedTicket?'FINISHED':assistant.dialog_state,
      diagnosis:assistant.diagnosis, ticket:persistedTicket,profileRequest:assistant.profile_request||null,profileSummary:assistant.profile_summary};
    if(assistant.provider)response.assistantSource=assistant.provider;
    if (turn) return res.json(await turns.complete(turn,message,response,context,analysis,persistedTicket?.id||null));
    const saved = await Conversation.addMessage(conversation.id,'asistente',responseText,analysis);
    await Conversation.saveContext(conversation.id,context,persistedTicket?.id||null);
    response.messageId = saved?.id;
    return res.json(response);
  } catch (error) {
    await turns.fail(turn,error).catch(() => {});
    return next(error);
  } finally {
    activeMessages.delete(customerKey);
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
