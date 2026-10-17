import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  HandCoins,
  Package,
  Pill,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  UserRoundPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { useNavigation } from "../../../components/layout/NavigationContext";
import { type AuthUser } from "../../../lib/api/auth";
import { formatCurrency, formatDate } from "../../../lib/utils/format";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "../../../lib/api/dashboard";
import {
  usePrivacy,
  HideToggleButton,
  maskValue,
} from "../../../context/PrivacyContext";

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  iconClass,
  surfaceClass,
  hidden = false,
  onClick,
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  helper: string;
  iconClass: string;
  surfaceClass: string;
  hidden?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`${surfaceClass} ${
        onClick
          ? "cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-md"
          : ""
      }`}
    >
      <div
        className="flex min-w-0 items-start gap-3.5"
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
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
          className="w-full"
          onClick={() => navigateTo("supplements")}
        >
          <Pill size={17} />
          Supplements POS
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => navigateTo("inventory")}
        >
          <Package size={17} />
          Manage Stock
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

function MonthlyFinancialCard({
  summary,
  hidden = false,
}: {
  summary: DashboardSummary;
  hidden?: boolean;
}) {
  const suppSales = summary.month_supplement_sales ?? 0;
  const values = [
    summary.month_revenue,
    suppSales,
    summary.month_expenses,
    Math.abs(summary.month_net_income),
  ];
  const maximum = Math.max(...values, 1);
  const rows = [
    {
      label: "Membership Revenue",
      value: summary.month_revenue,
      width: (summary.month_revenue / maximum) * 100,
      color: "bg-emerald-600",
    },
    {
      label: "Supplement Sales",
      value: suppSales,
      width: (suppSales / maximum) * 100,
      color: "bg-teal-500",
    },
    {
      label: "Expenses (incl. Supplier Paid)",
      value: summary.month_expenses,
      width: (summary.month_expenses / maximum) * 100,
      color: "bg-rose-400",
    },
    {
      label: "Net Income",
      value: summary.month_net_income,
      width: (Math.abs(summary.month_net_income) / maximum) * 100,
      color: summary.month_net_income >= 0 ? "bg-blue-500" : "bg-red-500",
    },
  ];

  return (
    <Card title="Monthly Financial Summary">
      <p className="mb-5 text-xs text-text-muted">
        Membership revenue, supplement sales, expenses, and net income for this
        month
      </p>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-text-primary">{row.label}</span>
              <span
                className="font-semibold text-text-primary"
                aria-hidden={hidden}
              >
                {hidden ? maskValue() : formatCurrency(row.value)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-secondary-bg">
              {!hidden && (
                <div
                  className={`dashboard-progress h-full min-w-1 rounded-full transition-all ${row.color}`}
                  style={{ width: `${row.width}%` }}
                />
              )}
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

function RecentPayments({
  summary,
  hidden = false,
}: {
  summary: DashboardSummary;
  hidden?: boolean;
}) {
  const { navigateTo } = useNavigation();

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          Recent Membership Payments
        </h3>
        <button
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => navigateTo("payments")}
        >
          View All
        </button>
      </div>
      {summary.recent_payments.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">
          No payments recorded yet.
        </p>
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
                <tr
                  key={payment.id}
                  className="border-b border-border transition-colors hover:bg-[#f6faf7] last:border-0"
                >
                  <td className="py-3 font-mono text-xs text-text-muted">
                    {payment.receipt_number}
                  </td>
                  <td className="py-3 font-medium text-text-primary">
                    {payment.member_name || "Unknown"}
                  </td>
                  <td className="py-3">
                    <Badge
                      variant={METHOD_BADGE[payment.payment_method] ?? "info"}
                    >
                      {payment.payment_method}
                    </Badge>
                  </td>
                  <td className="py-3 text-text-muted">
                    {formatDate(payment.payment_date)}
                  </td>
                  <td
                    className="py-3 text-right font-semibold text-text-primary"
                    aria-hidden={hidden}
                  >
                    {hidden ? maskValue() : formatCurrency(payment.amount)}
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

function RecentSupplementSales({
  summary,
  hidden = false,
}: {
  summary: DashboardSummary;
  hidden?: boolean;
}) {
  const { navigateTo } = useNavigation();
  const sales = summary.recent_supplement_sales ?? [];

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          Recent Supplement Sales (POS)
        </h3>
        <button
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => navigateTo("supplements")}
        >
          Open Supplements
        </button>
      </div>
      {sales.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">
          No supplement sales recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th className="pb-2 text-left font-medium">Invoice</th>
                <th className="pb-2 text-left font-medium">Customer</th>
                <th className="pb-2 text-left font-medium">Item</th>
                <th className="pb-2 text-center font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-border transition-colors hover:bg-[#f6faf7] last:border-0"
                >
                  <td className="py-3 font-mono text-xs text-text-muted">
                    {sale.invoice_number}
                  </td>
                  <td className="py-3 font-medium text-text-primary">
                    {sale.customer_name}
                  </td>
                  <td className="py-3 text-text-muted">{sale.item_name}</td>
                  <td className="py-3 text-center text-xs text-text-muted">
                    {sale.quantity} {sale.item_unit}
                  </td>
                  <td
                    className="py-3 text-right font-semibold text-emerald-700"
                    aria-hidden={hidden}
                  >
                    {hidden ? maskValue() : formatCurrency(sale.total_amount)}
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

function LowStockAlerts({ summary }: { summary: DashboardSummary }) {
  const { navigateTo } = useNavigation();
  const lowItems = summary.low_stock_items ?? [];

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          Inventory Stock Alerts
        </h3>
        <button
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => navigateTo("inventory")}
        >
          Manage Stock
        </button>
      </div>
      {lowItems.length === 0 ? (
        <p className="py-4 text-center text-xs text-emerald-700 font-medium">
          All supplement items are well stocked.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {lowItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-text-primary">
                  {item.name}
                </p>
                <p className="text-[11px] text-text-muted">
                  {item.category} · Min: {item.min_stock_level} {item.unit}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-bold text-text-primary">
                  {item.stock_quantity} {item.unit}
                </span>
                {item.stock_status === "out_of_stock" ? (
                  <Badge variant="danger">Out</Badge>
                ) : (
                  <Badge variant="warning">Low</Badge>
                )}
              </div>
            </div>
          ))}
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
        <h3 className="text-sm font-semibold text-text-primary">
          Recent Members
        </h3>
        <button
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => navigateTo("members")}
        >
          View All
        </button>
      </div>
      {summary.recent_members.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">
          No members yet.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {summary.recent_members.map((member) => (
            <button
              key={member.id}
              className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-3 text-left transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-x-px hover:bg-[#f4f8f5] first:pt-0 last:pb-0"
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
      <div className="flex items-center gap-3.5">
        <div className="h-12 w-12 animate-pulse rounded-xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-36 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
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

interface DashboardPageProps {
  user?: AuthUser;
}

export function DashboardPage({ user }: DashboardPageProps = {}) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hidden } = usePrivacy();
  const { navigateTo } = useNavigation();

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
    void load();
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

  const stockAlertTotal =
    (summary.low_stock_count ?? 0) + (summary.out_of_stock_count ?? 0);

  return (
    <div className="dashboard-page space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {user?.username ? (
              <>
                Welcome back,{" "}
                <span className="text-[#286148]">{user.username}</span>
              </>
            ) : (
              "Welcome back"
            )}
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Here's what's happening with your gym, supplements, and inventory
            today.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <HideToggleButton />
          <Button variant="secondary" onClick={load}>
            <RefreshCw size={15} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid (8 Cards: 4 Membership/Finance + 4 Supplements/Inventory) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Members"
          value={summary.total_members}
          helper={`${summary.active_members} active members`}
          iconClass="bg-emerald-100 text-emerald-700"
          surfaceClass="bg-gradient-to-br from-emerald-50 to-white"
          hidden={hidden}
          onClick={() => navigateTo("members")}
        />
        <StatCard
          icon={UserCheck}
          label="Active Members"
          value={summary.active_members}
          helper={`${summary.expiring_soon} expiring soon`}
          iconClass="bg-blue-100 text-blue-600"
          surfaceClass="bg-gradient-to-br from-blue-50 to-white"
          hidden={hidden}
          onClick={() => navigateTo("members")}
        />
        <StatCard
          icon={TrendingUp}
          label="Monthly Revenue"
          value={formatCurrency(summary.month_revenue)}
          helper="Membership fees this month"
          iconClass="bg-amber-100 text-amber-600"
          surfaceClass="bg-gradient-to-br from-amber-50 to-white"
          hidden={hidden}
          onClick={() => navigateTo("payments")}
        />
        <StatCard
          icon={Wallet}
          label="Member Dues"
          value={formatCurrency(summary.total_outstanding)}
          helper="Unpaid member balance"
          iconClass="bg-violet-100 text-violet-600"
          surfaceClass="bg-gradient-to-br from-violet-50 to-white"
          hidden={hidden}
          onClick={() => navigateTo("members")}
        />

        <StatCard
          icon={ShoppingBag}
          label="Supplement Sales"
          value={formatCurrency(summary.month_supplement_sales ?? 0)}
          helper={
            hidden
              ? "This month POS sales"
              : `Profit: ${formatCurrency(summary.month_supplement_profit ?? 0)}`
          }
          iconClass="bg-teal-100 text-teal-700"
          surfaceClass="bg-gradient-to-br from-teal-50 to-white"
          hidden={hidden}
          onClick={() => navigateTo("supplements")}
        />
        <StatCard
          icon={Truck}
          label="Supplier Dues"
          value={formatCurrency(summary.total_supplier_dues ?? 0)}
          helper={`${summary.suppliers_with_dues ?? 0} supplier(s) pending`}
          iconClass="bg-orange-100 text-orange-600"
          surfaceClass="bg-gradient-to-br from-orange-50 to-white"
          hidden={hidden}
          onClick={() => navigateTo("supplements")}
        />
        <StatCard
          icon={TrendingDown}
          label="Monthly Expenses"
          value={formatCurrency(summary.month_expenses)}
          helper="Includes supplier payments"
          iconClass="bg-red-100 text-red-600"
          surfaceClass="bg-gradient-to-br from-red-50 to-white"
          hidden={hidden}
          onClick={() => navigateTo("finances")}
        />
        <StatCard
          icon={Package}
          label="Stock Alerts"
          value={stockAlertTotal}
          helper={`${summary.out_of_stock_count ?? 0} out · ${summary.low_stock_count ?? 0} low stock`}
          iconClass={
            stockAlertTotal > 0
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700"
          }
          surfaceClass={
            stockAlertTotal > 0
              ? "bg-gradient-to-br from-amber-50 to-white"
              : "bg-gradient-to-br from-emerald-50 to-white"
          }
          hidden={hidden}
          onClick={() => navigateTo("inventory")}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(320px,3fr)]">
        <div className="space-y-4">
          <MonthlyFinancialCard summary={summary} hidden={hidden} />
          <RecentPayments summary={summary} hidden={hidden} />
          <RecentSupplementSales summary={summary} hidden={hidden} />
        </div>
        <div className="space-y-4">
          <QuickActions />
          <LowStockAlerts summary={summary} />
          <RecentMembers summary={summary} />
        </div>
      </div>
    </div>
  );
}
