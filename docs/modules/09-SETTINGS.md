# Settings Module

**Module:** Settings
**Priority:** P1 — High
**Status:** Planned
**Route:** `/settings`

---

# 1. Purpose

The Settings module manages application-wide configuration for the gym.

Settings should control information and preferences that are used across multiple modules.

Examples:

- Gym information
- Currency
- Receipt configuration
- Report configuration
- Business defaults
- Appearance preferences
- Backup and restore
- Application preferences

Settings must provide a single source of truth for global configuration.

---

# 2. Core Principle

Settings stores configuration.

It must NOT contain business logic that belongs to other modules.

Correct:

```text
Settings
    ↓
Currency = PKR
    ↓
Payments
Finances
Receipts
Reports
```

Incorrect:

```text
Settings
    ↓
Calculate payment totals
Update membership status
Calculate profits
```

Those responsibilities belong to their respective modules.

# 3. Settings Screen

Recommended layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Settings                                                    │
│ Manage your gym and application preferences                 │
│                                                             │
│ ┌──────────────┐ ┌────────────────────────────────────────┐ │
│ │ General      │ │ General Settings                       │ │
│ │ Gym          │ │                                        │ │
│ │ Receipts     │ │ Gym Name                               │ │
│ │ Reports      │ │ [ Swat Fitness Center             ]    │ │
│ │ Appearance   │ │                                        │ │
│ │ Data         │ │ Currency                               │ │
│ │              │ │ [ PKR ▼ ]                              │ │
│ │              │ │                                        │ │
│ │              │ │ [ Save Changes ]                       │ │
│ └──────────────┘ └────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

# 4. Settings Categories

Initial categories:

General
Gym Information
Receipts
Reports
Appearance
Data & Backup

Optional later:

Security
Advanced

Do not add categories unless they have actual functionality.

# 5. General Settings

General settings contain application-wide preferences.

Recommended:

Currency
Date Format
Time Format
First Day of Week
Default Date Range

# 6. Currency

Initial default:

PKR

Display example:

Rs. 2,000

Currency should be centralized.

The following modules must use the same setting:

Dashboard
Payments
Expenses
Finances
Receipts
Reports

# 7. Currency Storage

Currency should be stored as a configuration value.

Example:

currency = "PKR"

Do not hard-code "PKR" inside every component.

# 8. Currency Changes

Changing currency does NOT convert historical transactions.

Example:

Old Payment:
Rs. 2,000

Changing the application currency should never silently transform:

2000 → another currency value

Currency configuration and currency conversion are separate concepts.

The initial application does NOT need currency conversion.

# 9. Date Format

Allow a small set of formats.

Example:

DD/MM/YYYY
MM/DD/YYYY
YYYY-MM-DD

Recommended default for the target application:

DD/MM/YYYY

The exact default can be changed during implementation.

# 10. Date Format Consistency

All modules must use the centralized date formatting service.

```text
Settings
    ↓
Date Formatting
    ↓
Dashboard
Members
Payments
Expenses
Finances
Receipts
Reports
```

Do not create separate date-formatting logic in each module.

# 11. Time Format

Support:

12-hour
24-hour

Recommended default:

12-hour

Example:

10:45 AM

# 12. First Day of Week

Allow:

Monday
Sunday

This affects weekly reports and weekly dashboard calculations.

The setting must be respected consistently.

# 13. Default Report Period

Optional setting:

Default Report Range

[ This Month ▼ ]

Possible values:

Today
This Week
This Month
Last Month
This Year

# 14. Gym Information

Gym information is used on:

Receipts
Reports
Printed documents
Application header

Recommended fields:

Gym Name
Phone
Address
Email
Website

Optional:

Tagline
Logo

# 15. Gym Name

Required.

Example:

Gym Name:
[ Swat Fitness Center ]

This should appear in:

Receipts
Reports

where enabled.

# 16. Phone

