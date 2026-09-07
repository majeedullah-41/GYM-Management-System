import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LicenseGate } from "./LicenseGate";

const mocks = vi.hoisted(() => ({
  getLicenseStatus: vi.fn(),
}));

vi.mock("../../../lib/api/license", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/api/license")>("../../../lib/api/license");
  return {
    ...actual,
    getLicenseStatus: mocks.getLicenseStatus,
  };
});

const VALID = {
  status: "valid",
  license: {
    license_id: "LIC-DEV-000001",
    customer_name: "Dev",
    gym_name: "Dev Gym",
    license_type: "permanent",
    issued_at: "2026-09-07",
    expires_at: null,
  },
  hardware_id: "a".repeat(64),
};

describe("LicenseGate", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when the license is valid", async () => {
    mocks.getLicenseStatus.mockResolvedValue(VALID);
    render(<LicenseGate><div>Dashboard</div></LicenseGate>);
    expect(mocks.getLicenseStatus).toHaveBeenCalled();
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
  });

  it("shows the activation page when the license is missing", async () => {
    mocks.getLicenseStatus.mockResolvedValue({
      status: "missing",
      license: null,
      hardware_id: "b".repeat(64),
    });
    render(<LicenseGate><div>Dashboard</div></LicenseGate>);
    expect(await screen.findByRole("heading", { name: "Activation required" })).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("shows the activation page when the license is expired", async () => {
    mocks.getLicenseStatus.mockResolvedValue({
      status: "expired",
      license: null,
      hardware_id: "c".repeat(64),
    });
    render(<LicenseGate><div>Dashboard</div></LicenseGate>);
    expect(await screen.findByRole("heading", { name: "Activation required" })).toBeInTheDocument();
    expect(await screen.findByText(/has expired/i)).toBeInTheDocument();
  });
});
