-- Fix payment start and expiry dates for payments that cover multiple billing periods
UPDATE payments
SET
  membership_start_date = COALESCE((
    SELECT MIN(b.period_start)
    FROM payment_allocations a
    JOIN monthly_membership_bills b ON b.id = a.monthly_bill_id
    WHERE a.payment_id = payments.id
  ), membership_start_date),
  membership_expiry_date = COALESCE((
    SELECT MAX(b.period_end)
    FROM payment_allocations a
    JOIN monthly_membership_bills b ON b.id = a.monthly_bill_id
    WHERE a.payment_id = payments.id
  ), membership_expiry_date)
WHERE EXISTS (
  SELECT 1 FROM payment_allocations a WHERE a.payment_id = payments.id
);
