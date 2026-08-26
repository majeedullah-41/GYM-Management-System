import { useState } from "react";
import { FileText, BarChart3, CreditCard, DollarSign, Users, UserCheck } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { Input } from "../../../components/ui/Input";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Badge } from "../../../components/ui/Badge";
import { formatCurrency } from "../../../lib/utils/format";
import {
  generateReport,
  type ReportType,
  type FinancialReport,
  type PaymentReport,
  type ExpenseReport,
  type MemberReport,
  type MembershipStatusReport,
} from "../../../lib/api/reports";

const REPORT_TABS: { value: ReportType; label: string; icon: React.ReactNode }[] = [
  { value: "financial", label: "Financial", icon: <DollarSign size={14} /> },
  { value: "payment", label: "Payments", icon: <CreditCard size={14} /> },
  { value: "expense", label: "Expenses", icon: <BarChart3 size={14} /> },
  { value: "member", label: "Members", icon: <Users size={14} /> },
  { value: "membership_status", label: "Membership Status", icon: <UserCheck size={14} /> },
];

type DatePreset = "today" | "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "custom" | "none";

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

const PAYMENT_METHODS = ["Cash", "Card", "BankTransfer", "Other"];
const EXPENSE_CATEGORIES = ["Rent", "Electricity", "Equipment", "Maintenance", "Cleaning", "Supplies", "Salary", "Other"];

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("financial");
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
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

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: Record<string, unknown> = {
        report_type: reportType,
      };

      if (dateFrom) request.date_from = dateFrom;
      if (dateTo) request.date_to = dateTo;
      if (reportType === "payment" && paymentMethod) request.payment_method = paymentMethod;
      if (reportType === "expense" && expenseCategory) request.expense_category = expenseCategory;

      const data = await generateReport(request as unknown as Parameters<typeof generateReport>[0]);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Generate financial and membership reports."
      />

      <div className="flex gap-1 rounded-lg border border-border bg-secondary-bg p-1">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setReportType(tab.value);
              setResult(null);
            }}
            className={`flex items-center gap-1.5 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              reportType === tab.value
                ? "bg-surface text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["this_month", "last_month", "this_week", "last_week", "today", "this_year", "custom", "none"] as DatePreset[]).map((preset) => (
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

          {reportType === "payment" && (
            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: "", label: "All Methods" },
                ...PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
              ]}
            />
          )}

          {reportType === "expense" && (
            <Select
              label="Expense Category"
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              options={[
                { value: "", label: "All Categories" },
                ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
            />
          )}

          <Button onClick={handleGenerate} loading={loading}>
            <FileText size={14} />
            Generate Report
          </Button>
        </div>
      </Card>

      {loading && <LoadingState message="Generating report..." />}
      {error && (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {!loading && !error && !result && (
        <EmptyState
          title="No report generated"
          message="Select filters above and click Generate Report to view results."
        />
      )}

      {!loading && result && (
        <>
          {reportType === "financial" && <FinancialResults data={result as unknown as FinancialReport} />}
          {reportType === "payment" && <PaymentResults data={result as unknown as PaymentReport} />}
          {reportType === "expense" && <ExpenseResults data={result as unknown as ExpenseReport} />}
          {reportType === "member" && <MemberResults data={result as unknown as MemberReport} />}
          {reportType === "membership_status" && <MembershipStatusResults data={result as unknown as MembershipStatusReport} />}
        </>
      )}
    </div>
  );
}

function FinancialResults({ data }: { data: FinancialReport }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-text-muted">Total Revenue</p>
          <p className="mt-1 text-lg font-bold text-success">{formatCurrency(data.total_revenue)}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Total Expenses</p>
          <p className="mt-1 text-lg font-bold text-danger">{formatCurrency(data.total_expenses)}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Net Income</p>
          <p className={`mt-1 text-lg font-bold ${data.net_income >= 0 ? "text-success" : "text-danger"}`}>
            {formatCurrency(data.net_income)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Transactions</p>
          <p className="mt-1 text-lg font-bold text-text-primary">{data.payment_count + data.expense_count}</p>
        </Card>
      </div>

      {data.revenue_by_method.length > 0 && (
        <Card title="Revenue by Payment Method">
          <div className="space-y-2">
            {data.revenue_by_method.map((item) => (
              <div key={item.category} className="flex justify-between text-sm">
                <span className="text-text-muted">{item.category}</span>
                <span className="font-medium">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {data.expenses_by_category.length > 0 && (
        <Card title="Expenses by Category">
          <div className="space-y-2">
            {data.expenses_by_category.map((item) => (
              <div key={item.category} className="flex justify-between text-sm">
                <span className="text-text-muted">{item.category}</span>
                <span className="font-medium">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function PaymentResults({ data }: { data: PaymentReport }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-text-muted">Total Payments</p>
          <p className="mt-1 text-lg font-bold text-text-primary">{data.total_count}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Total Amount</p>
          <p className="mt-1 text-lg font-bold text-success">{formatCurrency(data.total_amount)}</p>
        </Card>
      </div>

      <Card title="Payment Details">
        {data.payments.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No payments found for the selected filters.</p>
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

function ExpenseResults({ data }: { data: ExpenseReport }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-text-muted">Total Expenses</p>
          <p className="mt-1 text-lg font-bold text-danger">{formatCurrency(data.total_amount)}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Expense Count</p>
          <p className="mt-1 text-lg font-bold text-text-primary">{data.total_count}</p>
        </Card>
      </div>

      <Card title="Expense Details">
        {data.expenses.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No expenses found for the selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left font-medium text-text-muted">Date</th>
                  <th className="pb-2 text-left font-medium text-text-muted">Description</th>
                  <th className="pb-2 text-left font-medium text-text-muted">Category</th>
                  <th className="pb-2 text-right font-medium text-text-muted">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((e, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 text-text-muted">{e.date}</td>
                    <td className="py-2">{e.description}</td>
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

function MemberResults({ data }: { data: MemberReport }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Card>
        <p className="text-xs text-text-muted">Total Members</p>
        <p className="mt-1 text-2xl font-bold text-text-primary">{data.total_members}</p>
      </Card>
      <Card>
        <p className="text-xs text-text-muted">Active</p>
        <p className="mt-1 text-2xl font-bold text-success">{data.active_members}</p>
      </Card>
      <Card>
        <p className="text-xs text-text-muted">Expiring Soon</p>
        <p className="mt-1 text-2xl font-bold text-warning">{data.expiring_soon}</p>
      </Card>
      <Card>
        <p className="text-xs text-text-muted">Expired</p>
        <p className="mt-1 text-2xl font-bold text-danger">{data.expired_members}</p>
      </Card>
      <Card>
        <p className="text-xs text-text-muted">Archived</p>
        <p className="mt-1 text-2xl font-bold text-text-muted">{data.archived_members}</p>
      </Card>
    </div>
  );
}

function MembershipStatusResults({ data }: { data: MembershipStatusReport }) {
  const sections = [
    { title: "Active Members", items: data.active, variant: "active" as const },
    { title: "Expiring Soon", items: data.expiring_soon, variant: "expiring" as const },
    { title: "Expired", items: data.expired, variant: "expired" as const },
  ];

  return (
    <div className="space-y-4">
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
                      <td className="py-2 text-text-muted">{m.phone || "—"}</td>
                      <td className="py-2">{m.plan_name || "—"}</td>
                      <td className="py-2">
                        <Badge variant={section.variant}>{m.expiry_date || "—"}</Badge>
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
