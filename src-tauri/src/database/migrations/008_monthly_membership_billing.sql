-- Persistent monthly membership billing ledger.
-- Existing payment/receipt rows remain untouched. Existing members begin ledger
-- billing at cut-over (or after their already-paid legacy coverage ends).

CREATE TABLE IF NOT EXISTS memberships (
    id                 TEXT PRIMARY KEY NOT NULL,
    member_id          TEXT NOT NULL,
    membership_plan_id TEXT NOT NULL,
    enrollment_date    TEXT NOT NULL,
    billing_start_date TEXT NOT NULL,
    agreed_fee         INTEGER NOT NULL CHECK (agreed_fee >= 0),
    status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'paused', 'cancelled', 'terminated')),
    status_changed_at  TEXT NOT NULL,
    ended_at           TEXT,
    created_at         TEXT NOT NULL,
    updated_at         TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    FOREIGN KEY (membership_plan_id) REFERENCES membership_plans(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_one_open_per_member
    ON memberships(member_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memberships_member_history
    ON memberships(member_id, enrollment_date DESC);
CREATE INDEX IF NOT EXISTS idx_memberships_status
    ON memberships(status, ended_at);

CREATE TABLE IF NOT EXISTS monthly_membership_bills (
    id                 TEXT PRIMARY KEY NOT NULL,
    membership_id      TEXT NOT NULL,
    member_id          TEXT NOT NULL,
    membership_plan_id TEXT NOT NULL,
    billing_period     TEXT NOT NULL CHECK (length(billing_period) = 7),
    period_start       TEXT NOT NULL,
    period_end         TEXT NOT NULL,
    due_date           TEXT NOT NULL,
    expected_amount    INTEGER NOT NULL CHECK (expected_amount >= 0),
    paid_amount        INTEGER NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= expected_amount),
    status             TEXT NOT NULL CHECK (status IN ('CURRENT', 'DUE', 'PARTIALLY_PAID', 'PAID')),
    created_at         TEXT NOT NULL,
    updated_at         TEXT NOT NULL,
    FOREIGN KEY (membership_id) REFERENCES memberships(id) ON DELETE RESTRICT,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    FOREIGN KEY (membership_plan_id) REFERENCES membership_plans(id) ON DELETE RESTRICT,
    UNIQUE (membership_id, billing_period)
);

CREATE INDEX IF NOT EXISTS idx_monthly_bills_member_history
    ON monthly_membership_bills(member_id, billing_period DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_bills_period
    ON monthly_membership_bills(billing_period, status);
CREATE INDEX IF NOT EXISTS idx_monthly_bills_outstanding
    ON monthly_membership_bills(member_id, paid_amount, expected_amount);

ALTER TABLE payment_allocations ADD COLUMN monthly_bill_id TEXT REFERENCES monthly_membership_bills(id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_bill_id ON payment_allocations(monthly_bill_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_allocations_payment_bill
    ON payment_allocations(payment_id, monthly_bill_id) WHERE monthly_bill_id IS NOT NULL;

ALTER TABLE payments ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key
    ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL;
