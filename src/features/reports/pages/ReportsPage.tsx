import { useState, useEffect } from "react";
import { DollarSign, CreditCard, BarChart3, UserCheck, Download } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import { Badge } from "../../../components/ui/Badge";
import { useToast } from "../../../components/feedback/ToastProvider";
import { formatCurrency } from "../../../lib/utils/format";
import { renderReportPdf } from "../../../lib/pdf";
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

export function ReportsPage() {
  const { addToast } = useToast();
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const requestBase = {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    };

    Promise.all([
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
    ])
      .then(([finData, payData, expData, statusData]) => {
        if (!cancelled) {
          setResult({
            financial: finData,
            payment: payData,
            expense: expData,
            membership_status: statusData,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(errorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo]);

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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="View financial, payment, expense, and active membership reports."
      />

      <Card>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                "this_month",
                "last_month",
                "this_week",
                "last_week",
                "today",
                "this_year",
                "custom",
                "none",
              ] as DatePreset[]
            ).map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  datePreset === preset
                    ? "bg-primary text-white"
                    : "bg-secondary-bg text-secondary-text hover:bg-border"
                }`}
              >
                {preset === "none"
                  ? "All Time"
                  : preset === "custom"
                    ? "Custom Range"
                    : preset.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>

          {datePreset === "custom" && (
            <div className="flex gap-3">
              <Input
                label="From"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input
                label="To"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          )}

          <div>
            <Button onClick={handleDownloadPdf} loading={pdfLoading} variant="secondary">
              <Download size={14} />
              Download PDF
            </Button>
          </div>
        </div>
      </Card>

      {loading && <LoadingState message="Loading report..." />}
      {error && (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {!loading && result && (
        <div className="space-y-6">
          <SummarySection data={result} />
          <PaymentSection data={result.payment} />
          <ExpenseSection data={result.expense} />
          <MembershipStatusSection data={result.membership_status} />
        </div>
      )}
    </div>
  );
}

function SummarySection({ data }: { data: ReportData }) {
  return (
    <>
      <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
        <DollarSign size={18} />
        Financial Summary
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-text-muted">Total Revenue</p>
          <p className="mt-1 text-lg font-bold text-success">
            {formatCurrency(data.financial.total_revenue)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Total Expenses</p>
          <p className="mt-1 text-lg font-bold text-danger">
            {formatCurrency(data.financial.total_expenses)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Net Income</p>
          <p
            className={`mt-1 text-lg font-bold ${data.financial.net_income >= 0 ? "text-success" : "text-danger"}`}
          >
            {formatCurrency(data.financial.net_income)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Transactions</p>
          <p className="mt-1 text-lg font-bold text-text-primary">
            {data.financial.payment_count + data.financial.expense_count}
          </p>
        </Card>
      </div>
    </>
  );
}

function PaymentSection({ data }: { data: PaymentReport }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
        <CreditCard size={18} />
        Payments ({data.total_count})
      </h3>
      <Card>
        {data.payments.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">
            No payments found for the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left font-medium text-text-muted">Receipt #</th>
                  <th className="pb-2 text-left font-medium text-text-muted">Member</th>
                  <th className="pb-2 text-right font-medium text-text-muted">Amount</th>
                  <th className="pb-2 text-left font-medium text-text-muted">Method</th>
                  <th className="pb-2 text-left font-medium text-text-muted">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 font-mono text-xs">{p.receipt_number}</td>
                    <td className="py-2">{p.member_name}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(p.amount)}</td>
                    <td className="py-2">
                      <Badge variant="info">{p.payment_method}</Badge>
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

function ExpenseSection({ data }: { data: ExpenseReport }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
        <BarChart3 size={18} />
        Expenses ({data.total_count})
      </h3>
      <Card>
        {data.expenses.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">
            No expenses found for the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left font-medium text-text-muted">Date</th>
                  <th className="pb-2 text-left font-medium text-text-muted">Category</th>
                  <th className="pb-2 text-right font-medium text-text-muted">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((e, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 text-text-muted">{e.date}</td>
                    <td className="py-2">
                      <Badge variant="info">{e.category}</Badge>
                    </td>
                    <td className="py-2 text-right font-medium">{formatCurrency(e.amount)}</td>
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

function MembershipStatusSection({ data }: { data: MembershipStatusReport }) {
  const sections = [{ title: "Active Members", items: data.active, variant: "active" as const }];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
        <UserCheck size={18} />
        Membership Status
      </h3>
      {sections.map((section) => (
        <Card key={section.title} title={`${section.title} (${section.items.length})`}>
          {section.items.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">No members in this category.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-text-muted">Member #</th>
                    <th className="pb-2 text-left font-medium text-text-muted">Name</th>
                    <th className="pb-2 text-left font-medium text-text-muted">Phone</th>
                    <th className="pb-2 text-left font-medium text-text-muted">Plan</th>
                    <th className="pb-2 text-left font-medium text-text-muted">Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((m, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 font-mono text-xs">{m.member_number}</td>
                      <td className="py-2">{m.full_name}</td>
                      <td className="py-2 text-text-muted">{m.phone || "\u2014"}</td>
                      <td className="py-2">{m.plan_name || "\u2014"}</td>
                      <td className="py-2">
                        <Badge variant={section.variant}>{m.expiry_date || "\u2014"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
