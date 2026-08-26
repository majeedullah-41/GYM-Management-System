# Gym Management System — Database Specification

**Document Version:** 1.0  
**Status:** Foundation  
**Database:** SQLite  
**Application:** Tauri Desktop  
**Architecture:** Layered Architecture  

---

# 1. Purpose

This document defines the database structure, relationships, constraints, indexing strategy, migration rules, and data-integrity requirements for the Gym Management System.

The database must remain:

- Simple
- Reliable
- Normalized
- Easy to migrate
- Easy to back up
- Fast for expected gym workloads
- Safe for financial records

SQLite is the primary and authoritative source of application data.

---

# 2. Database Principles

The database must follow these principles:

1. SQLite is the source of truth.
2. All schema changes must use migrations.
3. SQL must remain inside the repository/database layer.
4. Financial records must be preserved.
5. Foreign-key relationships must be enforced.
6. Important fields must have appropriate constraints.
7. Frequently filtered fields should have indexes.
8. Hard deletion must be avoided where historical records depend on the data.
9. Database operations must use parameterized queries.
10. No frontend component may directly access SQLite.

---

# 3. High-Level Database Structure

The initial database should contain the following core entities:

```text
members
membership_plans
payments
expenses
settings
```

Additional supporting tables may be introduced when genuinely required.

# 4. Entity Relationship Overview

Conceptually:

```text
┌─────────────────────┐
│  membership_plans   │
└──────────┬──────────┘
           │
           │
           ▼
┌─────────────────────┐
│       members       │
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐
│      payments       │
└─────────────────────┘


┌─────────────────────┐
│      expenses       │
└─────────────────────┘


┌─────────────────────┐
│      settings       │
└─────────────────────┘
```

# 5. Members Table

Table:

members

Purpose:

Stores gym member information.

Recommended fields:

id
member_number
full_name
phone
membership_plan_id
membership_start_date
membership_end_date
status
gender
date_of_birth
address
emergency_contact
notes
created_at
updated_at
archived_at

# 6. Member ID

Primary key:

id

Type:

INTEGER

The internal database ID should not necessarily be displayed to users.

Users should see a human-readable member number.

Example:

GYM-00001
GYM-00002
GYM-00003

# 7. Member Number

Field:

member_number

Requirements:

NOT NULL
UNIQUE

The member number must never be duplicated.

# 8. Member Name

Field:

full_name

Requirements:

NOT NULL

The system should reject an empty member name.

# 9. Member Phone

Field:

phone

Recommended:

NOT NULL

unless the final product requirements explicitly allow members without phone numbers.

Phone numbers should be stored as text, not numeric values.

Reason:

03001234567

must not become:

3001234567

# 10. Membership Plan Relationship

Field:

membership_plan_id

References:

membership_plans.id

Foreign-key enforcement must be enabled.

# 11. Membership Dates

Members should store:

membership_start_date
membership_end_date

Dates should use a consistent storage format.

Recommended:

YYYY-MM-DD

Example:

2026-08-26

Do not store dates in inconsistent human-readable formats.

# 12. Member Status

A status field may be used for lifecycle state such as:

active
archived

Membership health such as:

Active
Expiring Soon
Expired

should preferably be derived from membership dates rather than permanently storing duplicate state.

This avoids contradictions.

# 13. Archived Members

When a member is archived:

archived_at

should be populated.

Historical payment records must remain intact.

Example:

Member
  ↓
Archived
  ↓
Payments remain accessible

# 14. Optional Member Information

The following fields should be optional:

gender
date_of_birth
address
emergency_contact
notes

The application should not require unnecessary personal information.

# 15. Membership Plans Table

Table:

membership_plans

Purpose:

Stores reusable membership plans.

Recommended fields:

id
name
duration_days
price
description
is_active
created_at
updated_at

# 16. Membership Plan Constraints

Required:

name NOT NULL
duration_days > 0
price >= 0

Plan names should be unique where appropriate.

# 17. Example Membership Plans

Examples:

Monthly
Quarterly
Half-Yearly
Yearly

The gym owner should be able to configure plans rather than having them hard-coded.

# 18. Deactivating Membership Plans

A membership plan should normally be deactivated instead of permanently deleted when historical records reference it.

Example:

is_active = false

This prevents historical records from losing their plan reference.

# 19. Payments Table

