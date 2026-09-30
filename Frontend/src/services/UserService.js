import { API_URL, apiRequest } from './ApiService';
import { sessionStore } from './SessionStore';

export const userService = {
  list: () => apiRequest('/users'),
  get: (id) => apiRequest(`/users/${id}`),
  create: (data) => apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiRequest(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  resetPassword: (id, password) => apiRequest(`/users/${id}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ password }),
  }),
  remove: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
  photo: async (id) => {
    const response = await fetch(`${API_URL}/auth/users/${id}/photo`, { headers: { Authorization: `Bearer ${sessionStore.get('token')}` }, cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('No se pudo cargar la fotografía');
    return response.blob();
  },
};
