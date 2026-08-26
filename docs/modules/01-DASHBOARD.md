# Dashboard Module

**Module:** Dashboard  
**Priority:** P0 — Critical  
**Status:** Planned  
**Route:** `/dashboard`

---

# 1. Purpose

The Dashboard is the application's main overview screen.

Its purpose is to give the gym owner a quick understanding of:

- Membership situation
- Revenue
- Expenses
- Net income
- Expiring memberships
- Recent activity

The Dashboard is an overview.

It must NOT become a complex analytics system.

---

# 2. Primary Goals

The dashboard should answer these questions immediately:

1. How many members do we have?
2. How many are currently active?
3. Who is expiring soon?
4. How many memberships are expired?
5. How much money did we receive today?
6. How much money did we receive this month?
7. How much did we spend this month?
8. What is the current month's net income?
9. What payments happened recently?
10. What members were recently added?

---

# 3. Dashboard Layout

Recommended structure:

```text
┌────────────────────────────────────────────────────────────┐
│ Dashboard                                      Date/Period │
│ Welcome back                                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Total Members │ Active │ Expiring │ Expired               │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Today's Revenue │ Monthly Revenue │ Expenses │ Net Income │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Recent Payments                  │ Membership Overview    │
│                                  │                        │
│                                  │                        │
├──────────────────────────────────┼─────────────────────────┤
│                                  │                        │
│ Recent Members                   │ Quick Actions          │
│                                  │                        │
└──────────────────────────────────┴─────────────────────────┘
```

The exact visual arrangement may be refined during UI implementation.

# 4. KPI Cards

The initial dashboard should contain these KPI cards.

## 4.1 Total Members

Definition:

Count of non-archived members

Display example:

Total Members

248

## 4.2 Active Members

Definition:

Members whose membership is currently active.

The calculation should be based on membership dates and valid member state.

Example:

Active Members

187

## 4.3 Expiring Soon

Definition:

Members whose membership will expire within the configured warning period.

Initial default:

7 days

The warning period may later become configurable.

Example:

Expiring Soon

14

## 4.4 Expired Members

Definition:

Non-archived members whose membership end date has passed.

Example:

Expired

47

# 5. Financial KPI Cards

The dashboard should show:

Today's Revenue
This Month's Revenue
This Month's Expenses
This Month's Net Income

# 6. Today's Revenue

Definition:

Sum of valid payments recorded today

Example:

Today's Revenue

Rs. 8,500

The value must come from payment records.

Do NOT calculate it from:

Receipts
UI state
Member membership prices
Cached frontend values

# 7. Monthly Revenue

Definition:

Sum of valid payments within the current calendar month

Example:

August Revenue

Rs. 184,500

The displayed month should be clear.

# 8. Monthly Expenses

Definition:

Sum of expenses within the current calendar month

Example:

August Expenses

Rs. 62,000

# 9. Monthly Net Income

Formula:

Net Income = Monthly Revenue - Monthly Expenses

Example:

Revenue:
Rs. 184,500

Expenses:
Rs. 62,000

Net Income:
Rs. 122,500

This calculation must use the same business logic used by the Finances and Reports modules.

# 10. KPI Consistency

Dashboard financial values must match:

Finances
Reports

For example:

Dashboard:
August Revenue = Rs. 184,500

Finances:
August Revenue = Rs. 184,500

Reports:
August Revenue = Rs. 184,500

There must be one authoritative calculation strategy.

# 11. Date Context

Financial KPI cards must clearly communicate their period.

Good:

Today's Revenue
Rs. 8,500
August 2026 Revenue
Rs. 184,500

Avoid:

Revenue
Rs. 184,500

without explaining the period.

# 12. Quick Actions

The dashboard should provide shortcuts for common operations.

Required actions:

+ Add Member
Receive Payment
Add Expense

Recommended secondary actions:

View Members
View Finances
Generate Report

# 13. Add Member

Clicking:

Add Member

should navigate to or open the member creation workflow.

Expected flow:

Dashboard
   ↓
Add Member
   ↓
Member Form
   ↓
Save
   ↓
Member Created
   ↓
Dashboard

After successful creation, dashboard member KPIs should update.

# 14. Receive Payment

Clicking:

Receive Payment

should open the payment workflow.

Expected flow:

Dashboard
   ↓
Receive Payment
   ↓
Select Member
   ↓
Enter Payment
   ↓
Save
   ↓
