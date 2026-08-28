import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Ban,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  Pencil,
} from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { Modal } from "../../../components/ui/Modal";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useToast } from "../../../components/feedback/ToastProvider";
import { ReceiptPreview } from "../../receipts/components/ReceiptPreview";
import { formatCurrency } from "../../../lib/utils/format";
import {
  listPayments,
  voidPayment,
  updatePayment,
  type PaymentResponse,
  PAYMENT_METHODS,
} from "../../../lib/api/payments";
import { listMembers, type MemberResponse } from "../../../lib/api/members";
import {
  listActivePlans,
  type PlanResponse,
} from "../../../lib/api/membership-plans";
import { RecordPaymentModal } from "../components/RecordPaymentModal";

const DATE_PRESETS = [
  { value: "", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "year", label: "This Year" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "valid", label: "Valid" },
  { value: "voided", label: "Voided" },
];

function getDateRange(preset: string): { from: string; to: string } | null {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { from: fmt(now), to: fmt(now) };
    case "week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { from: fmt(start), to: fmt(now) };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(start), to: fmt(now) };
    }
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(start), to: fmt(end) };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { from: fmt(start), to: fmt(now) };
    }
    default:
      return null;
  }
}

const METHOD_BADGE: Record<string, "active" | "info"> = {
  Cash: "active",
  "Bank Transfer": "info",
  Card: "info",
  Other: "info",
};

const PAGE_SIZE = 20;

interface PaymentsPageProps {
  initialMemberId?: string | null;
}

