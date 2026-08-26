# Gym Management System — UI/UX Design System

**Document Version:** 1.0  
**Status:** Foundation  
**Platform:** Windows Desktop  
**Design Goal:** Professional, clean, practical, premium desktop application

---

# 1. Design Philosophy

The Gym Management System must look like a professionally designed commercial desktop product.

It must NOT look:

- AI-generated
- Template-heavy
- Overly colorful
- Overly rounded
- Visually noisy
- Like a generic SaaS dashboard
- Like a prototype
- Like a collection of unrelated components

The design should communicate:

```text
Professional
Reliable
Fast
Clean
Organized
Modern
Practical
```

The application is designed primarily for gym owners and staff who want to perform daily tasks quickly.

# 2. Primary UX Principle

The application should optimize for the following workflow:

Open App
   ↓
Understand Today's Situation
   ↓
Find Member
   ↓
Receive Payment
   ↓
Print Receipt
   ↓
Continue Work

Common actions must require minimal clicks.

# 3. Desktop-First Design

The application is a Windows desktop application.

The UI should be optimized for:

1366 × 768
1920 × 1080

The design must remain usable at smaller desktop resolutions.

Do not design primarily for mobile.

Mobile responsiveness is not a primary requirement for version 1.

# 4. Application Shell

The application should use a persistent desktop application shell.

Recommended structure:

```text
┌────────────────────────────────────────────────────────────┐
│                                                            │
│ Sidebar          Main Content                              │
│                                                            │
│ Logo             Page Header                               │
│                                                            │
│ Dashboard        Content                                   │
│ Members                                                     │
│ Finances                                                     │
│ Reports                                                       │
│ Settings                                                      │
│                                                            │
│                                                            │
│                                                            │
│                                                            │
│ Gym Information / Version                                  │
└────────────────────────────────────────────────────────────┘
```

# 5. Sidebar

The sidebar should remain visually stable throughout the application.

Primary navigation:

Dashboard
Members
Finances
Reports
Settings

The active page must be visually obvious.

# 6. Sidebar Design

The sidebar should be:

Clean
Narrow enough to preserve content space
Easy to scan
Consistent
Visually understated

Avoid:

Excessively large icons
Excessive gradients
Huge labels
Excessive shadows
Decorative animations

# 7. Navigation Icons

Each major navigation item may have an icon.

Icons must:

Have consistent size
Use a consistent icon library
Have consistent stroke weight
Align correctly with labels

Do not mix unrelated icon styles.

# 8. Logo / Branding

The gym's branding should be displayed in the application shell.

The application should support:

Gym Logo
Gym Name

The logo must not dominate the interface.

If no logo is configured, the system should gracefully display the gym name.

# 9. Main Content Area

The main content area should provide:

Page Header
Page Description / Context
Primary Action
Filters / Controls
Main Content

Example:

Members

Manage gym members and memberships.

[+ Add Member]

[Search members...] [Status] [Plan] [Date]
---------------------------------------------------
Members Table
---------------------------------------------------

# 10. Page Header

Each page should have a consistent header.

Example:

Members
Manage members, memberships and member information.

                         [+ Add Member]

The primary action should normally appear on the right.

# 11. Typography

Typography must be professional and highly readable.

Use a modern UI font family.

Preferred options:

Inter
Geist
Manrope

One primary font family should be selected and used consistently.

Do not use multiple unrelated fonts.

# 12. Typography Hierarchy

Recommended hierarchy:

Page Title
20–28px
Semibold / Bold

Section Heading
16–20px
Semibold

Body
14–15px
Regular

Secondary Text
12–14px
Regular

Table Text
13–14px
Regular / Medium

Button Text
13–14px
Medium / Semibold

Exact values may be adjusted based on visual testing.

# 13. Font Weight

Use a limited weight system:

400 → Regular
500 → Medium
600 → Semibold
700 → Bold

Do not randomly mix font weights.

# 14. Color Philosophy

The interface should use a restrained color palette. The application should not use a different bright color for every feature. Instead, a clean, high-contrast light theme should be established as the foundation.

# 15. Primary Color & Light Theme Palette

The application uses a specific light theme palette to maintain a professional, business-grade look. Do not invent new colors.

