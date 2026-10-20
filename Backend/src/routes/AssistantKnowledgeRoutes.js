const express = require('express');
const {knowledge, policy} = require('../services/AssistantKnowledgeService');
const {authenticate,authorize}=require('../middleware/AuthMiddleware');
const router=express.Router();
router.use(authenticate,authorize('administrador'));
const handle=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(error){if(error.status && error.status<500)return res.status(error.status).json({message:error.message});next(error);}};
router.get('/',handle(async(req,res)=>res.json({items:await knowledge.list(req.query.status,req.query.after),policy,metrics:await knowledge.metrics()})));
router.post('/collect',handle(async(req,res)=>res.json(await knowledge.collect(200))));
router.patch('/:id',handle(async(req,res)=>res.json(await knowledge.review(req.params.id,req.body,req.user.id))));
router.get('/:id/versions',handle(async(req,res)=>{
  const result=await knowledge.db.query(`SELECT v.* FROM assistant_knowledge_versions v JOIN assistant_knowledge_candidates c ON c.knowledge_key=v.knowledge_key WHERE c.id=$1 ORDER BY version DESC`,[req.params.id]);
  res.json({versions:result.rows});
}));
// Restoring publishes a new audited version; it never rewrites history.
router.post('/:id/restore/:version',handle(async(req,res)=>{
  const result=await knowledge.db.query(`SELECT v.* FROM assistant_knowledge_versions v JOIN assistant_knowledge_candidates c ON c.knowledge_key=v.knowledge_key WHERE c.id=$1 AND v.version=$2`,[req.params.id,req.params.version]);
  const v=result.rows[0];if(!v)return res.status(404).json({message:'Versión no encontrada.'});
  res.json(await knowledge.review(req.params.id,{status:'VALIDATED',question:v.question,answer:v.answer,variants:v.variants,intent:v.intent,replyKey:v.reply_key,privacyReviewed:req.body.privacyReviewed,note:req.body.note},req.user.id));
}));
module.exports=router;
