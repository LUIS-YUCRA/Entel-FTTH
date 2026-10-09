const Ticket = require('../models/Ticket');

const VALID_STATUS = [
  'PENDIENTE', 'ASIGNADO', 'EN_CAMINO', 'EN_PROCESO',
  'REPROGRAMADO', 'INCUMPLIMIENTO_VISITA', 'RESUELTO', 'CERRADO', 'CANCELADO',
];
const TECHNICIAN_STATUS = ['EN_CAMINO', 'EN_PROCESO', 'REPROGRAMADO', 'RESUELTO'];
const STATUS_TRANSITIONS = {
  PENDIENTE: ['ASIGNADO', 'CANCELADO'],
  ASIGNADO: ['EN_CAMINO', 'REPROGRAMADO', 'CANCELADO'],
  EN_CAMINO: ['EN_PROCESO', 'REPROGRAMADO', 'CANCELADO'],
  EN_PROCESO: ['REPROGRAMADO', 'RESUELTO', 'CANCELADO'],
  REPROGRAMADO: ['EN_CAMINO', 'CANCELADO'],
  INCUMPLIMIENTO_VISITA: ['EN_CAMINO', 'REPROGRAMADO', 'CANCELADO'],
  RESUELTO: ['CERRADO', 'EN_PROCESO'],
  CERRADO: [],
  CANCELADO: [],
};

const create = async (req, res, next) => {
  try {
    const ticket = await Ticket.create({
      customerId: req.user.user_type === 'cliente' ? req.user.id : req.body.customerId,
      operatorId: req.user.user_type === 'operador' ? req.user.id : null,
      technicianId: req.body.technicianId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
    });
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const tickets = await Ticket.findVisible(req.user);
    res.json({ success: true, tickets });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findVisibleById(req.params.id, req.user);
    if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado' });
    const [history, evidences, conversation] = await Promise.all([
      Ticket.findHistory(req.params.id),
      Ticket.findEvidences(req.params.id),
      Ticket.findConversationMessages(req.params.id),
    ]);
    return res.json({
      success: true,
      ticket: {
        ...ticket, history, evidences, conversation,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const status = String(req.body.status || '').toUpperCase();
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ message: 'Estado de ticket inválido' });
    }
    if (req.user.user_type === 'tecnico' && !TECHNICIAN_STATUS.includes(status)) {
      return res.status(403).json({ message: 'El técnico no puede aplicar ese estado' });
    }
    if (status === 'RESUELTO' && req.user.user_type === 'tecnico'
      && !String(req.body.solution || '').trim()) {
      return res.status(400).json({ message: 'Debe registrar la solución aplicada' });
    }
    if (status === 'REPROGRAMADO'
      && !req.body.scheduledAt) {
      return res.status(400).json({ message: 'Debe indicar nueva fecha y hora de atención' });
    }
    if (status === 'REPROGRAMADO') {
      const scheduledAt = new Date(req.body.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
        return res.status(400).json({ message: 'La fecha reprogramada debe ser futura' });
      }
    }
    const visible = await Ticket.findVisibleById(req.params.id, req.user);
    if (!visible) return res.status(404).json({ message: 'Ticket no encontrado' });
    if (status === 'ASIGNADO' && !visible.technician_id) {
      return res.status(400).json({ message: 'Asigna un técnico responsable antes de guardar cambios. Usa la acción Asignar técnico e indica la fecha y hora de visita.' });
    }
    if (req.user.user_type === 'tecnico' && status === 'EN_PROCESO' && visible.status !== 'EN_CAMINO') {
      return res.status(409).json({message:'Primero debes marcar En camino antes de iniciar atención.'});
    }
    if (!STATUS_TRANSITIONS[visible.status]?.includes(status)) {
      return res.status(409).json({
        message: `No se permite cambiar de ${visible.status.replaceAll('_', ' ')} a ${status.replaceAll('_', ' ')}`,
      });
    }
    const ticket = await Ticket.updateStatus(
      req.params.id,
      status,
      req.user.id,
      req.body.observation,
      {
        solution: req.body.solution,
        nonResolutionReason: req.body.nonResolutionReason,
        scheduledAt: req.body.scheduledAt,
        expectedStatus: visible.status,
        technicianId: req.user.user_type === 'tecnico' ? req.user.id : null,
      },
    );
    return res.json({ success: true, ticket });
  } catch (error) {
    return next(error);
  }
};

const assign = async (req, res, next) => {
  try {
    const scheduledAt = new Date(req.body.scheduledAt);
    if (!req.body.scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ message: 'Debe indicar la fecha y hora de la visita técnica' });
    }
    if (scheduledAt.getTime() <= Date.now()) {
      return res.status(400).json({ message: 'La visita técnica debe programarse para una fecha futura' });
    }
    const ticket = await Ticket.assign(
      req.params.id,
      req.body.technicianId,
      req.user.id,
      req.body.observation,
      scheduledAt.toISOString(),
    );
    if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado' });
    return res.json({ success: true, ticket });
  } catch (error) {
    return next(error);
  }
};

module.exports = { create, getAll, getById, updateStatus, assign };
