use serde::{Deserialize, Serialize};

use crate::models::Expense;

pub const EXPENSE_CATEGORIES: &[&str] = &[
    "Rent",
    "Electricity",
    "Water",
    "Gas",
    "Internet",
    "Equipment",
    "Maintenance",
    "Cleaning",
    "Supplies",
    "Staff",
    "Marketing",
    "Salary",
    "Other",
];

pub const EXPENSE_PAYMENT_METHODS: &[&str] = &["Cash", "Card", "BankTransfer", "Other"];

#[derive(Debug, Deserialize)]
pub struct CreateExpenseRequest {
    pub category: String,
    pub amount: i64,
    pub expense_date: String,
    pub description: Option<String>,
    pub payment_method: Option<String>,
    pub vendor: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExpenseRequest {
    pub category: String,
    pub amount: i64,
    pub expense_date: String,
    pub description: Option<String>,
    pub payment_method: Option<String>,
    pub vendor: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExpenseResponse {
    pub id: String,
    pub category: String,
    pub description: Option<String>,
    pub amount: i64,
    pub expense_date: String,
    pub payment_method: Option<String>,
    pub vendor: Option<String>,
    pub notes: Option<String>,
    pub is_deleted: bool,
    pub deleted_at: Option<String>,
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
            payment_method: expense.payment_method,
            vendor: expense.vendor,
            notes: expense.notes,
            is_deleted: expense.is_deleted,
            deleted_at: expense.deleted_at,
            created_at: expense.created_at,
            updated_at: expense.updated_at,
        }
    }
}