Receipt
   ↓
Dashboard

# 15. Add Expense

Clicking:

Add Expense

should open the expense creation workflow.

Expected flow:

Dashboard
   ↓
Add Expense
   ↓
Expense Form
   ↓
Save
   ↓
Dashboard

Monthly expense and net income values should update accordingly.

# 16. Recent Payments

The dashboard should display a compact list of recent payments.

Suggested columns:

Member
Amount
Payment Method
Date

Example:

Recent Payments

Ahmad Khan        Rs. 2,000    Cash          Today
Usman Ali         Rs. 3,000    Easypaisa     Today
Hamza Shah        Rs. 2,000    Cash          Yesterday

# 17. Recent Payments Limit

The dashboard should NOT load the entire payment history.

Initial limit:

5–10 records

The exact number can be adjusted based on UI design.

Provide:

View All

to navigate to the Finances/Payments section.

# 18. Recent Members

Show recently added members.

Suggested fields:

Name
Member ID
Membership
Joined Date

Example:

Recent Members

Ahmad Khan      GYM-00248      Monthly      Today
Bilal Ahmad     GYM-00247      Quarterly    Yesterday

# 19. Recent Members Limit

Initial:

5 records

Provide:

View All

to navigate to Members.

# 20. Membership Overview

A small membership overview section should show:

Active
Expiring Soon
Expired

Example:

Membership Status

Active           187
Expiring Soon     14
Expired           47

This should provide a quick visual understanding without requiring another page.

# 21. Expiring Members

The dashboard should make expiring memberships easy to identify.

Example:

Expiring Soon

Ahmad Khan       2 days
Bilal Shah       4 days
Usman Ali        6 days

View All

Clicking a member should open their member details.

# 22. Expired Members

If expired members exist, provide a visible indication.

Example:

47 memberships have expired.

View Expired Members

Do not create aggressive or distracting alerts.

# 23. Search

The Dashboard itself does not require a complex search system.

Global application search may be added later.

If implemented, it should primarily search:

Member Name
Member ID
Phone

# 24. Dashboard Filters

The dashboard does NOT need complicated filters.

Financial KPIs should initially use:

Today
Current Month

Reports and Finances are responsible for detailed date filtering.

# 25. Refresh Behavior

After operations that affect dashboard data:

Create Member
Archive Member
Receive Payment
Add Expense

the dashboard should display updated values.

The application should avoid requiring a full application restart.

# 26. Data Loading

Dashboard data should be loaded through the backend.

Preferred architecture:

React Dashboard
       ↓
Tauri Command
       ↓
Dashboard Service
       ↓
Repositories
       ↓
SQLite

# 27. Backend Responsibility

The backend is responsible for calculating dashboard data.

The frontend should NOT independently calculate:

Revenue
Expenses
Net Income
Member Counts
Expired Counts

The frontend should display values returned by the backend.

# 28. Dashboard Service

A dedicated dashboard service may aggregate data from multiple repositories.

Conceptually:

DashboardService
       │
       ├── MemberRepository
       ├── PaymentRepository
       └── ExpenseRepository

The service returns a dashboard-specific DTO.

# 29. Dashboard DTO

Example conceptual structure:

```rust
DashboardSummary {
    total_members,
    active_members,
    expiring_soon,
    expired_members,

    today_revenue,
    monthly_revenue,
    monthly_expenses,
    monthly_net_income,

    recent_payments,
    recent_members,
    expiring_members,
}
```

The exact Rust/TypeScript naming must follow project coding standards.

# 30. Database Access

The dashboard should NOT have its own duplicate dashboard database tables.

Dashboard information should be derived from existing data:

members
membership_plans
payments
expenses

Do not create:

dashboard_stats
dashboard_revenue
dashboard_members

unless a future proven performance requirement justifies it.

# 31. Membership Status Calculation

Membership status should be determined consistently.

Conceptually:

```text
If archived:
    Archived

Else if end_date < today:
    Expired

Else if end_date <= today + warning_period:
    Expiring Soon

Else:
    Active
```

The exact implementation belongs in the backend/business-logic layer.

# 32. Currency

Financial values should use the application's configured currency.

Initial default:

PKR / Rs.

Do not hard-code currency formatting throughout React components.

Use a shared formatting utility.

# 33. Money Formatting

Examples:

Rs. 2,000
Rs. 25,500
Rs. 1,250,000

All financial values must use consistent formatting.

