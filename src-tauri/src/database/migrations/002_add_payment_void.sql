-- Add void support to payments
-- Migration: 002_add_payment_void

ALTER TABLE payments ADD COLUMN is_voided INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN voided_at TEXT;
ALTER TABLE payments ADD COLUMN void_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_is_voided ON payments(is_voided);
