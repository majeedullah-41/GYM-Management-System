import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";
import { useNavigation } from "./NavigationContext";
import type { AuthUser } from "../../lib/api/auth";

vi.mock("../../lib/api/settings", () => ({
  getAllSettings: vi.fn().mockResolvedValue({
    gym: { gym_name: "GOLD GYM", gym_tagline: null, gym_logo: null },
  }),
}));

vi.mock("../../lib/api/auth", () => ({
  logout: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../features/dashboard/pages/DashboardPage", () => ({
  DashboardPage: () => <div>Dashboard page</div>,
}));

vi.mock("../../features/reports/pages/ReportsPage", () => ({
  ReportsPage: () => <div>Reports page</div>,
}));

vi.mock("../../features/finances/pages/FinancesPage", () => ({
  FinancesPage: () => <div>Finances page</div>,
}));

vi.mock("../../features/settings/pages/SettingsPage", () => ({
  SettingsPage: () => <div>Settings page</div>,
}));

vi.mock("../../features/members/pages/MembersPage", () => ({
  MembersPage: ({ initialExpandedId }: { initialExpandedId?: string | null }) => {
    const { openPaymentForMember } = useNavigation();
    return (
      <div>
        <div>Members page</div>
        <div>expanded: {initialExpandedId ?? "none"}</div>
        <button onClick={() => openPaymentForMember("member-1")}>Pay</button>
      </div>
    );
  },
}));

vi.mock("../../features/payments/pages/PaymentsPage", () => ({
  PaymentsPage: ({ initialMemberId }: { initialMemberId?: string | null }) => {
    const { navigateBack } = useNavigation();
    return (
      <div>
        <div>Payments page</div>
        <div>paying: {initialMemberId ?? "none"}</div>
        <button onClick={navigateBack}>Done</button>
      </div>
    );
  },
}));

const user: AuthUser = {
  id: "user-1",
  username: "admin",
  security_question: null,
  uses_default_credentials: true,
  created_at: "2026-01-01T00:00:00Z",
  password_changed_at: "2026-01-01T00:00:00Z",
};

function renderShell() {
  return render(
    <AppShell user={user} onSignedOut={() => {}} onUserUpdated={() => {}} />,
  );
}

describe("AppShell return navigation", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("brings the user back to the page a flow started from", async () => {
    renderShell();
    await userEvent.click((await screen.findAllByTestId("nav-members"))[0]);
    expect(await screen.findByText("Members page")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Pay" }));
    expect(await screen.findByText("Payments page")).toBeInTheDocument();
    expect(screen.getByText("paying: member-1")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(await screen.findByText("Members page")).toBeInTheDocument();
  });

  it("returns to the page and reopens the member the flow started from", async () => {
    renderShell();
    await userEvent.click((await screen.findAllByTestId("nav-members"))[0]);
    await userEvent.click(await screen.findByRole("button", { name: "Pay" }));
    await userEvent.click(await screen.findByRole("button", { name: "Done" }));
    expect(await screen.findByText("expanded: member-1")).toBeInTheDocument();
  });

  it("stays put when the page was opened directly, with no flow to return to", async () => {
    renderShell();
    await userEvent.click((await screen.findAllByTestId("nav-payments"))[0]);
    expect(await screen.findByText("Payments page")).toBeInTheDocument();
    expect(screen.getByText("paying: none")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByText("Payments page")).toBeInTheDocument();
  });

  it("drops the return target once the user navigates elsewhere", async () => {
    renderShell();
    await userEvent.click((await screen.findAllByTestId("nav-members"))[0]);
    await userEvent.click(await screen.findByRole("button", { name: "Pay" }));
    expect(await screen.findByText("Payments page")).toBeInTheDocument();

    await userEvent.click((await screen.findAllByTestId("nav-reports"))[0]);
    expect(await screen.findByText("Reports page")).toBeInTheDocument();

    await userEvent.click((await screen.findAllByTestId("nav-payments"))[0]);
    await userEvent.click(await screen.findByRole("button", { name: "Done" }));
    expect(screen.getByText("Payments page")).toBeInTheDocument();
  });
});
