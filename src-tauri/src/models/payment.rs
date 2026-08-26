use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id: String,
    pub receipt_number: String,
    pub member_id: String,
    pub amount: i64,
    pub payment_method: String,
    pub payment_date: String,
    pub membership_plan_id: String,
    pub membership_start_date: String,
    pub membership_expiry_date: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
