-- Migration: 014_payment_month

ALTER TABLE payments ADD COLUMN payment_month TEXT;
