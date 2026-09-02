# 04 — PAYMENTS MODULE

**Module:** Payments
**Priority:** P0 — Critical
**Status:** Planned

---

# 1. Purpose

The Payments module manages all money received from members for
membership fees.

It is responsible for:

- Receiving member payments
- Selecting the member
- Selecting/confirming the membership plan
- Recording the actual amount received
- Recording payment method
- Determining the membership payment period
- Updating membership validity
- Generating a receipt number
- Linking the payment to the receipt
- Making the payment available to the Finances module
- Supporting payment filtering and searching
- Viewing payment history
- Editing/voiding payments according to business rules

The payment module is one of the core modules of the application.

---

# 2. Payment Processing

This section defines the complete workflow that occurs when a member
comes to the gym and pays their membership fee.

The receptionist should be able to complete a normal payment in a
few simple steps.

---

# 3. Normal Payment Workflow

```text
Receptionist
     │
     ▼
Open Payments
     │
     ▼
Search Member
     │
     ▼
Select Member
     │
     ▼
View Membership Summary
     │
     ▼
Click "Receive Payment"
     │
     ▼
Payment Form
     │
     ├── Member
     ├── Membership Plan
     ├── Amount
     ├── Payment Method
     ├── Payment Date
     ├── Payment Period
     └── Optional Note
     │
     ▼
Confirm Payment
     │
     ▼
Backend Validation
     │
     ▼
Calculate Membership Period
     │
     ▼
Database Transaction
     │
     ├── Create Payment
     ├── Update Membership
     └── Generate Receipt Number
     │
     ▼
Commit Transaction
     │
     ▼
Payment Successful
     │
     ├── Print Receipt
     └── Done
4. Step 1 — Search Member

The receptionist starts from the Payments page.

Example:

┌──────────────────────────────────────────────────────────────┐
│ Payments                                      [+ Receive Fee] │
│                                                              │
│ Search member...                                             │
│ [ Ali Khan                              🔍 ]                 │
└──────────────────────────────────────────────────────────────┘

Members can be searched by:

Member name
Member ID
Phone number

Search must support partial matches.

Example:

ali

may return:

Ali Khan
Ali Raza
Muhammad Ali
5. Step 2 — Select Member

After selecting a member, display a summary.

Example:

┌──────────────────────────────────────────────────────────────┐
│ Ali Khan                                      ID: MEM-00124  │
│ Phone: 03XX-XXXXXXX                                         │
│                                                              │
│ Membership                                                   │
│ Monthly Plan                                                 │
│ Status: Active                                               │
│ Expires: 26/08/2026                                          │
│                                                              │
│ Last Payment                                                 │
│ Rs. 2,000 • 27/07/2026                                      │
│                                                              │
│                                      [ Receive Payment ]     │
└──────────────────────────────────────────────────────────────┘

The receptionist should be able to understand the member's current
status before accepting money.

6. Step 3 — Open Receive Payment

Clicking:

[ Receive Payment ]

opens the payment form.

Example:

┌───────────────────────────────────────────────┐
│ Receive Payment                         ✕     │
│                                               │
│ Member                                        │
│ Ali Khan                                      │
│ MEM-00124                                     │
│                                               │
│ Membership Plan                               │
│ [ Monthly Plan ▼ ]                            │
│                                               │
│ Amount                                        │
│ [ Rs. 2,000                              ]    │
│                                               │
│ Payment Method                                │
│ (●) Cash   ( ) Bank   ( ) Other               │
│                                               │
│ Payment Date                                  │
│ [ 27/08/2026 ]                                │
│                                               │
│ Payment For                                   │
│ [ 27 Aug 2026 → 26 Sep 2026 ]                 │
│                                               │
│ Note (Optional)                               │
│ [                                        ]    │
│                                               │
│              [ Cancel ] [ Confirm Payment ]   │
└───────────────────────────────────────────────┘
7. Payment Form Fields
Required
Member
Membership Plan
Amount
Payment Method
Payment Date
Optional
Note
System-generated
Payment ID
Receipt Number
Created At
Updated At

The payment period may be calculated by the system and displayed for
confirmation.

8. Amount

The system should pre-fill the amount from the selected membership
plan.

Example:

Monthly Plan
Price: Rs. 2,000

Amount:
[ Rs. 2,000 ]

The receptionist may change the amount if the gym allows:

Discounts
Partial payments
Special pricing

The actual amount received must always be stored.

9. Amount Difference Warning

If the amount differs from the standard plan price:

Plan Price: Rs. 2,000
Payment:    Rs. 1,500

⚠ Payment amount differs from plan price.

The system should not silently treat Rs. 1,500 as a normal Rs. 2,000
payment.

Whether the receptionist is allowed to continue depends on the gym's
business rules.

10. Payment Method

Initial supported methods:

Cash
Bank
Other

Future methods may include:

Card
JazzCash
Easypaisa

The payment method must be stored with every payment.

11. Payment Date

Default:

Today

The receptionist may select another date if permitted.

Future dates should normally be prevented unless explicitly supported
by the business rules.

12. Payment Period

Every membership payment must have a defined membership period.

Example:

27/08/2026 → 26/09/2026

The system should calculate this from:

Membership plan duration
Current membership expiry
Payment date

The receptionist should not normally have to manually calculate dates.

13. Active Membership Renewal

Example:

Today:
20/08/2026

Current Expiry:
26/08/2026

Payment:
Monthly Plan

The new membership should continue from the current valid period rather
than wasting the remaining days.

Conceptually:

Current membership
20 Aug → 26 Aug

New membership
27 Aug → 26 Sep

The exact date boundary convention must remain consistent throughout the
application.

14. Expired Membership Renewal

Example:

Today:
27/08/2026

Current Expiry:
26/08/2026

When the member pays:

New period:

27/08/2026 → 26/09/2026

The system must not extend the new membership from an already expired
date.

15. Payment Transaction

When the receptionist confirms payment, the frontend calls the Rust
backend.

The frontend must NOT directly access SQLite.

Architecture:

Frontend
   │
   ▼
Tauri Command
   │
   ▼
Payment Service
   │
   ├── Member Service
   ├── Membership Plan Service
   ├── Payment Repository
   └── Membership Repository
   │
   ▼
SQLite
16. Payment Backend Workflow

The Payment Service must perform the following:

1. Validate member
2. Validate membership plan
3. Validate payment amount
4. Validate payment method
5. Validate payment date
6. Determine membership period
7. Generate receipt number
8. Begin database transaction
9. Create payment
10. Update membership
11. Commit transaction
12. Return payment result
17. Database Transaction Requirement

Creating a payment and updating membership must happen inside one
database transaction.

Example:

BEGIN TRANSACTION

Create Payment
       +
Update Membership
       +
Generate/Reserve Receipt Number

COMMIT

If any operation fails:

ROLLBACK

This prevents inconsistent states.

18. Critical Consistency Rule

The application must never produce:

Payment exists
BUT
Membership was not extended

or:

Membership was extended
BUT
Payment does not exist

Both operations must succeed together.

19. Payment Record

Conceptually:

Payment
-------------------------
id
member_id
membership_plan_id
amount
payment_method
payment_date
period_start
period_end
receipt_number
note
created_at
updated_at

The final database schema must be defined in the database specification.

20. Payment Success

After a successful transaction:

✓ Payment Received

Ali Khan
Rs. 2,000
Monthly Membership

27 Aug 2026 → 26 Sep 2026

Receipt #RCPT-000582

[ Print Receipt ]    [ Done ]
21. Receipt Generation

A successful payment must have a receipt number.

Example:

RCPT-000582

The receipt number must be unique.

Receipt generation belongs to the Receipts module, but the payment
workflow must create/link the receipt reference as part of successful
payment processing.

22. Printing Receipt

After successful payment:

[ Print Receipt ]

should open the system's print flow.

The receptionist should not have to manually navigate to the Receipts
module.

The receipt should contain:

Gym Name
Receipt Number
Payment Date
Member Name
Member ID
Membership Plan
Membership Period
Amount
Payment Method
Optional Note
23. Finance Integration

A payment must automatically become income in the Finances module.

The receptionist must NOT enter the same payment again in Finances.

Workflow:

Payment Received
       │
       ▼
Payment Record
       │
       ▼
Finance Income

Example:

Income
+ Rs. 2,000
Membership Payment
Ali Khan
27/08/2026
Cash
24. Dashboard Integration

After successful payment, dashboard values should automatically reflect
the transaction.

For example:

Today's Revenue
Rs. 2,000

and:

Payments Today
1

The dashboard must calculate these values from the underlying data.

It must not maintain a separate financial total.

25. Payment History

The Payments page must show all recorded payments.

Recommended columns:

Receipt #
Member
Plan
Amount
Payment Method
Payment Date
Period
Status
Actions

Example:

RCPT-000582 | Ali Khan | Monthly | Rs. 2,000 | Cash | 27/08/26
26. Payment Filtering

Payments must support filtering by:

Date Range
Member
Payment Method
Membership Plan
Amount
Status

Quick filters:

Today
This Week
This Month
Last Month
Custom
27. Payment Search

Search by:

Member Name
Member ID
Phone
Receipt Number

Search should be fast enough for normal gym usage.

28. Payment Details

Clicking a payment opens its details.

Example:

Payment Details

Receipt:
RCPT-000582

Member:
Ali Khan
MEM-00124

Plan:
Monthly Membership

Amount:
Rs. 2,000

Method:
Cash

Payment Date:
27/08/2026

Membership Period:
27/08/2026 → 26/09/2026

Created:
27/08/2026 10:45 AM
29. Payment Editing

Payments represent financial records.

Therefore, editing must be restricted.

Do not allow unrestricted modification of:

Amount
Payment Date
Member
Receipt Number

without considering financial consistency.

Preferred approach:

Normal payment
     ↓
Immutable financial record
     ↓
Correction through void/refund/adjustment

The exact correction workflow should be defined separately.

30. Payment Void

A payment may need to be voided because of:

Wrong member
Wrong amount
Duplicate entry
Incorrect payment
Data-entry mistake

Voiding must NOT simply delete the database row.

Instead:

Payment
Status: VOIDED

and preserve the original record.

31. Payment Deletion

Normal users should NOT permanently delete completed payments.

Financial history must remain auditable.

If deletion is ever required for administrative purposes, it must be
explicitly protected and documented.

32. Duplicate Payment Protection

The system should prevent accidental duplicate submissions.

Example:

Receptionist double-clicks:

[ Confirm Payment ]

The backend must not create two payments accidentally.

The UI should disable the button while processing.

The backend should also protect against duplicate submission where
practical.

33. Processing State

After clicking Confirm:

[ Processing... ]

The button should become disabled.

The user must not be able to submit the same payment multiple times.

34. Error Handling

If payment processing fails:

Payment could not be completed.

No changes were made.

[ Retry ]

If the transaction fails, the database must roll back.

35. Payment Workflow Errors

Possible errors:

Member not found
Membership plan not found
Invalid amount
Invalid payment method
Invalid payment date
Database error
Receipt generation error
Membership update error

Errors should be displayed in human-readable language.

Do not expose raw SQLite errors to the receptionist.

36. Payment Workflow — Complete Example

Member:

Ali Khan
MEM-00124

Current membership:

Monthly
Expires:
26/08/2026

Today:

27/08/2026

Receptionist:

Search Ali
     ↓
Select Ali
     ↓
Click Receive Payment
     ↓
Amount = Rs. 2,000
     ↓
Method = Cash
     ↓
Confirm

Backend:

Validate Ali
     ↓
Validate Monthly Plan
     ↓
Validate Rs. 2,000
     ↓
Calculate:
27/08/2026 → 26/09/2026
     ↓
BEGIN TRANSACTION
     ↓
Create Payment
     ↓
Update Membership
     ↓
Generate Receipt Number
     ↓
COMMIT

Result:

Payment:
Rs. 2,000

Membership:
27/08/2026 → 26/09/2026

Receipt:
RCPT-000582

Finance:
+ Rs. 2,000

Dashboard:
Revenue updated

Then:

[ Print Receipt ]
37. Payment Service Responsibility

The Payment Service owns the payment workflow.

It coordinates:

Payment
Membership
Membership Plan
Receipt Reference
Finance Integration

It must not contain:

UI logic
React state
Printing implementation
Report rendering
38. Payment Repository Responsibility

The repository handles database operations such as:

Create payment
Get payment
List payments
Filter payments
Find payment by receipt number
Find payments by member
Update payment status

The repository should not decide business rules.

39. Payment Domain Responsibility

Business rules belong in the domain/service layer.

Examples:

Calculate membership period
Validate payment amount
Validate payment state
Determine renewal start date
Handle expired membership
Handle active membership
40. Frontend Responsibility

The frontend handles:

Payment screen
Member search
Payment form
Validation feedback
Loading states
Confirmation
Success state
Receipt print action
Payment list
Filters
Payment details

The frontend must not calculate authoritative membership dates or
financial totals.

41. Automated Tests — Payment Processing

Every payment feature must have automated tests.

Minimum tests:

[ ] Payment can be created
[ ] Payment requires valid member
[ ] Payment requires valid plan
[ ] Payment requires valid amount
[ ] Payment requires valid method
[ ] Payment requires valid date
[ ] Active membership renewal works
[ ] Expired membership renewal works
[ ] Membership period is calculated correctly
[ ] Payment and membership update are atomic
[ ] Failed transaction rolls back
[ ] Receipt number is generated
[ ] Receipt number is unique
[ ] Duplicate submission is prevented
[ ] Payment appears in history
[ ] Payment filters work
[ ] Payment search works
[ ] Voided payment remains in history
42. Critical Integration Tests

Test:

Receive Payment
      ↓
Payment Created
      ↓
Membership Updated
      ↓
Receipt Available
      ↓
Finance Updated
      ↓
Dashboard Updated

This entire workflow must be covered by integration tests.

43. Payment Processing Definition of Done

The payment feature is complete only when:

[ ] Receptionist can search member
[ ] Receptionist can select member
[ ] Current membership is displayed
[ ] Receive Payment form works
[ ] Plan is preselected
[ ] Amount is prefilled
[ ] Payment method works
[ ] Payment date works
[ ] Payment period is calculated automatically
[ ] Active membership renewal works
[ ] Expired membership renewal works
[ ] Payment is validated
[ ] Payment is stored
[ ] Membership is updated
[ ] Receipt number is generated
[ ] Receipt can be printed
[ ] Finance reflects payment
[ ] Dashboard reflects payment
[ ] Payment history works
[ ] Search works
[ ] Filtering works
[ ] Duplicate submission is prevented
[ ] Failed transactions roll back
[ ] Completed payments are protected from deletion
[ ] Void workflow works
[ ] Automated tests pass
[ ] Integration tests pass

44. Golden Rule

A successful member payment must result in one consistent business
operation:

             MEMBER PAYS
                  │
                  ▼
             PAYMENT CREATED
                  │
          ┌───────┼────────┐
          ▼       ▼        ▼
     MEMBERSHIP RECEIPT  FINANCE
       UPDATED   CREATED   UPDATED
          │       │        │
          └───────┼────────┘
                  ▼
              DASHBOARD

The receptionist performs the payment once.

The system handles the consequences automatically.

No duplicate data entry.
No manual finance entry.
No manual membership extension.
No manual receipt numbering.
No separate dashboard update.


### One important architectural correction

I'd also make one rule explicit across your whole project:

**`Payments` is the source of truth for membership fee income.**

So:

```text
Payment
   ├── affects Membership
   ├── produces Receipt
   ├── contributes to Finances
   └── contributes to Dashboard/Reports

But Finances should not create a second payment record.

And Dashboard should not store revenue separately.