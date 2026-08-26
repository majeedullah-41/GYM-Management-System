# Gym Management System — Feature Specifications

**Document Version:** 1.0  
**Status:** Foundation  
**Platform:** Windows Desktop  
**Architecture:** Tauri + Rust + SQLite  
**Frontend:** React + TypeScript  
**Application Type:** Offline-first Desktop Application

---

# 1. Purpose

This document defines the functional requirements of the Gym Management System.

The system is intentionally simple and focused on the core needs of a small/medium gym:

- Managing members
- Managing memberships
- Receiving payments
- Managing expenses
- Tracking finances
- Generating reports
- Printing receipts
- Viewing useful dashboard information

The application should not become unnecessarily complex.

---

# 2. Core Modules

The application consists of:

1. Dashboard
2. Members
3. Finances
4. Reports
5. Settings

Supporting functionality includes:

- Receipt generation
- Receipt printing
- Search
- Filtering
- Sorting
- CRUD operations
- Backup/restore
- Application configuration

---

# 3. Dashboard

The Dashboard is the main overview screen.

It should provide a quick understanding of the gym's current situation.

## 3.1 KPI Cards

Recommended KPI cards:

```text
Total Members
Active Members
Expiring Soon
Expired Members
Today's Revenue
This Month's Revenue
This Month's Expenses
This Month's Net Income
```

The exact KPIs may be adjusted during implementation.

# 4. Dashboard Quick Actions

The dashboard should provide shortcuts for common operations.

Example:

+ Add Member
Receive Payment
Add Expense
View Members
View Finances
Generate Report

# 5. Dashboard Recent Activity

The dashboard may display recent activity such as:

Recent Payments
Recently Added Members
Recent Expenses

The information should remain concise.

The dashboard is an overview, not a replacement for the dedicated modules.

# 6. Dashboard Date Context

Financial KPIs must clearly indicate their time period.

Examples:

Today's Revenue
August 2026 Revenue
August 2026 Expenses
August 2026 Net Income

Avoid displaying financial numbers without explaining the relevant period.

# 7. Members Module

The Members section is the primary member-management area.

It should support:

Create
Read
Update
Archive
Search
Filter
Sort
View Details

# 8. Member Information

Core member fields:

Member ID
Full Name
Phone Number
Membership Plan
Membership Start Date
Membership Expiry Date
Status
Created Date

Additional information should be optional.

Possible optional fields:

Gender
Age
Address
Emergency Contact
Notes
Profile Photo

Do not make unnecessary fields mandatory.

# 9. Member ID

Every member should have a unique identifier.

The identifier may be:

Automatically generated

Example:

GYM-00001
GYM-00002
GYM-00003

The exact format should be configurable or finalized during implementation.

# 10. Member Status

Member status should be derived from membership information where appropriate.

Possible statuses:

Active
Expiring Soon
Expired
Archived

The system should avoid allowing contradictory states.

For example:

Active

should not be manually assigned to a member whose membership has already expired if status is automatically derived.

# 11. Member List

The member list should provide an Excel-like professional table.

Columns may include:

Member ID
Name
Phone
Membership
Start Date
Expiry Date
Status
Actions

# 12. Member Search

Users should be able to search members using:

Name
Member ID
Phone Number

Search should support partial matches.

Example:

Search:
Ahm

can return:

Ahmad Khan
Ahmad Shah

# 13. Member Filters

Members should support filtering by:

Status
Membership Plan
Start Date
Expiry Date

Filters should be easy to clear.

Provide:

Clear Filters

# 14. Member Sorting

The member table should support sorting where useful.

Examples:

Name
Member ID
Start Date
Expiry Date
Created Date

# 15. Member Details

Selecting a member should provide a detailed view.

The detail view should show:

Member Information
Membership Information
Payment History
Financial Summary

Example:

Total Paid
Outstanding
Last Payment
Membership Expiry

# 16. Member Payment History

Each member should have access to their historical payments.

Example:

Date
Amount
Payment Method
Receipt Number
Notes

Historical payment records must not disappear when a member is archived.

# 17. Member CRUD

The system must support:

Create Member
View Member
Update Member
Archive Member

Permanent deletion should not be used casually for members with financial history.

# 18. Finances Module

The Finances section manages financial activity.

It should contain at least:

Payments
Expenses
Financial Summary

# 19. Payments

Payments represent money received by the gym.

The payment system should support:

Create Payment
View Payment
Search Payment
Filter Payment
View Payment Details
Print Receipt

# 20. Payment Information

Core payment fields:

Payment ID
Member
Amount
Payment Date
Payment Method
Receipt Number
Notes
Created At

Optional information should remain optional.

# 21. Payment Methods

The system should support configurable payment methods.

Initial methods may include:

Cash
Bank Transfer
Easypaisa
JazzCash
Other

The final list should be configurable through Settings.

# 22. Payment Validation

The system must ensure:

Amount > 0
Member exists
Payment date is valid
Payment method is valid

Invalid payments must not be saved.

# 23. Partial Payments

The system should support partial payments if the gym uses them.

