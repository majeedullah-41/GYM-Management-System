# Gym Management System — Feature Specifications

**Document Version:** 1.0  
**Status:** Foundation  
**Application:** Offline Gym Management System  
**Platform:** Windows Desktop  
**Primary Stack:** Tauri + Rust + React/TypeScript + SQLite  

---

# 1. Purpose

This document defines the functional behavior of every major feature in the Gym Management System.

It is the primary functional reference for implementation.

The system must implement the features described here without adding unnecessary functionality.

If implementation details conflict with this document, the conflict must be resolved before development continues.

---

# 2. Core Application Modules

The application consists of:

```text
Dashboard
Members
Finances
Reports
Settings

Supporting functionality:

Receipt Printing
Search
Filtering
Sorting
Pagination
CRUD Operations
Backup & Restore
Notifications
Validation
```

# 3. Global Feature Rules

All modules must follow these rules.

### 3.1 CRUD

Where CRUD is supported:

Create
Read
Update
Delete / Archive

Destructive operations must require confirmation.

### 3.2 Search

Search should:

Be fast.
Support relevant identifiers.
Ignore unnecessary formatting differences where appropriate.
Clearly indicate when no results exist.

### 3.3 Filtering

Filters must:

Be clearly visible.
Be easy to reset.
Work consistently.
Not unexpectedly modify data.

### 3.4 Tables

Tables should support where appropriate:

Search
Filtering
Sorting
Pagination
Row actions
Empty state
Loading state
Error state

### 3.5 Notifications

Operations should provide clear feedback.

Examples:

Member created successfully.
Payment recorded successfully.
Expense updated successfully.
Receipt printed successfully.

Errors should explain what went wrong and, where possible, what the user can do.

# 4. Dashboard
### 4.1 Purpose

The Dashboard provides a quick operational and financial overview of the gym.

The user should understand the current state of the gym without navigating through multiple pages.

### 4.2 Dashboard Layout

Recommended structure:

```text
┌──────────────────────────────────────────────────────────┐
│ Dashboard                                                │
│ Overview / current period                                │
├────────────┬────────────┬────────────┬───────────────────┤
│ Members    │ Active     │ Expiring   │ Expired           │
├────────────┴────────────┴────────────┴───────────────────┤
│ Today's Revenue        │ This Month's Revenue             │
├────────────────────────┴──────────────────────────────────┤
│ Recent Payments                                          │
├──────────────────────────────────────────────────────────┤
│ Expiring Members / Quick Actions                         │
└──────────────────────────────────────────────────────────┘
```

The exact layout is governed by the UI/UX specification.

# 5. Dashboard KPIs

Initial KPI cards:

Total Members
Active Members
Expiring Soon
Expired Members
Today's Revenue
Monthly Revenue
Outstanding Amount

The final number of visible cards may be adjusted for screen size and usability.

# 6. Dashboard KPI Rules

**Total Members**

Count all non-archived members.

**Active Members**

Count members whose membership is currently active.

**Expiring Soon**

Count members whose expiry date falls within the configured expiring-soon threshold.

**Expired Members**

Count members whose membership has expired.

**Today's Revenue**

Total valid payments recorded for the current local date.

**Monthly Revenue**

Total valid payments recorded during the current calendar month.

**Outstanding Amount**

Total amount currently outstanding according to the application's membership/payment rules.

Financial calculations must be performed by the backend/business logic layer.

# 7. Dashboard Recent Payments

Display recent payment activity.

Recommended columns:

Receipt #
Member
Amount
Payment Method
Date
Status

Users should be able to open the relevant payment/member where appropriate.

# 8. Dashboard Quick Actions

Recommended quick actions:

Add Member
Receive Payment
Add Expense
View Reports

Quick actions should take the user directly to the relevant workflow.

# 9. Dashboard Refresh

Dashboard data should refresh after operations that affect displayed information.

Examples:

New Member
Payment
Expense
Membership Update

The application must not display stale financial information after a successful operation.

# 10. Members Module
### 10.1 Purpose

The Members module manages gym members and their membership information.

# 11. Members List

The primary members screen should contain:

Page Header
Search
Filters
Add Member Button
Members Table
Pagination

# 12. Members Table

Recommended columns:

Member #
Name
Phone
Membership
Start Date
Expiry Date
Status
Balance
Actions

