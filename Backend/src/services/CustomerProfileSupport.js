const {PROFILE_FIELDS,missingProfile}=require('./ServiceIdentity');
function validateProfileField(field,value){
  if(!PROFILE_FIELDS.includes(field)||typeof value!=='string')return null;
  const v=value.trim();
  if(field==='phone')return /^\+?[\d ()-]{7,22}$/.test(v)&&v.replace(/\D/g,'').length>=7?v:null;
  if(field==='ci')return /^(?=.*\d)[a-zA-Z\d .-]{4,24}$/.test(v)?v:null;
  if(field==='address')return v.length>=5&&v.length<=250&&!/[\r\n<>]/.test(v)?v:null;
  if(field==='zone')return v.length>=2&&v.length<=120&&!/[\r\n<>]/.test(v)?v:null;
  return null;
}
function captureRequestedField(message,field){
  if(!PROFILE_FIELDS.includes(field)||/[?¿]/.test(message)||/\b(?:internet|wifi|router|quemado|humo|no quiero|prefiero|despues|luego|gracias|urgente|ayuda|no tengo|no se|en todos|por ambos|por cable|no funciona|sigue igual)\b/i.test(message)||/^(?:si|sí|no|ok|dale)$/i.test(message.trim()))return null;
  let value=message.trim();
  if(field==='phone')value=value.replace(/^(?:mi (?:telefono|teléfono|numero|número)(?: es)?|es)\s*:?\s*/i,'');
  if(field==='ci')value=value.replace(/^(?:mi (?:ci|carnet|carné)(?: es)?|es)\s*:?\s*/i,'');
  if(field==='address'){
    if(!/^(?:vivo en|mi (?:domicilio|direccion|dirección) es|calle|avenida|av\.?|barrio|zona|carretera|comunidad|urbanizacion|urbanización|pasaje)/i.test(value))return null;
    value=value.replace(/^(?:vivo en|mi (?:domicilio|direccion|dirección) es)\s*/i,'');
  }
  if(field==='zone')value=value.replace(/^(?:mi zona es|zona)\s*/i,'');
  const valid=validateProfileField(field,value);return valid?{field,value:valid}:null;
}
function profileSummary(customer){
  return {missing:missingProfile(customer),categoryVerified:customer?.category_verified===true,category:customer?.category_verified===true?customer.customer_category:null,hasInstance:Boolean(customer?.service_number)};
}
module.exports={validateProfileField,captureRequestedField,profileSummary};