Optional.

Example:

Phone:
[ 03XX-XXXXXXX ]

Do not enforce overly strict phone formatting.

The gym may use different local formats.

# 17. Address

Optional.

Example:

Address:
[ Mingora, Swat ]

Allow multiline input if necessary.

# 18. Email

Optional.

If provided, perform basic email validation.

Do not require email for a local offline gym application.

# 19. Website

Optional.

No online connection is required for the application.

This is simply business information printed on documents if configured.

# 20. Gym Logo

Optional.

The user may select a logo image.

Recommended formats:

PNG
JPEG/JPG
WEBP

The application should store/reference the local file safely.

# 21. Logo Behavior

The logo may appear on:

Receipts
Reports

depending on configuration.

The user should be able to:

Upload Logo
Remove Logo
Preview Logo

# 22. Logo Storage

Do not store unnecessarily large image data directly inside normal configuration rows.

Recommended:

Application data directory
       ↓
assets/logo.png

Settings stores the relevant local reference/path.

The exact storage approach belongs in the architecture/database documentation.

# 23. Receipt Settings

Receipt settings control receipt presentation.

Recommended:

Receipt Title
Show Gym Logo
Show Gym Phone
Show Gym Address
Show Receipt Number
Show Payment Date
Show Member ID
Show Notes
Footer Text

# 24. Receipt Title

Default:

PAYMENT RECEIPT

Allow customization.

Example:

Receipt Title:
[ PAYMENT RECEIPT ]

# 25. Receipt Logo

Setting:

☑ Show gym logo on receipts

If disabled:

Logo does not appear.

# 26. Receipt Contact Information

Options:

☑ Show phone
☑ Show address
☑ Show email

# 27. Receipt Number

Receipt numbers should always be visible on receipts.

Example:

Receipt #: RCPT-000123

This is important for identifying a transaction.

The number-generation logic belongs to the Receipts module.

Settings should only control presentation/prefix configuration if supported.

# 28. Receipt Prefix

Optional:

Receipt Prefix:
[ RCPT- ]

Example:

RCPT-000001
RCPT-000002
RCPT-000003

Changing the prefix should not change existing receipt numbers.

# 29. Receipt Number Starting Value

If configurable, this should only affect future numbers.

Example:

Starting Number:
[ 1000 ]

Do not renumber existing receipts.

# 30. Receipt Notes

Optional setting:

☑ Show payment notes

If enabled, notes may appear on receipts.

If disabled, notes remain internal.

# 31. Receipt Footer

Allow a simple custom footer.

Example:

Footer:
[ Thank you for being a member! ]

Keep this plain text.

Do not create a complex receipt designer.

# 32. Receipt Paper Size

If printing configuration is needed:

A4
A5
Receipt / Thermal

The initial implementation can prioritize:

A4

and add thermal printing later if required.

# 33. Report Settings

Recommended:

Show Gym Logo
Show Gym Contact Information
Report Footer
Default Report Range

# 34. Report Logo

Setting:

☑ Show logo on reports

This affects report presentation only.

# 35. Report Contact Information

Options:

☑ Show phone
☑ Show address
☑ Show email

# 36. Report Footer

Example:

Footer:
[ Generated by Swat Fitness Center ]

The footer should be configurable but simple.

# 37. Appearance Settings

The application should support:

Light
Dark
System

Recommended default:

System

# 38. Theme

Example:

Theme

○ System
○ Light
○ Dark

The setting should apply consistently to the entire application.

# 39. Accent Color

Optional.

Provide a small controlled set of professional colors.

Do NOT provide an unlimited color picker initially.

The design system should remain consistent.

# 40. Font

The application should use the globally defined typography system.

Settings should NOT allow arbitrary font selection initially.

Avoid:

Comic Sans
Random custom fonts
Per-page font settings

Typography belongs to the UI design system.

# 41. Density

Optional setting:

Table Density

