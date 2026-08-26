use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Expense {
    pub id: String,
    pub category: String,
    pub description: Option<String>,
    pub amount: i64,
    pub expense_date: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
