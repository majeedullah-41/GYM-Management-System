use tauri::State;

use crate::database::Database;
use crate::dto::receipt::ReceiptResponse;
use crate::errors::AppError;
use crate::services::receipt_service;

#[tauri::command]
pub fn get_receipt_by_payment_id(
    state: State<'_, Database>,
    payment_id: String,
) -> Result<ReceiptResponse, AppError> {
    receipt_service::get_receipt_by_payment_id(&state.conn(), &payment_id)
}

#[tauri::command]
pub fn get_receipt_by_number(
    state: State<'_, Database>,
    receipt_number: String,
) -> Result<ReceiptResponse, AppError> {
    receipt_service::get_receipt_by_number(&state.conn(), &receipt_number)
}
