import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("../lib/api/auth", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/auth")>("../lib/api/auth");
  return {
    ...actual,
    getAuthStatus: vi.fn().mockResolvedValue({
      authenticated: true,
      user: {
        id: "user-1",
        username: "admin",
        security_question: null,
        uses_default_credentials: true,
        created_at: "2026-01-01T00:00:00Z",
        password_changed_at: "2026-01-01T00:00:00Z",
      },
    }),
    logout: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../lib/api/settings", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/settings")>("../lib/api/settings");
  return {
    ...actual,
    getAllSettings: vi.fn().mockResolvedValue({
      gym: { gym_name: "Gym POS", gym_logo: null, gym_address: null, gym_phone: null, gym_email: null, gym_website: null },
      receipt: { receipt_title: "RECEIPT", receipt_footer: null, show_phone: true, show_address: true, show_member_id: true, show_notes: true },
      print: { destination: "print_window", paper_width: "80", font_size: 11, show_gym_name: true, show_gym_phone: true, show_gym_address: true, show_receipt_title: true, show_receipt_number: true, show_date: true, show_member_info: true, show_plan_info: true, show_period: true, show_payment_details: true, show_remaining_balance: true, show_notes: true, show_footer: true },
      backup: { directory: null, daily_enabled: true, close_enabled: true, last_backup_at: null },
    }),
  };
});

describe("App", () => {
  it("should_render_sidebar_with_gym_pos_title", () => {
    render(<App />);
    expect(screen.getByText("Gym POS")).toBeInTheDocument();
  });

  it("should_render_all_navigation_items", async () => {
    render(<App />);
    expect((await screen.findAllByTestId("nav-dashboard")).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("nav-members").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("nav-finances").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("nav-reports").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("nav-settings").length).toBeGreaterThan(0);
  });

  it("should_navigate_to_members_page", async () => {
    render(<App />);
    await userEvent.click((await screen.findAllByTestId("nav-members"))[0]);
    expect(
      screen.getByRole("heading", { name: "Members" }),
    ).toBeInTheDocument();
  });

  it("should_navigate_to_settings_page", async () => {
    render(<App />);
    await userEvent.click((await screen.findAllByTestId("nav-settings"))[0]);
    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
  });
});
