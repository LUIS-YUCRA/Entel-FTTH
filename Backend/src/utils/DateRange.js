function dateRange(input = {}) {
  const values = ['from', 'to'].map((key) => {
    if (!input[key]) return null;
    if (typeof input[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(input[key]) || !Number.isFinite(Date.parse(input[key]))) {
      throw Object.assign(new Error('El rango de fechas no es válido.'), { status: 400 });
    }
    return new Date(input[key]).toISOString();
  });
  if (values[0] && values[1] && values[0] >= values[1]) throw Object.assign(new Error('La fecha fin debe ser posterior a la fecha inicio.'), { status: 400 });
  return values;
}
module.exports = { dateRange };
