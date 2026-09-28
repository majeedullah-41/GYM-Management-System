import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../components/feedback/ToastProvider";
import { NavigationContext } from "../../../components/layout/NavigationContext";
import { PaymentsPage } from "./PaymentsPage";

const mocks = vi.hoisted(() => ({
  listPayments: vi.fn(),
  listMembers: vi.fn(),
  listActivePlans: vi.fn(),
  navigateBack: vi.fn(),
}));

vi.mock("../../../lib/api/payments", () => ({
  listPayments: mocks.listPayments,
  voidPayment: vi.fn(),
  updatePayment: vi.fn(),
  PAYMENT_METHODS: ["Cash", "Bank Transfer", "Card", "Other"],
}));

vi.mock("../../../lib/api/members", () => ({
  listMembers: mocks.listMembers,
}));

vi.mock("../../../lib/api/membership-plans", () => ({
  listActivePlans: mocks.listActivePlans,
}));

vi.mock("../../receipts/components/ReceiptPreview", () => ({
  ReceiptPreview: () => null,
}));

vi.mock("../components/RecordPaymentModal", () => ({
  RecordPaymentModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div>
        <div>Record Payment Modal</div>
        <button onClick={onClose}>Cancel</button>
        <button onClick={onClose}>Done</button>
      </div>
    ) : null,
}));

const navigation = {
  navigateTo: vi.fn(),
  navigateToMember: vi.fn(),
  navigateBack: mocks.navigateBack,
  openAddMember: vi.fn(),
  openRecordPayment: vi.fn(),
  openPaymentForMember: vi.fn(),
};

function renderPage(initialMemberId: string | null) {
  return render(
    <ToastProvider>
      <NavigationContext.Provider value={navigation}>
        <PaymentsPage initialMemberId={initialMemberId} />
      </NavigationContext.Provider>
    </ToastProvider>,
  );
}

describe("PaymentsPage return navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listPayments.mockResolvedValue([]);
    mocks.listMembers.mockResolvedValue([]);
    mocks.listActivePlans.mockResolvedValue([]);
  });

  afterEach(cleanup);

  it("returns to the originating page when a payment flow finishes", async () => {
    renderPage("member-1");
    expect(await screen.findByText("Record Payment Modal")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(mocks.navigateBack).toHaveBeenCalled();
  });

  it("returns to the originating page when a payment flow is cancelled", async () => {
    renderPage("member-1");
    await screen.findByText("Record Payment Modal");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mocks.navigateBack).toHaveBeenCalled();
  });
});
