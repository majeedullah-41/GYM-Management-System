-- A deleted member remains as an internal tombstone so historical payments,
-- receipts and revenue reports keep their original member reference.
ALTER TABLE members ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_members_deleted_at ON members(deleted_at);