Table:

payments

Purpose:

Stores every successful payment received by the gym.

Recommended fields:

id
receipt_number
member_id
amount
payment_date
payment_method
description
notes
created_at
updated_at

# 20. Payment ID

Primary key:

id

Type:

INTEGER

The internal ID is separate from the user-visible receipt number.

# 21. Receipt Number

Field:

receipt_number

Requirements:

NOT NULL
UNIQUE

Example:

RCP-000001
RCP-000002
RCP-000003

Receipt numbers must never be reused.

# 22. Payment Member Relationship

Field:

member_id

References:

members.id

Every payment must belong to an existing member.

Foreign-key enforcement must be enabled.

# 23. Payment Amount

Field:

amount

Requirements:

NOT NULL
amount > 0

Amounts should not be stored using floating-point values.

Preferred approach:

Store monetary values as integer minor units where appropriate.

For Pakistani Rupees:

Rs. 1,500

can be represented as:

150000

if using paisa as the smallest unit.

If the application deliberately works only with whole rupees, integer rupees may also be used.

The chosen representation must remain consistent throughout the application.

# 24. Payment Date

Field:

payment_date

Must be required.

Recommended format:

YYYY-MM-DD

If exact time is required later, a separate timestamp can be introduced.

# 25. Payment Method

Field:

payment_method

Initial possible values:

cash
bank_transfer
easypaisa
jazzcash
other

The final implementation may move payment methods into a dedicated configuration table if customization requires it.

# 26. Payment Description

Field:

description

Optional.

Example:

Monthly Membership
Membership Renewal
Registration Fee
Other

# 27. Payment Immutability

Financial history must be protected.

A payment should not be casually deleted.

If payment correction/voiding is introduced, it should use a controlled mechanism rather than silently removing financial history.

# 28. Expenses Table

Table:

expenses

Purpose:

Stores money spent by the gym.

Recommended fields:

id
title
amount
category
expense_date
description
notes
created_at
updated_at

# 29. Expense Amount

Requirements:

NOT NULL
amount > 0

Use the same monetary representation as payments.

Never mix:

integer rupees

and:

floating-point amounts

within the same financial system.

# 30. Expense Category

Initial categories may include:

rent
electricity
equipment
maintenance
cleaning
supplies
salary
other

The final category list should be configurable if required.

# 31. Expense Date

Field:

expense_date

Required.

Recommended format:

YYYY-MM-DD

# 32. Settings Table

Table:

settings

Purpose:

Stores application-level configuration.

Possible structure:

id
key
value
updated_at

Example settings:

gym_name
gym_phone
gym_address
gym_email
currency
receipt_prefix

# 33. Settings Design

Settings should not require a new database column every time a simple configurable value is added.

A key/value structure is appropriate for general application settings.

Example:

key:
gym_name

value:
Eagle Fitness Gym

Sensitive secrets should not be stored in plain text settings.

# 34. Timestamps

Core entities should use timestamps where useful.

Recommended:

created_at
updated_at

Use a consistent timestamp format throughout the application.

Recommended:

UTC timestamp

or another clearly defined consistent strategy.

# 35. Timezone Handling

The application is intended for local gym usage.

The application should consistently display dates according to the configured/local timezone.

The database representation and UI representation must not accidentally shift dates.

Date-only business values such as:

membership_end_date
payment_date
expense_date

should be treated as dates rather than accidentally converted through UTC timestamp logic.

# 36. Foreign Keys

SQLite foreign keys must explicitly be enabled.

Conceptually:

PRAGMA foreign_keys = ON;

This should be enforced through the database initialization layer.

# 37. Referential Integrity

The database must prevent invalid relationships.

Example:

Payment
    ↓
member_id = 999999

when member 999999 does not exist.

This must fail safely.

# 38. Delete Rules

Be careful with cascading deletes.

Financial history should never disappear because a member is deleted.

Preferred behavior:

Member archived
        ↓
Payment history preserved

Avoid:

DELETE MEMBER
      ↓
CASCADE
      ↓
DELETE PAYMENTS

for financial records.

# 39. Indexing

Indexes should be added for frequently searched or filtered fields.

Potential indexes:

members.member_number
members.phone
members.full_name
members.membership_end_date
members.status

payments.receipt_number
payments.member_id
payments.payment_date
payments.payment_method

