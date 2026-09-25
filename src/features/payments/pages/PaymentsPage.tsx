import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Ban,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  Pencil,
  RefreshCw,
  TrendingUp,
  HandCoins,
  RotateCcw,
  X,
} from "lucide-react";
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
import { formatCurrency, formatDate, formatPeriod } from "../../../lib/utils/format";
import {
  listPayments,
  voidPayment,
  updatePayment,
  type PaymentResponse,
  PAYMENT_METHODS,
} from "../../../lib/api/payments";
import { listMembers, type MemberResponse } from "../../../lib/api/members";
import { listActivePlans, type PlanResponse } from "../../../lib/api/membership-plans";
import { RecordPaymentModal } from "../components/RecordPaymentModal";
import { usePrivacy, HideToggleButton, maskValue } from "../../../context/PrivacyContext";

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

const AVATAR_COLORS = [
  { bg: "bg-emerald-100", text: "text-emerald-800" },
  { bg: "bg-blue-100", text: "text-blue-800" },
  { bg: "bg-amber-100", text: "text-amber-800" },
  { bg: "bg-purple-100", text: "text-purple-800" },
  { bg: "bg-rose-100", text: "text-rose-800" },
  { bg: "bg-teal-100", text: "text-teal-800" },
  { bg: "bg-indigo-100", text: "text-indigo-800" },
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  iconClass,
  surfaceClass,
  onClick,
  active = false,
  hidden = false,
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  helper: string;
  iconClass: string;
  surfaceClass: string;
  onClick?: () => void;
  active?: boolean;
  hidden?: boolean;
}) {
  return (
    <Card
      className={`${surfaceClass} ${
        onClick ? "cursor-pointer transition-all duration-200 hover:-translate-y-0.5" : ""
      } ${active ? "ring-2 ring-primary ring-offset-1" : ""}`}
    >
      <div onClick={onClick} className="flex min-w-0 items-start gap-4">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
        >
          <Icon size={19} />
        </div>
        <div className="min-w-0">
          <div className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {label}
          </div>
          <div
            className="mt-1.5 break-words text-xl font-bold leading-tight text-text-primary"
            aria-hidden={hidden}
          >
            {hidden ? maskValue() : value}
          </div>
          <div className="mt-1.5 text-[11px] text-text-muted">{helper}</div>
        </div>
      </div>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <div className="space-y-3">
        <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
        <div className="h-7 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
      </div>
    </Card>
  );
}

interface PaymentsPageProps {
  initialMemberId?: string | null;
}

