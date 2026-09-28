import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../components/feedback/ToastProvider";
import { MembersPage } from "./MembersPage";
import type { MemberResponse } from "../../../lib/api/members";

const mocks = vi.hoisted(() => ({
  listMembers: vi.fn(),
  listActivePlans: vi.fn(),
  getMemberFormSettings: vi.fn(),
}));

vi.mock("../../../lib/api/members", () => ({
  listMembers: mocks.listMembers,
  listMemberAddresses: vi.fn().mockResolvedValue([]),
  createMember: vi.fn(),
  updateMember: vi.fn(),
  archiveMember: vi.fn(),
  unarchiveMember: vi.fn(),
  permanentlyDeleteMember: vi.fn(),
}));

vi.mock("../../../lib/api/membership-plans", () => ({
  listActivePlans: mocks.listActivePlans,
}));

vi.mock("../../../lib/api/settings", () => ({
  getMemberFormSettings: mocks.getMemberFormSettings,
}));

vi.mock("../components/MemberDetailRow", () => ({
  MemberDetailRow: () => null,
}));

function member(overrides: Partial<MemberResponse> = {}): MemberResponse {
  return {
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
    outstanding_balance: 0,
    is_paid: true,
    created_at: "2026-06-25T10:00:00Z",
    updated_at: "2026-06-25T10:00:00Z",
    ...overrides,
  };
}

function balanceCell(name: string): HTMLElement {
  const row = screen.getByText(name).closest("tr") as HTMLElement;
  const cells = within(row).getAllByRole("cell");
  return cells[cells.length - 2];
}

function statCard(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

function renderPage(members: MemberResponse[]) {
  mocks.listMembers.mockResolvedValue(members);
  return render(
    <ToastProvider>
      <MembersPage />
    </ToastProvider>,
  );
}

describe("MembersPage balance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listActivePlans.mockResolvedValue([]);
    mocks.getMemberFormSettings.mockResolvedValue({ visible_fields: [] });
  });

  afterEach(cleanup);

  it("shows the negative balance of a member who prepaid upcoming periods", async () => {
    renderPage([member({ outstanding_balance: -4000, is_paid: true })]);
    expect(await screen.findByText("Ahmad Khan")).toBeInTheDocument();
    expect(within(balanceCell("Ahmad Khan")).getByText("Rs. -4,000")).toBeInTheDocument();
    expect(within(balanceCell("Ahmad Khan")).queryByText("Rs. 0")).not.toBeInTheDocument();
  });

  it("keeps showing dues for members who owe money", async () => {
    renderPage([member({ outstanding_balance: 2500, is_paid: false })]);
    expect(await screen.findByText("Ahmad Khan")).toBeInTheDocument();
    expect(within(balanceCell("Ahmad Khan")).getByText("Rs. 2,500")).toBeInTheDocument();
  });

  it("counts a prepaid member as paid and keeps gym dues from being netted down", async () => {
    renderPage([
      member({ outstanding_balance: -4000, is_paid: true }),
      member({ id: "member-2", member_number: "GYM-000002", full_name: "Bilal Khan", outstanding_balance: 1000, is_paid: false }),
    ]);
    expect(await screen.findByText("Bilal Khan")).toBeInTheDocument();

    // "Paid Status" KPI counts the prepaid member, "Unpaid / Dues" does not.
    expect(within(statCard("Paid Status")).getByText("1")).toBeInTheDocument();
    expect(within(statCard("Unpaid / Dues")).getByText("1")).toBeInTheDocument();
    // Gym-wide outstanding stays at the dues only, not 1000 - 4000.
    const outstanding = within(statCard("Outstanding"));
    expect(outstanding.getByText("Rs. 1,000")).toBeInTheDocument();
    expect(outstanding.queryByText("Rs. -3,000")).not.toBeInTheDocument();
  });
});