expenses.expense_date
expenses.category

Do not create indexes for every column automatically.

Indexes should support actual query patterns.

# 40. Search Strategy

Member search will likely use:

full_name
phone
member_number

The repository layer should implement search efficiently.

If the dataset is small, straightforward SQLite queries are acceptable.

Do not introduce a search engine or external database unnecessarily.

# 41. Filtering

Filters should be implemented at the database/query level when practical.

Examples:

Members:
status
membership plan
expiry date

Payments:
date range
member
payment method

Expenses:
date range
category

Do not load huge datasets into React simply to filter them.

# 42. Pagination

The application is expected to handle a normal gym-sized dataset.

Pagination may be used for large lists.

Example:

LIMIT
OFFSET

or an equivalent strategy.

Do not add complicated pagination architecture if normal datasets do not require it.

# 43. Sorting

Sorting should be deterministic.

For example:

ORDER BY payment_date DESC, id DESC

can prevent records with identical dates from appearing in unpredictable order.

# 44. Database Transactions

Use transactions for operations that require multiple changes to succeed together.

Example:

BEGIN TRANSACTION

Create payment
Generate receipt record
Update required membership information

COMMIT

If something fails:

ROLLBACK

# 45. Payment Transaction

Receiving a payment is a critical operation.

The application must guarantee that:

Payment saved

and any required related updates happen atomically.

Printing is NOT part of the database transaction.

Correct:

Database Transaction
       ↓
Payment Saved
       ↓
Transaction Committed
       ↓
Receipt Printed

# 46. Printing Failure

If printing fails:

Payment remains saved.

The user should be able to retry printing.

Never rollback a successfully committed payment merely because a physical printer failed.

# 47. Financial Source of Truth

Financial reports must derive from financial records.

Revenue:

SUM(valid payments)

Expenses:

SUM(valid expenses)

Net income:

Revenue - Expenses

The dashboard, finance section, and reports must use the same underlying financial logic.

# 48. Database Migrations

All schema changes must use migrations.

Never manually modify a production database schema without a migration.

Example:

001_initial_schema
002_add_member_notes
003_add_payment_method
004_add_expense_category

Migration names should clearly describe their purpose.

# 49. Migration Rules

Each migration must be:

Ordered
Reproducible
Tested
Idempotent where appropriate
Safe for existing data

Never modify an old migration that may already have been executed on user systems.

Create a new migration instead.

# 50. Fresh Database Test

A fresh installation must be able to:

Create database
      ↓
Run migrations
      ↓
Create required tables
      ↓
Insert initial configuration if required
      ↓
Launch application

No manual database setup should be required.

# 51. Existing Database Upgrade

When updating the application:

Existing database
       ↓
New application
       ↓
Pending migrations
       ↓
Updated schema
       ↓
Existing data preserved

This workflow must be tested before release.

# 52. Seed Data

Production should not automatically contain fake members or payments.

Development/test environments may use seed data.

Example:

DEV:
Test members
Test payments
Test expenses

PRODUCTION:
Empty database

# 53. Backup

The database should support backup.

The simplest initial approach is to create a safe copy of the SQLite database.

Backup operations must account for SQLite consistency.

Do not blindly copy an actively modified database without considering SQLite's backup requirements.

# 54. Restore

Restore must be treated as a destructive operation.

Before restoring:

Show confirmation

Recommended:

Are you sure?

Restoring this backup will replace the current application data.

The current database should preferably be backed up before replacement.

# 55. Backup Testing

Backup/restore must be tested.

Workflow:

Create test data
      ↓
Backup
      ↓
Modify/delete data
      ↓
Restore
      ↓
Verify original data

# 56. Database Security

Although SQLite is local, the database should still be treated as sensitive.

Do not:

Expose database path unnecessarily
Expose arbitrary SQL execution to frontend
Allow arbitrary SQL commands from UI

# 57. Parameterized Queries

Never construct SQL by concatenating user input.

Bad:

"SELECT * FROM members WHERE name = '" + userInput + "'"

Good:

SELECT * FROM members WHERE name = ?

with parameters.

# 58. Database Access Rule

Only the repository/database layer may directly execute SQL.

Forbidden:

React → SQLite
React → SQL
Tauri Command → SQL
Service → raw SQL

Preferred:

Tauri Command
      ↓
Service
      ↓
