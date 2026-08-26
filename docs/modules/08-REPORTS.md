# Reports Module

**Module:** Reports
**Priority:** P0 — Critical
**Status:** Planned
**Route:** `/reports`

---

# 1. Purpose

The Reports module provides simple, customizable reports for the gym owner.

The goal is to answer questions such as:

- How much did we collect this week?
- How much did we collect this month?
- How much did we spend?
- How many new members joined?
- How many memberships expired?
- Which members have unpaid/expired memberships?
- What was the net financial result?

Reports must remain simple and useful.

This is NOT intended to be a full accounting/reporting system.

---

# 2. Core Principle

Reports are a presentation and analysis layer.

They must use authoritative data from existing modules.

```text
Members
    ↓
Payments
    ↓
Expenses
    ↓
Finances
    ↓
Reports
```

Reports must NOT maintain their own financial calculations or duplicate business logic.

# 3. Scope

The Reports module includes:

Weekly reports
Monthly reports
Custom date-range reports
Financial reports
Membership reports
Member reports
Expense reports
Payment reports
Custom report templates
Report preview
Print report
Optional PDF export

# 4. Keep Reports Simple

The initial application should NOT include:

Complex accounting
Tax accounting
Double-entry bookkeeping
Payroll
Advanced forecasting
AI financial predictions
Complex chart builders
Business intelligence dashboards

The gym needs useful operational reports, not an enterprise accounting suite.

# 5. Main Reports Screen

