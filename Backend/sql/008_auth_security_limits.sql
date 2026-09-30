BEGIN;
-- Garantiza un único administrador activo en toda la base de datos.
CREATE UNIQUE INDEX IF NOT EXISTS users_one_active_admin
  ON users (user_type) WHERE user_type = 'administrador' AND is_active = TRUE;

-- Límites configurables para cuentas de personal.
CREATE TABLE IF NOT EXISTS system_parameters (
  key VARCHAR(80) PRIMARY KEY,
  value INTEGER NOT NULL CHECK (value >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO system_parameters(key, value) VALUES
 ('MAX_OPERADORES', 5), ('MAX_TECNICOS', 4)
ON CONFLICT (key) DO NOTHING;

-- Catálogo configurable; sin asumir reglas comerciales no proporcionadas.
CREATE TABLE IF NOT EXISTS instance_classifications (
  instance_prefix VARCHAR(30) PRIMARY KEY,
  customer_category VARCHAR(30) NOT NULL CHECK (customer_category IN ('HOGAR','NEGOCIO','INSTITUCION')),
  active BOOLEAN NOT NULL DEFAULT TRUE
);
COMMIT;
