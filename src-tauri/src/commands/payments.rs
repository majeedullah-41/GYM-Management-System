use tauri::State;

use crate::database::Database;
use crate::dto::payment::{
    CreatePaymentRequest, PaymentResponse, PaymentSummary, UpdatePaymentRequest, VoidPaymentRequest,
};
use crate::errors::AppError;
use crate::services::payment_service;

use super::db::run_db;

#[tauri::command]
pub async fn create_payment(
    state: State<'_, Database>,
    request: CreatePaymentRequest,
) -> Result<PaymentResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| payment_service::create_payment(c, request)).await
}

#[tauri::command]
pub async fn get_payment(
    state: State<'_, Database>,
    id: String,
) -> Result<PaymentResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| payment_service::get_payment(c, &id)).await
}

#[tauri::command]
pub async fn list_payments(
    state: State<'_, Database>,
    search: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    member_id: Option<String>,
    plan_id: Option<String>,
    status: Option<String>,
) -> Result<Vec<PaymentResponse>, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        payment_service::list_payments(
            c,
            search.as_deref().unwrap_or(""),
            date_from.as_deref(),
            date_to.as_deref(),
            member_id.as_deref(),
            plan_id.as_deref(),
            status.as_deref(),
        )
    })
    .await
}

#[tauri::command]
pub async fn update_payment(
    state: State<'_, Database>,
    id: String,
    request: UpdatePaymentRequest,
) -> Result<PaymentResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| payment_service::update_payment(c, &id, request)).await
}

#[tauri::command]
pub async fn list_member_payments(
    state: State<'_, Database>,
    member_id: String,
) -> Result<Vec<PaymentResponse>, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| payment_service::list_member_payments(c, &member_id)).await
}

#[tauri::command]
pub async fn get_payment_summary(
    state: State<'_, Database>,
    member_id: String,
    plan_id: String,
) -> Result<PaymentSummary, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| payment_service::get_payment_summary(c, &member_id, &plan_id)).await
}

#[tauri::command]
pub async fn void_payment(
    state: State<'_, Database>,
    id: String,
    request: VoidPaymentRequest,
) -> Result<PaymentResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| payment_service::void_payment(c, &id, &request.reason)).await
}
