use serde::{Deserialize, Serialize};

use crate::models::Payment;

#[derive(Debug, Deserialize)]
pub struct CreatePaymentRequest {
    pub member_id: String,
    pub membership_plan_id: String,
    pub amount: i64,
    pub payment_method: String,
    pub payment_date: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PaymentResponse {
    pub id: String,
    pub receipt_number: String,
    pub member_id: String,
    pub member_name: Option<String>,
    pub member_number: Option<String>,
    pub amount: i64,
    pub payment_method: String,
    pub payment_date: String,
    pub membership_plan_id: String,
    pub membership_plan_name: Option<String>,
    pub membership_start_date: String,
    pub membership_expiry_date: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl PaymentResponse {
    pub fn from_payment(
        payment: Payment,
        member_name: Option<String>,
        member_number: Option<String>,
        plan_name: Option<String>,
    ) -> Self {
        Self {
            id: payment.id,
            receipt_number: payment.receipt_number,
            member_id: payment.member_id,
            member_name,
            member_number,
            amount: payment.amount,
            payment_method: payment.payment_method,
            payment_date: payment.payment_date,
            membership_plan_id: payment.membership_plan_id,
            membership_plan_name: plan_name,
            membership_start_date: payment.membership_start_date,
            membership_expiry_date: payment.membership_expiry_date,
            notes: payment.notes,
            created_at: payment.created_at,
            updated_at: payment.updated_at,
        }
    }
}