Columns may be customized where necessary.

# 13. Member Search

Search should support:

Member Number
Name
Phone Number

Search should update results efficiently.

Search must not require exact full-string matches unless explicitly configured.

# 14. Member Filters

Initial filters:

Status
Membership Plan
Start Date
Expiry Date

Status:

All
Active
Expiring Soon
Expired

Filters should be combinable where practical.

# 15. Add Member

**Required Information**
Full Name
Membership Plan
Start Date
Expiry Date

**Optional Information**
Father Name
Phone
CNIC
Address
Date of Birth
Gender
Photo
Notes

# 16. Add Member Workflow

Click Add Member
       ↓
Open Member Form
       ↓
Enter Information
       ↓
Validate
       ↓
Submit
       ↓
Backend Validation
       ↓
Create Member
       ↓
Success Notification
       ↓
Return to Member List / Member Detail

# 17. Member Validation

The system should validate:

Name is not empty.
Membership plan exists.
Start date is valid.
Expiry date is valid.
Expiry date is not before start date.
Member number is unique.
Optional fields follow their expected formats.

Validation should occur on both:

Frontend
Backend

Frontend validation improves UX.

Backend validation protects the application.

# 18. View Member

Selecting a member should open a member detail view.

Recommended sections:

Member Information
Membership Information
Payment Summary
Payment History
Actions

# 19. Member Detail

The member detail screen should display:

Member Number
Name
Phone
Optional information
Membership Plan
Start Date
Expiry Date
Current Status
Total Paid
Outstanding Amount

# 20. Member Payment History

Display:

Receipt #
Date
Amount
Payment Method
Membership

Actions may include:

View Receipt
Print Receipt

# 21. Edit Member

Users should be able to update member information.

Changes must be validated.

Updating personal information must not modify historical payment records.

# 22. Membership Update

Membership information must be handled carefully.

Possible operations:

Renew
Change Plan
Extend Expiry
Correct Membership Information

The final behavior must preserve historical financial information.

# 23. Archive Member

Members with historical financial information should generally be archived instead of permanently deleted.

Archive operation:

Select Member
      ↓
Archive
      ↓
Confirmation
      ↓
Backend Validation
      ↓
Archive Member

Archived members should not appear in normal member lists unless the user explicitly chooses to view them.

Historical payments must remain accessible.

# 24. Member Status

Member status should be determined consistently using backend business rules.

Initial statuses:

Active
Expiring Soon
Expired

The frontend should display the returned status rather than independently implementing different date logic.

# 25. Finances Module
### 25.1 Purpose

The Finances module manages money received by the gym and gym expenses.

Primary sections:

Payments
Expenses

# 26. Finance Dashboard

The finance page may display:

Today's Revenue
This Week's Revenue
This Month's Revenue
Outstanding Amount
Total Expenses
Net Income

The exact visible KPIs depend on available screen space.

# 27. Payments List

Recommended table:

Receipt #
Member
Amount
Payment Method
Payment Date
Membership
Status
Actions

# 28. Payment Search

Search should support:

Receipt Number
Member Name
Member Number
Phone

# 29. Payment Filters

Initial filters:

Date Range
Payment Method
Member
Amount Range

Quick date buttons:

Today
Yesterday
This Week
Last Week
This Month
Last Month
This Year
Custom

# 30. Receive Payment

Primary payment workflow:

Click Receive Payment
        ↓
Select Member
        ↓
View Membership / Outstanding Information
        ↓
Enter Payment
        ↓
Select Payment Method
        ↓
Review
        ↓
Save Payment
        ↓
Generate Receipt
        ↓
Print / Close

# 31. Payment Form

The payment form should display relevant information before confirmation.

Example:

Member:
Ahmad Khan

Membership:
Monthly

Membership Fee:
Rs. 2,000

Previously Paid:
Rs. 500

Outstanding:
Rs. 1,500

Payment Now:
Rs. 1,000

Remaining:
Rs. 500

The exact fields shown depend on the selected membership/payment model.

# 32. Payment Validation

The system must reject:

Empty member
Invalid member
Zero payment
Negative payment
Invalid payment method
Invalid date
Payment exceeding allowed amount where business rules prohibit it

If overpayment is supported, the behavior must be explicitly defined rather than assumed.

# 33. Partial Payment

