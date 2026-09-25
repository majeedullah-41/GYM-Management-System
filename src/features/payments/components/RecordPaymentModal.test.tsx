import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../components/feedback/ToastProvider";
import { RecordPaymentModal } from "./RecordPaymentModal";
import type { PaymentSummary, PaymentResponse } from "../../../lib/api/payments";
import type { MemberResponse } from "../../../lib/api/members";
import type { PlanResponse } from "../../../lib/api/membership-plans";

const mocks = vi.hoisted(() => ({
  createPayment: vi.fn(),
  getPaymentSummary: vi.fn(),
  listMemberPayments: vi.fn(),
  listMembers: vi.fn(),
  listActivePlans: vi.fn(),
  getPaymentFormSettings: vi.fn(),
}));

vi.mock("../../../lib/api/payments", () => ({
  createPayment: mocks.createPayment,
  getPaymentSummary: mocks.getPaymentSummary,
  listMemberPayments: mocks.listMemberPayments,
  PAYMENT_METHODS: ["Cash", "Bank Transfer", "Card", "Other"],
}));

vi.mock("../../../lib/api/members", () => ({
  listMembers: mocks.listMembers,
}));

vi.mock("../../../lib/api/membership-plans", () => ({
  listActivePlans: mocks.listActivePlans,
}));

vi.mock("../../../lib/api/settings", () => ({
  getPaymentFormSettings: mocks.getPaymentFormSettings,
}));

vi.mock("../../receipts/components/ReceiptPreview", () => ({
  ReceiptPreview: () => null,
}));

const mockMember: MemberResponse = {
  id: "member-1",
  member_number: "GYM-000001",
  full_name: "Ahmad Khan",
  father_name: null,
  gender: "Male",
  phone: "03001234567",
  cnic: null,
  address: null,
  date_of_birth: null,
  blood_group: null,
  notes: null,
  is_archived: false,
  admission_date: "2026-06-25",
  membership_plan_id: "plan-1",
  membership_plan_name: "Monthly Plan",
  membership_start_date: "2026-06-25",
  membership_expiry_date: null,
  membership_status: "active",
  monthly_fee: 1000,
  outstanding_balance: 4000,
  is_paid: false,
  created_at: "2026-06-25T10:00:00Z",
  updated_at: "2026-06-25T10:00:00Z",
};

