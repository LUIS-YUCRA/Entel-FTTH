BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  user_type VARCHAR(20) NOT NULL
    CHECK (user_type IN ('cliente', 'operador', 'tecnico', 'administrador')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  ci VARCHAR(30) UNIQUE,
  phone VARCHAR(30),
  address TEXT,
  service_number VARCHAR(60) UNIQUE,
  zone VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGSERIAL PRIMARY KEY,
  ticket_code VARCHAR(30) NOT NULL UNIQUE,
  customer_id BIGINT NOT NULL REFERENCES users(id),
  operator_id BIGINT REFERENCES users(id),
  technician_id BIGINT REFERENCES users(id),
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  diagnosis_code VARCHAR(80),
  cause TEXT,
  priority VARCHAR(10) NOT NULL DEFAULT 'MEDIA'
    CHECK (priority IN ('BAJA', 'MEDIA', 'ALTA')),
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
    CHECK (status IN ('PENDIENTE', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO', 'CANCELADO')),
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id BIGINT REFERENCES support_tickets(id) ON DELETE SET NULL,
  status VARCHAR(15) NOT NULL DEFAULT 'ACTIVA'
    CHECK (status IN ('ACTIVA', 'FINALIZADA')),
  assistant_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender VARCHAR(15) NOT NULL CHECK (sender IN ('usuario', 'asistente')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evidences (
  id BIGSERIAL PRIMARY KEY,
  uploaded_by BIGINT NOT NULL REFERENCES users(id),
  conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
  ticket_id BIGINT REFERENCES support_tickets(id) ON DELETE CASCADE,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (conversation_id IS NOT NULL OR ticket_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS ticket_history (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  changed_by BIGINT NOT NULL REFERENCES users(id),
  action VARCHAR(40) NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  observation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_customer ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_ticket_technician ON support_tickets(technician_id);
CREATE INDEX IF NOT EXISTS idx_ticket_status_priority ON support_tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_conversation_customer ON conversations(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_message_conversation
  ON conversation_messages(conversation_id, created_at);

COMMIT;
