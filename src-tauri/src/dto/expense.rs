use serde::{Deserialize, Serialize};

use crate::models::Expense;

pub const EXPENSE_CATEGORIES: &[&str] = &[
    "Rent",
    "Electricity",
    "Equipment",
    "Maintenance",
    "Cleaning",
    "Supplies",
    "Salary",
    "Other",
];

#[derive(Debug, Deserialize)]
pub struct CreateExpenseRequest {
    pub category: String,
    pub amount: i64,
    pub expense_date: String,
    pub description: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExpenseRequest {
    pub category: String,
    pub amount: i64,
    pub expense_date: String,
    pub description: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExpenseResponse {
    pub id: String,
    pub category: String,
    pub description: Option<String>,
    pub amount: i64,
    pub expense_date: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl ExpenseResponse {
    pub fn from_expense(expense: Expense) -> Self {
        Self {
            id: expense.id,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            expense_date: expense.expense_date,
            notes: expense.notes,
            created_at: expense.created_at,
            updated_at: expense.updated_at,
        }
    }
}
