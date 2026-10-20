const rules = require('../../chat/priority_rules.json');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const extractDurationHours = text => {
  const value = normalize(text);
  for (const [unit, factor] of [['semanas?',168],['dias?',24],['horas?',1],['minutos?',1/60]]) {
    const found = value.match(new RegExp(`(?:hace|durante|desde hace|por)?\\s*(\\d+(?:[.,]\\d+)?)\\s*${unit}\\b`));
    if (found) return Number(found[1].replace(',','.')) * factor;
  }
  if (/desde anteayer/.test(value)) return 48;
  if (/desde ayer/.test(value)) return 24;
  return null;
};

const calculateTicketPriority = ({diagnosisCode, text, customer, facts = {}, policy = rules}) => {
  // Categoria del perfil autenticado; sintomas e impactos reportados por el cliente.
  const content = normalize(text)
    .replace(/no (?:hay|tengo|veo|tiene) (?:ninguna )?luz roja/g, '')
    .replace(/no (?:estamos|estoy) sin internet/g, '');
  const category = customer?.category_verified===false?'PENDIENTE':String(customer?.customer_category || 'HOGAR').toUpperCase();
  const durationHours = extractDurationHours(content);
  const single = facts.device_scope === 'single' || /solo (?:en )?(?:mi |un )?(?:celular|computadora|dispositivo)/.test(content);
  const completeOutage = !single && (policy.outageCodes.includes(diagnosisCode)
    || /sin internet|no (?:tengo|tenemos|hay|funciona el) internet|sin servicio/.test(content));
  const physicalDamage = !/sin danos|no (?:esta|se encuentra|tiene).*(?:roto|cortado|danado|danos)/.test(content)
    && /(?:cable|fibra).*(?:cortad|rot[oa]|danad)/.test(content);
  const operationalStopped = /no (?:podemos|puedo) (?:cobrar|atender|vender)|no funciona.*(?:ventas|cobros)|operaciones (?:criticas )?(?:detenidas|paralizadas)|impide.*(?:clases|ventas|atencion)|no (?:hay|podemos dar) clases/.test(content);
  const collective = /todo el barrio.*sin internet|(?:muchos|varios) vecinos.*sin internet|interrupcion general/.test(content);
  const result = (priority, reason) => ({priority,durationHours,reason,policyVersion:policy.version});
  if (policy.safetyCodes?.includes(diagnosisCode)) return result('ALTA','El cliente reporta indicios de daño eléctrico; requiere revisión segura.');
  if (physicalDamage || collective) return result('ALTA', physicalDamage ? 'Dano fisico del cable reportado; requiere revision tecnica.' : 'Interrupcion colectiva reportada; requiere verificacion.');
  if(completeOutage&&customer?.category_verified===true&&policy.criticalCategories.includes(category))return result('ALTA','Interrupción total de un servicio de negocio o institucional con categoría verificada por instancia.');
  if (operationalStopped && (completeOutage || policy.criticalCategories.includes(category))) return result('ALTA','El cliente reporta operaciones o atencion interrumpidas por la falla.');
  if (completeOutage && durationHours !== null && durationHours >= policy.outageHighHours) return result('ALTA',`Interrupcion total reportada durante ${durationHours} horas.`);
  if (!single && !policy.minorCodes.includes(diagnosisCode) && durationHours !== null && durationHours >= policy.persistentHighHours) return result('ALTA',`Falla persistente reportada durante ${durationHours} horas.`);
  if (completeOutage) return result('MEDIA','Interrupcion total reportada; duracion e impacto pendientes de verificar.');
  if (single || policy.minorCodes.includes(diagnosisCode)) return result('BAJA','Problema localizado o consulta sin interrupcion general reportada.');
  return result('MEDIA','Degradacion del servicio reportada sin evidencia de interrupcion critica.');
};
module.exports = {calculateTicketPriority, extractDurationHours};
