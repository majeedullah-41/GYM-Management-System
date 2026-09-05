use tauri::State;

use crate::database::Database;
use crate::dto::expense::{CreateExpenseRequest, ExpenseResponse, UpdateExpenseRequest};
use crate::errors::AppError;
use crate::services::expense_service;

use super::db::run_db;

#[tauri::command]
pub async fn create_expense(
    state: State<'_, Database>,
    request: CreateExpenseRequest,
) -> Result<ExpenseResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| expense_service::create_expense(c, request)).await
}

#[tauri::command]
pub async fn get_expense(
    state: State<'_, Database>,
    id: String,
) -> Result<ExpenseResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| expense_service::get_expense(c, &id)).await
}

#[tauri::command]
pub async fn update_expense(
    state: State<'_, Database>,
    id: String,
    request: UpdateExpenseRequest,
) -> Result<ExpenseResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        expense_service::update_expense(c, &id, request)
    })
    .await
}

#[tauri::command]
pub async fn delete_expense(state: State<'_, Database>, id: String) -> Result<(), AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| expense_service::delete_expense(c, &id)).await
}

#[tauri::command]
pub async fn list_expenses(
    state: State<'_, Database>,
    search: Option<String>,
    category: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<Vec<ExpenseResponse>, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        expense_service::list_expenses(
            c,
            search.as_deref().unwrap_or(""),
            category.as_deref(),
            date_from.as_deref(),
            date_to.as_deref(),
        )
    })
    .await
}

#[tauri::command]
pub async fn total_expenses(
    state: State<'_, Database>,
    date_from: String,
    date_to: String,
) -> Result<i64, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        expense_service::total_expenses(c, &date_from, &date_to)
    })
    .await
}

#[tauri::command]
pub async fn restore_expense(
    state: State<'_, Database>,
    id: String,
) -> Result<ExpenseResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| expense_service::restore_expense(c, &id)).await
}
