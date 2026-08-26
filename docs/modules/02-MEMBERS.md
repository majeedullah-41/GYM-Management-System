# Members Module

**Module:** Members  
**Priority:** P0 — Critical  
**Status:** Planned  
**Route:** `/members`

---

# 1. Purpose

The Members module manages all gym members.

It allows staff to:

- Add members
- View members
- Edit members
- Archive members
- Search members
- Filter members
- Sort members
- View member details
- View membership information
- View payment history

The module should be fast and simple enough for daily front-desk use.

---

# 2. Primary Goals

The module should make it easy to:

1. Find a member quickly.
2. Add a new member quickly.
3. See membership status immediately.
4. See when a membership expires.
5. View a member's payment history.
6. Edit member information.
7. Archive inactive members without destroying history.

---

# 3. Main Screen

The Members page should primarily consist of:

```text
┌─────────────────────────────────────────────────────────────┐
│ Members                                      + Add Member   │
│ Manage your gym members                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Search members...   Status ▼   Plan ▼   Expiry ▼  Filters │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Member ID │ Name │ Phone │ Plan │ Expiry │ Status │ Actions│
│                                                             │
│ GYM-001   │ ...  │ ...   │ ...  │ ...    │ Active │ ...   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Showing 1–20 of 248                           1 2 3 ...     │
└─────────────────────────────────────────────────────────────┘
```

The exact layout may be refined by the UI system.

# 4. Member List

The main table should display:

Member ID
Name
Phone
Membership Plan
Start Date
Expiry Date
Status
Actions

# 5. Member ID

Each member must have a human-readable unique member number.

Example:

GYM-00001
GYM-00002
GYM-00003

The internal SQLite primary key must remain separate from this value.

# 6. Member Number Rules

Member number must be:

Unique
Non-empty
Automatically generated
Stable

Once assigned, a member number should normally not change.

# 7. Add Member

Primary action:

+ Add Member

opens the member creation form.

# 8. Member Creation Form

Required fields:

Full Name
Phone Number
Membership Plan
Membership Start Date
Membership End Date

Optional fields:

Gender
Date of Birth
Address
Emergency Contact
Notes

The form should clearly distinguish required and optional fields.

# 9. Member Form Layout

Recommended:

```text
Member Information

Full Name *
[____________________________]

Phone Number *
[____________________________]

Membership

Plan *
[ Monthly ▼ ]

Start Date *
[ 26 Aug 2026 ]

End Date *
[ 25 Sep 2026 ]

Additional Details

Gender
[ Select ]

Date of Birth
[ Select date ]

Address
[____________________________]

Emergency Contact
[____________________________]

Notes
[____________________________]

                    [ Cancel ] [ Save Member ]
```

# 10. Required Fields

The minimum valid member must contain:

Full Name
Phone
Membership Plan
Start Date
End Date

Do not force unnecessary information.

# 11. Full Name Validation

Rules:

Required
Cannot be empty
Must contain meaningful text

Whitespace-only values must be rejected.

Example invalid:

"     "

# 12. Phone Validation

Phone should be stored as text.

Do not store phone numbers as numeric database values.

Example:

03001234567

The application should support the phone-number format appropriate for the gym's target users.

Validation should prevent obviously invalid input without being unnecessarily restrictive.

# 13. Membership Plan

The plan selector should load active membership plans from the database.

Example:

Monthly — Rs. 2,000
Quarterly — Rs. 5,000
Yearly — Rs. 18,000

Do not hard-code plan names into the Members frontend.

# 14. Membership Dates

The form should allow:

Start Date
End Date

Dates must be valid.

The system should prevent:

End Date < Start Date

unless a deliberate business rule allows it.

# 15. Automatic End Date

If the selected membership plan has a defined duration, the application may automatically calculate the end date.

Example:

Plan:
Monthly

Start:
26 Aug 2026

End:
25 Sep 2026

The exact date calculation rule must be centralized in business logic.

Do not duplicate date calculation logic in multiple UI components.

# 16. Editing Membership Dates

When editing a member, changing the membership plan or dates should require clear user intent.

Do not silently overwrite existing membership information.

# 17. Optional Details

Optional fields:

