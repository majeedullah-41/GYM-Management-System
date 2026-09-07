use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
pub struct AdvancePeriod {
    pub billing_period: String,
    pub period_start: String,
    pub period_end: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AdvancePaymentPreview {
    pub member_id: String,
    pub member_name: String,
    pub member_number: String,
    pub membership_plan_id: String,
    pub plan_name: String,
    pub fee: i64,
    pub period_count: u32,
    pub paid_through: Option<String>,
    pub coverage_start: String,
    pub coverage_end: String,
    pub coverage_periods: Vec<AdvancePeriod>,
    pub outstanding_dues: i64,
    pub future_total: i64,
    pub total: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateAdvancePaymentRequest {
    pub member_id: String,
    pub period_count: u32,
    pub payment_method: String,
    #[serde(default)]
    pub note: Option<String>,
    #[serde(default)]
    pub idempotency_key: Option<String>,
}