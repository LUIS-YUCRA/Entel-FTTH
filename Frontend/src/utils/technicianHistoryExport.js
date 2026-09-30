const COMPLETED_STATUSES = new Set(['RESUELTO', 'CERRADO']);

export const completionDate = (ticket) => (
  ticket.closed_at || ticket.resolved_at || ticket.updated_at || ticket.assigned_at || ticket.created_at
);

export const periodStart = (period, now = new Date()) => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === 'month') start.setFullYear(now.getFullYear(), now.getMonth(), 1);
  return start;
};

export const dateRange = (period, now = new Date(), range = {}) => {
  if (period === 'custom') {
    if (!range.from || !range.to) return null;
    const start = new Date(`${range.from}T00:00:00`);
    const end = new Date(`${range.to}T23:59:59.999`);
    return start <= end ? { start, end } : null;
  }
  if (!['day', 'week', 'month'].includes(period)) return null;
  return { start: periodStart(period, now), end: now };
};

export const localIsoDate = (date) => [
  date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0'),
].join('-');

export const completedTicketsForPeriod = (tickets, period, now = new Date(), range = {}) => {
  const selectedRange = dateRange(period, now, range);
  if (!selectedRange) return [];
  return tickets.filter((ticket) => {
    const status = String(ticket.status || '').toUpperCase();
    const completedAt = new Date(completionDate(ticket));
    return COMPLETED_STATUSES.has(status) && !Number.isNaN(completedAt.valueOf())
      && completedAt >= selectedRange.start && completedAt <= selectedRange.end;
  });
};

export const reportRange = (period, now = new Date(), range = {}) => {
  const selected = dateRange(period, now, range);
  return selected ? { from: localIsoDate(selected.start), to: localIsoDate(selected.end) } : null;
};

export const periodLabel = (period, range = {}) => (period === 'custom'
  ? `${range.from} al ${range.to}`
  : ({ day: 'Hoy', week: 'Esta semana', month: 'Este mes' }[period] || 'Periodo no seleccionado'));

export const historyRows = (tickets) => tickets.map((ticket) => {
  const assignedAt = ticket.assigned_at || ticket.created_at;
  const completedAt = completionDate(ticket);
  const start = new Date(assignedAt);
  const end = new Date(completedAt);
  const duration = !Number.isNaN(start.valueOf()) && !Number.isNaN(end.valueOf()) && end >= start
    ? Math.round(((end - start) / 3600000) * 100) / 100
    : null;
  return {
    ...ticket,
    assignedAt,
    completedAt,
    duration,
    statusLabel: String(ticket.status || '').replaceAll('_', ' '),
    solutionLabel: ticket.solution || ticket.resolution || ticket.technician_notes || 'Sin solución detallada registrada',
  };
});
