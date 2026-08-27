# Gym POS — Progress

## Phase 0: Project Initialization
- [x] Tauri 2 + React + TypeScript + Rust + SQLite scaffold
- [x] Rename project to gym-pos
- [x] SQLite dependency (rusqlite bundled)
- [x] Remove template plugin
- [x] Frontend build passes (tsc + vite)
- [x] Lint + prettier configured
- [x] Vitest configured
- [x] cargo check passes
- [x] Production build verified (MSI + NSIS)
- [x] Git repository initialized
- [x] Folder structure created

## Phase 1: Architecture Foundation
- [x] Rust deps (uuid, chrono, thiserror, log, env_logger)
- [x] Database connection + migration system + initial schema (6 tables)
- [x] Error architecture (AppError enum)
- [x] Models for all entities (Member, MembershipPlan, Payment, Expense, Receipt)
- [x] Date utilities + currency formatter
- [x] Wire up DB + logging in lib.rs
- [x] Rust tests (8 pass)

## Phase 2: Application Shell & UI Kit
- [x] Tailwind CSS v4 + lucide-react installed
- [x] Design tokens configured (colors, spacing, fonts, radii from doc 05)
- [x] Sidebar navigation with icons + active state
- [x] State-based routing (5 pages)
- [x] 12 reusable UI components (Button, Input, Select, Modal, Dialog, Badge, Card, Table, PageHeader, EmptyState, LoadingState, ErrorState)
- [x] Toast notification system (context + useToast hook)
- [x] Tauri IPC wrapper (invokeCommand)
- [x] TypeScript types for all domain models
- [x] 5 placeholder pages (Dashboard, Members, Finances, Reports, Settings)
- [x] Frontend tests (4 pass)
- [x] Lint + typecheck + build clean

## Phase 3: Membership Plans (Core Feature)
- [x] DTOs (CreatePlanRequest, UpdatePlanRequest, PlanResponse)
- [x] Repository layer — SQL only (create, get_by_id, list, list_active, update, exists_by_name)
- [x] Service layer — business logic (create, get, list, update, deactivate + validation)
- [x] Tauri commands — thin IPC (create_plan, get_plan, list_plans, list_active_plans, update_plan, deactivate_plan)
- [x] Commands wired into lib.rs invoke_handler
- [x] Rust tests — 31 pass (4 DB + 4 formatting + 9 repository + 14 service)
- [x] Frontend API layer (lib/api/membership-plans.ts)
- [x] Frontend utils (lib/utils/format.ts — formatCurrency, formatDuration)
- [x] Settings page — full plans management UI (table, create/edit modal, deactivate dialog, toasts)
- [x] Frontend lint + typecheck + tests pass
- [x] Full verification: cargo check ✓, cargo test (31/31) ✓, lint ✓, tsc ✓, vitest (4/4) ✓

## Phase 4: Members (CRUD, Search, Filtering)
- [x] DTOs (CreateMemberRequest, UpdateMemberRequest, MemberResponse with membership info)
- [x] Repository layer — SQL only (create, get_by_id, list, search, next_member_number, update, archive)
- [x] Service layer — business logic (create, get, list, update, archive + membership status computation)
- [x] Tauri commands — thin IPC (create_member, get_member, list_members, update_member, archive_member)
- [x] Commands wired into lib.rs invoke_handler
- [x] Rust tests — 55 pass (+24 member tests: 10 repo + 14 service)
- [x] Frontend API layer (lib/api/members.ts)
- [x] MembersPage — full UI (search, status filter, member table, create/edit modal, archive dialog, toast notifications)
- [x] Frontend lint + typecheck + tests pass
- [x] Full verification: cargo check ✓, cargo test (55/55) ✓, lint ✓, tsc ✓, vitest (4/4) ✓

## Phase 5: Payment System (Core Feature)
- [x] DTOs (CreatePaymentRequest, PaymentResponse with member/plan names)
- [x] Repository layer — SQL only (create, get_by_id, list, list_by_member, total_paid_for_plan, next_receipt_number + search, date filtering)
- [x] Service layer — business logic (create_payment with validation + atomic receipt generation, get/list payments, member payment history)
- [x] Tauri commands — thin IPC (create_payment, get_payment, list_payments, list_member_payments)
- [x] Commands wired into lib.rs invoke_handler
- [x] Rust tests — 79 pass (+24 payment tests: 11 repository + 14 service)
- [x] Frontend API layer (lib/api/payments.ts)
- [x] RecordPaymentModal — payment form (plan selection, amount, method, date, notes, plan summary)
- [x] PaymentsPage — payment history with search + date range filtering (today/week/month/year)
- [x] MembersPage — added "Record Payment" button per member row
- [x] AppShell routing updated — Finances tab now shows PaymentsPage
- [x] Frontend lint + typecheck + tests pass
- [x] Full verification: cargo check ✓, cargo test (79/79) ✓, lint ✓, tsc ✓, vitest (4/4) ✓

