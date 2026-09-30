export function ticketMetrics(tickets) {
  const count = (status) => tickets.filter(ticket => ticket.status === status).length;
  const resolved = count('RESUELTO');
  const closed = count('CERRADO');
  const cancelled = count('CANCELADO');
  return {total:tickets.length,active:tickets.length-resolved-closed-cancelled,resolved,closed,cancelled,
    pending:count('PENDIENTE'),assigned:count('ASIGNADO'),in_progress:count('EN_PROCESO'),
    resolution_rate:tickets.length?Math.round((resolved+closed)*100/tickets.length):0};
}
