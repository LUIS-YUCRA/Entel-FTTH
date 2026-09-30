BEGIN;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_category VARCHAR(30) NOT NULL DEFAULT 'HOGAR';

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_category_check;
ALTER TABLE customers ADD CONSTRAINT customers_category_check
  CHECK (customer_category IN ('HOGAR','NEGOCIO','INSTITUCION'));

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS customer_address VARCHAR(300),
  ADD COLUMN IF NOT EXISTS customer_zone VARCHAR(120),
  ADD COLUMN IF NOT EXISTS customer_category VARCHAR(30),
  ADD COLUMN IF NOT EXISTS reported_duration_hours NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS priority_reason TEXT;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS parent_conversation_id BIGINT REFERENCES conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_parent ON conversations(parent_conversation_id);

UPDATE support_tickets ticket
SET customer_address = COALESCE(ticket.customer_address, customer.address),
    customer_zone = COALESCE(ticket.customer_zone, customer.zone),
    customer_category = COALESCE(ticket.customer_category, customer.customer_category)
FROM customers customer
WHERE customer.user_id = ticket.customer_id;

COMMIT;