○ Comfortable
○ Compact

This can be useful because the application relies heavily on tables.

If implemented, it should affect all major tables consistently.

# 42. Confirm Destructive Actions

Recommended:

☑ Confirm before destructive actions

This should cover:

Void payment
Delete member
Delete expense
Delete custom template
Restore backup

where applicable.

# 43. Data & Backup

Because the application is offline, backup is extremely important.

Settings should provide:

Backup Database
Restore Database
Open Data Folder

# 44. Backup

Primary action:

[ Backup Database ]

The user should be able to select a destination.

Example:

Backup successful.

File:
GymBackup-2026-08-26.db

[ Open Folder ]

# 45. Backup Format

Recommended:

SQLite database backup

The backup should represent a consistent database state.

Do not simply copy the SQLite file while unsafe writes are occurring.

Use a proper SQLite backup strategy.

# 46. Backup Filename

Example:

GymBackup-2026-08-26.db

Optional timestamp:

GymBackup-2026-08-26-104530.db

# 47. Restore

Primary action:

[ Restore Backup ]

Restoring is destructive.

Show a strong confirmation.

Example:

Restore Backup?

Restoring this backup will replace the current application data.

Current data may be lost.

[ Cancel ] [ Restore ]

# 48. Restore Safety

Before restoring:

Create automatic backup of current database

Recommended workflow:

Current Database
       ↓
Automatic Safety Backup
       ↓
Validate Selected Backup
       ↓
Restore
       ↓
Restart / Reload Application

# 49. Backup Validation

Before restoring, verify that the selected file is a valid application database.

Do NOT blindly replace the current database with an arbitrary SQLite file.

# 50. Database Version Compatibility

The backup should contain a database schema version.

Before restoring:

Backup Version
       ↓
Compare with Current Version
       ↓
Compatible?

If incompatible:

This backup was created by an incompatible version of the application.

Do not attempt unsafe restoration.

# 51. Open Data Folder

Useful for troubleshooting.

Button:

[ Open Data Folder ]

This opens the application's local data directory.

# 52. Database Location

The database location should be determined by the application's platform/data-directory strategy.

Do not hard-code:

C:\gym.db

or similar paths.

# 53. Backup Reminder

Optional.

Example:

Last Backup:
3 days ago

Display:

⚠ No backup has been created recently.

This is a warning, not a blocker.

# 54. Automatic Backup

Optional future feature.

Possible setting:

☑ Automatic backup on application close

However, do not implement automatic backup until the manual backup/restore system is reliable.

# 55. Backup Frequency

If automatic backup is implemented:

Daily
Weekly
Before Restore
Before Application Update

Keep the first implementation simple.

# 56. Data Reset

Do NOT expose a casual:

Delete All Data

button.

If a reset function is required during development, it should be hidden from normal users or protected behind an advanced confirmation.

# 57. Application Information

Settings should include an About section.

Example:

About

Gym Management System
Version 1.0.0

Database Version:
1

© 2026

# 58. Version Information

Display:

Application Version
Database Schema Version

These are useful for support and troubleshooting.

# 59. Settings Persistence

Settings must persist across application restarts.

Example:

User selects Dark Mode
        ↓
Save
        ↓
Close application
        ↓
Open application
        ↓
Dark Mode remains active

# 60. Settings Storage

Settings can be stored in SQLite.

Conceptually:

settings
---------
key
value
updated_at

or a strongly typed settings table.

The exact schema belongs to:

DATABASE-SPECIFICATION.md

# 61. Typed Settings

Prefer strongly typed settings in Rust.

Example concept:

```rust
AppSettings {
    gym_name
    phone
    address
    currency
    date_format
    time_format
    theme
    receipt_settings
    report_settings
}
```

Avoid passing arbitrary unvalidated strings throughout the application.

# 62. Settings Service

Recommended architecture:

Tauri Command
      ↓
Settings Service
      ↓
