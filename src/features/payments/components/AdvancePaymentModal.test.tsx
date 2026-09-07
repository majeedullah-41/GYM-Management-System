import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../components/feedback/ToastProvider";
import type { AdvancePaymentPreview, PaymentResponse } from "../../../lib/api/payments";
import type { MemberResponse } from "../../../lib/api/members";
import { AdvancePaymentModal } from "./AdvancePaymentModal";

const mocks = vi.hoisted(() => ({
  previewAdvancePayment: vi.fn(),
  createAdvancePayment: vi.fn(),
}));

vi.mock("../../../lib/api/payments", () => ({
  previewAdvancePayment: mocks.previewAdvancePayment,
  createAdvancePayment: mocks.createAdvancePayment,
  PAYMENT_METHODS: ["Cash", "Bank Transfer", "Card", "Other"],
}));

vi.mock("../../receipts/components/ReceiptPreview", () => ({
  ReceiptPreview: () => null,
}));

const member = {
  id: "member-1",
  member_number: "MEM-00124",
  full_name: "Ali Khan",
} as MemberResponse;

function makePreview(overrides: Partial<AdvancePaymentPreview> = {}): AdvancePaymentPreview {
  return {
    member_id: "member-1",
    member_name: "Ali Khan",
    member_number: "MEM-00124",
    membership_plan_id: "plan-1",
    plan_name: "Monthly",
    fee: 2000,
    period_count: 3,
    paid_through: "2026-09-30",
    coverage_start: "2026-10-01",
    coverage_end: "2026-12-31",
    coverage_periods: [],
    outstanding_dues: 0,
    future_total: 6000,
    total: 6000,
    ...overrides,
  };
}

function makePayment(overrides: Partial<PaymentResponse> = {}): PaymentResponse {
  return {
    id: "pay-1",
    receipt_number: "RCP-000002",
    member_id: "member-1",
    member_name: "Ali Khan",
    member_number: "MEM-00124",
    amount: 6000,
    payment_method: "Cash",
    payment_date: "2026-09-06",
    membership_plan_id: "plan-1",
    membership_plan_name: "Monthly",
    membership_start_date: "2026-10-01",
    membership_expiry_date: "2026-12-31",
    description: null,
    reference: null,
    notes: null,
    is_voided: false,
    voided_at: null,
    void_reason: null,
    created_at: "2026-09-06T00:00:00Z",
    updated_at: "2026-09-06T00:00:00Z",
    allocations: [],
    ...overrides,
  };
}

function renderModal() {
  const onClose = vi.fn();
  const onPaymentRecorded = vi.fn();
  render(
    <ToastProvider>
      <AdvancePaymentModal
        isOpen
        onClose={onClose}
        member={member}
        onPaymentRecorded={onPaymentRecorded}
      />
    </ToastProvider>,
  );
  return { onClose, onPaymentRecorded };
}

describe("AdvancePaymentModal", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.previewAdvancePayment.mockImplementation((_memberId: string, count: number) =>
      Promise.resolve(makePreview({ period_count: count, future_total: 2000 * count, total: 2000 * count })),
    );
    mocks.createAdvancePayment.mockResolvedValue(makePayment());
  });

  it("displays member info and the authoritative preview", async () => {
    renderModal();
    expect(screen.getByText("Ali Khan")).toBeInTheDocument();
    expect(screen.getByText("MEM-00124")).toBeInTheDocument();
    expect(await screen.findByText(/3 × Rs\. 2,000 = Rs\. 6,000/)).toBeInTheDocument();
    expect(mocks.previewAdvancePayment).toHaveBeenCalledWith("member-1", 3);
  });

  it("previews each quick period count and a custom count", async () => {
    renderModal();
    expect(await screen.findByText(/3 × Rs\. 2,000 = Rs\. 6,000/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "1 Period" }));
    expect(await screen.findByText(/1 × Rs\. 2,000 = Rs\. 2,000/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "12 Periods" }));
    expect(await screen.findByText(/12 × Rs\. 2,000 = Rs\. 24,000/)).toBeInTheDocument();

    const custom = screen.getByRole("spinbutton", { name: "Custom Periods" });
    await userEvent.clear(custom);
    await userEvent.type(custom, "5");
    expect(await screen.findByText(/5 × Rs\. 2,000 = Rs\. 10,000/)).toBeInTheDocument();

    const calledCounts = mocks.previewAdvancePayment.mock.calls.map((c) => c[1]);
    expect(calledCounts).toContain(1);
    expect(calledCounts).toContain(12);
    expect(calledCounts).toContain(5);
  });

  it("confirms and creates the advance payment with the backend period count", async () => {
    renderModal();
    await userEvent.click(await screen.findByRole("button", { name: /Pay Rs\. 6,000/ }));

    expect(screen.getByText("Confirm Payment")).toBeInTheDocument();
    expect(screen.getByText("2026-10-01 → 2026-12-31")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Confirm Payment" }));
    expect(mocks.createAdvancePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        member_id: "member-1",
        period_count: 3,
        payment_method: "Cash",
      }),
    );
    expect(await screen.findByText("Advance Payment Received")).toBeInTheDocument();
  });

  it("prevents duplicate submission while processing", async () => {
    let resolveCreate: (value: PaymentResponse) => void = () => {};
    mocks.createAdvancePayment.mockReturnValue(
      new Promise<PaymentResponse>((resolve) => {
        resolveCreate = resolve;
      }),
    );
    renderModal();
    await userEvent.click(await screen.findByRole("button", { name: /Pay Rs\. 6,000/ }));
    const confirmButton = screen.getByRole("button", { name: "Confirm Payment" });
    await userEvent.click(confirmButton);

    expect(confirmButton).toBeDisabled();
    expect(mocks.createAdvancePayment).toHaveBeenCalledTimes(1);

    resolveCreate(makePayment());
    expect(await screen.findByText("Advance Payment Received")).toBeInTheDocument();
    expect(mocks.createAdvancePayment).toHaveBeenCalledTimes(1);
  });

  it("shows preview errors professionally and does not allow paying", async () => {
    mocks.previewAdvancePayment.mockRejectedValue(new Error("Member has no active membership"));
    renderModal();
    expect(
      await screen.findByText("Member has no active membership"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay" })).toBeDisabled();
  });
});