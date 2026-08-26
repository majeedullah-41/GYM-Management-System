use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct ReportRequest {
    pub report_type: String,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub member_id: Option<String>,
    pub payment_method: Option<String>,
    pub membership_plan_id: Option<String>,
    pub expense_category: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FinancialReportResponse {
    pub total_revenue: i64,
    pub total_expenses: i64,
    pub net_income: i64,
    pub payment_count: i64,
    pub expense_count: i64,
    pub revenue_by_method: Vec<CategoryAmount>,
    pub expenses_by_category: Vec<CategoryAmount>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CategoryAmount {
    pub category: String,
    pub amount: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct PaymentReportResponse {
    pub payments: Vec<PaymentReportRow>,
    pub total_count: i64,
    pub total_amount: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct PaymentReportRow {
    pub receipt_number: String,
    pub member_name: String,
    pub member_number: String,
    pub amount: i64,
    pub payment_method: String,
    pub payment_date: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExpenseReportResponse {
    pub expenses: Vec<ExpenseReportRow>,
    pub total_count: i64,
    pub total_amount: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExpenseReportRow {
    pub date: String,
    pub description: String,
    pub category: String,
    pub amount: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MemberReportResponse {
    pub total_members: i64,
    pub active_members: i64,
    pub expiring_soon: i64,
    pub expired_members: i64,
    pub archived_members: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MembershipStatusReportResponse {
    pub active: Vec<MemberStatusRow>,
    pub expiring_soon: Vec<MemberStatusRow>,
    pub expired: Vec<MemberStatusRow>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MemberStatusRow {
    pub member_number: String,
    pub full_name: String,
    pub phone: Option<String>,
    pub plan_name: Option<String>,
    pub expiry_date: Option<String>,
}
