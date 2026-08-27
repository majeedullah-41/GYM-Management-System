import { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  UserCheck,
  Clock,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Wallet,
  CreditCard,
  PiggyBank,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { useNavigation } from "../../../components/layout/NavigationContext";
import { formatCurrency } from "../../../lib/utils/format";
import {
  getDashboardSummary,
  type DashboardSummary,
  type ExpiringMember,
} from "../../../lib/api/dashboard";
import type { MemberResponse } from "../../../lib/api/members";

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

function StatCardSkeleton() {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
      <div className="space-y-2">
        <div className="h-7 w-16 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
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

const STATUS_BADGE: Record<string, "active" | "expiring" | "expired"> = {
  active: "active",
  expiring: "expiring",
  expired: "expired",
};

function DaysTag({ days }: { days: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        days <= 1
          ? "bg-red-100 text-red-700"
          : days <= 3
            ? "bg-amber-100 text-amber-700"
            : "bg-blue-100 text-blue-700"
      }`}
    >
      <Clock size={12} />
      {days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`}
    </span>
  );
}

function QuickActions() {
  const { openAddMember, openRecordPayment, navigateTo } = useNavigation();

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">
        Quick Actions
      </h3>
      <div className="flex gap-3">
        <Button
          variant="primary"
          className="flex items-center gap-2"
          onClick={openAddMember}
        >
          <UserPlus size={16} />
          Add Member
        </Button>
        <Button
          variant="secondary"
          className="flex items-center gap-2"
          onClick={openRecordPayment}
        >
          <CreditCard size={16} />
          Receive Payment
        </Button>
        <Button
          variant="secondary"
          className="flex items-center gap-2"
          onClick={() => navigateTo("finances")}
        >
          <PiggyBank size={16} />
          Add Expense
        </Button>
      </div>
    </Card>
  );
}

function MembershipOverview({
  active,
  expiring,
  expired,
}: {
  active: number;
  expiring: number;
  expired: number;
}) {
  const total = active + expiring + expired;
  const activePct = total > 0 ? (active / total) * 100 : 0;
  const expiringPct = total > 0 ? (expiring / total) * 100 : 0;
  const expiredPct = total > 0 ? (expired / total) * 100 : 0;

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">
        Membership Overview
      </h3>
      {total === 0 ? (
        <p className="text-sm text-text-muted">No members yet.</p>
      ) : (
        <>
          <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-gray-100">
            {active > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${activePct}%` }}
              />
            )}
            {expiring > 0 && (
              <div
                className="bg-amber-500 transition-all"
                style={{ width: `${expiringPct}%` }}
              />
            )}
            {expired > 0 && (
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${expiredPct}%` }}
              />
            )}
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-xs text-text-muted">
                Active ({active})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-xs text-text-muted">
                Expiring ({expiring})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-text-muted">
                Expired ({expired})
              </span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function ExpiringMembersCard({ members }: { members: ExpiringMember[] }) {
  const { navigateToMember } = useNavigation();

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">
        Expiring Soon
      </h3>
      {members.length === 0 ? (
        <p className="text-sm text-text-muted">No memberships expiring soon.</p>
      ) : (
        <div className="space-y-2">
          {members.slice(0, 5).map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-md border border-border p-2.5 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
                  <AlertCircle size={16} className="text-red-500" />
                </div>
                <div>
                  <button
                    className="text-sm font-medium text-text-primary hover:text-primary hover:underline"
                    onClick={() => navigateToMember(m.id)}
                  >
                    {m.full_name}
                  </button>
                  <div className="text-xs text-text-muted">
                    {m.plan_name ?? "No plan"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DaysTag days={m.days_remaining} />
                {m.outstanding > 0 && (
                  <span className="text-xs font-medium text-amber-600">
                    {formatCurrency(m.outstanding)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function RecentMembersCard({ members }: { members: MemberResponse[] }) {
  const { navigateToMember } = useNavigation();

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          Recent Members
        </h3>
        <button
          className="flex items-center gap-1 text-xs text-primary hover:underline"
          onClick={() => useNavigation().navigateTo("members")}
        >
          View All <ChevronRight size={14} />
        </button>
      </div>
      {members.length === 0 ? (
        <p className="text-sm text-text-muted">No members yet.</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-md border border-border p-2.5 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {m.full_name.charAt(0)}
                </div>
                <div>
                  <button
                    className="text-sm font-medium text-text-primary hover:text-primary hover:underline"
                    onClick={() => navigateToMember(m.id)}
                  >
                    {m.full_name}
                  </button>
                  <div className="text-xs text-text-muted">
                    {m.member_number}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.membership_status && (
                  <Badge variant={STATUS_BADGE[m.membership_status] ?? "info"}>
                    {m.membership_status}
                  </Badge>
                )}
                {m.outstanding_balance > 0 && (
                  <span className="text-xs font-medium text-amber-600">
                    {formatCurrency(m.outstanding_balance)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}

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

  if (loading) return <DashboardSkeleton />;
  if (error)
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertTriangle size={48} className="text-red-400" />
        <p className="text-sm text-text-muted">{error}</p>
        <Button variant="primary" onClick={load}>
          Retry
        </Button>
      </div>
    );
  if (!summary) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your gym's performance."
      />

      <QuickActions />

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
          color={
            summary.month_net_income >= 0 ? "bg-primary" : "bg-red-500"
          }
        />
        <StatCard
          icon={Wallet}
          label="Outstanding"
          value={formatCurrency(summary.total_outstanding)}
          color={
            summary.total_outstanding > 0 ? "bg-amber-500" : "bg-green-500"
          }
        />
      </div>

      <MembershipOverview
        active={summary.active_members}
        expiring={summary.expiring_soon}
        expired={summary.expired_members}
      />

      <div className="grid grid-cols-2 gap-6">
        <ExpiringMembersCard members={summary.expiring_members} />
        <RecentMembersCard members={summary.recent_members} />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            Recent Payments
          </h3>
          <button
            className="flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={() => useNavigation().navigateTo("finances")}
          >
            View All <ChevronRight size={14} />
          </button>
        </div>
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
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0"
                  >
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
