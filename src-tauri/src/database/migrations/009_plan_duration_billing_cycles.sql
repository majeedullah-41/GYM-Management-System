-- Bill memberships using the plan duration sold at enrollment rather than calendar months.
-- Snapshotting the duration prevents later plan edits from changing existing contracts.

ALTER TABLE memberships ADD COLUMN billing_cycle_days INTEGER NOT NULL DEFAULT 30
    CHECK (billing_cycle_days > 0);

UPDATE memberships
SET billing_cycle_days = COALESCE(
    (SELECT duration_days FROM membership_plans WHERE membership_plans.id = memberships.membership_plan_id),
    30
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_bills_membership_cycle_start
    ON monthly_membership_bills(membership_id, period_start);
CREATE INDEX IF NOT EXISTS idx_monthly_bills_period_start
    ON monthly_membership_bills(member_id, period_start DESC);
