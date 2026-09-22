import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { GymProvider } from "../../context/GymContext";
import type { AuthUser } from "../../lib/api/auth";

vi.mock("../../lib/api/settings", () => ({
  getAllSettings: vi.fn().mockResolvedValue({
    gym: {
      gym_name: "Power Fitness Club",
      gym_tagline: "Be Strong",
      gym_logo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      gym_address: null,
      gym_phone: null,
      gym_email: null,
      gym_website: null,
    },
    receipt: {
      receipt_title: "RECEIPT",
      receipt_footer: null,
      show_phone: true,
      show_address: true,
      show_member_id: true,
      show_notes: true,
    },
    print: {
      destination: "print_window",
      paper_width: "80",
      font_size: 11,
      show_gym_name: true,
      show_gym_logo: true,
      show_gym_tagline: true,
      show_gym_phone: true,
      show_gym_address: true,
      show_receipt_title: true,
      show_receipt_number: true,
      show_date: true,
      show_member_info: true,
      show_plan_info: true,
      show_period: true,
      show_amount_received: true,
      show_method: true,
      show_received_by: true,
      show_remaining_balance: true,
      show_notes: true,
      show_footer: true,
    },
    backup: {
      directory: null,
      daily_enabled: true,
      close_enabled: true,
      last_backup_at: null,
    },
  }),
}));

vi.mock("../../lib/api/license", () => ({
  getLicenseStatus: vi.fn().mockResolvedValue({
    status: "valid",
    license: {
      license_id: "LIC-123",
      customer_name: "Owner",
      gym_name: "Power Fitness Club",
      license_type: "permanent",
      issued_at: "2026-09-01",
      expires_at: null,
    },
    hardware_id: "hwid123",
  }),
}));

const mockUser: AuthUser = {
  id: "user-1",
  username: "admin",
  security_question: null,
  uses_default_credentials: false,
  created_at: "2026-01-01T00:00:00Z",
  password_changed_at: "2026-01-01T00:00:00Z",
};

describe("Gym layout branding", () => {
  it("renders gym logo and name in sidebar header", async () => {
    render(
      <GymProvider>
        <Sidebar
          currentPage="dashboard"
          username="admin"
          onLogout={async () => {}}
          onNavigate={() => {}}
        />
      </GymProvider>,
    );

    expect(await screen.findByText("Power Fitness Club")).toBeInTheDocument();
    expect(screen.getByText("Be Strong")).toBeInTheDocument();
    const logoImg = screen.getByAltText("Power Fitness Club");
    expect(logoImg).toBeInTheDocument();
    expect(logoImg.getAttribute("src")).toContain("data:image/png;base64");
  });

  it("renders gym name in topbar", async () => {
    render(
      <GymProvider>
        <TopBar currentPage="dashboard" user={mockUser} />
      </GymProvider>,
    );

    expect(await screen.findByText("Power Fitness Club")).toBeInTheDocument();
  });
});
