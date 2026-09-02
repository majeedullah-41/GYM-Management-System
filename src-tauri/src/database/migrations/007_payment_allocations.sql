-- Payment allocations: links each payment to the specific membership
-- period(s) it settles, enabling FIFO settlement of accumulated back-dues
-- across lapsed membership cycles.
-- Migration: 007_payment_allocations

CREATE TABLE IF NOT EXISTS payment_allocations (
    id                     TEXT PRIMARY KEY NOT NULL,
    payment_id             TEXT NOT NULL,
    membership_plan_id     TEXT NOT NULL,
    membership_start_date  TEXT NOT NULL,
    membership_expiry_date TEXT NOT NULL,
    amount                 INTEGER NOT NULL CHECK (amount > 0),
    created_at             TEXT NOT NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_period ON payment_allocations(membership_plan_id, membership_start_date, membership_expiry_date);
