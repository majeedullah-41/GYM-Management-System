# Gym Management System — Implementation Plan

**Document Version:** 1.0  
**Status:** Development Blueprint  
**Platform:** Windows Desktop  
**Frontend:** React + TypeScript  
**Desktop Framework:** Tauri  
**Backend:** Rust  
**Database:** SQLite  

---

# 1. Purpose

This document defines the implementation order for the Gym Management System.

The application must be developed incrementally.

Do NOT attempt to build the entire application in one pass.

Each phase must produce a working, testable state before the next phase begins.

---

# 2. Development Philosophy

The project follows:

```text
Plan
 ↓
Design
 ↓
Implement
 ↓
Test
 ↓
Verify
 ↓
Refactor
 ↓
Document
 ↓
Next Feature
```

The AI coding agent must not skip directly from planning to implementing the entire application.

# 3. Source of Truth

Before implementing anything, the AI agent must read:

01-PROJECT-OVERVIEW.md
02-ARCHITECTURE.md
03-UI-UX-SPECIFICATION.md
04-DATABASE-SPECIFICATION.md
05-FEATURE-SPECIFICATIONS.md
06-CODING-STANDARDS.md
07-TESTING-AND-QUALITY-ASSURANCE.md

If the actual project contains differently named documentation files, use the equivalent documents.

The documentation takes priority over assumptions.

# 4. Phase 0 — Project Initialization

### Objective

Create a clean Tauri + React + TypeScript + Rust project.

Initial requirements:

Tauri
React
TypeScript
Rust
SQLite

The application must launch successfully before feature development begins.

# 5. Phase 0 Checklist

[ ] Tauri project created
[ ] React frontend configured
[ ] TypeScript configured
[ ] Rust backend configured
[ ] SQLite dependency configured
[ ] Development build works
[ ] Production build works
[ ] Git repository initialized
[ ] Basic folder structure created
[ ] Linting configured
[ ] Formatting configured
[ ] Testing framework configured

# 6. Phase 1 — Architecture Foundation

Create the application layers.

Expected conceptual structure:

```text
Frontend
    ↓
Tauri IPC
    ↓
Commands
    ↓
Services
    ↓
Repositories
    ↓
Database
```

The exact folder structure must follow the architecture document.

# 7. Phase 1 Goals

Implement:

Application initialization
Database connection
Migration system
Error handling foundation
IPC foundation
Logging foundation
Configuration foundation

Do not implement business features yet.

# 8. Phase 1 Database

Create the initial migration.

Initial tables:

members
membership_plans
payments
expenses
settings

Verify:

Fresh database
Migration
Database initialization
Foreign keys
Basic constraints

# 9. Phase 1 Testing

Before continuing:

[ ] Application launches
[ ] Database initializes
[ ] Migrations execute
[ ] Foreign keys work
[ ] Database tests pass
[ ] Rust tests pass
[ ] Frontend tests pass

# 10. Phase 2 — Application Shell

Build the main application UI.

Required:

Sidebar
Top navigation/header
Main content area
Page routing
Global notification system
Modal system
Loading states
Error states

The application should already feel like a professional desktop product.

# 11. Phase 2 Navigation

Initial navigation:

Dashboard
Members
Finances
Reports
Settings

Use consistent icons, spacing and active-state behavior.

# 12. Phase 2 UI Foundation

Create reusable components:

Button
Input
Select
Date Picker
Modal
Dialog
Card
Badge
Table
Dropdown
Toast
Empty State
Loading State
Error State

Do not repeatedly create slightly different versions of the same component.

# 13. Phase 2 Testing

Test:

Navigation
Sidebar
Modal behavior
Forms
Reusable components
Loading states
Error states

# 14. Phase 3 — Membership Plans

Implement membership plan management before member management.

Required:

Create Plan
View Plans
Edit Plan
Deactivate Plan

Example:

Monthly
Rs. 2,000
30 days

# 15. Phase 3 Backend

Implement:

Plan model
Plan repository
Plan service
Tauri commands
DTOs
Validation

Keep SQL inside the repository layer.

# 16. Phase 3 Testing

Test:

Create plan
Update plan
Deactivate plan
Invalid duration
Invalid price
Duplicate plan name
Database persistence

Do not continue until tests pass.

# 17. Phase 4 — Members

Implement the Members module.

Required:

Member List
Add Member
View Member
Edit Member
Archive Member
Search
Filtering
Sorting

# 18. Phase 4 Member Form

Core fields:

Full Name
Phone
Membership Plan
Start Date
End Date

Optional:

Gender
Date of Birth
Address
Emergency Contact
Notes

Keep the primary form simple.

# 19. Phase 4 Member Table

Create a professional data table.

Suggested columns:

Member ID
Name
Phone
Membership
Expiry
Status
Actions

Required states:

Loading
Empty
Results
No Results
Error

# 20. Phase 4 Member Search

Search:

Name
Member ID
Phone

Search must be handled efficiently.

# 21. Phase 4 Member Filtering

Filters:

Status
Membership Plan
Expiry
Start Date

Include:

Clear Filters

# 22. Phase 4 Testing

Test:

Create member
View member
Update member
Archive member
Search
Filters
Sorting
Validation
Optional fields
Membership relationship

# 23. Phase 5 — Payment System

This is one of the most important phases.

Implement:

Receive Payment
Payment History
Payment Details
Payment Search
Payment Filters
Receipt Number

# 24. Payment Workflow

The primary workflow:

```text
Select Member
      ↓
Enter Amount
      ↓
Select Payment Method
      ↓
Enter Optional Details
      ↓
Validate
      ↓
Save Payment
      ↓
Generate Receipt
      ↓
Offer Print
```

# 25. Payment Backend

Implement:

Payment model
Payment repository
Payment service
Payment validation
Payment transaction
Receipt generation
Tauri commands

# 26. Payment Transaction Rules

Payment saving must be atomic.

Conceptually:

```text
BEGIN
    Validate payment
    Save payment
    Perform required related updates
COMMIT
```

If anything fails:

```text
ROLLBACK
```

# 27. Payment Testing

Required tests:

Valid payment
Zero amount
Negative amount
Invalid member
Invalid payment method
Multiple payments
Partial payment
Correct outstanding balance
Correct receipt number
Transaction rollback

# 28. Phase 6 — Receipt System

Implement receipt generation independently from physical printing.

Receipt must contain:

Gym Name
Gym Contact
Receipt Number
Member Name
Member ID
Date
Amount
Payment Method
Description
Total

# 29. Receipt Workflow

```text
Payment Saved
      ↓
Receipt Generated
      ↓
Preview
      ↓
Print
```

Printing failure must not affect payment persistence.

# 30. Receipt Testing

Test:

Correct receipt number
Correct member
Correct amount
Correct date
Correct payment method
Correct gym information

# 31. Phase 7 — Printing

Implement printing after receipt generation works correctly.

The architecture should separate:

Receipt Data

from:

Printing Mechanism

This makes printing easier to test and maintain.

# 32. Printing Failure

If the printer is unavailable:

Payment remains saved
Receipt remains available
User receives understandable error
User can retry

# 33. Phase 8 — Expenses

Implement:

Add Expense
View Expenses
Edit Expense
Delete Expense
Search
Filter

# 34. Expense Form

Core fields:

Title
Amount
Category
Date

Optional:

Description
Notes

# 35. Expense Categories

Initial categories:

Rent
Electricity
Equipment
Maintenance
Cleaning
Supplies
Salary
Other

The final list may be configurable.

# 36. Expense Testing

Test:

Create expense
Edit expense
Delete expense
Invalid amount
Invalid date
Category filtering
Date filtering
Search

# 37. Phase 9 — Finances

Combine payment and expense data into the Finances interface.

Dashboard values:

Revenue
Expenses
Net Income

Formula:

Net Income = Revenue - Expenses

# 38. Finance Filters

Provide:

Today
This Week
This Month
Last Month
Custom Range

# 39. Finance Testing

Given:

Revenue = Rs. 50,000
Expenses = Rs. 15,000

Expected:

Net Income = Rs. 35,000

Tests must verify that the calculation comes from database records.

# 40. Phase 10 — Reports

Implement reporting after financial data is stable.

Initial reports:

Financial Report
Payment Report
Expense Report
Member Report
Membership Status Report

# 41. Report Quick Filters

Provide:

Today
This Week
This Month
Last Month
This Year
Custom

# 42. Custom Reports

Allow users to select relevant filters.

Examples:

Date Range
Member
Payment Method
Membership Plan
Expense Category

Do not show irrelevant filters.

