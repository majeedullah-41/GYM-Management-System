use tauri::State;

use crate::database::Database;
use crate::dto::expense::{CreateExpenseRequest, ExpenseResponse, UpdateExpenseRequest};
use crate::errors::AppError;
use crate::services::expense_service;

#[tauri::command]
pub fn create_expense(
    state: State<'_, Database>,
    request: CreateExpenseRequest,
) -> Result<ExpenseResponse, AppError> {
    expense_service::create_expense(&state.conn(), request)
}

#[tauri::command]
pub fn get_expense(
    state: State<'_, Database>,
    id: String,
) -> Result<ExpenseResponse, AppError> {
    expense_service::get_expense(&state.conn(), &id)
}

#[tauri::command]
pub fn update_expense(
    state: State<'_, Database>,
    id: String,
    request: UpdateExpenseRequest,
) -> Result<ExpenseResponse, AppError> {
    expense_service::update_expense(&state.conn(), &id, request)
}

#[tauri::command]
pub fn delete_expense(
    state: State<'_, Database>,
    id: String,
) -> Result<(), AppError> {
    expense_service::delete_expense(&state.conn(), &id)
}

#[tauri::command]
pub fn list_expenses(
    state: State<'_, Database>,
    search: Option<String>,
    category: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<Vec<ExpenseResponse>, AppError> {
    expense_service::list_expenses(
        &state.conn(),
        search.as_deref().unwrap_or(""),
        category.as_deref(),
        date_from.as_deref(),
        date_to.as_deref(),
    )
}

#[tauri::command]
pub fn total_expenses(
    state: State<'_, Database>,
    date_from: String,
    date_to: String,
) -> Result<i64, AppError> {
    expense_service::total_expenses(&state.conn(), &date_from, &date_to)
}
