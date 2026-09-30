import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useLicenseInfo } from "../../../context/LicenseContext";
import { describeDaysRemaining } from "../../../lib/api/license";

/**
 * Header notification that the installed license is about to expire. Sits
 * directly under the top bar so it is visible from every page without covering
 * the gym title or the navigation. Dismissible for the current session only —
 * it returns the next time the app starts.
 */
export function LicenseExpiryNotice() {
  const { expiringSoon, daysUntilExpiry, expiresAt } = useLicenseInfo();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !expiringSoon || daysUntilExpiry === null) return null;

  return (
    <div
      role="status"
      data-testid="license-expiry-notice"
      className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-6 py-1.5 text-xs text-amber-900"
    >
      <AlertTriangle size={13} className="shrink-0 text-amber-600" />
      <p className="min-w-0 flex-1 truncate">
        <span className="font-semibold">
          Your Gym POS license {describeDaysRemaining(daysUntilExpiry)}.
        </span>{" "}
        {expiresAt
          ? `Renew it before ${expiresAt} in Settings → License to avoid losing access.`
          : "Renew it in Settings → License to avoid losing access."}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 text-amber-700 hover:text-amber-900"
        aria-label="Dismiss license expiry notice"
      >
        <X size={13} />
      </button>
    </div>
  );
}
