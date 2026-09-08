import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  HandCoins,
  ReceiptText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserRoundPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { useNavigation } from "../../../components/layout/NavigationContext";
import { formatCurrency } from "../../../lib/utils/format";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "../../../lib/api/dashboard";

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  iconClass,
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  helper: string;
  iconClass: string;
}) {
  return (
    <Card>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {label}
          </div>
          <div className="mt-3 break-words text-xl font-bold leading-tight text-text-primary">
            {value}
          </div>
          <div className="mt-2 text-xs text-text-muted">{helper}</div>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon size={18} />
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

function QuickActions() {
  const { openAddMember, openRecordPayment, navigateTo } = useNavigation();

  return (
    <Card title="Quick Actions">
      <div className="grid grid-cols-2 gap-2.5">
        <Button className="w-full" onClick={openRecordPayment}>
          <HandCoins size={17} />
          Receive Payment
        </Button>
        <Button variant="secondary" className="w-full" onClick={openAddMember}>
          <UserRoundPlus size={17} />
          Add Member
        </Button>
        <Button
          variant="secondary"
          className="col-span-2 w-full"
          onClick={() => navigateTo("finances")}
        >
          <ReceiptText size={17} />
          Add Expense
        </Button>
      </div>
    </Card>
  );
}

function MonthlyFinancialCard({ summary }: { summary: DashboardSummary }) {
  const values = [summary.month_revenue, summary.month_expenses, Math.abs(summary.month_net_income)];
  const maximum = Math.max(...values, 1);
  const rows = [
    {
      label: "Revenue",
      value: summary.month_revenue,
      width: (summary.month_revenue / maximum) * 100,
      color: "bg-blue-500",
    },
    {
      label: "Expenses",
      value: summary.month_expenses,
      width: (summary.month_expenses / maximum) * 100,
      color: "bg-rose-400",
    },
    {
      label: "Net Income",
      value: summary.month_net_income,
      width: (Math.abs(summary.month_net_income) / maximum) * 100,
      color: summary.month_net_income >= 0 ? "bg-emerald-500" : "bg-red-500",
    },
  ];

  return (
    <Card title="Monthly Financial Summary">
      <p className="mb-7 text-xs text-text-muted">Revenue, expenses, and net income for this month</p>
      <div className="space-y-7 py-2">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-text-primary">{row.label}</span>
              <span className="font-semibold text-text-primary">{formatCurrency(row.value)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-secondary-bg">
              <div
                className={`h-full min-w-1 rounded-full transition-all ${row.color}`}
                style={{ width: `${row.width}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const METHOD_BADGE: Record<string, "active" | "info"> = {
  Cash: "active",
  Card: "info",
  "Bank Transfer": "info",
  Other: "info",
};

function RecentPayments({ summary }: { summary: DashboardSummary }) {
  const { navigateTo } = useNavigation();

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Recent Payments</h3>
        <button
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => navigateTo("payments")}
        >
          View All
        </button>
      </div>
      {summary.recent_payments.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">No payments recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th className="pb-2 text-left font-medium">Receipt</th>
                <th className="pb-2 text-left font-medium">Member</th>
                <th className="pb-2 text-left font-medium">Method</th>
                <th className="pb-2 text-left font-medium">Date</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {summary.recent_payments.map((payment) => (
                <tr key={payment.id} className="border-b border-border last:border-0">
                  <td className="py-3 font-mono text-xs text-text-muted">{payment.receipt_number}</td>
                  <td className="py-3 font-medium text-text-primary">
                    {payment.member_name || "Unknown"}
                  </td>
                  <td className="py-3">
                    <Badge variant={METHOD_BADGE[payment.payment_method] ?? "info"}>
                      {payment.payment_method}
                    </Badge>
                  </td>
                  <td className="py-3 text-text-muted">{payment.payment_date}</td>
                  <td className="py-3 text-right font-semibold text-text-primary">
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function RecentMembers({ summary }: { summary: DashboardSummary }) {
  const { navigateTo, navigateToMember } = useNavigation();

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Recent Members</h3>
        <button
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => navigateTo("members")}
        >
          View All
        </button>
      </div>
      {summary.recent_members.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">No members yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {summary.recent_members.map((member) => (
            <button
              key={member.id}
              className="flex w-full items-center justify-between gap-3 py-3 text-left first:pt-0 last:pb-0"
              onClick={() => navigateToMember(member.id)}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {member.full_name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {member.full_name}
                  </span>
                  <span className="block font-mono text-xs text-text-muted">
                    {member.member_number}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium text-text-muted">
                {member.membership_plan_name || "No plan"}
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-12 w-52 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="h-96 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-96 animate-pulse rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PK", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

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

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertTriangle size={48} className="text-red-400" />
        <p className="text-sm text-text-muted">{error}</p>
        <Button onClick={load}>Retry</Button>
      </div>
    );
  }
  if (!summary) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
          <p className="mt-1 text-sm text-text-muted">{currentDate}</p>
        </div>
        <Button variant="secondary" onClick={load}>
          <RefreshCw size={15} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          icon={Users}
          label="Total Members"
          value={summary.total_members}
          helper="Registered members"
          iconClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={UserCheck}
          label="Active Members"
          value={summary.active_members}
          helper="Currently active"
          iconClass="bg-violet-50 text-violet-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Monthly Revenue"
          value={formatCurrency(summary.month_revenue)}
          helper="This month"
          iconClass="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={TrendingDown}
          label="Monthly Expenses"
          value={formatCurrency(summary.month_expenses)}
          helper="This month"
          iconClass="bg-orange-50 text-orange-600"
        />
        <StatCard
          icon={Wallet}
          label="Outstanding"
          value={formatCurrency(summary.total_outstanding)}
          helper="Unpaid balance"
          iconClass="bg-red-50 text-red-600"
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-5">
          <MonthlyFinancialCard summary={summary} />
          <RecentPayments summary={summary} />
        </div>
        <div className="space-y-5">
          <QuickActions />
          <RecentMembers summary={summary} />
        </div>
      </div>
    </div>
  );
}