## Phase 6: Receipt System
- [x] Receipt DTO (ReceiptResponse with gym info, member info, payment info)
- [x] Receipt repository (create, get_by_payment_id, get_by_receipt_number, next_receipt_number)
- [x] Settings repository (get_gym_settings for receipt header info)
- [x] Receipt service (auto-create receipt on payment, get receipt by payment ID or receipt number)
- [x] Tauri commands (get_receipt_by_payment_id, get_receipt_by_number)
- [x] Rust tests — 88 pass (+9 receipt tests: 5 receipt repo + 4 receipt service)
- [x] Frontend API layer (lib/api/receipts.ts)
- [x] ReceiptPreview component — full printable receipt (gym header, member details, plan, payment, period)
- [x] PaymentsPage — "Receipt" button per payment row
- [x] RecordPaymentModal — shows receipt preview after successful payment
- [x] Frontend lint + typecheck + tests pass
- [x] Full verification: cargo check ✓, cargo test (88/88) ✓, lint ✓, tsc ✓, vitest (4/4) ✓

## Phase 7: Expenses
- [x] DTOs (CreateExpenseRequest, UpdateExpenseRequest, ExpenseResponse + EXPENSE_CATEGORIES constant)
- [x] Repository layer — SQL only (create, get_by_id, update, delete, list, total_by_date_range + search, category, date filtering)
- [x] Service layer — business logic (create, get, update, delete, list, total + validation: amount > 0, valid category, valid date)
- [x] Tauri commands (create_expense, get_expense, update_expense, delete_expense, list_expenses, total_expenses)
- [x] Commands wired into lib.rs invoke_handler
- [x] Rust tests — 111 pass (+23 expense tests: 12 repository + 11 service)
- [x] Frontend API layer (lib/api/expenses.ts)
- [x] ExpensesPage — full UI (search, category filter, date range filter, expense table, create/edit modal, delete dialog)
- [x] FinancesPage — tabbed wrapper (Payments / Expenses tabs)
- [x] AppShell routing updated — Finances tab shows FinancesPage with tabs
- [x] Frontend lint + typecheck + tests pass
- [x] Full verification: cargo check ✓, cargo test (111/111) ✓, lint ✓, tsc ✓, vitest (4/4) ✓

## Phase 8: Dashboard KPIs
- [x] Dashboard DTO (DashboardSummary — 8 KPIs + recent payments)
- [x] Dashboard service — SQL queries for member counts, revenue, expenses, net income
- [x] Tauri command (get_dashboard_summary)
- [x] Rust tests — 114 pass (+3 dashboard tests)
- [x] Frontend API layer (lib/api/dashboard.ts)
- [x] DashboardPage — 8 stat cards (Total, Active, Expiring, Expired, Today Revenue, Monthly Revenue, Monthly Expenses, Net Income) + recent payments table
- [x] Frontend lint + typecheck + tests pass
- [x] Full verification: cargo check ✓, cargo test (114/114) ✓, lint ✓, tsc ✓, vitest (4/4) ✓

## Phase 9: Reports
- [x] Report DTOs (ReportRequest, ReportResponse enum, FinancialReport, PaymentReport, ExpenseReport, MemberReport, MembershipStatusReport)
- [x] Repository layer — SQL queries for all 5 report types (financial, payment, expense, member, membership_status + date/category/method filtering)
- [x] Service layer — business logic with validation (valid report types, date formats, payment methods)
- [x] Tauri command (generate_report)
- [x] Commands wired into lib.rs invoke_handler
- [x] Rust tests — 133 pass (+19 report tests: 9 repository + 10 service)
- [x] Frontend API layer (lib/api/reports.ts)
- [x] ReportsPage — full UI (5 report tabs, 8 date presets, custom date range, per-report filters, Generate button)
  - Financial: 4 summary cards + revenue by method + expenses by category
  - Payment: count/amount summary + payment detail table
  - Expense: count/amount summary + expense detail table
  - Member: 5 status count cards
  - Membership Status: active/expiring/expired member lists
- [x] Frontend lint + typecheck + build pass
- [x] Full verification: cargo check ✓, cargo test (133/133) ✓, tsc ✓, vite build ✓

