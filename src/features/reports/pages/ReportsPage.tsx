import { useState, useEffect, useCallback, useRef } from "react";
import {
  DollarSign,
  CreditCard,
  BarChart3,
  UserCheck,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import { Badge } from "../../../components/ui/Badge";
import { useToast } from "../../../components/feedback/ToastProvider";
import { formatCurrency, formatDate } from "../../../lib/utils/format";
import { renderReportPdf } from "../../../lib/pdf";
import { usePrivacy, HideToggleButton, maskValue } from "../../../context/PrivacyContext";
import {
  generateReport,
  type FinancialReport,
  type PaymentReport,
  type ExpenseReport,
  type MembershipStatusReport,
} from "../../../lib/api/reports";

type DatePreset =
  | "today"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom"
  | "none";

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Failed to load report";
}

function getDateRange(preset: DatePreset): { date_from: string; date_to: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { date_from: fmt(today), date_to: fmt(today) };
    case "this_week": {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { date_from: fmt(start), date_to: fmt(today) };
    }
    case "last_week": {
      const end = new Date(today);
      end.setDate(today.getDate() - today.getDay() - 1);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { date_from: fmt(start), date_to: fmt(end) };
    }
    case "this_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { date_from: fmt(start), date_to: fmt(today) };
    }
    case "last_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { date_from: fmt(start), date_to: fmt(end) };
    }
    case "this_year": {
      const start = new Date(today.getFullYear(), 0, 1);
      return { date_from: fmt(start), date_to: fmt(today) };
    }
    default:
      return { date_from: "", date_to: "" };
  }
}

interface ReportData {
  financial: FinancialReport;
  payment: PaymentReport;
  expense: ExpenseReport;
  membership_status: MembershipStatusReport;
}

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  iconClass,
  surfaceClass,
  hidden = false,
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  helper: string;
  iconClass: string;
  surfaceClass: string;
  hidden?: boolean;
}) {
  return (
    <Card className={surfaceClass}>
      <div className="flex min-w-0 items-start gap-4">
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
          <div className="mt-1.5 text-[11px] text-text-muted">
            {hidden ? maskValue() : helper}
          </div>
        </div>
      </div>
    </Card>
  );
}