# 34. Loading State

While dashboard data is loading:

KPI Skeletons
Table Skeletons
Loading Indicators

Do not show misleading zero values while data is still loading.

Bad:

Revenue
Rs. 0

while the actual value has not yet loaded.

# 35. Empty State

If there are no members:

No members yet

Add your first member to start managing the gym.

[ Add Member ]

If there are no payments:

No payments yet

Payments received from members will appear here.

If there are no expenses:

No expenses recorded

Add an expense to start tracking gym spending.

# 36. Error State

If dashboard data cannot load:

Unable to load dashboard

Something went wrong while loading your gym data.

[ Try Again ]

Do not expose:

SQLITE_ERROR
database query failed
Rust panic

to the user.

# 37. Partial Failure

If possible, dashboard sections should fail gracefully.

For example:

Members:
Loaded

Payments:
Loaded

Expenses:
Failed

The entire dashboard should not necessarily become unusable because one non-critical section failed.

The exact behavior should follow the application's global error-handling strategy.

# 38. Responsive Desktop Behavior

The application is a desktop application.

The dashboard should work well at common Windows window sizes.

Minimum target should be defined by the UI specification.

The layout must avoid:

Horizontal overflow
Overlapping cards
Cut-off tables
Unreadable text

# 39. Visual Design

The Dashboard must look like a professional business application.

Use:

Clear typography
Strong hierarchy
Consistent spacing
Subtle borders
Professional KPI cards
Readable numbers
Clean tables
Consistent icons
Controlled use of color

Avoid:

Excessive gradients
Huge decorative graphics
Random colors
Excessive rounded containers
Unnecessary animations

# 40. KPI Card Design

Each KPI card should contain:

Icon / Label
Primary Value
Optional supporting context

Example:

```text
┌─────────────────────────┐
│ Total Members       👥  │
│                         │
│ 248                     │
│ +12 this month          │
└─────────────────────────┘
```

Supporting comparisons should only be displayed if the calculation is meaningful.

Do not invent fake percentage changes.

# 41. Financial KPI Design

Financial cards should emphasize the amount.

Example:

```text
┌─────────────────────────┐
│ Today's Revenue         │
│                         │
│ Rs. 8,500               │
│ 6 payments              │
└─────────────────────────┘
```

# 42. Color Usage

Color should communicate meaning.

Suggested semantic usage:

Green:
Positive financial information / active

Amber:
Expiring soon / attention needed

Red:
Expired / critical errors

Neutral:
General information

Do not rely on color alone.

Use:

Text
Icon
Badge

where appropriate.

# 43. Navigation

Dashboard navigation should remain consistent with the global application shell.

Sidebar:

Dashboard
Members
Finances
Reports
Settings

Dashboard should have an obvious active state.

# 44. Performance

Dashboard should feel fast.

Avoid:

Loading every member
Loading every payment
Loading every expense
Filtering everything in React

Instead, request only the information required by the dashboard.

# 45. Query Strategy

The backend should use efficient aggregate queries for KPI values.

Examples conceptually:

COUNT(...)
SUM(...)
WHERE payment_date BETWEEN ...

Do not retrieve thousands of payment rows just to calculate:

Monthly Revenue

# 46. Caching

Do not introduce complex caching initially.

The expected gym dataset is small.

Prefer:

SQLite query
→
Service
→
DTO
→
UI

If performance becomes a real problem, caching can be introduced later.

# 47. Automated Tests

Dashboard development MUST include automated tests.

# 48. Backend Unit Tests

Test:

Total member calculation
Active member calculation
Expiring member calculation
Expired member calculation
Today's revenue
Monthly revenue
Monthly expenses
Net income

# 49. Dashboard Business Logic Tests

Example:

Given:

Revenue = Rs. 100,000
Expenses = Rs. 40,000

Expected:

Net Income = Rs. 60,000

# 50. Membership Status Tests

Test:

Member expires tomorrow
→ Expiring Soon

Member expires in 30 days
→ Active

Member expired yesterday
→ Expired

Archived member
→ Archived

Also test the exact boundary conditions around the warning period.

# 51. Date Tests

Test:

Today's payments
Current month payments
Previous month payments
Month boundary
Year boundary

Particular attention must be paid to:

First day of month
Last day of month
New year

# 52. Frontend Tests

Test:

Dashboard renders
KPI values appear
Loading state appears
Empty state appears
Error state appears
Retry works
Quick actions work
Navigation works

