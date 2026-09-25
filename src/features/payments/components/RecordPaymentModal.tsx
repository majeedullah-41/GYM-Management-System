import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Info, Search } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/feedback/ToastProvider";
import {
  createPayment,
  getPaymentSummary,
  listMemberPayments,
  type PaymentResponse,
  type PaymentSummary,
} from "../../../lib/api/payments";
import { listMembers, type MemberResponse } from "../../../lib/api/members";
import { listActivePlans, type PlanResponse } from "../../../lib/api/membership-plans";
import { getPaymentFormSettings } from "../../../lib/api/settings";
import { formatCurrency, formatDate, formatPeriod } from "../../../lib/utils/format";
import { ReceiptPreview } from "../../receipts/components/ReceiptPreview";
import { PaymentFormFields } from "./PaymentFormFields";
import {
  DEFAULT_VISIBLE_PAYMENT_FIELDS,
  normalizePaymentFields,
  type PaymentFieldKey,
} from "../paymentFields";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialMemberId?: string | null;
  onPaymentRecorded: () => void;
}

function memberInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function planCadence(plan: PlanResponse) {
  if (plan.duration_days === 1) return "per day";
  if (plan.duration_days === 7) return "per week";
  if (plan.duration_days >= 28 && plan.duration_days <= 31) return "per month";
  return `per ${plan.duration_days} days`;
}