Gender
Date of Birth
Address
Emergency Contact
Notes

These should not clutter the primary workflow.

Recommended UI:

Additional Details
[ Expand ]

# 18. Saving a Member

Expected workflow:

Fill Form
   ↓
Validate
   ↓
Submit
   ↓
Backend Validation
   ↓
Database Transaction
   ↓
Member Created
   ↓
Success Notification
   ↓
Return to Members

# 19. Success Notification

Example:

Member added successfully.

Optionally:

Member GYM-00249 created successfully.

# 20. Duplicate Member Numbers

Member numbers must be unique.

If a conflict occurs:

Member ID already exists.

The frontend should not expose raw SQLite errors.

# 21. Member Search

The search box should support:

Name
Member ID
Phone

Example:

Search:
Ahmad

returns:

Ahmad Khan
Ahmad Shah
Muhammad Ahmad

# 22. Search Behavior

Search should:

Support partial matching.
Ignore unnecessary leading/trailing whitespace.
Be case-insensitive where appropriate.
Return useful results quickly.

The exact matching strategy belongs in the repository layer.

# 23. Search Debouncing

If search requests are triggered while typing, use appropriate debouncing or controlled querying.

Avoid sending an unnecessary database query for every single keystroke if the implementation does not require it.

# 24. Member Filters

The Members list should support:

Status
Membership Plan
Start Date
Expiry Date

# 25. Status Filter

Options:

All
Active
Expiring Soon
Expired
Archived

# 26. Membership Plan Filter

The plan filter should be populated dynamically.

Example:

All Plans
Monthly
Quarterly
Half-Yearly
Yearly

Only relevant plans should be displayed.

# 27. Date Filters

Useful options:

All
Expiring Today
Expiring This Week
Expiring This Month
Expired
Custom Range

The exact set may be refined during implementation.

# 28. Clear Filters

When filters are active, provide:

Clear Filters

This should reset:

Search
Status
Plan
Date filters
Sorting

if sorting is included in the filter state.

# 29. Active Filter Indicators

Users should be able to tell when filtering is active.

Example:

Status: Expired
Plan: Monthly

Do not make filters silently affect results.

# 30. Sorting

The member table should support sorting by useful fields.

Recommended:

Name
Member ID
Start Date
Expiry Date
Created Date

# 31. Default Sorting

Recommended default:

Created Date DESC

or another sensible ordering defined by the UI specification.

The newest members should be easy to find.

# 32. Member Status

Member status should be determined consistently.

Conceptually:

Archived
    ↓
Archived

Not archived
    ↓
End date < today
    ↓
Expired

End date <= warning threshold
    ↓
Expiring Soon

Otherwise
    ↓
Active

# 33. Expiring Soon

Initial warning period:

7 days

Example:

Today:
26 Aug

Membership expires:
30 Aug

Status:
Expiring Soon

The warning period should be centralized and configurable later if required.

# 34. Status Should Not Be Duplicated

Avoid storing separate permanent values for:

active
expired
expiring

when these can be reliably derived from dates.

Otherwise the database can become contradictory.

Example problem:

status = active
expiry_date = 20 Aug 2026
today = 26 Aug 2026

The business logic must determine the correct status.

# 35. Member Row Actions

Each member row should provide actions such as:

View
Edit
Archive

Optional:

Receive Payment

The most common actions should be easy to reach without making the table visually noisy.

# 36. View Member

Selecting a member should open the member details screen/page.

The detail view should show:

Member Information
Membership Information
Payment History
Financial Summary

# 37. Member Details Header

Recommended:

Ahmad Khan

GYM-00248

Active

[ Receive Payment ] [ Edit ] [ More ]

The member status should be visually obvious.

# 38. Member Information Section

Display:

Full Name
Member ID
Phone
Gender
Date of Birth
Address
Emergency Contact
Notes

Only display optional fields that actually contain data.

Avoid showing:

Address: —
Emergency Contact: —
Gender: —

everywhere if they were not provided.

# 39. Membership Information

Display:

Membership Plan
Start Date
Expiry Date
Status

Example:

Membership

Monthly
26 Aug 2026 — 25 Sep 2026

Status:
Active

# 40. Membership Summary

Useful summary information:

Current Plan
Days Remaining
Expiry Date

Example:

Monthly

18 days remaining

Expires:
25 Sep 2026

# 41. Expired Member Display

For an expired member:

Status:
Expired

Expired:
6 days ago

Provide a clear action:

Receive Payment / Renew

if the renewal workflow supports it.

# 42. Payment History

The member details page should contain payment history.

Columns:

Receipt #
Date
Amount
Payment Method
Description

# 43. Payment History Source

Payment history must come from the Payments repository.

Do not store duplicate payment records inside the member module.

Relationship:

Member
   ↓
member_id
   ↓
Payments

# 44. Payment Summary

The member details page may show:

Total Paid
Last Payment
Payment Count

If outstanding balance tracking is implemented:

Outstanding

must be calculated using the defined payment/membership rules.

# 45. Receive Payment Shortcut

From member details:

[ Receive Payment ]

should open the payment workflow with the member already selected.

Expected behavior:

Member Details
     ↓
Receive Payment
     ↓
Member automatically selected

The user should not need to search for the same member again.

# 46. Edit Member

Editing should use the same reusable form where possible.

The form should be pre-filled with current values.

Workflow:

Member Details
     ↓
Edit
     ↓
Form
     ↓
Modify
     ↓
Validate
     ↓
Save

# 47. Update Validation

Backend validation is mandatory.

The frontend validation improves UX but cannot be the only validation.

The backend must verify:

Required fields
Valid membership plan
Valid dates
Valid member ID

# 48. Archive Member

Members should normally be archived rather than permanently deleted.

Archive workflow:

Member
   ↓
Archive
   ↓
Confirmation
   ↓
archived_at set
   ↓
Member removed from active list

# 49. Archive Confirmation

Example:

Archive Member?

Ahmad Khan will no longer appear in the active member list.

His payment history will be preserved.

[ Cancel ] [ Archive Member ]

This is important because financial history must remain intact.

# 50. Archived Members

Archived members should remain accessible through:

Status → Archived

They should not appear in the default active member list.

# 51. Archived Member Restrictions

An archived member should not accidentally receive normal operations intended for active members.

For example, the UI may warn before:

Receive Payment

or require explicit reactivation.

The exact business behavior should be defined before implementation.

# 52. Reactivation

If supported, an archived member may be restored.

Example:

Archived Member

[ Reactivate ]

Reactivation must not change historical payments.

# 53. Permanent Deletion

Permanent deletion should NOT be available as a normal member action.

Reason:

Member
   ↓
Payments
   ↓
Financial Reports

Deleting a member could damage historical financial relationships.

# 54. Empty State

If there are no members:

No members yet

Add your first member to start managing your gym.

[ Add Member ]

# 55. Search Empty State

If filters/search return nothing:

No members found

Try changing your search or filters.

[ Clear Filters ]

# 56. Loading State

The member list should display a proper loading state.

Use:

Table skeleton
Loading indicator

Do not display an empty table while data is loading.

# 57. Error State

If members cannot be loaded:

Unable to load members.

Something went wrong while loading member data.

[ Try Again ]

Do not display raw database errors.

# 58. Form Loading

While saving:

Saving...

The submit button should be disabled to prevent accidental duplicate submissions.

Example:

[ Saving... ]

# 59. Double Submission Protection

The application must prevent:

User clicks Save
User clicks Save again

from creating duplicate members.

Frontend protection:

Disable submit button

Backend protection:

Unique constraints
Transaction handling

# 60. Notifications

Successful operations should use consistent notifications.

Examples:

Member added successfully.
Member updated successfully.
Member archived successfully.
Member reactivated successfully.

# 61. Member Database Entity

The module uses the members table.

Core fields:

id
member_number
full_name
phone
membership_plan_id
membership_start_date
membership_end_date
status
gender
date_of_birth
address
emergency_contact
notes
created_at
updated_at
archived_at

The final schema is defined in:

DATABASE-SPECIFICATION.md

Do not invent another member table.

# 62. Membership Plan Relationship

Members reference:

membership_plan_id

which points to:

membership_plans.id

Do not duplicate full membership plan information inside the member record.

# 63. Repository Responsibilities

The member repository should handle database operations such as:

Create member
Get member
List members
Update member
Archive member
Reactivate member
Search members
Filter members
Sort members
Get member payment history

SQL must remain in the repository layer.

# 64. Service Responsibilities

The Member service should handle business rules such as:

Validate member data
Generate member number
Calculate membership dates
Determine membership status
Archive rules
Reactivation rules

The exact responsibilities must follow the architecture document.

# 65. Tauri Command Responsibilities

Tauri commands should:

Receive validated DTO/input
Call service
Return application result
Translate errors appropriately

Commands should not contain complex business logic.

# 66. Frontend Responsibilities

The frontend should handle:

Rendering
Form interaction
Client-side validation
Loading state
Error state
Empty state
User feedback
Navigation

The frontend must not directly execute SQL.

# 67. Member DTOs

Use dedicated request/response DTOs where appropriate.

Conceptual examples:

CreateMemberRequest
UpdateMemberRequest
MemberResponse
MemberListItem
MemberDetails
MemberFilters

Avoid exposing internal database structures unnecessarily.

# 68. Member List Query

The backend should return only the data required for the table.

Avoid loading unnecessary fields such as:

Notes
Emergency Contact
Full Address

for every row if the table does not display them.

# 69. Member Details Query

The details page can load additional information when required.

This keeps the main member list efficient.

# 70. Pagination

If the member list grows, support pagination.

Example:

20 members per page

UI:

Showing 1–20 of 248

< Previous
1 2 3 ... 13
Next >

The exact pagination size may be configurable.

# 71. Pagination Rules

Pagination must preserve:

Search
Filters
Sorting

Example:

Search: Ahmad
Status: Active
Page: 2

Changing the search/filter should normally reset to page 1.

# 72. Table Performance

Do not:

Load every member
Filter in React
Sort in React
Paginate in React

for large datasets.

Prefer database-side:

WHERE
ORDER BY
LIMIT
OFFSET

where appropriate.

# 73. Phone Privacy

Phone numbers should only be displayed where necessary.

Do not expose member information unnecessarily in logs.

# 74. Member Number Generation

Member numbers should be generated by the backend.

Example:

GYM-00001
GYM-00002

The frontend must never determine the next member number.

# 75. Member Number Concurrency

Member number generation must prevent duplicate numbers even if two creation operations occur close together.

The database uniqueness constraint is the final protection.

# 76. Date Handling

Membership dates are business dates.

They should not accidentally shift because of timezone conversion.

Example:

26 Aug 2026

must remain:

26 Aug 2026

regardless of the computer's timestamp conversion behavior.

# 77. Testing Requirements

Member development MUST include automated tests.

# 78. Repository Tests

Test:

Create member
Get member
List members
Update member
Archive member
Reactivate member
Search
Filter
Sort
Pagination

# 79. Validation Tests

Test:

Empty name
Whitespace-only name
Missing phone
Invalid membership plan
Missing start date
Missing end date
End date before start date
Invalid member ID

# 80. Member Number Tests

Test:

First member:
GYM-00001

Second member:
GYM-00002

Also test that duplicate numbers cannot be inserted.

# 81. Status Tests

Test at minimum:

Active member
Expiring member
Expired member
Archived member

Test the exact boundary:

7 days remaining
6 days remaining
0 days remaining
1 day expired

# 82. Search Tests

Examples:

Search "Ahmad"
→ returns matching names

Search "GYM-00001"
→ returns correct member

Search "0300"
→ returns matching phone numbers

Also test:

No results
Empty search
Leading/trailing whitespace
Case differences

# 83. Filter Tests

Test:

Active
Expiring Soon
Expired
Archived
Specific membership plan
Date range

Also test combinations:

Status + Plan
Search + Status
Search + Plan + Date

# 84. CRUD Integration Test

Required workflow:

Create Member
      ↓
Read Member
      ↓
Update Member
      ↓
Read Updated Member
      ↓
Archive Member
      ↓
Read Archived Member

# 85. Payment Relationship Test

Create:

Member

Then:

Payment

Then archive the member.

Expected:

Member archived
Payment still exists
Payment history still accessible

This is a critical data-integrity test.

# 86. Frontend Tests

Test:

Member list renders
Add member form opens
Form validation works
Save works
Edit works
Archive confirmation works
Search works
Filters work
Empty state works
Loading state works
Error state works

# 87. User Workflow Test

A complete user workflow should verify:

Open Members
     ↓
Add Member
     ↓
Member appears in list
     ↓
Open Member
     ↓
Edit Member
     ↓
Changes appear
     ↓
Archive Member
     ↓
Member disappears from default active list
     ↓
Open Archived filter
     ↓
Member appears

# 88. UI Design Rules

The Members module should use:

Professional table
Clear column hierarchy
Readable typography
Consistent spacing
Subtle borders
Compact action controls
Clear status badges
Consistent form controls

# 89. Status Badges

Recommended:

Active
Expiring Soon
Expired
Archived

Badges should use both:

Color
Text

Do not communicate status through color alone.

# 90. Action Menu

If there are too many row actions, use:

⋯

Example:

View
Edit
Receive Payment
Archive

Avoid filling the table with excessive buttons.

# 91. Confirmation Dialogs

Require confirmation for:

Archive
Reactivate

if the action has meaningful consequences.

Normal navigation and editing should not require confirmation.

# 92. Keyboard Support

The module should support normal keyboard interaction.

Examples:

Enter
Submit form where appropriate

Escape
Close modal

Tab
Move through form controls

# 93. Accessibility

Ensure:

Labels are associated with inputs
Buttons have meaningful labels
Tables have headers
Focus is visible
Dialogs trap focus appropriately

# 94. No Unnecessary Complexity

Do NOT add:

Attendance
Workout plans
Trainer management
Diet plans
Biometric integration
Online membership portal
SMS automation

to the Members module unless explicitly requested later.

# 95. Module Dependencies

Members depends on:

Membership Plans
Database
Global UI system

Members is depended upon by:

Payments
Receipts
Dashboard
Reports
Finances

# 96. Implementation Order

Implement in this order:

1. Member database model/schema
2. Migration
3. Repository
4. Repository tests
5. Member service
6. Service tests
7. DTOs
8. Tauri commands
9. IPC/frontend API
10. Member list
11. Add member form
12. Edit member form
13. Member details
14. Search
15. Filters
16. Sorting
17. Archive/reactivate
18. Loading states
19. Empty states
20. Error states
21. Frontend tests
22. Integration tests
23. UI polish

# 97. Definition of Done

The Members module is complete only when:

[ ] Member CRUD works
[ ] Member numbers are generated correctly
[ ] Membership plans load from database
[ ] Dates validate correctly
[ ] Status is calculated correctly
[ ] Search works
[ ] Filters work
[ ] Sorting works
[ ] Pagination works if implemented
[ ] Member details work
[ ] Payment history is visible
[ ] Archive works
[ ] Historical payments remain intact
[ ] Loading states work
[ ] Empty states work
[ ] Error states work
[ ] Backend tests pass
[ ] Repository tests pass
[ ] Frontend tests pass
[ ] Integration tests pass
[ ] No mock data remains
[ ] UI follows global design system
[ ] Existing application tests still pass

# 98. AI Coding Rules

When implementing this module, the AI agent MUST:

[ ] Read the architecture document
[ ] Read the database specification
[ ] Read the UI system
[ ] Read the Membership Plans module specification
[ ] Inspect existing code before creating new code
[ ] Reuse existing components
[ ] Follow existing repository/service patterns
[ ] Add tests with every functionality
[ ] Run the relevant tests
[ ] Run the full test suite before completion

The AI agent MUST NOT:

[ ] Put SQL in React
[ ] Put business rules in React
[ ] Hard-code membership plans
[ ] Hard-code member numbers
[ ] Delete members with financial history
[ ] Create duplicate member tables
[ ] Create duplicate payment history
[ ] Invent unrelated features
[ ] Skip validation
[ ] Skip tests
[ ] Rewrite unrelated modules

# 99. Final Principle

The Members module should make the daily gym workflow feel effortless:

Find Member
     ↓
See Status
     ↓
Open Details
     ↓
Receive Payment

The interface should be optimized for speed, clarity, and accuracy, because this is one of the screens gym staff will use most frequently.
