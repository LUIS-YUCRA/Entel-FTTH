const TYPES = [
  { code: 'ELECTRICAL_STORM_DAMAGE', label: 'Posible daño eléctrico', terms: ['electrical_storm_damage', 'olor a quemado', 'sale humo', 'produce chispas'] },
  { code: 'SIN_INTERNET', label: 'Sin internet', terms: ['sin_internet', 'sin internet', 'no_internet', 'no tengo internet', 'internet caido'] },
  { code: 'INTERNET_LENTO', label: 'Internet lento', terms: ['internet_lento', 'slow_internet', 'internet lento', 'muy lento', 'lentitud', 'baja velocidad'] },
  { code: 'PROBLEMA_CONEXION', label: 'Problema de conexión', terms: ['problema_conexion', 'connection_problem', 'problema de conexion', 'intermitencia', 'se desconecta'] },
  { code: 'ROUTER_DANADO', label: 'Router dañado', terms: ['router_danado', 'router_damage', 'router dañado', 'router esta dañado', 'modem dañado', 'equipo dañado'] },
  { code: 'CAMBIO_EQUIPO', label: 'Cambio de equipo', terms: ['cambio_equipo', 'equipment_change', 'cambio de equipo', 'reemplazo de router'] },
  { code: 'PERDIDA_SENAL_OPTICA', label: 'Pérdida de señal óptica', terms: ['los_rojo', 'los red', 'luz los', 'fibra dañada', 'sin señal optica'] },
  { code: 'WIFI_COBERTURA', label: 'Problema de cobertura WiFi', terms: ['wifi', 'cobertura', 'señal debil', 'señal débil'] },
];

const normalizedText = (...values) => values.filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeFailure = ({ ticket = {}, intent, diagnosis, context, originalMessage }) => {
  const confirmedCode = ticket.code || diagnosis?.code || context?.diagnosis?.code;
  const diagnosedType = TYPES.find((type) => type.code === confirmedCode);
  if (diagnosedType) return diagnosedType;
  const entities = context?.entities || context?.conversation?.entities || {};
  const text = normalizedText(ticket.code, ticket.problem, intent, diagnosis?.code, diagnosis?.problem, entities.problem, originalMessage);
  const match = TYPES.find((type) => type.terms.some((term) => text.includes(normalizedText(term))));
  if (match) return match;
  return { code: 'FALLA_FTTH_GENERAL', label: 'Falla de servicio FTTH' };
};

module.exports = { TYPES, normalizeFailure };
