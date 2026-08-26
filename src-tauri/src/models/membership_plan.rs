use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MembershipPlan {
    pub id: String,
    pub name: String,
    pub duration_days: i32,
    pub price: i64,
    pub description: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}
