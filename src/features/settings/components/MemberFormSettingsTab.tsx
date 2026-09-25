import { useCallback, useEffect, useState } from "react";
import { Save, RefreshCw } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { useToast } from "../../../components/feedback/ToastProvider";
import {
  getMemberFormSettings,
  saveMemberFormSettings,
} from "../../../lib/api/settings";
import { listActivePlans, type PlanResponse } from "../../../lib/api/membership-plans";
import { MemberFormFields } from "../../members/components/MemberFormFields";
import {
  DEFAULT_VISIBLE_MEMBER_FIELDS,
  EMPTY_FORM,
  MEMBER_FIELDS,
  type MemberFieldKey,
} from "../../members/memberFields";

export function MemberFormSettingsTab() {
  const { addToast } = useToast();
  const [visibleFields, setVisibleFields] = useState<Set<MemberFieldKey>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<PlanResponse[]>([]);

  useEffect(() => {
    listActivePlans()
      .then(setPlans)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const settings = await getMemberFormSettings();
      const known = new Set(MEMBER_FIELDS.map((f) => f.key));
      const fields = settings.visible_fields.filter(
        (k): k is MemberFieldKey => known.has(k as MemberFieldKey),
      );
      if (!fields.includes("full_name")) fields.unshift("full_name");
      setVisibleFields(new Set(fields));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load member form settings");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (key: MemberFieldKey) => {
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
    setVisibleFields(new Set(DEFAULT_VISIBLE_MEMBER_FIELDS));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMemberFormSettings({
        visible_fields: MEMBER_FIELDS.map((f) => f.key).filter((key) => visibleFields.has(key)),
      });
      addToast({ variant: "success", title: "Member form settings saved" });
    } catch (err) {
      addToast({
        variant: "error",
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to save member form settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = MEMBER_FIELDS.filter((f) => visibleFields.has(f.key)).length;

  if (!loaded && !error) return <LoadingState message="Loading member form settings..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-base font-semibold text-text-primary mb-1">Member Form</h3>
      <p className="mb-4 text-sm text-text-muted">
        Choose which fields appear in the Add / Edit Member form. The preview below shows how the
        form will look. Full Name is always required and cannot be hidden.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">Form Fields</label>
            <span className="text-xs text-text-muted">
              {enabledCount} of {MEMBER_FIELDS.length} enabled
            </span>
          </div>
          <div className="space-y-1.5">
            {MEMBER_FIELDS.map((field) => {
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
            Add Member Form Preview
          </label>
          <div className="pointer-events-none rounded-md border border-border bg-secondary-bg/40 p-4">
            <MemberFormFields
              visibleFields={visibleFields}
              formData={EMPTY_FORM}
              errors={{}}
              onChange={() => {}}
              plans={plans}
              disabled
            />
          </div>
          <p className="mt-3 text-xs text-text-muted">
            {enabledCount === 0
              ? "No fields selected (Full Name cannot be removed)."
              : `Showing ${enabledCount} field${enabledCount === 1 ? "" : "s"}. This preview matches the actual Add Member form.`}
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