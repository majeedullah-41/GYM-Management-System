import { type FormEvent, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  FolderOpen,
  Info,
  Lock,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Modal } from "../../../components/ui/Modal";
import { useToast } from "../../../components/feedback/ToastProvider";
import { restoreBackup, selectBackupFile } from "../../../lib/api/settings";

export function RestoreBackupSection({ onRestored }: { onRestored: () => void }) {
  const { addToast } = useToast();
  const [file, setFile] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const choose = async () => {
    try {
      setSelecting(true);
      const chosen = await selectBackupFile();
      if (chosen) {
        setFile(chosen);
        setPassword("");
        setShowPassword(false);
        setError("");
      }
    } catch (err) {
      addToast({
        variant: "error",
        title: "Could not open the backup",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSelecting(false);
    }
  };

  const close = () => {
    setConfirming(false);
    setPassword("");
    setShowPassword(false);
    setError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    try {
      setRestoring(true);
      setError("");
      const result = await restoreBackup(file, password);
      close();
      addToast({
        variant: "success",
        title: "Backup restored",
        message: `Sign in with the account stored in this backup. Your previous data was kept at ${result.safetyBackup}`,
        durationMs: 20000,
      });
      onRestored();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRestoring(false);
    }
  };

  const fileName = file ? file.split(/[/\\]/).pop() || file : "";

  return (
    <div className="rounded-lg border border-border bg-surface p-5 transition-shadow">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Restore From Backup</h3>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
            <ShieldAlert size={12} />
            Admin Protected
          </span>
        </div>
      </div>
      <p className="mb-4 text-xs text-text-muted">
        Replace everything currently in Gym POS with the contents of a backup file. Members,
        payments, expenses and settings are all replaced, and you will sign in again with the
        account stored in that backup.
      </p>

      <div className="max-w-2xl space-y-3.5">
        <div>
          <label className="mb-1.5 block font-medium text-text-primary">Backup file</label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={file ?? ""}
              placeholder="Select a backup file to restore"
              aria-label="Backup file"
              className="min-w-0 flex-1 text-xs"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={choose}
              loading={selecting}
            >
              <FolderOpen size={14} />
              Browse
            </Button>
          </div>
          {file && (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-secondary-bg/40 px-3 py-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <Database size={15} className="shrink-0 text-[#17613f]" />
                <span className="truncate font-medium text-text-primary">
                  {fileName}
                </span>
                <span className="shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] uppercase text-text-muted">
                  SQLite DB
                </span>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-success">
                <CheckCircle2 size={13} />
                Ready to verify
              </span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-border/80 bg-secondary-bg/25 px-3 py-2.5 text-[11px] text-text-muted">
          <Info size={14} className="mt-0.5 shrink-0 text-text-muted" />
          <span>
            Restoring requires your admin password. The file is validated before anything is replaced,
            and a safety snapshot of your current database is saved automatically so the restore can be undone.
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!file}
            onClick={() => setConfirming(true)}
          >
            <RotateCcw size={14} />
            Restore This Backup
          </Button>
        </div>
      </div>

      <Modal
        isOpen={confirming}
        onClose={close}
        title="Restore this backup?"
        maxWidthClassName="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={restoring}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="restore-backup-form"
              variant="destructive"
              loading={restoring}
              disabled={password.trim().length === 0}
            >
              <RotateCcw size={14} />
              Restore and Sign Out
            </Button>
          </>
        }
      >
        <form id="restore-backup-form" onSubmit={submit} className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3.5 text-xs">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={15} />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                This will overwrite current data
              </p>
              <p className="leading-relaxed text-text-muted">
                Every member, payment, expense and setting currently in Gym POS is replaced by this
                backup. Anything added since the backup was taken is lost, and you will be signed out.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary-bg/50 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#17613f]/10 text-[#17613f] dark:text-[#34d399]">
                <Database size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Selected Backup
                  </span>
                  <span className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                    SQLite .db
                  </span>
                </div>
                <p className="truncate text-xs font-semibold text-text-primary" title={fileName}>
                  {fileName}
                </p>
              </div>
            </div>
            <p
              className="mt-2 truncate rounded border border-border/60 bg-surface/80 px-2 py-1 font-mono text-[10px] text-text-muted"
              title={file ?? ""}
            >
              {file}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="restore-admin-password"
                className="flex items-center gap-1.5 text-xs font-medium text-text-primary"
              >
                <Lock size={12} className="text-text-muted" />
                Admin password
              </label>
              <span className="text-[11px] text-text-muted">Verification required</span>
            </div>

            <div className="relative">
              <input
                id="restore-admin-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your admin password"
                autoComplete="current-password"
                autoFocus
                className={`w-full rounded-md border bg-surface px-3 py-2 pr-10 text-xs text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                  error ? "border-danger" : "border-border"
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-text-muted transition-colors hover:text-text-primary"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-danger">
                <AlertCircle size={13} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-start gap-1.5 pt-0.5 text-[11px] text-text-muted">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-[#17613f] dark:text-[#34d399]" />
              <span>
                Your password is checked before anything is replaced. Five wrong attempts lock password checks for five minutes.
              </span>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