Example:

Membership Fee:
Rs. 3,000

Payment:
Rs. 2,000

Outstanding:
Rs. 1,000

The system must calculate outstanding balances consistently.

# 24. Multiple Payments

A member may make multiple payments.

Example:

Payment 1: Rs. 1,000
Payment 2: Rs. 1,000
Payment 3: Rs. 1,000

The system should correctly calculate:

Total Paid = Rs. 3,000

# 25. Payment Filtering

Payments should support:

Date Range
Member
Payment Method
Amount Range

Common shortcuts:

Today
This Week
This Month
Last Month
Custom Range

# 26. Payment Table

The payment table should display:

Receipt #
Member
Amount
Payment Method
Date
Actions

Actions may include:

View
Print Receipt

# 27. Receipt System

Every successful payment should have an associated receipt.

Receipt should contain:

Gym Name
Gym Contact Information
Receipt Number
Member Name
Member ID
Payment Date
Amount
Payment Method
Description
Total

# 28. Receipt Number

Receipt numbers must be unique.

Example:

RCP-000001
RCP-000002
RCP-000003

Receipt numbers must not be reused.

# 29. Receipt Printing

Users should be able to print a receipt immediately after receiving payment.

Example workflow:

Receive Payment
      ↓
Payment Saved
      ↓
Receipt Generated
      ↓
Print Receipt

If printing fails:

Payment remains saved

The user can retry printing later.

# 30. Receipt Preview

Before printing, the system should provide a receipt preview where practical.

The preview should represent the actual printable receipt.

# 31. Expenses

The Finances section should also support expense tracking.

Expenses represent money spent by the gym.

Examples:

Electricity
Rent
Equipment
Maintenance
Cleaning
Supplies
Other

# 32. Expense Information

Core fields:

Expense ID
Title
Amount
Category
Date
Notes

# 33. Expense CRUD

The system should support:

Create Expense
View Expense
Update Expense
Delete Expense

Deletion should require confirmation.

# 34. Expense Filtering

Expenses should support:

Date Range
Category
Amount Range
Search

Quick date filters:

Today
This Week
This Month
Last Month
Custom

# 35. Financial Summary

The Finances section should provide:

Total Revenue
Total Expenses
Net Income

Formula:

Net Income = Total Revenue - Total Expenses

# 36. Revenue

Revenue should be calculated from valid recorded payments.

Do not calculate revenue from:

Printed receipts
UI state
Member membership price

The payment records are the authoritative source.

# 37. Reports Module

Reports should allow the gym owner to understand business performance.

Reports should remain simple and useful.

# 38. Report Quick Buttons

Provide simple predefined buttons:

Today
This Week
This Month
Last Month
This Year
Custom

The user should not need to configure complex report parameters for common use cases.

# 39. Custom Reports

The report interface should allow users to customize:

Date Range
Report Type
Member
Payment Method
Membership
Expense Category

Only relevant filters should appear for each report.

# 40. Report Types

Initial report types:

Financial Report
Payment Report
Expense Report
Member Report
Membership Status Report

Additional reports may be added later.

# 41. Financial Report

Should show:

Period
Total Revenue
Total Expenses
Net Income
Payment Count
Expense Count

Optionally:

Revenue by Payment Method
Expenses by Category

# 42. Payment Report

Should show:

Receipt Number
Member
Amount
Payment Method
Date

And totals:

Total Payments
Total Amount

# 43. Expense Report

Should show:

Date
Description
Category
Amount

And:

Total Expenses

# 44. Member Report

Should show useful member statistics.

Examples:

Total Members
Active Members
Expiring Members
Expired Members
Archived Members

# 45. Membership Status Report

Should allow the owner to quickly identify:

Active
Expiring Soon
Expired

This is useful for follow-up and renewals.

# 46. Report Templates

Reports should use a consistent template.

Conceptual structure:

```text
┌───────────────────────────────────────┐
│              GYM NAME                 │
│            Financial Report           │
│          01 Aug - 31 Aug 2026         │
├───────────────────────────────────────┤
│ Revenue                    Rs. 50,000 │
│ Expenses                   Rs. 15,000 │
│ Net Income                 Rs. 35,000 │
├───────────────────────────────────────┤
│ Details                               │
│                                       │
│ Date | Description | Amount           │
│ ...                                   │
└───────────────────────────────────────┘
```

The template should remain professional and printable.

# 47. Report Export

If implemented in the project scope, reports may support:

Print
PDF

Export functionality should not be implemented at the expense of core functionality.

# 48. Settings

Settings should remain simple.

Possible settings:

Gym Information
Receipt Settings
Payment Methods
Membership Plans
Application Preferences
Backup / Restore

# 49. Gym Information

Allow configuration of:

Gym Name
Phone
Address
Email
Logo

This information should appear on receipts and reports where appropriate.

# 50. Membership Plans

The gym should be able to configure membership plans.

Example:

Monthly
Quarterly
Half-Yearly
Yearly

Each plan may contain:

Name
Duration
Price
Status