Partial payment must be supported.

Example:

Required:
Rs. 2,000

Payment 1:
Rs. 500

Remaining:
Rs. 1,500

A later payment may reduce the outstanding amount.

# 34. Multiple Payments

A member may make multiple payments against the relevant membership obligation.

Example:

Payment 1 = Rs. 500
Payment 2 = Rs. 700
Payment 3 = Rs. 800

Total = Rs. 2,000

The system must calculate totals accurately.

# 35. Payment Success

After successful payment:

Payment recorded successfully.

The user should be offered:

Print Receipt
Print Later
Close

The payment must already be persisted before printing is attempted.

Printing failure must not undo a successful payment.

# 36. Payment Failure

If the database operation fails:

Payment must not be partially recorded.

The user should receive a clear error.

The system must not display a success message when persistence failed.

# 37. Payment Correction

Historical payments should not be casually deleted.

Where correction is required, the system should use a controlled mechanism such as:

Void
Reverse
Correct

The exact mechanism should preserve the financial audit trail.

# 38. Expenses
### 38.1 Purpose

Allows the gym to record operational expenses.

# 39. Expense List

Recommended columns:

Date
Category
Description
Amount
Notes
Actions

# 40. Add Expense

Required:

Category
Amount
Date

Optional:

Description
Notes

# 41. Expense Categories

Initial categories:

Rent
Electricity
Maintenance
Cleaning
Equipment
Salary
Other

The system should be designed so categories can become configurable in the future.

# 42. Expense Validation

Reject:

Negative amount
Zero amount
Missing category
Invalid date

# 43. Expense Editing

Expenses may be edited according to the application's permissions/business rules.

The system should preserve appropriate timestamps.

# 44. Expense Deletion

Deletion should require confirmation.

If financial auditing requirements later require stronger history preservation, the system may introduce void/archive behavior.

# 45. Receipts
### 45.1 Purpose

Receipts provide proof of recorded payments.

# 46. Receipt Contents

Receipt should contain:

Gym Logo
Gym Name
Gym Address
Gym Phone

Receipt Number
Date

Member Name
Member Number

Membership Plan
Membership Period

Amount Paid
Payment Method
Remaining Balance

Footer / Thank You Message

Only relevant fields should be displayed.

# 47. Receipt Number

Receipt numbers must be:

Unique
Sequential or consistently generated
Backend-controlled
Printable
Reproducible

Example:

RCP-000001
RCP-000002
RCP-000003

# 48. Receipt Printing

The system should support printing directly from the application.

The receipt system should be designed for common gym environments.

Priority:

Thermal Printer

Secondary:

Standard Printer

Printing should not modify financial records.

# 49. Reprint Receipt

A previous receipt can be reprinted.

Workflow:

Payments
   ↓
Select Payment
   ↓
View Receipt
   ↓
Print Again

Reprinting must not create another payment.

# 50. Reports Module
### 50.1 Purpose

Reports provide useful summaries of gym operations and finances.

The report system should be powerful enough for the owner while remaining simple.

# 51. Report Interface

Recommended layout:

```text
┌────────────────────────────────────────────┐
│ Reports                                    │
├────────────────────────────────────────────┤
│ [Today] [This Week] [This Month] [Custom]  │
├────────────────────────────────────────────┤
│ Report Type                                │
│ Filters                                    │
├────────────────────────────────────────────┤
│ Results                                    │
├────────────────────────────────────────────┤
│ [Print] [Export]                           │
└────────────────────────────────────────────┘
```

# 52. Report Period Buttons

Required shortcuts:

Today
Yesterday
This Week
Last Week
This Month
Last Month
This Year
Custom Range

The system must calculate date ranges consistently.

# 53. Financial Reports

Initial financial reports:

Revenue Report
Payment Report
Expense Report
Net Income Report
Outstanding Payments

# 54. Membership Reports

Initial membership reports:

Member List
Active Members
Expired Members
Expiring Members
New Members
Membership Renewals

# 55. Custom Reports

Reports should allow users to customize:

Date Range
Filters
Sorting
Relevant columns

The customization interface should remain simple.

The system should not attempt to become a full enterprise reporting engine.

# 56. Report Templates

The report system should support predefined templates.

Example:

Financial Summary
Member List
Payment History
Expense Summary
Monthly Revenue

