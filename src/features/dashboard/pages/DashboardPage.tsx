import { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Wallet,
} from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { formatCurrency } from "../../../lib/utils/format";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "../../../lib/api/dashboard";

function StatCard({
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
    <Card className="flex items-center gap-4 p-4">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}
      >
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        <div className="text-xs text-text-muted">{label}</div>
      </div>
    </Card>
  );
}

const METHOD_BADGE: Record<string, "active" | "info"> = {
  Cash: "active",
  Card: "info",
  BankTransfer: "info",
  Other: "info",
};

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSummary(await getDashboardSummary());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!summary) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your gym's performance."
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Members"
          value={summary.total_members}
          color="bg-primary"
        />
        <StatCard
          icon={UserCheck}
          label="Active"
          value={summary.active_members}
          color="bg-green-500"
        />
        <StatCard
          icon={Clock}
          label="Expiring Soon"
          value={summary.expiring_soon}
          color="bg-amber-500"
        />
        <StatCard
          icon={AlertTriangle}
          label="Expired"
          value={summary.expired_members}
          color="bg-red-500"
        />
      </div>

      <div className="grid grid-cols-5 gap-4">
        <StatCard
          icon={DollarSign}
          label="Today's Revenue"
          value={formatCurrency(summary.today_revenue)}
          color="bg-emerald-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Monthly Revenue"
          value={formatCurrency(summary.month_revenue)}
          color="bg-blue-500"
        />
        <StatCard
          icon={TrendingDown}
          label="Monthly Expenses"
          value={formatCurrency(summary.month_expenses)}
          color="bg-orange-500"
        />
        <StatCard
          icon={Activity}
          label="Net Income"
          value={formatCurrency(summary.month_net_income)}
          color={summary.month_net_income >= 0 ? "bg-primary" : "bg-red-500"}
        />
        <StatCard
          icon={Wallet}
          label="Outstanding"
          value={formatCurrency(summary.total_outstanding)}
          color={summary.total_outstanding > 0 ? "bg-amber-500" : "bg-green-500"}
        />
      </div>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-text-primary">
          Recent Payments
        </h3>
        {summary.recent_payments.length === 0 ? (
          <p className="text-sm text-text-muted">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-xs font-medium text-text-muted">
                    Receipt
                  </th>
                  <th className="pb-2 text-left text-xs font-medium text-text-muted">
                    Member
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-text-muted">
                    Amount
                  </th>
                  <th className="pb-2 text-left text-xs font-medium text-text-muted">
                    Method
                  </th>
                  <th className="pb-2 text-left text-xs font-medium text-text-muted">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.recent_payments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="py-2 font-mono text-xs text-text-muted">
                      {p.receipt_number}
                    </td>
                    <td className="py-2 text-text-primary">
                      {p.member_name || "Unknown"}
                    </td>
                    <td className="py-2 text-right font-medium text-text-primary">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-2">
                      <Badge
                        variant={METHOD_BADGE[p.payment_method] ?? "info"}
                      >
                        {p.payment_method}
                      </Badge>
                    </td>
                    <td className="py-2 text-text-muted">{p.payment_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
