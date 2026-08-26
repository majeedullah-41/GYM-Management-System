# Finances Module

**Module:** Finances / Payments  
**Priority:** P0 — Critical  
**Status:** Planned  
**Route:** `/finances`

---

# 1. Purpose

The Finances module manages money received by the gym.

It is responsible for:

- Recording payments
- Viewing payment history
- Searching payments
- Filtering payments
- Editing payment records where permitted
- Voiding/correcting payments where permitted
- Viewing financial summaries
- Opening/printing receipts
- Supporting reports with reliable financial data

This module is the authoritative source for recorded financial transactions.

---

# 2. Primary Goals

The module should make it extremely easy for staff to:

1. Receive a payment.
2. Select a member.
3. Enter the amount.
4. Select a payment method.
5. Save the transaction.
6. Print a receipt.
7. Find previous payments.
8. Filter payments by date/member/method.
9. See daily/weekly/monthly totals.

The workflow must be fast enough for front-desk use.

---

# 3. Main Screen

Recommended layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Finances                                  + Receive Payment │
│ Track gym income and payment history                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [Today] [This Week] [This Month] [Custom]                  │
│                                                             │
│ Search payments...   Method ▼   Member ▼   Filters          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Date │ Receipt │ Member │ Amount │ Method │ Description    │
│                                                             │
│ ...                                                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Total: Rs. 124,500                              1–20 of 248 │
└─────────────────────────────────────────────────────────────┘
```

# 4. Financial KPI Cards

The top of the Finances page should provide useful summary cards.

Recommended:

Today's Income
This Week
This Month
Total Transactions

Example:

```text
┌────────────────┐
│ Today's Income │
│ Rs. 12,500     │
│ 8 payments     │
└────────────────┘

