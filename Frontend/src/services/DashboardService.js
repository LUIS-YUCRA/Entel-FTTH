import { API_URL, apiRequest } from './ApiService';
import { sessionStore } from './SessionStore';
import { rangeParams } from '../utils/dateRange';
import { ticketMetrics } from '../utils/ticketMetrics';

const params = (from, to) => new URLSearchParams({ from, to }).toString();

const downloadReport = async (format, from, to) => {
  const response = await fetch(`${API_URL}/dashboard/administrative-report/export/${format}?${params(from, to)}&v=${Date.now()}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${sessionStore.get('token')}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'No se pudo generar el reporte.');
  }
  const disposition = response.headers.get('content-disposition') || '';
  const name = disposition.match(/filename="?([^";]+)"?/)?.[1] || `reporte-ftth.${format}`;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const dashboardService = {
  clientOverview: (range) => apiRequest(`/dashboard/overview?${rangeParams(range)}`, { silent: true }),
  overview: async () => {
    const [data, list] = await Promise.all([apiRequest('/dashboard/overview'), apiRequest('/tickets')]);
    return {...data,allTickets:list.tickets,metrics:{...data.metrics,...ticketMetrics(list.tickets)}};
  },
  administrativeReport: (from, to) => apiRequest(`/dashboard/administrative-report?${params(from, to)}`),
  downloadReport,
};