**Backgrounds**
- **App Background:** `#F8FAFC` (Slate 50) - Very subtle off-white/gray for the main app background.
- **Surface/Card Background:** `#FFFFFF` (White) - Used for cards, tables, and modals to elevate them from the app background.

**Text**
- **Primary Text:** `#0F172A` (Slate 900) - Used for headings and primary content.
- **Secondary/Muted Text:** `#64748B` (Slate 500) - Used for table headers, secondary labels, and less important information.

**Borders & Dividers**
- **Borders:** `#E2E8F0` (Slate 200) - Subtle lines to separate sections, table rows, and input borders.

**Brand & Interactive**
- **Primary Brand Color:** `#2563EB` (Blue 600) - Used for primary actions, active navigation, focused inputs, and primary buttons. This color communicates trust and reliability.
- **Primary Hover:** `#1D4ED8` (Blue 700) - Used for hovering over primary buttons.
- **Secondary Surface (e.g., secondary buttons, neutral tags):** `#F1F5F9` (Slate 100) with `#475569` (Slate 600) text.

# 16. Semantic Colors

Semantic colors should communicate meaning.

- **Success:** `#16A34A` (Green 600) → Successful / active / paid
- **Warning:** `#F59E0B` (Amber 500) → Expiring / attention required
- **Danger:** `#DC2626` (Red 600) → Error / destructive
- **Neutral:** `#3B82F6` (Blue 500) or `#64748B` (Slate 500) → Informational / inactive

Do not use colors purely for decoration.

# 17. Background

The main application background should be subtle.

Avoid pure white everywhere.

A hierarchy such as:

Application Background (`#F8FAFC`)
        ↓
Card / Surface (`#FFFFFF`)
        ↓
Table / Form (`#FFFFFF`)

should help visually separate areas.

# 18. Borders

Borders should be subtle.

Use borders to establish structure rather than decoration.

Avoid:

Thick borders
Multiple nested borders
Excessive outlines

# 19. Border Radius

Use a consistent radius scale.

Example:

Small
6px

Medium
8px

Large
10–12px

Avoid putting extremely rounded corners on every element.

The interface should feel like a professional desktop application, not a toy/mobile UI.

# 20. Shadows

Shadows should be subtle.

Use them primarily for:

Modals
Dropdowns
Floating elements

Cards should not all have large shadows.

Prefer:

Surface + border

over:

Large shadow + floating card

# 21. Spacing System

Use a consistent spacing scale.

Recommended base:

4
8
12
16
20
24
32
40
48

Do not manually invent random spacing values throughout the application.

# 22. Dashboard Design

The dashboard should prioritize information density without becoming crowded.

Recommended layout:

```text
Dashboard

Overview for today

┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total Members│ │ Active       │ │ Expiring     │ │ Expired      │
│              │ │ Members      │ │ Soon         │ │              │
│    1,248     │ │    1,102     │ │      42      │ │     104      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘


┌───────────────────────────┐ ┌───────────────────────────┐
│ Today's Revenue           │ │ This Month                │
│                           │ │                           │
│ Rs. 18,500                │ │ Rs. 245,000               │
└───────────────────────────┘ └───────────────────────────┘


Recent Payments
---------------------------------------------------------------
Receipt    Member        Amount       Method       Date
---------------------------------------------------------------


Expiring Members
---------------------------------------------------------------
Member     Plan          Expiry       Status
---------------------------------------------------------------
```

The actual implementation should adapt based on available width.

# 23. KPI Cards

KPI cards must be compact and information-focused.

A KPI card should contain:

Label
Primary Value
Optional Context
Optional Icon

Example:

Today's Revenue

Rs. 18,500

↑ 12 payments

Avoid filling cards with unnecessary graphics.

# 24. KPI Card Rules

KPI cards must:

Have consistent dimensions
Align to a grid
Use consistent padding
Use consistent typography
Have clear hierarchy

Do not create a unique visual style for every KPI card.

# 25. Financial Numbers

Financial numbers should be visually prominent.

Example:

Rs. 245,000

Use proper number formatting:

Rs. 2,500
Rs. 18,500
Rs. 125,000

Do not display raw database values.

