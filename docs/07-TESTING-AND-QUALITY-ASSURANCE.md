# Gym Management System — Testing & Quality Assurance

**Document Version:** 1.0  
**Status:** Foundation  
**Platform:** Windows Desktop  
**Frontend:** React + TypeScript  
**Backend:** Rust + Tauri  
**Database:** SQLite  

---

# 1. Purpose

This document defines how the Gym Management System must be tested throughout development.

The objective is to ensure that the application is:

- Reliable
- Predictable
- Maintainable
- Resistant to regressions
- Safe for financial operations
- Stable during real-world usage

Testing is part of development, not a final step.

---

# 2. Core Testing Rule

## No Feature Is Complete Without Tests

Whenever a new functionality is implemented:

```text
Requirement
    ↓
Implementation
    ↓
Automated Tests
    ↓
Bug Fixes
    ↓
Regression Tests
    ↓
Feature Complete
```

The developer or AI agent must not consider a feature complete simply because it appears to work in the UI.

# 3. Testing Pyramid

The project should use multiple testing levels.

```text
                 ┌───────────────┐
                 │   UI / E2E    │
                 │    Tests      │
                 └───────┬───────┘
                         │
                ┌────────┴────────┐
                │   Integration   │
                │      Tests      │
                └────────┬────────┘
                         │
               ┌─────────┴─────────┐
               │    Unit Tests     │
               │                   │
               └───────────────────┘
```

Most tests should be unit tests.

Critical workflows should also have integration tests.

# 4. Test Categories

The project should use:

Unit Tests
Integration Tests
Database Tests
IPC Tests
Frontend Component Tests
Validation Tests
Business Logic Tests
Financial Tests
Regression Tests
End-to-End Tests

Not every tiny UI change requires an end-to-end test.

# 5. Unit Tests

Unit tests verify isolated functionality.

Examples:

calculateOutstandingBalance()
calculateMembershipStatus()
calculateNetIncome()
formatCurrency()
validateMember()
validatePayment()

Unit tests should be fast and deterministic.

# 6. Business Logic Tests

Every important business rule must have automated tests.

Examples:

Active membership
Expired membership
Expiring membership
Payment amount validation
Outstanding balance
Revenue calculation
Expense calculation
Net income calculation

Example:

Given:
Membership price = Rs. 2,000
Payment = Rs. 1,500

Expected:
Outstanding = Rs. 500

# 7. Membership Status Tests

Membership status must be tested against different dates.

Example cases:

Expiry in 30 days
Expiry in 7 days
Expiry tomorrow
Expiry today
Expiry yesterday
Expiry one month ago

Tests must explicitly define expected status.

# 8. Financial Calculation Tests

Financial calculations are critical.

At minimum test:

Total payments
Total expenses
Net income
Outstanding amounts
Partial payments
Multiple payments
Date-range totals
Payment method totals

Example:

Payments:
Rs. 2,000
Rs. 3,000
Rs. 5,000

Expected Revenue:
Rs. 10,000

# 9. Payment Tests

Payment processing must have extensive automated coverage.

Test:

Valid payment
Zero payment
Negative payment
Very large payment
Partial payment
Payment for existing member
Payment for invalid member
Payment with valid method
Payment with invalid method

# 10. Payment Transaction Test

A payment operation may involve multiple database changes.

Test that:

Payment succeeds
→ All related records are created

and:

One operation fails
→ Transaction rolls back

No partial financial transaction should remain.

# 11. Receipt Tests

Receipt generation should be tested independently from printing.

Test:

Receipt number generated
Correct member
Correct amount
Correct date
Correct payment method
Correct gym information
Correct membership information

# 12. Printing Tests

Printing should be tested separately from payment creation.

Critical rule:

Payment succeeds
+
Printing fails
=
Payment remains saved

The user must be able to retry printing.

Printing failure must never silently delete or reverse a successful payment.

# 13. Database Tests

Repositories must be tested against a test SQLite database.