Settings Repository
      ↓
SQLite

# 63. Settings Repository

Responsible for:

Load settings
Save settings
Update settings
Reset individual settings

# 64. Settings Service

Responsible for:

Validate settings
Apply defaults
Normalize values
Persist settings
Return configuration

# 65. Frontend Responsibilities

Frontend handles:

Settings UI
Forms
Tabs
Preview
Validation messages
Save state
Loading state
Error state

The frontend should not directly modify SQLite.

# 66. Settings Loading

Application startup:

Application starts
       ↓
Load Settings
       ↓
Apply defaults
       ↓
Initialize UI

# 67. Settings Defaults

If no settings exist:

Gym Name:
My Gym

Currency:
PKR

Theme:
System

Date Format:
DD/MM/YYYY

Time Format:
12-hour

The exact default gym name can be changed during setup.

# 68. First-Run Setup

Optional but recommended.

On first launch:

Welcome
   ↓
Gym Name
   ↓
Phone / Address
   ↓
Currency
   ↓
Save
   ↓
Dashboard

Keep setup short.

Do not force users through a 20-step wizard.

# 69. Required First-Run Fields

Recommended:

Gym Name
Currency

Everything else can be skipped.

# 70. Unsaved Changes

If the user edits settings and navigates away:

You have unsaved changes.

[ Stay ] [ Discard ]

This prevents accidental loss.

# 71. Save Behavior

Two possible approaches:

Explicit Save
[ Save Changes ]

Recommended for grouped settings.

Immediate Save

Useful for:

Theme
Density

Either approach is acceptable, but behavior must be consistent.

# 72. Save Success

Show subtle feedback:

Settings saved.

Do not use disruptive dialogs for every successful save.

# 73. Save Error

Example:

Unable to save settings.

Your previous settings are still active.

[ Retry ]

# 74. Reset Setting

For configurable settings:

[ Reset to Default ]

This should only reset the selected setting/category.

Do not reset unrelated configuration.

# 75. Reset All Settings

If implemented:

[ Reset All Settings ]

must require strong confirmation.

It must NOT delete:

Members
Payments
Expenses
Receipts

Settings reset and database reset are different operations.

# 76. Gym Information and Historical Data

Changing gym name should affect future/current presentation.

It should NOT rewrite historical payment data.

For example:

Old receipt:
Gym Name = Previous Gym Name

Whether historical receipts are rendered using current or historical business information should be explicitly defined by the Receipts module.

Do not silently modify stored financial records.

# 77. Receipt Number Configuration

Changing receipt prefix:

RCPT-

to:

SWAT-

should affect future receipt numbers only.

Existing:

RCPT-000123

remains unchanged.

# 78. Settings Validation

All settings must be validated.

Examples:

Gym name:
Must not exceed configured maximum length.

Email:
Must be valid if provided.

Currency:
Must be supported.

Theme:
Must be one of supported themes.

Date format:
Must be one of supported formats.

# 79. Settings Tests — Persistence

Test:

Save setting
Close application
Reopen
Load setting

Expected:

Saved value is preserved.

# 80. Settings Tests — Defaults

Start with empty database.

Expected:

Default settings loaded.

# 81. Settings Tests — Currency

Set:

Currency = PKR

Expected:

Payments use PKR
Expenses use PKR
Finances use PKR
Reports use PKR
Receipts use PKR

# 82. Settings Tests — Theme

Set:

Theme = Dark

Restart application.

Expected:

Dark theme remains active.

# 83. Settings Tests — Date Format

Set:

DD/MM/YYYY

Expected:

26/08/2026

across all relevant UI.

# 84. Settings Tests — Gym Information

Set:

Gym Name = Swat Fitness Center
Phone = ...

Generate receipt.

Expected:

Swat Fitness Center
Phone

appear according to receipt configuration.

# 85. Settings Tests — Report

Set:

Show Logo = false