# 26. Tables

Tables are a core part of the application.

They must feel like professional business software.

The table design should prioritize:

Readability
Density
Scanning
Sorting
Filtering
Actions

# 27. Table Structure

Recommended:

```text
┌─────────────────────────────────────────────────────────────┐
│ Name      │ Phone      │ Plan    │ Expiry    │ Status │ ... │
├─────────────────────────────────────────────────────────────┤
│ Ahmad     │ 03xx...    │ Monthly │ 12 Aug    │ Active │ ... │
│ Hamza     │ 03xx...    │ Monthly │ 08 Aug    │ Expired│ ... │
└─────────────────────────────────────────────────────────────┘
```

# 28. Table Header

Table headers should:

Have clear contrast
Use medium/semi-bold typography
Remain visually distinct
Support sorting where available

Avoid oversized table headers.

# 29. Table Rows

Rows should have:

Comfortable height
Consistent padding
Clear horizontal separation
Hover feedback

Avoid excessive vertical spacing.

The table should feel information-dense like professional business software.

# 30. Table Actions

Actions should not visually overwhelm the table.

Preferred:

View
Edit
More

A three-dot menu may be used for secondary actions.

Do not place five colorful buttons in every row.

# 31. Status Badges

Status badges should be compact.

Examples:

● Active
● Expiring Soon
● Expired

Use subtle background/text combinations.

Avoid huge pill-shaped badges.

# 32. Search Input

Search should be easy to find.

Example:

[ 🔍 Search members by name, phone or member # ]

Search inputs should have:

Clear placeholder
Search icon
Consistent height
Visible focus state
Clear button when text exists

# 33. Filter Controls

Filters should appear near the table.

Example:

[Search...] [Status ▾] [Plan ▾] [Date ▾] [Clear]

Filters should not consume excessive vertical space.

# 34. Filter Drawer

If a page requires many filters, use a filter drawer/popover instead of creating a huge filter bar.

Example:

[Search...]                  [Filters (3)]

Clicking Filters opens:

```text
┌─────────────────────────────┐
│ Filters                     │
│                             │
│ Status                      │
│ [Active ▾]                  │
│                             │
│ Membership                  │
│ [Monthly ▾]                 │
│                             │
│ Expiry Date                 │
│ [From] [To]                 │
│                             │
│ [Clear]         [Apply]     │
└─────────────────────────────┘
```

# 35. Buttons

Buttons must follow a consistent hierarchy.

Primary

Used for the main action:

+ Add Member
Receive Payment
Save
Generate Report

Secondary

Used for supporting actions:

Cancel
Filters
Export
Print

Destructive

Used for:

Delete
Void
Restore

# 36. Button Rules

Buttons must:

Have consistent height
Have consistent typography
Have clear hover states
Have clear disabled states
Show loading state when necessary

Never allow multiple clicks during a pending operation.

# 37. Forms

Forms should be simple and organized.

Example:

```text
Add Member

Personal Information
--------------------------------

Full Name *
[________________________]

Phone
[________________________]

CNIC
[________________________]


Membership
--------------------------------

Plan *
[Monthly ▾]

Start Date *
[__________]

Expiry Date *
[__________]


                    [Cancel] [Save Member]
```

# 38. Form Layout

Forms should use logical sections.

Avoid one giant form with no grouping.

Recommended:

Personal Information
Membership Information
Additional Information

Optional fields should visually appear optional.

# 39. Required Fields

Required fields should be clearly indicated.

Example:

Full Name *

Do not require information that is not actually needed.

# 40. Optional Fields

Optional fields should not dominate the interface.

Advanced/less common information may be placed under:

Additional Information

or:

More Details

# 41. Validation

Validation errors should appear close to the affected field.

Bad:

Something went wrong.

Good:

Phone number is invalid.

Validation must be clear before submission where practical.

Backend validation remains authoritative.

# 42. Modals

Modals should be used for short focused tasks.

Good modal use:

Receive Payment
Confirm Archive
Quick Add Member

Avoid putting entire complicated workflows inside giant modals.

For complex workflows, use a dedicated page.

# 43. Payment Modal

The Receive Payment interface should be optimized for speed.

Example:

```text
Receive Payment

Member
[ Search member... ]

Membership
Monthly — Rs. 2,000

Outstanding
Rs. 1,500

Amount
[ Rs. 1,000 ]

Payment Method
[ Cash ▾ ]

Notes
[ Optional ]

                 [Cancel] [Receive Payment]
```

# 44. Payment Confirmation

Before final submission, the user should clearly see:

Member
Amount
Payment Method
Membership
Remaining Balance

This reduces accidental financial errors.

# 45. Receipt Preview

After a successful payment, the user may see a receipt preview.

Example:

```text
┌──────────────────────────────┐
│          GYM NAME            │
│          Receipt             │
│                              │
│ Receipt #: RCP-000123        │
│ Date: 26 Aug 2026            │
│                              │
│ Member: Ahmad Khan           │
│ Member #: GYM-000123         │
│                              │
│ Membership: Monthly          │
│ Amount: Rs. 2,000            │
│ Method: Cash                 │
│                              │
│        Thank You!            │
└──────────────────────────────┘

[Print Receipt]
```

# 46. Reports UI

Reports should feel simple rather than like an analytics platform.

Example:

```text
Reports

[Financial Summary]
[Payments]
[Expenses]
[Members]
[Memberships]


Period:

[Today]
[This Week]
[This Month]
[Last Month]
[Custom Range]


                    [Generate Report]
```

# 47. Report Results

Report results should use professional tables and summary cards.

Example:

```text
Monthly Financial Summary

Revenue             Rs. 245,000
Expenses            Rs. 85,000
Net Income          Rs. 160,000


Payments
-------------------------------------------------
Date        Member        Amount       Method
-------------------------------------------------
...
```

# 48. Report Templates

Reports should have predefined templates.

Initial templates:

Financial Summary
Payment Report
Expense Report
Member Report
Membership Status Report

Templates should be accessible through simple buttons/cards.

# 49. Report Customization

The user should be able to customize:

Date Range
Member
Payment Method
Membership Plan
Status

Only relevant filters should appear for the selected report.

Do not show every possible filter for every report.

# 50. Print UI

Print actions should be visually consistent.

Examples:

[Print Receipt]
[Print Report]

Printing should show a clear progress/loading state.

# 51. Empty States

Every major data screen must have a useful empty state.

Example:

No members yet

Add your first gym member to start managing memberships.

[+ Add Member]

Another:

No payments found

Try changing your filters or date range.

# 52. Loading States

Avoid showing blank content while data loads.

Use:

Skeletons
Loading indicators
Disabled actions

Example:

Loading members...

Loading indicators should be subtle.

# 53. Error States

Errors should have useful messages.

Example:

Unable to load members.

Please try again.

[Retry]

Technical errors should be logged internally but not unnecessarily exposed to users.

# 54. Success Feedback

Successful actions should use a lightweight toast or notification.

Examples:

Member added successfully.

Payment received successfully.

Receipt generated successfully.

Expense recorded successfully.

Do not interrupt the user with unnecessary dialogs for routine success messages.

# 55. Confirmation UX

Confirmation dialogs should explain consequences.

Example:

Archive Member?

This member will be hidden from the active member list.
Their payment history will remain available.

[Cancel] [Archive Member]

Avoid generic:

Are you sure?

# 56. Destructive Action Styling

Destructive actions should be visually distinguishable but not excessively bright.

Example:

Delete Expense
Void Payment
Archive Member

The user must clearly understand the consequence.

# 57. Date Inputs

Dates should use a consistent date picker.

Users should not have to manually remember formatting.

Display dates consistently throughout the application.

Example:

26 Aug 2026

or another single format selected for the product.

The database representation must remain separate from display formatting.

# 58. Currency Display

The initial currency is:

PKR / Rs.

Display examples:

Rs. 1,500
Rs. 25,000
Rs. 125,000

Currency formatting must be centralized rather than implemented independently in every component.

# 59. Responsive Behavior

The application is desktop-first.

At smaller window sizes:

Tables may horizontally scroll.
Sidebar may collapse.
Cards may wrap.
Forms may move from two-column to one-column layouts.

The interface must remain functional.

Do not allow important controls to disappear.

# 60. Accessibility

The application should support:

Keyboard navigation
Visible focus states
Sufficient contrast
Clear labels
Accessible buttons
Accessible form controls
Meaningful error messages

Icons must not be the only indication of an action.

# 61. Animations

Animations should be minimal.

Allowed:

Button hover
Modal appearance
Toast appearance
Dropdown appearance
Page transitions

Avoid:

Floating cards
Constant animations
Particle backgrounds
Large animated gradients
Excessive motion

The application is business software, not a marketing website.

# 62. Dark Mode

Dark mode is NOT required for the initial release unless explicitly requested.

The initial design should prioritize a polished light theme.

If dark mode is introduced later, it must be designed systematically rather than simply inverting colors.

# 63. Component Consistency

Reusable components should be created for:

Button
Input
Select
DatePicker
Modal
Dialog
Toast
Table
Badge
Card
KPI Card
Empty State
Loading State
Page Header
Filter Bar
Pagination

Do not recreate these components independently for every screen.

# 64. Component Rules

If a component already exists:

Reuse it.

Do not create:

MemberButton
PaymentButton
ReportButton

when a shared:

Button

component can support the use case.

# 65. Design Tokens

The frontend should centralize:

Colors
Typography
Spacing
Border Radius
Shadows
Component Heights

Example conceptual structure:

```text
design-tokens
├── colors
├── typography
├── spacing
├── radius
└── shadows
```

This prevents visual inconsistency.

# 66. UI State Matrix

Every important component must consider:

Default
Hover
Focus
Active
Disabled
Loading
Error
Empty
Success

For example, a Save button must have:

Normal
Hover
Disabled
Loading

states.

# 67. No Vibe-Coded UI Rule

AI coding agents must NOT:

Invent random colors.
Add excessive gradients.
Use giant rounded cards.
Add unnecessary animations.
Use random fonts.
Create inconsistent spacing.
Use different button styles on every page.
Create huge empty spaces.
Put everything inside cards.
Add decorative UI with no functional purpose.
Copy generic dashboard templates without adapting them.

Every visual decision must support usability.

# 68. No Excessive Card Rule

Not every section needs a card.

Use cards for:

KPIs
Distinct summaries
Important grouped information

Do NOT wrap:

Every table
Every form field
Every paragraph
Every section

inside separate cards.

# 69. Information Density

The application should have a professional business-software density.

Target:

Enough information to work efficiently
+
Enough whitespace to remain readable

Avoid both extremes:

Too dense → difficult to read
Too spacious → wastes desktop space

# 70. Desktop Interaction Principle

Common tasks should be fast.

Examples:

Search Member
→ Select
→ Receive Payment
→ Print

Add Member
→ Save
→ Continue

View Payment
→ Reprint

The UI must minimize unnecessary navigation.

# 71. Visual Hierarchy

Every screen should clearly communicate:

1. Where am I?
2. What information am I seeing?
3. What is the primary action?
4. What can I filter/search?
5. What can I do with this data?

If the user cannot answer these questions immediately, the screen needs redesign.

# 72. UI Review Checklist

Before considering a screen complete:

[ ] Page title is clear
[ ] Primary action is obvious
[ ] Typography is consistent
[ ] Spacing is consistent
[ ] Buttons use shared components
[ ] Tables are readable
[ ] Search/filter controls are clear
[ ] Loading state exists
[ ] Empty state exists
[ ] Error state exists
[ ] Success feedback exists
[ ] Keyboard navigation works
[ ] No unnecessary visual decoration
[ ] No inconsistent colors
[ ] No duplicate components
[ ] No obvious AI/template-generated appearance

# 73. Definition of Professional UI

The UI is considered professional when:

The user does not notice the design.

The user simply understands the application.

The interface should feel:

Intentional
Consistent
Fast
Predictable
Reliable

rather than visually impressive for its own sake.

# 74. Final UI Principle

The application should look like a product that a professional gym could purchase and use every day.

The target is:

Business Software
+
Modern Desktop UX
+
Excellent Information Hierarchy
+
Consistent Design System

NOT:

AI Dashboard
+
Random Components
+
Excessive Gradients
+
Huge Cards
+
Unnecessary Animation
