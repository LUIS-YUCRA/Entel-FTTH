const express = require('express');
const controller = require('../controllers/UserController');
const { authenticate, authorize } = require('../middleware/AuthMiddleware');
const { validateStaff } = require('../middleware/ValidationMiddleware');

const router = express.Router();
router.use(authenticate, authorize('administrador'));
router.get('/', controller.list);
router.get('/:id/photo', controller.photo);
router.get('/:id', controller.get);
router.post('/', validateStaff, controller.create);
router.patch('/:id', controller.update);
router.patch('/:id/password', controller.resetPassword);
router.delete('/:id', controller.remove);

module.exports = router;
