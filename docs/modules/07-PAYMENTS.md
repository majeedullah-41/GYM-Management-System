# Payments Module

**Module:** Payments  
**Priority:** P0 — Critical  
**Status:** Planned  
**Route:** `/payments`

---

# 1. Purpose

The Payments module manages money received from gym members.

It is responsible for:

- Recording payments
- Viewing payment history
- Searching payments
- Filtering payments
- Editing payment records where permitted
- Voiding payments
- Linking payments to members
- Linking payments to memberships
- Generating receipts
- Reprinting receipts

Payments are one of the application's primary sources of financial data.

---

# 2. Core Principle

A payment represents actual money received by the gym.

```text
Member
   ↓
Payment
   ↓
Finance
   ↓
Reports
   ↓
Receipt
```

The payment record is the authoritative source for money received.

# 3. Payment Lifecycle

Basic lifecycle:

New Payment
    ↓
Validation
    ↓
Save Payment
    ↓
Generate Receipt
    ↓
Payment becomes part of Finance
    ↓
Payment appears in Reports

If a payment is later invalidated:

Payment
   ↓
Void
   ↓
Excluded from active financial totals

The historical record should remain.

# 4. Payment Screen

Recommended layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Payments                                      [ + Receive ]   │
│ Track money received from members                             │
│                                                              │
│ [ Search payments... ] [ Date ▼ ] [ Method ▼ ] [ Status ▼ ] │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Date │ Receipt │ Member │ Method │ Amount │ Status │ ... │ │
│ ├──────┼─────────┼────────┼────────┼────────┼────────┼─────┤ │
│ │ ...  │ ...     │ ...    │ Cash   │ 2,000  │ Paid   │ ... │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

# 5. Receive Payment

Primary action:

[ + Receive Payment ]

This opens the payment form.

# 6. Payment Form

Required fields:

Member
Amount
Payment Method
Payment Date

Optional:

Membership Plan
Description
Reference Number
Notes

# 7. Payment Form Example

```text
┌─────────────────────────────────────────────┐
│ Receive Payment                             │
│                                             │
│ Member *                                    │
│ [ Ahmad Khan                         ▼ ]    │
│                                             │
│ Amount *                                    │
│ [ Rs. 2,000 ]                               │
│                                             │
│ Payment Method *                            │
│ [ Cash                              ▼ ]     │
│                                             │
│ Payment Date *                              │
│ [ 26 Aug 2026 ]                             │
│                                             │
│ Membership                                  │
│ [ Monthly Membership                 ▼ ]    │
│                                             │
│ Description                                 │
│ [ Monthly membership payment         ]      │
│                                             │
│ Reference                                   │
│ [                                  ]        │
│                                             │
│ Notes                                       │
│ [                                  ]        │
│                                             │
│              [ Cancel ] [ Receive Payment ] │
└─────────────────────────────────────────────┘
```

# 8. Required Fields

Required:

Member
Amount
Payment Method
Payment Date

Optional:

Membership
Description
Reference
Notes

Do not make unnecessary fields mandatory.

# 9. Member Selection

The payment must be associated with an existing member.

Provide searchable member selection.

Example:

[ Search member... ]

Ahmad Khan
MEM-00125

Bilal Khan
MEM-00126

# 10. Do Not Create Members Inside Payment Form

The initial payment form should NOT contain a complicated member creation workflow.

If the member does not exist:

[ Add Member ]

may navigate/open the Members workflow.

Keep member creation logic inside the Members module.

# 11. Amount

Amount must be:

Positive
Greater than zero
Numeric
Within supported database limits

Invalid:

0
-500
abc

# 12. Amount Validation

Example:

Amount
[ -500 ]

Error:
Amount must be greater than zero.

Do not allow invalid financial records into the database.

# 13. Decimal Amounts

The application should define whether fractional currency amounts are supported.

Recommended for the initial gym application:

Whole PKR amounts

If decimals are supported, the rule must be globally defined.

Do not let individual modules make different decisions.

# 14. Money Storage

Do NOT store money as floating-point values.

Avoid:

f64
REAL

for authoritative monetary values.

Recommended:

Integer minor units

or another exact representation defined by the database specification.

For PKR whole-rupee payments, integer rupees may be sufficient.

The final decision belongs in:

DATABASE-SPECIFICATION.md

# 15. Payment Method

Initial payment methods:

Cash
Bank Transfer
Card
Other

The exact list should be centralized.

Do not hard-code payment methods in multiple components.

# 16. Payment Method Rules

Payment method must be one of the supported values.

Invalid:

Bitcoin
Unknown Method
Random text

unless explicitly supported by Settings/configuration.

# 17. Payment Date

Default:

Today's date

The user may select another date if historical payments need to be entered.

# 18. Future Payment Dates

The application should define whether future payment dates are allowed.

Recommended:

Future dates:
Not allowed by default

If required later, this can become a configurable business rule.

# 19. Historical Payments

Historical payments should be supported.

Example:

Payment Date:
15 Aug 2026

even if entered on:

26 Aug 2026

These are different concepts:

Payment Date = when money was received
Created At   = when record was entered

Both may be stored.

# 20. Created At

Every payment should have a system-generated creation timestamp.

Example:

Payment Date:
15 Aug 2026

Created:
26 Aug 2026 10:32 AM

The user should not manually control created_at.

# 21. Updated At

If editable payment fields exist, maintain:

updated_at

This should be managed by the backend.

# 22. Payment ID

Every payment must have a unique internal ID.

Example:

PAY-000456

The exact ID strategy is defined globally.

# 23. Receipt Number

A successful payment may have an associated receipt number.

Example:

Payment:
PAY-000456

Receipt:
RCPT-000123

Receipt numbering belongs to the Receipts module.

# 24. Payment Description

Optional description.

Examples:

Monthly membership
Annual membership
Registration fee
Personal training
Other

Do not force users to enter descriptions for normal membership payments.

# 25. Reference Number

Optional.

Useful for:

Bank transfers
Card transactions
External references

Example:

Reference:
TXN-827364

# 26. Notes

Optional internal notes.

Example:

Member paid remaining balance.

Notes are for staff and should not automatically appear on receipts unless explicitly configured.

# 27. Membership Association

A payment may be associated with a membership.

Example:

Member:
Ahmad Khan

Plan:
Monthly

Payment:
Rs. 2,000

The relationship must be explicit.

Do not infer membership from the payment description.

# 28. Payment vs Membership

A payment and membership are separate entities.

Member
   │
   ├── Membership
   │
   └── Payment

A payment records money.

A membership records membership validity.

Do not merge the two concepts.

# 29. Membership Payment Workflow

Example:

Member
   ↓
Select Membership Plan
   ↓
Determine Amount
   ↓
Receive Payment
   ↓
Create Payment
   ↓
Activate/extend Membership
   ↓
Generate Receipt

The exact membership activation rules belong to:

MEMBERSHIP-PLANS.md

# 30. Payment Amount vs Plan Price

Do not assume:

Payment Amount = Plan Price

The gym may have:

Discounts
Partial payments
Special pricing
Manual adjustments

Therefore the payment amount must be explicitly recorded.

# 31. Partial Payment

If supported, a member may pay less than the expected membership amount.

Example:

Plan Price:
Rs. 2,000

Paid:
Rs. 1,000

Whether this activates/extends the membership is a business rule.

Do NOT automatically assume it does.

# 32. Overpayment

If a member pays more than expected:

Plan Price:
Rs. 2,000

Paid:
Rs. 2,500

The system must not silently modify the payment.

The business rule should determine whether the extra amount is:

Accepted as payment
Credit
Adjustment
Invalid

# 33. Discounts

If discounts are supported, store the financial values explicitly.

Example:

Original Price:
Rs. 2,000

Discount:
Rs. 200

Amount Paid:
Rs. 1,800

Do not derive historical financial values from a plan's current price.

# 34. Historical Accuracy

If a membership plan changes from:

Rs. 2,000

to:

Rs. 2,500

old payments must still show:

Rs. 2,000

Their historical amount must never change.

# 35. Payment Status

Initial statuses:

Valid
Voided

The exact enum names should be defined centrally.

# 36. Valid Payment

A valid payment:

Counts toward income
Appears in financial totals
Appears in reports
Has a receipt

# 37. Voided Payment

A voided payment:

Remains in database
Remains in history
Does NOT count toward active income
Is clearly marked VOIDED

# 38. Do Not Delete Financial History

Avoid permanent deletion of payments.

Do NOT provide:

DELETE PAYMENT

as a normal operation.

Instead:

Void Payment

This preserves financial history.

# 39. Voiding a Payment