Recommended layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Reports                                                      │
│ Generate simple reports for your gym                         │
│                                                              │
│ Quick Reports                                                │
│                                                              │
│ [ Weekly Summary ] [ Monthly Summary ] [ Financial ]         │
│ [ Membership ]    [ Payments ]       [ Expenses ]            │
│                                                              │
│ ──────────────────────────────────────────────────────────── │
│                                                              │
│ Date Range                                                   │
│ [ This Month ▼ ]                                             │
│                                                              │
│ [ Generate Report ]                                          │
└──────────────────────────────────────────────────────────────┘
```

# 6. Quick Report Buttons

Provide simple preset buttons:

Weekly Summary
Monthly Summary
Financial Summary
Membership Summary
Payment Report
Expense Report

Optional:

Yearly Summary

Do not add excessive preset buttons.

# 7. Date Presets

Support:

Today
This Week
Last Week
This Month
Last Month
This Year
Custom Range

The exact available presets should be consistent with the Finances module.

# 8. Custom Date Range

Example:

From:
[ 01 Aug 2026 ]

To:
[ 31 Aug 2026 ]

[ Generate Report ]

Validation:

From <= To

Invalid:

Start date cannot be after end date.

# 9. Report Types

Initial report types:

1. Weekly Summary
2. Monthly Summary
3. Financial Summary
4. Membership Summary
5. Payment Report
6. Expense Report

# 10. Weekly Summary

The weekly summary should provide a quick overview of gym activity.

Example:

WEEKLY SUMMARY
01 Aug 2026 → 07 Aug 2026

Members
New Members:       8
Active Members:  142
Expired:            5

Finances
Income:        Rs. 35,000
Expenses:       Rs. 8,500
Net:            Rs. 26,500

Payments
Payments:           18

Expenses
Expenses:            4

# 11. Monthly Summary

Example:

MONTHLY SUMMARY
August 2026

Members
New Members:       32
Active Members:   185
Expired:           18

Finances
Income:        Rs. 250,000
Expenses:       Rs. 85,000
Net:            Rs. 165,000

Payments
Transactions:       96

Expenses
Transactions:       24

# 12. Financial Summary

Financial reports should contain:

Total Income
Total Expenses
Net Balance
Payment Count
Expense Count

Optional:

Income by Payment Method
Expenses by Category

# 13. Financial Calculation Rule

Reports MUST use the same financial calculation as Finances.

Net Balance
=
Valid Income
-
Valid Expenses

There must be one authoritative rule.

# 14. No Duplicate Financial Logic

Do NOT implement:

Reports → SUM(payments)
Reports → SUM(expenses)

using a completely separate business logic implementation if Finances already provides the authoritative financial query/service.

Instead, reuse the shared domain/service/query logic.

# 15. Report Data Sources

Conceptually:

Report Service
      │
      ├── Member Queries
      │
      ├── Payment Queries
      │
      ├── Expense Queries
      │
      └── Finance Queries

# 16. Membership Summary

Membership report may include:

Total Members
Active Members
Expired Members
New Members
Members Expiring Soon

Optional:

New members by plan
Members by membership plan

# 17. New Members

Definition:

Members created within selected date range

Example:

01 Aug → 31 Aug

New Members:
32

Do not count existing members simply because they were active during the period.

# 18. Active Members

The definition of "active member" must come from the membership business rules.

Reports must not invent a new definition.

Example:

Active
=
Membership currently valid

The exact rule belongs to:

MEMBERS.md
MEMBERSHIP-PLANS.md

# 19. Expired Members

A member should be considered expired according to the centralized membership validity rules.

Do not implement report-specific expiration logic.

# 20. Members Expiring Soon

Optional metric.

Example:

Members Expiring Within 7 Days:
12

The number of days should come from a shared configuration/business rule if configurable.

# 21. Payment Report

Payment report should list payments for the selected period.

Example:

PAYMENT REPORT

Date       Member          Method       Amount
------------------------------------------------
26 Aug     Ahmad Khan      Cash         2,000
25 Aug     Bilal Khan      Transfer     3,000
24 Aug     Hamza Khan      Cash         2,500

# 22. Payment Report Columns

Recommended:

Date
Receipt Number
Member
Payment Method
Description
Amount
Status

Optional:

Membership Plan
Reference

# 23. Expense Report

Example:

EXPENSE REPORT

Date       Category       Description       Amount
---------------------------------------------------
26 Aug     Electricity    Monthly bill      15,000
24 Aug     Maintenance    Equipment repair    5,000
20 Aug     Supplies       Cleaning supplies   2,500

# 24. Expense Report Columns

Recommended:

Date
Category
Description
Vendor
Payment Method
Amount
Status

Optional:

Reference

# 25. Voided Transactions

By default, reports should exclude voided transactions.

Example:

Payment:
Rs. 5,000
Status:
VOIDED

This must NOT contribute to:

Income
Net Balance
Payment totals

unless the user explicitly requests a report including voided transactions.

# 26. Including Voided Transactions

Optional advanced filter:

Transaction Status

[ Active ▼ ]

Active
Voided
All

If supported, clearly label voided records.

Do not silently include them.

# 27. Report Templates

Reports should support reusable templates.

A template defines:

Report name
Report type
Date range behavior
Sections
Visible fields
Sorting
Grouping

# 28. Example Template
Monthly Gym Report

Sections:
✓ Membership Summary
✓ Income
✓ Expenses
✓ Net Balance
✓ Payment Breakdown
✓ Expense Breakdown

# 29. Simple Template Builder

The UI should be simple.

Example:

```text
┌────────────────────────────────────────────────────┐
│ Create Report Template                             │
│                                                    │
│ Name                                               │
│ [ Monthly Gym Report ]                             │
│                                                    │
│ Sections                                           │
│ ☑ Membership Summary                               │
│ ☑ Income                                           │
│ ☑ Expenses                                         │
│ ☑ Net Balance                                      │
│ ☐ Payment Breakdown                                │
│ ☐ Expense Breakdown                                │
│                                                    │
│ Sort By                                            │
│ [ Date ▼ ]                                         │
│                                                    │
│ [ Save Template ]                                  │
└────────────────────────────────────────────────────┘
```

# 30. Avoid Over-Engineering Templates

Do NOT initially create a drag-and-drop page builder.

Avoid:

Complex visual editor
Free-form positioning
Custom JavaScript
Custom HTML
Arbitrary SQL

A structured template system is safer and easier to maintain.

# 31. Template Sections

Initial supported sections:

Membership Summary
Financial Summary
Payment Summary
Expense Summary
Payment Method Breakdown
Expense Category Breakdown
Payment Table
Expense Table

# 32. Section Visibility

Each section can be enabled/disabled.

Example:

☑ Financial Summary
☑ Payment Summary
☐ Expense Summary

Only selected sections appear in the generated report.

# 33. Section Order

Optional simple ordering:

1. Financial Summary
2. Membership Summary
3. Payment Summary
4. Expense Summary

If drag-and-drop is unnecessary, provide:

↑ Move Up
↓ Move Down

# 34. Report Template Persistence

Templates must be stored in SQLite.

Example conceptual model:

ReportTemplate
    id
    name
    report_type
    configuration
    created_at
    updated_at

The exact schema belongs in:

DATABASE-SPECIFICATION.md

# 35. Template Configuration

Configuration may contain structured data such as:

```json
{
    "sections": [
        "financial_summary",
        "membership_summary",
        "payment_table"
    ],
    "sort_by": "date"
}
```

The exact serialization format should follow the project's database conventions.

# 36. Built-in Templates

Provide built-in templates:

Weekly Summary
Monthly Summary
Financial Summary
Membership Summary
Payment Report
Expense Report

These should be available immediately.

# 37. User Templates

Users may create custom templates.

Example:

My Monthly Report

The user should be able to:

View
Edit
Duplicate
Delete
Generate

# 38. Built-in Template Protection

Built-in templates should not be accidentally deleted.

Options:

Edit copy
Duplicate
Reset to default

# 39. Report Preview

Before printing:

[ Generate ]
      ↓
[ Preview ]
      ↓
[ Print ]

The preview should show the final report layout.

# 40. Report Printing

Reports should support printing.

Example:

[ Print Report ]

Printing should use the same report rendering pipeline as preview.

# 41. PDF Export

Optional.

If implemented:

[ Export PDF ]

The exported report must match the preview.

Do not build PDF generation as a completely separate reporting engine.

# 42. Report Header

Report header should contain:

Gym Name
Report Title
Date Range
Generated Date

Optional:

Gym Logo
Phone
Address

These should come from Settings.

# 43. Report Footer

Optional:

Generated by Gym Management System

or configurable footer.

Avoid unnecessary application branding if the gym owner wants a clean business document.

# 44. Report Date Range

Every generated report should clearly show its data period.

Example:

Period:
01 Aug 2026 → 31 Aug 2026

Never generate a report without making its date range obvious.

# 45. Report Generated Date

Show:

Generated:
26 Aug 2026, 10:45 AM

This is metadata about when the report was produced.

It must NOT affect the report's data range.

# 46. Sorting

Reports may support basic sorting.

Examples:

Date
Amount
Member Name
Category

Avoid complex multi-level sorting unless necessary.

# 47. Grouping

Useful grouping options:

Payment Method
Expense Category
Membership Plan
Date

Example:

Expenses by Category

Electricity
    Rs. 25,000

Maintenance
    Rs. 12,000

Supplies
    Rs. 8,000

# 48. Charts

Charts are optional.

If used, keep them simple:

Income vs Expenses
Payments by Method
Expenses by Category

Do not make charts mandatory for every report.

A professional table is often more useful for printing.

# 49. Financial Report Numbers

All financial values must use the global money formatting system.

Example:

Rs. 250,000

Do not use:

250000
250K
PKR 250000

unless configured by the global formatting rules.

# 50. Currency

Currency comes from application settings.

Initial expected currency:

PKR / Rs.

Do not hard-code currency inside report templates.

# 51. Date Formatting

Reports must use the application's centralized date formatting.

Do not implement report-specific date formatting.

# 52. Report Filters

Reports may support:

Date range
Member
Membership plan
Payment method
Expense category
Transaction status

Only show filters relevant to the selected report type.

# 53. Dynamic Filters

Example:

Payment Report

Date:
[ This Month ]

Payment Method:
[ All ]

Member:
[ All ]

Expense report:

Expense Report

Date:
[ This Month ]

Category:
[ All ]

Payment Method:
[ All ]

# 54. Filter Consistency

Report filters must use the same definitions as the underlying modules.

For example:

Payment Method = Cash

must mean the same thing in:

Payments
Finances
Reports

# 55. Empty Report

If no data matches:

No data found for the selected period.

Try changing the date range or filters.

Do not generate a misleading blank report.

# 56. Empty Section

If one section has no data:

Expenses

No expenses recorded during this period.

Do not hide the section silently if the user selected it.

# 57. Loading State

When generating:

Generating report...

Disable duplicate generation requests.

# 58. Error State

Example:

Unable to generate report.

Please try again.

[ Retry ]

Do not expose raw database errors.

# 59. Report Generation Flow
User selects report
        ↓
Selects date range
        ↓
Selects filters
        ↓
Generate
        ↓
Backend validates request
        ↓
Backend gathers authoritative data
        ↓
Report DTO generated
        ↓
Frontend preview
        ↓
Print / Export

# 60. Backend Architecture

Recommended:

Tauri Command
      ↓
Report Service
      ↓
Report Query Layer
      ↓
Domain Services / Repositories
      ↓
SQLite

# 61. Report Service

The Report Service is responsible for:

Validate report request
Resolve date range
Resolve filters
Load authoritative data
Build report DTO
Apply template configuration

It should NOT directly manipulate UI.

# 62. Report DTO

Conceptually:

```json
ReportData {
    title
    period_start
    period_end

    financial_summary
    membership_summary
    payment_summary
    expense_summary

    payment_rows[]
    expense_rows[]
}
```

Only populate sections required by the template.

# 63. Report Template DTO

Conceptually:

```json
ReportTemplate {
    id
    name
    type
    sections[]
    sort_by
    configuration
}
```

# 64. Report Request

Conceptually:

```json
ReportRequest {
    template_id
    date_range
    filters
}
```

# 65. Report Generation Must Be Deterministic

Given the same:

Data
+
Date range
+
Filters
+
Template

the report should produce the same business data.

The generated timestamp is the only expected dynamic metadata.

# 66. No Frontend Financial Calculations

Avoid:

payments.reduce(...)
expenses.reduce(...)

for authoritative report totals.

The backend/domain query layer should provide the correct values.

# 67. Report Consistency

The same monthly financial data should match:

Dashboard
Finances
Reports

Example:

Dashboard Monthly Income
        =
Finances Monthly Income
        =
Monthly Report Income

# 68. Membership Consistency

The same active member definition must be used by:

Dashboard
Members
Reports

# 69. Payment Consistency

The same payment status rules must be used by:

Payments
Finances
Reports

# 70. Expense Consistency

The same expense status/category rules must be used by:

Expenses
Finances
Reports

# 71. Report Tests — Weekly

Create known data for a week.

Expected:

Income
Expenses
Net
New Members
Payments
Expenses Count

must match the underlying module data.

# 72. Report Tests — Monthly

Create:

July data
August data

Generate August report.

Expected:

Only August data

# 73. Report Tests — Custom Range

Create transactions:

01 Aug
10 Aug
20 Aug
30 Aug

Generate:

05 Aug → 25 Aug

Expected:

10 Aug
20 Aug

Only.

# 74. Report Tests — Voided Payment

Create:

Payment:
Rs. 5,000
Status:
VOIDED

Generate financial report.

Expected:

Payment excluded
Income unchanged

# 75. Report Tests — Voided Expense

Create:

Expense:
Rs. 5,000
Status:
VOIDED

Generate financial report.

Expected:

Expense excluded
Net unchanged

# 76. Report Tests — Template

Create template:

Financial Summary
Payment Table

Generate report.

Expected:

Financial Summary visible
Payment Table visible
Other sections absent

# 77. Report Tests — Template Persistence

Create custom template.

Close/reopen application.

Expected:

Template still exists.

# 78. Report Tests — Template Deletion

Create custom template.

Delete it.

Expected:

Template removed.

Built-in templates must remain available.

# 79. Report Tests — Template Duplication

Duplicate:

Monthly Report

Expected:

New independent template

Changing the copy must not modify the original.

# 80. Report Tests — Filters

Test:

Date
Member
Payment method
Category
Status

Each filter must correctly restrict report data.

# 81. Report Tests — Combined Filters

Test:

Date range
+
Payment method
+
Member

Expected:

Only records matching all active filters.

# 82. Report Tests — Financial Consistency

For the same period:

Finances Income
=
Report Income
Finances Expenses
=
Report Expenses
Finances Net
=
Report Net

# 83. Report Tests — Dashboard Consistency

For the same period:

Dashboard
=
Finances
=
Reports

for all shared KPIs.

# 84. Frontend Tests

Test:

[ ] Reports page renders
[ ] Quick report buttons render
[ ] Date range selector works
[ ] Custom date range works
[ ] Generate button works
[ ] Report preview works
[ ] Print button works
[ ] Export button works if implemented
[ ] Template list works
[ ] Create template works
[ ] Edit template works
[ ] Duplicate template works
[ ] Delete template works
[ ] Built-in templates cannot be accidentally deleted
[ ] Filters work
[ ] Empty state works
[ ] Loading state works
[ ] Error state works
[ ] Retry works

# 85. Integration Tests

Test:

Create Payment
      ↓
Generate Monthly Report
      ↓
Payment appears

Test:

Create Expense
      ↓
Generate Monthly Report
      ↓
Expense appears

Test:

Create Member
      ↓
Generate Membership Report
      ↓
Member appears in correct metrics

# 86. Printing Tests

Test:

Generate Report
      ↓
Preview
      ↓
Print

Verify:

[ ] Header correct
[ ] Date range correct
[ ] Financial values correct
[ ] Tables render correctly
[ ] Page breaks work
[ ] No clipped content
[ ] Footer works
[ ] Print errors handled

# 87. Report Layout

Reports should be optimized for printing.

Recommended:

Clear title
Date range
KPI summary
Tables
Breakdowns
Footer

Avoid excessive UI decoration.

# 88. Report Table Design

Tables should resemble professional business spreadsheets.

Example:

Date       Member       Method      Amount
--------------------------------------------
26 Aug     Ahmad        Cash         2,000
25 Aug     Bilal        Cash         3,000
24 Aug     Hamza        Transfer     5,000

Use:

Right-aligned amounts
Consistent decimal formatting
Clear column headers
Readable row spacing

# 89. Page Breaks

Reports must avoid splitting important sections awkwardly.

For example:

Financial Summary

should not have its heading at the bottom of one page while all content begins on the next page.

# 90. Long Reports

Long reports should support multiple pages.

Do not truncate data simply to keep the report short.

# 91. Report Performance

The backend should perform filtering and aggregation.

Avoid loading the entire database into the frontend.

For large tables:

Database filtering
Database aggregation
Pagination where appropriate

# 92. Report Security

Reports must only expose data the current application user is allowed to access.

For the initial single-user offline application, this may be simple.

However, business logic should not depend on the frontend hiding information.

# 93. Offline Requirement

Reports must work completely offline.

No internet connection should be required for:

Generating reports
Previewing reports
Printing reports
Saving templates

# 94. No External Reporting Service

Do not depend on:

Cloud reporting API
Online analytics
External database
Online PDF service

The application is local-first.

# 95. Implementation Order

Implement in this order:

Define report types
Define report request DTO
Define report data DTO
Define template model
Implement date range handling
Implement financial report
Add financial report tests
Implement membership report
Add membership tests
Implement payment report
Add payment tests
Implement expense report
Add expense tests
Implement weekly summary
Implement monthly summary
Implement template persistence
Implement template builder
Implement report preview
Implement printing
Implement optional PDF export
Add frontend tests
Add integration tests
Verify Dashboard/Finances consistency
Test large datasets
Polish report layouts

# 96. Definition of Done

The Reports module is complete when:

[ ] Weekly report works
[ ] Monthly report works
[ ] Custom date range works
[ ] Financial report works
[ ] Membership report works
[ ] Payment report works
[ ] Expense report works
[ ] Filters work
[ ] Combined filters work
[ ] Templates can be created
[ ] Templates can be edited
[ ] Templates can be duplicated
[ ] Templates can be deleted
[ ] Built-in templates are protected
[ ] Template configuration persists
[ ] Preview works
[ ] Printing works
[ ] PDF export works if implemented
[ ] Voided transactions follow global rules
[ ] Financial totals match Finances
[ ] Financial totals match Dashboard
[ ] Membership metrics match Members
[ ] Loading states work
[ ] Empty states work
[ ] Error states work
[ ] Backend tests pass
[ ] Frontend tests pass
[ ] Integration tests pass
[ ] Printing tests pass
[ ] Large reports work
[ ] No frontend-only financial calculations exist
[ ] No duplicate business rules exist
[ ] No mock data remains
[ ] Existing tests still pass

# 97. AI Coding Rules

Before modifying Reports, the AI agent MUST read:

[ ] ARCHITECTURE.md
[ ] DATABASE-SPECIFICATION.md
[ ] UI-UX-SYSTEM.md
[ ] DASHBOARD.md
[ ] MEMBERS.md
[ ] MEMBERSHIP-PLANS.md
[ ] PAYMENTS.md
[ ] EXPENSES.md
[ ] FINANCES.md
[ ] RECEIPTS.md
[ ] SETTINGS.md

The AI agent MUST:

[ ] Reuse authoritative financial calculations
[ ] Reuse membership status rules
[ ] Reuse payment status rules
[ ] Reuse expense status rules
[ ] Reuse global money formatting
[ ] Reuse global date formatting
[ ] Reuse Settings for gym information
[ ] Add automated tests for every new report behavior
[ ] Verify report/Finances consistency
[ ] Verify report/Dashboard consistency
[ ] Verify report/module consistency
[ ] Run the full test suite

The AI agent MUST NOT:

[ ] Invent new financial formulas
[ ] Calculate authoritative financial totals only in React
[ ] Duplicate payment rules
[ ] Duplicate expense rules
[ ] Duplicate membership rules
[ ] Create a second source of financial truth
[ ] Hard-code gym information
[ ] Hard-code currency
[ ] Hard-code report data
[ ] Use mock data in production
[ ] Add arbitrary SQL from the frontend
[ ] Build an unnecessary visual report builder
[ ] Skip automated tests

# 98. Final Principle

Reports are a window into the application's existing data.

They do not own the data.

The architecture should remain:

```text
                 ┌── Members
                 │
                 ├── Payments
                 │
Database ────────┼── Expenses
                 │
                 └── Memberships
                         │
                         ▼
                  Domain / Services
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
           Finances              Reports
              │                     │
              │              ┌──────┴──────┐
              │              ▼             ▼
              │           Preview        Print
              │
              ▼
           Dashboard
```

The most important rule is:

SAME DATA
+
SAME BUSINESS RULES
+
SAME DATE FILTER
=
SAME RESULT

For example:

Finances:
August Income = Rs. 250,000

Reports:
August Income = Rs. 250,000

Dashboard:
August Income = Rs. 250,000

If these values differ, the implementation is considered incorrect.
