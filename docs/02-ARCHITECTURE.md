# Gym Management System — Architecture Specification

**Document Version:** 1.0  
**Status:** Foundation  
**Application Type:** Offline Desktop Application  
**Platform:** Windows  
**Desktop Framework:** Tauri  
**Backend:** Rust  
**Frontend:** React + TypeScript  
**Database:** SQLite  
**Architecture Style:** Layered Architecture  

---

# 1. Architecture Goals

The application architecture must prioritize:

- Maintainability
- Testability
- Clear separation of concerns
- Predictable data flow
- Low coupling
- High cohesion
- Easy debugging
- Safe database operations
- Offline reliability
- Long-term extensibility

The architecture must remain simple enough for a small desktop application while being structured enough to support future growth.

The application must **not** become a collection of tightly coupled UI components, SQL queries, and business logic.

---

# 2. High-Level Architecture

The application follows a layered architecture:

```text
┌─────────────────────────────────────────────┐
│              PRESENTATION                   │
│           React + TypeScript                │
│                                             │
│ Pages / Components / Hooks / UI State       │
└──────────────────────┬──────────────────────┘
                       │
                       │ Tauri IPC
                       ▼
┌─────────────────────────────────────────────┐
│                IPC / COMMANDS               │
│                   Rust                      │
│                                             │
│ Tauri Commands / DTO Validation             │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│              APPLICATION LAYER              │
│                   Rust                      │
│                                             │
│ Services / Use Cases / Business Rules       │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│              PERSISTENCE LAYER              │
│                   Rust                      │
│                                             │
│ Repositories / SQL / Database Mapping        │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                 DATABASE                    │
│                  SQLite                     │
└─────────────────────────────────────────────┘
```

# 3. Core Architectural Rule

The most important rule of the application is:

Each layer must have a clearly defined responsibility and must not bypass the layer below or above it.

The normal dependency direction is:

Frontend
   ↓
Commands / IPC
   ↓
Services
   ↓
Repositories
   ↓
Database

Dependencies must flow downward.

Lower layers must not depend on higher-level UI concerns.

# 4. Responsibilities of Each Layer
### 4.1 Frontend / Presentation Layer

Technology:

React
TypeScript

Responsible for:

Rendering UI
User interaction
Form state
UI state
Table state
Filters
Pagination
Loading states
Empty states
Displaying errors
Calling Tauri commands
Formatting data for presentation

The frontend should NOT contain authoritative business logic.

Frontend must NOT:
Execute SQL
Access SQLite directly
Implement financial calculations that determine authoritative values
Decide membership business rules
Modify database files
Contain duplicated backend business rules
Bypass Tauri commands

Example of forbidden architecture:

React Component
      ↓
SQLite

This is NOT allowed.

# 5. Tauri IPC / Command Layer

The command layer is the bridge between React and Rust application logic.

Example:

React
  ↓
invoke("create_member", payload)
  ↓
Rust Tauri Command
  ↓
Member Service

Commands should remain thin.

A command should primarily:

Receive input.
Convert/validate transport data.
Call the appropriate service.
Return the result.
Convert errors into a frontend-safe representation.

Commands must NOT become large business-logic functions.

Bad
```
create_member()
{
    validate everything
    calculate membership
    execute SQL
    format receipt
    calculate balance
    send notification
}
```
Good
```
create_member()
{
    validate command input
    member_service.create_member(...)
}
```

# 6. Application / Business Logic Layer

This is where application behavior belongs.

The service layer is responsible for:

Business rules
Validation requiring business context
Financial calculations
Membership calculations
Payment processing
Receipt generation coordination
Report calculations
Coordinating multiple repositories
Transaction orchestration

Examples:

MemberService
PaymentService
ReportService
ExpenseService
ReceiptService
DashboardService

The service layer should not contain presentation logic.

For example:

❌ Generate HTML for a React component

❌ Render a table

❌ Decide CSS classes

It may prepare structured data for the frontend.

# 7. Repository / Persistence Layer

Repositories are responsible for communication with SQLite.

Examples:

MemberRepository
PaymentRepository
ExpenseRepository
MembershipRepository
SettingsRepository

