import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { LicenseExpiryNotice } from "./LicenseExpiryNotice";
import { LicenseProvider } from "../../../context/LicenseContext";
import {
  describeDaysRemaining,
  LICENSE_EXPIRY_WARNING_DAYS,
  type LicenseStatusResponse,
} from "../../../lib/api/license";

function response(overrides: Partial<LicenseStatusResponse> = {}): LicenseStatusResponse {
  return {
    status: "valid",
    license: {
      license_id: "LIC-DEV-000001",
      customer_name: "Dev",
      gym_name: "Dev Gym",
      license_type: "expiring",
      issued_at: "2026-01-01",
      expires_at: "2026-10-01",
    },
    hardware_id: "a".repeat(64),
    days_until_expiry: 3,
    ...overrides,
  };
}

function renderNotice(value: LicenseStatusResponse | null) {
  return render(
    <LicenseProvider response={value}>
      <LicenseExpiryNotice />
    </LicenseProvider>,
  );
}

describe("LicenseExpiryNotice", () => {
  afterEach(cleanup);

  it("warns when the license expires within a week", () => {
    renderNotice(response({ days_until_expiry: 3 }));
    const notice = screen.getByTestId("license-expiry-notice");
    expect(notice).toHaveTextContent("expires in 3 days");
    expect(notice).toHaveTextContent("2026-10-01");
  });

  it("warns on the last day of the warning window", () => {
    renderNotice(response({ days_until_expiry: LICENSE_EXPIRY_WARNING_DAYS }));
    expect(screen.getByTestId("license-expiry-notice")).toBeInTheDocument();
  });

  it("stays silent for a permanent license", () => {
    renderNotice(response({ days_until_expiry: null, license: null }));
    expect(screen.queryByTestId("license-expiry-notice")).not.toBeInTheDocument();
  });

  it("stays silent while the license has plenty of time left", () => {
    renderNotice(response({ days_until_expiry: LICENSE_EXPIRY_WARNING_DAYS + 1 }));
    expect(screen.queryByTestId("license-expiry-notice")).not.toBeInTheDocument();
  });

  it("stays silent for a non-valid license, which the gate handles instead", () => {
    renderNotice(response({ status: "expired", days_until_expiry: -1 }));
    expect(screen.queryByTestId("license-expiry-notice")).not.toBeInTheDocument();
  });

  it("stays silent when the license state is still unknown", () => {
    renderNotice(null);
    expect(screen.queryByTestId("license-expiry-notice")).not.toBeInTheDocument();
  });

  it("can be dismissed", async () => {
    renderNotice(response({ days_until_expiry: 1 }));
    await userEvent.click(
      screen.getByRole("button", { name: /dismiss license expiry notice/i }),
    );
    expect(screen.queryByTestId("license-expiry-notice")).not.toBeInTheDocument();
  });
});

describe("describeDaysRemaining", () => {
  it("phrases the remaining days for the user", () => {
    expect(describeDaysRemaining(0)).toBe("expires today");
    expect(describeDaysRemaining(1)).toBe("expires tomorrow");
    expect(describeDaysRemaining(5)).toBe("expires in 5 days");
  });
});
