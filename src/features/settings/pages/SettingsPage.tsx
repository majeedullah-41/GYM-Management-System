import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Modal } from "../../../components/ui/Modal";
import { Dialog } from "../../../components/ui/Dialog";
import { Badge } from "../../../components/ui/Badge";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useToast } from "../../../components/feedback/ToastProvider";
import {
  listPlans,
  createPlan,
  updatePlan,
  deactivatePlan,
  type PlanResponse,
} from "../../../lib/api/membership-plans";
import { formatCurrency, formatDuration } from "../../../lib/utils/format";

interface FormData {
  name: string;
  duration_days: string;
  price: string;
  description: string;
}

const EMPTY_FORM: FormData = {
  name: "",
  duration_days: "30",
  price: "",
  description: "",
};

export function SettingsPage() {
  const { addToast } = useToast();

  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanResponse | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [deactivateTarget, setDeactivateTarget] =
    useState<PlanResponse | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setPlans(await listPlans());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const openCreateForm = () => {
    setEditingPlan(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEditForm = (plan: PlanResponse) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      duration_days: String(plan.duration_days),
      price: String(plan.price),
      description: plan.description ?? "",
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Plan name is required";
    const duration = parseInt(formData.duration_days, 10);
    if (!duration || duration <= 0)
      errors.duration_days = "Duration must be greater than 0";
    const price = parseInt(formData.price, 10);
    if (formData.price === "" || isNaN(price) || price < 0)
      errors.price = "Price is required and cannot be negative";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        duration_days: parseInt(formData.duration_days, 10),
        price: parseInt(formData.price, 10),
        description: formData.description.trim() || null,
      };

      if (editingPlan) {
        await updatePlan(editingPlan.id, payload);
        addToast({
          variant: "success",
          title: "Plan updated",
          message: `"${payload.name}" has been updated.`,
        });
      } else {
        await createPlan(payload);
        addToast({
          variant: "success",
          title: "Plan created",
          message: `"${payload.name}" has been created.`,
        });
      }

      setFormOpen(false);
      await loadPlans();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to save plan",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;

    try {
      await deactivatePlan(deactivateTarget.id);
      addToast({
        variant: "success",
        title: "Plan deactivated",
        message: `"${deactivateTarget.name}" has been deactivated.`,
      });
      setDeactivateTarget(null);
      await loadPlans();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Error",
        message:
          err instanceof Error ? err.message : "Failed to deactivate plan",
      });
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Configure your gym information and application preferences."
      />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Membership Plans
            </h2>
            <p className="mt-0.5 text-sm text-text-muted">
              Create and manage membership plans for your gym.
            </p>
          </div>
          <Button onClick={openCreateForm}>+ Add Plan</Button>
        </div>

        {loading && <LoadingState message="Loading plans..." />}
        {error && !loading && (
          <ErrorState message={error} onRetry={loadPlans} />
        )}
        {!loading && !error && plans.length === 0 && (
          <EmptyState
            title="No plans yet"
            message="Create your first membership plan to start enrolling members."
            action={{ label: "+ Add Plan", onClick: openCreateForm }}
          />
        )}
        {!loading && !error && plans.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary-bg">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {plan.name}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {formatDuration(plan.duration_days)}
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {formatCurrency(plan.price)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={plan.is_active ? "active" : "expired"}>
                        {plan.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditForm(plan)}
                        >
                          Edit
                        </Button>
                        {plan.is_active && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setDeactivateTarget(plan)}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingPlan ? "Edit Plan" : "Add Plan"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleSubmit}>
              {editingPlan ? "Save Changes" : "Create Plan"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Plan Name"
            placeholder="e.g. Monthly, Quarterly"
            value={formData.name}
            onChange={(e) =>
              setFormData((p) => ({ ...p, name: e.target.value }))
            }
            error={formErrors.name}
          />
          <Input
            label="Duration (days)"
            type="number"
            min={1}
            value={formData.duration_days}
            onChange={(e) =>
              setFormData((p) => ({ ...p, duration_days: e.target.value }))
            }
            error={formErrors.duration_days}
          />
          <Input
            label="Price (Rs.)"
            type="number"
            min={0}
            value={formData.price}
            onChange={(e) =>
              setFormData((p) => ({ ...p, price: e.target.value }))
            }
            error={formErrors.price}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              Description <span className="text-text-muted">(optional)</span>
            </label>
            <textarea
              name="plan_description"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="Brief description of this plan"
              value={formData.description}
              onChange={(e) =>
                setFormData((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>
        </div>
      </Modal>

      <Dialog
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate Plan"
        message={`This will deactivate "${deactivateTarget?.name ?? ""}". It will no longer be available for new memberships. Existing members on this plan will keep their current membership.`}
        confirmLabel="Deactivate"
        variant="danger"
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