Repositories contain:

SQL queries
Database operations
Record mapping
Query filtering
Pagination queries
Persistence logic

Repositories should NOT contain business decisions.

Example

A repository may answer:

"Give me all active members."

But it should not decide:

"A member should become expired because 30 days have passed."

That business rule belongs to the appropriate service/domain logic.

# 8. Database Layer

SQLite is the persistent storage engine.

The database layer should provide:

Connection management
Migration execution
Transaction support
Database initialization
Connection configuration
Foreign key enforcement
Query execution infrastructure

The database layer should remain isolated from frontend concerns.

# 9. Domain Model

Business entities should have clearly defined models.

Initial entities include:

Member
Membership
Payment
Expense
Receipt
Settings

Additional entities may be introduced when genuinely required.

Models should represent application data rather than UI-specific structures.

# 10. DTOs

DTOs (Data Transfer Objects) should be used where appropriate when data crosses architectural boundaries.

Typical examples:

CreateMemberRequest
UpdateMemberRequest
MemberResponse

CreatePaymentRequest
PaymentResponse

CreateExpenseRequest
ExpenseResponse

ReportRequest
ReportResponse

DTOs prevent internal database structures from being unnecessarily exposed directly to the frontend.

# 11. Error Architecture

Errors must be handled consistently.

The architecture should use structured application errors rather than arbitrary strings scattered throughout the code.

Conceptually:

Database Error
      ↓
Repository Error
      ↓
Service/Application Error
      ↓
Command Error
      ↓
Frontend-safe Error

The frontend should receive useful errors such as:

MemberNotFound
ValidationError
PaymentInvalid
InsufficientInformation
DatabaseError
OperationFailed

The frontend should NOT receive raw SQLite/internal implementation errors as normal user messages.

# 12. Recommended Backend Structure

The Rust backend should follow a modular structure similar to:

```text
src-tauri/
│
├── src/
│   │
│   ├── main.rs
│   ├── lib.rs
│   │
│   ├── commands/
│   │   ├── mod.rs
│   │   ├── member_commands.rs
│   │   ├── payment_commands.rs
│   │   ├── expense_commands.rs
│   │   ├── report_commands.rs
│   │   ├── receipt_commands.rs
│   │   └── settings_commands.rs
│   │
│   ├── services/
│   │   ├── mod.rs
│   │   ├── member_service.rs
│   │   ├── payment_service.rs
│   │   ├── expense_service.rs
│   │   ├── report_service.rs
│   │   ├── receipt_service.rs
│   │   └── dashboard_service.rs
│   │
│   ├── repositories/
│   │   ├── mod.rs
│   │   ├── member_repository.rs
│   │   ├── payment_repository.rs
│   │   ├── expense_repository.rs
│   │   ├── membership_repository.rs
│   │   └── settings_repository.rs
│   │
│   ├── models/
│   │   ├── mod.rs
│   │   ├── member.rs
│   │   ├── membership.rs
│   │   ├── payment.rs
│   │   ├── expense.rs
│   │   └── receipt.rs
│   │
│   ├── dto/
│   │   ├── mod.rs
│   │   ├── member_dto.rs
│   │   ├── payment_dto.rs
│   │   ├── expense_dto.rs
│   │   └── report_dto.rs
│   │
│   ├── database/
│   │   ├── mod.rs
│   │   ├── connection.rs
│   │   └── migrations.rs
│   │
│   ├── errors/
│   │   ├── mod.rs
│   │   └── app_error.rs
│   │
│   └── utils/
│       ├── mod.rs
│       ├── dates.rs
│       └── formatting.rs
│
└── migrations/
```

The exact structure may evolve, but architectural responsibilities must remain intact.

# 13. Frontend Architecture

The frontend should use a feature-oriented structure while keeping shared components separate.

Recommended structure:

```text
src/
│
├── app/
│   ├── App.tsx
│   ├── routes.tsx
│   └── providers/
│
├── features/
│   │
│   ├── dashboard/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── pages/
│   │
│   ├── members/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── pages/
│   │
│   ├── finances/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── pages/
│   │
│   ├── reports/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── pages/
│   │
│   └── settings/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types.ts
│       └── pages/
│
├── components/
│   ├── ui/
│   ├── tables/
│   ├── forms/
│   ├── feedback/
│   └── layout/
│
├── lib/
│   ├── tauri/
│   ├── formatting/
│   └── validation/
│
├── types/
│
└── styles/
```

# 14. Frontend Data Flow

Frontend data should flow through a dedicated Tauri communication layer.

Recommended:

Component
    ↓
Feature Hook
    ↓
Feature Service / API Wrapper
    ↓
Tauri invoke()
    ↓
Rust Command

Example:

MemberList
    ↓
useMembers()
    ↓
memberApi.getMembers()
    ↓
invoke("get_members")
    ↓
member_command
    ↓
MemberService
    ↓
MemberRepository
    ↓
SQLite

The component should not directly call invoke() repeatedly throughout the UI.

# 15. Tauri Command Naming

Commands should use consistent naming.

Examples:

create_member
get_member
get_members
update_member
archive_member

create_payment
get_payment
get_payments

create_expense
get_expenses

get_dashboard_summary

generate_report

generate_receipt
get_receipt

Names should clearly describe the operation.

Avoid vague names such as:

process()
handle()
do_action()
execute()

# 16. Business Logic Rules

Business logic must have one authoritative implementation.

For example, membership status must NOT be calculated differently in multiple places.

Bad:

Dashboard calculates status one way.
Member table calculates it another way.
Reports calculate it a third way.

Good:

Membership business rule
          ↓
Single authoritative implementation
          ↓
Dashboard
Members
Reports

The same principle applies to:

Payment totals
Outstanding balances
Revenue
Expenses
Net income
Membership expiry
Receipt numbering

# 17. Financial Operations

Financial operations must be treated as sensitive operations.

Operations involving multiple related database changes should use database transactions.

Example:

Receive Payment
      ↓
BEGIN TRANSACTION
      ↓
Validate member
      ↓
Create payment
      ↓
Generate/assign receipt number
      ↓
Update required membership/payment state
      ↓
COMMIT

If a required operation fails:

ROLLBACK

The system must not leave partially completed financial operations.

# 18. CRUD Architecture

CRUD operations should follow a consistent pattern.

Example:

CREATE MEMBER

Frontend
   ↓
CreateMemberRequest
   ↓
Tauri Command
   ↓
MemberService
   ↓
Validation
   ↓
MemberRepository
   ↓
SQLite
   ↓
MemberResponse
   ↓
Frontend

The same pattern should be followed for other entities.

# 19. Filtering Architecture

Filtering should be handled efficiently.

The frontend may provide:

search
status
date_from
date_to
package
payment_method

The request travels to the backend:

Frontend Filters
      ↓
DTO
      ↓
Service
      ↓
Repository
      ↓
Parameterized SQL Query
      ↓
SQLite

Filtering should preferably occur at the database level rather than loading large datasets into the frontend and filtering everything in memory.

# 20. Pagination

Tables displaying potentially large datasets should use pagination where appropriate.

The frontend should send parameters such as:

page
page_size
sort_by
sort_direction
filters

The backend should return:

items
total_count
page
page_size

Pagination behavior must remain consistent across modules.

# 21. Sorting

Sorting should be explicitly controlled.

Supported sorting fields should be defined by each feature.

User-provided sort fields must never be inserted directly into SQL without validation against an allowed list.

This prevents unsafe query construction.

# 22. Date and Time Handling

Dates must be handled consistently throughout the application.

The application should define:

Storage format
Display format
Date comparison rules
Time zone behavior
Current-date behavior
Report date boundaries

Database representation and UI representation must remain separate.

For example:

Database:
ISO-compatible standardized representation

UI:
Human-readable local format

Exact conventions will be finalized during implementation.

# 23. Currency and Money Handling

Financial values must not rely on floating-point arithmetic where precision can be lost.

Money calculations should use an appropriate exact representation.

The authoritative calculation must happen in Rust/business logic.

The frontend should primarily display the values returned by the backend.

Currency formatting should be centralized rather than manually implemented in every component.

