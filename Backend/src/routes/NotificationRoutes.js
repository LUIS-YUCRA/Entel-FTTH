const express = require('express');
const controller = require('../controllers/NotificationController');
const { authenticate } = require('../middleware/AuthMiddleware');

const router = express.Router();
router.use(authenticate);
router.get('/', controller.list);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', controller.markRead);

module.exports = router;
