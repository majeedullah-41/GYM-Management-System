# Gym Management System — Database Specification

**Document Version:** 1.0  
**Status:** Foundation  
**Database Engine:** SQLite  
**Database Type:** Local / Embedded  
**Architecture:** Repository-based persistence  
**Primary Goal:** Reliable, consistent, recoverable local data

---

# 1. Database Purpose

The Gym Management System uses SQLite as its primary persistent database.

The database stores:

- Gym members
- Membership information
- Payments
- Expenses
- Receipts
- Application settings
- System metadata

The database must be designed for:

- Data integrity
- Reliability
- Fast local queries
- Simple maintenance
- Offline operation
- Safe migrations
- Backup and restoration
- Long-term maintainability

The database is local to the Windows desktop application.

There is no requirement for a remote/cloud database in the initial version.

---

# 2. Database Architecture

The frontend must never communicate directly with SQLite.

The database access flow is:

```text
React / TypeScript
        ↓
Tauri IPC
        ↓
Rust Command
        ↓
Application Service
        ↓
Repository
        ↓
SQLite
```

Only the persistence layer should contain SQL queries.

# 3. Initial Database Entities

The initial database should contain the following primary entities:

members
membership_plans
payments
expenses
receipts
settings

Additional tables may be introduced only when there is a documented requirement.

The application should avoid unnecessary database complexity.

# 4. Entity Relationship Overview

High-level relationship:

```text
                 ┌──────────────────┐
                 │ membership_plans │
                 └────────┬─────────┘
                          │
                          │
                          ▼
┌─────────────┐     ┌──────────────┐
│   members   │────▶│   payments   │
└─────────────┘     └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   receipts   │
                    └──────────────┘


┌─────────────────┐
│     expenses    │
└─────────────────┘


┌─────────────────┐
│     settings    │
└─────────────────┘
```

The exact foreign-key relationships must be enforced at the database level where appropriate.

# 5. General Database Rules

The following rules apply to all tables.

### 5.1 Primary Keys

Each primary entity must have a unique primary key.

Prefer application-generated UUID/string IDs or another consistent identifier strategy.

The exact ID strategy must be selected once during implementation and used consistently.

Do not mix multiple ID strategies without a documented reason.

# 6. Timestamps

Records that require auditability should contain timestamps such as:

created_at
updated_at

Timestamps should be generated consistently.

The application must not use different timestamp formats in different tables.

The exact storage format should be standardized across the application.

# 7. Soft Deletion / Archiving

Permanent deletion should be avoided where deleting a record could compromise historical information.

For example, a member with historical payments should generally be archived rather than physically deleted.

Where appropriate:

is_archived

or an equivalent status mechanism may be used.

Financial records should not normally be physically deleted after they become part of historical financial reporting.

# 8. Members Table

Table:

members

Purpose:

Stores the gym's member records.

Recommended fields:

id
member_number
full_name
father_name
phone
cnic
address
date_of_birth
gender
photo_path
notes
is_archived
created_at
updated_at

### 8.1 Required Member Fields

The following information is required for initial member creation:

full_name
membership plan
membership start date
membership expiry date

The database may enforce required fields where appropriate.

### 8.2 Optional Member Fields

The following should remain optional:

father_name
phone
cnic
address
date_of_birth
gender
photo_path
notes

The application must not force unnecessary personal information.

# 9. Member Number

Each member should have a human-readable member number.

Example:

GYM-000001
GYM-000002
GYM-000003

The member number must be unique.

The member number should be suitable for:

Searching
Receipts
Reports
Manual reference

The internal database ID and human-readable member number should be treated as separate concepts.

# 10. Membership Plans Table

Table:

membership_plans

Purpose:

Stores available membership/package definitions.

Recommended fields:

id
name
duration_days
price
description
is_active
created_at
updated_at

Examples:

Monthly
Quarterly
Half Yearly
Yearly
Custom

The gym owner should be able to configure plans rather than having all plans permanently hard-coded.

# 11. Membership Information

The application needs to know which membership a member currently has.

Membership information should preserve historical accuracy.

The architecture should avoid overwriting historical membership information whenever a member renews.

If membership history is required by the implementation, a dedicated membership history table may be introduced.

Recommended future-capable structure:

members
    ↓
member_memberships
    ↓
membership_plans

For the initial implementation, the simplest structure that correctly supports:

Current membership
Start date
Expiry date
Renewals
Payment association

should be selected.

