const express = require('express');
const controller = require('../controllers/ClientesController');
const { authenticate, authorize } = require('../middleware/AuthMiddleware');

const router = express.Router();
router.use(authenticate, authorize('operador', 'administrador'));
router.get('/technicians', controller.getTechnicians);
router.post('/', controller.create);
router.get('/', controller.getAll);

module.exports = router;
