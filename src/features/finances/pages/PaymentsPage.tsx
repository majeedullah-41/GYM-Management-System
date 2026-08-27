import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, DollarSign, TrendingUp, Calendar, Hash, Ban, ChevronLeft, ChevronRight } from "lucide-react";
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
  type PaymentResponse,
} from "../../../lib/api/payments";

const DATE_PRESETS = [
  { value: "", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

const METHOD_OPTIONS = [
  { value: "", label: "All Methods" },
  { value: "Cash", label: "Cash" },
  { value: "Card", label: "Card" },
  { value: "BankTransfer", label: "Bank Transfer" },
  { value: "Other", label: "Other" },
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
  Card: "info",
  BankTransfer: "info",
  Other: "info",
};

const PAGE_SIZE = 20;

function KPICard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <div className="text-lg font-bold text-text-primary">{value}</div>
        <div className="text-xs text-text-muted">{label}</div>
      </div>
    </Card>
  );
}

export function PaymentsPage() {
  const { addToast } = useToast();
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [page, setPage] = useState(1);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);

  const [voidTarget, setVoidTarget] = useState<PaymentResponse | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidSubmitting, setVoidSubmitting] = useState(false);

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
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [search, datePreset]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, datePreset, methodFilter]);

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

  const today = new Date().toISOString().split("T")[0];
  const todayRevenue = payments
    .filter((p) => p.payment_date === today && !p.is_voided)
    .reduce((s, p) => s + p.amount, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStr = weekStart.toISOString().split("T")[0];
  const weekRevenue = payments
    .filter((p) => p.payment_date >= weekStr && !p.is_voided)
    .reduce((s, p) => s + p.amount, 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthRevenue = payments
    .filter((p) => p.payment_date >= monthStart && !p.is_voided)
    .reduce((s, p) => s + p.amount, 0);
  const activePayments = payments.filter((p) => !p.is_voided);
  const totalRevenue = activePayments.reduce((s, p) => s + p.amount, 0);

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
        description="View and manage payment records."
      />

      {!loading && (
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            icon={DollarSign}
            label="Today's Income"
            value={formatCurrency(todayRevenue)}
            color="bg-emerald-500"
          />
          <KPICard
            icon={TrendingUp}
            label="This Week"
            value={formatCurrency(weekRevenue)}
            color="bg-blue-500"
          />
          <KPICard
            icon={Calendar}
            label="This Month"
            value={formatCurrency(monthRevenue)}
            color="bg-primary"
          />
          <KPICard
            icon={Hash}
            label="Total Transactions"
            value={activePayments.length}
            color="bg-purple-500"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            name="payment_search"
            placeholder="Search by receipt #, member name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <Select
          options={METHOD_OPTIONS}
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="w-40"
        />
        <Select
          options={DATE_PRESETS}
          value={datePreset}
          onChange={(e) => setDatePreset(e.target.value)}
          className="w-40"
        />
      </div>

      {totalRevenue > 0 && !loading && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm">
            <DollarSign size={16} className="text-primary" />
            <span className="text-text-muted">Total:</span>
            <span className="font-semibold text-text-primary">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
          <span className="text-xs text-text-muted">
            {activePayments.length} payment{activePayments.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {loading && <LoadingState message="Loading payments..." />}
      {error && !loading && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && filteredPayments.length === 0 && (
        <EmptyState
          title={search || datePreset || methodFilter ? "No payments found" : "No payments yet"}
          message={
            search || datePreset || methodFilter
              ? "Try adjusting your search or filters."
              : "Payments will appear here once you record your first payment."
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
                    Receipt #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Member
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Plan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Date
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
                    <td className="px-4 py-3 font-semibold text-text-primary">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={METHOD_BADGE[p.payment_method] ?? "info"}>
                        {p.payment_method}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {p.membership_plan_name || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {p.membership_start_date} \u2192 {p.membership_expiry_date}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {p.payment_date}
                    </td>
                    <td className="px-4 py-3">
                      {p.is_voided ? (
                        <Badge variant="danger">Voided</Badge>
                      ) : (
                        <Badge variant="active">Valid</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setReceiptPaymentId(p.id)}
                        >
                          Receipt
                        </Button>
                        {!p.is_voided && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setVoidTarget(p)}
                          >
                            <Ban size={14} className="mr-1" />
                            Void
                          </Button>
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
              Showing {Math.min((safePage - 1) * PAGE_SIZE + 1, filteredPayments.length)}\u2013
              {Math.min(safePage * PAGE_SIZE, filteredPayments.length)} of {filteredPayments.length}
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
              <span className="text-text-primary font-medium">
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

      <ReceiptPreview
        isOpen={!!receiptPaymentId}
        onClose={() => setReceiptPaymentId(null)}
        paymentId={receiptPaymentId}
      />

      <Modal
        isOpen={!!voidTarget}
        onClose={() => { setVoidTarget(null); setVoidReason(""); }}
        title="Void Payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setVoidTarget(null); setVoidReason(""); }}>
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
            This will void receipt <strong>{voidTarget?.receipt_number}</strong> for{" "}
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
