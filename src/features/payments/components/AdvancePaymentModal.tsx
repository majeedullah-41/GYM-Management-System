import { useEffect, useRef, useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/feedback/ToastProvider";
import { formatCurrency } from "../../../lib/utils/format";
import {
  createAdvancePayment,
  previewAdvancePayment,
  type AdvancePaymentPreview,
  PAYMENT_METHODS,
} from "../../../lib/api/payments";
import type { MemberResponse } from "../../../lib/api/members";
import { ReceiptPreview } from "../../receipts/components/ReceiptPreview";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  member: MemberResponse | null;
  onPaymentRecorded: () => void;
}

const QUICK_OPTIONS = [1, 3, 6, 12];

type Stage = "form" | "confirm" | "done";

export function AdvancePaymentModal({ isOpen, onClose, member, onPaymentRecorded }: Props) {
  const { addToast } = useToast();
  const [periodCount, setPeriodCount] = useState(3);
  const [preview, setPreview] = useState<AdvancePaymentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [submitting, setSubmitting] = useState(false);
  const [completedPaymentId, setCompletedPaymentId] = useState<string | null>(null);
  const requestKeyRef = useRef(crypto.randomUUID());

  useEffect(() => {
    if (isOpen) {
      setPeriodCount(3);
      setMethod("Cash");
      setNote("");
      setStage("form");
      setSubmitting(false);
      setCompletedPaymentId(null);
      setPreview(null);
      setPreviewError(null);
      requestKeyRef.current = crypto.randomUUID();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !member || periodCount < 1) {
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    const timer = setTimeout(() => {
      previewAdvancePayment(member.id, periodCount)
        .then((p) => {
          if (cancelled) return;
          setPreview(p);
          setPreviewError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          setPreview(null);
          setPreviewError(err instanceof Error ? err.message : "Could not preview advance payment");
        })
        .finally(() => {
          if (cancelled) return;
          setPreviewLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, member, periodCount]);

  const handleConfirmPayment = async () => {
    if (!member || !preview) return;
    try {
      setSubmitting(true);
      const payment = await createAdvancePayment({
        member_id: member.id,
        period_count: preview.period_count,
        payment_method: method,
        note: note.trim() || null,
        idempotency_key: requestKeyRef.current,
      });
      addToast({
        variant: "success",
        title: "Advance payment recorded",
        message: `${formatCurrency(payment.amount)} from ${member.full_name} saved.`,
      });
      onPaymentRecorded();
      setCompletedPaymentId(payment.id);
      setStage("done");
    } catch (err) {
      addToast({
        variant: "error",
        title: "Advance payment failed",
        message: err instanceof Error ? err.message : "Could not record advance payment",
      });
      setStage("form");
    } finally {
      setSubmitting(false);
    }
  };

  const canContinue = !!preview && periodCount >= 1 && !previewLoading;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Advance Payment"
        footer={
          stage === "done" ? (
            <Button
              variant="secondary"
              onClick={() => {
                setCompletedPaymentId(null);
                onClose();
              }}
            >
              Done
            </Button>
          ) : stage === "confirm" ? (
            <>
              <Button variant="secondary" onClick={() => setStage("form")} disabled={submitting}>
                Back
              </Button>
              <Button loading={submitting} onClick={handleConfirmPayment}>
                Confirm Payment
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={!canContinue} onClick={() => setStage("confirm")}>
                {preview ? `Pay ${formatCurrency(preview.total)}` : "Pay"}
              </Button>
            </>
          )
        }
      >
        {stage === "done" ? (
          <div className="space-y-4 py-4 text-center">
            <div className="text-lg font-semibold text-green-600">
              Advance Payment Received
            </div>
            {member && (
              <div className="text-sm font-medium text-text-primary">{member.full_name}</div>
            )}
            {preview && (
              <div className="mx-auto max-w-xs space-y-1 rounded-md bg-secondary-bg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Paid For:</span>
                  <span className="font-medium text-text-primary">
                    {preview.coverage_start} → {preview.coverage_end}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Periods:</span>
                  <span className="text-text-primary">
                    {preview.period_count} {preview.period_count === 1 ? "period" : "periods"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Amount:</span>
                  <span className="font-medium text-text-primary">
                    {formatCurrency(preview.total)}
                  </span>
                </div>
              </div>
            )}
            <p className="text-sm text-text-muted">
              The receipt is shown below. You can print it or close this window.
            </p>
          </div>
        ) : stage === "confirm" ? (
          <div className="space-y-3">
            {member && (
              <div className="flex items-center justify-between rounded-md border border-border bg-secondary-bg px-3 py-2 text-sm">
                <span className="font-medium text-text-primary">{member.full_name}</span>
                <span className="text-text-muted">{member.member_number}</span>
              </div>
            )}
            {preview && (
              <div className="space-y-1 rounded-md bg-secondary-bg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Advance Period:</span>
                  <span className="font-medium text-text-primary">
                    {preview.coverage_start} → {preview.coverage_end}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Periods:</span>
                  <span className="text-text-primary">
                    {preview.period_count} {preview.period_count === 1 ? "period" : "periods"}
                  </span>
                </div>
                {preview.outstanding_dues > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Dues to Settle:</span>
                    <span className="text-red-600">{formatCurrency(preview.outstanding_dues)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                  <span className="text-text-muted">Amount:</span>
                  <span className="text-text-primary">{formatCurrency(preview.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Method:</span>
                  <span className="text-text-primary">{method}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {member && (
              <div className="flex items-center justify-between rounded-md border border-border bg-secondary-bg px-3 py-2 text-sm">
                <span className="font-medium text-text-primary">{member.full_name}</span>
                <span className="text-text-muted">{member.member_number}</span>
              </div>
            )}

            <div className="flex items-center justify-between rounded-md bg-secondary-bg px-3 py-2 text-sm">
              <span className="text-text-muted">Paid Through</span>
              <span className="font-medium text-text-primary">
                {preview?.paid_through ?? (previewLoading ? "Loading..." : "—")}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-primary">Pay Upcoming Periods</span>
              <div className="flex flex-wrap gap-2">
                {QUICK_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPeriodCount(n)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                      periodCount === n
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-secondary-bg text-text-primary hover:bg-border"
                    }`}
                  >
                    {n} {n === 1 ? "Period" : "Periods"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="advance_period_count" className="text-sm font-medium text-text-primary">
                  Custom Periods
                </label>
                <input
                  type="number"
                  name="advance_period_count"
                  id="advance_period_count"
                  min={1}
                  value={periodCount === 0 ? "" : periodCount}
                  placeholder="e.g. 4"
                  onChange={(e) => setPeriodCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
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

            {previewError && (
              <div className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {previewError}
              </div>
            )}

            {previewLoading && periodCount >= 1 && (
              <div className="py-2 text-center text-sm text-text-muted">Loading preview...</div>
            )}

            {preview && !previewLoading && (
              <div className="space-y-1 rounded-md bg-secondary-bg p-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">New Coverage:</span>
                  <span className="font-medium text-text-primary">
                    {preview.coverage_start} → {preview.coverage_end}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Periods:</span>
                  <span className="text-text-primary">{preview.period_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Fee</span>
                  <span className="text-text-primary">
                    {preview.period_count} × {formatCurrency(preview.fee)} ={" "}
                    {formatCurrency(preview.future_total)}
                  </span>
                </div>
                {preview.outstanding_dues > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Dues to Settle First:</span>
                    <span className="text-red-600">{formatCurrency(preview.outstanding_dues)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                  <span className="text-text-muted">Total:</span>
                  <span className="text-orange-600">{formatCurrency(preview.total)}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">
                Note <span className="text-text-muted">(optional)</span>
              </label>
              <textarea
                name="advance_payment_note"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                rows={1}
                placeholder="Advance payment note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>

      <ReceiptPreview
        isOpen={!!completedPaymentId}
        onClose={() => {
          setCompletedPaymentId(null);
          setStage("done");
        }}
        paymentId={completedPaymentId}
      />
    </>
  );
}