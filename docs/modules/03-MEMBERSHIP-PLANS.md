# Membership Plans Module

**Module:** Membership Plans  
**Priority:** P0 — Critical  
**Status:** Planned  
**Route:** `/settings/membership-plans`

---

# 1. Purpose

The Membership Plans module manages the gym's available membership plans.

Examples:

- Monthly
- Quarterly
- Half-Yearly
- Yearly

A membership plan defines the default pricing and duration used when creating or renewing a member's membership.

The module should remain simple.

It is NOT intended to become a complicated subscription-management system.

---

# 2. Primary Goals

The module should allow staff/admin to:

1. Create membership plans.
2. View membership plans.
3. Edit membership plans.
4. Activate/deactivate plans.
5. Define plan duration.
6. Define plan price.
7. Add optional descriptions.
8. Prevent accidental deletion of plans already used by members.

---

# 3. Main Screen

Recommended layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Membership Plans                            + Add Plan      │
│ Manage available gym membership plans                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Search plans...                         Status ▼            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Plan │ Duration │ Price │ Members │ Status │ Actions       │
│                                                             │
│ Monthly     │ 1 Month │ Rs. 2,000 │ 84 │ Active │ ...      │
│ Quarterly   │ 3 Months│ Rs. 5,000 │ 42 │ Active │ ...      │
│ Yearly      │ 12 Months│Rs.18,000 │ 21 │ Active │ ...      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

# 4. Plan Fields

Required:

Name
Duration
Price

Optional:

Description

System-managed:

ID
Created At
Updated At
Active/Inactive

# 5. Plan Name

Examples:

Monthly
Quarterly
Half-Yearly
Yearly

Rules:

Required
Cannot be empty
Must be unique among active plans

Whitespace-only names must be rejected.

# 6. Plan Duration

The plan should define its duration.

Recommended representation:

Duration Value
Duration Unit

Examples:

1 Month
3 Months
6 Months
12 Months

Possible units:

Days
Months

For the initial application, months should be sufficient unless the gym specifically needs custom day-based plans.

Do not introduce unnecessary complexity.

# 7. Duration Storage

The database should store duration in a structured form.

Example:

duration_value = 1
duration_unit = "month"

or an equivalent representation defined in the database specification.

Do not store only:

"Monthly"

because the backend needs the actual duration when calculating membership dates.

# 8. Price

The plan price represents the default amount for that membership plan.

Example:

Monthly
Rs. 2,000

Price must:

Be required
Be >= 0
Use the application's money representation

Avoid floating-point values for financial storage.

Use the project's defined money strategy.

# 9. Free Plans

A price of:

Rs. 0

may technically be allowed.

However, the UI should clearly display:

Free

if the business rules permit free memberships.

Do not silently treat zero as missing.

# 10. Description

Optional description example:

Access to gym facilities for one month.

Description is informational.

It should not contain business-critical values that the system needs to calculate membership periods.

# 11. Add Plan

Primary action:

+ Add Plan

opens the plan form.

Recommended form:

```text
┌─────────────────────────────────────┐
│ Add Membership Plan                 │
│                                     │
│ Plan Name *                         │
│ [ Monthly                       ]   │
│                                     │
│ Duration *                          │
│ [ 1 ] [ Month ▼ ]                  │
│                                     │
│ Price *                             │
│ [ Rs. 2,000                     ]   │
│                                     │
│ Description                         │
│ [                                 ] │
│ [                                 ] │
│                                     │
│              [ Cancel ] [ Save ]    │
└─────────────────────────────────────┘
```

# 12. Form Validation

Before submission:

Name must not be empty.
Duration must be valid.
Price must be valid.

Examples:

Duration = 0
→ Invalid

Duration = -1
→ Invalid

Price = -500
→ Invalid

# 13. Backend Validation

Frontend validation is for UX.

Backend validation is authoritative.

The service must validate:

Plan name
Duration
Price
Active/inactive rules
Uniqueness rules

Never trust frontend validation alone.

# 14. Duplicate Plan Names

Active plan names should not be duplicated.

Example:

Monthly
Monthly

should not be allowed.

Error:

A membership plan with this name already exists.

# 15. Case Sensitivity

The system should prevent obvious duplicates such as:

Monthly
monthly
MONTHLY

if the application's uniqueness strategy treats them as the same.

The exact database collation/constraint strategy must be defined centrally.

# 16. Editing a Plan

Users can edit:

Name
Duration
Price
Description

