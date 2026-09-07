# 13 — ADVANCE MEMBERSHIP PAYMENTS

**Module:** Advance Payments  
**Priority:** P1  
**Status:** Planned  
**Depends On:** Members, Payments, Membership Plans, Receipts  
**Technology:** Tauri + Rust + SQLite

---

# 1. Purpose

Advance Payment allows an existing member to pay membership fees for
upcoming membership periods before those periods arrive.

Example:

Current paid period:

September 2026

Member wants to pay in advance for:

October 2026
November 2026
December 2026

The system receives one payment and marks those upcoming periods as paid.

---

# 2. Scope

This module ONLY handles:

- Selecting upcoming membership periods
- Calculating advance payment amount
- Receiving advance payment
- Recording which future periods were paid
- Updating the member's paid-through date
- Showing advance payment details
- Printing the payment receipt
- Reprinting the receipt

Existing modules remain responsible for:

- Member management
- Membership plans
- Normal payments
- Dues
- Finances
- Receipts
- Reports

Do not duplicate those systems inside this module.

---

# 3. Entry Point

Advance payment should be available from the member's payment area.

Example:

Member Details
    ↓
Receive Payment
    ↓
[ Pay in Advance ]

or:

Payments
    ↓
Select Member
    ↓
[ Pay in Advance ]

Both entry points MUST use the same backend service.

---

# 4. Advance Payment Screen

The screen should be simple.

Example:

┌───────────────────────────────────────────────┐
│ Advance Payment                              │
│                                               │
│ Ali Khan                         MEM-00124    │
│                                               │
│ Paid Through                                 │
│ 30 Sep 2026                                  │
│                                               │
│ Pay Upcoming                                 │
│                                               │
│ [ 1 Month ] [ 3 Months ] [ 6 Months ]        │
│ [ 12 Months ]                                │
│                                               │
│ Months                                       │
│ [ 3 ]                                        │
│                                               │
│ New Coverage                                 │
│ 01 Oct 2026 → 31 Dec 2026                    │
│                                               │
│ Fee                                          │
│ Rs. 2,000 × 3                                │
│                                               │
│ Total                                        │
│ Rs. 6,000                                    │
│                                               │
│ Payment Method                               │
│ [ Cash ▼ ]                                   │
│                                               │
│ Note (Optional)                              │
│ [                                         ]   │
│                                               │
│ [ Cancel ]             [ Pay Rs. 6,000 ]     │
└───────────────────────────────────────────────┘

---

# 5. Period Selection

The receptionist selects how many upcoming periods the member wants to pay.

Quick options:

[ 1 Month ]
[ 3 Months ]
[ 6 Months ]
[ 12 Months ]

Also allow:

Custom:
[ 4 ]

The system calculates everything automatically.

Do NOT require manual entry of future start/end dates.

---

# 6. Advance Start Date

Advance coverage must begin immediately after the member's latest
already-paid membership period.

Example:

Paid Through:

30 Sep 2026

Advance payment:

3 months

Result:

01 Oct 2026 → 31 Dec 2026

If the member is already paid through December:

Paid Through:

31 Dec 2026

and pays another 3 months:

New advance coverage begins after 31 Dec 2026.

The system MUST NOT overlap existing paid periods.

---

# 7. Coverage Calculation

The existing membership-period/date service MUST be used.

Conceptually:

latest_paid_end
    ↓
next_period_start
    ↓
Apply selected number of periods
    ↓
new_paid_through

Example:

Latest Paid:
30 Sep 2026

Periods:
3

Result:

Start:
01 Oct 2026

End:
31 Dec 2026

Do NOT implement separate date-calculation logic specifically for advance
payments.

---

# 8. Amount Calculation

The advance amount is calculated from the existing membership fee.

Example:

Fee:

Rs. 2,000

Advance:

3 periods

Total:

Rs. 6,000

Conceptually:

advance_total =
period_fee × number_of_periods

