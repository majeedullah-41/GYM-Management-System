use tauri::State;

use crate::database::Database;
use crate::dto::payment::{CreatePaymentRequest, PaymentResponse};
use crate::errors::AppError;
use crate::services::payment_service;

#[tauri::command]
pub fn create_payment(
    state: State<'_, Database>,
    request: CreatePaymentRequest,
) -> Result<PaymentResponse, AppError> {
    payment_service::create_payment(&state.conn(), request)
}

#[tauri::command]
pub fn get_payment(
    state: State<'_, Database>,
    id: String,
) -> Result<PaymentResponse, AppError> {
    payment_service::get_payment(&state.conn(), &id)
}

#[tauri::command]
pub fn list_payments(
    state: State<'_, Database>,
    search: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<Vec<PaymentResponse>, AppError> {
    payment_service::list_payments(
        &state.conn(),
        search.as_deref().unwrap_or(""),
        date_from.as_deref(),
        date_to.as_deref(),
    )
}

#[tauri::command]
pub fn list_member_payments(
    state: State<'_, Database>,
    member_id: String,
) -> Result<Vec<PaymentResponse>, AppError> {
    payment_service::list_member_payments(&state.conn(), &member_id)
}