# 24. State Management

Frontend state should be divided into:

UI State

Examples:

Modal open/closed
Selected row
Current tab
Table filters
Search text
Server/Application Data

Examples:

Members
Payments
Expenses
Reports

Avoid creating global state for data that only belongs to a single page or feature.

Global state should only be introduced when there is a genuine cross-application requirement.

# 25. Component Architecture

Components should have focused responsibilities.

Avoid giant components such as:

MembersPage.tsx

containing:

API calls
Forms
Tables
Modals
Validation
Business logic
Formatting
State management

Instead:

MembersPage
 ├── MemberToolbar
 ├── MemberFilters
 ├── MemberTable
 ├── MemberForm
 ├── MemberDetails
 └── DeleteMemberDialog

Complex behavior should be extracted into hooks/services where appropriate.

# 26. Shared Components

Reusable components should be centralized.

Examples:

DataTable
KpiCard
SearchInput
DateRangePicker
ConfirmDialog
Modal
Button
Input
Select
Badge
EmptyState
LoadingState
ErrorState
Pagination
Toast

Before creating a new shared component, inspect whether an existing component can be reused.

Avoid creating near-duplicates.

# 27. UI and Business Logic Separation

UI components may handle presentation decisions.

Example:

if status === "expired"
    display danger badge

But they should not decide the actual business meaning of expiry.

The business layer should determine:

status = expired

The frontend decides how to visually represent it.

# 28. Report Architecture

Reports should use a centralized reporting system.

Conceptually:

Report UI
   ↓
Report Request
   ↓
Report Service
   ↓
Repository Queries
   ↓
Report Data
   ↓
Report Formatter
   ↓
UI / Print / Export

Report presets should be represented consistently.

Examples:

today
yesterday
this_week
last_week
this_month
last_month
this_year
custom

The backend should remain authoritative for report calculations.

# 29. Receipt Architecture

Receipt generation should not be tightly coupled to the payment form UI.

Recommended flow:

Payment Service
      ↓
Successful Payment
      ↓
Receipt Service
      ↓
Receipt Data
      ↓
Printing / Export Layer

The same receipt data should be reusable for:

Printing
Reprinting
PDF generation where supported

The receipt template should remain separate from financial business logic.

# 30. Backup Architecture

Because SQLite is the primary persistent store, backup functionality should operate against the application's database using a controlled process.

Backup operations should:

Ensure database consistency.
Create a backup copy.
Validate the backup where practical.
Store it in a user-selected or configured location.
Report success/failure clearly.

Restore operations must be treated as destructive/high-risk operations and require confirmation.

# 31. Dependency Rules

The following dependency rules are mandatory.

Frontend
    ↓
Commands
    ↓
Services
    ↓
Repositories
    ↓
Database

Forbidden dependencies
❌ Frontend → Repository
❌ Frontend → SQLite
❌ Frontend → SQL
❌ Repository → React
❌ Repository → UI
❌ Database → Frontend
❌ Model → UI component

A lower layer must never import a higher layer merely for convenience.

# 32. No Business Logic Duplication

There must be one authoritative implementation for every important business rule.

Examples:

Membership expiry calculation
Payment balance calculation
Revenue calculation
Expense calculation
Net income calculation
Receipt numbering

If the same logic is needed in multiple places, create an appropriate shared business/service implementation rather than copying the logic.

# 33. No God Modules

Avoid oversized files and modules.

A module should have a focused responsibility.

If a file becomes difficult to understand because it contains unrelated responsibilities, split it according to architectural boundaries.

Do not split files merely to achieve an arbitrary line count.

# 34. Testing Architecture

Each architectural layer must be testable independently.

Business Logic
      ↓
Unit Tests

Repositories
      ↓
Database Integration Tests

Commands / IPC
      ↓
Integration Tests

Critical User Workflows
      ↓
UI/E2E Tests

Testing requirements are defined in:

08-TESTING-QUALITY.md

# 35. Feature Development Architecture

Every feature should follow this sequence:

Requirement
    ↓
Feature Specification
    ↓
Database Changes
    ↓
Models / DTOs
    ↓