Tests should verify:

Insert
Read
Update
Delete
Filtering
Sorting
Pagination
Relationships
Constraints
Transactions

# 14. Test Database

Tests must NOT use the user's real production database.

Use a separate temporary/test database.

Example:

Production:
gym.sqlite

Testing:
temporary test database

Tests should clean up after themselves.

# 15. Database Isolation

Tests should not depend on the order in which previous tests ran.

Bad:

Test B requires Test A to have created a member.

Good:

Test B creates its own required test data.

Every test should establish its own required state.

# 16. Repository Tests

Every important repository operation should have tests.

Example:

MemberRepository

create()
get_by_id()
list()
search()
update()
archive()

Payments:

PaymentRepository

create()
get_by_id()
list()
filter()

Expenses:

ExpenseRepository

create()
update()
delete()
list()

# 17. Filtering Tests

Filtering is a major application requirement.

Each filter must be tested.

Examples:

Member status
Membership plan
Payment method
Date range
Expense category
Search term

Test combinations where relevant.

Example:

Status = Active
+
Plan = Monthly

must return only matching records.

# 18. Search Tests

Search functionality must be tested against:

Exact name
Partial name
Phone number
Member ID
Mixed case
No result
Special characters
Empty search

Search must not crash on unexpected input.

# 19. CRUD Testing

Every CRUD feature must have the following test coverage:

Create
Read
Update
Delete / Archive
Validation
Error handling

Example:

Member CRUD

Create Member
↓
Read Member
↓
Update Member
↓
Archive Member
↓
Verify archived member

# 20. Archive vs Delete

If the application uses archive behavior for members, tests must verify that:

Archived member
≠
Deleted member

Historical financial records must remain intact.

# 21. Validation Tests

Validation rules must be tested independently.

Examples:

Required name
Valid phone
Invalid phone
Valid payment amount
Invalid amount
Valid date
Invalid date

Do not rely only on frontend validation tests.

# 22. Backend Validation

Even if React prevents invalid input, Rust must validate important business rules.

Test cases must verify that invalid data cannot bypass the frontend and enter the database.

# 23. Database Constraint Tests

Database constraints must also be tested.

Examples:

Required fields
Unique member numbers
Foreign keys
Valid relationships

The database is the final integrity boundary.

# 24. IPC Tests

Tauri commands must be tested where practical.

Example:

Frontend Request
      ↓
Tauri Command
      ↓
Service
      ↓
Response

Test:

Valid request
Invalid request
Expected result
Expected error

# 25. IPC Contract

Frontend and Rust communication must use stable contracts.

If a backend response changes:

MemberResponse

the related frontend types/tests must be updated.

Do not silently change IPC response structures.

# 26. Frontend Component Tests

Important reusable components should have tests where behavior exists.

Examples:

MemberTable
PaymentForm
MemberForm
FilterBar
DateRangePicker
ConfirmationDialog

Test meaningful behavior rather than implementation details.

# 27. Frontend Form Tests

Forms should test:

Initial state
Required fields
Invalid input
Valid input
Submission
Loading state
Success state
Error state
Cancel behavior

# 28. Table Tests

Tables should test:

Data rendering
Empty state
Loading state
Search
Filters
Sorting
Pagination
Row actions

# 29. Dashboard Tests

Dashboard tests should verify that KPI values correspond to backend data.

Examples:

Total members
Active members
Expiring members
Expired members
Today's revenue
Monthly revenue

Do not hard-code KPI expectations into the UI tests.

# 30. Report Tests

Reports are especially important because incorrect reports can lead to incorrect business decisions.

Test:

Date range
Today
This week
This month
Last month
Custom range
Member filter
Payment method filter
Membership filter

# 31. Report Accuracy

Given known test data:

Payment A = Rs. 2,000
Payment B = Rs. 3,000
Expense A = Rs. 1,000

Expected:

Revenue = Rs. 5,000
Expenses = Rs. 1,000
Net = Rs. 4,000

