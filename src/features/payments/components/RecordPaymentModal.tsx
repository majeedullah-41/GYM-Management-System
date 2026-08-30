import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Check } from "lucide-react";
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
  PAYMENT_METHODS,
} from "../../../lib/api/payments";
import { listMembers, type MemberResponse } from "../../../lib/api/members";
import {
  listActivePlans,
  type PlanResponse,
} from "../../../lib/api/membership-plans";
import { formatCurrency } from "../../../lib/utils/format";
import { ReceiptPreview } from "../../receipts/components/ReceiptPreview";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialMemberId?: string | null;
  onPaymentRecorded: () => void;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  initialMemberId,
  onPaymentRecorded,
}: Props) {
  const { addToast } = useToast();
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberResponse | null>(
    null,
  );
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [submitting, setSubmitting] = useState(false);
  const [completedPaymentId, setCompletedPaymentId] = useState<string | null>(
    null,
  );
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [admissionFee, setAdmissionFee] = useState<string>("");
  const [currentPlanLoading, setCurrentPlanLoading] = useState(false);
  const [hasCurrentPlan, setHasCurrentPlan] = useState(false);

  useEffect(() => {
    if (isOpen) {
      listMembers({ include_archived: false })
        .then(setMembers)
        .catch(() => {});
      listActivePlans()
        .then(setPlans)
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelectedMember(null);
      setMemberSearch("");
      setSelectedPlanId("");
      setAmount("");
      setMethod("Cash");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setCompletedPaymentId(null);
      setSummary(null);
      setMemberDropdownOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMemberId]);

  useEffect(() => {
    if (!isOpen || !initialMemberId) return;
    const existing = members.find((m) => m.id === initialMemberId);
    if (existing) {
      setSelectedMember(existing);
      setMemberSearch(existing.full_name);
    }
  }, [isOpen, initialMemberId, members]);

  useEffect(() => {
    if (!selectedMember || !isOpen) {
      setHasCurrentPlan(false);
      return;
    }
    let cancelled = false;
    setCurrentPlanLoading(true);
    listMemberPayments(selectedMember.id)
      .then((ps) => {
        if (cancelled) return;
        const latest = ps
          .filter((p) => !p.is_voided)
          .sort((a, b) =>
            (b.payment_date + b.created_at).localeCompare(
              a.payment_date + a.created_at,
            ),
          )[0] as PaymentResponse | undefined;
        const planId =
          (latest ? latest.membership_plan_id : null) ??
          selectedMember.membership_plan_id;
        const plan = planId
          ? plans.find((p) => p.id === planId)
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
  }, [selectedMember, isOpen, plans]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        memberDropdownRef.current &&
        !memberDropdownRef.current.contains(e.target as Node)
      ) {
        setMemberDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        (m.member_number || "").toLowerCase().includes(q) ||
        (m.phone || "").toLowerCase().includes(q),
    );
  }, [members, memberSearch]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  useEffect(() => {
    if (!selectedMember || !selectedPlanId || !isOpen) {
      setSummary(null);
      setAdmissionFee("");
      return;
    }
    setSummaryLoading(true);
    getPaymentSummary(selectedMember.id, selectedPlanId)
      .then((s) => {
        setSummary(s);
        const fee = s.admission_fee && s.is_first_payment ? s.admission_fee : 0;
        setAdmissionFee(String(fee));
        const planOnly = s.plan_price - s.previously_paid;
        setAmount(String(planOnly + fee));
      })
      .catch(() => { setSummary(null); setAdmissionFee(""); })
      .finally(() => setSummaryLoading(false));
  }, [selectedMember, selectedPlanId, isOpen]);

  const planOnlyOutstanding = summary
    ? Math.max(0, summary.plan_price - summary.previously_paid)
    : 0;

  useEffect(() => {
    if (!summary) return;
    const fee = summary.is_first_payment ? (parseInt(admissionFee, 10) || 0) : 0;
    setAmount(String(planOnlyOutstanding + fee));
  }, [admissionFee, planOnlyOutstanding]);

  const handleSubmit = async () => {
    if (!selectedMember) {
      addToast({ variant: "warning", title: "Select a member" });
      return;
    }
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
        member_id: selectedMember.id,
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
        notes: null,
      });
      addToast({
        variant: "success",
        title: "Payment recorded",
        message: `${formatCurrency(amountNum)} payment from ${selectedMember.full_name} saved.`,
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
        title="Record Payment"
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
          <div className="py-8 text-center">
            <div className="mb-2 text-lg font-semibold text-green-600">
              Payment Recorded Successfully
            </div>
            <p className="text-sm text-text-muted">
              The receipt is shown below. You can print it or close this window.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">
                Member *
              </label>
              <div className="relative" ref={memberDropdownRef}>
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="text"
                  name="payment_member_search"
                  placeholder="Search member by name, number or phone..."
                  value={memberSearch}
                  onFocus={() => setMemberDropdownOpen(true)}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    setMemberDropdownOpen(true);
                  }}
                  className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
                {memberDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-md border border-border bg-surface shadow-lg">
                    {filteredMembers.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-text-muted">
                        No members found
                      </div>
                    ) : (
                      filteredMembers.slice(0, 20).map((m) => (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => {
                            setSelectedMember(m);
                            setMemberSearch(m.full_name);
                            setMemberDropdownOpen(false);
                            setSelectedPlanId("");
                            setSummary(null);
                            setAmount("");
                          }}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-secondary-bg"
                        >
                          <span>
                            <span className="font-medium text-text-primary">
                              {m.full_name}
                            </span>
                            <span className="ml-2 text-xs text-text-muted">
                              {m.member_number}
                            </span>
                          </span>
                          {selectedMember?.id === m.id && (
                            <Check size={16} className="text-primary" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

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
                onChange={(e) => setSelectedPlanId(e.target.value)}
              />
            )}

            {currentPlanLoading && (
              <div className="py-2 text-center text-sm text-text-muted">
                Loading member plan...
              </div>
            )}

            {summaryLoading && selectedPlanId && (
              <div className="py-2 text-center text-sm text-text-muted">
                Loading plan info...
              </div>
            )}

            {summary && selectedMember && (
              <div className="space-y-1.5 rounded-md bg-secondary-bg p-3 text-sm">
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
                    <span className="text-green-600">
                      {formatCurrency(summary.previously_paid)}
                    </span>
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
                <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                  <span className="text-text-muted">
                    {summary.is_first_payment
                      ? "Total Due:"
                      : "Outstanding:"}
                  </span>
                  <span
                    className={
                      parseInt(amount, 10) > 0
                        ? "text-orange-600"
                        : "text-green-600"
                    }
                  >
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
                  value={amount}
                  placeholder="e.g. 2000"
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <Select
                label="Payment Method *"
                options={PAYMENT_METHODS.map((m) => ({
                  value: m,
                  label: m,
                }))}
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
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Payment Now:</span>
                  <span className="font-medium text-blue-800">
                    {formatCurrency(parseInt(amount, 10) || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Remaining After Payment:</span>
                  <span className="font-medium text-blue-800">
                    {formatCurrency(
                      Math.max(
                        0,
                        summary.outstanding - (parseInt(amount, 10) || 0),
                      ),
                    )}
                  </span>
                </div>
              </div>
            )}

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