Generate report.

Expected:

Logo does not appear.

# 86. Settings Tests — Receipt

Set:

Receipt Title = PAYMENT RECEIPT
Footer = Thank you!

Generate receipt.

Expected:

Correct title
Correct footer

# 87. Settings Tests — Backup

Create test database.

Run backup.

Expected:

Backup file created
Backup is readable
Data exists in backup

# 88. Settings Tests — Restore

Create:

Database A

Backup it.

Modify data.

Restore backup.

Expected:

Database returns to backed-up state.

# 89. Settings Tests — Restore Safety

Before restore:

Current database contains data.

Attempt restore.

Expected:

Safety backup created
Restore occurs only after confirmation

# 90. Settings Tests — Invalid Backup

Select invalid database/file.

Expected:

Restore rejected
Current database remains untouched

# 91. Settings Tests — Incompatible Backup

Select backup from incompatible schema version.

Expected:

Restore rejected safely
Current data remains intact

# 92. Frontend Tests

Test:

[ ] Settings page renders
[ ] Categories render
[ ] Gym settings form works
[ ] General settings work
[ ] Receipt settings work
[ ] Report settings work
[ ] Appearance settings work
[ ] Backup action works
[ ] Restore action works
[ ] About section works
[ ] Save button works
[ ] Unsaved changes warning works
[ ] Reset works
[ ] Loading state works
[ ] Error state works
[ ] Success feedback works

# 93. Integration Tests

Test:

Settings
   ↓
Change currency
   ↓
Create payment
   ↓
Payment displays correct currency

Test:

Settings
   ↓
Change gym name
   ↓
Generate receipt
   ↓
Receipt uses configured gym name

Test:

Settings
   ↓
Change report configuration
   ↓
Generate report
   ↓
Report reflects configuration

# 94. Cross-Module Consistency

Settings are global.

The same configuration must be respected by:

Dashboard
Members
Membership Plans
Payments
Expenses
Finances
Receipts
Reports

where applicable.

# 95. No Module-Specific Configuration Duplication

Do NOT create:

Payment Currency
Finance Currency
Receipt Currency
Report Currency

Instead:

Application Currency
        ↓
All Modules

# 96. Error Handling

Settings errors should never crash the application.

Example:

Unable to load settings.
Default settings will be used.

[ Retry ]

If safe defaults exist, the application should remain usable.

# 97. Offline Requirement

All Settings functionality must work offline.

This includes:

Changing settings
Saving settings
Loading settings
Logo management
Backup
Restore
Receipt configuration
Report configuration
Theme

No cloud service should be required.

# 98. Performance

Settings are small.

They should load quickly.

Avoid repeatedly querying SQLite for every UI component.

Recommended:

Application Startup
       ↓
Load Settings
       ↓
Application State
       ↓
Modules consume configuration

# 99. Global Settings State

The frontend should have one centralized settings state/store.

Example concept:

Settings Store
    ↓
Header
Payments
Expenses
Receipts
Reports
Dashboard

Avoid each page independently loading its own settings unless there is a specific reason.

# 100. Backend Settings State

The Rust backend should remain authoritative.

The frontend state is a cached/UI representation.

If a setting is persisted:

Frontend
    ↓
Tauri Command
    ↓
Settings Service
    ↓
SQLite

# 101. Security

The Settings module should not expose raw database paths or internal implementation details unnecessarily.

For sensitive future settings:

Passwords
Encryption keys
Authentication secrets

do NOT store them as plain text.

These are outside the initial scope but the architecture should leave room for secure handling.

# 102. Advanced Settings

Do not expose advanced settings to normal users unless needed.

Possible future options:

Database diagnostics
Logging level
Developer mode
Database maintenance
Schema information

These should remain hidden from normal gym staff.

# 103. Logging

Settings changes may optionally be logged.

Example:

Theme changed
Currency changed
Receipt configuration changed