const mockPlan: PlanResponse = {
  id: "plan-1",
  name: "Monthly Plan",
  price: 1000,
  duration_days: 30,
  description: null,
  is_active: true,
  member_count: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const today = new Date().toISOString().split("T")[0];

const mockSummaryWithPastDuesAndCurrent: PaymentSummary = {
  plan_price: 1000,
  back_due: 3000,
  new_period_due: 1000,
  previously_paid: 0,
  outstanding: 4000,
  is_first_payment: false,
  membership_start_date: "2026-06-25",
  membership_expiry_date: null,
  previous_dues: 3000,
  current_month_fee: 1000,
  bills: [
    {
      id: "bill-past-1",
      membership_id: "ms-1",
      membership_plan_id: "plan-1",
      billing_period: "2026-06",
      period_start: "2026-06-25",
      period_end: "2026-07-24",
      due_date: "2026-07-24",
      expected_amount: 1000,
      paid_amount: 0,
      discount_amount: 0,
      remaining_amount: 1000,
      status: "DUE",
    },
    {
      id: "bill-past-2",
      membership_id: "ms-1",
      membership_plan_id: "plan-1",
      billing_period: "2026-07",
      period_start: "2026-07-25",
      period_end: "2026-08-24",
      due_date: "2026-08-24",
      expected_amount: 1000,
      paid_amount: 0,
      discount_amount: 0,
      remaining_amount: 1000,
      status: "DUE",
    },
    {
      id: "bill-past-3",
      membership_id: "ms-1",
      membership_plan_id: "plan-1",
      billing_period: "2026-08",
      period_start: "2026-08-25",
      period_end: "2026-09-24",
      due_date: "2026-09-24",
      expected_amount: 1000,
      paid_amount: 0,
      discount_amount: 0,
      remaining_amount: 1000,
      status: "DUE",
    },
    {
      id: "bill-current",
      membership_id: "ms-1",
      membership_plan_id: "plan-1",
      billing_period: "2026-09",
      period_start: today,
      period_end: "2026-10-24",
      due_date: "2026-10-24",
      expected_amount: 1000,
      paid_amount: 0,
      discount_amount: 0,
      remaining_amount: 1000,
      status: "CURRENT",
    },
  ],
};

describe("RecordPaymentModal period selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listMembers.mockResolvedValue([mockMember]);
    mocks.listActivePlans.mockResolvedValue([mockPlan]);
    mocks.listMemberPayments.mockResolvedValue([]);
    mocks.getPaymentFormSettings.mockResolvedValue({
      visible_fields: ["amount", "method", "date", "summary", "notes"],
    });
    mocks.getPaymentSummary.mockResolvedValue(mockSummaryWithPastDuesAndCurrent);
  });

  afterEach(() => {
    cleanup();
  });

  it("defaults to selecting only current month when past dues exist", async () => {
    render(
      <ToastProvider>
        <RecordPaymentModal
          isOpen={true}
          onClose={() => {}}
          initialMemberId="member-1"
          onPaymentRecorded={() => {}}
        />
      </ToastProvider>,
    );

    // Outstanding due shows Rs. 4,000
    expect(await screen.findByText("Rs. 4,000")).toBeInTheDocument();

    // Default amount input is prefilled with 1000 (current month only!), NOT 4000
    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    expect(amountInput.value).toBe("1000");

    // Notice banner informs user about the unselected past dues
    expect(
      screen.getByText(/will remain outstanding as Due/i),
    ).toBeInTheDocument();
  });

  it("pays ONLY the current month and excludes past dues on submit", async () => {
    const user = userEvent.setup();
    const onRecorded = vi.fn();
    const fakePayment: PaymentResponse = {
      id: "pay-new",
      receipt_number: "RCP-000007",
      member_id: "member-1",
      member_name: "Ahmad Khan",
      member_number: "GYM-000001",
      amount: 1000,
      discount_amount: 0,
      payment_method: "Cash",
      payment_date: today,
      membership_plan_id: "plan-1",
      membership_plan_name: "Monthly Plan",
      membership_start_date: today,
      membership_expiry_date: "2026-10-24",
      payment_month: null,
      description: null,
      reference: null,
      notes: null,
      is_voided: false,
      voided_at: null,
      void_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      allocations: [],
    };
    mocks.createPayment.mockResolvedValue(fakePayment);

    render(
      <ToastProvider>
        <RecordPaymentModal
          isOpen={true}
          onClose={() => {}}
          initialMemberId="member-1"
          onPaymentRecorded={onRecorded}
        />
      </ToastProvider>,
    );

    await screen.findByText("Rs. 4,000");

    // Click Record Payment button
    const recordBtn = screen.getByRole("button", { name: /^record payment$/i });
    await user.click(recordBtn);

    // Verify createPayment received ONLY the bill-current id!
    expect(mocks.createPayment).toHaveBeenCalledTimes(1);
    expect(mocks.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        member_id: "member-1",
        membership_plan_id: "plan-1",
        amount: 1000,
        bill_ids: ["bill-current"],
      }),
    );
  });

  it("allows selecting all periods using the select-all checkbox to charge past dues too", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <RecordPaymentModal
          isOpen={true}
          onClose={() => {}}
          initialMemberId="member-1"
          onPaymentRecorded={() => {}}
        />
      </ToastProvider>,
    );

    await screen.findByText("Rs. 4,000");

    // Click select-all checkbox in table header
    const selectAllCheckbox = screen.getByTitle(/select all/i);
    await user.click(selectAllCheckbox);

    // Amount input should now update to 4000
    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    expect(amountInput.value).toBe("4000");

    // Submit payment
    mocks.createPayment.mockResolvedValue({ id: "pay-all" });
    const recordBtn = screen.getByRole("button", { name: /^record payment$/i });
    await user.click(recordBtn);

    // Verify createPayment received all 4 bill IDs
    expect(mocks.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 4000,
        bill_ids: ["bill-past-1", "bill-past-2", "bill-past-3", "bill-current"],
      }),
    );
  });

  it("only pays marked periods when individual checkboxes are toggled", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <RecordPaymentModal
          isOpen={true}
          onClose={() => {}}
          initialMemberId="member-1"
          onPaymentRecorded={() => {}}
        />
      </ToastProvider>,
    );

    await screen.findByText("Rs. 4,000");

    // Initially only current month (1000) is selected
    // Click the row for 2026-06 to also mark it
    const pastRow = screen.getByText(/25 Jun 2026 to 24 Jul 2026/i);
    await user.click(pastRow);

    // Amount should now be 2000 (two marked periods)
    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    expect(amountInput.value).toBe("2000");

    // Submit payment
    mocks.createPayment.mockResolvedValue({ id: "pay-two" });
    const recordBtn = screen.getByRole("button", { name: /^record payment$/i });
    await user.click(recordBtn);

    // Verify createPayment received only the marked periods
    expect(mocks.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2000,
        bill_ids: ["bill-current", "bill-past-1"],
      }),
    );
  });
});
