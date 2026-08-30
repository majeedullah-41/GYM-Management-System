import { useEffect, useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/feedback/ToastProvider";
import { createPayment, getPaymentSummary, listMemberPayments, type PaymentSummary, type PaymentResponse, PAYMENT_METHODS } from "../../../lib/api/payments";
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
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [admissionFee, setAdmissionFee] = useState<string>("");
  const [currentPlanLoading, setCurrentPlanLoading] = useState(false);
  const [hasCurrentPlan, setHasCurrentPlan] = useState(false);

  useEffect(() => {
    if (isOpen) {
      listActivePlans().then(setPlans).catch(() => {});
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
      setSummary(null);
      setAdmissionFee("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!memberId || !isOpen) {
      setHasCurrentPlan(false);
      return;
    }
    let cancelled = false;
    setCurrentPlanLoading(true);
    listMemberPayments(memberId)
      .then((ps) => {
        if (cancelled) return;
        const latest = ps
          .filter((p) => !p.is_voided)
          .sort((a, b) =>
            (b.payment_date + b.created_at).localeCompare(
              a.payment_date + a.created_at,
            ),
          )[0] as PaymentResponse | undefined;
        const plan = latest
          ? plans.find((p) => p.id === latest.membership_plan_id)
          : undefined;
        if (plan) {
          setSelectedPlanId(plan.id);
          setHasCurrentPlan(true);
        } else {
          setSelectedPlanId("");
          setHasCurrentPlan(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedPlanId("");
          setHasCurrentPlan(false);
        }
      })
      .finally(() => {
        if (!cancelled) setCurrentPlanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [memberId, isOpen, plans]);

  useEffect(() => {
    if (!selectedPlanId || !isOpen) {
      setSummary(null);
      setAdmissionFee("");
      return;
    }
    setSummaryLoading(true);
    getPaymentSummary(memberId, selectedPlanId)
      .then((s) => {
        setSummary(s);
        const fee = s.admission_fee && s.is_first_payment ? s.admission_fee : 0;
        setAdmissionFee(String(fee));
        const planOnly = s.plan_price - s.previously_paid;
        setAmount(String(planOnly + fee));
      })
      .catch(() => { setSummary(null); setAdmissionFee(""); })
      .finally(() => setSummaryLoading(false));
  }, [selectedPlanId, isOpen, memberId]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const planOnlyOutstanding = summary
    ? Math.max(0, summary.plan_price - summary.previously_paid)
    : 0;

  useEffect(() => {
    if (!summary) return;
    const fee = summary.is_first_payment ? (parseInt(admissionFee, 10) || 0) : 0;
    setAmount(String(planOnlyOutstanding + fee));
  }, [admissionFee, planOnlyOutstanding]);

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
        admission_fee:
          summary && summary.is_first_payment
            ? parseInt(admissionFee, 10) || 0
            : null,
        description: null,
        reference: null,
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
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Payment — ${memberName}`}
      footer={
        completedPaymentId ? (
          <Button variant="secondary" onClick={() => { setCompletedPaymentId(null); onClose(); }}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleSubmit}>
              Record Payment
            </Button>
          </>
        )
      }
    >
      {completedPaymentId ? (
        <div className="text-center py-8">
          <div className="text-lg font-semibold text-green-600 mb-2">Payment Recorded Successfully</div>
          <p className="text-sm text-text-muted">The receipt is shown below. You can print it or close this window.</p>
        </div>
      ) : (
      <div className="space-y-4">
        {hasCurrentPlan && selectedPlan ? (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text-primary">
              Membership Plan
            </span>
            <div className="flex items-center justify-between rounded-md border border-border bg-secondary-bg px-3 py-2 text-sm">
              <span className="font-medium text-text-primary">
                {selectedPlan.name}
              </span>
              <span className="text-text-muted">
                {formatCurrency(selectedPlan.price)} ·{" "}
                {selectedPlan.duration_days} days
              </span>
            </div>
          </div>
        ) : (
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
            }}
          />
        )}

        {currentPlanLoading && (
          <div className="text-sm text-text-muted text-center py-2">Loading member plan...</div>
        )}

        {summaryLoading && selectedPlanId && (
          <div className="text-sm text-text-muted text-center py-2">Loading plan info...</div>
        )}

        {summary && (
          <div className="rounded-md bg-secondary-bg p-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-text-muted">Plan:</span>
              <span className="font-medium">{selectedPlan?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Duration:</span>
              <span>{selectedPlan?.duration_days} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Plan Price:</span>
              <span>{formatCurrency(summary.plan_price)}</span>
            </div>
            {summary.previously_paid > 0 && (
              <div className="flex justify-between">
                <span className="text-text-muted">Previously Paid:</span>
                <span className="text-green-600">{formatCurrency(summary.previously_paid)}</span>
              </div>
            )}
            {summary.is_first_payment && (
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Admission Fee:</span>
                <input
                  type="number"
                  min={0}
                  value={admissionFee}
                  onChange={(e) => setAdmissionFee(e.target.value)}
                  className="w-24 rounded border border-border bg-surface px-2 py-0.5 text-right text-sm text-text-primary focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-border pt-1.5">
              <span className="text-text-muted">
                {summary.is_first_payment ? "Total Due:" : "Outstanding:"}
              </span>
              <span className={parseInt(amount, 10) > 0 ? "text-orange-600" : "text-green-600"}>
                {formatCurrency(parseInt(amount, 10) || 0)}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              Amount (PKR) *
            </label>
            <input
              type="number"
              name="payment_amount"
              min={1}
              max={summary?.outstanding}
              placeholder="e.g. 2000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <Select
            label="Payment Method *"
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
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
            name="payment_date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {summary && amount && parseInt(amount, 10) > 0 && (
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Payment Now:</span>
              <span className="font-medium text-blue-800">{formatCurrency(parseInt(amount, 10) || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Remaining After Payment:</span>
              <span className="font-medium text-blue-800">
                {formatCurrency(Math.max(0, summary.outstanding - (parseInt(amount, 10) || 0)))}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            Notes <span className="text-text-muted">(optional)</span>
          </label>
          <textarea
            name="payment_notes"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            rows={2}
            placeholder="Payment notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      )}
    </Modal>

    <ReceiptPreview
      isOpen={!!completedPaymentId}
      onClose={() => {
        setCompletedPaymentId(null);
        onClose();
      }}
      paymentId={completedPaymentId}
    />
    </>
  );
}