The backend MUST calculate the authoritative amount.

Frontend calculation is only a preview.

---

# 9. Preview

Changing the number of periods must immediately update:

- Number of periods
- New coverage
- Total amount

Example:

1 Month

01 Oct → 31 Oct

Rs. 2,000

---

3 Months

01 Oct → 31 Dec

Rs. 6,000

---

6 Months

01 Oct → 31 Mar

Rs. 12,000

The preview should update without submitting a payment.

---

# 10. Confirmation

Before creating the payment, show a compact confirmation.

┌──────────────────────────────────────────────┐
│ Confirm Advance Payment                      │
│                                              │
│ Ali Khan                                     │
│                                              │
│ Advance Period                               │
│ 01 Oct 2026 → 31 Dec 2026                    │
│                                              │
│ 3 Months                                     │
│                                              │
│ Amount                                       │
│ Rs. 6,000                                    │
│                                              │
│ Method                                       │
│ Cash                                         │
│                                              │
│ [ Back ]                 [ Confirm Payment ] │
└──────────────────────────────────────────────┘

---

# 11. Backend Request

Conceptually:

AdvancePaymentRequest {
    member_id,
    period_count,
    payment_method,
    note?
}

The frontend should NOT submit authoritative:

coverage_start
coverage_end
total_amount

as trusted business values.

Rust calculates them.

---

# 12. Backend Processing

Required workflow:

Receive Advance Payment Request
        ↓
Load Member
        ↓
Find Latest Paid Period
        ↓
Calculate Next Period
        ↓
Calculate Requested Future Periods
        ↓
Calculate Total
        ↓
Validate
        ↓
BEGIN DATABASE TRANSACTION
        ↓
Create Payment
        ↓
Record Future Paid Periods
        ↓
Generate Receipt
        ↓
COMMIT
        ↓
Return Success

If a critical database operation fails:

ROLLBACK

No partial advance payment should remain.

---

# 13. Database Relationship

Advance payment must retain a relationship between:

Payment
    ↓
Future Membership Periods

Example:

PAY-000582
Rs. 6,000

covers:

October 2026
November 2026
December 2026

Use the existing payment/membership relationship architecture wherever
possible.

Do NOT create a second unrelated payment system specifically for advance
payments.

---

# 14. One Transaction

If a member pays Rs. 6,000 for three upcoming months:

Create:

1 Payment
1 Receipt

covering:

3 Future Periods

Do NOT create:

3 separate payments

and do NOT generate:

3 separate receipts

unless the receptionist actually performs three separate transactions.

---

# 15. Successful Payment

After completion:

┌──────────────────────────────────────────────┐
│ ✓ Advance Payment Received                   │
│                                              │
│ Ali Khan                                     │
│                                              │
│ Paid For                                     │
│ Oct 2026 → Dec 2026                          │
│                                              │
│ 3 Months                                     │
│                                              │
│ Amount                                       │
│ Rs. 6,000                                    │
│                                              │
│ Receipt                                      │
│ RCPT-000582                                  │
│                                              │
│ [ Print Receipt ]              [ Done ]      │
└──────────────────────────────────────────────┘

---

# 16. Member Update

After successful advance payment, the member's payment information must
immediately reflect the new future coverage.

Before:

Paid Through:
30 Sep 2026

After 3-month advance payment:

Paid Through:
31 Dec 2026

The UI should update without requiring an application restart.

---

# 17. Receipt

The existing receipt system must be used.

For advance payments, include:

- Receipt number
- Payment date
- Member
- Member ID
- Advance period
- Number of periods
- Amount
- Payment method

Example:

        SWAT FITNESS

       PAYMENT RECEIPT
--------------------------------

Receipt : RCPT-000582
Date    : 06/09/2026

Member  : Ali Khan
ID      : MEM-00124

Paid For:
Oct 2026 - Dec 2026

3 Months x Rs. 2,000

