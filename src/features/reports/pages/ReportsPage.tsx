import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Package,
  Truck,
  Search,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
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
import { WhatsAppIcon } from "../../../components/whatsapp/WhatsAppIcon";
import {
  WhatsAppPreviewModal,
  type WhatsAppTarget,
} from "../../../components/whatsapp/WhatsAppPreviewModal";
import {
  generateReport,
  type FinancialReport,
  type PaymentReport,
  type ExpenseReport,
  type MembershipStatusReport,
  type InventoryReport,
  type SupplierReport,
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

type ReportTab =
  | "all"
  | "financial"
  | "expenses"
  | "memberships"
  | "inventory"
  | "suppliers";

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
  inventory: InventoryReport;
  supplier: SupplierReport;
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
  const [activeTab, setActiveTab] = useState<ReportTab>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [dateFrom, setDateFrom] = useState(() => getDateRange("this_month").date_from);
  const [dateTo, setDateTo] = useState(() => getDateRange("this_month").date_to);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [result, setResult] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters for Inventory section
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryCategory, setInventoryCategory] = useState("");
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<string>("all");
  const [showInventorySales, setShowInventorySales] = useState(false);

  // Filters for Suppliers section
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierDuesOnly, setSupplierDuesOnly] = useState(false);
  const [showSupplierPurchases, setShowSupplierPurchases] = useState(false);
  const [whatsAppTarget, setWhatsAppTarget] = useState<WhatsAppTarget | null>(null);

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
      const [finData, payData, expData, statusData, invData, supData] = await Promise.all([
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
        generateReport({
          ...requestBase,
          report_type: "inventory",
        }) as unknown as Promise<InventoryReport>,
        generateReport({
          ...requestBase,
          report_type: "supplier",
        }) as unknown as Promise<SupplierReport>,
      ]);

      if (reqId !== requestIdRef.current) return;

      setResult({
        financial: finData,
        payment: payData,
        expense: expData,
        membership_status: statusData,
        inventory: invData,
        supplier: supData,
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
        inventory: result.inventory,
        supplier: result.supplier,
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

  // Distinct inventory categories for the filter dropdown
  const inventoryCategories = useMemo(() => {
    if (!result?.inventory?.items) return [];
    const set = new Set<string>();
    result.inventory.items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }, [result?.inventory?.items]);

  // Filtered inventory items
  const filteredInventoryItems = useMemo(() => {
    if (!result?.inventory?.items) return [];
    return result.inventory.items.filter((item) => {
      if (inventorySearch.trim()) {
        const q = inventorySearch.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchBrand = (item.brand || "").toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchCat) return false;
      }
      if (inventoryCategory && item.category !== inventoryCategory) {
        return false;
      }
      if (inventoryStatusFilter !== "all" && item.stock_status !== inventoryStatusFilter) {
        return false;
      }
      return true;
    });
  }, [result?.inventory?.items, inventorySearch, inventoryCategory, inventoryStatusFilter]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    if (!result?.supplier?.suppliers) return [];
    return result.supplier.suppliers.filter((sup) => {
      if (supplierSearch.trim()) {
        const q = supplierSearch.toLowerCase();
        const matchName = sup.name.toLowerCase().includes(q);
        const matchCompany = (sup.company || "").toLowerCase().includes(q);
        const matchPhone = (sup.phone || "").toLowerCase().includes(q);
        if (!matchName && !matchCompany && !matchPhone) return false;
      }
      if (supplierDuesOnly && sup.total_due <= 0) {
        return false;
      }
      return true;
    });
  }, [result?.supplier?.suppliers, supplierSearch, supplierDuesOnly]);

  const handleOpenSupplierWhatsApp = (sup: {
    name: string;
    company: string | null;
    phone: string | null;
    total_due: number;
    total_purchased: number;
    total_paid: number;
  }) => {
    setWhatsAppTarget({
      recipientType: "supplier",
      recipientName: sup.name,
      rawPhone: sup.phone,
      variables: {
        supplier_name: sup.name,
        company: sup.company || "",
        total_purchased: formatCurrency(sup.total_purchased),
        total_paid: formatCurrency(sup.total_paid),
        due_amount: formatCurrency(sup.total_due),
      },
    });
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

  const tabs: { id: ReportTab; label: string; count?: number | string; icon: IconComponent }[] = [
    { id: "all", label: "All Sections", icon: Layers },
    {
      id: "financial",
      label: "Finances & Revenue",
      count: result ? result.payment.total_count : undefined,
      icon: DollarSign,
    },
    {
      id: "expenses",
      label: "Expenses",
      count: result ? result.expense.total_count : undefined,
      icon: BarChart3,
    },
    {
      id: "memberships",
      label: "Active Members",
      count: result ? result.membership_status.active.length : undefined,
      icon: UserCheck,
    },
    {
      id: "inventory",
      label: "Inventory & Stock",
      count: result ? result.inventory.total_items : undefined,
      icon: Package,
    },
    {
      id: "suppliers",
      label: "Suppliers & Dues",
      count: result ? result.supplier.total_suppliers : undefined,
      icon: Truck,
    },
  ];

  return (
    <div className="reports-page space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Reports</h1>
          <p className="mt-1 text-xs text-text-muted">
            Financial summaries, payment logs, operating expenses, active memberships, inventory stock valuation, and supplier dues.
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

      {/* Report Section Filter Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all ${
                isActive
                  ? "bg-[#17613f] text-white shadow-xs"
                  : "bg-surface text-text-muted hover:bg-[#f2f6f3] hover:text-text-primary border border-border/60"
              }`}
            >
              <TabIcon size={14} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-secondary-bg text-text-primary"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading && <LoadingState message="Generating reports..." />}

      {error && !loading && (
        <Card className="border-red-200 bg-red-50/50 p-4">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {!loading && result && (
        <div className="space-y-6">
          {/* TOP KPI DASHBOARD */}
          <div className="space-y-4">
            {/* When on All Sections: show all KPIs grouped cleanly at the top */}
            {activeTab === "all" && (
              <div className="space-y-4">
                {/* 1. Core Financials & Operations */}
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-primary uppercase tracking-wider">
                    <DollarSign size={14} className="text-[#17613f]" />
                    <span>Financials & Memberships</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
                      icon={UserCheck}
                      label="Active Members"
                      value={result.membership_status.active.length}
                      helper={`${result.membership_status.expiring_soon.length} expiring soon`}
                      iconClass="bg-teal-100 text-teal-700"
                      surfaceClass="bg-gradient-to-br from-teal-50 to-white"
                      hidden={hidden}
                    />
                    <StatCard
                      icon={BarChart3}
                      label="Total Transactions"
                      value={
                        result.financial.payment_count +
                        result.financial.expense_count +
                        result.inventory.period_sales_count
                      }
                      helper="Combined operations"
                      iconClass="bg-purple-100 text-purple-600"
                      surfaceClass="bg-gradient-to-br from-purple-50 to-white"
                      hidden={hidden}
                    />
                  </div>
                </div>

                {/* 2. Inventory & Stock KPIs */}
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-primary uppercase tracking-wider">
                    <Package size={14} className="text-[#17613f]" />
                    <span>Inventory & Stock</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard
                      icon={Package}
                      label="Total Stock Items"
                      value={result.inventory.total_items}
                      helper={`${result.inventory.total_stock_units} physical units`}
                      iconClass="bg-blue-100 text-blue-700"
                      surfaceClass="bg-gradient-to-br from-blue-50 to-white"
                      hidden={hidden}
                    />
                    <StatCard
                      icon={DollarSign}
                      label="Inventory Cost Value"
                      value={formatCurrency(result.inventory.inventory_cost_value)}
                      helper={`Retail: ${hidden ? maskValue() : formatCurrency(result.inventory.inventory_retail_value)}`}
                      iconClass="bg-emerald-100 text-emerald-700"
                      surfaceClass="bg-gradient-to-br from-emerald-50 to-white"
                      hidden={hidden}
                    />
                    <StatCard
                      icon={AlertTriangle}
                      label="Stock Health Alerts"
                      value={`${result.inventory.low_stock_count} Low / ${result.inventory.out_of_stock_count} Out`}
                      helper={
                        result.inventory.low_stock_count > 0 || result.inventory.out_of_stock_count > 0
                          ? "Reorder recommended"
                          : "Stock levels healthy"
                      }
                      iconClass={
                        result.inventory.out_of_stock_count > 0
                          ? "bg-red-100 text-red-600"
                          : result.inventory.low_stock_count > 0
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                      }
                      surfaceClass={
                        result.inventory.out_of_stock_count > 0
                          ? "bg-gradient-to-br from-red-50 to-white"
                          : result.inventory.low_stock_count > 0
                            ? "bg-gradient-to-br from-amber-50 to-white"
                            : "bg-gradient-to-br from-emerald-50 to-white"
                      }
                      hidden={hidden}
                    />
                    <StatCard
                      icon={TrendingUp}
                      label="Period Supplement Sales"
                      value={formatCurrency(result.inventory.period_sales_revenue)}
                      helper={`${result.inventory.period_sales_count} sales | Profit: ${hidden ? maskValue() : formatCurrency(result.inventory.period_sales_profit)}`}
                      iconClass="bg-purple-100 text-purple-600"
                      surfaceClass="bg-gradient-to-br from-purple-50 to-white"
                      hidden={hidden}
                    />
                  </div>
                </div>

                {/* 3. Suppliers & Dues KPIs */}
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-primary uppercase tracking-wider">
                    <Truck size={14} className="text-[#17613f]" />
                    <span>Suppliers & Dues</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard
                      icon={Truck}
                      label="Registered Suppliers"
                      value={result.supplier.total_suppliers}
                      helper={`${result.supplier.suppliers_with_dues} with outstanding balance`}
                      iconClass="bg-blue-100 text-blue-700"
                      surfaceClass="bg-gradient-to-br from-blue-50 to-white"
                      hidden={hidden}
                    />
                    <StatCard
                      icon={ShoppingBag}
                      label="Total Purchased"
                      value={formatCurrency(result.supplier.total_purchases_amount)}
                      helper={`Total paid: ${hidden ? maskValue() : formatCurrency(result.supplier.total_paid_amount)}`}
                      iconClass="bg-emerald-100 text-emerald-700"
                      surfaceClass="bg-gradient-to-br from-emerald-50 to-white"
                      hidden={hidden}
                    />
                    <StatCard
                      icon={AlertTriangle}
                      label="Outstanding Supplier Dues"
                      value={formatCurrency(result.supplier.total_dues_amount)}
                      helper={
                        result.supplier.total_dues_amount > 0
                          ? `${result.supplier.suppliers_with_dues} suppliers have pending balance`
                          : "All accounts fully cleared"
                      }
                      iconClass={
                        result.supplier.total_dues_amount > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }
                      surfaceClass={
                        result.supplier.total_dues_amount > 0
                          ? "bg-gradient-to-br from-amber-50 to-white"
                          : "bg-gradient-to-br from-emerald-50 to-white"
                      }
                      hidden={hidden}
                    />
                    <StatCard
                      icon={CreditCard}
                      label="Total Paid to Suppliers"
                      value={formatCurrency(result.supplier.total_paid_amount)}
                      helper="Supplier payments logged"
                      iconClass="bg-purple-100 text-purple-700"
                      surfaceClass="bg-gradient-to-br from-purple-50 to-white"
                      hidden={hidden}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* When on Finances tab */}
            {activeTab === "financial" && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                  icon={CreditCard}
                  label="Total Payments Count"
                  value={result.payment.total_count}
                  helper="Individual payment records"
                  iconClass="bg-blue-100 text-blue-700"
                  surfaceClass="bg-gradient-to-br from-blue-50 to-white"
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
                  label="Average Payment"
                  value={
                    result.payment.total_count > 0
                      ? formatCurrency(Math.round(result.payment.total_amount / result.payment.total_count))
                      : "Rs. 0"
                  }
                  helper="Per transaction"
                  iconClass="bg-purple-100 text-purple-700"
                  surfaceClass="bg-gradient-to-br from-purple-50 to-white"
                  hidden={hidden}
                />
              </div>
            )}

            {/* When on Expenses tab */}
            {activeTab === "expenses" && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                  icon={BarChart3}
                  label="Expense Entries"
                  value={result.expense.total_count}
                  helper="Recorded entries"
                  iconClass="bg-purple-100 text-purple-700"
                  surfaceClass="bg-gradient-to-br from-purple-50 to-white"
                  hidden={hidden}
                />
                <StatCard
                  icon={DollarSign}
                  label="Average Expense"
                  value={
                    result.expense.total_count > 0
                      ? formatCurrency(Math.round(result.expense.total_amount / result.expense.total_count))
                      : "Rs. 0"
                  }
                  helper="Per expense entry"
                  iconClass="bg-blue-100 text-blue-700"
                  surfaceClass="bg-gradient-to-br from-blue-50 to-white"
                  hidden={hidden}
                />
              </div>
            )}

            {/* When on Memberships tab */}
            {activeTab === "memberships" && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard
                  icon={UserCheck}
                  label="Active Memberships"
                  value={result.membership_status.active.length}
                  helper="Currently valid"
                  iconClass="bg-emerald-100 text-emerald-700"
                  surfaceClass="bg-gradient-to-br from-emerald-50 to-white"
                  hidden={hidden}
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Expiring Soon"
                  value={result.membership_status.expiring_soon.length}
                  helper="Within 7 days"
                  iconClass="bg-amber-100 text-amber-700"
                  surfaceClass="bg-gradient-to-br from-amber-50 to-white"
                  hidden={hidden}
                />
                <StatCard
                  icon={TrendingDown}
                  label="Expired Members"
                  value={result.membership_status.expired.length}
                  helper="Needs renewal"
                  iconClass="bg-red-100 text-red-600"
                  surfaceClass="bg-gradient-to-br from-red-50 to-white"
                  hidden={hidden}
                />
              </div>
            )}

            {/* When on Inventory tab */}
            {activeTab === "inventory" && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  icon={Package}
                  label="Total Stock Items"
                  value={result.inventory.total_items}
                  helper={`${result.inventory.total_stock_units} physical units`}
                  iconClass="bg-blue-100 text-blue-700"
                  surfaceClass="bg-gradient-to-br from-blue-50 to-white"
                  hidden={hidden}
                />
                <StatCard
                  icon={DollarSign}
                  label="Inventory Cost Value"
                  value={formatCurrency(result.inventory.inventory_cost_value)}
                  helper={`Retail: ${hidden ? maskValue() : formatCurrency(result.inventory.inventory_retail_value)}`}
                  iconClass="bg-emerald-100 text-emerald-700"
                  surfaceClass="bg-gradient-to-br from-emerald-50 to-white"
                  hidden={hidden}
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Stock Alerts"
                  value={`${result.inventory.low_stock_count} Low / ${result.inventory.out_of_stock_count} Out`}
                  helper={
                    result.inventory.low_stock_count > 0 || result.inventory.out_of_stock_count > 0
                      ? "Reorder recommended"
                      : "Stock levels healthy"
                  }
                  iconClass={
                    result.inventory.out_of_stock_count > 0
                      ? "bg-red-100 text-red-600"
                      : result.inventory.low_stock_count > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                  }
                  surfaceClass={
                    result.inventory.out_of_stock_count > 0
                      ? "bg-gradient-to-br from-red-50 to-white"
                      : result.inventory.low_stock_count > 0
                        ? "bg-gradient-to-br from-amber-50 to-white"
                        : "bg-gradient-to-br from-emerald-50 to-white"
                  }
                  hidden={hidden}
                />
                <StatCard
                  icon={TrendingUp}
                  label="Period Supplement Sales"
                  value={formatCurrency(result.inventory.period_sales_revenue)}
                  helper={`${result.inventory.period_sales_count} sales | Profit: ${hidden ? maskValue() : formatCurrency(result.inventory.period_sales_profit)}`}
                  iconClass="bg-purple-100 text-purple-600"
                  surfaceClass="bg-gradient-to-br from-purple-50 to-white"
                  hidden={hidden}
                />
              </div>
            )}

            {/* When on Suppliers tab */}
            {activeTab === "suppliers" && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  icon={Truck}
                  label="Registered Suppliers"
                  value={result.supplier.total_suppliers}
                  helper={`${result.supplier.suppliers_with_dues} with outstanding balance`}
                  iconClass="bg-blue-100 text-blue-700"
                  surfaceClass="bg-gradient-to-br from-blue-50 to-white"
                  hidden={hidden}
                />
                <StatCard
                  icon={ShoppingBag}
                  label="Total Purchased"
                  value={formatCurrency(result.supplier.total_purchases_amount)}
                  helper={`Total paid: ${hidden ? maskValue() : formatCurrency(result.supplier.total_paid_amount)}`}
                  iconClass="bg-emerald-100 text-emerald-700"
                  surfaceClass="bg-gradient-to-br from-emerald-50 to-white"
                  hidden={hidden}
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Outstanding Supplier Dues"
                  value={formatCurrency(result.supplier.total_dues_amount)}
                  helper={
                    result.supplier.total_dues_amount > 0
                      ? `${result.supplier.suppliers_with_dues} suppliers have pending balance`
                      : "All accounts fully cleared"
                  }
                  iconClass={
                    result.supplier.total_dues_amount > 0
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }
                  surfaceClass={
                    result.supplier.total_dues_amount > 0
                      ? "bg-gradient-to-br from-amber-50 to-white"
                      : "bg-gradient-to-br from-emerald-50 to-white"
                  }
                  hidden={hidden}
                />
                <StatCard
                  icon={CreditCard}
                  label="Total Paid to Suppliers"
                  value={formatCurrency(result.supplier.total_paid_amount)}
                  helper="Supplier payments logged"
                  iconClass="bg-purple-100 text-purple-700"
                  surfaceClass="bg-gradient-to-br from-purple-50 to-white"
                  hidden={hidden}
                />
              </div>
            )}
          </div>

          {/* Payments Section */}
          {(activeTab === "all" || activeTab === "financial") && (
            <div className="space-y-2">
              <Card className="overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-border bg-[#fafbfa] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-text-muted" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                      Payments Collected ({hidden ? "••••" : result.payment.total_count})
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
                  <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[#fafbfa] z-10 shadow-xs">
                        <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
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
          )}

          {/* Expenses Section */}
          {(activeTab === "all" || activeTab === "expenses") && (
            <div className="space-y-2">
              <Card className="overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-border bg-[#fafbfa] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-text-muted" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                      Operating Expenses ({hidden ? "••••" : result.expense.total_count})
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
                  <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[#fafbfa] z-10 shadow-xs">
                        <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                          <th className="px-4 py-2.5 text-left">Date</th>
                          <th className="px-4 py-2.5 text-left">Category</th>
                          <th className="px-4 py-2.5 text-left">Description</th>
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
                            <td className="px-4 py-2.5 text-text-muted">{e.description || "—"}</td>
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
          )}

          {/* Membership Status Section */}
          {(activeTab === "all" || activeTab === "memberships") && (
            <div className="space-y-2">
              <Card className="overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-border bg-[#fafbfa] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-text-muted" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                      Active Memberships ({hidden ? "••••" : result.membership_status.active.length})
                    </h3>
                  </div>
                </div>

                {result.membership_status.active.length === 0 ? (
                  <div className="p-8 text-center text-xs text-text-muted">
                    No active members recorded.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[#fafbfa] z-10 shadow-xs">
                        <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
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
          )}

          {/* INVENTORY & STOCK SECTION */}
          {(activeTab === "all" || activeTab === "inventory") && (
            <div className="space-y-3">
              {/* Inventory Items Stock Card */}
              <Card className="overflow-hidden p-0">
                <div className="flex flex-col gap-3 border-b border-border bg-[#fafbfa] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-text-muted" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                      Inventory Stock Status ({filteredInventoryItems.length} of {result.inventory.items.length})
                    </h3>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="relative w-44">
                      <Search
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                      />
                      <input
                        type="text"
                        placeholder="Search items..."
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        className="w-full rounded-md border border-border bg-surface pl-8 pr-2.5 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-hidden"
                      />
                    </div>

                    {inventoryCategories.length > 0 && (
                      <select
                        value={inventoryCategory}
                        onChange={(e) => setInventoryCategory(e.target.value)}
                        className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-primary focus:border-primary focus:outline-hidden"
                      >
                        <option value="">All Categories</option>
                        {inventoryCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    )}

                    <select
                      value={inventoryStatusFilter}
                      onChange={(e) => setInventoryStatusFilter(e.target.value)}
                      className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-primary focus:border-primary focus:outline-hidden"
                    >
                      <option value="all">All Status</option>
                      <option value="in_stock">In Stock</option>
                      <option value="low_stock">Low Stock</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                  </div>
                </div>

                {filteredInventoryItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-text-muted">
                    No inventory items match the current filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[#fafbfa] z-10 shadow-xs">
                        <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                          <th className="px-4 py-2.5 text-left">Item Name</th>
                          <th className="px-4 py-2.5 text-left">Category</th>
                          <th className="px-4 py-2.5 text-left">Brand</th>
                          <th className="px-4 py-2.5 text-right">Current Stock</th>
                          <th className="px-4 py-2.5 text-right">Min Level</th>
                          <th className="px-4 py-2.5 text-right">Cost Price</th>
                          <th className="px-4 py-2.5 text-right">Selling Price</th>
                          <th className="px-4 py-2.5 text-right">Cost Value</th>
                          <th className="px-4 py-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventoryItems.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-border transition-colors hover:bg-[#f6faf7] last:border-b-0"
                          >
                            <td className="px-4 py-2.5 font-medium text-text-primary">
                              {item.name}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="inline-block rounded-full bg-secondary-bg px-2 py-0.5 text-[11px] font-medium text-text-primary">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-text-muted">
                              {item.brand || "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-text-primary">
                              {item.stock_quantity}{" "}
                              <span className="font-normal text-text-muted text-[10px]">
                                {item.unit}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right text-text-muted">
                              {item.min_stock_level}
                            </td>
                            <td className="px-4 py-2.5 text-right text-text-muted">
                              {hidden ? maskValue() : formatCurrency(item.cost_price)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-text-primary font-medium">
                              {hidden ? maskValue() : formatCurrency(item.selling_price)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                              {hidden ? maskValue() : formatCurrency(item.stock_value_cost)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {item.stock_status === "out_of_stock" ? (
                                <Badge variant="danger">Out of Stock</Badge>
                              ) : item.stock_status === "low_stock" ? (
                                <Badge variant="warning">Low Stock</Badge>
                              ) : (
                                <Badge variant="active">In Stock</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Period POS Supplement Sales Collapsible Section */}
              {result.inventory.sales.length > 0 && (
                <Card className="overflow-hidden p-0">
                  <button
                    type="button"
                    aria-expanded={showInventorySales}
                    onClick={() => setShowInventorySales((v) => !v)}
                    className="flex w-full cursor-pointer items-center justify-between border-b border-border bg-[#fafbfa] px-4 py-3 text-left transition-colors hover:bg-[#f3f7f4]"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-text-muted" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                        Period POS Sales ({result.inventory.sales.length} transactions)
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-purple-700">
                        Revenue: {hidden ? maskValue() : formatCurrency(result.inventory.period_sales_revenue)} | Profit: {hidden ? maskValue() : formatCurrency(result.inventory.period_sales_profit)}
                      </span>
                      {showInventorySales ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </button>

                  {showInventorySales && (
                    <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[#fafbfa] z-10 shadow-xs">
                          <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                            <th className="px-4 py-2.5 text-left">Date</th>
                            <th className="px-4 py-2.5 text-left">Invoice #</th>
                            <th className="px-4 py-2.5 text-left">Customer</th>
                            <th className="px-4 py-2.5 text-left">Item</th>
                            <th className="px-4 py-2.5 text-right">Qty</th>
                            <th className="px-4 py-2.5 text-right">Amount</th>
                            <th className="px-4 py-2.5 text-right">Profit</th>
                            <th className="px-4 py-2.5 text-left">Method</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.inventory.sales.map((s) => (
                            <tr
                              key={s.id}
                              className="border-b border-border transition-colors hover:bg-[#f6faf7] last:border-b-0"
                            >
                              <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                                {formatDate(s.sale_date)}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-[11px] text-text-muted">
                                {s.invoice_number}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-text-primary">
                                {s.customer_name}
                              </td>
                              <td className="px-4 py-2.5 text-text-primary">
                                {s.item_name}
                              </td>
                              <td className="px-4 py-2.5 text-right text-text-primary">
                                {s.quantity} {s.item_unit}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-text-primary">
                                {hidden ? maskValue() : formatCurrency(s.total_amount)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium text-emerald-700">
                                {hidden ? maskValue() : formatCurrency(s.profit)}
                              </td>
                              <td className="px-4 py-2.5">
                                <Badge variant="info">{s.payment_method}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* SUPPLIERS & OUTSTANDING DUES SECTION */}
          {(activeTab === "all" || activeTab === "suppliers") && (
            <div className="space-y-3">
              {/* Suppliers Balances & Dues Table Card */}
              <Card className="overflow-hidden p-0">
                <div className="flex flex-col gap-3 border-b border-border bg-[#fafbfa] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-text-muted" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                      Supplier Accounts & Balances ({filteredSuppliers.length} of {result.supplier.suppliers.length})
                    </h3>
                  </div>

                  {/* Search and dues filter */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="relative w-48">
                      <Search
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                      />
                      <input
                        type="text"
                        placeholder="Search supplier or company..."
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                        className="w-full rounded-md border border-border bg-surface pl-8 pr-2.5 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-hidden"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setSupplierDuesOnly((v) => !v)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium border transition-colors ${
                        supplierDuesOnly
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-surface text-text-muted border-border hover:bg-[#f3f7f4] hover:text-text-primary"
                      }`}
                    >
                      {supplierDuesOnly ? "✓ Dues Only" : "Show Dues Only"}
                    </button>
                  </div>
                </div>

                {filteredSuppliers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-text-muted">
                    No suppliers match the current search or dues filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[#fafbfa] z-10 shadow-xs">
                        <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                          <th className="px-4 py-2.5 text-left">Supplier</th>
                          <th className="px-4 py-2.5 text-left">Company</th>
                          <th className="px-4 py-2.5 text-left">Contact</th>
                          <th className="px-4 py-2.5 text-right">Purchases</th>
                          <th className="px-4 py-2.5 text-right">Total Purchased</th>
                          <th className="px-4 py-2.5 text-right">Total Paid</th>
                          <th className="px-4 py-2.5 text-right">Balance Due</th>
                          <th className="px-4 py-2.5 text-center">Status</th>
                          <th className="px-4 py-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSuppliers.map((sup) => (
                          <tr
                            key={sup.id}
                            className="border-b border-border transition-colors hover:bg-[#f6faf7] last:border-b-0"
                          >
                            <td className="px-4 py-2.5 font-medium text-text-primary">
                              {sup.name}
                            </td>
                            <td className="px-4 py-2.5 text-text-muted">
                              {sup.company || "—"}
                            </td>
                            <td className="px-4 py-2.5 text-text-muted font-mono text-[11px]">
                              {sup.phone || "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right text-text-muted">
                              {sup.purchase_count}
                            </td>
                            <td className="px-4 py-2.5 text-right text-text-primary">
                              {hidden ? maskValue() : formatCurrency(sup.total_purchased)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-emerald-700 font-medium">
                              {hidden ? maskValue() : formatCurrency(sup.total_paid)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">
                              {sup.total_due > 0 ? (
                                <span className="text-amber-700">
                                  {hidden ? maskValue() : formatCurrency(sup.total_due)}
                                </span>
                              ) : (
                                <span className="text-text-muted">Rs. 0</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {sup.total_due > 0 ? (
                                <Badge variant="warning">Due Pending</Badge>
                              ) : (
                                <Badge variant="active">Cleared</Badge>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {sup.total_due > 0 ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleOpenSupplierWhatsApp(sup)}
                                  className="h-7 px-2 text-[11px] gap-1 text-[#128C7E] hover:text-[#075E54] border-[#25D366]/40 hover:bg-[#25D366]/10"
                                  title="Send dues reminder via WhatsApp"
                                >
                                  <WhatsAppIcon className="h-3.5 w-3.5 fill-current" />
                                  <span>Remind</span>
                                </Button>
                              ) : (
                                <span className="text-[11px] text-text-muted">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Period Purchases Collapsible Table */}
              {result.supplier.purchases.length > 0 && (
                <Card className="overflow-hidden p-0">
                  <button
                    type="button"
                    aria-expanded={showSupplierPurchases}
                    onClick={() => setShowSupplierPurchases((v) => !v)}
                    className="flex w-full cursor-pointer items-center justify-between border-b border-border bg-[#fafbfa] px-4 py-3 text-left transition-colors hover:bg-[#f3f7f4]"
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingBag size={16} className="text-text-muted" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                        Period Purchases Log ({result.supplier.purchases.length} invoices)
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-emerald-700">
                        Total Amount: {hidden ? maskValue() : formatCurrency(result.supplier.purchases.reduce((s, p) => s + p.total_amount, 0))}
                      </span>
                      {showSupplierPurchases ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </button>

                  {showSupplierPurchases && (
                    <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[#fafbfa] z-10 shadow-xs">
                          <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                            <th className="px-4 py-2.5 text-left">Date</th>
                            <th className="px-4 py-2.5 text-left">Invoice #</th>
                            <th className="px-4 py-2.5 text-left">Supplier</th>
                            <th className="px-4 py-2.5 text-left">Item</th>
                            <th className="px-4 py-2.5 text-right">Qty</th>
                            <th className="px-4 py-2.5 text-right">Unit Cost</th>
                            <th className="px-4 py-2.5 text-right">Total</th>
                            <th className="px-4 py-2.5 text-right">Paid</th>
                            <th className="px-4 py-2.5 text-right">Due</th>
                            <th className="px-4 py-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.supplier.purchases.map((p) => (
                            <tr
                              key={p.id}
                              className="border-b border-border transition-colors hover:bg-[#f6faf7] last:border-b-0"
                            >
                              <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                                {formatDate(p.purchase_date)}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-[11px] text-text-muted">
                                {p.invoice_number}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-text-primary">
                                {p.supplier_name}
                              </td>
                              <td className="px-4 py-2.5 text-text-primary">
                                {p.item_name}
                              </td>
                              <td className="px-4 py-2.5 text-right text-text-primary font-medium">
                                {p.quantity}
                              </td>
                              <td className="px-4 py-2.5 text-right text-text-muted">
                                {hidden ? maskValue() : formatCurrency(p.unit_cost)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-text-primary">
                                {hidden ? maskValue() : formatCurrency(p.total_amount)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium text-emerald-700">
                                {hidden ? maskValue() : formatCurrency(p.paid_amount)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">
                                {p.due_amount > 0 ? (
                                  <span className="text-amber-700">
                                    {hidden ? maskValue() : formatCurrency(p.due_amount)}
                                  </span>
                                ) : (
                                  <span className="text-text-muted">Rs. 0</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {p.payment_status === "paid" ? (
                                  <Badge variant="active">Paid</Badge>
                                ) : p.payment_status === "partial" ? (
                                  <Badge variant="warning">Partial</Badge>
                                ) : (
                                  <Badge variant="danger">Unpaid</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Due Reminder Modal */}
      <WhatsAppPreviewModal
        target={whatsAppTarget}
        onClose={() => setWhatsAppTarget(null)}
      />
    </div>
  );
}