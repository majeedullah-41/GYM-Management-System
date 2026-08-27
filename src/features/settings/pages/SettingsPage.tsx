import { useCallback, useEffect, useState } from "react";
import { Save, Download, FolderOpen } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { useToast } from "../../../components/feedback/ToastProvider";
import {
  getAllSettings,
  saveGymSettings,
  saveReceiptSettings,
  backupDatabase,
  type AllSettings,
} from "../../../lib/api/settings";
import { listPlans } from "../../../lib/api/membership-plans";
import type { PlanResponse } from "../../../lib/api/membership-plans";

type Tab = "gym" | "plans" | "receipts" | "data";

const TABS: { key: Tab; label: string }[] = [
  { key: "gym", label: "Gym Info" },
  { key: "plans", label: "Membership Plans" },
  { key: "receipts", label: "Receipts" },
  { key: "data", label: "Data & Backup" },
];

export function SettingsPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("gym");
  const [settings, setSettings] = useState<AllSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [backing, setBacking] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSettings(await getAllSettings());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Loading settings..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!settings) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your gym information and application preferences."
      />

      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "text-text-muted hover:bg-secondary-bg hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "gym" && (
        <GymInfoTab settings={settings} onSave={setSettings} />
      )}
      {activeTab === "plans" && <PlansTab />}
      {activeTab === "receipts" && (
        <ReceiptsTab settings={settings} onSave={setSettings} />
      )}
      {activeTab === "data" && (
        <DataTab
          backing={backing}
          setBacking={setBacking}
          addToast={addToast}
        />
      )}
    </div>
  );
}