┌────────────────┐
│ This Month     │
│ Rs. 245,000    │
│ +12%           │
└────────────────┘
```

Do not add unnecessary financial KPIs.

# 5. Receive Payment

Primary action:

+ Receive Payment

opens the payment form.

This is the most important workflow in the module.

# 6. Payment Form

Required fields:

Member
Amount
Payment Date
Payment Method

Optional:

Membership Plan
Description
Notes

Recommended form:

```text
┌──────────────────────────────────────────┐
│ Receive Payment                           │
│                                          │
│ Member *                                 │
│ [ Search member...                  ▼ ] │
│                                          │
│ Amount *                                 │
│ [ Rs. 2,000                          ]  │
│                                          │
│ Payment Method *                         │
│ [ Cash ▼ ]                               │
│                                          │
│ Payment Date *                           │
│ [ 26 Aug 2026 ]                          │
│                                          │
│ Description                              │
│ [ Monthly membership                 ]   │
│                                          │
│              [ Cancel ] [ Receive ]      │
└──────────────────────────────────────────┘
```

# 7. Member Selection

The payment must be associated with a member.

The selector should support searching by:

Member Name
Member ID
Phone Number

Example:

Search:
Ahmad

Results:

GYM-00248
Ahmad Khan
03001234567

# 8. Preselected Member

When payment is initiated from the Members module:

Member Details
      ↓
Receive Payment

the member should already be selected.

The user should not have to search for the member again.

# 9. Amount

Amount is required.

Rules:

Must be greater than or equal to 0
Must follow money precision rules
Must not contain invalid characters

For normal gym payments:

Amount > 0

should be required.

The exact zero-payment behavior should be defined centrally.

# 10. Money Representation

Never use floating-point arithmetic for financial values.

Example:

BAD:
float amount = 2000.50

GOOD:
integer minor units

or another project-approved exact money representation.

The database specification defines the authoritative implementation.

# 11. Currency

Initial application currency:

PKR

Display using the shared currency formatter.

Examples:

Rs. 2,000
Rs. 12,500
Rs. 250,000

Do not implement currency formatting independently in each component.

# 12. Payment Method

Initial payment methods:

Cash
Bank Transfer
Other

The final list should be defined in application configuration/business rules.

Do not hard-code payment method labels throughout the application.

# 13. Payment Method Extensibility

The architecture should allow additional methods later, such as:

Card
Mobile Wallet
Other

without requiring major changes to the payment entity.

However, do not implement unused payment methods just for the sake of extensibility.

# 14. Payment Date

Payment date is required.

For the normal workflow:

Default:
Today

Users with appropriate permissions may select another date if backdated transactions are supported.

# 15. Future Payment Dates

Future-dated payments should normally be rejected.

Example:

Today:
26 Aug 2026

Payment date:
30 Aug 2026

→ Invalid

If future transactions are ever required, that must be an explicit business rule.

# 16. Backdated Payments

Backdated payments may be allowed.

Example:

Today:
26 Aug 2026

Payment date:
25 Aug 2026

If allowed, the payment retains:

payment_date = 25 Aug 2026

and:

created_at = actual creation timestamp

These are different concepts.

# 17. Created Timestamp vs Payment Date

The system must distinguish:

Payment Date

from:

Created At

Example:

Payment Date:
25 Aug 2026

Created At:
26 Aug 2026 10:32 AM

Reports based on financial activity should use the defined payment date unless explicitly stated otherwise.

# 18. Membership Plan Association

A payment may be associated with the membership plan involved.

Example:

Member:
Ahmad Khan

Plan:
Monthly

Amount:
Rs. 2,000

However, the payment amount must remain independent.

# 19. Plan Price Must Not Override Amount

If:

Monthly Plan Price:
Rs. 2,500

the payment form may suggest:

Rs. 2,500

but the final amount received must be explicitly recorded.

Example:

Plan Price:
Rs. 2,500

Actual Payment:
Rs. 2,000

The transaction should record:

amount = Rs. 2,000

# 20. Discounts

The initial module does not require a complex discount engine.

If a payment is less than the plan price, the system should not automatically invent a discount record.

Optional future support may include:

Discount
Reason

but this should be added only when required.

# 21. Description

Optional description:

Monthly membership payment

Examples:

Monthly Membership
Membership Renewal
Registration Fee
Other

The description is informational.

# 22. Notes

Optional internal notes may be supported.

Example:

Member paid partial amount.

Notes should not appear on the customer receipt unless explicitly configured.

# 23. Payment Submission

Expected workflow:

Fill Form
    ↓
Frontend Validation
    ↓
Tauri Command
    ↓
Backend Validation
    ↓
Database Transaction
    ↓
Payment Created
    ↓
Receipt Generated
    ↓
Success

# 24. Atomic Payment Creation

Creating a payment must be atomic.

If the workflow also updates membership information, the related operations should be performed within an appropriate database transaction.

Example:

Payment created
+
Membership updated

must either both succeed or both fail.

Avoid partial financial states.

# 25. Receipt Number

Every successful payment should receive a unique receipt number.

Example:

RCP-000001
RCP-000002
RCP-000003

The receipt number must be generated by the backend.

# 26. Receipt Number Rules

Receipt numbers must be:

Unique
Stable
Non-empty
Generated server-side

A receipt number must never change because a member is edited.

# 27. Receipt Number vs Payment ID

These are different.

Internal:

payment.id

is the database identifier.

Customer-facing:

receipt_number

is the human-readable receipt identifier.

Do not use the receipt number as the SQLite primary key.

# 28. Duplicate Payment Protection

The application must prevent accidental duplicate submissions.

Frontend:

Disable Receive button while saving

Backend/database:

Use transaction boundaries
Use appropriate constraints

# 29. Successful Payment

After saving:

Payment received successfully.

Then provide:

Print Receipt

Example:

Payment received successfully.

Receipt:
RCP-000248

[ Print Receipt ] [ Done ]

# 30. Receipt Printing

The payment workflow should support printing a receipt immediately after successful payment.

Receipt printing should use a dedicated receipt service/template.

The payment record itself should not contain HTML or printer-specific formatting.

# 31. Receipt Data

A receipt should contain at minimum:

Gym Name
Gym Contact Information
Receipt Number
Payment Date
Member Name
Member ID
Amount
Payment Method
Description

Optional:

Membership Plan
Membership Expiry
Staff/User

The exact receipt layout belongs to the Receipt module.

# 32. Receipt Failure

If payment succeeds but printing fails:

Payment:
SUCCESS

Printing:
FAILED

The payment must NOT be rolled back just because the printer failed.

Show:

Payment recorded successfully.

The receipt could not be printed.

[ Try Print Again ]

# 33. Payment List

Recommended columns:

Date
Receipt #
Member
Amount
Payment Method
Description
Actions

# 34. Payment Search

Search should support:

Receipt Number
Member Name
Member ID
Phone
Description

Example:

Search:
RCP-000248

returns the payment.

# 35. Date Filtering

Date filtering is extremely important.

Quick filters:

Today
Yesterday
This Week
This Month
Last Month
Custom Range

# 36. Default Date Filter

Recommended default:

Today

or:

Current Month

The final choice should match the dashboard/finance UX specification.

For a front-desk payment screen, Today is generally the most useful.

# 37. Custom Date Range

Users should be able to select:

From:
26 Aug 2026

To:
31 Aug 2026

Rules:

From <= To

Invalid:

From:
31 Aug

To:
26 Aug

# 38. Payment Method Filter

Provide:

All
Cash
Bank Transfer
Other

The options should come from the centralized payment-method definition.

# 39. Member Filter

Users should be able to filter by a specific member.

Example:

Member:
Ahmad Khan

The payment list then shows only Ahmad Khan's transactions.

# 40. Amount Filter

Optional advanced filtering:

Minimum Amount
Maximum Amount

This is not required for the first version if it makes the UI unnecessarily complex.

# 41. Combined Filters

Filters must work together.

Example:

Date:
This Month

Method:
Cash

Member:
Ahmad Khan

The results must satisfy all active filters.

# 42. Clear Filters

Provide:

Clear Filters

This resets all active filters.

# 43. Active Filter Display

The user should clearly see active filters.

Example:

This Month
Cash
Ahmad Khan

Do not hide filtering state.

# 44. Sorting

Recommended:

Payment Date
Amount
Receipt Number
Member Name
Created At

Default:

Payment Date DESC

Newest transactions first.

# 45. Pagination

The payment table should support pagination.

Example:

20 payments per page

Example footer:

Showing 1–20 of 348

< Previous
1 2 3 ... 18
Next >

# 46. Database-Side Pagination

Do not load thousands of payments into the frontend just to paginate them.

Use database-side:

LIMIT
OFFSET

or an equivalent pagination strategy.

# 47. Financial Total

The current filtered result set should show a total.

Example:

Total:
Rs. 124,500

The total must be calculated using the same filter criteria.

# 48. Total Transaction Count

Display:

Transactions:
84

when useful.

# 49. Daily Summary

The module should support daily financial summary.

Example:

Today's Income

Rs. 18,500

12 transactions

# 50. Payment Breakdown

Optional summary:

Cash:
Rs. 12,500

Bank Transfer:
Rs. 6,000

This is useful for reconciliation.

# 51. Cash Reconciliation

A simple cash summary may show:

Cash Payments Today:
Rs. 12,500

This should represent recorded cash transactions.

Do not claim it represents physical cash in the drawer unless the application later implements opening balance/cash adjustments.

# 52. Editing Payments

Financial records require stricter rules than normal CRUD.

Do NOT provide unrestricted editing of:

Amount
Payment Date
Member
Receipt Number

without defining audit/history behavior.

# 53. Recommended Correction Strategy

For a simple offline application:

Original Payment
       ↓
Void/Cancel
       ↓
Create Correct Payment

This preserves the financial trail better than silently editing historical records.

# 54. Voiding a Payment

A payment may be voided if the business rules permit.

Example:

RCP-000248
Rs. 2,000

becomes:

VOIDED

The original record remains in the database.

# 55. Void Confirmation

Example:

Void Payment?

Receipt:
RCP-000248

Amount:
Rs. 2,000

This payment will no longer count toward financial totals.

The original record will remain for audit/history.

Reason:
[________________________]

[ Cancel ] [ Void Payment ]

# 56. Void Reason

A reason should be required when voiding.

Example:

Duplicate payment entry
Incorrect member
Incorrect amount
Other

The user may also enter a custom reason.

# 57. Voided Payments

Voided payments should remain visible when:

Status = All

or:

Status = Voided

but should not be included in normal income totals.

# 58. Financial Calculation Rule

Normal income:

SUM(valid payment amounts)

Voided payments:

EXCLUDED

Do not physically delete a payment and pretend it never existed.

# 59. Payment Status

Recommended statuses:

Completed
Voided

The initial system does not need:

Pending
Failed
Refunded

unless those concepts are actually required.

# 60. Refunds

Full refund functionality is outside the initial scope.

If refunds become necessary later, implement them as a dedicated financial operation rather than modifying the original payment amount.

# 61. Payment Database Entity

Conceptual payments fields:

id
receipt_number
member_id
membership_plan_id
amount
payment_date
payment_method
description
notes
status
void_reason
created_at
updated_at

The exact schema is defined in:

DATABASE-SPECIFICATION.md

# 62. Payment Amount Storage

The database must store money using the project's exact money representation.

Never use:

REAL
FLOAT
DOUBLE

for currency unless the database specification explicitly justifies it.

Prefer an integer minor-unit strategy or another exact representation.

# 63. Payment Foreign Key

Payment should reference:

member_id

using a foreign key.

Do not duplicate:

member_name
member_phone

as authoritative payment fields.

The receipt can retrieve member information through the relationship.

# 64. Historical Snapshot Consideration

Receipt/history requirements may require preserving certain transaction-time information.

The architecture should explicitly decide whether the receipt should reconstruct member/plan details from current records or store a transaction-time snapshot.

This decision belongs in:

DATABASE-SPECIFICATION.md

and must not be improvised inside the UI.

# 65. Repository Responsibilities

Repository handles:

Create payment
Get payment
List payments
Search payments
Filter payments
Calculate totals
Get member payments
Void payment
Get daily summary
Get date-range summary

All SQL remains in this layer.

# 66. Service Responsibilities

Service handles:

Payment validation
Receipt number generation
Payment business rules
Void rules
Financial calculations
Transaction orchestration

# 67. Transaction Boundary

Payment creation should use an appropriate database transaction.

Example:

BEGIN
  Validate
  Create payment
  Update membership if required
COMMIT

If any required operation fails:

ROLLBACK

# 68. Tauri Command Responsibilities

Tauri commands should:

Receive request
Call service
Return DTO
Translate expected errors

They should not contain SQL.

# 69. Frontend Responsibilities

Frontend handles:

Payment table
Payment form
Member search
Filters
KPI cards
Loading states
Error states
Empty states
Confirmation dialogs
Receipt actions

# 70. DTOs

Recommended:

CreatePaymentRequest
PaymentResponse
PaymentListItem
PaymentDetails
PaymentFilters
PaymentSummary
VoidPaymentRequest

Use project naming conventions consistently.

# 71. Payment Creation Test

Required:

Create Member
     ↓
Create Payment
     ↓
Payment exists
     ↓
Correct amount
     ↓
Correct member
     ↓
Receipt number exists

# 72. Payment Validation Tests

Test:

Missing member
Invalid member
Missing amount
Negative amount
Invalid payment method
Missing payment date
Future payment date
Invalid date range

# 73. Receipt Number Tests

Test:

Payment 1
→ RCP-000001

Payment 2
→ RCP-000002

Also verify:

Receipt numbers are unique.

# 74. Financial Calculation Tests

Example:

Payment 1:
Rs. 2,000

Payment 2:
Rs. 3,000

Payment 3:
Rs. 1,500

Expected:

Total:
Rs. 6,500

# 75. Voided Payment Test

Example:

Payments:
Rs. 2,000
Rs. 3,000

Total:

Rs. 5,000

Void second payment.

Expected:

Total:
Rs. 2,000

The payment record must still exist.

# 76. Date Filter Tests

Test:

Today
Yesterday
This Week
This Month
Custom Range

Also test boundary timestamps/dates carefully.

# 77. Payment Method Tests

Test:

Cash
Bank Transfer
Other

and verify filtering works correctly.

# 78. Member Payment Test

Create:

Member A
Payment A

Member B
Payment B

Filter:

Member A

Expected:

Only Payment A

# 79. Combined Filter Tests

Example:

Month:
August

Method:
Cash

Member:
Ahmad

Expected result:

Only Ahmad's August cash payments

# 80. Pagination Tests

Test:

21 payments
Page size:
20

Expected:

Page 1:
20

Page 2:
1

Also test pagination together with filters.

# 81. Financial Integrity Test

Critical test:

Create payment
Change membership plan price

Expected:

Payment amount unchanged

# 82. Archive Member Test

Required:

Create member
Create payment
Archive member

Expected:

Payment remains accessible.
Payment remains included in historical financial data.

# 83. Frontend Tests

Test:

Payment list renders
Receive payment form opens
Member search works
Payment validation works
Payment saves
Success state works
Receipt action appears
Search works
Filters work
Sorting works
Pagination works
Empty state works
Loading state works
Error state works
Void confirmation works

# 84. Integration Test

Complete workflow:

Create Member
      ↓
Receive Payment
      ↓
Payment appears in Finances
      ↓
Receipt number exists
      ↓
Open payment
      ↓
Print receipt

# 85. Payment-to-Membership Integration

If receiving a payment also renews/creates membership:

Select Member
      ↓
Select Plan
      ↓
Receive Payment
      ↓
Payment Created
      ↓
Membership Dates Updated

Both operations must be atomic.

# 86. UI Design Rules

Finances should feel like a professional accounting/payment screen.

Use:

Strong hierarchy
Clean KPI cards
Dense but readable table
Clear amount formatting
Subtle status badges
Compact filters
Obvious Receive Payment action

Avoid:

Huge decorative cards
Excessive animations
Unnecessary charts
Color-heavy interfaces

# 87. Amount Formatting

Amounts should be right-aligned in tables.

Example:

Member             Amount
Ahmad Khan         Rs. 2,000
Ali Shah           Rs. 5,000

This improves financial readability.

# 88. Payment Status Display

Completed:

Completed

Voided:

Voided

Status should be communicated using both text and visual styling.

# 89. Receipt Action

Each completed payment should provide:

View Receipt
Print Receipt

or a combined action menu.

Voided payments should not offer a normal "reprint as valid receipt" action without making the voided status obvious.

# 90. Keyboard Workflow

The payment workflow should be optimized for fast data entry.

Useful behavior:

Tab:
Move between fields

Enter:
Submit when appropriate

Escape:
Close dialog

Avoid keyboard behavior that causes accidental duplicate payments.

# 91. Accessibility

Ensure:

Form fields have labels
Keyboard navigation works
Focus is visible
Dialogs are accessible
Tables have headers
Status is not communicated by color alone
Amounts remain readable at normal zoom

# 92. Offline Requirement

The Finances module must work completely offline.

It must not depend on:

Internet
Cloud database
Online payment API
Remote authentication service

All financial records are stored locally in SQLite.

# 93. Database Backup Consideration

Because this is an offline application, financial data protection is critical.

The Finances module should integrate with the application's backup/restore system.

The backup system itself belongs to:

SETTINGS / BACKUP MODULE

not this module.

# 94. No Unnecessary Features

Do NOT add:

Online payments
Credit card gateway
Subscriptions
Recurring billing
Invoices
Payroll
Supplier accounting
Tax accounting
Complex double-entry accounting

unless explicitly requested.

This application is a simple gym management system, not a full accounting platform.

# 95. Module Dependencies

Finances depends on:

Members
Membership Plans
Database
Receipt Module
Global UI System

Finances is consumed by:

Dashboard
Reports
Member Details
Receipts

# 96. Implementation Order

Implement in this order:

1. Payment database schema
2. Migration
3. Payment repository
4. Repository tests
5. Payment service
6. Service tests
7. Receipt number generation
8. DTOs
9. Tauri commands
10. Frontend IPC/API wrapper
11. Payment list
12. Receive payment form
13. Member search
14. Date filters
15. Payment method filters
16. Member filters
17. Sorting
18. Pagination
19. Financial summaries
20. Void payment
21. Receipt integration
22. Loading states
23. Empty states
24. Error states
25. Frontend tests
26. Integration tests
27. UI polish

# 97. Definition of Done

The Finances module is complete when:

[ ] Payments can be recorded
[ ] Payments are associated with members
[ ] Amount validation works
[ ] Payment methods work
[ ] Payment dates work
[ ] Receipt numbers are generated
[ ] Receipt numbers are unique
[ ] Payment history is searchable
[ ] Date filtering works
[ ] Member filtering works
[ ] Payment method filtering works
[ ] Combined filters work
[ ] Sorting works
[ ] Pagination works
[ ] Financial totals are correct
[ ] Voided payments are handled correctly
[ ] Voided payments remain in history
[ ] Voided payments are excluded from totals
[ ] Historical payment amounts never change
[ ] Receipt printing is integrated
[ ] Printing failure does not delete/rollback a successful payment
[ ] Loading states work
[ ] Empty states work
[ ] Error states work
[ ] Backend tests pass
[ ] Repository tests pass
[ ] Frontend tests pass
[ ] Integration tests pass
[ ] No mock financial data remains
[ ] UI follows the global design system
[ ] Existing application tests still pass

# 98. AI Coding Rules

When implementing this module, the AI agent MUST:

[ ] Read ARCHITECTURE.md
[ ] Read DATABASE-SPECIFICATION.md
[ ] Read UI-UX-SYSTEM.md
[ ] Read MEMBERS.md
[ ] Read MEMBERSHIP-PLANS.md
[ ] Inspect existing repository/service patterns
[ ] Reuse existing components
[ ] Add tests with every feature
[ ] Run module tests
[ ] Run integration tests
[ ] Run the full test suite

The AI agent MUST NOT:

[ ] Put SQL in frontend code
[ ] Put financial business logic in React
[ ] Use floating-point money calculations
[ ] Hard-code membership plans
[ ] Hard-code prices
[ ] Generate receipt numbers in the frontend
[ ] Delete financial records
[ ] Silently modify historical payments
[ ] Recalculate old payments using current plan prices
[ ] Roll back a successful payment because printing failed
[ ] Create duplicate payment tables
[ ] Skip financial integrity tests
[ ] Rewrite unrelated modules

# 99. Critical Financial Principle

The most important rule of this module is:

Payment history is immutable financial history.

Conceptually:

Current Plan Price
       ≠
Historical Payment Amount

and:

Edit/Correction
       ↓
Void Original
       ↓
Create Correct Transaction

rather than:

Silently modify history

Every financial operation must prioritize:

Accuracy
Traceability
Data Integrity

over convenience.