This is useful if multiple staff accounts are introduced later.

# 104. Application Information

About section:

Gym Management System

Version:
1.0.0

Database:
SQLite

Architecture:
Tauri + Rust + React

Do not expose unnecessary technical information to normal users.

# 105. Implementation Order

Implement in this order:

Define settings model
Define settings database schema
Define default values
Implement Settings Repository
Implement Settings Service
Add validation
Add backend tests
Implement Tauri commands
Implement frontend settings store
Implement General settings
Implement Gym Information
Implement Receipt settings
Implement Report settings
Implement Appearance
Implement About
Implement backup
Implement restore
Add safety backup
Add frontend tests
Add integration tests
Verify cross-module configuration
Test application restart persistence
Test restore failure scenarios
Polish UI

# 106. Definition of Done

The Settings module is complete when:

[ ] Settings page works
[ ] Settings are categorized clearly
[ ] Gym information can be configured
[ ] Currency can be configured
[ ] Date format can be configured
[ ] Time format can be configured
[ ] Theme can be configured
[ ] Receipt settings work
[ ] Report settings work
[ ] Logo can be configured if implemented
[ ] Settings persist after restart
[ ] Default settings work
[ ] Invalid settings are rejected
[ ] Unsaved changes are handled
[ ] Settings can be reset safely
[ ] Database backup works
[ ] Database restore works
[ ] Restore requires confirmation
[ ] Restore validates backup
[ ] Safety backup is created before restore
[ ] Invalid backups cannot overwrite current data
[ ] Application version is displayed
[ ] Database version is displayed
[ ] Backend tests pass
[ ] Frontend tests pass
[ ] Integration tests pass
[ ] Cross-module settings tests pass
[ ] No settings are duplicated across modules
[ ] No internet connection is required
[ ] No mock settings remain
[ ] Existing tests still pass

# 107. AI Coding Rules

Before modifying Settings, the AI agent MUST read:

[ ] ARCHITECTURE.md
[ ] DATABASE-SPECIFICATION.md
[ ] UI-UX-SYSTEM.md
[ ] PAYMENTS.md
[ ] EXPENSES.md
[ ] FINANCES.md
[ ] RECEIPTS.md
[ ] REPORTS.md

The AI agent MUST:

[ ] Keep global configuration centralized
[ ] Use Settings Service
[ ] Use Settings Repository
[ ] Validate settings in Rust
[ ] Persist settings safely
[ ] Provide sensible defaults
[ ] Add automated tests for every new setting
[ ] Test application restart persistence
[ ] Test cross-module behavior
[ ] Protect database restore
[ ] Create safety backup before restore
[ ] Validate backup compatibility
[ ] Reuse global formatting settings
[ ] Reuse global gym information
[ ] Keep settings simple

The AI agent MUST NOT:

[ ] Put settings logic directly into React components
[ ] Store duplicate currency settings per module
[ ] Hard-code gym information
[ ] Hard-code currency across modules
[ ] Modify historical financial records when settings change
[ ] Delete financial data during settings reset
[ ] Allow unsafe database restoration
[ ] Add cloud dependencies
[ ] Add unnecessary admin features
[ ] Add arbitrary configuration options
[ ] Skip tests

# 108. Final Principle

Settings should configure the application without becoming responsible for the application's business logic.

The architecture should look like:

```text
             ┌──────────────────┐
             │     SETTINGS     │
             │                  │
             │ Gym Information  │
             │ Currency         │
             │ Formatting       │
             │ Receipt Config   │
             │ Report Config    │
             │ Appearance       │
             └────────┬─────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Payments    Receipts    Reports
          │           │           │
          ▼           ▼           ▼
       Finances    Printing    Analysis
                      │
                      ▼
                  Dashboard
```

Settings provide configuration.

They do NOT become the owner of:

Payments
Expenses
Memberships
Financial calculations
Reports
Receipts
