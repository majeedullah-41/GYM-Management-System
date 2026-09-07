import { useCallback, useEffect, useState } from "react";
import {
  getLicenseStatus,
  type LicenseStatus,
  type LicenseStatusResponse,
} from "../../../lib/api/license";

/**
 * Tracks the backend license state. On any fetch failure the state defaults to
 * a non-valid status so the UI never unlocks without an authoritative check.
 */
export function useLicense() {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [response, setResponse] = useState<LicenseStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<LicenseStatusResponse> => {
    const result = await getLicenseStatus();
    setResponse(result);
    setStatus(result.status);
    setLoading(false);
    return result;
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      setStatus("missing");
      setLoading(false);
    });
  }, [refresh]);

  return { status, response, loading, refresh };
}