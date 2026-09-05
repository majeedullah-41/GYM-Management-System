use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Membership {
    pub id: String,
    pub member_id: String,
    pub membership_plan_id: String,
    pub enrollment_date: String,
    pub billing_start_date: String,
    pub agreed_fee: i64,
    pub billing_cycle_days: i32,
    pub status: String,
    pub status_changed_at: String,
    pub ended_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyBill {
    pub id: String,
    pub membership_id: String,
    pub member_id: String,
    pub membership_plan_id: String,
    pub billing_period: String,
    pub period_start: String,
    pub period_end: String,
    pub due_date: String,
    pub expected_amount: i64,
    pub paid_amount: i64,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}