The test must verify the actual calculated values.

# 32. Date Boundary Tests

Date-based reports must test boundaries.

Examples:

00:00:00
23:59:59
Start of month
End of month
Start of year
End of year

This helps prevent off-by-one-day reporting bugs.

# 33. Custom Report Tests

Custom reports should verify:

Correct filters
Correct date range
Correct records
Correct totals
Correct ordering

# 34. Regression Testing

Whenever a bug is discovered:

Find bug
↓
Fix bug
↓
Create regression test
↓
Run full relevant test suite

The bug must not be fixed without preserving a test for it when practical.

# 35. Golden Rule for Bug Fixes

Never simply change code until the bug disappears.

Preferred process:

1. Reproduce bug
2. Create failing test
3. Fix implementation
4. Test passes
5. Run related tests
6. Run regression suite

# 36. Test Naming

Test names must clearly describe expected behavior.

Bad:

test_payment()

Good:

should_calculate_remaining_balance_after_partial_payment()

Frontend equivalent:

should_show_validation_error_when_payment_amount_is_zero()

# 37. Arrange / Act / Assert

Tests should generally follow:

Arrange
Act
Assert

Example:

Arrange:
Create member with Rs. 2,000 membership.

Act:
Record Rs. 1,500 payment.

Assert:
Outstanding amount is Rs. 500.

# 38. Test Data

Use realistic but clearly artificial test data.

Example:

Ahmad Khan
03000000000
TEST-MEMBER-001

Never use real customer/member data in automated tests.

# 39. Test Fixtures

Reusable test fixtures may be created for common scenarios.

Example:

active_member()
expired_member()
member_with_payment()
member_with_partial_payment()

Fixtures must remain simple and understandable.

# 40. Mocking

Mock external dependencies when necessary.

Examples:

Printer
Filesystem
Operating system APIs

Do not mock SQLite for repository integration tests.

Repository tests should use an actual test SQLite database.

# 41. Printer Testing

Printer integration can be difficult to automate.

Therefore separate:

Receipt Generation

from:

Physical Printing

Receipt generation should be fully automated-testable.

Actual printer verification should be part of manual QA.

# 42. Backup Testing

If backup/restore exists, test:

Create backup
Backup exists
Restore backup
Data restored correctly
Invalid backup rejected
Corrupt backup handled safely

A backup feature is not complete until restoration is tested.

# 43. Data Integrity Tests

Test that financial history remains consistent.

Example:

Create member
↓
Create payment
↓
Archive member
↓
Payment still exists
↓
Financial report still includes payment

# 44. Concurrency

The application is primarily a local desktop application.

Concurrency requirements are therefore limited.

However, the database must still protect against inconsistent writes.

Transactions should be used for multi-step operations.

# 45. Crash Safety

Critical operations should minimize the possibility of corrupting data if the application closes unexpectedly.

Especially:

Payments
Expenses
Database migrations
Backup/restore

# 46. Migration Testing

Every database migration must be tested.

Test:

Existing database
↓
Migration
↓
New schema
↓
Existing data remains valid

Never assume migrations work simply because the application starts.

# 47. Fresh Installation Test

The application must work on a clean installation.

Test:

Install
↓
Launch
↓
Initialize database
↓
Run migrations
↓
Create first configuration
↓
Create member
↓
Receive payment

# 48. Upgrade Test

When a new version is released:

Old application/database
↓
Install new version
↓
Database migration
↓
Existing data remains accessible

This must be tested before release.

# 49. UI Quality Testing

Visual quality must also be checked.

Review:

Spacing
Typography
Alignment
Table density
Button consistency
Empty states
Loading states
Error states
Modal sizes

The UI must remain consistent across all modules.

# 50. No Visual Regression

A change to one component should not unintentionally break other screens.

After modifying shared components:

Button
Table
Modal
Input
Card
Badge

review all affected screens.

# 51. Manual QA Checklist

