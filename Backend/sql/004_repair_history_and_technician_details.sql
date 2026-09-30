BEGIN;

-- El historial guarda identificadores y nombres de estados; ambas columnas deben ser texto.
ALTER TABLE ticket_history
  ALTER COLUMN previous_value TYPE TEXT USING previous_value::text,
  ALTER COLUMN new_value TYPE TEXT USING new_value::text;

ALTER TABLE technician_profiles
  ADD COLUMN IF NOT EXISTS employee_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS area VARCHAR(100) NOT NULL DEFAULT 'Soporte técnico FTTH',
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS crew VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_technician_employee_code
  ON technician_profiles(employee_code) WHERE employee_code IS NOT NULL;

UPDATE technician_profiles
SET employee_code = 'TEC-' || LPAD(user_id::text, 5, '0')
WHERE employee_code IS NULL;

COMMIT;
