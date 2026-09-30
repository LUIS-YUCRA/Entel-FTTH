export const localDate = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
export const presetRange = (period, now = new Date()) => {
  if (period === 'all') return { from: '', to: '' };
  const start = new Date(now);
  if (period === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  if (period === 'month') start.setDate(1);
  return { from: localDate(start), to: localDate(now) };
};
export const rangeParams = ({ from, to }) => {
  const params = new URLSearchParams();
  if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString());
  if (to) { const end = new Date(`${to}T00:00:00`); end.setDate(end.getDate() + 1); params.set('to', end.toISOString()); }
  return params.toString();
};
