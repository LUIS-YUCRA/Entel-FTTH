BEGIN;
ALTER TABLE service_instances DROP COLUMN IF EXISTS monthly_fee_bob;
ALTER TABLE customers DROP COLUMN IF EXISTS monthly_fee_bob;
ALTER TABLE support_tickets DROP COLUMN IF EXISTS service_monthly_fee_bob;
COMMIT;