export function RecordPaymentModal({ isOpen, onClose, initialMemberId, onPaymentRecorded }: Props) {
  const { addToast } = useToast();
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberResponse | null>(null);
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const requestKeyRef = useRef(crypto.randomUUID());

  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentMonth, setPaymentMonth] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completedPaymentId, setCompletedPaymentId] = useState<string | null>(null);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [currentPlanLoading, setCurrentPlanLoading] = useState(false);
  const [lastPayment, setLastPayment] = useState<PaymentResponse | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [discounts, setDiscounts] = useState<Record<string, string>>({});
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
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
    if (!isOpen) return;
    listMembers({ include_archived: false })
      .then(setMembers)
      .catch(() => {});
    listActivePlans()
      .then(setPlans)
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedMember(null);
    setMemberSearch("");
    setSelectedPlanId("");
    setAmount("");
    setMethod("Cash");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMonth("");
    setNotes("");
    setCompletedPaymentId(null);
    setSummary(null);
    setDetailsOpen(false);
    setDiscounts({});
    setSelectedBillIds(new Set());
    setMemberDropdownOpen(false);
    requestKeyRef.current = crypto.randomUUID();
  }, [isOpen, initialMemberId]);

  useEffect(() => {
    if (!isOpen || !initialMemberId) return;
    const member = members.find((item) => item.id === initialMemberId);
    if (member) {
      setSelectedMember(member);
      setMemberSearch(member.full_name);
    }
  }, [isOpen, initialMemberId, members]);

  useEffect(() => {
    if (!selectedMember || !isOpen) {
      setLastPayment(null);
      return;
    }

    let cancelled = false;
    setCurrentPlanLoading(true);
    setLastPayment(null);
    listMemberPayments(selectedMember.id)
      .then((payments) => {
        if (cancelled) return;
        const latest = payments
          .filter((payment) => !payment.is_voided)
          .sort((a, b) =>
            (b.payment_date + b.created_at).localeCompare(a.payment_date + a.created_at),
          )[0];
        setLastPayment(latest ?? null);

        const planId = selectedMember.membership_plan_id ?? latest?.membership_plan_id ?? "";
        setSelectedPlanId(plans.some((plan) => plan.id === planId) ? planId : "");
      })
      .catch(() => setSelectedPlanId(""))
      .finally(() => {
        if (!cancelled) setCurrentPlanLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMember, isOpen, plans]);

  useEffect(() => {
    if (!isOpen) return;
    const closeDropdown = (event: MouseEvent) => {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
        setMemberDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", closeDropdown);
    return () => document.removeEventListener("mousedown", closeDropdown);
  }, [isOpen]);

  useEffect(() => {
    if (!selectedMember || !selectedPlanId || !isOpen) {
      setSummary(null);
      return;
    }
    setSummaryLoading(true);
    setDetailsOpen(false);
    setDiscounts({});
    getPaymentSummary(selectedMember.id, selectedPlanId)
      .then((result) => {
        setSummary(result);
        const unpaid = result.bills.filter((b) => b.remaining_amount > 0);
        const today = new Date().toISOString().split("T")[0];
        const current = unpaid.find(
          (b) =>
            b.status === "CURRENT" ||
            (b.period_start <= today && b.period_end >= today),
        );

        let initialSelection: Set<string>;
        if (current) {
          initialSelection = new Set([current.id]);
          setAmount(String(current.remaining_amount));
        } else {
          initialSelection = new Set(unpaid.map((b) => b.id));
          setAmount(String(result.outstanding));
        }
        setSelectedBillIds(initialSelection);

        if (unpaid.length > 0) {
          setDetailsOpen(true);
        }
      })
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [selectedMember, selectedPlanId, isOpen]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return members;
    return members.filter(
      (member) =>
        member.full_name.toLowerCase().includes(query) ||
        member.member_number.toLowerCase().includes(query) ||
        (member.phone || "").toLowerCase().includes(query),
    );
  }, [members, memberSearch]);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const outstandingBills = useMemo(
    () => summary?.bills.filter((bill) => bill.remaining_amount > 0) ?? [],
    [summary],
  );

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const selectedBills = useMemo(
    () => outstandingBills.filter((bill) => selectedBillIds.has(bill.id)),
    [outstandingBills, selectedBillIds],
  );

  const unselectedBills = useMemo(
    () => outstandingBills.filter((bill) => !selectedBillIds.has(bill.id)),
    [outstandingBills, selectedBillIds],
  );

  const unselectedDuesTotal = useMemo(
    () => unselectedBills.reduce((sum, b) => sum + b.remaining_amount, 0),
    [unselectedBills],
  );

  const totalDiscount = useMemo(
    () =>
      selectedBills.reduce((sum, bill) => {
        const raw = discounts[bill.id];
        return sum + (raw ? Math.floor(Number(raw)) || 0 : 0);
      }, 0),
    [selectedBills, discounts],
  );

  const payableAfterDiscount = useMemo(
    () =>
      selectedBills.reduce((sum, bill) => {
        const raw = discounts[bill.id];
        const disc = raw ? Math.floor(Number(raw)) || 0 : 0;
        return sum + Math.max(0, bill.remaining_amount - disc);
      }, 0),
    [selectedBills, discounts],
  );


  const handleDiscountChange = (billId: string, value: string) => {
    const bill = outstandingBills.find((b) => b.id === billId);
    if (!bill) return;
    const numeric = Math.floor(Number(value.replace(/[^\d]/g, "")) || 0);
    const clamped = Math.min(numeric, Math.max(0, bill.remaining_amount));
    const next = { ...discounts };
    if (clamped <= 0) {
      delete next[billId];
    } else {
      next[billId] = String(clamped);
    }
    setDiscounts(next);
    const payable = outstandingBills
      .filter((b) => selectedBillIds.has(b.id))
      .reduce((sum, b) => {
        const raw = b.id === billId ? next[b.id] : discounts[b.id];
        const disc = raw ? Math.floor(Number(raw)) || 0 : 0;
        return sum + Math.max(0, b.remaining_amount - disc);
      }, 0);
    setAmount(String(payable));
  };

  const toggleBillSelection = (billId: string) => {
    const next = new Set(selectedBillIds);
    if (next.has(billId)) {
      next.delete(billId);
    } else {
      next.add(billId);
    }
    setSelectedBillIds(next);

    const payable = outstandingBills
      .filter((b) => next.has(b.id))
      .reduce((sum, b) => {
        const raw = discounts[b.id];
        const disc = raw ? Math.floor(Number(raw)) || 0 : 0;
        return sum + Math.max(0, b.remaining_amount - disc);
      }, 0);
    setAmount(String(payable));
  };

  const selectAllBills = () => {
    const next = new Set(outstandingBills.map((b) => b.id));
    setSelectedBillIds(next);
    const payable = outstandingBills.reduce((sum, b) => {
      const raw = discounts[b.id];
      const disc = raw ? Math.floor(Number(raw)) || 0 : 0;
      return sum + Math.max(0, b.remaining_amount - disc);
    }, 0);
    setAmount(String(payable));
  };

  const isAllSelected =
    outstandingBills.length > 0 && selectedBillIds.size === outstandingBills.length;

  const selectMember = (member: MemberResponse) => {
    setSelectedMember(member);
    setMemberSearch(member.full_name);
    setMemberDropdownOpen(false);
    setSelectedPlanId("");
    setSummary(null);
    setAmount("");
    setDiscounts({});
    setSelectedBillIds(new Set());
  };

  const handleSubmit = async () => {
    if (!selectedMember) {
      addToast({ variant: "warning", title: "Select a member" });
      return;
    }
    if (!selectedPlanId) {
      addToast({ variant: "warning", title: "Select a plan" });
      return;
    }
    if (selectedBillIds.size === 0) {
      addToast({ variant: "warning", title: "Please select at least one billing period to pay" });
      return;
    }
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber < 0) {
      addToast({ variant: "warning", title: "Enter a valid amount" });
      return;
    }
    const discountEntries = outstandingBills
      .filter((bill) => selectedBillIds.has(bill.id))
      .flatMap((bill) => {
        const raw = discounts[bill.id];
        const discountAmount = raw ? Math.floor(Number(raw)) || 0 : 0;
        return discountAmount > 0 ? [{ monthly_bill_id: bill.id, amount: discountAmount }] : [];
      });
    if (amountNumber === 0 && discountEntries.length === 0) {
      addToast({ variant: "warning", title: "Enter a valid amount" });
      return;
    }

    try {
      setSubmitting(true);
      const payment = await createPayment({
        member_id: selectedMember.id,
        membership_plan_id: selectedPlanId,
        amount: amountNumber,
        payment_method: method,
        payment_date: paymentDate,
        payment_month: paymentMonth.trim() || null,
        description: null,
        reference: null,
        notes: notes.trim() || null,
        idempotency_key: requestKeyRef.current,
        discounts: discountEntries,
        bill_ids: Array.from(selectedBillIds),
      });
      addToast({
        variant: "success",
        title: "Payment recorded",
        message: `${formatCurrency(amountNumber)} payment from ${selectedMember.full_name} saved.`,
      });
      onPaymentRecorded();
      setCompletedPaymentId(payment.id);
    } catch (error) {
      addToast({
        variant: "error",
        title: "Payment failed",
        message: error instanceof Error ? error.message : "Could not record payment",
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
        maxWidthClassName="max-w-4xl lg:max-w-5xl"
        compact
        footer={
          completedPaymentId ? (
            <Button variant="secondary" onClick={onClose}>
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
            <p className="text-sm text-text-muted">The receipt is ready to view or print.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {!selectedMember && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary">Member *</label>
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
                    onChange={(event) => {
                      setMemberSearch(event.target.value);
                      setMemberDropdownOpen(true);
                    }}
                    className="w-full rounded-md border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  {memberDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-md border border-border bg-surface shadow-lg">
                      {filteredMembers.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-text-muted">No members found</div>
                      ) : (
                        filteredMembers.slice(0, 20).map((member) => (
                          <button
                            type="button"
                            key={member.id}
                            onClick={() => selectMember(member)}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-secondary-bg"
                          >
                            <span>
                              <span className="font-medium text-text-primary">
                                {member.full_name}
                              </span>
                              <span className="ml-2 text-xs text-text-muted">
                                {member.member_number}
                              </span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedMember && (
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-surface p-3 px-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-base font-bold text-primary">
                    {memberInitials(selectedMember.full_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-text-primary">
                      {selectedMember.full_name}
                    </div>
                    <div className="text-xs text-text-muted">{selectedMember.member_number}</div>
                    {!initialMemberId && (
                      <button
                        type="button"
                        className="mt-1 text-xs font-medium text-primary hover:underline"
                        onClick={() => {
                          setSelectedMember(null);
                          setMemberSearch("");
                          setSelectedPlanId("");
                          setSummary(null);
                          setAmount("");
                          setDiscounts({});
                        }}
                      >
                        Change member
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-14 w-px bg-slate-300 dark:bg-slate-700" />
                {selectedPlan ? (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-text-muted">Membership Plan</div>
                      <div className="text-base font-semibold text-text-primary">
                        {selectedPlan.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-primary">
                        {formatCurrency(summary?.plan_price ?? selectedPlan.price)}
                      </div>
                      <div className="text-xs text-text-muted">{planCadence(selectedPlan)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-text-muted">
                    {currentPlanLoading
                      ? "Loading membership plan..."
                      : "Select a membership plan below."}
                  </div>
                )}
              </div>
            )}

            {selectedMember && !selectedPlan && !currentPlanLoading && (
              <Select
                label="Membership Plan *"
                options={[
                  { value: "", label: "Select a plan..." },
                  ...plans.map((plan) => ({
                    value: plan.id,
                    label: `${plan.name} — ${formatCurrency(plan.price)} (${plan.duration_days} days)`,
                  })),
                ]}
                value={selectedPlanId}
                onChange={(event) => setSelectedPlanId(event.target.value)}
              />
            )}

            {summaryLoading && (
              <div className="py-2 text-center text-sm text-text-muted">
                Loading payment details...
              </div>
            )}

            {summary && selectedMember && visibleFields.has("summary") && (
              <div className="overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-secondary-bg">
                <div className="grid grid-cols-[1fr_auto_1.2fr] items-center gap-3 p-3 px-4">
                  <div>
                    <div className="text-sm font-medium text-text-muted">Last Paid</div>
                    {lastPayment ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">
                          {formatDate(lastPayment.payment_date)}
                        </span>
                        <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                          {formatCurrency(lastPayment.amount)}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-text-muted">No previous payment</div>
                    )}
                  </div>
                  <div className="h-14 w-px bg-slate-300 dark:bg-slate-700" />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-text-muted">Outstanding Due</div>
                      <div
                        className={`text-lg font-bold ${summary.outstanding > 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {formatCurrency(summary.outstanding)}
                      </div>
                      <div className="text-xs text-text-muted">
                        {selectedBillIds.size} of {outstandingBills.length} selected to pay
                        {unselectedDuesTotal > 0 && ` • ${formatCurrency(unselectedDuesTotal)} unpaid`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailsOpen((open) => !open)}
                      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-blue-50"
                      aria-expanded={detailsOpen}
                    >
                      {detailsOpen ? "Hide Details" : "View Details"}
                      {detailsOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                    </button>
                  </div>
                </div>
                {detailsOpen && (
                  <div className="border-t border-slate-300 dark:border-slate-700 bg-surface">
                    {outstandingBills.length ? (
                      <div className="p-3 space-y-2.5">


                        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                          <table className="w-full text-left text-sm border-collapse">
                            <thead className="border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                              <tr>
                                <th
                                  scope="col"
                                  className="w-10 px-3 py-2.5 text-center border-r border-slate-200 dark:border-slate-700"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    ref={(el) => {
                                      if (el) {
                                        el.indeterminate =
                                          selectedBillIds.size > 0 &&
                                          selectedBillIds.size < outstandingBills.length;
                                      }
                                    }}
                                    onChange={() => {
                                      if (isAllSelected) {
                                        setSelectedBillIds(new Set());
                                        setAmount("0");
                                      } else {
                                        selectAllBills();
                                      }
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                    title={isAllSelected ? "Deselect all" : "Select all"}
                                  />
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 py-2.5 text-left whitespace-nowrap border-r border-slate-200 dark:border-slate-700"
                                >
                                  Period
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 py-2.5 text-center whitespace-nowrap border-r border-slate-200 dark:border-slate-700"
                                >
                                  Status
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 py-2.5 text-right whitespace-nowrap border-r border-slate-200 dark:border-slate-700"
                                >
                                  Due Amount
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 py-2.5 text-right whitespace-nowrap border-r border-slate-200 dark:border-slate-700"
                                >
                                  Discount (PKR)
                                </th>
                                <th scope="col" className="px-4 py-2.5 text-right whitespace-nowrap">
                                  Net Payable
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                              {outstandingBills.map((bill) => {
                                const isSelected = selectedBillIds.has(bill.id);
                                const discountValue = discounts[bill.id];
                                const discountNumber = discountValue
                                  ? Math.floor(Number(discountValue)) || 0
                                  : 0;
                                const dueAfter = Math.max(0, bill.remaining_amount - discountNumber);
                                const isWaived =
                                  discountNumber === bill.remaining_amount &&
                                  bill.remaining_amount > 0;
                                const isCurrent =
                                  bill.status === "CURRENT" ||
                                  (bill.period_start <= todayStr && bill.period_end >= todayStr);

                                return (
                                  <tr
                                    key={bill.id}
                                    onClick={() => toggleBillSelection(bill.id)}
                                    className={`cursor-pointer transition-colors ${
                                      !isSelected
                                        ? "bg-slate-50/60 dark:bg-slate-900/30 opacity-60 hover:opacity-100"
                                        : isWaived
                                          ? "bg-green-50/50 dark:bg-green-950/20"
                                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                    }`}
                                  >
                                    <td
                                      className="px-3 py-2 text-center border-r border-slate-200 dark:border-slate-700"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleBillSelection(bill.id)}
                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                      />
                                    </td>
                                    <td className="px-4 py-2 font-medium text-text-primary whitespace-nowrap border-r border-slate-200 dark:border-slate-700">
                                      <div className="flex items-center gap-2">
                                        <span>{formatPeriod(bill.period_start, bill.period_end)}</span>
                                        {isCurrent && (
                                          <span className="rounded bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                                            Current
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-center whitespace-nowrap border-r border-slate-200 dark:border-slate-700">
                                      <span
                                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                                          bill.status === "PARTIALLY_PAID"
                                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                            : bill.status === "CURRENT"
                                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                              : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                                        }`}
                                      >
                                        {bill.status === "PARTIALLY_PAID"
                                          ? "Partially paid"
                                          : bill.status === "CURRENT"
                                            ? "Current"
                                            : "Due"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-right font-semibold text-text-primary whitespace-nowrap border-r border-slate-200 dark:border-slate-700">
                                      {formatCurrency(bill.remaining_amount)}
                                    </td>
                                    <td
                                      className="px-4 py-2 text-right whitespace-nowrap border-r border-slate-200 dark:border-slate-700"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center justify-end gap-1">
                                        <input
                                          type="number"
                                          inputMode="numeric"
                                          min={0}
                                          max={bill.remaining_amount}
                                          value={discountValue ?? ""}
                                          disabled={!isSelected}
                                          onChange={(event) =>
                                            handleDiscountChange(bill.id, event.target.value)
                                          }
                                          placeholder="0"
                                          className={`w-24 rounded-md border px-2.5 py-1 text-right text-sm transition-colors focus:ring-1 ${
                                            !isSelected
                                              ? "border-slate-200 bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                              : discountNumber > 0
                                                ? "border-green-500 bg-green-50/50 text-green-700 font-semibold focus:border-green-600 focus:ring-green-600 dark:border-green-600 dark:bg-green-950/30 dark:text-green-300"
                                                : "border-slate-300 dark:border-slate-600 bg-surface text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-primary"
                                          }`}
                                        />
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-right font-semibold whitespace-nowrap">
                                      {isSelected ? (
                                        <span
                                          className={
                                            dueAfter === 0
                                              ? "text-slate-400 font-normal"
                                              : "text-primary dark:text-emerald-400 font-bold"
                                          }
                                        >
                                          {formatCurrency(dueAfter)}
                                        </span>
                                      ) : (
                                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                          Excluded (Unpaid)
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-sm font-semibold">
                                <td
                                  colSpan={3}
                                  className="px-4 py-2.5 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700"
                                >
                                  Selected Total ({selectedBillIds.size} of {outstandingBills.length}{" "}
                                  {outstandingBills.length === 1 ? "period" : "periods"})
                                </td>
                                <td className="px-4 py-2.5 text-right text-text-primary whitespace-nowrap border-r border-slate-200 dark:border-slate-700">
                                  {formatCurrency(
                                    selectedBills.reduce((s, b) => s + b.remaining_amount, 0),
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right whitespace-nowrap border-r border-slate-200 dark:border-slate-700">
                                  {totalDiscount > 0 ? (
                                    <span className="text-green-700 dark:text-green-400">
                                      -{formatCurrency(totalDiscount)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-primary whitespace-nowrap">
                                  {formatCurrency(payableAfterDiscount)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {unselectedBills.length > 0 && (
                          <div className="flex items-center gap-1.5 rounded-lg bg-amber-50/90 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                            <Info size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>
                              <strong>
                                {unselectedBills.length} unmarked{" "}
                                {unselectedBills.length === 1 ? "period" : "periods"}
                              </strong>{" "}
                              ({formatCurrency(unselectedDuesTotal)}) will remain outstanding as Due.
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-2.5 text-center text-xs text-text-muted">
                        No unpaid periods.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <PaymentFormFields
              visibleFields={visibleFields}
              amount={amount}
              onAmountChange={setAmount}
              method={method}
              onMethodChange={setMethod}
              paymentDate={paymentDate}
              onPaymentDateChange={setPaymentDate}
              paymentMonth={paymentMonth}
              onPaymentMonthChange={setPaymentMonth}
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
