import { useCallback, useEffect, useState } from "react";
import { Save, Download, FolderOpen } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { useToast } from "../../../components/feedback/ToastProvider";
import {
  getAllSettings,
  saveGymSettings,
  saveReceiptSettings,
  savePrintSettings,
  backupDatabase,
  type AllSettings,
  type PrintSettings,
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
  return (
    <div className="space-y-6">
      <PrintSettingsSection settings={settings} onSave={onSave} />
    </div>
  );
}

const PRINT_FIELDS: { key: keyof PrintSettings; label: string }[] = [
  { key: "show_gym_name", label: "Gym name" },
  { key: "show_gym_phone", label: "Gym phone" },
  { key: "show_gym_address", label: "Gym address" },
  { key: "show_receipt_title", label: "Receipt title" },
  { key: "show_receipt_number", label: "Receipt number" },
  { key: "show_date", label: "Date" },
  { key: "show_member_info", label: "Member name and ID" },
  { key: "show_plan_info", label: "Plan" },
  { key: "show_period", label: "Membership period" },
  { key: "show_payment_details", label: "Payment method and amount" },
  { key: "show_remaining_balance", label: "Remaining balance" },
  { key: "show_notes", label: "Notes" },
  { key: "show_footer", label: "Footer text" },
];

function PrintSettingsSection({
  settings,
  onSave,
}: {
  settings: AllSettings;
  onSave: (s: AllSettings) => void;
}) {
  const { addToast } = useToast();
  const [form, setForm] = useState<PrintSettings>(settings.print);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (patch: Partial<PrintSettings>) => {
    setForm((p) => ({ ...p, ...patch }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await savePrintSettings(form);
      onSave({ ...settings, print: form });
      setDirty(false);
      addToast({ variant: "success", title: "Print settings saved" });
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

  const widthMm = form.paper_width === "58" ? 58 : 80;

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="text-base font-semibold text-text-primary mb-1">
        Receipt Print Settings
      </h3>
      <p className="text-sm text-text-muted mb-6">
        Choose the layout, destination and information included when printing a
        receipt.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Destination"
              value={form.destination}
              onChange={(e) => update({ destination: e.target.value })}
              options={[
                { value: "print_window", label: "Print (opens print dialog)" },
                { value: "pdf", label: "Save as PDF" },
              ]}
            />
            <Select
              label="Paper Width"
              value={form.paper_width}
              onChange={(e) => update({ paper_width: e.target.value })}
              options={[
                { value: "80", label: "80 mm (thermal)" },
                { value: "58", label: "58 mm (thermal)" },
              ]}
            />
            <Input
              label="Font Size"
              type="number"
              min={8}
              max={16}
              value={form.font_size}
              onChange={(e) =>
                update({ font_size: Number(e.target.value) || 11 })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary mb-3 block">
              Include on Receipt
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {PRINT_FIELDS.map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form[opt.key] as boolean}
                    onChange={(e) =>
                      update({ [opt.key]: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text-primary">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              Footer Text <span className="text-text-muted">(optional)</span>
            </label>
            <textarea
              name="receipt_footer"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              rows={2}
              placeholder="Thank you for being a member!"
              value={settings.receipt.receipt_footer ?? ""}
              onChange={async (e) => {
                const next = e.target.value || null;
                await saveReceiptSettings({ ...settings.receipt, receipt_footer: next });
                onSave({ ...settings, receipt: { ...settings.receipt, receipt_footer: next } });
              }}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-text-primary mb-3 block">
            Live Preview
          </label>
          <PrintPreview print={form} settings={settings} widthMm={widthMm} />
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

function PrintPreview({
  print,
  settings,
  widthMm,
}: {
  print: PrintSettings;
  settings: AllSettings;
  widthMm: number;
}) {
  const fontPx = Math.round(print.font_size * 0.9) || 10;

  return (
    <div className="flex justify-center">
      <div
        className="bg-white text-gray-900 shadow-sm border border-gray-200 px-3 py-4 font-mono leading-snug"
        style={{ width: `${widthMm * 3.6}px` }}
      >
        {print.show_gym_name && (
          <div className="text-center font-bold" style={{ fontSize: fontPx + 2 }}>
            {settings.gym.gym_name}
          </div>
        )}
        {print.show_gym_phone && settings.gym.gym_phone && (
          <div className="text-center" style={{ fontSize: fontPx }}>
            {settings.gym.gym_phone}
          </div>
        )}
        {print.show_gym_address && settings.gym.gym_address && (
          <div className="text-center" style={{ fontSize: fontPx }}>
            {settings.gym.gym_address}
          </div>
        )}
        <Divider />
        {print.show_receipt_title && (
          <div className="text-center font-bold" style={{ fontSize: fontPx }}>
            RECEIPT
          </div>
        )}
        {print.show_receipt_number && (
          <Row label="Receipt #" value="R-0001" fontPx={fontPx} />
        )}
        {print.show_date && (
          <Row label="Date" value={new Date().toISOString().slice(0, 10)} fontPx={fontPx} />
        )}
        <Divider />
        {print.show_member_info && (
          <>
            <Row label="Member" value="John Doe" fontPx={fontPx} />
            <Row label="Member #" value="M-0001" fontPx={fontPx} />
          </>
        )}
        <Divider />
        {print.show_plan_info && (
          <Row label="Plan" value="Monthly" fontPx={fontPx} />
        )}
        {print.show_period && (
          <Row
            label="Period"
            value="2026-08-28  to  2026-09-28"
            fontPx={fontPx}
          />
        )}
        <Divider />
        {print.show_payment_details && (
          <>
            <Row label="Method" value="Cash" fontPx={fontPx} />
            <div
              className="text-center font-bold"
              style={{ fontSize: fontPx + 1 }}
            >
              AMOUNT PAID&nbsp;&nbsp;Rs. 2,500
            </div>
          </>
        )}
        {print.show_remaining_balance && (
          <Row label="Remaining" value="Rs. 0" fontPx={fontPx} />
        )}
        <Divider />
        {print.show_notes && (
          <div className="text-center" style={{ fontSize: fontPx }}>
            Paid in full
          </div>
        )}
        {print.show_footer && settings.receipt.receipt_footer && (
          <div className="text-center" style={{ fontSize: fontPx * 0.9 }}>
            {settings.receipt.receipt_footer}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  fontPx,
}: {
  label: string;
  value: string;
  fontPx: number;
}) {
  return (
    <div className="flex justify-between" style={{ fontSize: fontPx }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-1 border-t border-gray-400" />;
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
