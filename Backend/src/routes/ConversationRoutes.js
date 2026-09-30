const express = require('express');
const controller = require('../controllers/ConversationController');
const { authenticate, authorize } = require('../middleware/AuthMiddleware');

const router = express.Router();
router.use(authenticate, authorize('cliente'));
router.get('/', controller.list);
router.post('/', controller.create);
router.post('/message', controller.sendMessage);
router.patch('/:id/finish', controller.finish);
router.delete('/:id', controller.remove);

module.exports = router;