Amount  : Rs. 6,000
Method  : Cash

--------------------------------
          Thank You

Use the existing 80mm thermal receipt renderer.

Do NOT create another receipt renderer for advance payments.

---

# 18. Historical Price

An advance payment records the amount actually paid at that time.

Example:

September:

Member prepays Oct–Dec at:

Rs. 2,000/month

Payment:

Rs. 6,000

Later the membership fee changes to:

Rs. 2,500/month

The existing advance payment remains:

Rs. 6,000

The already-paid future periods must not be recalculated.

---

# 19. Reprint

Reprinting an advance payment receipt must use the original transaction.

Reprint MUST preserve:

- Original receipt number
- Original payment date
- Original amount
- Original paid periods
- Original payment method

Reprinting MUST NOT create another advance payment.

---

# 20. Duplicate Protection

While payment is being processed:

[ Processing... ]

Disable the confirmation button.

The backend must also validate that the requested future periods have not
already been paid.

Never create overlapping advance coverage because of double-clicking or
duplicate requests.

---

# 21. Existing Future Advance Payments

Example:

Member already paid:

October
November
December

Paid Through:

31 Dec 2026

Member now wants another 3 months.

The system starts from:

01 Jan 2027

and creates:

January
February
March

New Paid Through:

31 Mar 2027

Existing advance coverage must never be overwritten.

---

# 22. No Overlapping Periods

Advance payment must always extend after existing paid coverage.

Invalid:

October → December
+
November → January

Valid:

October → December
+
January → March

Backend validation must prevent overlaps.

---

# 23. Payment Failure

If payment processing fails:

Advance Payment Failed

No payment should be recorded.

No future period should be marked paid.

No receipt should be generated.

The user can safely retry.

---

# 24. Printing Failure

Printing happens AFTER the advance payment has successfully committed.

Correct:

Save Advance Payment
    ↓
Commit
    ↓
Generate/Load Receipt
    ↓
Print

If printer fails:

Payment remains successful.

Future periods remain paid.

User can:

[ Retry Print ]

The payment must never be rolled back because the printer failed.

---

# 25. Service Architecture

Use the existing layered architecture.

Recommended business service:

AdvancePaymentService

Responsibilities:

- Preview advance payment
- Determine next available period
- Calculate future coverage
- Calculate total
- Validate request
- Coordinate payment creation
- Record future coverage

It should reuse existing:

PaymentService
MembershipPeriodService
ReceiptService
Repositories

Do NOT duplicate their responsibilities.

---

# 26. Tauri Commands

Recommended commands:

preview_advance_payment

create_advance_payment

The commands should be thin.

Example:

React
   ↓
Tauri Command
   ↓
AdvancePaymentService
   ↓
Existing Domain Services
   ↓
Repositories
   ↓
SQLite

Business logic must not live inside Tauri command handlers.

---

# 27. Automated Test — One Month

Given:

Paid Through:
30 Sep 2026

Fee:
Rs. 2,000

Advance:
1 month

Expected:

Coverage:
01 Oct → 31 Oct

Amount:
Rs. 2,000

Paid Through:
31 Oct 2026

---

# 28. Automated Test — Three Months

Given:

Paid Through:
30 Sep 2026

Advance:
3 months

Expected:

Coverage:
01 Oct → 31 Dec

Correct total calculated.

---

# 29. Automated Test — Existing Advance

Given:

Paid Through:
31 Dec 2026

Advance:
3 months

Expected:

New coverage begins:
01 Jan 2027

No overlap.

---

# 30. Automated Test — Twelve Months

Advance:

12 months

Expected:

Exactly 12 plan periods are created/covered.

Total equals:

period_fee × 12

---

# 31. Automated Test — Calendar Dates

Test advance periods across:

- January → February
- February → March
- Leap year
- 30-day month
- 31-day month
- December → January

Expected:

Correct calendar-aware dates.

---

# 32. Automated Test — Price Change

