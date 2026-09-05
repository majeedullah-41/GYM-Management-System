use serde::{Deserialize, Serialize};

use crate::models::MonthlyBill;

#[derive(Debug, Clone, Serialize)]
pub struct MonthlyBillResponse {
    pub id: String,
    pub membership_id: String,
    pub membership_plan_id: String,
    pub billing_period: String,
    pub period_start: String,
    pub period_end: String,
    pub due_date: String,
    pub expected_amount: i64,
    pub paid_amount: i64,
    pub remaining_amount: i64,
    pub status: String,
}

impl From<MonthlyBill> for MonthlyBillResponse {
    fn from(bill: MonthlyBill) -> Self {
        Self {
            id: bill.id,
            membership_id: bill.membership_id,
            membership_plan_id: bill.membership_plan_id,
            billing_period: bill.billing_period,
            period_start: bill.period_start,
            period_end: bill.period_end,
            due_date: bill.due_date,
            expected_amount: bill.expected_amount,
            paid_amount: bill.paid_amount,
            remaining_amount: bill.expected_amount - bill.paid_amount,
            status: bill.status,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct MembershipBillingSummary {
    pub membership_id: Option<String>,
    pub membership_plan_id: Option<String>,
    pub plan_name: Option<String>,
    pub monthly_fee: i64,
    pub enrollment_date: Option<String>,
    pub membership_status: Option<String>,
    pub previous_dues: i64,
    pub current_month_fee: i64,
    pub total_outstanding: i64,
    pub bills: Vec<MonthlyBillResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentAllocationResponse {
    pub billing_period: String,
    pub period_start: String,
    pub period_end: String,
    pub amount: i64,
}
