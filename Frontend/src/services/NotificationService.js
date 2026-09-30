import { apiRequest } from './ApiService';
import { rangeParams } from '../utils/dateRange';

export const notificationService = {
  list: (range = { from: '', to: '' }) => apiRequest(`/notifications?${rangeParams(range)}`, { silent: true }),
  read: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAll: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),
};
