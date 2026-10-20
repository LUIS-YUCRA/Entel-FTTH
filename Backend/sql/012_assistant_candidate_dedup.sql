BEGIN;
-- Sin reescribir candidatos anteriores ni borrar mensajes privados.
ALTER TABLE assistant_knowledge_candidates ADD COLUMN IF NOT EXISTS fingerprint VARCHAR(64);
ALTER TABLE assistant_knowledge_candidates ADD COLUMN IF NOT EXISTS occurrence_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE assistant_knowledge_candidates ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS assistant_candidate_fingerprint
  ON assistant_knowledge_candidates(fingerprint) WHERE fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS assistant_messages_collection
  ON conversation_messages(id) WHERE sender='asistente' AND NOT (metadata ? 'knowledgeCandidateId');
CREATE INDEX IF NOT EXISTS assistant_open_ticket_lookup
  ON support_tickets(customer_id, diagnosis_code, created_at DESC)
  WHERE status NOT IN ('RESUELTO','CERRADO','CANCELADO');
COMMIT;
