-- Add description, reference fields and a payment type column to payments
-- Migration: 004_add_payment_fields

ALTER TABLE payments ADD COLUMN description TEXT;
ALTER TABLE payments ADD COLUMN reference TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_is_voided ON payments(is_voided);
