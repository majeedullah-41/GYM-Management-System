-- Add payment_method, vendor, and soft delete to expenses
-- Migration: 003_add_expense_fields

ALTER TABLE expenses ADD COLUMN payment_method TEXT;
ALTER TABLE expenses ADD COLUMN vendor TEXT;
ALTER TABLE expenses ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE expenses ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_expenses_is_deleted ON expenses(is_deleted);
