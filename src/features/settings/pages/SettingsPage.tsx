import { useCallback, useEffect, useState } from "react";
import {
  Save,
  Download,
  FolderOpen,
  ImagePlus,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  UserRound,
  Building2,
  CreditCard,
  FileText,
  Receipt,
  Printer,
  Database,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Modal } from "../../../components/ui/Modal";
import { Select } from "../../../components/ui/Select";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { useToast } from "../../../components/feedback/ToastProvider";
import {
  getAllSettings,
  saveGymSettings,
  saveReceiptSettings,
  savePrintSettings,
  saveBackupSettings,
  selectBackupFolder,
  selectGymLogo,
  backupDatabase,
  type AllSettings,
  type PrintSettings,
  type BackupSettings,
} from "../../../lib/api/settings";
import {
  createPlan,
  listPlans,
  updatePlan,
  deactivatePlan,
  reactivatePlan,
  type CreatePlanRequest,
  type UpdatePlanRequest,
  type PlanResponse,
} from "../../../lib/api/membership-plans";
import type { AuthUser } from "../../../lib/api/auth";
import { UserInformationTab } from "../components/UserInformationTab";
import { MemberFormSettingsTab } from "../components/MemberFormSettingsTab";
import { PaymentFormSettingsTab } from "../components/PaymentFormSettingsTab";
import { RestoreBackupSection } from "../components/RestoreBackupSection";
import { ReceiptPaper } from "../../receipts/components/ReceiptPaper";
import { LicenseInfoTab } from "../../licensing/components/LicenseInfoTab";
import { useGym } from "../../../context/GymContext";

type Tab =
  | "user"
  | "gym"
  | "plans"
  | "member-form"
  | "payment-form"
  | "receipts"
  | "data"
  | "license";

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const TABS: { key: Tab; label: string; icon: IconComponent }[] = [
  { key: "user", label: "User Information", icon: UserRound },
  { key: "gym", label: "Gym Info", icon: Building2 },
  { key: "plans", label: "Membership Plans", icon: CreditCard },
  { key: "member-form", label: "Member Form", icon: FileText },
  { key: "payment-form", label: "Payment Form", icon: Receipt },
  { key: "receipts", label: "Receipts", icon: Printer },
  { key: "data", label: "Data & Backup", icon: Database },
  { key: "license", label: "License", icon: ShieldCheck },
];

