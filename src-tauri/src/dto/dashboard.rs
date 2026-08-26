use serde::Serialize;

use crate::dto::payment::PaymentResponse;

#[derive(Debug, Clone, Serialize)]
pub struct DashboardSummary {
    pub total_members: i64,
    pub active_members: i64,
    pub expiring_soon: i64,
    pub expired_members: i64,
    pub today_revenue: i64,
    pub month_revenue: i64,
    pub month_expenses: i64,
    pub month_net_income: i64,
    pub recent_payments: Vec<PaymentResponse>,
}