## Phase 9.5: Partial Payments & Outstanding Balances
- [x] Backend: New repository functions (total_paid_for_period, get_current_period, get_total_outstanding)
- [x] Backend: PaymentSummary DTO (plan_price, previously_paid, outstanding, membership dates)
- [x] Backend: get_payment_summary Tauri command
- [x] Backend: Updated create_payment — validates against outstanding, allows partial payments, reuses existing period dates
- [x] Backend: Dashboard DTO — added total_outstanding KPI
- [x] Backend: ReceiptResponse — added remaining_balance field (calculated from plan price - total paid for period)
- [x] Backend: MemberResponse — added outstanding_balance field
- [x] Rust tests — 138 pass (+5 new tests: partial payment, overpayment rejection, payment summary, summary with no payments, multiple partial payments)
- [x] Frontend: PaymentSummary type + getPaymentSummary API
- [x] Frontend: RecordPaymentModal — shows plan price, previously paid, outstanding, amount, remaining after payment
- [x] Frontend: DashboardPage — 5th KPI card "Outstanding" (amber/green based on amount)
- [x] Frontend: ReceiptPreview — shows "Remaining Balance" in orange when > 0
- [x] Frontend: print.html — prints remaining balance on receipt
- [x] Frontend: MembersPage — added "Balance" column (orange when > 0, dash when paid)
- [x] Frontend lint + typecheck + build pass
- [x] Full verification: cargo check ✓, cargo test (138/138) ✓, tsc ✓, vite build ✓

## Member Detail Page
- [x] Page type extended with "member-detail" variant
- [x] MemberDetailPage — member info card (name, father, phone, CNIC, gender, DOB, address, notes)
- [x] MemberDetailPage — membership card (plan, status, start/expiry dates, price, paid, outstanding)
- [x] MemberDetailPage — payment history table (receipt #, date, amount, method, period, outstanding)
- [x] AppShell routing — supports member-detail with sidebar hidden + back navigation
- [x] MembersPage — row click navigates to MemberDetailPage
- [x] MembersPage — action buttons (Pay/Edit/Archive) stop propagation
- [x] Frontend lint + typecheck + build pass

## Module Gap Improvements

### 01-Dashboard
- [x] Quick Actions (Add Member, Receive Payment, Add Expense)
- [x] Membership Overview (progress bar with green/amber/red)
- [x] Expiring Members (days remaining badges, outstanding, click-to-navigate)
- [x] Recent Members (avatar initials, member numbers, status badges, View All link)
- [x] Loading skeletons, empty states, error state with retry
- [x] NavigationContext for cross-page navigation
- [x] Dashboard DTO — added expiring_members, recent_members fields
- [x] Rust tests — 141 pass (+3 new: expiring members, recent members, empty dashboard)

### 02-Members
- [x] Plan filter dropdown (populated from active plans)
- [x] Sort by columns (Member #, Name, Phone, Plan, Expiry, Balance)
- [x] Pagination (20/page)
- [x] Show Archived toggle + Reactivate button
- [x] Unarchive backend (repository + service + command)
- [x] Rust tests — 144 pass (+1 new: unarchive)

### 04-Finances
- [x] Migration 002_add_payment_void (is_voided, voided_at, void_reason)
- [x] Void Payment (reason textarea + destructive confirm)
- [x] Payment method filter
- [x] KPI cards (Today's Income, This Week, This Month, Total Transactions)
- [x] Valid/Voided status badges, voided rows dimmed
- [x] Pagination (20/page)
- [x] Rust tests — 148 pass (+3 new: void, exclude voided, prevent double-void)

### 06-Expenses
- [x] Migration 003_add_expense_fields (payment_method, vendor, is_deleted, deleted_at)
- [x] More categories (Water, Gas, Internet, Staff, Marketing — 13 total)
- [x] Payment method + vendor fields on expense form
- [x] Soft delete + restore
- [x] Expense payment method validation
- [x] Rust tests — 152 pass (+4 new: restore, reject double-delete, accept valid methods, reject invalid method)

### 03-Membership Plans
- [x] Member count per plan (counts distinct members via payments table)
- [x] Reactivate plan (backend + frontend)
- [x] Deactivate rejects already-inactive; reactivate rejects already-active
- [x] Status filter dropdown
- [x] Description column, Members column, Free label for zero-price
- [x] Rust tests — 152 pass (+4 new: reactivate, reject reactivate active, reject deactivate inactive, count members)

### 09-Settings
- [x] GymSettings DTO (name, phone, address, email, website)
- [x] ReceiptSettings DTO (title, footer, show_phone, show_address, show_member_id, show_notes)
- [x] Settings repository CRUD via key-value table
- [x] Receipt service respects show_* toggles
- [x] Commands: get_all_settings, save_gym_settings, save_receipt_settings, backup_database
- [x] Database backup using SQLite backup API
- [x] Tabbed SettingsPage (Gym Info, Plans, Receipts, Data & Backup + About)
- [x] Rust tests — 154 pass (+2 new: receipt show_phone=false, show_notes=false)