Before release:

[ ] Application launches
[ ] Database initializes
[ ] Dashboard loads
[ ] Member creation works
[ ] Member editing works
[ ] Member search works
[ ] Member filtering works
[ ] Member archive works
[ ] Payment creation works
[ ] Payment filtering works
[ ] Receipt generation works
[ ] Receipt printing works
[ ] Expense creation works
[ ] Reports work
[ ] Weekly report works
[ ] Monthly report works
[ ] Custom report works
[ ] Settings work
[ ] Backup works
[ ] Restore works
[ ] Application closes cleanly

# 52. Critical Financial QA

Financial functionality receives additional testing.

Before release verify:

[ ] Payment cannot be negative
[ ] Payment cannot create invalid financial state
[ ] Correct member receives payment
[ ] Correct amount is recorded
[ ] Correct payment method is recorded
[ ] Receipt matches payment
[ ] Reports match payment records
[ ] Expenses affect net income correctly
[ ] Payment history remains intact
[ ] Failed transactions roll back
[ ] Printing failure does not lose payment

# 53. Test Execution

Before committing significant changes:

Run frontend tests
Run Rust tests
Run database tests
Run integration tests

Before release:

Run complete automated test suite
Perform manual QA
Build production application
Test production build

# 54. Definition of Done

A feature is considered DONE only when:

[ ] Requirement implemented
[ ] UI implemented
[ ] Backend implemented
[ ] Database behavior implemented
[ ] Validation implemented
[ ] Error handling implemented
[ ] Loading states implemented
[ ] Empty states implemented
[ ] Unit tests added
[ ] Integration tests added where appropriate
[ ] Relevant regression tests pass
[ ] Manual workflow verified
[ ] Documentation updated if required

# 55. AI Coding Agent Testing Rule

AI coding agents MUST NOT finish a task with:

"The implementation is complete."

unless they have also verified the relevant tests.

The agent should report:

Implemented:
- Feature A
- Feature B

Tests added:
- Test A
- Test B

Tests executed:
- X passed
- Y passed
- Z failed

# 56. AI Testing Restrictions

AI agents must NOT:

❌ Delete failing tests just to make the suite pass
❌ Weaken assertions without justification
❌ Skip tests without explanation
❌ Replace real integration tests with meaningless mocks
❌ Mark untested functionality as complete
❌ Ignore unrelated test failures
❌ Modify production behavior solely to satisfy a bad test

# 57. Failure Reporting

If a test fails, the agent must report:

Test:
<test name>

Failure:
<what failed>

Likely Cause:
<cause>

Affected Area:
<area>

Status:
Fixed / Unresolved

Do not hide test failures.

# 58. Test Coverage Philosophy

High coverage is useful, but coverage percentage alone is not the goal.

Priority should be:

Financial Logic
        ↓
Business Rules
        ↓
Database Operations
        ↓
IPC
        ↓
Critical UI Workflows
        ↓
General UI

A 90% coverage number does not guarantee a reliable application.

# 59. Critical Path Testing

The following workflows must always remain tested:

Create Member
        ↓
Assign Membership
        ↓
Receive Payment
        ↓
Generate Receipt
        ↓
Print Receipt
        ↓
View Payment History
        ↓
Generate Financial Report

A regression in any of these workflows is considered high priority.

# 60. Release Gate

A release must NOT be considered production-ready if:

Critical tests fail
Financial calculations fail
Database migrations fail
Payment workflow fails
Receipt generation fails
Data integrity is compromised

# 61. Final Quality Principle

The project should follow:

Build
 ↓
Test
 ↓
Verify
 ↓
Document
 ↓
Continue

Not:

Build Everything
 ↓
Hope It Works
 ↓
Find 100 Bugs

# 62. Golden Rule

Every new feature must answer four questions:

1. Does it work?
2. Does it handle invalid input?
3. Does it fail safely?
4. Is there an automated test proving it?

If any answer is "No", the feature is not finished.
