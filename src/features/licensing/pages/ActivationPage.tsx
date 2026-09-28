import { useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ClipboardCopy,
  FileKey2,
  FolderOpen,
  Lock,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { importLicense, selectLicenseFile, type LicenseStatus } from "../../../lib/api/license";

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
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<{ variant: "error" | "success"; text: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyHwid = async () => {
    if (!hardwareId) return;
    try {
      await navigator.clipboard.writeText(hardwareId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleResult = (nextStatus: LicenseStatus) => {
    if (nextStatus === "valid") {
      setMessage({
        variant: "success",
        text: "License activated successfully! Welcome to Gym POS.",
      });
      void onActivated().catch(() => {});
    } else {
      setMessage({
        variant: "error",
        text: PROBLEM_MESSAGE[nextStatus] ?? "The license file could not be verified or applied.",
      });
    }
  };

  const applyLicenseContent = async (contents: string) => {
    try {
      setBusy(true);
      setMessage(null);
      const res = await importLicense(contents);
      handleResult(res.status);
    } catch (err) {
      setMessage({
        variant: "error",
        text: err instanceof Error ? err.message : "Could not import the license file.",
      });
    } finally {
      setBusy(false);
    }
  };

  const chooseFile = async () => {
    if (busy) return;
    try {
      setBusy(true);
      setMessage(null);
      const contents = await selectLicenseFile();
      if (!contents) {
        setBusy(false);
        return;
      }
      if (contents.trim() === "") {
        setMessage({ variant: "error", text: "The selected license file is empty." });
        setBusy(false);
        return;
      }
      const res = await importLicense(contents);
      handleResult(res.status);
    } catch {
      // In web browser or when native picker throws, fallback to browser file input
      setBusy(false);
      fileInputRef.current?.click();
      return;
    } finally {
      setBusy(false);
    }
  };

  const processLicenseFile = (file: File) => {
    if (busy) return;

    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith(".gymlic")) {
      setMessage({
        variant: "error",
        text: "Invalid file format. Please select an authentic .gymlic license file.",
      });
      return;
    }

    setBusy(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const contents = reader.result;
        if (typeof contents === "string" && contents.trim().length > 0) {
          await applyLicenseContent(contents);
        } else {
          setMessage({
            variant: "error",
            text: "The selected license file is empty.",
          });
          setBusy(false);
        }
      } catch (err) {
        setMessage({
          variant: "error",
          text: err instanceof Error ? err.message : "Could not read the license file.",
        });
        setBusy(false);
      }
    };

    reader.onerror = () => {
      setMessage({
        variant: "error",
        text: "Failed to read the selected license file.",
      });
      setBusy(false);
    };

    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processLicenseFile(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processLicenseFile(file);
    }
  };

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center p-4 sm:p-6 overflow-hidden select-none"
      style={{
        background: `
          radial-gradient(circle at 12% 18%, rgba(200, 230, 212, 0.45) 0%, transparent 40%),
          radial-gradient(circle at 88% 82%, rgba(200, 230, 212, 0.45) 0%, transparent 45%),
          radial-gradient(circle at 50% 50%, rgba(246, 250, 247, 0.95) 0%, #edf6f0 100%)
        `,
      }}
    >
      {/* Decorative ambient background accents */}
      <div className="pointer-events-none absolute -left-20 top-1/4 h-96 w-96 rounded-full border-[40px] border-emerald-900/[0.03]" />
      <div className="pointer-events-none absolute -right-20 top-10 h-[480px] w-[480px] rounded-full border-[50px] border-emerald-900/[0.03]" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-80 w-80 rounded-full border-[35px] border-emerald-900/[0.02]" />

      {/* Main Activation Card */}
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-white/90 bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(23,97,63,0.12)]">
        {/* Top Header */}
        <div className="text-center">
          <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#17613f] to-[#258557] text-white shadow-lg shadow-emerald-900/20 ring-4 ring-emerald-500/10">
            <ShieldCheck size={28} />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/60 mb-2">
            <Lock size={12} className="text-emerald-700" />
            <span>Hardware-Bound Security</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Activation required</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Gym POS is not activated on this computer. Follow the two simple steps below to activate
            with your license file.
          </p>
        </div>

        {/* Existing Problem / Error Banner */}
        {status && PROBLEM_MESSAGE[status] && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-sm text-amber-900 shadow-sm">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="leading-snug">
              <span className="font-semibold block mb-0.5">License Notice</span>
              {PROBLEM_MESSAGE[status]}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {/* STEP 1: Hardware ID */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition-all hover:border-slate-300">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17613f] text-[11px] font-bold text-white shadow-sm">
                  1
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  Your Machine Hardware ID
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400">Unique Identifier</span>
            </div>

            <p className="mb-2.5 text-xs text-slate-500 leading-normal">
              Copy this hardware ID and send it to your Gym POS provider to generate your
              personalized license file.
            </p>

            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <code
                  data-testid="hardware-id"
                  className="block w-full overflow-x-auto rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 font-mono text-xs text-slate-700 shadow-inner select-all"
                >
                  {hardwareId ?? "—"}
                </code>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={copyHwid}
                disabled={!hardwareId}
                className="shrink-0 font-medium"
              >
                {copied ? (
                  <>
                    <Check size={15} className="text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <ClipboardCopy size={15} />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* STEP 2: Upload License File (.gymlic) */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition-all hover:border-slate-300">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17613f] text-[11px] font-bold text-white shadow-sm">
                  2
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  Install License File (.gymlic)
                </span>
              </div>
              <span className="rounded bg-emerald-100/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                .gymlic file
              </span>
            </div>

            <p className="mb-3 text-xs text-slate-500 leading-normal">
              Select or drop the <code className="font-semibold text-slate-700">.gymlic</code> file
              you received to activate this computer.
            </p>

            {/* Hidden file input for web fallback & file drop */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".gymlic"
              className="hidden"
              onChange={handleFileInputChange}
            />

            {/* Drag & Drop Hero Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!busy) setIsDragging(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                if (!busy) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={chooseFile}
              className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-[#17613f] bg-emerald-50/90 ring-4 ring-emerald-500/10 scale-[1.01]"
                  : "border-slate-300 bg-white hover:border-[#17613f]/60 hover:bg-emerald-50/30 shadow-sm"
              } ${busy ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100/70 text-[#17613f] group-hover:scale-110 transition-transform duration-200">
                <UploadCloud size={24} />
              </div>

              <p className="text-sm font-semibold text-slate-800">
                Drop your license file here, or click to browse
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Supports authentic <span className="font-semibold text-slate-600">.gymlic</span>{" "}
                license files
              </p>

              <Button
                type="button"
                variant="primary"
                size="md"
                className="mt-4 shadow-sm"
                loading={busy}
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  chooseFile();
                }}
              >
                <FolderOpen size={16} />
                Choose license file...
              </Button>
            </div>
          </div>

          {/* Dynamic Result / Feedback Message */}
          {message && (
            <div
              data-testid="activation-message"
              className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-sm transition-all animate-fade-in ${
                message.variant === "error"
                  ? "border-red-200 bg-red-50/95 text-red-800"
                  : "border-emerald-200 bg-emerald-50/95 text-emerald-800"
              }`}
            >
              {message.variant === "error" ? (
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
              ) : (
                <Check size={18} className="mt-0.5 shrink-0 text-emerald-600" />
              )}
              <span className="leading-snug font-medium">{message.text}</span>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <FileKey2 size={13} className="text-slate-400" />
            Ed25519 Cryptographic Verification
          </span>
          <span>Gym POS Licensing</span>
        </div>
      </div>
    </div>
  );
}
