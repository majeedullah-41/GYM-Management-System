import { useEffect, useState } from "react";
import { FolderOpen, RefreshCw, Save } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../components/feedback/ToastProvider";
import {
  getLicenseStatus,
  replaceLicense,
  selectLicenseFile,
  validateLicense,
  LICENSE_STATUS_LABEL,
  type LicenseStatus,
} from "../../../lib/api/license";

export function LicenseInfoTab() {
  const { addToast } = useToast();
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [license, setLicense] = useState<
    | {
        license_id: string;
        customer_name: string;
        gym_name: string;
        license_type: string;
        issued_at: string;
        expires_at: string | null;
      }
    | null
  >(null);
  const [hardwareId, setHardwareId] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const result = await getLicenseStatus();
      setStatus(result.status);
      setLicense(result.license);
      setHardwareId(result.hardware_id);
    } catch (err) {
      addToast({
        variant: "error",
        title: "Could not read license",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const applyContents = async (contents: string) => {
    try {
      const result = await replaceLicense(contents);
      setStatus(result.status);
      setLicense(result.license);
      if (result.status === "valid") {
        addToast({ variant: "success", title: "License updated" });
      } else {
        addToast({
          variant: "error",
          title: "License rejected",
          message: LICENSE_STATUS_LABEL[result.status],
        });
      }
    } catch (err) {
      addToast({
        variant: "error",
        title: "Could not update license",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const chooseFile = async () => {
    try {
      setBusy(true);
      const contents = await selectLicenseFile();
      if (!contents) return;
      await applyContents(contents);
    } catch (err) {
      addToast({
        variant: "error",
        title: "Could not open license file",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  };

  const activatePasted = async () => {
    try {
      setBusy(true);
      await applyContents(pasted);
      setPasted("");
    } finally {
      setBusy(false);
    }
  };

  const revalidate = async () => {
    try {
      const result = await validateLicense();
      setStatus(result.status);
      setLicense(result.license);
      addToast({ variant: "info", title: LICENSE_STATUS_LABEL[result.status] });
    } catch (err) {
      addToast({
        variant: "error",
        title: "Validation failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const statusColor =
    status === "valid"
      ? "bg-green-50 text-green-700"
      : "bg-red-50 text-red-600";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-text-primary">License</h3>
            <p className="text-sm text-text-muted">
              Gym POS is protected by a hardware-bound license.
            </p>
          </div>
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>
            {status ? LICENSE_STATUS_LABEL[status] : "Checking..."}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-text-muted">Loading license details...</p>
        ) : (
          <>
            <div className="max-w-2xl space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">License ID</span>
                <span className="font-medium text-text-primary">{license?.license_id ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Customer</span>
                <span className="font-medium text-text-primary">{license?.customer_name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Gym</span>
                <span className="font-medium text-text-primary">{license?.gym_name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Type</span>
                <span className="font-medium capitalize text-text-primary">{license?.license_type ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Issued</span>
                <span className="font-medium text-text-primary">{license?.issued_at ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Expires</span>
                <span className="font-medium text-text-primary">{license?.expires_at ?? "Permanent"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Hardware ID</span>
                <code className="break-all text-right text-xs leading-5 text-text-primary">
                  {hardwareId ?? "—"}
                </code>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" loading={busy} onClick={chooseFile}>
                <FolderOpen size={14} />
                Replace License File...
              </Button>
              <Button type="button" variant="secondary" onClick={revalidate}>
                <RefreshCw size={14} />
                Re-check
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <h3 className="mb-1 text-base font-semibold text-text-primary">Activate from text</h3>
        <p className="mb-3 text-sm text-text-muted">
          If you received a license as text, paste it here.
        </p>
        <textarea
          data-testid="settings-license-paste"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          rows={5}
          placeholder='{"format":"GYMLIC","version":1,...}'
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
        />
        <Button
          type="button"
          className="mt-2"
          loading={busy}
          disabled={pasted.trim() === ""}
          onClick={activatePasted}
        >
          <Save size={14} />
          Activate License
        </Button>
      </div>
    </div>
  );
}