if business rules permit.

Example:

Monthly
Rs. 2,000

→

Monthly
Rs. 2,500

# 17. Historical Pricing

This is a critical financial rule.

Changing the current plan price must NOT silently change the amount of historical payments.

Example:

Plan:
Monthly

Old Price:
Rs. 2,000

Payment made:
Rs. 2,000

Plan price later changed:
Rs. 2,500

The historical payment remains:

Rs. 2,000

# 18. Historical Membership Data

Similarly, changing a plan's duration or price must not rewrite existing historical membership records.

Existing memberships must preserve their actual dates and financial history.

# 19. Price Changes

When changing a plan price:

Current Plan Price

changes for future use.

It must NOT:

Update old payments
Update old receipts
Rewrite historical reports
Change previous membership dates

# 20. Active Plans

Only active plans should normally appear in:

Add Member
Receive Payment
Renew Membership

unless the workflow specifically needs historical/inactive plans.

# 21. Deactivating a Plan

Instead of deleting a plan, use:

Deactivate

Example:

Monthly
Active

→ Deactivate

Monthly
Inactive

# 22. Why Deactivation Is Preferred

A plan may already be referenced by:

Members
Payments
Membership history
Reports

Deleting it could break historical relationships.

Therefore:

Deactivate

is preferred over:

Delete

# 23. Deactivation Confirmation

Example:

Deactivate Plan?

"Monthly" will no longer be available when creating
new memberships.

Existing members using this plan will not be affected.

[ Cancel ] [ Deactivate ]

# 24. Existing Members

If a plan is deactivated:

Existing member:
Monthly

should continue to display correctly.

The member's historical/current membership must not disappear.

# 25. Reactivation

An inactive plan can optionally be reactivated.

Example:

Monthly
Inactive

[ Reactivate ]

Reactivation makes it available for future memberships again.

# 26. Permanent Deletion

Permanent deletion should normally NOT be available for plans that are referenced by members or financial records.

If the database confirms that a plan has never been used, permanent deletion may be allowed if the global data-retention policy permits it.

Otherwise:

Deactivate

must be used.

# 27. Plan List

Recommended columns:

Name
Duration
Price
Members
Status
Actions

# 28. Members Count

The list may display how many current members use each plan.

Example:

Monthly
84 members

This value is informational.

It must not be used as a substitute for the Members module's authoritative member queries.

# 29. Search

The plan list should support searching by:

Plan Name
Description

Example:

Search:
monthly

returns:

Monthly

# 30. Filters

Recommended filters:

All
Active
Inactive

The default should be:

Active

because active plans are what staff normally need.

# 31. Sorting

Recommended sorting:

Name
Price
Duration
Created Date
Member Count

Default ordering can be:

Created Date ASC

or another ordering defined by the UI system.

# 32. Empty State

If no plans exist:

No membership plans yet.

Create a plan to start adding memberships.

[ Add Plan ]

# 33. Search Empty State

If no plan matches:

No plans found.

Try a different search.

[ Clear Search ]

# 34. Loading State

While loading:

Plan table skeleton

Do not display false zero values.

# 35. Error State

If plans cannot be loaded:

Unable to load membership plans.

Something went wrong while loading plan data.

[ Try Again ]

Do not show raw SQL/database errors.

# 36. Save State

During creation/editing:

[ Saving... ]

The submit button should be disabled.

This prevents duplicate submissions.

# 37. Plan Usage Warning

When deactivating a plan currently used by members, the UI should communicate this clearly.

Example:

This plan is currently used by 84 members.

Deactivating it will prevent it from being selected
for new memberships.

Existing memberships will remain unchanged.

# 38. Member Creation Integration

The Members module should retrieve active plans.

Relationship:

Membership Plans
       ↓
Active Plans
       ↓
Member Form
       ↓
Select Plan

Do not duplicate plan definitions inside Members.

# 39. Payment Integration

Payments may reference the membership plan involved in the payment where appropriate.

The Payments module must not depend on the current plan price to reconstruct historical payment amounts.

Example:

Payment:
Rs. 2,000

remains:

Rs. 2,000

even if:

Monthly Plan:
Rs. 2,500

today.

# 40. Renewal Integration

If the application supports membership renewal, selecting a plan should use the current active plan configuration.

Example:

Member:
Ahmad Khan

Renew with:
Monthly
Rs. 2,500

The actual transaction/payment amount should be recorded separately.

# 41. Plan Price vs Payment Amount

