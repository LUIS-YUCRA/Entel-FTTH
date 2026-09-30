BEGIN;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- Repair historical chats closed by logout or by opening a new conversation.
UPDATE conversations c SET status = 'ACTIVA'
WHERE c.status = 'FINALIZADA' AND c.ticket_id IS NULL
  AND COALESCE(c.assistant_context #>> '{conversation,finished}', 'false') <> 'true'
  AND COALESCE(c.assistant_context #>> '{conversation,dialog_state}', '') <> 'FINISHED'
  AND NOT EXISTS (SELECT 1 FROM conversation_messages m WHERE m.conversation_id = c.id
    AND m.metadata->>'ticketId' IS NOT NULL);
COMMIT;