Create advance payment at:

Rs. 2,000/month

Then change membership fee.

Expected:

Existing advance payment amount remains unchanged.

Existing paid periods remain unchanged.

Reprinted receipt remains unchanged.

---

# 33. Automated Test — Duplicate Submission

Submit the same advance payment twice rapidly.

Expected:

No duplicate future coverage.

No accidental duplicate payment.

---

# 34. Automated Test — Transaction Failure

Simulate:

Payment created

then:

Future period persistence fails.

Expected:

ROLLBACK

No payment remains.

No future coverage remains.

No receipt remains.

---

# 35. Automated Test — Printing Failure

Advance payment commits successfully.

Printer fails.

Expected:

Payment remains saved.

Future coverage remains paid.

Receipt remains available.

User can reprint.

---

# 36. Frontend Tests

Verify:

[ ] Advance Payment opens correctly
[ ] Member information displays
[ ] Paid Through displays
[ ] Quick month buttons work
[ ] Custom period count works
[ ] Preview updates
[ ] Coverage dates update
[ ] Total updates
[ ] Confirmation works
[ ] Double-click is prevented
[ ] Success screen displays
[ ] Paid Through refreshes
[ ] Print Receipt works
[ ] Errors display professionally

---

# 37. AI AGENT MUST

[ ] Implement only advance-payment functionality
[ ] Reuse existing member system
[ ] Reuse existing membership logic
[ ] Reuse existing payment system
[ ] Reuse existing receipt system
[ ] Reuse existing finance integration
[ ] Reuse existing date calculator
[ ] Start after latest paid coverage
[ ] Support multiple future periods
[ ] Calculate authoritative amount in Rust
[ ] Prevent overlapping coverage
[ ] Prevent duplicate submission
[ ] Preserve historical advance payments
[ ] Use database transactions
[ ] Add automated tests

---

# 38. AI AGENT MUST NOT

[ ] Rebuild the Members module
[ ] Rebuild Membership Plans
[ ] Rebuild normal Payments
[ ] Rebuild Dues
[ ] Rebuild Finances
[ ] Rebuild Reports
[ ] Create another receipt system
[ ] Ask the user to manually enter future dates
[ ] Trust frontend totals
[ ] Create overlapping future periods
[ ] Recalculate historical advance payments
[ ] Generate multiple receipts for one payment
[ ] Create fake future financial transactions
[ ] Put SQL in React
[ ] Skip transaction tests

---

# 39. Definition of Done

Advance Payment is complete when:

[ ] User can open Advance Payment for a member
[ ] Current paid-through date is shown
[ ] 1-month advance works
[ ] 3-month advance works
[ ] 6-month advance works
[ ] 12-month advance works
[ ] Custom period count works
[ ] Future dates calculate automatically
[ ] Amount calculates automatically
[ ] Backend validates amount
[ ] Existing advance coverage is respected
[ ] No overlapping periods occur
[ ] One transaction creates one payment
[ ] One transaction creates one receipt
[ ] Paid-through date updates
[ ] Historical prices remain unchanged
[ ] Reprint works
[ ] Duplicate submission is prevented
[ ] Printing failure does not affect payment
[ ] Database rollback works
[ ] Backend tests pass
[ ] Frontend tests pass
[ ] Integration tests pass

---

# 40. Golden Flow

Member Details
      ↓
Advance Payment
      ↓
Paid Through: 30 Sep 2026
      ↓
Select: 3 Months
      ↓
Preview:
01 Oct → 31 Dec
Rs. 6,000
      ↓
Confirm
      ↓
Rust Recalculates
      ↓
Validate
      ↓
BEGIN TRANSACTION
      ↓
Create One Payment
      ↓
Record 3 Future Paid Periods
      ↓
Create One Receipt
      ↓
COMMIT
      ↓
Paid Through: 31 Dec 2026
      ↓
Print Receipt
      ↓
Done
