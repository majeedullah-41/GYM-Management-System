import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "./AuthGate";

const mocks = vi.hoisted(() => ({
  getAuthStatus: vi.fn(),
  getRecoveryQuestion: vi.fn(),
  login: vi.fn(),
  getAllSettings: vi.fn(),
}));

vi.mock("../../lib/api/auth", () => ({
  getAuthStatus: mocks.getAuthStatus,
  getRecoveryQuestion: mocks.getRecoveryQuestion,
  login: mocks.login,
  resetPassword: vi.fn(),
  verifyRecoveryAnswer: vi.fn(),
}));

vi.mock("../../lib/api/settings", () => ({
  getAllSettings: mocks.getAllSettings,
}));

const admin = {
  id: "user-1",
  username: "admin",
  security_question: null,
  uses_default_credentials: true,
  created_at: "2026-01-01T00:00:00Z",
  password_changed_at: "2026-01-01T00:00:00Z",
};

describe("AuthGate", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthStatus.mockResolvedValue({ authenticated: false, user: null });
    mocks.getAllSettings.mockResolvedValue({
      gym: { gym_name: "GOLD GYM", gym_tagline: "Train Today Be Better", gym_logo: null },
    });
  });

  it("shows login first with admin prefilled and no account creation fields", async () => {
    render(<AuthGate>{() => <div>Dashboard</div>}</AuthGate>);
    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveValue("admin");
    expect(screen.getByLabelText("Show Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Security question")).not.toBeInTheDocument();
    expect(screen.queryByText("Create Account")).not.toBeInTheDocument();
  });

  it("displays configured gym slogan and name from settings", async () => {
    mocks.getAllSettings.mockResolvedValue({
      gym: {
        gym_name: "TITAN FITNESS",
        gym_tagline: "Unleash Your Strength",
        gym_logo: null,
      },
    });
    render(<AuthGate>{() => <div>Dashboard</div>}</AuthGate>);
    expect(await screen.findByText("TITAN FITNESS")).toBeInTheDocument();
    expect(await screen.findByText("Unleash Your Strength")).toBeInTheDocument();
    expect(screen.getByText("Sign in to continue to TITAN FITNESS")).toBeInTheDocument();
  });

  it("logs in with the default credentials", async () => {
    mocks.login.mockResolvedValue(admin);
    render(<AuthGate>{() => <div>Dashboard</div>}</AuthGate>);
    await userEvent.type(await screen.findByLabelText("Password"), "admin");
    await userEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(mocks.login).toHaveBeenCalledWith({ username: "admin", password: "admin" });
  });

  it("shows a safe message when recovery is not configured", async () => {
    mocks.getRecoveryQuestion.mockResolvedValue({ recovery_available: false, security_question: null });
    render(<AuthGate>{() => <div>Dashboard</div>}</AuthGate>);
    await userEvent.click(await screen.findByRole("button", { name: "Forgot Password?" }));
    expect(await screen.findByText("Password recovery is unavailable.")).toBeInTheDocument();
  });
});
