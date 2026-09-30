import { API_URL, apiRequest } from './ApiService';
import { sessionStore } from './SessionStore';

const downloadEvidence = async (evidence) => {
  const response = await fetch(`${API_URL}/evidences/${evidence.id}/download`, {
    headers: { Authorization: `Bearer ${sessionStore.get('token')}` },
  });
  if (!response.ok) throw new Error('No se pudo descargar la evidencia');
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = evidence.original_name;
  link.click();
  URL.revokeObjectURL(link.href);
};

const loadEvidence = async (evidence) => {
  const response = await fetch(`${API_URL}/evidences/${evidence.id}/download`, {
    headers: { Authorization: `Bearer ${sessionStore.get('token')}` },
  });
  if (!response.ok) throw new Error('No se pudo abrir la evidencia');
  return response.blob();
};

const downloadHistory = async (format, from, to) => {
  const params = new URLSearchParams({ from, to, v: Date.now() }).toString();
  const response = await fetch(`${API_URL}/tickets/history/export/${format}?${params}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${sessionStore.get('token')}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'No se pudo generar el historial de trabajos.');
  }
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="?([^";]+)"?/)?.[1]
    || `historial-tecnico-${from}-a-${to}.${format}`;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const ticketService = {
  list: () => apiRequest('/tickets'),
  get: (id) => apiRequest(`/tickets/${id}`),
  updateStatus: (id, status, observation = '', details = {}) => apiRequest(`/tickets/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, observation, ...details }),
  }),
  assign: (id, technicianId, observation = '', scheduledAt = '') => apiRequest(`/tickets/${id}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ technicianId, observation, scheduledAt }),
  }),
  technicians: () => apiRequest('/clientes/technicians'),
  downloadHistory,
  loadEvidence,
  downloadEvidence,
};
