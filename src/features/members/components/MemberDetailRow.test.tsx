import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemberDetailRow } from "./MemberDetailRow";
import type { MemberResponse } from "../../../lib/api/members";

const mocks = vi.hoisted(() => ({
  listMemberPayments: vi.fn(),
  getPaymentSummary: vi.fn(),
}));

vi.mock("../../../lib/api/payments", () => ({
  listMemberPayments: mocks.listMemberPayments,
  getPaymentSummary: mocks.getPaymentSummary,
}));

const member: MemberResponse = {
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
  monthly_fee: 2000,
  outstanding_balance: -4000,
  is_paid: true,
  created_at: "2026-06-25T10:00:00Z",
  updated_at: "2026-06-25T10:00:00Z",
};

function renderRow(overrides: Partial<MemberResponse> = {}) {
  return render(
    <MemberDetailRow
      member={{ ...member, ...overrides }}
      onPay={() => {}}
    />,
  );
}

function balanceCard(): HTMLElement {
  return screen.getByText(/^(Outstanding Balance|Advance Credit)$/).parentElement as HTMLElement;
}

describe("MemberDetailRow balance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listMemberPayments.mockResolvedValue([]);
  });

  afterEach(cleanup);

  it("shows a prepaid balance as a positive advance credit", async () => {
    renderRow();
    const card = await screen.findByText("Advance Credit").then(() => balanceCard());
    expect(within(card).getByText("Rs. 4,000")).toBeInTheDocument();
    expect(within(card).queryByText("Rs. -4,000")).not.toBeInTheDocument();
    expect(within(card).getByText("Paid ahead for upcoming periods")).toBeInTheDocument();
  });

  it("keeps showing outstanding dues with their sign", async () => {
    renderRow({ outstanding_balance: 2500, is_paid: false });
    await screen.findByText("Outstanding Balance");
    const card = balanceCard();
    expect(within(card).getByText("Rs. 2,500")).toBeInTheDocument();
    expect(within(card).getByText("Payment pending")).toBeInTheDocument();
  });

  it("keeps showing a settled balance as zero", async () => {
    renderRow({ outstanding_balance: 0 });
    await screen.findByText("Outstanding Balance");
    const card = balanceCard();
    expect(within(card).getByText("Rs. 0")).toBeInTheDocument();
    expect(within(card).getByText("All cleared")).toBeInTheDocument();
  });
});
