const express = require('express');
const controller = require('../controllers/TicketController');
const historyReportController = require('../controllers/TechnicianHistoryReportController');
const { authenticate, authorize } = require('../middleware/AuthMiddleware');

const router = express.Router();
router.use(authenticate);
router.get('/', controller.getAll);
router.get('/history/export/:format', authorize('tecnico'), historyReportController.download);
router.get('/:id', controller.getById);
router.post('/', authorize('cliente', 'operador', 'administrador'), controller.create);
router.patch(
  '/:id/status',
  authorize('operador', 'tecnico', 'administrador'),
  controller.updateStatus,
);
router.patch(
  '/:id/assign',
  authorize('operador', 'administrador'),
  controller.assign,
);

module.exports = router;