# 51. Membership Plan CRUD

The system should support:

Create
View
Update
Deactivate

Avoid deleting plans that are referenced by historical membership records.

# 52. Search and Filtering Standards

All major list screens should follow a consistent filtering pattern.

Example:

```text
┌───────────────────────────────────────────────┐
│ Search...     Status ▼   Date ▼   Filters ▼   │
│                                               │
│                    Clear Filters              │
└───────────────────────────────────────────────┘
```

# 53. Empty States

Every list must have a useful empty state.

Example:

No members found

Try changing your search or filters.

For a completely empty module:

No members yet

Add your first member to get started.

[ Add Member ]

# 54. Loading States

Data loading should have a clear visual state.

Avoid showing blank screens while data is loading.

Use:

Skeletons
Loading indicators
Disabled actions where appropriate

# 55. Error States

Errors must be understandable.

Bad:

SQLITE_CONSTRAINT_FOREIGNKEY

Good:

Unable to save payment.

The selected member could not be found.

# 56. Confirmation Dialogs

Destructive actions should require confirmation.

Examples:

Archive Member
Delete Expense
Restore Backup

The dialog should clearly explain the action.

# 57. Notifications

Use consistent toast/notification behavior.

Examples:

Member added successfully.
Payment recorded successfully.
Expense saved successfully.
Receipt printed successfully.

Errors should use the same system.

# 58. Keyboard-Friendly Operations

The application should support efficient keyboard usage where practical.

Examples:

Enter → Submit form
Escape → Close modal
Ctrl/Cmd + K → Search or command menu if implemented

Do not introduce shortcuts that conflict with standard Windows behavior.

# 59. Data Integrity

The system must preserve historical financial information.

For example:

Member created
↓
Payment received
↓
Member archived

The payment must remain available in:

Payment History
Reports
Financial Summary

# 60. Offline Requirement

All core features must work without an internet connection.

Required offline functionality:

Members
Payments
Expenses
Reports
Receipt generation
Receipt printing
Settings

No cloud service should be required for normal operation.

# 61. Application Workflow

Typical daily workflow:

```text
Open Application
      ↓
Dashboard
      ↓
Add / Find Member
      ↓
Receive Payment
      ↓
Generate Receipt
      ↓
Print Receipt
      ↓
Payment Saved
      ↓
Dashboard Updated
```

# 62. Member Renewal Workflow

Typical renewal workflow:

```text
Find Member
      ↓
View Member
      ↓
Receive Payment
      ↓
Update / Extend Membership
      ↓
Generate Receipt
      ↓
Print Receipt
```

The exact renewal mechanism should be finalized during implementation.

# 63. Financial Workflow

```text
Payment
   ↓
Payment Record
   ↓
Financial Ledger / Summary
   ↓
Dashboard
   ↓
Reports
```

Expenses follow:

```text
Expense
   ↓
Expense Record
   ↓
Financial Summary
   ↓
Dashboard
   ↓
Reports
```

# 64. CRUD Standards

CRUD interfaces should be consistent across modules.

Standard pattern:

```text
List
  ↓
Search / Filter
  ↓
Add
  ↓
View
  ↓
Edit
  ↓
Archive/Delete where appropriate
```

# 65. Optional Information

The application should prefer a simple core form.

Required information should be minimal.

For example, member creation should not force the user to fill:

Address
Email
Emergency Contact
Notes

unless the gym actually requires them.

Optional fields should be clearly marked or placed under:

Additional Details

# 66. Scope Control

The initial version should NOT unnecessarily include:

Online payments
Mobile application
Cloud synchronization
Multi-branch management
Trainer payroll
Complex attendance systems
Workout planning
Diet planning
AI features
Customer-facing portal
Subscription billing platform

These can be considered future products/features if required later.

# 67. Feature Priority

### P0 — Critical
Dashboard
Members
Payments
Expenses
Receipts
Basic Reports
SQLite persistence
Search
Filtering
CRUD

### P1 — Important
Membership Plans
Custom Reports
Receipt Preview
Backup / Restore
Settings

### P2 — Optional
PDF Export
Advanced analytics
Additional report formats
Additional customization

# 68. Feature Completion Criteria

A feature is complete only when:

UI exists
+
Backend functionality exists
+
Database persistence works
+
Validation exists
+
Error handling exists
+
Filtering/search works where applicable
+
Automated tests exist
+
Manual workflow has been verified

# 69. AI Development Rule

When implementing a feature, the AI agent must first identify:

Frontend changes
Backend service changes
Repository changes
Database changes
Tests required
UI states required

Then implement the feature according to the architecture document.

The AI must not invent unrelated features.

# 70. Final Product Philosophy

The Gym Management System should feel like a professional business application, not an oversized enterprise ERP.

The guiding principle is:

Simple for the gym owner.
Powerful enough for daily operations.
Fast enough to feel instant.
Reliable enough to trust with money.
Organized enough to maintain for years.

The application should prioritize:

Simplicity
Clarity
Speed
Reliability
Financial Accuracy
Professional UI
Maintainability
