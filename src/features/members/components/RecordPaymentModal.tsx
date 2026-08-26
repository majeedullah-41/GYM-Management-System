import { useEffect, useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/feedback/ToastProvider";
import { createPayment } from "../../../lib/api/payments";
import { listActivePlans, type PlanResponse } from "../../../lib/api/membership-plans";
import { formatCurrency } from "../../../lib/utils/format";
import { ReceiptPreview } from "../../receipts/components/ReceiptPreview";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  onPaymentRecorded: () => void;
}

const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash" },
  { value: "Card", label: "Card" },
  { value: "BankTransfer", label: "Bank Transfer" },
  { value: "Other", label: "Other" },
];

export function RecordPaymentModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  onPaymentRecorded,
}: Props) {
  const { addToast } = useToast();
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completedPaymentId, setCompletedPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      listActivePlans()
        .then((p) => {
          setPlans(p);
          if (p.length === 1) {
            setSelectedPlanId(p[0].id);
            setAmount(String(p[0].price));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelectedPlanId("");
      setAmount("");
      setMethod("Cash");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setCompletedPaymentId(null);
    }
  }, [isOpen]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handleSubmit = async () => {
    if (!selectedPlanId) {
      addToast({ variant: "warning", title: "Select a plan" });
      return;
    }
    const amountNum = parseInt(amount, 10);
    if (!amountNum || amountNum <= 0) {
      addToast({ variant: "warning", title: "Enter a valid amount" });
      return;
    }

    try {
      setSubmitting(true);
      const payment = await createPayment({
        member_id: memberId,
        membership_plan_id: selectedPlanId,
        amount: amountNum,
        payment_method: method,
        payment_date: paymentDate,
        notes: notes.trim() || null,
      });
      addToast({
        variant: "success",
        title: "Payment recorded",
        message: `${formatCurrency(amountNum)} payment from ${memberName} saved.`,
      });
      onPaymentRecorded();
      setCompletedPaymentId(payment.id);
    } catch (err) {
      addToast({
        variant: "error",
        title: "Payment failed",
        message: err instanceof Error ? err.message : "Could not record payment",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Payment — ${memberName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={submitting} onClick={handleSubmit}>
            Record Payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Membership Plan *"
          options={[
            { value: "", label: "Select a plan..." },
            ...plans.map((p) => ({
              value: p.id,
              label: `${p.name} — ${formatCurrency(p.price)} (${p.duration_days} days)`,
            })),
          ]}
          value={selectedPlanId}
          onChange={(e) => {
            setSelectedPlanId(e.target.value);
            const plan = plans.find((p) => p.id === e.target.value);
            if (plan) setAmount(String(plan.price));
          }}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              Amount (PKR) *
            </label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 2000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <Select
            label="Payment Method *"
            options={PAYMENT_METHODS}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            Payment Date *
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {selectedPlan && (
          <div className="rounded-md bg-secondary-bg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Plan:</span>
              <span className="font-medium">{selectedPlan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Duration:</span>
              <span>{selectedPlan.duration_days} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Plan Price:</span>
              <span>{formatCurrency(selectedPlan.price)}</span>
            </div>
            {amount && (
              <div className="flex justify-between border-t border-border mt-2 pt-2">
                <span className="text-text-muted">Payment:</span>
                <span className="font-medium text-primary">
                  {formatCurrency(parseInt(amount, 10) || 0)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            Notes <span className="text-text-muted">(optional)</span>
          </label>
          <textarea
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            rows={2}
            placeholder="Payment notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
