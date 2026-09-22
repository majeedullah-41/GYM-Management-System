import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/feedback/ToastProvider";
import {
  createPayment,
  getPaymentSummary,
  listMemberPayments,
  type PaymentSummary,
  type PaymentResponse,
} from "../../../lib/api/payments";
import { listActivePlans, type PlanResponse } from "../../../lib/api/membership-plans";
import { getPaymentFormSettings } from "../../../lib/api/settings";
import { formatCurrency } from "../../../lib/utils/format";
import { ReceiptPreview } from "../../receipts/components/ReceiptPreview";
import { PaymentFormFields } from "../../payments/components/PaymentFormFields";
import {
  DEFAULT_VISIBLE_PAYMENT_FIELDS,
  normalizePaymentFields,
  type PaymentFieldKey,
} from "../../payments/paymentFields";

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
  const [currentPlanLoading, setCurrentPlanLoading] = useState(false);
  const [hasCurrentPlan, setHasCurrentPlan] = useState(false);
  const requestKeyRef = useRef(crypto.randomUUID());
  const [formFieldKeys, setFormFieldKeys] = useState<PaymentFieldKey[]>(
    DEFAULT_VISIBLE_PAYMENT_FIELDS,
  );

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getPaymentFormSettings()
      .then((settings) => {
        if (!cancelled) setFormFieldKeys(normalizePaymentFields(settings.visible_fields));
      })
      .catch(() => {
        if (!cancelled) setFormFieldKeys(DEFAULT_VISIBLE_PAYMENT_FIELDS);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const visibleFields = useMemo(() => new Set<PaymentFieldKey>(formFieldKeys), [formFieldKeys]);

  useEffect(() => {
    if (isOpen) {
      listActivePlans()
        .then(setPlans)
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
      setSummary(null);
      requestKeyRef.current = crypto.randomUUID();
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
            (b.payment_date + b.created_at).localeCompare(a.payment_date + a.created_at),
          )[0] as PaymentResponse | undefined;
        const plan = plans.find((p) => p.id === latest?.membership_plan_id);
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
      return;
    }
    setSummaryLoading(true);
    getPaymentSummary(memberId, selectedPlanId)
      .then((s) => {
        setSummary(s);
        setAmount(String(s.outstanding));
      })
      .catch(() => {
        setSummary(null);
      })
      .finally(() => setSummaryLoading(false));
  }, [selectedPlanId, isOpen, memberId]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const outstandingBills = summary?.bills.filter((bill) => bill.remaining_amount > 0) ?? [];

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
        description: null,
        reference: null,
        notes: notes.trim() || null,
        idempotency_key: requestKeyRef.current,
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
            <Button
              variant="secondary"
              onClick={() => {
                setCompletedPaymentId(null);
                onClose();
              }}
            >
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
            <div className="text-lg font-semibold text-green-600 mb-2">
              Payment Recorded Successfully
            </div>
            <p className="text-sm text-text-muted">
              The receipt is shown below. You can print it or close this window.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {hasCurrentPlan && selectedPlan ? (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-text-primary">Membership Plan</span>
                <div className="flex items-center justify-between rounded-md border border-border bg-secondary-bg px-3 py-2 text-sm">
                  <span className="font-medium text-text-primary">{selectedPlan.name}</span>
                  <span className="text-text-muted">
                    {formatCurrency(selectedPlan.price)} · {selectedPlan.duration_days} days
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

            {summary && visibleFields.has("summary") && (
              <div className="space-y-1 rounded-md bg-secondary-bg p-2.5 text-sm">
                {summary.previous_dues > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Previous Dues:</span>
                    <span className="text-red-600">{formatCurrency(summary.previous_dues)}</span>
                  </div>
                )}
                {outstandingBills.slice(0, 2).map((bill) => (
                  <div key={bill.id} className="flex justify-between text-xs">
                    <span>
                      {bill.period_start} to {bill.period_end} ·{" "}
                      {bill.status.replace("PARTIALLY_PAID", "PARTIAL")}
                    </span>
                    <span>{formatCurrency(bill.remaining_amount)}</span>
                  </div>
                ))}
                {outstandingBills.length > 2 && (
                  <div className="text-xs text-text-muted">
                    + {outstandingBills.length - 2} more periods
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-border pt-1.5">
                  <span className="text-text-muted">Total Due:</span>
                  <span className={parseInt(amount, 10) > 0 ? "text-orange-600" : "text-green-600"}>
                    {formatCurrency(parseInt(amount, 10) || 0)}
                  </span>
                </div>
              </div>
            )}

            <PaymentFormFields
              visibleFields={visibleFields}
              amount={amount}
              onAmountChange={setAmount}
              amountMax={summary?.outstanding}
              method={method}
              onMethodChange={setMethod}
              paymentDate={paymentDate}
              onPaymentDateChange={setPaymentDate}
              notes={notes}
              onNotesChange={setNotes}
            />
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
