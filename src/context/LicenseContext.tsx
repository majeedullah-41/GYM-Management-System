import { createContext, useContext, type ReactNode } from "react";
import { isExpiringSoon, type LicenseStatusResponse } from "../lib/api/license";

interface LicenseInfoValue {
  /** Days of validity left for an expiring license, `null` for a permanent one. */
  daysUntilExpiry: number | null;
  /** True when a working license is inside the expiry warning window. */
  expiringSoon: boolean;
  /** Expiry date of the installed license, for display only. */
  expiresAt: string | null;
}

const LicenseInfoContext = createContext<LicenseInfoValue>({
  daysUntilExpiry: null,
  expiringSoon: false,
  expiresAt: null,
});

/**
 * Shares the one authoritative license check with the app chrome, so the header
 * can warn about an upcoming expiry without making its own licensing call. Only
 * `LicenseGate` provides this; Rust remains the authority on what is valid.
 */
export function LicenseProvider({
  response,
  children,
}: {
  response: LicenseStatusResponse | null;
  children: ReactNode;
}) {
  const daysUntilExpiry = response?.days_until_expiry ?? null;
  return (
    <LicenseInfoContext.Provider
      value={{
        daysUntilExpiry,
        expiringSoon: isExpiringSoon(response?.status, daysUntilExpiry),
        expiresAt: response?.license?.expires_at ?? null,
      }}
    >
      {children}
    </LicenseInfoContext.Provider>
  );
}

export function useLicenseInfo() {
  return useContext(LicenseInfoContext);
}
