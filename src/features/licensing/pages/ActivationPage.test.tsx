import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActivationPage } from "./ActivationPage";

const mocks = vi.hoisted(() => ({
  importLicense: vi.fn(),
  selectLicenseFile: vi.fn(),
}));

vi.mock("../../../lib/api/license", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/api/license")>(
    "../../../lib/api/license",
  );
  return {
    ...actual,
    importLicense: mocks.importLicense,
    selectLicenseFile: mocks.selectLicenseFile,
  };
});

const HWID = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";
const LICENSE_TEXT = '{"format":"GYMLIC","version":1}';

describe("ActivationPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const onActivated = vi.fn().mockResolvedValue(undefined);

  it("shows the hardware id for the customer to send to the provider", () => {
    render(<ActivationPage status="missing" hardwareId={HWID} onActivated={onActivated} />);
    expect(screen.getByTestId("hardware-id")).toHaveTextContent(HWID);
    expect(screen.getAllByRole("button", { name: /Copy/i }).length).toBeGreaterThan(0);
  });

  it("imports a license chosen from the file dialog", async () => {
    mocks.selectLicenseFile.mockResolvedValue(LICENSE_TEXT);
    mocks.importLicense.mockResolvedValue({
      status: "valid",
      license: null,
      hardware_id: HWID,
    });
    render(<ActivationPage status="missing" hardwareId={HWID} onActivated={onActivated} />);
    await userEvent.click(screen.getByRole("button", { name: /Choose license file/i }));
    await vi.waitFor(() => {
      expect(mocks.selectLicenseFile).toHaveBeenCalled();
      expect(mocks.importLicense).toHaveBeenCalledWith(LICENSE_TEXT);
    });
    expect(onActivated).toHaveBeenCalled();
  });

  it("shows a problem message and keeps the gate closed for a mismatched license", async () => {
    mocks.selectLicenseFile.mockResolvedValue(LICENSE_TEXT);
    mocks.importLicense.mockResolvedValue({
      status: "hardware_mismatch",
      license: null,
      hardware_id: HWID,
    });
    const onActivated = vi.fn().mockResolvedValue(undefined);
    render(
      <ActivationPage status="hardware_mismatch" hardwareId={HWID} onActivated={onActivated} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Choose license file/i }));
    expect(await screen.findByTestId("activation-message")).toHaveTextContent(
      /different computer/i,
    );
    expect(onActivated).not.toHaveBeenCalled();
  });

  it("processes a dropped .gymlic file and notifies the gate", async () => {
    mocks.importLicense.mockResolvedValue({
      status: "valid",
      license: {
        license_id: "LIC-X",
        customer_name: "X",
        gym_name: "G",
        license_type: "permanent",
        issued_at: "2026-09-07",
        expires_at: null,
      },
      hardware_id: HWID,
    });
    render(<ActivationPage status="missing" hardwareId={HWID} onActivated={onActivated} />);
    const file = new File([LICENSE_TEXT], "club.gymlic", { type: "application/octet-stream" });
    const dropzone = screen.getByText(/Drop your license file here/i).closest("div");
    expect(dropzone).not.toBeNull();

    fireEvent.drop(dropzone!, {
      dataTransfer: {
        files: [file],
      },
    });

    await vi.waitFor(() => {
      expect(mocks.importLicense).toHaveBeenCalledWith(LICENSE_TEXT);
    });
    expect(onActivated).toHaveBeenCalled();
  });

  it("rejects non-.gymlic files dropped into the zone", async () => {
    render(<ActivationPage status="missing" hardwareId={HWID} onActivated={onActivated} />);
    const file = new File(["some text"], "license.txt", { type: "text/plain" });
    const dropzone = screen.getByText(/Drop your license file here/i).closest("div");

    fireEvent.drop(dropzone!, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(await screen.findByTestId("activation-message")).toHaveTextContent(
      /Invalid file format/i,
    );
    expect(mocks.importLicense).not.toHaveBeenCalled();
  });
});