Voiding should require confirmation.

Example:

Void Payment?

Rs. 2,000
Ahmad Khan
RCPT-000123

This payment will no longer count toward financial totals.

[ Cancel ] [ Void Payment ]

# 40. Void Reason

Recommended:

Reason:
[ Duplicate payment                    ]

Optional predefined reasons:

Duplicate
Wrong amount
Wrong member
Refunded
Other

# 41. Void Timestamp

Store:

voided_at

when a payment is voided.

# 42. Void User

If user accounts exist, store:

voided_by

Otherwise this can be added later.

# 43. Editing Payments

Payment editing must be carefully controlled because payments affect financial records.

Recommended approach:

Allow editing:

Description
Reference
Notes

Potentially allow correction of:

Member
Amount
Payment Method
Payment Date

only with explicit confirmation/audit handling.

# 44. Recommended Correction Strategy

For high-integrity financial records:

Incorrect Payment
       ↓
Void Original
       ↓
Create Correct Payment

Example:

Original:
Rs. 5,000
Wrong member

       ↓

Void

       ↓

Correct:
Rs. 5,000
Correct member

This preserves history.

# 45. Payment Details

Clicking a payment should open:

Payment Details

Payment ID
Receipt Number
Member
Amount
Payment Method
Payment Date
Membership
Description
Reference
Notes
Status
Created At
Updated At

# 46. Payment Actions

For a valid payment:

View
Print Receipt
Edit
Void

For a voided payment:

View
View/Print Receipt

Editing should generally be restricted.

# 47. Search

Search payments by:

Member name
Member ID
Payment ID
Receipt number
Reference number
Description

# 48. Search Behavior

Search should be:

Case-insensitive
Partial-match friendly
Fast

Example:

Search:
Ahmad

should find:

Ahmad Khan
Muhammad Ahmad

where appropriate.

# 49. Filters

Recommended filters:

Date
Date range
Payment method
Status
Member
Membership plan

# 50. Date Filter

Presets:

Today
This Week
This Month
Last Month
This Year
Custom

# 51. Payment Method Filter

Example:

Method:
[ All ▼ ]

All
Cash
Bank Transfer
Card
Other

# 52. Status Filter

Example:

Status:
[ All ▼ ]

All
Valid
Voided

# 53. Member Filter

Allow searching/selecting a member.

Example:

Member:
[ Ahmad Khan ▼ ]

# 54. Membership Plan Filter

Example:

Plan:
[ Monthly ▼ ]

Useful for analyzing revenue by membership plan.

# 55. Combined Filters

Filters must combine using AND logic.

Example:

Date:
August 2026

Method:
Cash

Status:
Valid

means:

August
AND Cash
AND Valid

# 56. Payment Table

Recommended columns:

Date
Receipt
Member
Membership
Method
Amount
Status
Actions

# 57. Table Behavior

The table should support:

Sorting
Filtering
Pagination
Row actions
Responsive horizontal scrolling

# 58. Amount Column

Amounts should be right-aligned.

Example:

Rs. 2,000
Rs. 15,500
Rs. 250,000

# 59. Status Display

Valid:

Paid

Voided:

Voided

Use both:

Text
Visual status indicator

Do not rely only on color.

# 60. Payment Summary

At the top of Payments, useful KPIs:

Today's Income
This Month
Payment Count
Average Payment

These KPIs must use the same financial logic as Finances.

# 61. KPI Example
```text
┌───────────────┐
│ Today's Income│
│ Rs. 12,500    │
└───────────────┘

┌───────────────┐
│ This Month    │
│ Rs. 250,000   │
└───────────────┘

┌───────────────┐
│ Payments      │
│ 96            │
└───────────────┘
```

Do not overload the screen with too many cards.

# 62. Payment Creation Flow
Open Receive Payment
        ↓
Select Member
        ↓
Enter Amount
        ↓
Select Method
        ↓
Select Date
        ↓
Optional Details
        ↓
Validate
        ↓
Save Transaction
        ↓
Generate Receipt
        ↓
Show Receipt Preview

# 63. Transaction Atomicity

Payment creation and any related membership update must be handled safely.

If the workflow requires:

Create Payment
+
Extend Membership

both operations must succeed together where appropriate.

Avoid:

Payment saved
Membership update fails

without a clear recovery/transaction strategy.

# 64. Database Transaction

