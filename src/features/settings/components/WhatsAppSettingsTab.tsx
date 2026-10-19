import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { LoadingState } from "../../../components/ui/LoadingState";
import { useToast } from "../../../components/feedback/ToastProvider";
import {
  getWhatsAppSettings,
  saveWhatsAppSettings,
  type WhatsAppSettings,
} from "../../../lib/api/settings";
import {
  DEFAULT_MEMBER_DUES_TEMPLATE,
  DEFAULT_SUPPLIER_DUES_TEMPLATE,
  MEMBER_TEMPLATE_PLACEHOLDERS,
  SUPPLIER_TEMPLATE_PLACEHOLDERS,
  upgradeLegacyTemplate,
} from "../../../lib/whatsapp";

export function WhatsAppSettingsTab() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<WhatsAppSettings>({
    default_country_code: "92",
    launch_mode: "web",
    member_dues_template: DEFAULT_MEMBER_DUES_TEMPLATE,
    supplier_dues_template: DEFAULT_SUPPLIER_DUES_TEMPLATE,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getWhatsAppSettings();
        if (!cancelled) {
          setForm({
            ...s,
            member_dues_template: upgradeLegacyTemplate(
              s.member_dues_template,
              "member",
            ),
            supplier_dues_template: upgradeLegacyTemplate(
              s.supplier_dues_template,
              "supplier",
            ),
          });
        }
      } catch {
        // Fallback to defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveWhatsAppSettings(form);
      addToast({ title: "WhatsApp settings saved", variant: "success" });
    } catch (err) {
      addToast({
        title: "Failed to save WhatsApp settings",
        message: String(err),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading WhatsApp settings..." />;
  }

  return (
    <form onSubmit={(e) => void handleSave(e)} className="space-y-5">
      <Card title="WhatsApp Configuration">
        <p className="mb-4 text-xs text-text-muted">
          Configure how WhatsApp reminders are formatted and launched when
          messaging members or supplement suppliers.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Default Country Code (Digits Only)"
            value={form.default_country_code}
            onChange={(e) =>
              setForm({
                ...form,
                default_country_code: e.target.value.replace(/\D/g, ""),
              })
            }
            placeholder="92"
          />

          <Select
            label="Default Launch Method"
            value={form.launch_mode}
            onChange={(e) =>
              setForm({
                ...form,
                launch_mode: e.target.value as "web" | "desktop",
              })
            }
            options={[
              {
                value: "web",
                label: "WhatsApp Web / Browser (https://wa.me/...)",
              },
              {
                value: "desktop",
                label: "WhatsApp Desktop App (whatsapp://send?...)",
              },
            ]}
          />
        </div>
      </Card>

      <Card title="Member Dues Reminder Template">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-text-muted">
              Click any field below to insert it into the member reminder
              message:
            </p>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  member_dues_template: DEFAULT_MEMBER_DUES_TEMPLATE,
                })
              }
              className="inline-flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-primary"
            >
              <RotateCcw size={12} />
              Restore Default
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MEMBER_TEMPLATE_PLACEHOLDERS.map((p) => (
              <button
                key={p.token}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    member_dues_template: `${form.member_dues_template} ${p.token}`,
                  })
                }
                className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                + {p.label}
              </button>
            ))}
          </div>

          <textarea
            rows={5}
            value={form.member_dues_template}
            onChange={(e) =>
              setForm({ ...form, member_dues_template: e.target.value })
            }
            className="w-full rounded-md border border-border bg-surface p-3 text-xs leading-relaxed text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
        </div>
      </Card>

      <Card title="Supplier Dues / Account Update Template">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-text-muted">
              Click any field below to insert it into the supplier dues message:
            </p>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  supplier_dues_template: DEFAULT_SUPPLIER_DUES_TEMPLATE,
                })
              }
              className="inline-flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-primary"
            >
              <RotateCcw size={12} />
              Restore Default
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SUPPLIER_TEMPLATE_PLACEHOLDERS.map((p) => (
              <button
                key={p.token}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    supplier_dues_template: `${form.supplier_dues_template} ${p.token}`,
                  })
                }
                className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                + {p.label}
              </button>
            ))}
          </div>

          <textarea
            rows={5}
            value={form.supplier_dues_template}
            onChange={(e) =>
              setForm({ ...form, supplier_dues_template: e.target.value })
            }
            className="w-full rounded-md border border-border bg-surface p-3 text-xs leading-relaxed text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          <Save size={15} className="mr-1.5" />
          {saving ? "Saving..." : "Save WhatsApp Settings"}
        </Button>
      </div>
    </form>
  );
}
