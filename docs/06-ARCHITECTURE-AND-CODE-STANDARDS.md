# Gym Management System — Architecture & Code Standards

**Document Version:** 1.0  
**Status:** Foundation  
**Platform:** Windows Desktop  
**Frontend:** React + TypeScript  
**Desktop Runtime:** Tauri  
**Backend/Application Layer:** Rust  
**Database:** SQLite  
**Architecture Style:** Layered Architecture  
**Primary Goal:** Maintainable, testable, predictable codebase

---

# 1. Purpose

This document defines the technical architecture and coding standards for the Gym Management System.

The purpose is to ensure that the application remains:

- Organized
- Maintainable
- Testable
- Predictable
- Secure
- Easy to extend
- Resistant to AI-generated architectural drift

This document is especially important when using AI coding agents.

AI agents must follow the architecture defined here instead of creating their own structure.

---

# 2. Architectural Principle

The application must use clear separation of responsibilities.

High-level architecture:

```text
┌──────────────────────────────────────────────┐
│              React / TypeScript              │
│                Presentation                  │
└──────────────────────┬───────────────────────┘
                       │
                       │ Tauri IPC
                       ▼
┌──────────────────────────────────────────────┐
│                 Rust Commands                │
│                  IPC Layer                   │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│                Service Layer                 │
│              Business Logic                  │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│              Repository Layer                │
│              Data Access                    │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│                  SQLite                     │
│                Persistence                  │
└──────────────────────────────────────────────┘
```

Each layer has a clearly defined responsibility.

# 3. Layer Responsibilities
### 3.1 Presentation Layer

Technology:

React
TypeScript

Responsible for:

Rendering UI
User interaction
Form state
Visual validation
Loading states
Error states
Calling frontend API wrappers
Display formatting

Must NOT contain:

SQL
SQLite logic
Rust logic
Business rules that belong to the service layer
Financial calculations that determine authoritative values

# 4. Frontend Architecture

The frontend should be organized by responsibility.

Recommended structure:

```text
src/
├── app/
│   ├── routes/
│   ├── providers/
│   └── App.tsx
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── tables/
│   ├── forms/
│   └── feedback/
│
├── features/
│   ├── dashboard/
│   ├── members/
│   ├── finances/
│   ├── reports/
│   └── settings/
│
├── services/
│   └── api/
│
├── hooks/
│
├── lib/
│
├── types/
│
└── styles/
```

Feature-specific code should stay close to the feature.

# 5. Feature-Based Frontend Organization

Example:

```text
features/
└── members/
    ├── components/
    ├── hooks/
    ├── pages/
    ├── api/
    ├── types.ts
    ├── validation.ts
    └── index.ts
```

The Members feature should contain Members-specific UI and logic.

Do not place everything inside a single global components folder.

# 6. Shared UI Components

Reusable UI components belong in:

```text
components/ui/
```

Examples:

Button
Input
Select
Modal
Dialog
Table
Badge
Card
DatePicker
Toast
Pagination

Feature-specific components should remain inside their feature.

Example:

```text
features/members/components/MemberForm.tsx
```

rather than:

```text
components/MemberForm.tsx
```

unless it is genuinely shared.

# 7. Frontend API Layer

The frontend must NOT call Tauri commands directly from arbitrary components.

Instead use a frontend API abstraction.

Example:

```text
Component
    ↓
Feature Hook / API
    ↓
Tauri API Wrapper
    ↓
invoke()
```

Example conceptual structure:

```text
services/
└── api/
    ├── members.ts
    ├── payments.ts
    ├── expenses.ts
    ├── reports.ts
    └── settings.ts
```

# 8. Tauri IPC Layer

Tauri commands act as the boundary between React and Rust.

Conceptually:

```text
React
  ↓
invoke("create_member")
  ↓
Rust command
  ↓
Service
```

Tauri commands should remain thin.

A command should:

Receive input.
Validate basic IPC input shape.
Call the appropriate service.
Return a structured result/error.

# 9. Tauri Command Rule

Bad:

```text
Tauri Command
    ↓
SQL query
    ↓
business calculations
    ↓
formatting
    ↓
database mutation
```

Good:

```text
Tauri Command
    ↓
Service
    ↓
Repository
    ↓
SQLite
```

Commands are adapters, not business-logic containers.

# 10. Rust Backend Structure

Recommended structure:

```text
src-tauri/
├── src/
│   ├── main.rs
│   ├── lib.rs
│   │
│   ├── commands/
│   │   ├── members.rs
│   │   ├── payments.rs
│   │   ├── expenses.rs
│   │   ├── reports.rs
│   │   └── settings.rs
│   │
│   ├── services/
│   │   ├── member_service.rs
│   │   ├── payment_service.rs
│   │   ├── expense_service.rs
│   │   ├── report_service.rs
│   │   └── settings_service.rs
│   │
│   ├── repositories/
│   │   ├── member_repository.rs
│   │   ├── payment_repository.rs
│   │   ├── expense_repository.rs
│   │   ├── report_repository.rs
│   │   └── settings_repository.rs
│   │
│   ├── models/
│   │   ├── member.rs
│   │   ├── payment.rs
│   │   ├── expense.rs
│   │   └── membership.rs
│   │
│   ├── dto/
│   │   ├── member.rs
│   │   ├── payment.rs
│   │   ├── expense.rs
│   │   └── report.rs
│   │
│   ├── errors/
│   │   └── mod.rs
│   │
│   ├── database/
│   │   ├── connection.rs
│   │   ├── migrations.rs
│   │   └── migrations/
│   │
│   └── utils/
│
└── Cargo.toml
```

The exact filenames may evolve, but the architectural boundaries must remain.

# 11. Command Layer

Commands are the public IPC interface.

Example:

create_member
get_member
list_members
update_member
archive_member

Payments:

create_payment
get_payment
list_payments

Expenses:

create_expense
update_expense
delete_expense
list_expenses

Reports:

generate_financial_report
generate_member_report

# 12. Service Layer

The service layer contains business logic.

Example:

PaymentService

Responsible for:

Payment validation
Membership/payment rules
Outstanding amount calculations
Receipt generation coordination
Transaction handling
Financial business rules

The service layer may call repositories.

The service layer must not directly manipulate frontend state.

# 13. Repository Layer

Repositories are responsible for persistence.

Example:

MemberRepository
PaymentRepository
ExpenseRepository

Repositories contain:

SQL
Query construction
Row mapping
Database persistence
Database retrieval

Repositories should NOT contain complex business rules.

# 14. Repository Example

Conceptual:

```text
PaymentService
    ↓
payment_repository.create(payment)
```

Repository:

```sql
INSERT INTO payments (...)
VALUES (?, ?, ?, ...)
```

The SQL remains isolated from business logic.

# 15. Model Layer

Models represent domain/database concepts.

Examples:

Member
MembershipPlan
Payment
Expense
Receipt

Models should represent meaningful domain objects.

Avoid creating unnecessary models simply because a database column exists.

# 16. DTO Layer

DTOs define data crossing architectural boundaries.

Examples:

CreateMemberRequest
UpdateMemberRequest
MemberResponse

CreatePaymentRequest
PaymentResponse

DTOs prevent database-specific structures from leaking into the frontend.

# 17. Domain Model vs Database Model

Do not assume database rows and frontend responses must always have identical structures.

Example:

Database may contain:

member_id
created_at
updated_at

Frontend response may contain:

id
name
status
membership
formatted_expiry

Transformations should occur in the appropriate application layer.

# 18. Business Logic Rule

Business logic belongs in Rust services.

Examples:

Is membership active?
Is membership expiring soon?
Is payment valid?
What is outstanding balance?
What is total revenue?
What is net income?
Can this payment be voided?

These rules must not be duplicated independently in:

React
Rust command
Repository

There should be one authoritative implementation.

# 19. Financial Logic

Financial calculations must be centralized.

Example:

Revenue
Expenses
Net Income
Outstanding
Member Balance

Do not allow different screens to calculate the same financial value differently.

Example:

Dashboard Revenue
Reports Revenue
Finance Revenue

must use the same authoritative business rules.

# 20. Date Logic

Date-related business rules should be centralized.

Examples:

Membership expiry
Expiring soon
Weekly report
Monthly report
Payment date filtering

Do not duplicate date calculations across React components.

# 21. Validation Architecture

Validation should exist at multiple appropriate levels.

Frontend Validation
        ↓
IPC Input Validation
        ↓
Service Validation
        ↓
Database Constraints

Frontend validation improves user experience.

Backend/service validation protects business rules.

Database constraints protect data integrity.

# 22. Error Architecture

Errors must be structured.

Recommended conceptual categories:

ValidationError
NotFoundError
ConflictError
DatabaseError
BusinessRuleError
PrintError
BackupError
InternalError

The frontend should receive safe, user-friendly error information.

# 23. Error Mapping

Example:

SQLite UNIQUE constraint
        ↓
Repository Error
        ↓
Service Error
        ↓
Application Error
        ↓
Tauri Response
        ↓
Frontend Message

Example final message:

A member with this member number already exists.

Do not expose raw SQL errors to normal users.

# 24. Result Handling

Operations should have predictable return structures.

Conceptually:

Success
```json
{
    "data": ...
}
```

or an equivalent strongly typed Rust/TypeScript representation.

Errors must be distinguishable from successful results.

Avoid ambiguous values such as:

null
false
[]

being used interchangeably to indicate different failures.

# 25. State Management

Frontend state should be divided into:

UI State
Server/Application Data
Form State

Examples:

UI state:

isModalOpen
selectedTab
sidebarCollapsed

Application data:

members
payments
expenses
dashboardMetrics

Form state:

name
phone
amount
paymentMethod

Do not create global state for every variable.

# 26. Data Fetching

Data fetching should be centralized through feature APIs/hooks.

Example:

useMembers()
usePayments()
useExpenses()
useDashboard()

Components should consume these abstractions rather than implementing raw IPC calls repeatedly.

# 27. Caching

Because this is an offline desktop application, caching should remain simple.

The SQLite database is the source of truth.

Do not introduce unnecessary caching layers.

After mutations, invalidate/refetch affected application data where appropriate.

# 28. IPC Naming Convention

Tauri command names should use predictable snake_case.

Examples:

create_member
update_member
archive_member

create_payment
list_payments

create_expense
update_expense

generate_report
print_receipt

Avoid inconsistent naming such as:

createMember
getAllPayments
paymentCreate

# 29. TypeScript Naming

Use:

PascalCase

for:

Components
Types
Interfaces
Classes

Example:

MemberTable
PaymentForm
MemberResponse

Use:

camelCase

for:

variables
functions
hooks

Example:

memberId
createMember
useMembers

# 30. Rust Naming

Follow standard Rust conventions.

Use:

snake_case

for:

functions
variables
modules

Use:

PascalCase

for:

structs
enums
traits

Example:

```rust
struct Member {}
fn create_member() {}
enum AppError {}
```

# 31. File Naming

React components:

PascalCase.tsx

Example:

MemberTable.tsx
PaymentModal.tsx

Hooks:

camelCase

Example:

useMembers.ts
usePayments.ts

Rust modules:

snake_case.rs

Example:

member_service.rs
payment_repository.rs

# 32. Component Responsibilities

A component should have one clear responsibility.

Bad:

```text
Dashboard.tsx
    ├── SQL
    ├── financial calculations
    ├── API calls
    ├── table rendering
    ├── modal rendering
    └── report generation
```

Good:

```text
Dashboard
    ↓
useDashboard()
    ↓
dashboard API
    ↓
Tauri
```

And:

```text
Dashboard
├── KPIGrid
├── RecentPayments
├── ExpiringMembers
└── QuickActions
```

# 33. Avoid Giant Files

Avoid files containing hundreds or thousands of lines when functionality can naturally be separated.

If a file becomes difficult to understand, evaluate whether responsibilities should be extracted.

Do not split files artificially just to make them shorter.

# 34. Dependency Direction

Dependencies should flow inward/downward.

Preferred:

```text
UI
 ↓
API
 ↓
Commands
 ↓
Services
 ↓
Repositories
 ↓
Database
```

Avoid reverse dependencies.

For example:

```text
Repository
   ❌
   ↓
React Component
```

is forbidden.

# 35. SQL Location Rule

SQL must only exist in the database/repository layer or dedicated migration files.

Forbidden:

React component → SQL
Service → raw SQL
Tauri command → SQL

Preferred:

Service → Repository → SQL

# 36. No Business Logic in UI

The frontend may perform presentation calculations.

Example:

```typescript
formatCurrency(2500)
```

is acceptable.

But authoritative calculations such as:

calculateOutstandingBalance()
calculateNetIncome()
isMembershipExpired()

must belong to the backend/service layer when they represent business rules.

# 37. No Business Logic in SQL

SQL should retrieve and persist data.

Do not turn SQL queries into massive business-rule engines.

Complex business decisions belong in Rust services.

Simple aggregation required for efficient reports is acceptable.

# 38. Transactions

Operations involving multiple related writes must use database transactions.

Example:

Receive Payment

```text
BEGIN
    Create Payment
    Create Receipt
    Update required membership state
COMMIT
```

If any required operation fails:

```text
ROLLBACK
```

# 39. Payment Operation