For operations affecting multiple records:

BEGIN TRANSACTION

Create Payment
Update Membership

COMMIT

If something fails:

ROLLBACK

The exact implementation belongs in the Rust database/service layer.

# 65. Backend Responsibilities

Backend owns:

Validation
Payment creation
Payment updates
Payment voiding
Payment lookup
Payment filtering
Financial state
Membership association
Receipt association

# 66. Frontend Responsibilities

Frontend owns:

Forms
Tables
Filters
Dialogs
Loading states
Validation display
Error display
Receipt preview

The frontend must not be the source of truth.

# 67. Tauri Architecture

Recommended:

React Frontend
      ↓
Tauri Commands
      ↓
Payment Service
      ↓
Domain Logic
      ↓
Repositories
      ↓
SQLite

# 68. Repository Responsibilities

Payment repository should handle persistence operations such as:

create
find_by_id
find_by_member
list
update
void
count

Do not put business rules inside SQL queries unless they are strictly data-access concerns.

# 69. Service Responsibilities

Payment service handles:

Create payment
Validate payment
Associate member
Apply business rules
Create/associate receipt
Handle membership interaction
Void payment

# 70. No Direct SQLite From UI

Never:

React
 ↓
SQL

Always:

React
 ↓
Tauri IPC
 ↓
Rust Service
 ↓
Repository
 ↓
SQLite

# 71. Payment DTO

Frontend should receive safe DTOs.

Conceptually:

```json
PaymentDTO {
    id
    receipt_number
    member_id
    member_name
    membership_id
    amount
    payment_method
    payment_date
    description
    reference
    notes
    status
    created_at
}
```

Do not expose unnecessary internal database details.

# 72. Create Payment Request

Conceptually:

```json
CreatePaymentRequest {
    member_id
    membership_id?
    amount
    payment_method
    payment_date
    description?
    reference?
    notes?
}
```

The backend generates:

payment_id
receipt_number
created_at
status

# 73. Update Payment Request

Only fields that are safely editable should be exposed.

Example:

```json
UpdatePaymentRequest {
    description?
    reference?
    notes?
}
```

If financial fields are editable, they require additional business rules and tests.

# 74. Validation Errors

Backend should return structured errors.

Examples:

MemberNotFound
InvalidAmount
InvalidPaymentMethod
InvalidPaymentDate
PaymentNotFound
PaymentAlreadyVoided
MembershipNotFound

Frontend maps these into friendly messages.

# 75. User-Friendly Errors

Instead of:

FOREIGN KEY constraint failed

show:

The selected member could not be found.
Please select a valid member.

# 76. Duplicate Submission Prevention

When user clicks:

[ Receive Payment ]

disable the button while processing.

Prevent:

Double click
     ↓
Two payments

# 77. Idempotency

The backend should protect against accidental duplicate requests where practical.

At minimum:

Frontend disables submit
Backend validates request
Database constraints protect uniqueness

# 78. Payment Confirmation

For normal payments:

Member:
Ahmad Khan

Amount:
Rs. 2,000

Method:
Cash

[ Cancel ] [ Confirm Payment ]

This gives staff a final opportunity to catch mistakes.

# 79. Success State

After successful payment:

Payment received successfully.

Receipt #RCPT-000123

Then:

[ Print Receipt ]
[ Done ]

# 80. Failed Payment

If save fails:

Payment could not be recorded.

No payment was created.

Do not show a successful receipt.

# 81. Receipt Integration

After payment creation:

Payment Service
      ↓
Receipt Service
      ↓
Receipt Number
      ↓
Receipt Preview

See:

07-RECEIPTS.md

for detailed receipt behavior.

# 82. Payment → Finance

Valid payments contribute to income.

Payment
Amount = Rs. 2,000
Status = Valid

        ↓

Finance Income
+ Rs. 2,000

# 83. Payment → Finance After Void

If payment is voided:

Payment
Amount = Rs. 2,000
Status = Voided

        ↓

Active Finance Income
No longer includes Rs. 2,000

# 84. Payment → Reports

Valid payments appear in:

Weekly Reports
Monthly Reports
Payment Reports
Financial Reports

Voided payments follow the report status rules.

# 85. Payment → Dashboard

Dashboard payment KPIs must use the same payment rules.

Example:

Today's Payments
=
Valid payments received today

# 86. Payment Tests — Creation

Test:

Member exists
Amount = Rs. 2,000
Method = Cash
Date = today

Expected:

Payment created
Status = Valid
Payment ID exists
Receipt number exists

# 87. Payment Test — Invalid Member

Attempt payment with nonexistent member.

Expected:

Payment rejected
No payment created

# 88. Payment Test — Invalid Amount

Test:

0
-500
invalid text

Expected:

Payment rejected

# 89. Payment Test — Invalid Method

Use unsupported payment method.

Expected:

Payment rejected

# 90. Payment Test — Historical Date

Create payment with:

Payment Date:
15 Aug 2026

Expected:

Payment date = 15 Aug 2026
Created at = actual creation timestamp

# 91. Payment Test — Void

Create payment.

Void it.

Expected:

Status = Voided
Voided timestamp exists
Payment remains in database

# 92. Payment Test — Double Void

Void payment twice.

Expected:

Second void operation rejected safely.

# 93. Payment Test — Duplicate Submit

Attempt same payment request twice rapidly.

Expected:

No accidental duplicate transaction

# 94. Payment Test — Finance

Create:

Rs. 2,000 payment

Expected:

Finance income increases by Rs. 2,000

Void payment.

Expected:

Finance income returns to previous value

# 95. Payment Test — Reports

Create payment within report period.

Expected:

Payment appears in report.

Void it.

Expected:

Payment excluded from active totals.

# 96. Payment Test — Receipt

Create payment.

Expected:

Receipt exists
Receipt references correct payment
Receipt amount = payment amount

# 97. Payment Test — Reprint

Print receipt twice.

Expected:

Same payment
Same receipt number
No additional payment

# 98. Frontend Tests

Test:

[ ] Payment page renders
[ ] Payment table renders
[ ] Search works
[ ] Date filters work
[ ] Method filter works
[ ] Status filter works
[ ] Member filter works
[ ] Receive Payment form opens
[ ] Member selection works
[ ] Amount validation works
[ ] Payment method selection works
[ ] Date selection works
[ ] Optional fields work
[ ] Submit button disables while saving
[ ] Success state works
[ ] Error state works
[ ] Confirmation dialog works
[ ] Void dialog works
[ ] Payment details work
[ ] Receipt action works

# 99. Integration Tests

Test complete workflow:

Create Member
      ↓
Receive Payment
      ↓
Payment saved
      ↓
Membership updated where applicable
      ↓
Receipt created
      ↓
Finance updated
      ↓
Dashboard updated
      ↓
Report updated

# 100. Data Integrity Tests

Verify:

Payment references valid member
Payment amount is valid
Payment method is valid
Payment status is valid
Receipt references correct payment
Voided payment remains historical
Financial totals remain consistent

# 101. UI/UX Requirements

The Payments screen should feel like a professional business application.

Use:

Clear page hierarchy
KPI cards
Professional typography
Dense but readable table
Consistent spacing
Clear primary action
Subtle status indicators
Predictable forms

Avoid:

Excessive gradients
Huge cards
Random colors
Excessive animations
Decorative UI without purpose

# 102. Payment Table UX

The table should prioritize scanning.

Recommended:

Date
Member
Amount
Method
Status
Receipt
Actions

The amount should be visually easy to scan.

# 103. Empty State

If no payments exist:

No payments yet.

Payments received from members will appear here.

[ Receive Payment ]

If filters return no results:

No payments match your filters.

Try changing the date range or filters.

# 104. Loading State

Initial page:

Loading payments...

Avoid displaying fake payment rows.

# 105. Error State

Example:

Unable to load payments.

Please try again.

[ Retry ]

# 106. Pagination

If payment count becomes large, use pagination.

Example:

Showing 1–50 of 1,248 payments

[ Previous ] [ 1 ] [ 2 ] [ 3 ] [ Next ]

The backend should handle pagination.

Do not load thousands of rows unnecessarily into the frontend.

# 107. Sorting

Useful sorting:

Payment Date
Amount
Member
Receipt Number

Default:

Newest payment first

# 108. Performance

Filtering and sorting should preferably happen at the database/query layer.

Avoid loading the entire payments table and filtering it entirely in React.

# 109. Offline Requirement

Payments must work without internet access.

Required:

Create payment
View payments
Search
Filter
Edit allowed fields
Void
Generate receipt
Reprint receipt

must all work offline.

# 110. Backup Consideration

