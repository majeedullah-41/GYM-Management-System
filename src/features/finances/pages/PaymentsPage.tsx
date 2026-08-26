import { useCallback, useEffect, useState } from "react";
import { Search, DollarSign } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { Badge } from "../../../components/ui/Badge";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ReceiptPreview } from "../../receipts/components/ReceiptPreview";
import { formatCurrency } from "../../../lib/utils/format";
import {
  listPayments,
  type PaymentResponse,
} from "../../../lib/api/payments";

const DATE_PRESETS = [
  { value: "", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
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

export function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);

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

  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="View and manage payment records."
      />

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
            {payments.length} payment{payments.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {loading && <LoadingState message="Loading payments..." />}
      {error && !loading && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && payments.length === 0 && (
        <EmptyState
          title={search || datePreset ? "No payments found" : "No payments yet"}
          message={
            search || datePreset
              ? "Try adjusting your search or date filter."
              : "Payments will appear here once you record your first payment."
          }
        />
      )}

      {!loading && !error && payments.length > 0 && (
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
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-b-0"
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
                    {p.membership_plan_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {p.membership_start_date} → {p.membership_expiry_date}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {p.payment_date}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setReceiptPaymentId(p.id)}
                    >
                      Receipt
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReceiptPreview
        isOpen={!!receiptPaymentId}
        onClose={() => setReceiptPaymentId(null)}
        paymentId={receiptPaymentId}
      />
    </div>
  );
}
