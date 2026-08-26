import { invokeCommand } from "../../lib/tauri";
import type { PaymentResponse } from "./payments";

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
  recent_payments: PaymentResponse[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return invokeCommand<DashboardSummary>("get_dashboard_summary");
}
