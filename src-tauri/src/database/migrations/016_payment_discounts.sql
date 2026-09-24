-- Per-period payment discounts.
--
-- Runs with PRAGMA foreign_keys = OFF (see migrations/mod.rs) because the
-- payments table is rebuilt to relax the amount CHECK from `> 0` to `>= 0`,
-- allowing a 0-cash "forgiveness" payment that only grants discounts.

-- 1) Forgiven amount per billing period (denormalized for cheap outstanding math).
ALTER TABLE monthly_membership_bills ADD COLUMN discount_amount INTEGER NOT NULL DEFAULT 0;

-- 2) Rebuild payments: keep all existing columns + indexes, add discount_amount,
--    allow amount = 0.
CREATE TABLE payments_new (
    id                     TEXT PRIMARY KEY NOT NULL,
    receipt_number         TEXT UNIQUE NOT NULL,
    member_id              TEXT NOT NULL,
    amount                 INTEGER NOT NULL CHECK (amount >= 0),
    payment_method         TEXT NOT NULL,
    payment_date           TEXT NOT NULL,
    membership_plan_id     TEXT NOT NULL,
    membership_start_date  TEXT NOT NULL,
    membership_expiry_date TEXT NOT NULL,
    notes                  TEXT,
    is_voided              INTEGER NOT NULL DEFAULT 0,
    voided_at              TEXT,
    void_reason            TEXT,
    description            TEXT,
    reference              TEXT,
    idempotency_key        TEXT,
    payment_month          TEXT,
    discount_amount        INTEGER NOT NULL DEFAULT 0,
    created_at             TEXT NOT NULL,
    updated_at             TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    FOREIGN KEY (membership_plan_id) REFERENCES membership_plans(id) ON DELETE RESTRICT
);

INSERT INTO payments_new (
    id, receipt_number, member_id, amount, payment_method, payment_date,
    membership_plan_id, membership_start_date, membership_expiry_date, notes,
    is_voided, voided_at, void_reason, description, reference, idempotency_key,
    payment_month, discount_amount, created_at, updated_at
)
SELECT id, receipt_number, member_id, amount, payment_method, payment_date,
    membership_plan_id, membership_start_date, membership_expiry_date, notes,
    is_voided, voided_at, void_reason, description, reference, idempotency_key,
    payment_month, 0, created_at, updated_at
FROM payments;

DROP TABLE payments;
ALTER TABLE payments_new RENAME TO payments;

CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key
    ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 3) Per-payment/per-bill discount attribution for audit + void reversal.
CREATE TABLE IF NOT EXISTS payment_discounts (
    id             TEXT PRIMARY KEY NOT NULL,
    payment_id     TEXT NOT NULL,
    monthly_bill_id TEXT NOT NULL,
    member_id      TEXT NOT NULL,
    amount         INTEGER NOT NULL CHECK (amount >= 0),
    created_at     TEXT NOT NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
    FOREIGN KEY (monthly_bill_id) REFERENCES monthly_membership_bills(id) ON DELETE RESTRICT,
    UNIQUE (payment_id, monthly_bill_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_discounts_payment
    ON payment_discounts(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_discounts_bill
    ON payment_discounts(monthly_bill_id);