export function PaymentsPage({ initialMemberId }: PaymentsPageProps) {
  const { addToast } = useToast();
  const { hidden } = usePrivacy();
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
  const [recordInitialMemberId, setRecordInitialMemberId] = useState<string | null>(null);

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
    listMembers({ include_archived: false })
      .then(setMembers)
      .catch(() => {});
    listActivePlans()
      .then(setPlans)
      .catch(() => {});
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
  const pagedPayments = filteredPayments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activePayments = useMemo(() => payments.filter((p) => !p.is_voided), [payments]);
  const voidedPayments = useMemo(() => payments.filter((p) => p.is_voided), [payments]);
  const totalRevenue = useMemo(
    () => activePayments.reduce((s, p) => s + p.amount, 0),
    [activePayments],
  );
  const paymentCount = activePayments.length;
  const avgPayment = paymentCount > 0 ? Math.round(totalRevenue / paymentCount) : 0;
  const voidedCount = voidedPayments.length;
  const voidedTotal = useMemo(
    () => voidedPayments.reduce((s, p) => s + p.amount, 0),
    [voidedPayments],
  );

  const hasActiveFilters = Boolean(
    search || datePreset || methodFilter || memberFilter || planFilter || statusFilter,
  );

  const resetFilters = () => {
    setSearch("");
    setDatePreset("");
    setMethodFilter("");
    setMemberFilter("");
    setPlanFilter("");
    setStatusFilter("");
  };

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
    <div className="payments-page space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Payments</h1>
          <p className="mt-1 text-xs text-text-muted">
            Record and manage all member payments, receipts, and revenue history.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <HideToggleButton />
          <Button variant="secondary" onClick={load}>
            <RefreshCw size={15} />
            Refresh
          </Button>
          <Button
            onClick={() => {
              setRecordInitialMemberId(null);
              setRecordOpen(true);
            }}
            className="bg-[#17613f] hover:bg-[#104b31]"
          >
            <ReceiptText size={16} />
            Record Payment
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              icon={TrendingUp}
              label="Total Revenue"
              value={formatCurrency(totalRevenue)}
              helper="Valid payments collected"
              iconClass="bg-emerald-100 text-emerald-700"
              surfaceClass="bg-gradient-to-br from-emerald-50 to-white"
              onClick={() => setStatusFilter("")}
              active={!statusFilter}
              hidden={hidden}
            />
            <StatCard
              icon={ReceiptText}
              label="Total Receipts"
              value={paymentCount}
              helper="Active receipts issued"
              iconClass="bg-blue-100 text-blue-600"
              surfaceClass="bg-gradient-to-br from-blue-50 to-white"
              onClick={() => setStatusFilter("valid")}
              active={statusFilter === "valid"}
              hidden={hidden}
            />
            <StatCard
              icon={HandCoins}
              label="Average Receipt"
              value={formatCurrency(avgPayment)}
              helper="Average transaction size"
              iconClass="bg-amber-100 text-amber-600"
              surfaceClass="bg-gradient-to-br from-amber-50 to-white"
              hidden={hidden}
            />
            <StatCard
              icon={Ban}
              label="Voided Receipts"
              value={voidedCount}
              helper={
                hidden
                  ? maskValue()
                  : voidedTotal > 0
                    ? `${formatCurrency(voidedTotal)} voided`
                    : "No voided receipts"
              }
              iconClass="bg-red-100 text-red-600"
              surfaceClass="bg-gradient-to-br from-red-50 to-white"
              onClick={() => setStatusFilter("voided")}
              active={statusFilter === "voided"}
              hidden={hidden}
            />
          </>
        )}
      </div>

      {/* Filter & Search Toolbar Card */}
      <Card className="p-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
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
                className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-8 text-xs text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X size={14} />
                </button>
              )}
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
              className="w-40 text-xs"
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
              className="w-36 text-xs"
            />

            <Select
              options={[
                { value: "", label: "All Methods" },
                ...PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
              ]}
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-36 text-xs"
            />

            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-32 text-xs"
            />

            <Select
              options={DATE_PRESETS}
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="w-36 text-xs"
            />

            {hasActiveFilters && (
              <Button
                variant="secondary"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                <RotateCcw size={13} />
                Reset
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end lg:self-center text-xs text-text-muted font-medium">
            <span>
              Showing {filteredPayments.length} {filteredPayments.length === 1 ? "receipt" : "receipts"}
            </span>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading && <LoadingState message="Loading payments..." />}
      {error && !loading && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && filteredPayments.length === 0 && (
        <EmptyState
          title={hasActiveFilters ? "No payments matching filters" : "No payments recorded yet"}
          message={
            hasActiveFilters
              ? "Try adjusting your search criteria or reset active filters."
              : "Record your first member payment to begin tracking receipts and revenue history."
          }
          action={
            !hasActiveFilters
              ? {
                  label: "+ Record Payment",
                  onClick: () => {
                    setRecordInitialMemberId(null);
                    setRecordOpen(true);
                  },
                }
              : { label: "Clear Filters", onClick: resetFilters }
          }
        />
      )}

      {!loading && !error && filteredPayments.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-[#fafbfa] text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Receipt #</th>
                  <th className="px-4 py-3 text-left">Member</th>
                  <th className="px-4 py-3 text-left">Membership</th>
                  <th className="px-4 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedPayments.map((p) => {
                  const avatarColor = getAvatarColor(p.member_name || "Unknown");
                  const initials = (p.member_name || "U")
                    .split(" ")
                    .map((part) => part[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border transition-colors hover:bg-[#f6faf7] last:border-b-0 ${
                        p.is_voided ? "bg-red-50/25 opacity-75" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-[11px] text-text-muted whitespace-nowrap">
                        {p.receipt_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarColor.bg} ${avatarColor.text}`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-text-primary truncate">
                              {p.member_name || "Unknown"}
                            </div>
                            {p.member_number && (
                              <div className="text-[11px] text-text-muted">{p.member_number}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {p.membership_plan_name || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={METHOD_BADGE[p.payment_method] ?? "info"}>
                          {p.payment_method}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-text-primary whitespace-nowrap">
                        <span className={p.is_voided ? "line-through text-text-muted font-normal" : ""}>
                          {hidden ? maskValue() : formatCurrency(p.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.is_voided ? (
                          <Badge variant="danger">Voided</Badge>
                        ) : (
                          <Badge variant="active">Paid</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setDetailTarget(p)}
                            className="h-7 px-2.5 text-xs"
                          >
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setReceiptPaymentId(p.id)}
                            className="h-7 px-2.5 text-xs"
                          >
                            Receipt
                          </Button>
                          {!p.is_voided && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openEdit(p)}
                                className="h-7 px-2 text-xs"
                                title="Edit notes & reference"
                              >
                                <Pencil size={13} />
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setVoidTarget(p)}
                                className="h-7 px-2 text-xs text-danger hover:text-danger hover:border-danger/30"
                                title="Void payment"
                              >
                                <Ban size={13} className="mr-1" />
                                Void
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-border bg-[#fafbfa] px-4 py-3 text-xs text-text-muted">
            <span>
              Showing {Math.min((safePage - 1) * PAGE_SIZE + 1, filteredPayments.length)}–
              {Math.min(safePage * PAGE_SIZE, filteredPayments.length)} of {filteredPayments.length}{" "}
              {filteredPayments.length === 1 ? "receipt" : "receipts"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={15} />
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
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={recordOpen}
        onClose={() => {
          setRecordOpen(false);
          setRecordInitialMemberId(null);
        }}
        initialMemberId={recordInitialMemberId}
        onPaymentRecorded={() => load()}
      />

      {/* Receipt Preview Modal */}
      <ReceiptPreview
        isOpen={!!receiptPaymentId}
        onClose={() => setReceiptPaymentId(null)}
        paymentId={receiptPaymentId}
      />

      {/* Payment Details Modal */}
      <Modal
        isOpen={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="Payment Details"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => {
                if (detailTarget) {
                  setReceiptPaymentId(detailTarget.id);
                  setDetailTarget(null);
                }
              }}
              className="text-xs"
            >
              <ReceiptText size={14} className="mr-1.5" />
              Print Receipt
            </Button>
            <Button variant="secondary" onClick={() => setDetailTarget(null)}>
              Close
            </Button>
          </div>
        }
      >
        {detailTarget && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3.5 rounded-lg border border-border bg-[#fafbfa] p-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Receipt #
                </div>
                <div className="mt-1 font-mono font-bold text-text-primary">
                  {detailTarget.receipt_number}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Date
                </div>
                <div className="mt-1 font-medium text-text-primary">
                  {formatDate(detailTarget.payment_date)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Member
                </div>
                <div className="mt-1 font-semibold text-text-primary">
                  {detailTarget.member_name || "Unknown"}
                </div>
                {detailTarget.member_number && (
                  <div className="text-[11px] text-text-muted">{detailTarget.member_number}</div>
                )}
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Membership Plan
                </div>
                <div className="mt-1 font-medium text-text-primary">
                  {detailTarget.membership_plan_name || "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Amount
                </div>
                <div className="mt-1 text-base font-bold text-text-primary">
                  {hidden ? maskValue() : formatCurrency(detailTarget.amount)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Payment Method
                </div>
                <div className="mt-1">
                  <Badge variant={METHOD_BADGE[detailTarget.payment_method] ?? "info"}>
                    {detailTarget.payment_method}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Status
                </div>
                <div className="mt-1">
                  {detailTarget.is_voided ? (
                    <Badge variant="danger">Voided</Badge>
                  ) : (
                    <Badge variant="active">Paid</Badge>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Coverage Period
                </div>
                <div className="mt-1 font-medium text-text-primary">
                  {formatPeriod(
                    detailTarget.membership_start_date,
                    detailTarget.membership_expiry_date,
                    "→",
                  )}
                </div>
              </div>
              {detailTarget.description && (
                <div className="col-span-2 border-t border-border pt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Description
                  </div>
                  <div className="mt-0.5 font-medium text-text-primary">
                    {detailTarget.description}
                  </div>
                </div>
              )}
              {detailTarget.reference && (
                <div className="col-span-2 border-t border-border pt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Reference
                  </div>
                  <div className="mt-0.5 font-mono text-text-primary">
                    {detailTarget.reference}
                  </div>
                </div>
              )}
              {detailTarget.notes && (
                <div className="col-span-2 border-t border-border pt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Notes
                  </div>
                  <div className="mt-0.5 text-text-primary">{detailTarget.notes}</div>
                </div>
              )}
              {detailTarget.void_reason && (
                <div className="col-span-2 border-t border-border pt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-danger">
                    Void Reason
                  </div>
                  <div className="mt-0.5 font-medium text-danger">{detailTarget.void_reason}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Payment Modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit Payment — ${editTarget?.receipt_number ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              loading={editSubmitting}
              onClick={handleEdit}
              className="bg-[#17613f] hover:bg-[#104b31]"
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-text-muted">
            Only description, reference, and notes are editable. Financial fields cannot be changed.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-text-primary">Description</label>
            <input
              type="text"
              name="edit_payment_description"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-text-primary">Reference</label>
            <input
              type="text"
              name="edit_payment_reference"
              value={editRef}
              onChange={(e) => setEditRef(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-text-primary">Notes</label>
            <textarea
              name="edit_payment_notes"
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </Modal>

      {/* Void Payment Modal */}
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
        <div className="space-y-4 text-xs">
          <p className="text-text-muted">
            This will void receipt <strong className="text-text-primary">{voidTarget?.receipt_number}</strong> for{" "}
            <strong className="text-text-primary">
              {voidTarget ? (hidden ? maskValue() : formatCurrency(voidTarget.amount)) : ""}
            </strong>
            . This action cannot be undone and will restore the member's dues balance.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-text-primary">Reason for voiding *</label>
            <textarea
              name="void_reason"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
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
