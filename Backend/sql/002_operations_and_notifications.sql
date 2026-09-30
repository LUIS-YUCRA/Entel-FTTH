BEGIN;

ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN (
    'PENDIENTE', 'ASIGNADO', 'EN_CAMINO', 'EN_PROCESO',
    'REPROGRAMADO', 'RESUELTO', 'CERRADO', 'CANCELADO'
  ));
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS solution TEXT,
  ADD COLUMN IF NOT EXISTS non_resolution_reason TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS refresh_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_refresh_token
  ON sessions(refresh_token) WHERE refresh_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS technician_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  zone VARCHAR(100),
  specialty VARCHAR(120) NOT NULL DEFAULT 'FTTH general',
  max_active_tickets INTEGER NOT NULL DEFAULT 8 CHECK (max_active_tickets > 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO technician_profiles (user_id)
SELECT id FROM users WHERE user_type = 'tecnico'
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id BIGINT REFERENCES support_tickets(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'PLATAFORMA',
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'ENVIADA',
  email_status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS email_status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE';

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(80),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON audit_logs(created_at DESC);

COMMIT;
