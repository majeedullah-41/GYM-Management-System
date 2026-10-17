use serde::Serialize;

use crate::dto::member::MemberResponse;
use crate::dto::payment::PaymentResponse;
use crate::dto::supplement::{ItemResponse, SaleResponse};

#[derive(Debug, Clone, Serialize)]
pub struct ExpiringMember {
    pub id: String,
    pub member_number: String,
    pub full_name: String,
    pub plan_name: Option<String>,
    pub membership_expiry_date: Option<String>,
    pub days_remaining: i64,
    pub outstanding: i64,
}

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
    pub total_outstanding: i64,
    pub month_supplement_sales: i64,
    pub month_supplement_profit: i64,
    pub total_supplier_dues: i64,
    pub suppliers_with_dues: i64,
    pub low_stock_count: i64,
    pub out_of_stock_count: i64,
    pub low_stock_items: Vec<ItemResponse>,
    pub recent_supplement_sales: Vec<SaleResponse>,
    pub recent_payments: Vec<PaymentResponse>,
    pub recent_members: Vec<MemberResponse>,
    pub expiring_members: Vec<ExpiringMember>,
}