Payments are critical business data.

The application should eventually provide a database backup mechanism.

The backup system is defined in:

SETTINGS.md

or the application's data-management documentation.

# 111. Auditability

Financial records should be traceable.

At minimum maintain:

created_at
updated_at
status
voided_at

Additional user tracking may be added if authentication is implemented.

# 112. Implementation Order

Implement in this order:

Define Payment domain model
Define payment database schema
Add database constraints
Implement Payment Repository
Implement Payment Service
Implement validation
Add backend unit tests
Implement Tauri commands
Implement frontend payment types
Implement payment table
Implement search
Implement filters
Implement Receive Payment form
Implement confirmation
Connect payment creation
Connect membership update logic
Connect receipt generation
Connect Finance
Implement payment details
Implement voiding
Add frontend tests
Add integration tests
Test duplicate submission
Test financial consistency
Test with realistic data
Polish UI

# 113. Definition of Done

The Payments module is complete when:

[ ] Payments can be created
[ ] Member is required
[ ] Amount is validated
[ ] Payment method is validated
[ ] Payment date is validated
[ ] Historical payments are supported
[ ] Payment IDs are unique
[ ] Receipt numbers are unique
[ ] Payment details can be viewed
[ ] Payments can be searched
[ ] Payments can be filtered
[ ] Payments can be sorted
[ ] Payments can be paginated
[ ] Valid payments contribute to Finance
[ ] Valid payments appear in Reports
[ ] Valid payments appear in Dashboard KPIs
[ ] Payments can be voided
[ ] Voided payments remain historical
[ ] Voided payments are excluded from active financial totals
[ ] Void reason is stored if implemented
[ ] Receipt can be generated
[ ] Receipt can be printed
[ ] Receipt can be reprinted
[ ] Reprinting does not create another payment
[ ] Duplicate submission is prevented
[ ] Backend validation exists
[ ] Frontend validation exists
[ ] Backend tests pass
[ ] Frontend tests pass
[ ] Integration tests pass
[ ] Finance consistency tests pass
[ ] Report consistency tests pass
[ ] No direct SQLite access exists in frontend
[ ] No mock payment data remains
[ ] Existing tests still pass

# 114. AI Coding Rules

Before modifying Payments, the AI agent MUST read:

[ ] ARCHITECTURE.md
[ ] DATABASE-SPECIFICATION.md
[ ] UI-UX-SYSTEM.md
[ ] MEMBERS.md
[ ] MEMBERSHIP-PLANS.md
[ ] FINANCES.md
[ ] RECEIPTS.md
[ ] REPORTS.md

The AI agent MUST:

[ ] Treat payments as financial records
[ ] Validate all payment input in Rust
[ ] Use repository/service architecture
[ ] Use database transactions where multiple records change
[ ] Preserve historical payment data
[ ] Use void instead of normal deletion
[ ] Reuse global money formatting
[ ] Reuse global date formatting
[ ] Reuse centralized payment methods
[ ] Reuse membership business rules
[ ] Reuse finance calculation rules
[ ] Add automated tests for every behavior
[ ] Test failure paths
[ ] Test duplicate submission
[ ] Test voiding
[ ] Test receipt integration
[ ] Test Finance consistency
[ ] Test Reports consistency

The AI agent MUST NOT:

[ ] Delete payments as normal CRUD
[ ] Calculate authoritative financial totals in React
[ ] Generate receipt numbers in React
[ ] Modify historical payment amounts silently
[ ] Invent membership rules
[ ] Duplicate finance calculations
[ ] Put SQL in frontend code
[ ] Hard-code payment methods everywhere
[ ] Hard-code currency
[ ] Use mock payments in production
[ ] Skip tests
[ ] Create unnecessary payment features

# 115. Final Principle

Payments are financial records, not ordinary CRUD data.

The correct relationship is:

```text
                 MEMBER
                   │
                   ▼
                PAYMENT
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
       RECEIPT   FINANCE   REPORTS
                    │
                    ▼
                DASHBOARD
```

The most important invariant is:

One real payment
       ↓
One payment record
       ↓
One financial transaction
       ↓
One receipt identity
       ↓
Many possible reprints

Printing a receipt must never create another payment.

Voiding a payment must never erase its history.

Changing a membership plan price must never change an old payment.

And the same payment data must produce consistent results across:

Payments
Finances
Reports
Dashboard
Receipts
