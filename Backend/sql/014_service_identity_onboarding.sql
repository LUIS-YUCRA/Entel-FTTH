BEGIN;
CREATE TABLE IF NOT EXISTS instance_classifications (
  instance_prefix VARCHAR(30) PRIMARY KEY,
  customer_category VARCHAR(30) NOT NULL CHECK (customer_category IN ('HOGAR','NEGOCIO','INSTITUCION')),
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS service_instances (
  service_number VARCHAR(60) PRIMARY KEY CHECK (service_number ~ '^[0-9]{4,20}$'),
  customer_category VARCHAR(30) NOT NULL CHECK (customer_category IN ('HOGAR','NEGOCIO','INSTITUCION')),
  monthly_fee_bob NUMERIC(12,2) CHECK (monthly_fee_bob >= 0),
  reference TEXT NOT NULL CHECK (length(trim(reference)) >= 6),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS category_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS category_source VARCHAR(30),
  ADD COLUMN IF NOT EXISTS monthly_fee_bob NUMERIC(12,2) CHECK (monthly_fee_bob >= 0);
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS customer_category_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS service_monthly_fee_bob NUMERIC(12,2) CHECK (service_monthly_fee_bob >= 0);
COMMIT;