export function SettingsPage({
  user,
  onUserUpdated,
  onSignedOut,
}: {
  user: AuthUser;
  onUserUpdated: (user: AuthUser) => void;
  onSignedOut: () => void;
}) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("user");
  const [settings, setSettings] = useState<AllSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    <div className="settings-page space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Settings</h1>
          <p className="mt-1 text-xs text-text-muted">
            Configure your gym profile, membership plans, receipt templates, and application preferences.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={load}>
            <RefreshCw size={15} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1.5 lg:sticky lg:top-4 lg:grid-cols-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-left text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#17613f] text-white shadow-xs"
                    : "text-text-muted hover:bg-secondary-bg hover:text-text-primary"
                }`}
              >
                <Icon size={15} className={isActive ? "text-white" : "text-text-muted"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="min-w-0">
          {activeTab === "user" && (
            <UserInformationTab
              user={user}
              onUserUpdated={onUserUpdated}
              onSignedOut={onSignedOut}
            />
          )}
          {activeTab === "gym" && <GymInfoTab settings={settings} onSave={setSettings} />}
          {activeTab === "plans" && <PlansTab />}
          {activeTab === "member-form" && <MemberFormSettingsTab />}
          {activeTab === "payment-form" && <PaymentFormSettingsTab />}
          {activeTab === "receipts" && <ReceiptsTab settings={settings} onSave={setSettings} />}
          {activeTab === "data" && (
            <DataTab
              settings={settings}
              onSave={setSettings}
              backing={backing}
              setBacking={setBacking}
              addToast={addToast}
              onRestored={onSignedOut}
            />
          )}
          {activeTab === "license" && <LicenseInfoTab />}
        </section>
      </div>
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
  const { setGymInfo } = useGym();
  const [form, setForm] = useState(settings.gym);
  const [saving, setSaving] = useState(false);
  const [selectingLogo, setSelectingLogo] = useState(false);
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
      setGymInfo(form);
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

  const handleSelectLogo = async () => {
    try {
      setSelectingLogo(true);
      const logo = await selectGymLogo();
      if (logo) update({ gym_logo: logo });
    } catch (err) {
      addToast({
        variant: "error",
        title: "Could not load logo",
        message: err instanceof Error ? err.message : "Select a PNG or JPEG image",
      });
    } finally {
      setSelectingLogo(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-5 text-xs">
      <h3 className="mb-1 text-sm font-semibold text-text-primary">Gym Information</h3>
      <p className="mb-4 text-xs text-text-muted">
        This information appears on the login screen, sidebar, and printed receipts.
      </p>
      <div className="max-w-lg space-y-3.5">
        <div>
          <label className="mb-1.5 block font-medium text-text-primary">Gym Logo</label>
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-secondary-bg">
              {form.gym_logo ? (
                <img src={form.gym_logo} alt="Gym logo" className="h-full w-full object-contain" />
              ) : (
                <ImagePlus size={22} className="text-text-muted" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={selectingLogo}
                onClick={handleSelectLogo}
              >
                <ImagePlus size={14} />
                Choose Logo
              </Button>
              {form.gym_logo && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => update({ gym_logo: null })}
                >
                  <Trash2 size={14} />
                  Remove
                </Button>
              )}
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-text-muted">PNG or JPEG, maximum 2 MB.</p>
        </div>
        <Input
          label="Gym Name *"
          value={form.gym_name}
          onChange={(e) => update({ gym_name: e.target.value })}
          className="text-xs"
        />
        <Input
          label="Gym Slogan / Tagline"
          placeholder="Train Today Be Better"
          value={form.gym_tagline ?? ""}
          onChange={(e) => update({ gym_tagline: e.target.value || null })}
          className="text-xs"
        />
        <Input
          label="Phone"
          placeholder="03XX-XXXXXXX"
          value={form.gym_phone ?? ""}
          onChange={(e) => update({ gym_phone: e.target.value || null })}
          className="text-xs"
        />
        <Input
          label="Address"
          value={form.gym_address ?? ""}
          onChange={(e) => update({ gym_address: e.target.value || null })}
          className="text-xs"
        />
        <Input
          label="Email"
          type="email"
          value={form.gym_email ?? ""}
          onChange={(e) => update({ gym_email: e.target.value || null })}
          className="text-xs"
        />
        <Input
          label="Website"
          value={form.gym_website ?? ""}
          onChange={(e) => update({ gym_website: e.target.value || null })}
          className="text-xs"
        />
      </div>
      <div className="mt-5">
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!dirty}
          className="bg-[#17613f] hover:bg-[#104b31]"
        >
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlanResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    duration_days: "",
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listPlans()
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", price: "", duration_days: "", description: "" });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (p: PlanResponse) => {
    setEditing(p);
    setForm({
      name: p.name,
      price: String(p.price),
      duration_days: String(p.duration_days),
      description: p.description ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    const price = parseInt(form.price, 10);
    const duration_days = parseInt(form.duration_days, 10);
    if (!name) {
      setFormError("Plan name is required.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setFormError("Enter a valid price (0+).");
      return;
    }
    if (!Number.isFinite(duration_days) || duration_days <= 0) {
      setFormError("Enter a valid duration in days (1+).");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const description = form.description.trim() || null;
      if (editing) {
        const req: UpdatePlanRequest = {
          name,
          price,
          duration_days,
          description,
        };
        await updatePlan(editing.id, req);
        addToast({ variant: "success", title: "Plan updated" });
      } else {
        const req: CreatePlanRequest = {
          name,
          price,
          duration_days,
          description,
        };
        await createPlan(req);
        addToast({ variant: "success", title: "Plan created" });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save plan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (p: PlanResponse) => {
    try {
      if (p.is_active) {
        if (p.member_count > 0) {
          addToast({
            variant: "warning",
            title: "Cannot deactivate",
            message: `${p.member_count} member(s) are using this plan.`,
          });
          return;
        }
        await deactivatePlan(p.id);
        addToast({ variant: "success", title: "Plan deactivated" });
      } else {
        await reactivatePlan(p.id);
        addToast({ variant: "success", title: "Plan activated" });
      }
      load();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Failed",
        message: err instanceof Error ? err.message : "Operation failed.",
      });
    }
  };

  if (loading) return <LoadingState message="Loading plans..." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Membership Plans</h3>
          <p className="text-xs text-text-muted">Add, edit, and configure your gym membership packages.</p>
        </div>
        <Button size="sm" onClick={openCreate} className="bg-[#17613f] hover:bg-[#104b31]">
          <Plus size={14} /> Add Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card className="p-8 text-center text-xs text-text-muted">
          No plans configured yet.
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-[#fafbfa] text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Members</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border transition-colors hover:bg-[#f6faf7] last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">{p.name}</td>
                    <td className="px-4 py-3 text-text-muted">{p.duration_days} days</td>
                    <td className="px-4 py-3 font-semibold text-text-primary">
                      {p.price === 0 ? "Free" : `Rs. ${p.price.toLocaleString()}`}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{p.member_count}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.is_active ? "active" : "danger"}>
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEdit(p)}
                          className="h-7 px-2.5 text-xs"
                        >
                          <Pencil size={12} /> Edit
                        </Button>
                        {p.is_active ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={p.member_count > 0}
                            title={
                              p.member_count > 0 ? "Plan is in use by members" : "Deactivate plan"
                            }
                            onClick={() => handleToggleActive(p)}
                            className="h-7 px-2.5 text-xs"
                          >
                            <Trash2 size={12} /> Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleToggleActive(p)}
                            className="h-7 px-2.5 text-xs"
                          >
                            <RefreshCw size={12} /> Activate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Plan" : "Add Plan"}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              className="bg-[#17613f] hover:bg-[#104b31]"
            >
              {editing ? "Save Changes" : "Create Plan"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          {formError && (
            <p className="rounded-md bg-red-50 p-2.5 text-red-600 border border-red-200">
              {formError}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-text-primary">Plan Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Monthly"
              className="text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-text-primary">Price (PKR) *</label>
              <Input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="e.g. 3000"
                className="text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-text-primary">Duration (days) *</label>
              <Input
                type="number"
                min={1}
                value={form.duration_days}
                onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                placeholder="e.g. 30"
                className="text-xs"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-text-primary">Description</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
              className="text-xs"
            />
          </div>
        </div>
      </Modal>
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
    <div className="space-y-4">
      <PrintSettingsSection settings={settings} onSave={onSave} />
    </div>
  );
}

const RECEIPT_FIELDS: { key: keyof PrintSettings; label: string }[] = [
  { key: "show_gym_name", label: "Gym name" },
  { key: "show_gym_logo", label: "Gym logo" },
  { key: "show_gym_tagline", label: "Gym tagline" },
  { key: "show_gym_address", label: "Address" },
  { key: "show_gym_phone", label: "Phone" },
  { key: "show_receipt_title", label: "Payment receipt title" },
  { key: "show_receipt_number", label: "Receipt number" },
  { key: "show_date", label: "Date and time" },
  { key: "show_member_info", label: "Member name and ID" },
  { key: "show_plan_info", label: "Membership plan" },
  { key: "show_period", label: "Membership period" },
  { key: "show_payment_month", label: "Payment month" },
  { key: "show_amount_received", label: "Amount received" },
  { key: "show_method", label: "Payment method" },
  { key: "show_received_by", label: "Received by" },
  { key: "show_remaining_balance", label: "Remaining amount" },
  { key: "show_footer", label: "Footer" },
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
    <div className="rounded-lg border border-border bg-surface p-5 text-xs">
      <h3 className="text-sm font-semibold text-text-primary mb-1">Receipt Print Settings</h3>
      <p className="mb-4 text-xs text-text-muted">
        Choose the layout, destination and information included when printing a receipt.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Destination"
              value={form.destination}
              onChange={(e) =>
                update({ destination: e.target.value as PrintSettings["destination"] })
              }
              options={[
                { value: "print_window", label: "Print Window (send to printer)" },
                { value: "pdf", label: "Save as PDF" },
                { value: "thermal", label: "Thermal Printer (ESC/POS)" },
              ]}
              className="text-xs"
            />
            <Select
              label="Paper Width"
              value={form.paper_width}
              onChange={(e) =>
                update({ paper_width: e.target.value as PrintSettings["paper_width"] })
              }
              options={[
                { value: "80", label: "80 mm (thermal)" },
                { value: "58", label: "58 mm (thermal)" },
              ]}
              className="text-xs"
            />
            <Input
              label="Font Size"
              type="number"
              min={8}
              max={16}
              value={form.font_size}
              onChange={(e) => update({ font_size: Number(e.target.value) || 11 })}
              className="text-xs"
            />
          </div>

          {form.destination === "thermal" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Thermal Printer Name"
                placeholder="Leave empty for Windows default"
                value={form.thermal_printer_name ?? ""}
                onChange={(e) =>
                  update({
                    thermal_printer_name: e.target.value.trim() ? e.target.value : null,
                  })
                }
                className="text-xs"
              />
              <Input
                label="Characters per Line"
                type="number"
                min={16}
                max={64}
                placeholder="58mm → 32, 80mm → 42"
                value={form.thermal_characters_per_line ?? ""}
                onChange={(e) =>
                  update({
                    thermal_characters_per_line: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                className="text-xs"
              />
            </div>
          )}

          <div>
            <label className="mb-2.5 block font-medium text-text-primary">
              Receipt Information
            </label>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {RECEIPT_FIELDS.map((field) => (
                <label key={field.key} className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={form[field.key] as boolean}
                    onChange={(event) => update({ [field.key]: event.target.checked })}
                    className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-text-primary">{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-text-primary">
              Footer Text <span className="text-text-muted">(optional)</span>
            </label>
            <textarea
              name="receipt_footer"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              rows={2}
              placeholder="Stay Fit | Stay Healthy"
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
          <label className="font-medium text-text-primary mb-2.5 block">Live Preview</label>
          <PrintPreview print={form} settings={settings} widthMm={widthMm} />
        </div>
      </div>

      <div className="mt-5">
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!dirty}
          className="bg-[#17613f] hover:bg-[#104b31]"
        >
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
  return (
    <div className="flex justify-center overflow-hidden rounded-lg border border-border bg-secondary-bg/50 py-5">
      <div style={{ zoom: 0.72 }} className="overflow-hidden rounded-md border border-border shadow-xs">
        <ReceiptPaper
          widthMm={widthMm}
          data={{
            receiptNumber: "RCPT-000582",
            issuedAt: "2026-08-27T10:24:00+05:00",
            gymName: settings.gym.gym_name,
            gymTagline: settings.gym.gym_tagline,
            gymLogo: settings.gym.gym_logo,
            gymAddress: settings.gym.gym_address,
            gymPhone: settings.gym.gym_phone,
            memberName: "Ali Khan",
            memberNumber: "MEM-00124",
            planName: "Monthly",
            amount: 2000,
            remainingBalance: 500,
            paymentMethod: "Cash",
            membershipStartDate: "2026-08-27",
            membershipExpiryDate: "2026-09-26",
            paymentMonth: "August 2026",
          }}
          print={print}
          title={settings.receipt.receipt_title}
          footer={settings.receipt.receipt_footer}
        />
      </div>
    </div>
  );
}

function DataTab({
  settings,
  onSave,
  backing,
  setBacking,
  addToast,
  onRestored,
}: {
  settings: AllSettings;
  onSave: (settings: AllSettings) => void;
  backing: boolean;
  setBacking: (v: boolean) => void;
  addToast: (args: {
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message?: string;
  }) => void;
  onRestored: () => void;
}) {
  const [form, setForm] = useState<BackupSettings>(settings.backup);
  const [saving, setSaving] = useState(false);

  const persist = async (next: BackupSettings, showToast = true) => {
    try {
      setSaving(true);
      await saveBackupSettings(next);
      setForm(next);
      onSave({ ...settings, backup: next });
      if (showToast) addToast({ variant: "success", title: "Backup settings saved" });
      return true;
    } catch (err) {
      addToast({
        variant: "error",
        title: "Could not save backup settings",
        message: err instanceof Error ? err.message : "Could not save settings",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const chooseFolder = async () => {
    const directory = await selectBackupFolder();
    if (!directory) return null;
    setForm((current) => ({ ...current, directory }));
    return directory;
  };

  const handleBackup = async () => {
    try {
      setBacking(true);
      const alreadyConfigured = form.directory;
      const directory = alreadyConfigured ?? (await chooseFolder());
      if (!directory) return;
      const path = await backupDatabase(directory);
      const last_backup_at = new Date().toISOString();
      const next = { ...form, directory, last_backup_at };
      setForm(next);
      onSave({ ...settings, backup: next });
      if (!alreadyConfigured) {
        await persist(next, false);
      }
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
    <div className="space-y-4 text-xs">
      <div className="rounded-lg border border-border bg-surface p-5">
        <h3 className="mb-1 text-sm font-semibold text-text-primary">Data Backup</h3>
        <p className="mb-4 text-xs text-text-muted">
          Backups are saved in your selected folder as separate SQLite database files.
        </p>

        <div className="max-w-2xl space-y-3.5">
          <div>
            <label className="mb-1.5 block font-medium text-text-primary">
              Backup folder
            </label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={form.directory ?? ""}
                placeholder="Select where backup files should be saved"
                className="min-w-0 flex-1 text-xs"
              />
              <Button type="button" variant="secondary" size="sm" onClick={chooseFolder}>
                <FolderOpen size={14} />
                Browse
              </Button>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-text-primary">
            <input
              type="checkbox"
              checked={form.daily_enabled}
              onChange={(event) => setForm({ ...form, daily_enabled: event.target.checked })}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            Create one automatic backup every day
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-text-primary">
            <input
              type="checkbox"
              checked={form.close_enabled}
              onChange={(event) => setForm({ ...form, close_enabled: event.target.checked })}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            Create a backup whenever Gym POS closes
          </label>

          <div className="max-w-xs">
            <Select
              label="Backups to keep"
              value={String(form.keep_count ?? 0)}
              onChange={(event) => setForm({ ...form, keep_count: Number(event.target.value) })}
              options={[
                { value: "1", label: "Last 1 backup" },
                { value: "2", label: "Last 2 backups" },
                { value: "3", label: "Last 3 backups" },
                { value: "5", label: "Last 5 backups" },
                { value: "7", label: "Last 7 backups" },
                { value: "10", label: "Last 10 backups" },
                { value: "15", label: "Last 15 backups" },
                { value: "0", label: "Keep all backups" },
              ]}
              className="text-xs"
            />
            <p className="mt-1.5 text-[11px] text-text-muted">
              Older backups in this folder are deleted once you save these settings, and again after
              each new backup is created. Other files in the folder are never touched.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={saving}
              onClick={() => persist(form)}
            >
              <Save size={14} />
              Save Backup Settings
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleBackup}
              loading={backing}
              className="bg-[#17613f] hover:bg-[#104b31]"
            >
              <Download size={14} />
              Back Up Now
            </Button>
          </div>

          <p className="text-[11px] text-text-muted">
            Last backup:{" "}
            <span className="text-text-primary font-medium">
              {form.last_backup_at
                ? new Date(form.last_backup_at).toLocaleString()
                : "No backup created yet"}
            </span>
          </p>
        </div>
      </div>

      <RestoreBackupSection onRestored={onRestored} />
    </div>
  );
}