Repository
    ↓
Service / Business Logic
    ↓
Tauri Command
    ↓
Frontend API Layer
    ↓
Hooks / State
    ↓
UI Components
    ↓
Tests
    ↓
Verification

Not every feature requires every step, but the architectural boundaries must remain intact.

# 36. Example: Creating a Member

Complete flow:

User fills Member Form
          ↓
Frontend validation
          ↓
CreateMemberRequest
          ↓
Tauri invoke("create_member")
          ↓
Rust create_member command
          ↓
MemberService
          ↓
Business validation
          ↓
MemberRepository
          ↓
Parameterized SQL
          ↓
SQLite
          ↓
Member created
          ↓
MemberResponse
          ↓
Frontend
          ↓
Success notification
          ↓
Member list refresh

Automated tests should cover the important stages.

# 37. Example: Receiving a Payment
Payment Form
      ↓
User enters amount
      ↓
Frontend validation
      ↓
CreatePaymentRequest
      ↓
Tauri Command
      ↓
PaymentService
      ↓
Validate member
      ↓
Validate amount
      ↓
BEGIN TRANSACTION
      ↓
Create Payment
      ↓
Generate Receipt Number
      ↓
Commit Transaction
      ↓
PaymentResponse
      ↓
Receipt Data
      ↓
Frontend
      ↓
Print Receipt

If any database operation required for the payment fails:

ROLLBACK

No partial financial state should remain.

# 38. Example: Dashboard Data

The dashboard should not make many unrelated calls if a consolidated backend query/service can efficiently provide the required information.

Conceptually:

Dashboard
   ↓
DashboardService
   ↓
Required repository queries
   ↓
DashboardSummary
   ↓
Frontend

Example response:

```json
{
    "total_members": 0,
    "active_members": 0,
    "expired_members": 0,
    "expiring_members": 0,
    "today_revenue": 0,
    "monthly_revenue": 0,
    "outstanding_amount": 0
}
```

The exact data structure will be defined during implementation.

# 39. Architecture Change Rules

The architecture must not be changed casually.

Before introducing a significant architectural change, determine:

Why is the change required?
What problem does it solve?
What existing code is affected?
What alternatives were considered?
What tests are affected?
What documentation must be updated?

Significant architectural decisions must be documented.

# 40. AI Development Restrictions

AI coding agents must follow this architecture.

The AI must:

Inspect existing code before modifying it.
Reuse existing architecture.
Reuse existing services/repositories/components.
Keep commands thin.
Keep business logic in services.
Keep SQL in repositories.
Keep UI logic in frontend.
Avoid unnecessary abstractions.
Avoid bypassing architectural layers.
Add tests for implemented behavior.
Avoid modifying unrelated modules.

The AI must NOT:

❌ Put SQL inside Tauri commands
❌ Put SQL inside React
❌ Put business logic inside React
❌ Put business logic inside repositories
❌ Create duplicate services
❌ Create duplicate components
❌ Bypass existing services
❌ Create a second database access mechanism
❌ Rewrite architecture without explicit approval

# 41. Architecture Decision Priority

When making implementation decisions, follow this priority:

1. Correctness
2. Data integrity
3. Maintainability
4. Testability
5. Simplicity
6. Performance
7. Convenience

Convenience must never justify violating the architecture.

# 42. Final Architectural Principle

The application should remain understandable to a developer who did not participate in its original development.

A developer should be able to answer:

Where is the UI?
Where is the Tauri command?
Where is the business logic?
Where is the database query?
Where is the model?
Where is the validation?
Where are the tests?

without searching through unrelated files.

The target architecture is:

```text
                ┌─────────────────────┐
                │       React         │
                │   Presentation UI   │
                └──────────┬──────────┘
                           │
                      Tauri IPC
                           │
                ┌──────────▼──────────┐
                │      Commands       │
                │   Transport Layer   │
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │      Services       │
                │   Business Logic    │
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │    Repositories     │
                │   Persistence/SQL   │
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │       SQLite        │
                │     Data Store      │
                └─────────────────────┘
```

This architecture should be treated as the default architectural contract for the project.