# 43. Report Accuracy

Reports must use the same business logic as the dashboard and finance module.

Do not create separate calculations for:

Dashboard
Finance
Reports

that can produce different results.

# 44. Report Testing

Test:

Today
This Week
This Month
Last Month
Custom Range
Empty period
Multiple payments
Multiple expenses
Revenue totals
Expense totals
Net income

# 45. Phase 11 — Dashboard

Build the final dashboard after the underlying modules exist.

This prevents fake/mock KPI logic from becoming permanent.

# 46. Dashboard KPIs

Initial:

Total Members
Active Members
Expiring Soon
Expired Members
Today's Revenue
Monthly Revenue
Monthly Expenses
Monthly Net Income

# 47. Dashboard Recent Activity

Show concise:

Recent Payments
Recent Members
Recent Expenses

Do not overload the dashboard.

# 48. Dashboard Quick Actions

Provide:

Add Member
Receive Payment
Add Expense
View Members
View Finances
Generate Report

# 49. Dashboard Testing

Test that KPI values change when database records change.

Example:

```text
Create Payment
      ↓
Dashboard Revenue increases
```

# 50. Phase 12 — Settings

Implement:

Gym Information
Membership Plans
Payment Methods
Receipt Configuration
Backup
Restore

# 51. Gym Information

Allow:

Gym Name
Phone
Address
Email
Logo

These values should feed receipts and reports.

# 52. Phase 13 — Backup & Restore

Implement local database backup.

Required:

Create Backup
Choose Backup Location
Restore Backup
Confirmation
Backup Before Restore

# 53. Backup Safety

Before restoring:

```text
Current Database
      ↓
Automatic Safety Backup
      ↓
Restore Selected Backup
```

If restoration fails, the application must attempt to preserve recoverability.

# 54. Phase 14 — Professional UI Polish

After functionality is stable, perform a dedicated UI refinement pass.

Review:

Typography
Spacing
Tables
Cards
Buttons
Forms
Modals
Colors
Icons
Empty states
Loading states
Error states
Responsive behavior within desktop window

# 55. UI Quality Goal

The application should feel:

Professional
Clean
Modern
Fast
Consistent
Business-oriented

Avoid:

Random gradients
Excessive animations
Huge headings
Overly rounded cards
Inconsistent buttons
Too many colors
Crowded dashboards

# 56. Phase 15 — Full Integration Testing

Test complete workflows.

Member Workflow

```text
Create Member
 ↓
View Member
 ↓
Edit Member
 ↓
Receive Payment
 ↓
View Payment
```

Payment Workflow

```text
Select Member
 ↓
Receive Payment
 ↓
Generate Receipt
 ↓
Print Receipt
 ↓
Verify Payment History
```

Finance Workflow

```text
Payment
 ↓
Revenue
 ↓
Expense
 ↓
Net Income
 ↓
Report
```

# 57. Phase 16 — Regression Testing

Run the complete automated test suite.

Verify that new functionality did not break:

Members
Payments
Expenses
Reports
Dashboard
Receipts
Settings
Database

# 58. Phase 17 — Production Build

Create the production Windows build.

Verify:

[ ] Clean installation
[ ] Application launches
[ ] Database initializes
[ ] Migrations work
[ ] Member workflow works
[ ] Payment workflow works
[ ] Receipt workflow works
[ ] Printing works
[ ] Reports work
[ ] Backup works
[ ] Restore works

# 59. Phase 18 — Real-World QA

Before giving the application to a gym:

Use realistic test data.

Example:

50+ members
Multiple membership plans
Multiple payments
Multiple expenses
Multiple payment methods
Several months of dates

Verify:

Search speed
Filter behavior
Report accuracy
Receipt output
Dashboard accuracy
Database stability

# 60. AI Agent Development Loop

For every feature:

1. Read relevant documentation
2. Inspect existing implementation
3. Identify affected layers
4. Plan the change
5. Implement database changes
6. Implement repository
7. Implement service
8. Implement Tauri command
9. Implement frontend
10. Add validation
11. Add loading/error/empty states
12. Write automated tests
13. Run tests
14. Fix failures
15. Review code
16. Update documentation if required
17. Mark feature complete

# 61. AI Must Not Implement Blindly

Before modifying code, the AI must inspect:

Existing architecture
Existing components
Existing database schema
Existing services
Existing repositories
Existing tests

