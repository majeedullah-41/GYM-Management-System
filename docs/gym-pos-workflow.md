# Gym POS — Member Enrollment & Payment Workflow

## 1. Overview
This document describes the required workflow for member enrollment, plan assignment, and fee/payment tracking in the Gym POS system. Follow this exactly when implementing the "Add Member" and "Payments" features.

---

## 2. Add Member Flow

### Step 1: Basic Member Info
- User fills standard member details (name, contact, CNIC, etc. — as already defined in schema).

### Step 2: Plan Selection
- User selects a **Plan** from a dropdown.
- Plans are dynamic, not hardcoded — examples: `General`, `Cardio`, `Strength`, etc.
- Each plan has a **fixed monthly fee** associated with it (defined when the plan is created/managed elsewhere in the system).

### Step 3: Admission Fee (Optional)
- User has a checkbox/toggle: **"Charge Admission Fee"**.
- If enabled, user enters/confirms admission fee amount and it's charged **once**, at enrollment time only.
- If disabled, skip — no admission fee record created.

### Step 4: Enrollment Finalization
- On save:
  - Member record is created and linked to the selected plan.
  - Member's recurring monthly fee = selected plan's monthly fee.
  - If admission fee was charged, log it as a one-time payment (type: `admission`).
  - Initial due status is calculated based on enrollment date (i.e., first month's fee becomes due immediately, unless already paid as part of enrollment — clarify with client if enrollment includes first month payment or not).

---

## 3. Member Section (List View)

- Table/list of all members showing at minimum:
  - Name
  - Plan
  - Status (Active / Inactive / Defaulter, etc.)
  - Pending Dues (amount)
- **Clicking a member row expands an inline dropdown/accordion** (NOT a page navigation, NOT a modal — inline expansion within the same list).
  - Expanded view shows:
    - Full member details
    - **Fee history** (list of all past payments: date, amount, type — admission/monthly, method)
    - **Pending dues** (breakdown: which month(s) unpaid, total amount)

---

## 4. Payments Section

### 4.1 Payment Record Display
- All payments (admission + monthly fees) logged and visible here.
- Each entry shows: member name, plan, amount, date, payment type (admission/monthly), and covered period (e.g., "August 2026").

### 4.2 Fee Submission Flow
When a user wants to record a member's fee payment:
1. User selects/searches the member.
2. System **automatically displays**:
   - Last fee submission (date, amount, period covered)
   - Current pending dues (total amount + which period(s) are unpaid)
3. User enters the payment amount and confirms.
4. System updates:
   - Marks the relevant period as paid.
   - Recalculates and updates pending dues.
   - Adds new entry to payment history.
   - Updates member status in the Member Section (e.g., clears "Defaulter" flag if dues become zero).

---

## 5. Data/State Requirements (for agent's reference)

- **Member** must store: `plan_id`, `enrollment_date`, `admission_fee_charged (bool)`, `status`.
- **Plan** must store: `name`, `monthly_fee`.
- **Payment** must store: `member_id`, `amount`, `date`, `type (admission | monthly)`, `period_covered` (e.g. month/year), `payment_method (optional)`.
- **Dues calculation**: derived/computed field — NOT manually entered. Calculate based on (months since enrollment × monthly fee) − (sum of monthly payments made), plus admission fee if unpaid.

---

## 6. Key UX Rules (do not violate)
- Member detail view = **inline expansion**, never a separate page or route.
- Admission fee is **one-time only**, tied to enrollment — not recurring.
- Payment section must **always show last payment + current dues** before/during new fee submission — this is not optional, it's required context for the user recording the payment.
- Plans and their monthly fees are **configurable**, not hardcoded in the enrollment logic.
