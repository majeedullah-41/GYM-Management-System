import { invokeCommand } from "../tauri";

export type ReportType = "financial" | "payment" | "expense" | "member" | "membership_status";

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
