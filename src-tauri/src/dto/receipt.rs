use crate::dto::billing::PaymentAllocationResponse;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReceiptResponse {
    pub id: String,
    pub receipt_number: String,
    pub issued_at: String,
    pub gym_name: String,
    pub gym_address: Option<String>,
    pub gym_phone: Option<String>,
    pub member_name: String,
    pub member_number: String,
    pub plan_name: String,
    pub amount: i64,
    pub payment_method: String,
    pub payment_date: String,
    pub membership_start_date: String,
    pub membership_expiry_date: String,
    pub notes: Option<String>,
    pub remaining_balance: i64,
    pub allocations: Vec<PaymentAllocationResponse>,
}