These are different concepts.

Plan Price

means:

Current default price of the plan.

Payment Amount

means:

Amount actually received in a specific transaction.

They must never be treated as the same database value.

# 42. Discounts

The initial Membership Plans module does NOT need a discount engine.

Do not add:

Percentage discounts
Promo codes
Coupons
Automatic discounts
Loyalty pricing

unless explicitly required later.

If the Payments module eventually supports manually adjusted payment amounts, the payment record should preserve the actual received amount.

# 43. Currency

Use the application's configured currency.

Initial default:

PKR / Rs.

Currency formatting must use the shared money-formatting utility.

Do not hard-code currency formatting in individual components.

# 44. Database Entity

The module uses:

membership_plans

Core conceptual fields:

id
name
duration_value
duration_unit
price
description
is_active
created_at
updated_at

The final schema must be defined in:

DATABASE-SPECIFICATION.md

Do not create duplicate plan tables.

# 45. Database Constraints

The database should enforce important invariants where possible.

Examples:

name NOT NULL
duration_value > 0
price >= 0

and appropriate uniqueness constraints.

Business rules should not rely exclusively on application code.

# 46. Repository Responsibilities

The repository handles:

Create plan
Get plan
List plans
Update plan
Deactivate plan
Reactivate plan
Search plans
Filter plans
Count members using plan

SQL must remain inside the repository/data-access layer.

# 47. Service Responsibilities

The service handles:

Plan validation
Name uniqueness
Duration validation
Price validation
Activation/deactivation rules
Plan usage checks

# 48. Tauri Command Responsibilities

Tauri commands should:

Receive request DTO
Call service
Return response DTO
Translate expected application errors

They should not contain complex SQL or business rules.

# 49. Frontend Responsibilities

Frontend handles:

Plan table
Search
Filters
Form
Client validation
Loading states
Empty states
Error states
Confirmation dialogs
Notifications

The frontend must not access SQLite directly.

# 50. DTOs

Recommended conceptual DTOs:

CreateMembershipPlanRequest
UpdateMembershipPlanRequest
MembershipPlanResponse
MembershipPlanListItem
MembershipPlanFilters

The exact naming should follow the project's architecture conventions.

# 51. Plan Date Calculation

Membership date calculation must live in shared business logic.

Example:

Start:
26 Aug 2026

Duration:
1 Month

End:
25 Sep 2026

Do not calculate this separately in:

Members UI
Payments UI
Renewal UI
Reports UI

Use one authoritative implementation.

# 52. Month-End Edge Cases

Date calculation must have tests for dates such as:

January 31
February 28
February 29
March 31

The business rule must explicitly define how month-based durations behave around months with different lengths.

Do not leave this behavior to accidental frontend date-library behavior.

# 53. Testing Requirements

Every Membership Plans feature must include automated tests.

# 54. Repository Tests

Test:

Create plan
Get plan
List plans
Update plan
Deactivate plan
Reactivate plan
Search plan
Filter plans

# 55. Validation Tests

Test:

Empty name
Whitespace-only name
Duplicate name
Zero duration
Negative duration
Invalid duration unit
Negative price
Invalid price

# 56. Price Tests

Test:

Price = Rs. 2,000
→ Valid

Price = Rs. 0
→ Valid if free plans are supported

Price = -500
→ Invalid

# 57. Duration Tests

Examples:

1 month
→ Valid

3 months
→ Valid

6 months
→ Valid

12 months
→ Valid

0 months
→ Invalid

-1 month
→ Invalid

# 58. Uniqueness Tests

Test:

Create Monthly
Create Monthly

Expected:

Second creation fails.

Also test case variations according to the project's uniqueness rules.

# 59. Deactivation Tests

Test:

Active Plan
   ↓
Deactivate
   ↓
Plan becomes inactive
   ↓
Plan no longer appears in active selection

# 60. Historical Data Test

Required:

Create Monthly plan
Price = Rs. 2,000

Create member using Monthly

Record payment:
Rs. 2,000

Change Monthly price:
Rs. 2,500

Expected:

Historical payment:
Rs. 2,000

Current plan price:
Rs. 2,500

The historical payment must remain unchanged.

# 61. Existing Member Test

Required:

Create plan
Create member using plan
Deactivate plan

Expected:

Member remains valid.
Member still displays the plan.
Historical information remains intact.
Plan cannot be selected for new memberships.

# 62. Date Calculation Tests

Test plan duration against:

Normal month
Month with 28 days
Month with 29 days
Month with 30 days
Month with 31 days
Year boundary
Leap year

# 63. Frontend Tests

Test:

Plan list renders
Add plan form opens
Validation works
Create works
Edit works
Deactivate works
Reactivate works
Search works
Filters work
Empty state works
Loading state works
Error state works

# 64. Integration Tests

Required workflow:

Create Plan
     ↓
Create Member
     ↓
Select Plan
     ↓
Member saved successfully

Another:

Create Plan
     ↓
Record Payment
     ↓
Change Plan Price
     ↓
Historical Payment Remains Unchanged

# 65. UI Design

The module should look like a professional settings/management screen.

Use:

Clean table
Clear plan names
Readable prices
Status badges
Compact actions
Consistent spacing
Professional forms

Avoid:

Huge cards
Excessive gradients
Decorative animations
Unnecessary charts

# 66. Plan Cards

The UI may optionally use cards instead of a table if there are very few plans.

However, if the application uses an Excel-like table style elsewhere, the plan table should remain consistent with the global design system.

Do not create a completely different visual language for this module.

# 67. Price Display

Prices should be visually prominent.

Example:

Monthly

Rs. 2,000
per month

or in a table:

Monthly | 1 Month | Rs. 2,000 | Active

The exact representation belongs to the UI specification.

# 68. Accessibility

Ensure:

Form labels are associated with inputs.
Buttons have meaningful labels.
Dialogs support keyboard navigation.
Focus is visible.
Status is not communicated through color alone.
Tables have proper headers.

# 69. No Unnecessary Features

Do NOT add:

Online subscriptions
Automatic recurring billing
Credit card processing
Promo codes
Coupon systems
Complex pricing tiers
Trainer-specific plans
Class packages
Attendance packages

unless explicitly required later.

# 70. Module Dependencies

Membership Plans depends on:

Database
Global UI system
Application settings/currency configuration

It is used by:

Members
Payments
Receipts
Dashboard
Reports

# 71. Implementation Order

Implement in this order:

1. Database schema
2. Migration
3. Repository
4. Repository tests
5. Service
6. Service tests
7. DTOs
8. Tauri commands
9. Frontend IPC/API wrapper
10. Plan list
11. Add plan form
12. Edit plan form
13. Search
14. Filters
15. Deactivation
16. Reactivation
17. Loading states
18. Empty states
19. Error states
20. Frontend tests
21. Integration tests
22. UI polish

# 72. Definition of Done

The Membership Plans module is complete when:

[ ] Plans can be created
[ ] Plans can be viewed
[ ] Plans can be edited
[ ] Plans can be deactivated
[ ] Plans can be reactivated
[ ] Plan names are validated
[ ] Duration is validated
[ ] Price is validated
[ ] Duplicate plans are prevented
[ ] Active plans appear in member forms
[ ] Inactive plans do not appear for new memberships
[ ] Existing members using inactive plans remain valid
[ ] Historical payments are unaffected by price changes
[ ] Search works
[ ] Filters work
[ ] Loading state works
[ ] Empty state works
[ ] Error state works
[ ] Backend tests pass
[ ] Repository tests pass
[ ] Frontend tests pass
[ ] Integration tests pass
[ ] No mock data remains
[ ] UI follows global design system
[ ] Existing tests still pass

# 73. AI Coding Rules

When implementing this module, the AI agent MUST:

[ ] Read ARCHITECTURE.md
[ ] Read DATABASE-SPECIFICATION.md
[ ] Read UI-UX-SYSTEM.md
[ ] Read MEMBERS.md
[ ] Inspect existing repository/service patterns
[ ] Reuse existing components
[ ] Add automated tests with functionality
[ ] Run module tests
[ ] Run the full test suite

The AI agent MUST NOT:

[ ] Put SQL in frontend code
[ ] Put business logic in React
[ ] Hard-code plans in the frontend
[ ] Hard-code plan prices
[ ] Modify historical payments
[ ] Delete referenced plans
[ ] Create duplicate plan tables
[ ] Duplicate date-calculation logic
[ ] Add unrelated features
[ ] Skip tests
[ ] Rewrite unrelated modules

# 74. Final Principle

Membership Plans are configuration, not financial history.

The most important rule is:

Current Plan Configuration
        ≠
Historical Transaction

Changing a plan today must never rewrite what happened yesterday.

The module should remain simple, reliable, and easy for gym staff to maintain.
