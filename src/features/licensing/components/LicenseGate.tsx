import { type ReactNode } from "react";
import { FileKey2 } from "lucide-react";
import { useLicense } from "../hooks/useLicense";
import { ActivationPage } from "../pages/ActivationPage";

/**
 * Blocks the whole application until the backend confirms a valid license.
 * The authoritative check also guards every database command on the backend.
 */
export function LicenseGate({ children }: { children: ReactNode }) {
  const { status, response, loading, refresh } = useLicense();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary-bg p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface p-7 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
            <FileKey2 size={22} />
          </div>
          <p className="text-sm text-text-muted">Checking license...</p>
        </div>
      </div>
    );
  }

  if (status === "valid") return <>{children}</>;

  return (
    <ActivationPage
      status={status}
      hardwareId={response?.hardware_id ?? null}
      onActivated={async () => {
        await refresh();
      }}
    />
  );
}