Payment processing must be treated as a critical workflow.

Recommended architecture:

```text
Frontend
    ↓
createPayment()
    ↓
Tauri Command
    ↓
PaymentService
    ↓
Validate
    ↓
Begin Transaction
    ↓
PaymentRepository
    ↓
ReceiptRepository
    ↓
Commit
    ↓
Return Payment + Receipt
```

# 40. Printing Architecture

Printing should not be responsible for creating financial records.

Correct:

Payment saved
      ↓
Receipt data generated
      ↓
Print receipt

Incorrect:

Print receipt
      ↓
Create payment

If printing fails after payment succeeds, the payment must remain recorded.

The user should be able to retry printing.

# 41. Reports Architecture

Reports should follow:

```text
Frontend
   ↓
Report Request
   ↓
Tauri Command
   ↓
Report Service
   ↓
Report Repository
   ↓
SQLite
   ↓
Report Result
   ↓
Frontend
```

Report business rules should be centralized.

# 42. Database Connection Management

The application should initialize SQLite through a centralized database module.

Do not create independent database connections throughout the application without architectural justification.

The application should provide a controlled database access mechanism to repositories.

# 43. Application State in Rust

Shared application state may include:

Database Connection
Application Configuration
Printer Configuration

State should be initialized during application startup.

Commands should access shared state through Tauri's managed-state mechanisms or an equivalent controlled approach.

# 44. Configuration

Configuration should not be hard-coded throughout the codebase.

Examples:

Gym Name
Currency
Receipt Prefix
Expiring Soon Threshold

These should be accessible through the settings system where appropriate.

# 45. Constants

Constants should be centralized when they represent application-wide rules.

Example:

DEFAULT_EXPIRING_SOON_DAYS
RECEIPT_NUMBER_PREFIX
APPLICATION_VERSION

Do not duplicate the same constant across multiple files.

# 46. Logging

The application should have structured logging for development and troubleshooting.

Logs may include:

Application startup
Database initialization
Migration execution
Critical errors
Payment processing errors
Backup/restore errors
Printing errors

Logs must not unnecessarily expose sensitive personal or financial information.

# 47. Production Logging

Production logs should be useful without becoming noisy.

Do not log every UI interaction.

Prefer logging:

Important lifecycle events
Warnings
Errors
Unexpected conditions

# 48. Debug Mode

Development/debug logging may be more verbose.

Production builds should use appropriate production logging levels.

Do not leave temporary debugging statements throughout production code.

# 49. Security Boundaries

Even though this is a local application:

React

must not receive unrestricted access to:

Filesystem
SQLite
Operating system commands

Tauri commands should expose only explicitly required capabilities.

# 50. Filesystem Access

Filesystem operations such as:

Backup
Restore
Logo selection
Receipt generation

must go through controlled Rust/Tauri APIs.

The frontend should not be given unrestricted filesystem access.

# 51. No Arbitrary Command Execution

The application must never expose a generic frontend command such as:

execute_shell_command()
execute_sql()
read_any_file()

Only narrowly scoped commands are permitted.

# 52. Testing Architecture

Every business feature must have automated tests.

Minimum structure:

```text
Feature
   ↓
Implementation
   ↓
Unit Tests
   ↓
Integration Tests
   ↓
UI Verification
```

Testing requirements are defined further in:

07-TESTING-AND-QUALITY-ASSURANCE.md

# 53. Feature Completion Rule

A feature is NOT complete when the UI appears to work.

A feature is complete only when:

UI works
+
Backend works
+
Database works
+
Error handling works
+
Validation works
+
Automated tests pass
+
Regression tests pass

# 54. AI Coding Rules

AI coding agents MUST:

Read this document before modifying architecture.
Inspect existing code before creating new files.
Reuse existing abstractions.
Follow existing naming conventions.
Avoid duplicate functionality.
Keep SQL inside repositories.
Keep business logic inside services.
Keep UI logic inside frontend components/hooks.
Add tests for new behavior.
Update documentation when architecture changes.

# 55. AI Must Not

AI agents must NOT:

❌ Put SQL in React
❌ Put business logic in React
❌ Put SQL in Tauri commands
❌ Create random global state
❌ Create duplicate API wrappers
❌ Create duplicate UI components
❌ Modify database schema without migrations
❌ Skip tests because the feature is "simple"
❌ Rewrite unrelated working code
❌ Introduce unnecessary dependencies
❌ Change architecture without documentation
❌ Create giant files
❌ Ignore existing abstractions