export function PaymentsPage({ initialMemberId }: PaymentsPageProps) {
  const { addToast } = useToast();
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [plans, setPlans] = useState<PlanResponse[]>([]);

  const [page, setPage] = useState(1);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);

  const [recordOpen, setRecordOpen] = useState(false);
  const [recordInitialMemberId, setRecordInitialMemberId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (initialMemberId) {
      setRecordInitialMemberId(initialMemberId);
      setRecordOpen(true);
    }
  }, [initialMemberId]);

  const [detailTarget, setDetailTarget] = useState<PaymentResponse | null>(null);

  const [voidTarget, setVoidTarget] = useState<PaymentResponse | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<PaymentResponse | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editRef, setEditRef] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    listMembers({ include_archived: false }).then(setMembers).catch(() => {});
    listActivePlans().then(setPlans).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const range = getDateRange(datePreset);
      setPayments(
        await listPayments({
          search,
          date_from: range?.from,
          date_to: range?.to,
          member_id: memberFilter || undefined,
          plan_id: planFilter || undefined,
          status: statusFilter || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [search, datePreset, memberFilter, planFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, datePreset, memberFilter, planFilter, statusFilter, methodFilter]);

  const filteredPayments = useMemo(() => {
    if (!methodFilter) return payments;
    return payments.filter((p) => p.payment_method === methodFilter);
  }, [payments, methodFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedPayments = filteredPayments.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const activePayments = payments.filter((p) => !p.is_voided);
  const totalRevenue = activePayments.reduce((s, p) => s + p.amount, 0);
  const paymentCount = activePayments.length;
  const avgPayment = paymentCount > 0 ? Math.round(totalRevenue / paymentCount) : 0;

  const openEdit = (p: PaymentResponse) => {
    setEditTarget(p);
    setEditDesc(p.description || "");
    setEditRef(p.reference || "");
    setEditNotes(p.notes || "");
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    try {
      setEditSubmitting(true);
      await updatePayment(editTarget.id, {
        description: editDesc.trim() || null,
        reference: editRef.trim() || null,
        notes: editNotes.trim() || null,
      });
      addToast({
        variant: "success",
        title: "Payment updated",
        message: `Receipt ${editTarget.receipt_number} updated.`,
      });
      setEditTarget(null);
      await load();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Update failed",
        message: err instanceof Error ? err.message : "Could not update payment",
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleVoid = async () => {
    if (!voidTarget || !voidReason.trim()) return;
    try {
      setVoidSubmitting(true);
      await voidPayment(voidTarget.id, voidReason.trim());
      addToast({
        variant: "success",
        title: "Payment voided",
        message: `Receipt ${voidTarget.receipt_number} has been voided.`,
      });
      setVoidTarget(null);
      setVoidReason("");
      await load();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to void payment",
      });
    } finally {
      setVoidSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Record and manage all member payments and receipts."
        action={{
          label: "Record Payment",
          onClick: () => {
            setRecordInitialMemberId(null);
            setRecordOpen(true);
          },
        }}
      />

      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500">
              <ReceiptText size={18} className="text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-text-primary">
                {formatCurrency(totalRevenue)}
              </div>
              <div className="text-xs text-text-muted">
                Filtered Total (valid)
              </div>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <ReceiptText size={18} className="text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-text-primary">
                {paymentCount}
              </div>
              <div className="text-xs text-text-muted">Payment Count</div>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500">
              <ReceiptText size={18} className="text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-text-primary">
                {formatCurrency(avgPayment)}
              </div>
              <div className="text-xs text-text-muted">Average Payment</div>
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            name="payment_search"
            placeholder="Search by receipt #, member, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <Select
          options={[
            { value: "", label: "All Members" },
            ...members.map((m) => ({
              value: m.id,
              label: m.full_name,
            })),
          ]}
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value)}
          className="w-44"
        />
        <Select
          options={[
            { value: "", label: "All Plans" },
            ...plans.map((p) => ({
              value: p.id,
              label: p.name,
            })),
          ]}
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="w-40"
        />
        <Select
          options={[
            { value: "", label: "All Methods" },
            ...PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
          ]}
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="w-40"
        />
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-32"
        />
        <Select
          options={DATE_PRESETS}
          value={datePreset}
          onChange={(e) => setDatePreset(e.target.value)}
          className="w-36"
        />
      </div>

      {loading && <LoadingState message="Loading payments..." />}
      {error && !loading && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && filteredPayments.length === 0 && (
        <EmptyState
          title={
            search || datePreset || methodFilter || memberFilter || planFilter || statusFilter
              ? "No payments found"
              : "No payments yet"
          }
          message={
            search || datePreset || methodFilter || memberFilter || planFilter || statusFilter
              ? "Try adjusting your search or filters."
              : "Click 'Record Payment' to add your first payment."
          }
        />
      )}

      {!loading && !error && filteredPayments.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary-bg">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Receipt
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Member
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Membership
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Method
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                    Amount
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
                {pagedPayments.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-border last:border-b-0 ${
                      p.is_voided ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-text-muted">{p.payment_date}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">
                      {p.receipt_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">
                        {p.member_name || "Unknown"}
                      </div>
                      {p.member_number && (
                        <div className="text-xs text-text-muted">
                          {p.member_number}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {p.membership_plan_name || "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={METHOD_BADGE[p.payment_method] ?? "info"}>
                        {p.payment_method}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-text-primary">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3">
                      {p.is_voided ? (
                        <Badge variant="danger">Voided</Badge>
                      ) : (
                        <Badge variant="active">Paid</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setDetailTarget(p)}
                        >
                          View
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setReceiptPaymentId(p.id)}
                        >
                          Receipt
                        </Button>
                        {!p.is_voided && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openEdit(p)}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setVoidTarget(p)}
                            >
                              <Ban size={14} className="mr-1" />
                              Void
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-text-muted">
            <span>
              Showing{" "}
              {Math.min((safePage - 1) * PAGE_SIZE + 1, filteredPayments.length)}
              \u2013
              {Math.min(safePage * PAGE_SIZE, filteredPayments.length)} of{" "}
              {filteredPayments.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="font-medium text-text-primary">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </>
      )}

      <RecordPaymentModal
        isOpen={recordOpen}
        onClose={() => {
          setRecordOpen(false);
          setRecordInitialMemberId(null);
        }}
        initialMemberId={recordInitialMemberId}
        onPaymentRecorded={() => load()}
      />

      <ReceiptPreview
        isOpen={!!receiptPaymentId}
        onClose={() => setReceiptPaymentId(null)}
        paymentId={receiptPaymentId}
      />

      <Modal
        isOpen={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="Payment Details"
        footer={
          <Button variant="secondary" onClick={() => setDetailTarget(null)}>
            Close
          </Button>
        }
      >
        {detailTarget && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-text-muted">Receipt #</div>
                <div className="font-mono font-medium text-text-primary">
                  {detailTarget.receipt_number}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Date</div>
                <div className="font-medium text-text-primary">
                  {detailTarget.payment_date}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Member</div>
                <div className="font-medium text-text-primary">
                  {detailTarget.member_name || "Unknown"}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Membership</div>
                <div className="font-medium text-text-primary">
                  {detailTarget.membership_plan_name || "\u2014"}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Amount</div>
                <div className="font-semibold text-text-primary">
                  {formatCurrency(detailTarget.amount)}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Method</div>
                <div className="font-medium text-text-primary">
                  {detailTarget.payment_method}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Status</div>
                <div>
                  {detailTarget.is_voided ? (
                    <Badge variant="danger">Voided</Badge>
                  ) : (
                    <Badge variant="active">Paid</Badge>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Period</div>
                <div className="font-medium text-text-primary">
                  {detailTarget.membership_start_date} \u2192{" "}
                  {detailTarget.membership_expiry_date}
                </div>
              </div>
              {detailTarget.description && (
                <div className="col-span-2">
                  <div className="text-xs text-text-muted">Description</div>
                  <div className="font-medium text-text-primary">
                    {detailTarget.description}
                  </div>
                </div>
              )}
              {detailTarget.reference && (
                <div className="col-span-2">
                  <div className="text-xs text-text-muted">Reference</div>
                  <div className="font-medium text-text-primary">
                    {detailTarget.reference}
                  </div>
                </div>
              )}
              {detailTarget.notes && (
                <div className="col-span-2">
                  <div className="text-xs text-text-muted">Notes</div>
                  <div className="font-medium text-text-primary">
                    {detailTarget.notes}
                  </div>
                </div>
              )}
              {detailTarget.void_reason && (
                <div className="col-span-2">
                  <div className="text-xs text-text-muted">Void Reason</div>
                  <div className="font-medium text-danger">
                    {detailTarget.void_reason}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit Payment — ${editTarget?.receipt_number ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button loading={editSubmitting} onClick={handleEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Only description, reference, and notes are editable. Financial
            fields cannot be changed.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              Description
            </label>
            <input
              type="text"
              name="edit_payment_description"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              Reference
            </label>
            <input
              type="text"
              name="edit_payment_reference"
              value={editRef}
              onChange={(e) => setEditRef(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              Notes
            </label>
            <textarea
              name="edit_payment_notes"
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!voidTarget}
        onClose={() => {
          setVoidTarget(null);
          setVoidReason("");
        }}
        title="Void Payment"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setVoidTarget(null);
                setVoidReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={voidSubmitting}
              disabled={!voidReason.trim()}
              onClick={handleVoid}
            >
              Void Payment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            This will void receipt <strong>{voidTarget?.receipt_number}</strong>{" "}
            for{" "}
            <strong>{voidTarget ? formatCurrency(voidTarget.amount) : ""}</strong>.
            This action cannot be undone.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              Reason for voiding *
            </label>
            <textarea
              name="void_reason"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="e.g. Duplicate entry, wrong amount..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
