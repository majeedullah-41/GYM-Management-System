# Gym Management System — Project Specification

**Document Version:** 1.0
**Status:** Draft / Foundation
**Application Type:** Offline Desktop Application
**Target Platform:** Windows
**Primary Technology:** Tauri + Rust + SQLite
**Frontend:** React + TypeScript
**Architecture:** Layered Architecture

---

## 1. Project Overview

The Gym Management System is a lightweight, professional, offline-first desktop application designed to help small and medium-sized gyms manage their members, memberships, payments, receipts, expenses, and reports.

The application is intentionally focused on the core operational needs of a gym.

It is **not** intended to be a large-scale gym ERP, SaaS platform, social fitness application, or mobile fitness tracker.

The primary goal is:

> Make everyday gym administration fast, simple, reliable, and completely usable without an internet connection.

The application will run locally on a Windows computer and use SQLite as its local database.

---

# 2. Product Goals

The system should allow a gym owner or authorized staff member to:

- Register and manage gym members.
- Track membership periods and expiry dates.
- Receive and record membership payments.
- Handle partial payments.
- Track outstanding balances.
- Print professional payment receipts.
- Search and filter members and financial records.
- Record basic gym expenses.
- View useful financial and membership statistics.
- Generate customizable reports.
- Create reports using predefined time-period shortcuts.
- Operate the entire system without an internet connection.
- Backup and restore application data.
- Maintain reliable and consistent financial records.

---

# 3. Product Philosophy

The application should follow these principles:

### 3.1 Simplicity

The application should not overwhelm gym staff with unnecessary features.

Every common operation should require as few steps as reasonably possible.

### 3.2 Speed

Common operations such as:

- Finding a member
- Receiving a payment
- Renewing membership
- Printing a receipt

should be extremely fast.

### 3.3 Reliability

Financial and member data must be handled carefully.

The system must prevent invalid data and maintain database consistency.

### 3.4 Offline First

Core functionality must work without an internet connection.

The application must not depend on:

- Cloud APIs
- Remote databases
- Internet-based authentication
- Online services

for normal operation.

### 3.5 Professional UI

The application should look and behave like professionally developed business software rather than an automatically generated CRUD application.

The interface should prioritize:

- Clear hierarchy
- Good typography
- Consistent spacing
- Professional tables
- Useful KPI cards
- Clear status indicators
- Predictable interactions
- Proper loading states
- Proper empty states
- Proper error states

---

# 4. Target Users

The initial application targets small and medium-sized gyms.

Primary users:

### Gym Owner

The owner can:

- View dashboard information.
- Manage members.
- Receive payments.
- View financial information.
- Manage expenses.
- Generate reports.
- Configure application settings.
- Perform backups and restoration.

### Receptionist / Staff

If staff accounts are implemented, staff can perform authorized operational tasks such as:

- Register members.
- Search members.
- Update member information.
- Receive payments.
- Print receipts.
- View permitted reports.

Permissions must be controlled through the application's authorization system.

---

# 5. Application Scope

