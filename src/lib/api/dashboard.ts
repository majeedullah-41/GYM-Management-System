import { invokeCommand } from "../../lib/tauri";
import type { PaymentResponse } from "./payments";
import type { MemberResponse } from "./members";
import type { ItemResponse, SaleResponse } from "./supplements";

export interface ExpiringMember {
  id: string;
  member_number: string;
  full_name: string;
  plan_name: string | null;
  membership_expiry_date: string | null;
  days_remaining: number;
  outstanding: number;
}

export interface DashboardSummary {
  total_members: number;
  active_members: number;
  expiring_soon: number;
  expired_members: number;
  today_revenue: number;
  month_revenue: number;
  month_expenses: number;
  month_net_income: number;
  total_outstanding: number;
  month_supplement_sales: number;
  month_supplement_profit: number;
  total_supplier_dues: number;
  suppliers_with_dues: number;
  low_stock_count: number;
  out_of_stock_count: number;
  low_stock_items: ItemResponse[];
  recent_supplement_sales: SaleResponse[];
  recent_payments: PaymentResponse[];
  recent_members: MemberResponse[];
  expiring_members: ExpiringMember[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return invokeCommand<DashboardSummary>("get_dashboard_summary");
}