# 56. Change Impact Analysis

Before modifying an existing feature, determine:

Which UI components are affected?
Which API functions are affected?
Which Tauri commands are affected?
Which services are affected?
Which repositories are affected?
Which database tables are affected?
Which tests are affected?

Do not make isolated changes without checking dependencies.

# 57. Refactoring Rule

Refactoring should preserve behavior unless the purpose of the refactor is explicitly to change behavior.

Before refactoring:

Run tests

After refactoring:

Run tests

If tests fail, determine whether:

The refactor introduced a regression

or:

The existing test was incorrect

Do not simply delete failing tests.

# 58. Dependency Management

New dependencies should only be added when:

They solve a real problem.
Existing dependencies cannot reasonably solve it.
They are maintained and appropriate.
They do not introduce unnecessary complexity.

Before adding a dependency, inspect whether an existing project dependency already provides the required capability.

# 59. Code Duplication

Avoid duplicated business logic.

Bad:

Dashboard:
calculate membership status

Members:
calculate membership status

Reports:
calculate membership status

Good:

```text
Membership Service
       ↓
Authoritative membership status
```

Frontend displays the result.

# 60. DRY vs Simplicity

Do not blindly abstract every repeated line.

The priority is:

Correctness
   ↓
Clarity
   ↓
Maintainability
   ↓
Reuse

A small amount of obvious duplication may be preferable to an overly generic abstraction.

# 61. YAGNI Principle

Do not implement features before they are required.

Avoid creating:

CloudSyncService
MultiBranchService
TrainerService
AttendanceService
MobileAPI

when those features do not exist in the current product scope.

# 62. Performance Principles

The application is an offline desktop application.

Priorities:

Fast startup
Fast search
Fast table filtering
Fast payment recording
Fast reports

Optimize based on actual bottlenecks.

Do not introduce complex performance systems prematurely.

# 63. Query Performance

Queries should:

Use appropriate indexes.
Avoid unnecessary columns.
Use pagination for large lists.
Use parameterized queries.
Avoid N+1 query patterns where practical.

# 64. Frontend Performance

Avoid:

Unnecessary re-renders
Repeated database calls
Large unnecessary state objects
Rendering thousands of rows at once

Use virtualization only when actually necessary.

Do not prematurely optimize normal-sized gym datasets.

# 65. Error Recovery

Recoverable errors should allow the user to continue working.

Example:

```text
Printer unavailable
      ↓
Payment remains saved
      ↓
Show error
      ↓
[Try Again]
```

The system should avoid forcing the user to restart the application unnecessarily.

# 66. Offline Principle

The application must function without:

Internet
Cloud server
External API

Core functionality must remain available offline.

# 67. Architecture Review Checklist

Before merging a feature:

[ ] Correct layer used
[ ] No SQL outside repositories
[ ] No business logic in UI
[ ] Tauri commands remain thin
[ ] Service contains business rules
[ ] Repository contains persistence
[ ] DTOs are appropriate
[ ] Errors are structured
[ ] Validation exists
[ ] Transactions used where necessary
[ ] Tests added
[ ] No unnecessary dependency added
[ ] No duplicate abstraction created
[ ] Existing functionality remains intact

# 68. Golden Rule

When unsure where code belongs, ask:

Is this about presentation?
        ↓
Frontend

Is this about application/business behavior?
        ↓
Service

Is this about database persistence?
        ↓
Repository

Is this about communication between React and Rust?
        ↓
Tauri Command

Is this about database structure?
        ↓
Migration / Database Layer

# 69. Final Architecture

The final intended architecture is:

```text
┌─────────────────────────────────────────────┐
│              React / TypeScript             │
│                                             │
│ Pages → Components → Hooks → API Wrappers   │
└─────────────────────┬───────────────────────┘
                      │
                      │ Tauri IPC
                      ▼
┌─────────────────────────────────────────────┐
│              Tauri Commands                 │
│              Thin IPC Layer                 │
└─────────────────────┬───────────────────────┘
                      ▼
┌─────────────────────────────────────────────┐
│               Service Layer                 │
│          Business / Domain Logic            │
└─────────────────────┬───────────────────────┘
                      ▼
┌─────────────────────────────────────────────┐
│             Repository Layer                │
│              SQL / Persistence              │
└─────────────────────┬───────────────────────┘
                      ▼
┌─────────────────────────────────────────────┐
│                  SQLite                     │
│              Persistent Data                │
└─────────────────────────────────────────────┘
```

This architecture must remain the foundation of the application throughout development.
