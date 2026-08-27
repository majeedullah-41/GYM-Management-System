use serde::{Deserialize, Serialize};

use crate::models::MembershipPlan;

#[derive(Debug, Deserialize)]
pub struct CreatePlanRequest {
    pub name: String,
    pub duration_days: i32,
    pub price: i64,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePlanRequest {
    pub name: String,
    pub duration_days: i32,
    pub price: i64,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PlanResponse {
    pub id: String,
    pub name: String,
    pub duration_days: i32,
    pub price: i64,
    pub description: Option<String>,
    pub is_active: bool,
    pub member_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

impl From<MembershipPlan> for PlanResponse {
    fn from(plan: MembershipPlan) -> Self {
        Self {
            id: plan.id,
            name: plan.name,
            duration_days: plan.duration_days,
            price: plan.price,
            description: plan.description,
            is_active: plan.is_active,
            member_count: 0,
            created_at: plan.created_at,
            updated_at: plan.updated_at,
        }
    }
}

impl PlanResponse {
    pub fn with_member_count(mut self, count: i32) -> Self {
        self.member_count = count;
        self
    }
}