The initial version contains the following primary modules:

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
CRUD Operations
Backup & Restore
Validation
Automated Testing
```

# 6. Core Modules

### 6.1 Dashboard

The dashboard provides a quick overview of the gym.

It should display useful KPIs such as:

Total members
Active members
Expired members
Members expiring soon
Today's payments
Today's revenue
Current month's revenue
Outstanding payments

The dashboard should prioritize information that helps the owner understand the current state of the gym quickly.

Dashboard Requirements
KPI cards must be visually clear.
Financial figures must use consistent currency formatting.
Membership status must be visually distinguishable.
Dashboard calculations must come from reliable database queries/business logic.
Users should not need to manually calculate totals.

# 7. Members Module

The Members module manages all gym members.

### 7.1 Member Information

The system should support the following member information:

Required
Member ID
Full name
Membership/package
Membership start date
Membership expiry date

Optional
Father's name
Phone number
CNIC
Address
Date of birth
Gender
Profile photo
Notes

Optional information must never unnecessarily block member registration.

### 7.2 Member CRUD

The system must support:

Create member
View member
Update member
Archive/delete member according to defined data rules

The implementation must prevent accidental destructive operations.

Delete/archive actions should require appropriate confirmation.

### 7.3 Member Search

Users should be able to search members using relevant fields such as:

Member ID
Name
Phone number

Search should be fast and suitable for normal desktop usage.

### 7.4 Member Filtering

The member list should support filtering by:

Active
Expiring soon
Expired
Membership/package
Joining date
Expiry date

Filters should be easy to clear and combine where appropriate.

### 7.5 Membership Status

Membership status should be derived consistently from membership dates and defined business rules.

Primary statuses:

Active
Expiring Soon
Expired

The exact calculation rules will be defined in the Feature Specifications document.

### 7.6 Member Payment History

A member profile should provide access to the member's financial history.

The user should be able to see:

Payment date
Payment amount
Payment method
Receipt number
Relevant membership period
Outstanding amount where applicable

# 8. Finances Module

The Finances module manages money received from members and basic gym expenses.

The financial module is one of the most important parts of the application and must prioritize data integrity.

### 8.1 Payment Management

The system must allow authorized users to:

Record payments.
View payments.
Search payments.
Filter payments.
Edit payments according to business rules.
Void/delete payments according to business rules.
View payment history.

### 8.2 Payment Information

A payment may contain:

Payment ID
Member ID
Amount
Payment method
Payment date
Membership/package information
Notes
Receipt number
Created timestamp
Updated timestamp

Exact database structure will be defined separately.

### 8.3 Payment Methods

The initial system should support configurable/common payment methods.

Examples:

Cash
Easypaisa
Bank Transfer
Other

The implementation should avoid unnecessarily hard-coding payment methods where configuration is more appropriate.

### 8.4 Partial Payments

The system must support partial payments.

Example:

Membership Fee:  Rs. 2,000
Paid:            Rs. 1,000
Remaining:       Rs. 1,000

The system must correctly calculate and display outstanding balances.

### 8.5 Payment Validation

The system must validate:

Payment amount
Member existence
Required payment information
Valid dates
Financial constraints

Invalid financial operations must not modify the database.

# 9. Receipt System

The system must provide professional printable receipts for payments.

After successfully recording a payment, the user should have the option to:

Save Payment
     ↓
Generate Receipt
     ↓
Print

The user should also be able to reprint previous receipts.

### 9.1 Receipt Information

A receipt should contain relevant information such as:

Gym name
Gym contact information
Receipt number
Payment date
Member name
Member ID
Membership/package
Amount
Discount if applicable
Paid amount
Remaining balance
Payment method
Membership validity information where applicable

### 9.2 Receipt Formats

The initial implementation should prioritize:

Thermal receipt printing
Standard printable receipt

Receipt layout and printer-specific behavior will be defined in the feature/UI documentation.

# 10. Reports Module

The Reports module provides useful information without requiring the user to manually construct complex queries.

Reports should be customizable while remaining simple.

### 10.1 Report Period Shortcuts

The system should provide simple buttons such as:

Today
Yesterday
This Week
Last Week
This Month
Last Month
This Year
Custom Range

Selecting a shortcut should automatically apply the appropriate date range.

### 10.2 Initial Reports

The system should support reports such as:

Financial
Payment report
Revenue report
Outstanding payments
Expense report
Net income summary
Membership
All members
Active members
Expired members
Expiring members
New members
Membership renewals

### 10.3 Report Customization

Reports should allow appropriate customization such as:

Date range
Filters
Sorting
Selected columns where applicable

The interface should remain simple and understandable.

### 10.4 Report Output

Reports should support appropriate output options such as:

Print
PDF
CSV/Excel-compatible export where implemented

# 11. Expenses

The system should provide basic expense management.

Users can record expenses such as:

Rent
Electricity
Maintenance
Cleaning
Equipment
Salaries
Other expenses

An expense should contain:

Description
Category
Amount
Date
Notes

Expenses must be included in appropriate financial reports.

# 12. Settings

The Settings module contains application and gym configuration.

Initial settings should include:

Gym Information
Gym name
Address
Phone
Logo where supported
Receipt Settings
Receipt information
Printer configuration
Receipt format
Application
Currency
Date format
Other relevant preferences
Data Management
Backup database
Restore database

# 13. Search and Filtering Standards

Search and filtering should be available throughout the application wherever they provide meaningful value.

Examples:

Members
Search
Status
Package
Joining Date
Expiry Date
Payments
Search
Date
Payment Method
Amount
Member
Expenses
Search
Date
Category
Amount

Filters should:

Be easy to understand.
Be easy to reset.
Produce predictable results.
Work consistently throughout the application.

# 14. CRUD Standards

CRUD functionality must follow consistent behavior across the application.

Create
Read
Update
Delete / Archive

Not every entity must expose every operation directly.

For example, financial records may use a controlled void/reversal mechanism rather than permanent deletion.

All destructive operations must be explicitly confirmed.

# 15. Optional Information

The system should distinguish clearly between required and optional information.

For example:

Required:
Name
Membership
Start Date
Expiry Date

Optional:
Father Name
CNIC
Address
Date of Birth
Notes
Photo

The UI should not make optional fields visually or functionally feel mandatory.

The system should avoid collecting unnecessary personal information.

# 16. Offline Requirements

The application must remain functional without internet access.

Core operations must work offline:

Launch application
View dashboard
Create members
Edit members
Search members
Record payments
View financial history
Print receipts
Generate reports
Record expenses
Backup database
Restore database

No core operation should silently fail because the internet is unavailable.

# 17. Data Storage

The application will use SQLite as its local database.

Database access must occur through the application's backend architecture.

The frontend must never directly access SQLite.

The database layer must provide:

Proper constraints
Transactions where required
Validations
Referential integrity
Safe migrations
Consistent error handling

Detailed database rules belong in:

03-DATABASE-SPECIFICATION.md

# 18. Performance Requirements

The application should feel responsive on normal Windows desktop hardware.

The system should:

Load screens quickly.
Avoid unnecessary database queries.
Paginate large tables where appropriate.
Use indexed database fields for frequent searches.
Avoid blocking the UI during long operations.
Provide appropriate loading indicators for operations that may take noticeable time.

The initial target is small-to-medium gym datasets, not millions of records.

# 19. User Experience Requirements

The UI must be professional and consistent.

The application should provide:

Loading states

Users should know when data is being loaded.

Empty states

Empty tables should explain what the user can do next.

Error states

Errors should be understandable and actionable.

Avoid exposing raw technical/database errors to normal users.

Confirmation dialogs

Use confirmation for destructive or financially sensitive operations.

Success feedback

After successful operations, provide clear feedback.

Example:

Payment recorded successfully.
Receipt #000124 created.

# 20. Financial Accuracy Requirements

Financial calculations must be centralized in the backend/business logic layer.

The frontend must not independently calculate authoritative financial values.

Examples include:

Total payments
Outstanding balances
Revenue
Expenses
Net income
Membership payment totals

The backend is the authoritative source for financial calculations.

# 21. Security Requirements

Even though the application is offline, basic security practices must be followed.

The system must:

Validate all user input.
Use parameterized database queries.
Prevent SQL injection.
Protect sensitive application data.
Restrict privileged operations where authorization exists.
Avoid exposing internal errors to users.
Maintain safe database operations.

Detailed security requirements will be defined in:

09-SECURITY-BACKUP-RELEASE.md

# 22. Testing Requirements

Every implemented functionality must include appropriate automated tests.

No feature should be considered complete merely because it works manually.

Testing should cover:

Valid input
Invalid input
Edge cases
Business rules
Database operations
Error conditions
Important UI behavior where appropriate

Detailed testing requirements will be defined in:

08-TESTING-QUALITY.md

# 23. Architecture Requirements

The application must use a layered architecture.

The expected high-level flow is:

Frontend
   ↓
Tauri IPC
   ↓
Rust Commands
   ↓
Application / Business Logic
   ↓
Repositories
   ↓
SQLite

Responsibilities must remain separated.

Frontend

Responsible primarily for:

Presentation
User interaction
Local UI state
Calling backend commands
Displaying backend results/errors
Commands / IPC

Responsible for:

Receiving requests from frontend
Validating command-level input
Calling appropriate application services
Returning structured results/errors
Business Logic

Responsible for:

Business rules
Financial calculations
Membership rules
Validation requiring domain knowledge
Coordinating operations
Repository / Database Layer

Responsible for:

SQL queries
Database interaction
Persistence
Mapping database records

Detailed architecture is defined in:

02-ARCHITECTURE.md

# 24. Development Principles

Development must follow these principles:

Prefer simple solutions over unnecessary abstraction.
Keep modules focused.
Avoid duplicated business logic.
Reuse existing components and services.
Do not introduce unnecessary dependencies.
Do not modify unrelated functionality.
Database changes must use migrations.
Financial operations must be transactional where required.
Every significant feature must have automated tests.
Existing architecture must be respected.
Documentation must be updated when behavior changes.
Code should be understandable to another developer without relying on the original AI conversation.

# 25. Explicitly Out of Scope for Initial Version

The following are intentionally NOT part of the initial product scope:

Mobile application
Cloud synchronization
Online SaaS functionality
Multi-branch management
AI features
Social/community features
Diet/meal planning
Advanced workout tracking
Wearable integration
Online membership purchasing
Complex CRM
Marketing automation
Advanced biometric attendance
Complex inventory/POS system
Online payment gateway integration

These may be considered in future versions but must not be introduced into the initial implementation unless explicitly approved.

# 26. Initial Feature Priority
### P0 — Essential

These features are required for the first usable release:

Application shell
Dashboard
Member CRUD
Member search
Member filtering
Membership tracking
Payment recording
Partial payments
Payment history
Receipt generation
Receipt printing
Financial calculations
Basic reports
Expense management
Settings
Database backup/restore

### P1 — Important
Advanced report filtering
Report customization
PDF export
CSV/Excel export
Improved printer configuration
Staff roles/permissions

### P2 — Future

Features outside the initial scope may be evaluated after the core product is stable.

# 27. Definition of a Successful First Release

The first production release is successful when a gym owner can perform the complete daily workflow without internet access:

Open Application
       ↓
View Dashboard
       ↓
Register Member
       ↓
Assign Membership
       ↓
Receive Payment
       ↓
Print Receipt
       ↓
Search/View Member
       ↓
View Payment History
       ↓
Record Expenses
       ↓
Generate Monthly Report
       ↓
Backup Database

All core workflows must be reliable, tested, and understandable without requiring technical knowledge.

# 28. Documentation Dependencies

This document defines the product at a high level.

Other documentation must expand on this specification without contradicting it.

Primary documentation relationships:

01-PROJECT-SPECIFICATION.md
              │
              ├── 02-ARCHITECTURE.md
              │
              ├── 03-DATABASE-SPECIFICATION.md
              │
              ├── 04-FEATURE-SPECIFICATIONS.md
              │
              ├── 05-UI-UX-DESIGN-SYSTEM.md
              │
              ├── 06-IMPLEMENTATION-PLAN.md
              │
              ├── 07-CODING-STANDARDS.md
              │
              ├── 08-TESTING-QUALITY.md
              │
              ├── 09-SECURITY-BACKUP-RELEASE.md
              │
              └── 10-AI-DEVELOPMENT-RULES.md

If a later document conflicts with this specification, the conflict must be resolved explicitly rather than silently changing product behavior.

# 29. Change Control

Changes to the product scope must be deliberate.

Before adding a new major feature, determine:

Why is the feature needed?
Is it within the current product scope?
Does it affect the architecture?
Does it affect the database?
Does it affect existing workflows?
What tests are required?
What documentation needs to change?

AI-generated suggestions must not automatically become product requirements.

# 30. Current Product Definition

At its core, this product is:

A professional, lightweight, offline desktop application for managing gym members, memberships, payments, receipts, expenses, and reports using Tauri, Rust, React/TypeScript, and SQLite.

The application should remain focused, fast, maintainable, reliable, and easy for a non-technical gym owner to use.
