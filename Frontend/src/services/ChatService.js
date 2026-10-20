import { apiRequest } from './ApiService';
import { orderChatMessages } from '../utils/chatMessageOrder';

export const chatService = {
  list: async () => {
    const result = await apiRequest('/conversations', { silent: true });
    return {...result,conversations:(result.conversations || []).map(conversation=>({
      ...conversation,messages:orderChatMessages(conversation.messages),
    }))};
  },
  create: (parentConversationId = null, welcome = true) => apiRequest('/conversations', {
    method: 'POST', silent: true, timeoutMs: 180000,
    body: JSON.stringify({ parentConversationId, welcome }),
  }),
  send: (message, conversationId, requestId) => apiRequest('/conversations/message', {
    method: 'POST', silent: true, timeoutMs: 180000,
    body: JSON.stringify({ message, conversationId, requestId }),
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
