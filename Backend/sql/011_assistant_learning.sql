BEGIN;

CREATE TABLE IF NOT EXISTS assistant_turns (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  attempt_token UUID NOT NULL,
  original_message TEXT NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('PROCESSING','COMPLETED','FAILED')),
  response JSONB,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code VARCHAR(80),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(conversation_id, request_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS assistant_one_processing_turn ON assistant_turns(conversation_id) WHERE status = 'PROCESSING';
CREATE INDEX IF NOT EXISTS assistant_turn_metrics ON assistant_turns(started_at, status);

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assistant_turn_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS assistant_ticket_once ON support_tickets(assistant_turn_key) WHERE assistant_turn_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS assistant_knowledge_candidates (
  id BIGSERIAL PRIMARY KEY,
  source_message_id BIGINT UNIQUE REFERENCES conversation_messages(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  intent VARCHAR(80) NOT NULL DEFAULT 'desconocido',
  reply_key VARCHAR(120),
  knowledge_key VARCHAR(64),
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','USEFUL','VALIDATED','REJECTED','NEEDS_REVIEW','OBSOLETE')),
  quality_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  solution_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  review_note TEXT
);
CREATE INDEX IF NOT EXISTS assistant_candidates_review ON assistant_knowledge_candidates(status, id);

-- Only generalised, explicitly reviewed content belongs in this table.
-- No customer IDs, private transcripts, addresses or authentication data.
CREATE TABLE IF NOT EXISTS assistant_knowledge_versions (
  id BIGSERIAL PRIMARY KEY,
  knowledge_key VARCHAR(64) NOT NULL,
  version INTEGER NOT NULL,
  question TEXT NOT NULL,
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  answer TEXT NOT NULL,
  intent VARCHAR(80) NOT NULL,
  reply_key VARCHAR(120) NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL CHECK (status IN ('VALIDATED','OBSOLETE','REJECTED')),
  policy_version VARCHAR(40) NOT NULL,
  review_note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  UNIQUE(knowledge_key, version)
);
CREATE INDEX IF NOT EXISTS assistant_knowledge_lookup ON assistant_knowledge_versions(reply_key, status, valid_until);
CREATE UNIQUE INDEX IF NOT EXISTS assistant_one_valid_version ON assistant_knowledge_versions(knowledge_key) WHERE status='VALIDATED';

CREATE TABLE IF NOT EXISTS assistant_feedback (
  message_id BIGINT PRIMARY KEY REFERENCES conversation_messages(id) ON DELETE CASCADE,
  customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating IN (-1,1)),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
