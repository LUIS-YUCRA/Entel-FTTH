import { API_URL, apiRequest } from './ApiService';
import { sessionStore } from './SessionStore';

export const authService = {
  login: async (credentials) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    sessionStore.storeSession(data);
    sessionStore.set('lastActivityAt', String(Date.now()));
    return data;
  },

  register: (userData) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  forgotPassword: (email) => apiRequest('/password/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),

  profile: () => apiRequest('/auth/profile'),

  updateProfile: (data) => apiRequest('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  uploadProfilePhoto: (file) => {
    const body = new FormData();
    body.append('photo', file);
    return apiRequest('/auth/profile/photo', { method: 'POST', body });
  },

  getProfilePhoto: async (userId, version = '') => {
    const response = await fetch(`${API_URL}/auth/profile/photo?user=${encodeURIComponent(userId || '')}&v=${encodeURIComponent(version || '')}`, {
      headers: { Authorization: `Bearer ${sessionStore.get('token')}` },
      cache: 'no-store',
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('No se pudo cargar la foto de perfil');
    return response.blob();
  },

  activity: () => apiRequest('/auth/activity', { method: 'POST', silent: true }),

  logout: async () => {
    const token = sessionStore.get('token');
    sessionStore.clear();
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000), keepalive: true,
      }).catch(() => {});
    }
  },

  getCurrentUser: () => sessionStore.getUser(),
  getToken: () => sessionStore.get('token'),
};