function GymInfoTab({
  settings,
  onSave,
}: {
  settings: AllSettings;
  onSave: (s: AllSettings) => void;
}) {
  const { addToast } = useToast();
  const [form, setForm] = useState(settings.gym);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (patch: Partial<typeof form>) => {
    setForm((p) => ({ ...p, ...patch }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveGymSettings(form);
      onSave({ ...settings, gym: form });
      setDirty(false);
      addToast({ variant: "success", title: "Gym info saved" });
    } catch (err) {
      addToast({
        variant: "error",
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="text-base font-semibold text-text-primary mb-4">
        Gym Information
      </h3>
      <p className="text-sm text-text-muted mb-6">
        This information appears on receipts and printed documents.
      </p>
      <div className="space-y-4 max-w-lg">
        <Input
          label="Gym Name *"
          value={form.gym_name}
          onChange={(e) => update({ gym_name: e.target.value })}
        />
        <Input
          label="Phone"
          placeholder="03XX-XXXXXXX"
          value={form.gym_phone ?? ""}
          onChange={(e) => update({ gym_phone: e.target.value || null })}
        />
        <Input
          label="Address"
          value={form.gym_address ?? ""}
          onChange={(e) => update({ gym_address: e.target.value || null })}
        />
        <Input
          label="Email"
          type="email"
          value={form.gym_email ?? ""}
          onChange={(e) => update({ gym_email: e.target.value || null })}
        />
        <Input
          label="Website"
          value={form.gym_website ?? ""}
          onChange={(e) => update({ gym_website: e.target.value || null })}
        />
      </div>
      <div className="mt-6">
        <Button onClick={handleSave} loading={saving} disabled={!dirty}>
          <Save size={14} className="mr-1.5" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function PlansTab() {
  const { addToast } = useToast();
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPlans()
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading plans..." />;

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="text-base font-semibold text-text-primary mb-4">
        Membership Plans
      </h3>
      <p className="text-sm text-text-muted mb-4">
        Manage your membership plans in the dedicated plans section.
      </p>
      {plans.length === 0 ? (
        <p className="text-sm text-text-muted">No plans configured yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary-bg">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-text-muted">
                  Plan
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-text-muted">
                  Duration
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-text-muted">
                  Price
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-text-muted">
                  Members
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-text-muted">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-4 py-2.5 font-medium text-text-primary">
                    {p.name}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted">
                    {p.duration_days} days
                  </td>
                  <td className="px-4 py-2.5 text-text-primary">
                    {p.price === 0 ? "Free" : `Rs. ${p.price.toLocaleString()}`}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted">
                    {p.member_count}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReceiptsTab({
  settings,
  onSave,
}: {
  settings: AllSettings;
  onSave: (s: AllSettings) => void;
}) {
  const { addToast } = useToast();
  const [form, setForm] = useState(settings.receipt);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (patch: Partial<typeof form>) => {
    setForm((p) => ({ ...p, ...patch }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveReceiptSettings(form);
      onSave({ ...settings, receipt: form });
      setDirty(false);
      addToast({ variant: "success", title: "Receipt settings saved" });
    } catch (err) {
      addToast({
        variant: "error",
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="text-base font-semibold text-text-primary mb-4">
        Receipt Settings
      </h3>
      <p className="text-sm text-text-muted mb-6">
        Customize how receipts appear when printed or previewed.
      </p>
      <div className="space-y-4 max-w-lg">
        <Input
          label="Receipt Title"
          value={form.receipt_title}
          onChange={(e) =>
            update({ receipt_title: e.target.value || "PAYMENT RECEIPT" })
          }
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            Footer Text <span className="text-text-muted">(optional)</span>
          </label>
          <textarea
            name="receipt_footer"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            rows={2}
            placeholder="Thank you for being a member!"
            value={form.receipt_footer ?? ""}
            onChange={(e) =>
              update({ receipt_footer: e.target.value || null })
            }
          />
        </div>

        <div className="pt-2">
          <label className="text-sm font-medium text-text-primary mb-3 block">
            Show on Receipt
          </label>
          <div className="space-y-3">
            {[
              { key: "show_phone" as const, label: "Gym phone number" },
              { key: "show_address" as const, label: "Gym address" },
              { key: "show_member_id" as const, label: "Member ID and name" },
              { key: "show_notes" as const, label: "Payment notes" },
            ].map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={form[opt.key]}
                  onChange={(e) => update({ [opt.key]: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-text-primary">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6">
        <Button onClick={handleSave} loading={saving} disabled={!dirty}>
          <Save size={14} className="mr-1.5" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function DataTab({
  backing,
  setBacking,
  addToast,
}: {
  backing: boolean;
  setBacking: (v: boolean) => void;
  addToast: (args: {
    variant: string;
    title: string;
    message?: string;
  }) => void;
}) {
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const handleBackup = async () => {
    try {
      setBacking(true);
      const path = await backupDatabase("");
      setLastBackup(path);
      addToast({
        variant: "success",
        title: "Backup successful",
        message: `Saved to: ${path}`,
      });
    } catch (err) {
      addToast({
        variant: "error",
        title: "Backup failed",
        message: err instanceof Error ? err.message : "Could not create backup",
      });
    } finally {
      setBacking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">
          Backup Database
        </h3>
        <p className="text-sm text-text-muted mb-6">
          Create a backup of your gym data. Store backups safely to prevent
          data loss.
        </p>
        <Button onClick={handleBackup} loading={backing}>
          <Download size={14} className="mr-1.5" />
          Backup Database
        </Button>
        {lastBackup && (
          <p className="mt-3 text-xs text-text-muted">
            Last backup: <span className="text-text-primary">{lastBackup}</span>
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">
          About
        </h3>
        <div className="space-y-2 text-sm text-text-muted">
          <div className="flex justify-between">
            <span>Application</span>
            <span className="text-text-primary font-medium">Gym POS</span>
          </div>
          <div className="flex justify-between">
            <span>Version</span>
            <span className="text-text-primary font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Database</span>
            <span className="text-text-primary font-medium">SQLite</span>
          </div>
          <div className="flex justify-between">
            <span>Platform</span>
            <span className="text-text-primary font-medium">
              Tauri 2 (Windows)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
