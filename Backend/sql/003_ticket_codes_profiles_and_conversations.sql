BEGIN;

CREATE SEQUENCE IF NOT EXISTS support_ticket_code_seq START WITH 1 INCREMENT BY 1;

DO $$
DECLARE
  next_number BIGINT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM support_tickets WHERE ticket_code !~ '^TK-[0-9]{3,}$'
  ) THEN
    UPDATE support_tickets SET ticket_code = 'LEGACY-' || id;
    WITH ordered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS number
      FROM support_tickets
    )
    UPDATE support_tickets ticket
    SET ticket_code = 'TK-' || LPAD(ordered.number::text, 3, '0')
    FROM ordered
    WHERE ticket.id = ordered.id;
  END IF;

  SELECT COALESCE(MAX(SUBSTRING(ticket_code FROM '[0-9]+$')::BIGINT), 0) + 1
  INTO next_number
  FROM support_tickets
  WHERE ticket_code ~ '^TK-[0-9]+$';

  PERFORM setval('support_ticket_code_seq', GREATEST(next_number, 1), FALSE);
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_photo BYTEA,
  ADD COLUMN IF NOT EXISTS profile_photo_mime VARCHAR(80),
  ADD COLUMN IF NOT EXISTS profile_photo_updated_at TIMESTAMPTZ;

CREATE OR REPLACE VIEW conversation_details AS
SELECT c.id, c.customer_id, customer.full_name AS customer_name,
       customer.email AS customer_email, c.ticket_id, c.status,
       c.assistant_context, c.created_at, c.updated_at
FROM conversations c
JOIN users customer ON customer.id = c.customer_id;

COMMIT;
