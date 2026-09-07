import { useState } from "react";
import { ClipboardCopy, FileKey2, FolderOpen } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import {
  importLicense,
  selectLicenseFile,
  type LicenseStatus,
} from "../../../lib/api/license";

const PROBLEM_MESSAGE: Partial<Record<LicenseStatus, string>> = {
  expired: "This license has expired. Contact your provider for a renewal.",
  hardware_mismatch:
    "This license belongs to a different computer. If you replaced your hardware, ask your provider for a new license.",
  invalid_signature: "The installed license file is invalid and could not be verified.",
  corrupted: "The installed license file is corrupt.",
  unsupported_version: "The installed license file uses an unsupported version.",
};

export function ActivationPage({
  status,
  hardwareId,
  onActivated,
}: {
  status: LicenseStatus | null;
  hardwareId: string | null;
  onActivated: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [pasted, setPasted] = useState("");
  const [message, setMessage] = useState<{ variant: "error" | "success"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const copyHwid = async () => {
    if (!hardwareId) return;
    try {
      await navigator.clipboard.writeText(hardwareId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleResult = (nextStatus: LicenseStatus) => {
    if (nextStatus === "valid") {
      setMessage({ variant: "success", text: "License activated successfully." });
      void onActivated().catch(() => {});
    } else {
      setMessage({ variant: "error", text: PROBLEM_MESSAGE[nextStatus] ?? "The license file could not be used." });
    }
  };

  const chooseFile = async () => {
    try {
      setBusy(true);
      setMessage(null);
      const contents = await selectLicenseFile();
      if (!contents || contents.trim() === "") return;
      handleResult((await importLicense(contents)).status);
    } catch (err) {
      setMessage({ variant: "error", text: err instanceof Error ? err.message : "Could not import the license file." });
    } finally {
      setBusy(false);
    }
  };

  const activatePasted = async () => {
    if (pasted.trim() === "") return;
    try {
      setBusy(true);
      setMessage(null);
      handleResult((await importLicense(pasted)).status);
    } catch (err) {
      setMessage({ variant: "error", text: err instanceof Error ? err.message : "Could not activate the license." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary-bg p-6">
      <div className="w-full max-w-xl rounded-xl border border-border bg-surface p-7 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
            <FileKey2 size={22} />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Activation required</h1>
          <p className="mt-1 text-sm text-text-muted">
            Gym POS is not activated on this computer.
          </p>
        </div>

        {status && PROBLEM_MESSAGE[status] && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {PROBLEM_MESSAGE[status]}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Your Hardware ID
            </label>
            <div className="flex gap-2">
              <code
                data-testid="hardware-id"
                className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-secondary-bg px-3 py-2 text-xs text-text-primary"
              >
                {hardwareId ?? "—"}
              </code>
              <Button type="button" variant="secondary" onClick={copyHwid} disabled={!hardwareId}>
                <ClipboardCopy size={14} />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-text-muted">
              Send this ID to your Gym POS provider. You will receive a license file (.gymlic).
            </p>
          </div>

          <div className="border-t border-border pt-5">
            <Button type="button" variant="secondary" className="w-full" loading={busy} onClick={chooseFile}>
              <FolderOpen size={14} />
              Choose license file...
            </Button>
          </div>

          <div className="border-t border-border pt-5">
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Or paste the license text
            </label>
            <textarea
              data-testid="license-paste"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              rows={5}
              placeholder='{"format":"GYMLIC","version":1,...}'
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
            />
            <Button type="button" className="mt-2 w-full" loading={busy} disabled={pasted.trim() === ""} onClick={activatePasted}>
              Activate
            </Button>
          </div>

          {message && (
            <p
              data-testid="activation-message"
              className={`text-sm ${message.variant === "error" ? "text-danger" : "text-green-600"}`}
            >
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}