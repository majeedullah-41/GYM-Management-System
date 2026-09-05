# Recurring plan-duration billing migration

Migration `008_monthly_membership_billing` is additive. It preserves every existing member,
plan, payment, receipt, and legacy allocation. It adds durable memberships, recurring bills,
bill-linked allocations, and payment idempotency keys.

Migration `009_plan_duration_billing_cycles` snapshots each membership's plan duration. Bills
therefore renew from the enrollment date using the sold plan's exact `duration_days`, rather
than calendar-month boundaries.

## Legacy cut-over

Legacy payments describe duration windows. Plan prices and durations were not snapshotted
historically, so cut-over uses the currently assigned plan as the best available contract.

When an existing member is first opened by a ledger-aware screen:

- the assigned plan is used to create a membership;
- the earliest valid legacy payment start is retained as the enrollment date when available;
- if valid legacy coverage exists, recurring billing starts when that coverage ends;
- otherwise billing starts on the cut-over date;
- legacy payments and their receipts remain visible as immutable transaction history.

New enrollments create the first plan-duration bill immediately. A 1-day plan renews the next
day, a 7-day plan after seven days, and a 30-day plan after 30 days. If the app was closed for
one or more renewal dates, all missed cycles are created the next time billing data is loaded.
Existing allocations retain
their date-window columns for audit compatibility; all new allocations reference a durable bill.

## Lifecycle assumptions

The pre-migration application has archive/reactivate but no pause/freeze interval model.
Archiving therefore closes the active membership on that date. Reactivation creates a new
membership beginning on the reactivation date, so archived periods cannot be back-billed.
Changing plans closes the former membership and opens the selected plan on the change date.

The existing application has no proration rule, so each period is charged at the full agreed
plan fee. Overpayments are rejected because no advance-credit account exists.
All assigned membership plans participate in the recurring ledger, including short-duration
test plans. The plan remains available and active after its current bill is paid.
