import { invokeCommand } from "../tauri";

export type ReportType =
  | "financial"
  | "payment"
  | "expense"
  | "member"
  | "membership_status"
  | "inventory"
  | "supplier";

export interface ReportRequest {
  report_type: ReportType;
  date_from?: string;
  date_to?: string;
  member_id?: string;
  payment_method?: string;
  membership_plan_id?: string;
  expense_category?: string;
}

export interface CategoryAmount {
  category: string;
  amount: number;
}

export interface FinancialReport {
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  payment_count: number;
  expense_count: number;
  revenue_by_method: CategoryAmount[];
  expenses_by_category: CategoryAmount[];
}

export interface PaymentReportRow {
  receipt_number: string;
  member_name: string;
  member_number: string;
  amount: number;
  payment_method: string;
  payment_date: string;
}

export interface PaymentReport {
  payments: PaymentReportRow[];
  total_count: number;
  total_amount: number;
}

export interface ExpenseReportRow {
  date: string;
  description: string;
  category: string;
  amount: number;
}

export interface ExpenseReport {
  expenses: ExpenseReportRow[];
  total_count: number;
  total_amount: number;
}

export interface MemberReport {
  total_members: number;
  active_members: number;
  expiring_soon: number;
  expired_members: number;
  archived_members: number;
}

export interface MemberStatusRow {
  member_number: string;
  full_name: string;
  phone: string | null;
  plan_name: string | null;
  expiry_date: string | null;
}

export interface MembershipStatusReport {
  active: MemberStatusRow[];
  expiring_soon: MemberStatusRow[];
  expired: MemberStatusRow[];
}

export interface InventoryReportItemRow {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  stock_status: string;
  stock_value_cost: number;
  stock_value_retail: number;
}

export interface InventoryReportSaleRow {
  id: string;
  invoice_number: string;
  customer_name: string;
  item_name: string;
  item_unit: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  profit: number;
  payment_method: string;
  sale_date: string;
}

export interface InventoryReport {
  total_items: number;
  total_stock_units: number;
  low_stock_count: number;
  out_of_stock_count: number;
  inventory_cost_value: number;
  inventory_retail_value: number;
  period_sales_revenue: number;
  period_sales_profit: number;
  period_sales_count: number;
  items: InventoryReportItemRow[];
  sales: InventoryReportSaleRow[];
}

export interface SupplierReportRow {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  total_purchased: number;
  total_paid: number;
  total_due: number;
  purchase_count: number;
  is_active: boolean;
}

export interface SupplierPurchaseReportRow {
  id: string;
  invoice_number: string;
  supplier_name: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: string;
  purchase_date: string;
}

export interface SupplierReport {
  total_suppliers: number;
  suppliers_with_dues: number;
  total_purchases_amount: number;
  total_paid_amount: number;
  total_dues_amount: number;
  suppliers: SupplierReportRow[];
  purchases: SupplierPurchaseReportRow[];
}

export interface ReportPdfResult {
  mode: string;
  path: string | null;
  message: string;
}

export async function generateReport(
  request: ReportRequest,
): Promise<Record<string, unknown>> {
  return invokeCommand<Record<string, unknown>>("generate_report", {
    request,
  });
}

export async function downloadReportPdf(
  dateFrom: string | null,
  dateTo: string | null,
): Promise<ReportPdfResult> {
  return invokeCommand<ReportPdfResult>("generate_report_pdf", {
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
  });
}
