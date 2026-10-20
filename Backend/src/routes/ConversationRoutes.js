const express = require('express');
const controller = require('../controllers/ConversationController');
const { authenticate, authorize } = require('../middleware/AuthMiddleware');

const router = express.Router();
router.use(authenticate, authorize('cliente'));
router.get('/', controller.list);
router.post('/', controller.create);
router.post('/message', controller.sendMessage);
router.post('/messages/:id/feedback', async (req,res,next) => {
  try { res.json(await require('../services/AssistantKnowledgeService').knowledge.feedback(req.user.id,req.params.id,req.body.rating,req.body.comment)); }
  catch(error) { if(error.status)return res.status(error.status).json({message:error.message}); next(error); }
});
router.patch('/:id/finish', controller.finish);
router.delete('/:id', controller.remove);

module.exports = router;
