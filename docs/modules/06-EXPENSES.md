# Expenses Module

**Module:** Expenses  
**Priority:** P0 — Critical  
**Status:** Planned  
**Route:** `/expenses`

---

# 1. Purpose

The Expenses module manages money spent by the gym.

It allows staff to:

- Record expenses
- View expenses
- Edit expenses
- Delete/void expenses according to business rules
- Filter expenses
- Search expenses
- Categorize expenses
- Review expense details

Examples:

- Electricity bill
- Rent
- Equipment repair
- Cleaning supplies
- Water
- Staff-related expense
- Equipment purchase
- Maintenance
- Miscellaneous expense

---

# 2. Core Principle

An expense represents money going OUT of the gym.

```text
Expense
    ↓
Money Out
```

Payments represent money coming IN.

```text
Payment
    ↓
Money In
```

Finances combines both.

```text
Payments + Expenses
        ↓
     Finances
```

# 3. Scope

The Expenses module includes:

Create Expense
View Expense
Edit Expense
Delete/Void Expense
Search Expense
Filter Expense
Expense Categories
Expense Details
Expense History

The module does NOT manage:

Member Payments
Memberships
Receipts for Member Payments
Financial Reports
Application Settings

Those belong to other modules.

# 4. Expense Record

Minimum required information:

Expense ID
Date
Amount
Category
Description
Payment Method
Created At

Optional:

Reference Number
Vendor
Notes
Attachment
Created By

The optional fields should not make recording a basic expense difficult.

# 5. Minimum Expense Form

Recommended form:

```text
┌────────────────────────────────────────────┐
│ Add Expense                                │
│                                            │
│ Date *                                     │
│ [ 26 Aug 2026                         ]    │
│                                            │
│ Category *                                 │
│ [ Electricity                         ▼ ]  │
│                                            │
│ Amount *                                   │
│ [ Rs. 15,000                          ]    │
│                                            │
│ Payment Method *                           │
│ [ Cash                                ▼ ]  │
│                                            │
│ Description                                │
│ [ Electricity bill for August          ]   │
│                                            │
│ Vendor                                     │
│ [ Optional                            ]    │
│                                            │
│ Notes                                      │
│ [ Optional                            ]    │
│                                            │
│             [ Cancel ] [ Save Expense ]    │
└────────────────────────────────────────────┘
```

# 6. Required Fields

Required:

Date
Amount
Category
Payment Method

Description should normally be recommended but may remain optional depending on the business workflow.

# 7. Amount

Amount must be:

Greater than zero
Numeric
Valid currency value

Invalid:

0
-500
abc
Rs. abc

The frontend should validate input.

The backend must validate it again.

Never trust frontend validation alone.

# 8. Money Storage

Money must follow the project's global money-storage rule.

Recommended:

Store monetary values as integer minor units

For example, if the currency uses two decimal places:

Rs. 1,500.00

could be stored as:

150000

Do not use floating-point values for financial calculations.

The exact representation must be defined in:

DATABASE-SPECIFICATION.md

# 9. Expense Date

The expense date represents when the expense occurred.

Example:

26 Aug 2026

This may differ from:

Created At

Example:

Expense Date:
25 Aug 2026

Created At:
26 Aug 2026

Both concepts should remain separate.

# 10. Categories

The system should provide predefined expense categories.

Initial categories:

Rent
Electricity
Water
Gas
Internet
Cleaning
Maintenance
Equipment
Supplies
Staff
Marketing
Other

Keep the initial list small.

# 11. Custom Categories

Custom categories are optional.

If implemented, they belong to Settings/Configuration rather than being hard-coded into the UI.

The expense record should store the category reference or appropriate snapshot according to the database specification.

# 12. Category Rules

A category must:

Exist
Be valid
Be active/available for new expenses

If a category is later disabled:

Existing expenses remain intact.

Do not silently change historical expenses.

# 13. Payment Methods

Initial payment methods:

Cash
Bank Transfer
Card
Other

