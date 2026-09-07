import { invokeCommand } from "../tauri";

export type LicenseStatus =
  | "valid"
  | "missing"
  | "corrupted"
  | "invalid_signature"
  | "hardware_mismatch"
  | "expired"
  | "unsupported_version";

export interface LicenseInfo {
  license_id: string;
  customer_name: string;
  gym_name: string;
  license_type: string;
  issued_at: string;
  expires_at: string | null;
}

export interface LicenseStatusResponse {
  status: LicenseStatus;
  license: LicenseInfo | null;
  hardware_id: string;
}

export async function getLicenseStatus(): Promise<LicenseStatusResponse> {
  return invokeCommand<LicenseStatusResponse>("get_license_status");
}

export async function getHardwareId(): Promise<string> {
  return invokeCommand<string>("get_hardware_id");
}

export async function importLicense(contents: string): Promise<LicenseStatusResponse> {
  return invokeCommand<LicenseStatusResponse>("import_license", { contents });
}

export async function replaceLicense(contents: string): Promise<LicenseStatusResponse> {
  return invokeCommand<LicenseStatusResponse>("replace_license", { contents });
}

export async function selectLicenseFile(): Promise<string | null> {
  return invokeCommand<string | null>("select_license_file");
}

export async function validateLicense(): Promise<LicenseStatusResponse> {
  return invokeCommand<LicenseStatusResponse>("validate_license");
}

export const LICENSE_STATUS_LABEL: Record<LicenseStatus, string> = {
  valid: "Active",
  missing: "No license installed",
  corrupted: "License file is corrupt",
  invalid_signature: "License signature is invalid",
  hardware_mismatch: "License does not match this computer",
  expired: "License has expired",
  unsupported_version: "License version is not supported",
};