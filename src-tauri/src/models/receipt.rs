use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Receipt {
    pub id: String,
    pub receipt_number: String,
    pub payment_id: String,
    pub issued_at: String,
    pub created_at: String,
}