Repository
      ↓
SQLite

# 59. Database Error Handling

Database errors must be translated into meaningful application errors.

Example:

SQLite UNIQUE constraint
        ↓
MemberRepository error
        ↓
Application conflict error
        ↓
Frontend
        ↓
"Member number already exists."

Raw SQL errors should not normally be displayed to users.

# 60. Financial Data Integrity

The following must always remain accurate:

Payment amount
Payment member
Payment date
Receipt number
Expense amount
Expense date
Financial totals

Any change affecting these fields requires appropriate tests.

# 61. Historical Data

Historical financial records must remain available.

For example:

Member
   ↓
Payment
   ↓
Member archived

must produce:

Payment still exists
Payment still appears in reports
Payment still contributes to historical financial totals

# 62. Database Naming Convention

Use:

snake_case

for:

tables
columns
indexes
constraints

Examples:

membership_plans
membership_start_date
payment_method
created_at

Avoid:

MembershipPlans
MembershipPlansTable
memberName

# 63. Table Naming

Use plural nouns:

members
membership_plans
payments
expenses
settings

# 64. Primary Key Convention

Use:

id

as the internal primary key for normal entities.

Example:

members.id
payments.id
expenses.id

# 65. User-Facing Identifiers

User-facing identifiers should be separate from internal database IDs.

Examples:

Member Number:
GYM-00001

Receipt Number:
RCP-000001

This makes identifiers readable without exposing database implementation details.

# 66. Soft Deletion

Use soft deletion/archive behavior where historical relationships matter.

Recommended for members:

archived_at

Recommended for membership plans:

is_active

Do not automatically implement soft deletion for every table.

# 67. Database Normalization

Avoid unnecessary duplication.

For example, payment records should reference:

member_id

rather than repeatedly storing:

member_name
member_phone
member_address

inside every payment.

Historical snapshots should only be stored when there is a deliberate business requirement.

# 68. Denormalization

Denormalization may be introduced only when:

There is a demonstrated performance need.
The data consistency implications are understood.
Tests cover the duplicated data.

Do not denormalize prematurely.

# 69. Database Testing Requirements

Every repository must have appropriate tests.

Minimum:

Create
Read
Update
Delete/Archive
Search
Filtering
Constraints
Relationships

Critical financial repositories require additional transaction tests.

# 70. Schema Change Checklist

Before changing the database:

[ ] Is the change actually required?
[ ] Does an existing column/table already solve the problem?
[ ] Is a migration required?
[ ] Could existing data be affected?
[ ] Are indexes required?
[ ] Are foreign keys affected?
[ ] Are repositories affected?
[ ] Are services affected?
[ ] Are frontend types affected?
[ ] Are tests required?

# 71. AI Database Rules

AI coding agents MUST:

[ ] Read this document before changing the database
[ ] Inspect existing migrations
[ ] Never modify old applied migrations
[ ] Create a new migration for schema changes
[ ] Update repository code
[ ] Update models/DTOs
[ ] Update tests
[ ] Verify existing data compatibility

# 72. AI Must Never

AI agents must NOT:

❌ Create duplicate tables
❌ Create duplicate columns
❌ Store the same financial value in multiple places without reason
❌ Modify old migrations
❌ Delete financial history
❌ Use floating-point money calculations
❌ Concatenate user input into SQL
❌ Put SQL in React
❌ Put SQL directly in Tauri commands
❌ Change schema without tests

# 73. Database Definition of Done

A database change is complete only when:

[ ] Schema designed
[ ] Migration created
[ ] Migration tested
[ ] Repository updated
[ ] Service updated if necessary
[ ] DTOs updated
[ ] Frontend types updated if necessary
[ ] Automated tests added
[ ] Existing tests pass
[ ] Existing data compatibility verified

# 74. Final Database Architecture

The final database flow should remain:

React
  │
  ▼
Tauri IPC
  │
  ▼
Rust Command
  │
  ▼
Service
  │
  ▼
Repository
  │
  ▼
SQLite

SQLite is the final source of truth.

No other layer should bypass the architecture.

# 75. Golden Rule

The database should remain boring.

Prefer:

Simple schema
Simple relationships
Simple queries
Strong constraints
Clear migrations
Reliable transactions

over:

Complex schema
Premature optimization
Unnecessary tables
Duplicate data
Clever SQL
