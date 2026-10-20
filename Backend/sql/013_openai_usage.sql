BEGIN;
CREATE TABLE IF NOT EXISTS assistant_api_usage (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  conversation_id BIGINT REFERENCES conversations(id) ON DELETE SET NULL,
  model VARCHAR(80) NOT NULL,
  billing_day DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/La_Paz')::date,
  reserved_usd NUMERIC(12,6) NOT NULL CHECK (reserved_usd >= 0),
  estimated_usd NUMERIC(12,6) CHECK (estimated_usd >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'RESERVED' CHECK (status IN ('RESERVED','COMPLETED','FAILED','UNKNOWN')),
  usage JSONB NOT NULL DEFAULT '{}',
  error_code VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS assistant_api_usage_day ON assistant_api_usage(billing_day);
ALTER TABLE assistant_api_usage ALTER COLUMN customer_id TYPE BIGINT;
ALTER TABLE assistant_api_usage ALTER COLUMN conversation_id TYPE BIGINT;
COMMIT;