export function ReportsPage() {
  const { hidden } = usePrivacy();
  const { addToast } = useToast();
  const requestIdRef = useRef(0);
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [dateFrom, setDateFrom] = useState(() => getDateRange("this_month").date_from);
  const [dateTo, setDateTo] = useState(() => getDateRange("this_month").date_to);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [result, setResult] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== "custom" && preset !== "none") {
      const range = getDateRange(preset);
      setDateFrom(range.date_from);
      setDateTo(range.date_to);
    }
    if (preset === "none") {
      setDateFrom("");
      setDateTo("");
    }
  };

  const loadReport = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    const requestBase = {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    };

    try {
      const [finData, payData, expData, statusData] = await Promise.all([
        generateReport({
          ...requestBase,
          report_type: "financial",
        }) as unknown as Promise<FinancialReport>,
        generateReport({
          ...requestBase,
          report_type: "payment",
        }) as unknown as Promise<PaymentReport>,
        generateReport({
          ...requestBase,
          report_type: "expense",
        }) as unknown as Promise<ExpenseReport>,
        generateReport({
          report_type: "membership_status",
        }) as unknown as Promise<MembershipStatusReport>,
      ]);

      if (reqId !== requestIdRef.current) return;

      setResult({
        financial: finData,
        payment: payData,
        expense: expData,
        membership_status: statusData,
      });
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(errorMessage(err));
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleDownloadPdf = async () => {
    if (!result) return;
    setPdfLoading(true);
    try {
      const res = await renderReportPdf({
        financial: result.financial,
        payment: result.payment,
        expense: result.expense,
        membership_status: result.membership_status,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      if (res.mode === "pdf") {
        addToast({
          variant: "success",
          title: "Report saved as PDF",
          message: res.path || undefined,
        });
      } else {
        addToast({ variant: "info", title: "Save cancelled" });
      }
    } catch (err) {
      addToast({
        variant: "error",
        title: "Failed to save PDF",
        message: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const presets: DatePreset[] = [
    "this_month",
    "last_month",
    "this_week",
    "last_week",
    "today",
    "this_year",
    "custom",
    "none",
  ];

  return (
    <div className="reports-page space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Reports</h1>
          <p className="mt-1 text-xs text-text-muted">
            View financial summaries, payment logs, operating expenses, and active membership reports.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <HideToggleButton />
          <Button variant="secondary" onClick={loadReport}>
            <RefreshCw size={15} />
            Refresh
          </Button>
          <Button
            onClick={handleDownloadPdf}
            loading={pdfLoading}
            disabled={!result || loading}
            className="bg-[#17613f] hover:bg-[#104b31]"
          >
            <Download size={15} />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Date Range Selection Toolbar Card */}
      <Card className="p-3.5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {presets.map((preset) => {
                const isActive = datePreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetChange(preset)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[#17613f] text-white shadow-xs"
                        : "bg-secondary-bg text-text-muted hover:bg-border hover:text-text-primary"
                    }`}
                  >
                    {preset === "none"
                      ? "All Time"
                      : preset === "custom"
                        ? "Custom Range"
                        : preset.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
              <Calendar size={13} className="text-text-muted" />
              <span>
                {dateFrom && dateTo
                  ? `${dateFrom} → ${dateTo}`
                  : dateFrom
                    ? `From ${dateFrom}`
                    : dateTo
                      ? `Until ${dateTo}`
                      : "All historical records"}
              </span>
            </div>
          </div>

          {datePreset === "custom" && (
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <div className="w-44">
                <Input
                  label="From"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="w-44">
                <Input
                  label="To"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {loading && <LoadingState message="Generating reports..." />}

      {error && !loading && (
        <Card className="border-red-200 bg-red-50/50 p-4">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {!loading && result && (
        <div className="space-y-6">
          {/* Financial Summary Stat Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={TrendingUp}
              label="Total Revenue"
              value={formatCurrency(result.financial.total_revenue)}
              helper={`${result.financial.payment_count} payments collected`}
              iconClass="bg-emerald-100 text-emerald-700"
              surfaceClass="bg-gradient-to-br from-emerald-50 to-white"
              hidden={hidden}
            />
            <StatCard
              icon={TrendingDown}
              label="Total Expenses"
              value={formatCurrency(result.financial.total_expenses)}
              helper={`${result.financial.expense_count} expenses logged`}
              iconClass="bg-red-100 text-red-600"
              surfaceClass="bg-gradient-to-br from-red-50 to-white"
              hidden={hidden}
            />
            <StatCard
              icon={DollarSign}
              label="Net Income"
              value={formatCurrency(result.financial.net_income)}
              helper={result.financial.net_income >= 0 ? "Positive cashflow" : "Operating deficit"}
              iconClass={
                result.financial.net_income >= 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-600"
              }
              surfaceClass={
                result.financial.net_income >= 0
                  ? "bg-gradient-to-br from-emerald-50 to-white"
                  : "bg-gradient-to-br from-red-50 to-white"
              }
              hidden={hidden}
            />
            <StatCard
              icon={BarChart3}
              label="Total Transactions"
              value={result.financial.payment_count + result.financial.expense_count}
              helper="Combined transaction count"
              iconClass="bg-blue-100 text-blue-600"
              surfaceClass="bg-gradient-to-br from-blue-50 to-white"
              hidden={hidden}
            />
          </div>

          {/* Payments Section */}
          <div className="space-y-2">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border bg-[#fafbfa] px-4 py-3">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-text-muted" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                    Payments ({hidden ? "••••" : result.payment.total_count})
                  </h3>
                </div>
                <span className="text-xs font-semibold text-emerald-700">
                  {hidden ? maskValue() : formatCurrency(result.payment.total_amount)}
                </span>
              </div>

              {result.payment.payments.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  No payments found for the selected time range.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-[#fafbfa] text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        <th className="px-4 py-2.5 text-left">Date</th>
                        <th className="px-4 py-2.5 text-left">Receipt #</th>
                        <th className="px-4 py-2.5 text-left">Member</th>
                        <th className="px-4 py-2.5 text-left">Method</th>
                        <th className="px-4 py-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.payment.payments.map((p, i) => (
                        <tr
                          key={i}
                          className="border-b border-border transition-colors hover:bg-[#f6faf7] last:border-b-0"
                        >
                          <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                            {formatDate(p.payment_date)}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-text-muted whitespace-nowrap">
                            {p.receipt_number}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-text-primary">
                            {p.member_name}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant="info">{p.payment_method}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-text-primary whitespace-nowrap">
                            {hidden ? maskValue() : formatCurrency(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Expenses Section */}
          <div className="space-y-2">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border bg-[#fafbfa] px-4 py-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-text-muted" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                    Expenses ({hidden ? "••••" : result.expense.total_count})
                  </h3>
                </div>
                <span className="text-xs font-semibold text-red-600">
                  {hidden ? maskValue() : formatCurrency(result.expense.total_amount)}
                </span>
              </div>

              {result.expense.expenses.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  No expenses found for the selected time range.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-[#fafbfa] text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        <th className="px-4 py-2.5 text-left">Date</th>
                        <th className="px-4 py-2.5 text-left">Category</th>
                        <th className="px-4 py-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.expense.expenses.map((e, i) => (
                        <tr
                          key={i}
                          className="border-b border-border transition-colors hover:bg-[#f6faf7] last:border-b-0"
                        >
                          <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{e.date}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-block rounded-full bg-secondary-bg px-2.5 py-0.5 text-[11px] font-medium text-text-primary">
                              {e.category}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-text-primary whitespace-nowrap">
                            {hidden ? maskValue() : formatCurrency(e.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Membership Status Section */}
          <div className="space-y-2">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border bg-[#fafbfa] px-4 py-3">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-text-muted" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                    Active Members ({hidden ? "••••" : result.membership_status.active.length})
                  </h3>
                </div>
              </div>

              {result.membership_status.active.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  No active members recorded.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-[#fafbfa] text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        <th className="px-4 py-2.5 text-left">Member #</th>
                        <th className="px-4 py-2.5 text-left">Name</th>
                        <th className="px-4 py-2.5 text-left">Phone</th>
                        <th className="px-4 py-2.5 text-left">Plan</th>
                        <th className="px-4 py-2.5 text-left">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.membership_status.active.map((m, i) => (
                        <tr
                          key={i}
                          className="border-b border-border transition-colors hover:bg-[#f6faf7] last:border-b-0"
                        >
                          <td className="px-4 py-2.5 font-mono text-[11px] text-text-muted">
                            {m.member_number}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-text-primary">
                            {m.full_name}
                          </td>
                          <td className="px-4 py-2.5 text-text-muted">{m.phone || "—"}</td>
                          <td className="px-4 py-2.5 text-text-primary">{m.plan_name || "—"}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="active">{m.expiry_date || "—"}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
