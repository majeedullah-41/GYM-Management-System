import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LicenseInfoTab } from "./LicenseInfoTab";
import { ToastProvider } from "../../../components/feedback/ToastProvider";

const mocks = vi.hoisted(() => ({
  getLicenseStatus: vi.fn(),
  replaceLicense: vi.fn(),
  selectLicenseFile: vi.fn(),
  validateLicense: vi.fn(),
}));

vi.mock("../../../lib/api/license", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/api/license")>(
    "../../../lib/api/license",
  );
  return { ...actual, ...mocks };
});

const PERMANENT = {
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
  days_until_expiry: null,
};

const EXPIRING_SOON = {
  ...PERMANENT,
  license: { ...PERMANENT.license, license_type: "expiring", expires_at: "2026-10-01" },
  days_until_expiry: 3,
};

function renderTab() {
  return render(
    <ToastProvider>
      <LicenseInfoTab />
    </ToastProvider>,
  );
}

describe("LicenseInfoTab", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLicenseStatus.mockResolvedValue(PERMANENT);
  });

  it("always shows the vendor contact for license renewal", async () => {
    renderTab();
    const contact = await screen.findByTestId("license-renewal-contact");
    expect(contact).toHaveTextContent("For license renewal contact the vendor");
    expect(contact).toHaveTextContent("EagleNest Creations");
    expect(contact).toHaveTextContent("0334-3993049");
  });

  it("warns inside the tab when the license is about to expire", async () => {
    mocks.getLicenseStatus.mockResolvedValue(EXPIRING_SOON);
    renderTab();
    expect(await screen.findByTestId("license-expiry-warning")).toHaveTextContent(
      "expires in 3 days",
    );
  });

  it("shows no expiry warning for a permanent license", async () => {
    renderTab();
    expect(await screen.findByText("Permanent")).toBeInTheDocument();
    expect(screen.queryByTestId("license-expiry-warning")).not.toBeInTheDocument();
  });
});
