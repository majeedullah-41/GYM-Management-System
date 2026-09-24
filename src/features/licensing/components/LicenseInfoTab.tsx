import { useEffect, useRef, useState } from "react";
import { FolderOpen, RefreshCw, UploadCloud } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const busyRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const processLicenseFile = (file: File) => {
    if (busy || busyRef.current) return;

    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith(".gymlic") && !nameLower.endsWith(".txt")) {
      addToast({
        variant: "error",
        title: "Invalid file format",
        message: "Please upload a valid .gymlic license file.",
      });
      return;
    }

    busyRef.current = true;
    setBusy(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const contents = reader.result;
        if (typeof contents === "string" && contents.trim().length > 0) {
          await applyContents(contents);
        } else {
          addToast({
            variant: "error",
            title: "Empty license file",
            message: "The selected license file is empty.",
          });
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    };
    reader.onerror = () => {
      busyRef.current = false;
      setBusy(false);
      addToast({
        variant: "error",
        title: "Could not read file",
        message: "Failed to read the selected license file.",
      });
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (busy || busyRef.current) {
      e.target.value = "";
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      processLicenseFile(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (busy || busyRef.current) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processLicenseFile(file);
    }
  };

  const openBrowserFilePicker = () => {
    if (busy || busyRef.current) return;
    fileInputRef.current?.click();
  };

  const chooseFile = async () => {
    if (busy || busyRef.current) return;
    try {
      busyRef.current = true;
      setBusy(true);
      const contents = await selectLicenseFile();
      if (contents === null) return;
      if (!contents.trim()) {
        addToast({
          variant: "error",
          title: "Empty license file",
          message: "The selected license file is empty.",
        });
        return;
      }
      await applyContents(contents);
    } catch (err) {
      addToast({
        variant: "error",
        title: "Could not open file picker",
        message: err instanceof Error ? err.message : "Failed to open native file picker.",
      });
    } finally {
      busyRef.current = false;
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
        <div className="mb-4">
          <h3 className="text-base font-semibold text-text-primary">Upload License File</h3>
          <p className="text-sm text-text-muted">
            Upload your <code className="rounded bg-secondary-bg px-1.5 py-0.5 text-xs font-semibold text-text-primary">.gymlic</code> license file to activate or update Gym POS.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".gymlic,.txt"
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy && !busyRef.current) {
              setIsDragging(true);
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            if (!busy && !busyRef.current) {
              setIsDragging(true);
            }
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={openBrowserFilePicker}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.005]"
              : "border-border hover:border-primary/60 hover:bg-secondary-bg/40"
          } ${busy ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UploadCloud size={24} />
          </div>

          <p className="text-sm font-medium text-text-primary">
            Click to choose file or drag and drop here
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Supports <span className="font-semibold text-text-primary">.gymlic</span> license files
          </p>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4"
            loading={busy}
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              openBrowserFilePicker();
            }}
          >
            <FolderOpen size={14} />
            Browse file...
          </Button>
        </div>
      </div>
    </div>
  );
}