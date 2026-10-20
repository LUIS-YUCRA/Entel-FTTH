const router=require('express').Router();
const {authenticate,authorize}=require('../middleware/AuthMiddleware');
const {serviceIdentity}=require('../services/ServiceIdentity');
router.use(authenticate,authorize('administrador'));
router.get('/',async(req,res,next)=>{try{res.json({items:await serviceIdentity.list()});}catch(error){next(error);}});
router.post('/',async(req,res,next)=>{try{res.json({item:await serviceIdentity.save(req.body,req.user.id)});}catch(error){if(error.status)return res.status(error.status).json({message:error.message});next(error);}});
module.exports=router;
