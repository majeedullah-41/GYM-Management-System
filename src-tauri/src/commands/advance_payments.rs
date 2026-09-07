use tauri::State;

use crate::database::Database;
use crate::dto::advance_payment::{AdvancePaymentPreview, CreateAdvancePaymentRequest};
use crate::dto::payment::PaymentResponse;
use crate::errors::AppError;
use crate::services::advance_payment_service;

use super::db::run_db;

#[tauri::command]
pub async fn preview_advance_payment(
    state: State<'_, Database>,
    member_id: String,
    period_count: u32,
) -> Result<AdvancePaymentPreview, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| advance_payment_service::preview(c, &member_id, period_count)).await
}

#[tauri::command]
pub async fn create_advance_payment(
    state: State<'_, Database>,
    request: CreateAdvancePaymentRequest,
) -> Result<PaymentResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| advance_payment_service::create(c, request)).await
}