# 53. Integration Tests

At least one integration workflow should verify:

```text
Create Member
    ↓
Receive Payment
    ↓
Dashboard Revenue Updates
```

Another:

```text
Add Expense
    ↓
Dashboard Expenses Updates
    ↓
Dashboard Net Income Updates
```

# 54. Regression Tests

Whenever a dashboard bug is fixed:

1. Reproduce bug
2. Add regression test
3. Fix bug
4. Verify regression test
5. Run dashboard test suite

# 55. Accessibility

The dashboard should support:

Keyboard navigation
Visible focus states
Readable contrast
Meaningful button labels
Accessible table headers

Icons should not be the only indication of an action.

# 56. Security

The Dashboard must never expose:

Raw SQL
Database paths
Internal errors
Rust stack traces

Only safe application-level data should reach the UI.

# 57. Logging

Unexpected dashboard failures should be logged internally.

User-facing error:

Unable to load dashboard.

Internal log may contain:

DashboardSummary query failed

Do not log sensitive member information unnecessarily.

# 58. Implementation Order

Implement the Dashboard in this order:

1. Dashboard DTO
2. Dashboard backend service
3. Required repository queries
4. Tauri command
5. Frontend API/IPC wrapper
6. KPI components
7. Recent payments
8. Recent members
9. Expiring members
10. Loading states
11. Empty states
12. Error states
13. Automated tests
14. UI polish

# 59. Files / Layers Expected

The exact project structure is defined by the architecture document.

Conceptually, implementation should involve:

Frontend
├── dashboard page
├── KPI components
├── recent payments component
├── recent members component
└── dashboard hooks/state

Backend
├── dashboard DTO
├── dashboard service
├── member repository queries
├── payment repository queries
├── expense repository queries
└── dashboard Tauri command

Tests
├── dashboard service tests
├── repository tests
├── IPC/integration tests
└── frontend dashboard tests

Do not blindly copy this structure if the project's architecture specifies a different organization.

# 60. Dependencies

Dashboard depends on:

Members
Payments
Expenses
Membership Plans
Settings

Therefore, the final dashboard should be implemented after the underlying modules are functional.

During early development, temporary mock data may be used for UI work only.

Mock data must NOT remain in production code.

# 61. No Fake Data

Production dashboard must never display hardcoded values such as:

248 members
Rs. 8,500 revenue
Rs. 62,000 expenses

unless those values actually exist in the database.

# 62. No Duplicate Business Logic

Do not implement one calculation in the Dashboard and another calculation in Reports.

For example, avoid:

Dashboard:
calculate revenue one way

Reports:
calculate revenue another way

Create shared backend business logic where appropriate.

# 63. Definition of Done

The Dashboard module is complete only when:

[ ] Dashboard page exists
[ ] KPI cards work
[ ] Member statistics are accurate
[ ] Revenue statistics are accurate
[ ] Expense statistics are accurate
[ ] Net income is accurate
[ ] Recent payments work
[ ] Recent members work
[ ] Expiring members work
[ ] Quick actions work
[ ] Loading states work
[ ] Empty states work
[ ] Error states work
[ ] Retry works
[ ] Backend tests pass
[ ] Repository tests pass
[ ] Frontend tests pass
[ ] Integration tests pass
[ ] No mock data remains
[ ] UI follows design system
[ ] Existing tests still pass

# 64. AI Coding Rules

When an AI agent implements this module:

MUST
[ ] Read architecture documentation
[ ] Read database specification
[ ] Read UI specification
[ ] Inspect existing repository patterns
[ ] Reuse existing UI components
[ ] Keep SQL in repositories
[ ] Keep business logic in services
[ ] Add tests with implementation
[ ] Handle loading/empty/error states
[ ] Run tests before declaring completion
MUST NOT
[ ] Put SQL inside React
[ ] Put business calculations inside React
[ ] Create duplicate dashboard tables
[ ] Hardcode KPI values
[ ] Invent unrelated dashboard features
[ ] Add unnecessary dependencies
[ ] Rewrite unrelated modules
[ ] Skip tests
[ ] Ignore existing architecture

# 65. Final Principle

The Dashboard should answer:

"How is my gym doing right now?"

within a few seconds of opening the application.

It should be:

Fast
Clear
Accurate
Professional
Simple
Action-oriented

It should NOT attempt to become a complicated business intelligence platform.