Do not introduce a separate history system unless required by the feature specification.

# 12. Membership Status

Membership status should preferably be derived from membership dates rather than stored as an independently editable value.

Example conceptual rules:

expiry_date >= today
    → Active

expiry_date < today
    → Expired

An optional "Expiring Soon" status may be calculated using a configurable threshold.

For example:

expiry_date <= today + configured_threshold
    → Expiring Soon

The exact threshold must be defined by the business logic.

The frontend must not independently implement a conflicting calculation.

# 13. Payments Table

Table:

payments

Purpose:

Stores money received from members.

Recommended fields:

id
receipt_id
member_id
amount
payment_method
payment_date
membership_plan_id
membership_start_date
membership_expiry_date
notes
created_at
updated_at

The exact fields may be adjusted during implementation if the final feature specification requires a better normalized structure.

# 14. Payment Rules

Every payment must:

Belong to a valid member.
Have a valid amount.
Have a valid payment date.
Have a valid payment method.
Have a unique identifier.
Be persisted atomically.

Payment amounts must never be negative.

Zero-value payments should normally be rejected unless a future feature explicitly requires them.

# 15. Money Storage

Financial values must be stored using an exact representation.

Do NOT use floating-point values such as:

REAL

for authoritative monetary calculations unless there is a documented reason.

Preferred approach:

Store monetary amounts as integer minor units.

For Pakistani Rupees:

Rs. 1,500.00

stored as:

150000

where the application defines the smallest supported monetary unit.

Alternatively, if the product explicitly decides to operate only in whole PKR, integer rupee amounts may be used.

The decision must be made once and applied consistently.

# 16. Payment Methods

Payment methods should be represented consistently.

Initial methods may include:

Cash
Easypaisa
Bank Transfer
Other

Payment methods should not be represented by inconsistent free-form strings throughout the database.

If configurable methods are introduced later, a dedicated configuration/table approach may be used.

# 17. Partial Payments

The database must support partial payments.

Example:

Membership Fee: Rs. 2,000

Payment 1:
Rs. 1,000

Payment 2:
Rs. 1,000

The system should be able to calculate:

Total Required
-
Total Paid
=
Outstanding Balance

The authoritative balance calculation belongs to the business logic layer.

Do not store redundant calculated balances unless there is a demonstrated performance requirement.

# 18. Payment Deletion / Correction

Financial records require special handling.

A normal user should not permanently delete historical payments simply to correct an error.

The implementation should prefer a controlled approach such as:

Void
Reverse
Correct

depending on the final feature design.

Any correction mechanism must preserve financial integrity and reporting accuracy.

# 19. Receipts Table

Table:

receipts

Purpose:

Stores receipt information associated with successful payments.

Recommended fields:

id
receipt_number
payment_id
issued_at
created_at

The exact relationship between payments and receipts must be finalized before implementation.

# 20. Receipt Numbers

Receipt numbers must be unique.

Example:

RCP-000001
RCP-000002
RCP-000003

Receipt numbers must not be generated solely in the frontend.

The authoritative receipt number generation must happen in the backend/application layer.

The system must prevent duplicate receipt numbers.

# 21. Receipt Reprinting

A receipt must remain reproducible after the original payment.

The system should be able to retrieve the payment and relevant receipt information later.

Example workflow:

Payment History
      ↓
Select Payment
      ↓
View Receipt
      ↓
Print Again

Reprinting must not create a second financial transaction.

# 22. Expenses Table

Table:

expenses

Purpose:

Stores gym operating expenses.

Recommended fields:

id
category
description
amount
expense_date
notes
created_at
updated_at

Examples:

Rent
Electricity
Maintenance
Cleaning
Equipment
Salary
Other

# 23. Expense Categories

Expense categories should be represented consistently.

The application may initially provide predefined categories.

Future versions may allow custom categories.

The implementation must avoid uncontrolled spelling variations such as:

Electricity
electricity
Electric Bill
Electric

representing the same category.

# 24. Settings Table

Table:

settings

Purpose:

Stores application-level configuration.

Possible settings include:

gym_name
gym_address
gym_phone
currency
receipt_configuration
printer_configuration

A key-value structure may be used if appropriate.

Settings must be validated when written.

# 25. Database Constraints

The database should enforce data integrity wherever practical.

Examples:

PRIMARY KEY
UNIQUE
NOT NULL
FOREIGN KEY
CHECK

Examples of useful constraints:

payment.amount > 0
member_number UNIQUE
receipt_number UNIQUE

Foreign keys must be enabled for SQLite.

# 26. Foreign Keys

SQLite foreign-key enforcement must explicitly be enabled.

The application must not assume that SQLite will automatically enforce foreign keys unless it has configured the connection appropriately.

Examples:

payments.member_id
        ↓
members.id
payments.membership_plan_id
        ↓
membership_plans.id

Foreign-key behavior must be explicitly defined.

# 27. Indexing

Indexes should be created for fields frequently used in:

Search
Filtering
Sorting
Foreign-key lookups
Reports

Likely candidates include:

members.member_number
members.full_name
members.phone

payments.member_id
payments.payment_date
payments.payment_method

expenses.expense_date
expenses.category

Indexes should be introduced based on actual query patterns rather than indiscriminately indexing every column.

# 28. Search

Search must use appropriate database queries.

For example, member search may use:

member_number
full_name
phone

Search queries must be parameterized.

User input must never be concatenated directly into SQL.

# 29. Filtering

Filtering should occur at the database/repository level whenever appropriate.

Example payment filtering:

date_from
date_to
member
payment_method

Example member filtering:

status
membership_plan
date_from
date_to

The frontend should send structured filter parameters.

The repository should construct safe parameterized queries.

# 30. Sorting

Sorting must use a controlled list of allowed fields.

The application must never insert arbitrary user-provided column names directly into SQL.

Example:

Allowed:

name
member_number
created_at
expiry_date

The repository maps these logical fields to known SQL columns.

# 31. Pagination

Large lists should support pagination where appropriate.

The repository should support:

limit
offset

or another appropriate pagination strategy.

The frontend should not load unnecessarily large datasets when only a subset is displayed.

# 32. Transactions

Transactions must be used for operations where multiple database changes must succeed or fail together.

Example payment workflow:

BEGIN
    Create Payment
    Generate Receipt
    Persist Receipt
COMMIT

If any required operation fails:

ROLLBACK

This prevents partially completed operations.

# 33. Database Migrations

All schema changes must be handled through migrations.

Never manually modify production databases using ad-hoc SQL without a migration.

Example:

migrations/
├── 001_initial_schema.sql
├── 002_add_expense_categories.sql
└── 003_add_member_notes.sql

Migration files must be:

Ordered
Immutable after release
Tested
Versioned

A migration that has already shipped must not be casually edited.

Create a new migration instead.

# 34. Migration Rules

Before applying a migration:

Validate SQL.
Test against a clean database.
Test against a database containing realistic data.
Verify rollback/recovery strategy where applicable.
Verify application compatibility.

Database migration failures must be handled safely.

# 35. Seed Data

Development/test environments may use seed data.

Example:

Demo Member
Monthly Membership
Cash Payment
Sample Expense

Production should not contain fake/demo data unless explicitly requested.

Seed scripts must be clearly separated from migrations.

# 36. Database Backup

The application must provide a user-accessible backup mechanism.

A backup should contain all necessary application data.

The user should be able to choose a destination where appropriate.

Recommended filename:

gym-backup-2026-08-26-1430.db

The backup process must avoid creating a corrupt/incomplete database copy.

The implementation should use a safe SQLite backup/copy strategy rather than blindly copying an actively changing database file.

# 37. Database Restore

Restore is a potentially destructive operation.

Before restoring:

User requests restore
        ↓
Confirmation
        ↓
Current database backup
        ↓
Validate selected backup
        ↓
Close/prepare database
        ↓
Restore
        ↓
Verify database
        ↓
Restart/reload application

If restoration fails, the original database must remain recoverable.

# 38. Data Integrity

The system must prioritize preservation of historical financial data.

The following should never be silently changed:

Historical payment amount
Receipt number
Payment date
Financial totals

Any correction process must be explicit.

# 39. Database Error Handling

Database errors must be converted into application-level errors.

For example:

SQLite UNIQUE constraint
        ↓
Application Error
        ↓
"Member number already exists."

The user should not see:

UNIQUE constraint failed: members.member_number

unless the application is in a developer/debug mode.

# 40. Concurrency

The application is primarily designed for local single-computer operation.

The architecture should still avoid unsafe assumptions about simultaneous database operations.

Transactions and SQLite locking behavior must be respected.

The application must avoid unnecessary concurrent writes.

# 41. Database Security

The application must:

Use parameterized queries.
Validate input.
Restrict filesystem access through appropriate application permissions.
Avoid exposing database paths unnecessarily.
Avoid storing secrets directly in the database.
Prevent arbitrary SQL execution from the frontend.

The frontend must never receive a generic "execute SQL" capability.

# 42. Database Testing

Database tests must verify:

Members
Create member
Read member
Update member
Archive member
Duplicate member number
Invalid data

Payments
Create payment
Invalid amount
Invalid member
Partial payment
Multiple payments
Receipt generation
Transaction rollback

Expenses
Create expense
Update expense
Invalid amount
Date filtering

Reports
Correct totals
Correct date ranges
Correct filters
Correct expense calculations

# 43. Financial Calculation Rules

The database stores source data.

The business/service layer calculates authoritative financial results.

For example:

Total Revenue
=
SUM(valid payments)
Total Expenses
=
SUM(valid expenses)
Net Income
=
Total Revenue - Total Expenses

The exact rules for voided/reversed transactions must be defined by the feature specification.

# 44. Report Query Rules

Report queries must:

Use parameterized SQL.
Respect date boundaries.
Respect transaction status.
Use appropriate indexes.
Return deterministic results.
Avoid duplicated financial calculations across reports.

Report-specific SQL should remain inside the repository/persistence layer.

Business interpretation of the returned data belongs to the service layer.

# 45. Database Naming Conventions

Use consistent naming.

Recommended:

snake_case

Examples:

member_id
payment_date
created_at
updated_at
membership_plan_id

Avoid:

MemberID
memberID
paymentDate
createdAt

# 46. Nullability Rules

Nullable fields should be used deliberately.

Do not make every field nullable simply because it is convenient.

Required data should be represented as required.

Optional information may use NULL.

The application must distinguish between:

missing
empty
zero
false

where the distinction matters.

# 47. Data Formatting

Database values should remain normalized and machine-friendly.

Formatting belongs primarily to the presentation layer.

For example:

Database:

2000

UI:

Rs. 2,000

Do not store formatted strings such as:

"Rs. 2,000"

as the authoritative monetary value.

# 48. No Redundant Derived Data

Avoid storing values that can reliably be calculated from existing data.

For example, do not store:

member.total_paid

if it can be calculated from payments.

Do not store:

member.outstanding_balance

unless there is a demonstrated reason to cache it.

Redundant financial values create synchronization problems.

# 49. Database Source of Truth

SQLite is the source of truth for persisted application data.

React state is not the source of truth.

Cached frontend data is not the source of truth.

Derived UI values are not the source of truth.

The backend/database combination determines authoritative persisted state.

# 50. Database Change Checklist

Any database modification must follow:

Requirement
    ↓
Update Database Specification
    ↓
Design Schema Change
    ↓
Create Migration
    ↓
Update Models
    ↓
Update DTOs
    ↓
Update Repository
    ↓
Update Service
    ↓
Update Commands
    ↓
Update Frontend
    ↓
Add Tests
    ↓
Run Migration Tests

# 51. AI Database Rules

AI coding agents must follow these rules.

Never:
❌ Modify database schema without a migration
❌ Put SQL inside React
❌ Put SQL inside UI components
❌ Concatenate user input into SQL
❌ Create duplicate tables for the same concept
❌ Store formatted currency strings as authoritative values
❌ Delete financial history casually
❌ Add columns without documenting them
❌ Change shipped migrations
❌ Bypass repositories

Always:
✓ Inspect existing schema first
✓ Reuse existing tables
✓ Use migrations
✓ Use parameterized queries
✓ Add appropriate indexes
✓ Add database tests
✓ Preserve financial history
✓ Maintain foreign-key integrity
✓ Update this document when schema behavior changes

# 52. Final Database Principle

The database should remain:

Simple
        +
Normalized
        +
Consistent
        +
Testable
        +
Recoverable
        +
Financially Reliable

The goal is not to create the largest possible schema.

The goal is to create the smallest reliable database that completely supports the application's requirements.

Any future database complexity must be justified by an actual product requirement.

### The key thing we locked down here

We're **not overengineering the gym app**. The database is deliberately small:

```text
Members
   │
   ├── Membership
   │
   └── Payments ─── Receipts

Expenses

Settings
```

And we're making financial data immutable/recoverable, money exact, SQL isolated in repositories, migrations mandatory, and every DB operation testable. That's exactly the kind of guardrails that make vibe-coding much safer.