The exact list should be centralized.

Do not hard-code payment method strings in multiple components.

# 14. Expense Description

Example:

Electricity bill for August

or:

Repair of treadmill #2

Keep descriptions concise.

# 15. Vendor

Optional field.

Example:

Vendor:
Swat Electric Store

This can help identify where money was spent.

It should not be required for normal expenses.

# 16. Reference Number

Optional.

Examples:

Bill #12345
Invoice #INV-102
Receipt #7781

This is useful for utility bills and supplier expenses.

# 17. Notes

Optional free-text field.

Example:

Paid in cash at the shop.

Notes should not be required.

# 18. Attachments

Attachments are NOT required for the initial version.

Do not introduce document/file management unless there is a real requirement.

Future possibility:

Expense
  ↓
Receipt/Bill attachment

If implemented later, attachment handling should be documented separately.

# 19. Expense List

Recommended table:

```text
┌──────────────────────────────────────────────────────────────────┐
│ Expenses                                                         │
│                                                                  │
│ [ Search expenses... ] [ Date ▼ ] [ Category ▼ ] [ Filter ▼ ]   │
│                                                                  │
│ Date       Category       Description        Amount    Method    │
│ ──────────────────────────────────────────────────────────────── │
│ 26 Aug     Electricity    August bill        Rs.15,000 Cash      │
│ 25 Aug     Maintenance    Treadmill repair   Rs.5,000  Cash      │
│ 23 Aug     Supplies       Cleaning items     Rs.2,500  Cash      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

# 20. Table Columns

Recommended:

Date
Category
Description
Amount
Payment Method

Optional:

Vendor
Status
Created By

Do not overload the table.

# 21. Table Actions

Each row may provide:

View
Edit
Delete/Void

Example:

⋮
  View
  Edit
  Void

# 22. Search

Search should support useful fields.

Recommended:

Description
Vendor
Reference Number

Category filtering should use a dedicated filter.

# 23. Date Filtering

Support:

Today
Yesterday
This Week
This Month
Last Month
Custom Range

This should match the application's global filtering patterns.

# 24. Category Filtering

Example:

[ All Categories ▼ ]

Electricity
Rent
Maintenance
Equipment
Supplies
Other

# 25. Payment Method Filtering

Optional filter:

[ All Methods ▼ ]

Cash
Bank Transfer
Card
Other

# 26. Combined Filters

Filters must work together.

Example:

Date:
This Month

Category:
Electricity

Payment Method:
Cash

Expected:

Only cash electricity expenses
from the current month.

# 27. Filter Reset

Provide:

[ Clear Filters ]

This should restore the default expense list.

# 28. Sorting

Default:

Newest expense first

Optional sorting:

Date
Amount
Category

# 29. Pagination

If the database becomes large, use pagination or an equivalent efficient loading strategy.

Do not load thousands of expense rows into the frontend unnecessarily.

Initial page size can be:

25
50

depending on the global table standard.

# 30. Expense Details

Selecting an expense should show:

Expense
────────────────────────

Amount
Rs. 15,000

Date
26 Aug 2026

Category
Electricity

Payment Method
Cash

Description
August electricity bill

Vendor
Swat Electric Store

Reference
BILL-12345

Notes
Paid in cash.

# 31. Edit Expense

Users may edit an expense if business rules permit.

Editable fields:

Date
Amount
Category
Payment Method
Description
Vendor
Reference
Notes

The expense ID must never change.

# 32. Editing Financial Records

Expenses affect financial totals.

Therefore editing must go through the backend business/service layer.

Do NOT:

Frontend
 ↓
Direct SQL UPDATE

Correct:

Frontend
 ↓
Tauri Command
 ↓
Expense Service
 ↓
Expense Repository
 ↓
SQLite

# 33. Delete vs Void

Because expenses are financial records, permanent deletion should be treated carefully.

Recommended approach:

Void Expense

instead of permanently deleting it.

This preserves financial history.

# 34. Void Expense

Example:

Expense:
Rs. 15,000

Status:
Voided

A voided expense must not contribute to financial totals.

# 35. Void Confirmation

Before voiding:

```text
┌─────────────────────────────────────────┐
│ Void Expense?                            │
│                                          │
│ Rs. 15,000                               │
│ Electricity                              │
│                                          │
│ This expense will be excluded from      │
│ financial calculations.                 │
│                                          │
│ Reason *                                 │
│ [ Duplicate entry                   ]    │
│                                          │
│ [ Cancel ]             [ Void Expense ] │
└─────────────────────────────────────────┘
```

# 36. Void Reason

A reason should be required.

Examples:

Duplicate entry
Incorrect amount
Incorrect category
Entered by mistake
Other

Optional free text can provide more detail.

# 37. Voided Expense Display

A voided expense should remain visible in history when appropriate.

Example:

25 Aug 2026
Electricity
Rs. 15,000
VOIDED

Use clear visual treatment.

Do not completely hide financial history.

# 38. Financial Calculation

Valid expense:

Included

Voided expense:

Excluded

Therefore:

Total Expenses
=
SUM(valid expenses)

# 39. Expense Status

Recommended statuses:

ACTIVE
VOIDED

Avoid unnecessary statuses.

# 40. Expense ID

Every expense must have a unique immutable ID.

Example:

EXP-000001
EXP-000002

The exact ID strategy belongs to the database specification.

The frontend must never generate authoritative IDs.

# 41. Audit Information

Recommended fields:

created_at
updated_at
created_by
updated_by

If the application has a user/account system.

For a single-user offline application, the exact audit requirements may be simplified.

# 42. Created At vs Expense Date

Example:

Expense Date:
20 Aug 2026

Created At:
26 Aug 2026

Financial reports should normally use:

Expense Date

not creation timestamp.

This distinction is important.

# 43. Expense Repository

The repository handles persistence.

Example responsibilities:

create_expense()
get_expense()
list_expenses()
update_expense()
void_expense()

The repository must not contain UI logic.

# 44. Expense Service

The service handles business rules.

Example:

validate amount
validate category
validate payment method
validate date
create expense
update expense
void expense

# 45. Expense Queries

The repository should support filtered queries.

Conceptually:

list_expenses(
    search,
    date_from,
    date_to,
    category,
    payment_method,
    status,
    page,
    page_size
)

Exact implementation depends on the architecture.

# 46. Expense Summary

The module may provide:

Total Expenses
Number of Expenses

for the currently selected filter.

Example:

This Month

42 Expenses

Total:
Rs. 87,500

This is useful for the Expenses screen.

# 47. Summary Consistency

The expense total displayed in Expenses must match the expense component of Finances.

Example:

Expenses:
This Month
Rs. 87,500

Finances:

Expenses:
This Month
Rs. 87,500

Both must use the same business rules.

# 48. Expense Categories Summary

Optional:

Electricity    Rs. 25,000
Rent           Rs. 40,000
Maintenance    Rs. 12,500
Other          Rs. 10,000

This is useful but should not block the core module.

Reports can provide deeper category analysis.

# 49. No Duplicate Financial Logic

The Expenses module determines what an expense is.

Finances determines how valid expenses contribute to financial summaries.

Both must use shared domain rules.

Avoid separate calculations in:

Expenses UI
Finances UI
Reports UI
Dashboard UI

# 50. Error Handling

Errors should be user-friendly.

Bad:

SQLITE_CONSTRAINT_FOREIGNKEY

Good:

Unable to save expense.

Please check the category and try again.

# 51. Validation Errors

Examples:

Amount is required.
Amount must be greater than zero.
Category is required.
Payment method is required.
Date is required.

Show errors near the relevant fields.

# 52. Save Failure

If saving fails:

Expense was not saved.

Please try again.

Do not clear the form automatically.

Preserve the user's entered values where possible.

# 53. Duplicate Submission

Disable the save button while submitting.

Example:

[ Saving... ]

This prevents accidental duplicate expenses.

# 54. Duplicate Expense Prevention

The system should not blindly prevent two expenses with the same amount/category.

For example:

Electricity:
Rs. 10,000

Electricity:
Rs. 10,000

could legitimately occur.

Do not create arbitrary duplicate-detection rules unless the business requires them.

# 55. Offline Behavior

The Expenses module must work fully offline.

No:

Internet
Cloud API
Online accounting service

is required.

SQLite is the source of persisted local data.

# 56. Database Transactions

Operations that modify financial records should be atomic.

For example:

Void Expense
      ↓
Update expense status
      ↓
Commit

If the operation fails:

Rollback

No partially updated state should remain.

# 57. Concurrency

The application is primarily a desktop/offline application.

Still, avoid assumptions that:

Only one operation can ever happen.

SQLite transaction handling must remain safe.

# 58. Tests — Creation

Test:

Create expense

Expected:

Expense exists
Correct amount
Correct date
Correct category
Correct payment method

# 59. Tests — Validation

Test invalid:

Zero amount
Negative amount
Missing category
Missing date
Invalid payment method

Expected:

Operation rejected.
Database unchanged.

# 60. Tests — Editing

Create:

Rs. 5,000

Edit:

Rs. 7,500

Expected:

Expense:
Rs. 7,500

And:

Expense ID unchanged.

# 61. Tests — Void

Create:

Rs. 5,000

Void it.

Expected:

Status = VOIDED

And:

Expense total = 0

if this is the only expense.

# 62. Tests — Void Reason

Attempt to void without a reason.

Expected:

Rejected.

# 63. Tests — Filters

Create:

Electricity
Rent
Maintenance

Filter:

Electricity

Expected:

Only electricity expenses.

# 64. Tests — Date Range

Create:

1 Aug
15 Aug
30 Aug

Filter:

1 Aug → 15 Aug

Expected:

Only first two.

# 65. Tests — Combined Filters

Create expenses with different:

Categories
Dates
Payment methods

Apply multiple filters.

Expected:

All filters are applied together.

# 66. Tests — Search

Create:

August electricity bill

Search:

electricity

Expected:

Expense returned.

# 67. Tests — Sorting

Create:

Rs. 1,000
Rs. 5,000
Rs. 2,000

Sort by amount descending.

Expected:

5,000
2,000
1,000

# 68. Tests — Summary

Create:

Rs. 2,000
Rs. 3,000
Rs. 5,000

Expected:

Total:
Rs. 10,000

# 69. Tests — Voided Summary

Create:

Rs. 2,000 ACTIVE
Rs. 3,000 ACTIVE
Rs. 5,000 VOIDED

Expected:

Total:
Rs. 5,000

# 70. Tests — Financial Consistency

Compare:

Expenses module total

with:

Finances module expense total

Expected:

Equal

This is a critical integration test.

# 71. Frontend Tests

Test:

Expense list renders
Add expense form renders
Validation works
Save works
Edit works
Void dialog works
Filters work
Search works
Sorting works
Empty state works
Error state works
Loading state works

# 72. Integration Test

Complete flow:

Open Expenses
      ↓
Add Expense
      ↓
Save
      ↓
Expense appears
      ↓
Finances updates
      ↓
Reports include expense

# 73. UI Empty State

When no expenses exist:

No expenses recorded yet.

Start tracking your gym's expenses.

[ Add Expense ]

# 74. UI Loading State

Use table skeletons or loading indicators.

Do not display:

No expenses

while the data is still loading.

# 75. UI Error State

Example:

Unable to load expenses.

[ Retry ]

Do not expose raw Rust/SQLite errors.

# 76. UI Design Principles

The Expenses screen should look like a professional business application.

Prioritize:

Clear table
Strong column alignment
Readable numbers
Compact filters
Consistent spacing
Clear actions

# 77. Amount Alignment

Financial amounts should be right-aligned in tables.

Example:

Category           Amount
────────────────────────────
Electricity       Rs. 15,000
Maintenance        Rs. 5,000
Supplies           Rs. 2,500

This makes comparison easier.

# 78. Status Display

Use clear status indicators.

Example:

ACTIVE
VOIDED

Avoid relying only on color.

The text must communicate the status.

# 79. Confirmation Rules

Require confirmation before:

Voiding expense

Normal actions such as:

View
Filter
Search

do not require confirmation.

# 80. Keyboard Usability

The form should support normal keyboard navigation.

Recommended:

Tab
Shift + Tab
Enter
Escape

Do not trap keyboard focus unnecessarily.

# 81. Module Dependencies

Expenses depends on:

Database
Global Money System
Global Date System
Settings/Configuration
UI Design System

Finances depends on Expenses.

Reports may consume Expenses.

Dashboard may consume Expense summaries.

# 82. Dependency Direction

Preferred:

Expenses
   ↓
Finances
   ↓
Reports

and:

Expenses
   ↓
Dashboard

Avoid:

Expenses
   ↔
Finances

if it creates circular business dependencies.

# 83. Implementation Order

Implement in this order:

Define expense domain model
Define database schema
Create migrations
Implement repository
Add repository tests
Implement expense service
Add service tests
Implement Tauri commands
Add command tests
Implement expense list
Implement filtering
Implement search
Implement create form
Implement edit
Implement void workflow
Implement summaries
Add frontend tests
Add integration tests
Verify Finances integration
Polish UI

# 84. Definition of Done

The Expenses module is complete when:

[ ] Expenses can be created
[ ] Expenses can be viewed
[ ] Expenses can be edited
[ ] Expenses can be voided
[ ] Void reasons are recorded
[ ] Voided expenses are excluded from totals
[ ] Expenses can be searched
[ ] Expenses can be filtered
[ ] Date filtering works
[ ] Category filtering works
[ ] Payment method filtering works
[ ] Combined filtering works
[ ] Sorting works
[ ] Expense totals are correct
[ ] Amount validation works
[ ] Required fields are validated
[ ] Duplicate submissions are prevented
[ ] Loading states work
[ ] Empty states work
[ ] Error states work
[ ] Backend tests pass
[ ] Frontend tests pass
[ ] Integration tests pass
[ ] Finances totals match Expenses totals
[ ] No direct SQLite access exists in frontend
[ ] No mock expense data remains
[ ] Existing tests still pass

# 85. AI Coding Rules

Before modifying this module, the AI agent MUST read:

[ ] ARCHITECTURE.md
[ ] DATABASE-SPECIFICATION.md
[ ] UI-UX-SYSTEM.md
[ ] PAYMENTS.md
[ ] FINANCES.md
[ ] REPORTS.md

The AI agent MUST:

[ ] Use the existing layered architecture
[ ] Use the existing money representation
[ ] Use shared date formatting
[ ] Use shared payment-method definitions
[ ] Use shared UI components
[ ] Add automated tests for every new behavior
[ ] Preserve historical financial records
[ ] Use backend validation
[ ] Run relevant tests
[ ] Run the full test suite before completion

The AI agent MUST NOT:

[ ] Put SQL inside React components
[ ] Modify SQLite directly from frontend
[ ] Use floating-point money calculations
[ ] Hard-code categories throughout the UI
[ ] Hard-code payment methods throughout the UI
[ ] Permanently delete financial records without an explicit architectural decision
[ ] Modify financial totals directly
[ ] Duplicate Finances calculation logic
[ ] Add unrelated accounting features
[ ] Skip tests

# 86. Final Principle

Expenses are financial records.

Therefore:

                 ┌── Payment ──→ MONEY IN
                 │
Financial Data ──┤
                 │
                 └── Expense ──→ MONEY OUT

The Expenses module owns the creation and management of money-out transactions.

Finances owns the overall financial picture.

Reports consume the financial data for analysis.

No module should create its own independent version of financial truth.
