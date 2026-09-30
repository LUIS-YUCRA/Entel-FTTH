import { apiRequest } from './ApiService';

export const chatService = {
  list: () => apiRequest('/conversations', { silent: true }),
  create: (parentConversationId = null) => apiRequest('/conversations', {
    method: 'POST', silent: true, timeoutMs: 180000,
    body: JSON.stringify({ parentConversationId }),
  }),
  send: (message, conversationId) => apiRequest('/conversations/message', {
    method: 'POST', silent: true, timeoutMs: 180000,
    body: JSON.stringify({ message, conversationId }),
  }),
  finish: (conversationId) => apiRequest(`/conversations/${conversationId}/finish`, {
    method: 'PATCH',
  }),
  delete: (conversationId) => apiRequest(`/conversations/${conversationId}`, {
    method: 'DELETE',
  }),
  uploadEvidence: (file, conversationId, ticketId = null) => {
    const body = new FormData();
    body.append('file', file);
    if (conversationId) body.append('conversationId', conversationId);
    if (ticketId) body.append('ticketId', ticketId);
    return apiRequest('/evidences', { method: 'POST', silent: true, timeoutMs: 180000, body });
  },
};
