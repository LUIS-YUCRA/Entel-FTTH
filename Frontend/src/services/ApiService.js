import { sessionStore } from './SessionStore';
import { fetchWithConnection, networkActivity } from './NetworkActivity';

const defaultApiHost = typeof window === 'undefined' ? 'localhost' : window.location.hostname;
export const API_URL = (import.meta.env.DEV
  ? (import.meta.env.VITE_DEV_API_URL || `http://${defaultApiHost}:3001/api`)
  : (import.meta.env.VITE_API_URL || '/api')).replace(/\/$/, '');

export const apiRequest = async (path, options = {}, allowRefresh = true) => {
  const end = options.silent ? () => {} : networkActivity.begin();
  try {
    return await performRequest(path, options, allowRefresh);
  } finally {
    end();
  }
};

const performRequest = async (path, options = {}, allowRefresh = true) => {
  const headers = new Headers(options.headers || {});
  const token = sessionStore.get('token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const { response, data } = await fetchWithConnection(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const refreshToken = sessionStore.get('refreshToken');
    if (response.status === 401 && allowRefresh && refreshToken
      && path !== '/auth/refresh-token') {
      const { response: refreshResponse, data: refreshed } = await fetchWithConnection(`${API_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshResponse.ok && sessionStore.get('refreshToken') === refreshToken) {
        sessionStore.set('token', refreshed.token);
        return apiRequest(path, options, false);
      }
    }
    if (response.status === 401) {
      sessionStore.clear();
    }
    const error = new Error(data.message || data.error || 'Error en la solicitud');
    error.code = data.code;
    error.status = response.status;
    throw error;
  }
  return data;
};
