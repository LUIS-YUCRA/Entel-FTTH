BEGIN;

ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE support_tickets ALTER COLUMN status TYPE VARCHAR(40);
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN (
    'PENDIENTE', 'ASIGNADO', 'EN_CAMINO', 'EN_PROCESO',
    'REPROGRAMADO', 'INCUMPLIMIENTO_VISITA',
    'RESUELTO', 'CERRADO', 'CANCELADO'
  ));
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS missed_visit_count INTEGER NOT NULL DEFAULT 0
  CHECK (missed_visit_count >= 0);

CREATE INDEX IF NOT EXISTS idx_ticket_overdue_rescheduled
  ON support_tickets (scheduled_at)
  WHERE status = 'REPROGRAMADO';

COMMIT;
