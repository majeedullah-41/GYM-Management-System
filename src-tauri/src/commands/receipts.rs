use tauri::State;

use crate::database::Database;
use crate::dto::receipt::ReceiptResponse;
use crate::errors::AppError;
use crate::services::receipt_service;

use super::db::run_db;

#[tauri::command]
pub async fn get_receipt_by_payment_id(
    state: State<'_, Database>,
    payment_id: String,
) -> Result<ReceiptResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        receipt_service::get_receipt_by_payment_id(c, &payment_id)
    })
    .await
}

#[tauri::command]
pub async fn get_receipt_by_number(
    state: State<'_, Database>,
    receipt_number: String,
) -> Result<ReceiptResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        receipt_service::get_receipt_by_number(c, &receipt_number)
    })
    .await
}