It must reuse existing patterns instead of creating competing patterns.

# 62. One Feature at a Time

Do not ask an AI agent:

"Build the entire gym management system."

Prefer:

"Implement membership plans according to the documentation."

Then:

"Implement members according to the documentation."

Then:

"Implement payments according to the documentation."

This makes debugging dramatically easier.

# 63. Change Scope

Each implementation task should have a clearly defined scope.

Example:

TASK:
Implement member filtering.

Allowed:
- Member table
- Member repository
- Member service
- IPC
- Related tests

Do not modify:
- Payment system
- Expense system
- Reports
- Unrelated UI

# 64. Before Coding

The AI should answer internally:

What already exists?
What needs to change?
Which layers are affected?
What database changes are required?
What tests are required?
Could this break existing functionality?

# 65. After Coding

The AI should verify:

Compilation
Linting
Formatting
Unit tests
Integration tests
Relevant workflow

# 66. No Unnecessary Refactoring

Do not refactor unrelated code while implementing a feature.

Bad:

Implement payment filtering
+
Rewrite entire architecture
+
Rename every component

Good:

Implement payment filtering
+
Make only required architectural improvements

# 67. Bug Fix Workflow

For every discovered bug:

```text
Reproduce
 ↓
Identify root cause
 ↓
Write regression test
 ↓
Fix root cause
 ↓
Run regression test
 ↓
Run relevant suite
```

# 68. Technical Debt

If the AI identifies technical debt but it is unrelated to the current feature:

Document it

instead of silently expanding the scope.

Example:

TECH DEBT:
Payment table query could be optimized for very large datasets.

Priority:
Low

Reason:
Current gym-sized dataset does not require optimization.

# 69. Git Commit Strategy

Use small meaningful commits.

Examples:

feat: add membership plan management
feat: add member CRUD
feat: add payment recording
feat: add receipt generation
feat: add expense management
feat: add financial reports
fix: correct monthly revenue calculation
test: add payment transaction tests
refactor: improve repository error handling

Avoid:

final-final-version
complete-app
everything-fixed

# 70. Milestone Strategy

Recommended milestones:

M1 — Application Foundation
M2 — Membership Plans
M3 — Members
M4 — Payments
M5 — Receipts
M6 — Expenses
M7 — Finances
M8 — Reports
M9 — Dashboard
M10 — Settings & Backup
M11 — UI Polish
M12 — Production QA

# 71. Milestone Completion Rule

A milestone is complete only when:

Feature implemented
+
Tests pass
+
No critical bugs
+
UI verified
+
Database verified

# 72. Final Release Checklist

### ARCHITECTURE
[ ] Layer boundaries respected
[ ] No SQL in frontend
[ ] No business logic in UI
[ ] IPC contracts stable

### DATABASE
[ ] Migrations tested
[ ] Foreign keys enabled
[ ] Financial history preserved
[ ] Backup tested
[ ] Restore tested

### FUNCTIONALITY
[ ] Members
[ ] Memberships
[ ] Payments
[ ] Receipts
[ ] Expenses
[ ] Finances
[ ] Reports
[ ] Dashboard
[ ] Settings

### QUALITY
[ ] Unit tests pass
[ ] Integration tests pass
[ ] Regression tests pass
[ ] Build succeeds
[ ] No critical errors

### UI
[ ] Professional visual consistency
[ ] Loading states
[ ] Empty states
[ ] Error states
[ ] Validation
[ ] Consistent tables
[ ] Consistent forms

### RELEASE
[ ] Clean installation tested
[ ] Production build tested
[ ] Realistic data tested
[ ] Printing tested

# 73. Final Development Rule

The application should be developed vertically, not horizontally.

Bad:

```text
Build every frontend screen
 ↓
Build every backend API
 ↓
Build database later
```

Good:

```text
Membership Plans
    ↓
Database
    ↓
Repository
    ↓
Service
    ↓
IPC
    ↓
Frontend
    ↓
Tests
    ↓
Complete
```

Then move to:

```text
Members
    ↓
Complete

Payments
    ↓
Complete

Expenses
    ↓
Complete
```

# 74. Golden Rule

Never optimize for:

How quickly can we generate code?

Optimize for:

How safely can we reach a working feature?

The goal is not to produce the most code.

The goal is to produce a small, reliable, maintainable gym management application.
