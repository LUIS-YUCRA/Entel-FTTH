const normalize = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const extractDurationHours = (text) => {
  const value = normalize(text);
  const number = (unitPattern) => {
    const match = value.match(new RegExp(`(?:hace|desde hace|durante|por)?\\s*(\\d+(?:[.,]\\d+)?)\\s*${unitPattern}`));
    return match ? Number(match[1].replace(',', '.')) : null;
  };
  const weeks = number('semanas?');
  if (weeks !== null) return weeks * 168;
  const days = number('dias?');
  if (days !== null) return days * 24;
  const hours = number('horas?');
  if (hours !== null) return hours;
  const minutes = number('minutos?');
  if (minutes !== null) return minutes / 60;
  if (/desde ayer|todo el dia de ayer/.test(value)) return 24;
  if (/desde anteayer/.test(value)) return 48;
  if (/desde esta manana|toda la manana/.test(value)) return 8;
  return null;
};

const calculateTicketPriority = ({ basePriority, diagnosisCode, text, customer }) => {
  const content = normalize(text);
  const category = String(customer?.customer_category || 'HOGAR').toUpperCase();
  const zone = normalize(customer?.zone);
  const durationHours = extractDurationHours(content);
  const completeOutage = diagnosisCode === 'SIN_INTERNET'
    || /sin internet|no tengo internet|sin servicio|luz los.*roja/.test(content);
  const physicalDamage = diagnosisCode === 'CABLE_FIBRA_DANADO'
    || /cable.*(cortado|roto|danado)|fibra.*(cortada|rota|danada)/.test(content);
  const slow = diagnosisCode === 'INTERNET_LENTO' || /internet.*lento|lentitud|velocidad baja/.test(content);
  const minorWifi = diagnosisCode === 'COBERTURA_WIFI' || /poca cobertura|no llega.*wifi/.test(content);
  const remote = /rural|alejada|remota|comunidad/.test(zone) || /zona (rural|alejada|remota)/.test(content);

  if (category === 'INSTITUCION' || category === 'NEGOCIO') {
    return { priority: 'ALTA', durationHours, reason: `Cliente de categoría ${category}: impacto operativo elevado.` };
  }
  if (physicalDamage || (completeOutage && durationHours !== null && durationHours >= 4)) {
    return { priority: 'ALTA', durationHours, reason: physicalDamage
      ? 'Daño físico de fibra con interrupción del servicio.'
      : `Pérdida total del servicio${durationHours !== null ? ` durante ${durationHours} horas` : ''}.` };
  }
  if (durationHours !== null && durationHours >= 48) {
    return { priority: 'ALTA', durationHours, reason: `La falla persiste durante ${durationHours} horas.` };
  }
  if (slow && durationHours !== null && durationHours >= 2) {
    return { priority: 'MEDIA', durationHours, reason: `Lentitud sostenida durante ${durationHours} horas.` };
  }
  if (remote && !completeOutage && !physicalDamage) {
    return { priority: 'BAJA', durationHours, reason: 'Incidencia menor registrada en zona rural o alejada.' };
  }
  if (minorWifi && (durationHours === null || durationHours < 2)) {
    return { priority: 'BAJA', durationHours, reason: 'Problema reciente y localizado de cobertura WiFi.' };
  }
  if (completeOutage) {
    return { priority: 'MEDIA', durationHours, reason: durationHours === null
      ? 'Pérdida total reportada sin una duración suficiente para clasificarla como emergencia.'
      : `Pérdida total reciente durante ${durationHours} horas.` };
  }
  const safePriority = ['ALTA', 'MEDIA', 'BAJA'].includes(String(basePriority).toUpperCase())
    ? String(basePriority).toUpperCase() : 'MEDIA';
  return { priority: safePriority, durationHours, reason: 'Prioridad definida por el diagnóstico conversacional.' };
};

module.exports = { calculateTicketPriority, extractDurationHours };