The user selects a template and then adjusts its filters.

# 57. Report Output

Where implemented, reports should support:

View
Print
PDF
CSV / Excel-compatible export

The initial release should prioritize reliable viewing and printing.

# 58. Settings Module
### 58.1 Gym Settings

Fields:

Gym Name
Address
Phone
Logo

# 59. Receipt Settings

Settings may include:

Receipt Header
Footer Message
Receipt Number Prefix
Paper Size
Printer

# 60. Application Settings

Possible settings:

Currency
Date Format
Expiring Soon Threshold

# 61. Backup Settings

Provide access to:

Create Backup
Restore Backup
View Backup Information

Backup/restore behavior is defined further in:

09-SECURITY-BACKUP-RELEASE.md

# 62. Global Search and Navigation

The application should provide clear navigation between:

Dashboard
Members
Finances
Reports
Settings

The navigation should remain visible and predictable.

# 63. Loading States

Every asynchronous operation should have an appropriate loading state.

Examples:

Loading members...
Saving payment...
Generating report...
Creating backup...

Buttons should not allow accidental duplicate submissions while an operation is running.

# 64. Empty States

Empty states must explain what is happening and, where appropriate, provide an action.

Example:

No members found.

Add your first member to get started.

[Add Member]

Avoid blank screens.

# 65. Error States

Errors should be:

Human-readable
Specific
Actionable
Consistent

Bad:

Error: SQLITE_CONSTRAINT

Good:

Unable to save member.

The member number is already in use.

# 66. Confirmation Dialogs

Confirmation should be used for destructive or sensitive actions.

Examples:

Archive Member
Delete Expense
Void Payment
Restore Database

The dialog should explain the consequence.

# 67. Keyboard Interaction

Because this is a desktop application, common workflows should support keyboard-friendly interaction.

Examples:

Enter → Submit/confirm where appropriate
Escape → Close modal
Tab → Move between fields

The implementation should not sacrifice accessibility for mouse-only interaction.

# 68. Duplicate Submission Prevention

The UI must prevent accidental repeated submissions.

Example:

User clicks "Save Payment"
       ↓
Button becomes disabled/loading
       ↓
Request completes
       ↓
Button returns to normal

This is especially important for financial operations.

# 69. Data Refresh Rules

After successful mutations, affected views must refresh appropriately.

Examples:

Add Member
    ↓
Member list updates

Payment
    ↓
Payment list updates
    ↓
Member balance updates
    ↓
Dashboard revenue updates

Expense
    ↓
Expense list updates
    ↓
Financial reports update

Avoid requiring the user to manually restart the application to see updated data.

# 70. Acceptance Criteria

A feature is considered functionally complete only when:

✓ Happy path works
✓ Invalid input is rejected
✓ Errors are handled
✓ Loading state exists
✓ Empty state exists where relevant
✓ Database operation succeeds
✓ Database failure is handled
✓ UI updates after mutation
✓ Duplicate submission is prevented
✓ Automated tests exist
✓ Relevant regression tests pass

# 71. Feature Development Rule

Every new feature must be implemented in the following order where applicable:

Requirement
    ↓
Business Rules
    ↓
Database Changes
    ↓
Backend Logic
    ↓
Tauri Command
    ↓
Frontend Data Layer
    ↓
UI
    ↓
Automated Tests
    ↓
Manual Verification

The order may vary for a particular feature, but the architectural boundaries must remain intact.

# 72. No Unrequested Features

AI coding agents must not introduce functionality simply because it appears common in gym software.

Examples of features that must NOT be added automatically:

Attendance
Biometric Integration
Workout Plans
Trainer Management
Diet Plans
Online Payments
Cloud Sync
Mobile App
WhatsApp Integration
SMS
AI Features
Inventory Management
Multi-Branch Management

These require explicit product approval.

# 73. Feature Change Control

If a requirement changes:

Update this document.
Determine affected database changes.
Determine affected architecture.
Determine affected UI.
Determine affected tests.
Update implementation plan.
Only then implement the change.

# 74. Final Feature Principle

The application should optimize for the gym owner's most common daily tasks:

Find Member
      ↓
Check Membership
      ↓
Receive Payment
      ↓
Print Receipt
      ↓
Move On

Everything else should support these workflows without making them slower or more complicated.
