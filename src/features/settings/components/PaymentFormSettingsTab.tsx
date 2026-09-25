import { useCallback, useEffect, useState } from "react";
import { Save, RefreshCw } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { useToast } from "../../../components/feedback/ToastProvider";
import {
  getPaymentFormSettings,
  savePaymentFormSettings,
} from "../../../lib/api/settings";
import { PaymentFormFields } from "../../payments/components/PaymentFormFields";
import {
  DEFAULT_VISIBLE_PAYMENT_FIELDS,
  PAYMENT_FIELDS,
  normalizePaymentFields,
  type PaymentFieldKey,
} from "../../payments/paymentFields";

export function PaymentFormSettingsTab() {
  const { addToast } = useToast();
  const [visibleFields, setVisibleFields] = useState<Set<PaymentFieldKey>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const settings = await getPaymentFormSettings();
      setVisibleFields(new Set(normalizePaymentFields(settings.visible_fields)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment form settings");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (key: PaymentFieldKey) => {
    setVisibleFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const resetToDefault = () => {
    setVisibleFields(new Set(DEFAULT_VISIBLE_PAYMENT_FIELDS));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePaymentFormSettings({
        visible_fields: PAYMENT_FIELDS.map((f) => f.key).filter((key) => visibleFields.has(key)),
      });
      addToast({ variant: "success", title: "Payment form settings saved" });
    } catch (err) {
      addToast({
        variant: "error",
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to save payment form settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = PAYMENT_FIELDS.filter((f) => visibleFields.has(f.key)).length;

  if (!loaded && !error) return <LoadingState message="Loading payment form settings..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-base font-semibold text-text-primary mb-1">Payment Form</h3>
      <p className="mb-4 text-sm text-text-muted">
        Choose which fields appear in the Record Payment form. The preview below shows how the form
        will look. Member, Plan, Amount, Payment Method and Payment Date are always required and
        cannot be hidden.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">Form Fields</label>
            <span className="text-xs text-text-muted">
              {enabledCount} of {PAYMENT_FIELDS.length} enabled
            </span>
          </div>
          <div className="space-y-1.5">
            {PAYMENT_FIELDS.map((field) => {
              const enabled = visibleFields.has(field.key);
              return (
                <label
                  key={field.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border border-border px-3 py-2.5 transition-colors ${
                    enabled ? "bg-secondary-bg/60" : "opacity-60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={field.locked}
                    onChange={() => toggle(field.key)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:cursor-not-allowed"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-text-primary">
                      {field.label}
                      {field.required && <span className="ml-1 text-danger">*</span>}
                    </span>
                    {field.description && (
                      <span className="block text-xs text-text-muted">{field.description}</span>
                    )}
                  </span>
                  {field.locked && (
                    <span className="shrink-0 rounded-full bg-secondary-bg px-2 py-0.5 text-[10px] font-medium text-text-muted">
                      Required
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-text-primary">
            Record Payment Form Preview
          </label>
          <div className="pointer-events-none rounded-md border border-border bg-secondary-bg/40 p-4">
            <PaymentFormFields
              visibleFields={visibleFields}
              amount="2500"
              onAmountChange={() => {}}
              method="Cash"
              onMethodChange={() => {}}
              paymentDate="2026-09-22"
              onPaymentDateChange={() => {}}
              paymentMonth="September 2026"
              onPaymentMonthChange={() => {}}
              notes="Sample payment note"
              onNotesChange={() => {}}
              disabled
            />
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Showing {enabledCount} field{enabledCount === 1 ? "" : "s"}. This preview matches the
            actual Record Payment form.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={handleSave} loading={saving} className="bg-[#17613f] hover:bg-[#104b31]">
          <Save size={14} className="mr-1.5" />
          Save Changes
        </Button>
        <Button variant="secondary" onClick={resetToDefault}>
          <RefreshCw size={14} className="mr-1.5" />
          Reset to Default
        </Button>
      </div>
    </div>
  );
}