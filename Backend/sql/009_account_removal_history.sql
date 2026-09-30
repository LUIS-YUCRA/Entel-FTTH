BEGIN;
-- Technical records survive removal of an account without a fictitious user.
ALTER TABLE support_tickets ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE conversations ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE ticket_history ALTER COLUMN changed_by DROP NOT NULL;
ALTER TABLE evidences ALTER COLUMN uploaded_by DROP NOT NULL;
COMMIT;
