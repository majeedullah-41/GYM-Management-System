use serde::{Deserialize, Serialize};

use crate::models::Payment;

#[derive(Debug, Deserialize)]
pub struct CreatePaymentRequest {
    pub member_id: String,
    pub membership_plan_id: String,
    pub amount: i64,
    pub payment_method: String,
    pub payment_date: String,
    pub admission_fee: Option<i64>,
    pub description: Option<String>,
    pub reference: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePaymentRequest {
    pub description: Option<String>,
    pub reference: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VoidPaymentRequest {
    pub reason: String,
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
    pub description: Option<String>,
    pub reference: Option<String>,
    pub notes: Option<String>,
    pub is_voided: bool,
    pub voided_at: Option<String>,
    pub void_reason: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct PaymentSummary {
    pub plan_price: i64,
    /// Back-due: the accumulated shortfall across the member's lapsed/current
    /// cycles for this plan (periods whose shortfall has not yet been settled).
    pub back_due: i64,
    /// The price of a brand-new period that will be opened by this payment
    /// (0 when an active period is being extended/reused).
    pub new_period_due: i64,
    pub previously_paid: i64,
    pub outstanding: i64,
    pub admission_fee: Option<i64>,
    pub is_first_payment: bool,
    pub membership_start_date: Option<String>,
    pub membership_expiry_date: Option<String>,
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
            description: payment.description,
            reference: payment.reference,
            notes: payment.notes,
            is_voided: payment.is_voided,
            voided_at: payment.voided_at,
            void_reason: payment.void_reason,
            created_at: payment.created_at,
            updated_at: payment.updated_at,
        }
    }
}
