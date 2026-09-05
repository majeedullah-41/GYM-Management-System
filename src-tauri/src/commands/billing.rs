use tauri::State;

use crate::database::Database;
use crate::dto::billing::MembershipBillingSummary;
use crate::errors::AppError;
use crate::services::billing_service;

use super::db::run_db;

#[tauri::command]
pub async fn get_membership_billing_summary(
    state: State<'_, Database>,
    member_id: String,
) -> Result<MembershipBillingSummary, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        billing_service::get_billing_summary(c, &member_id)
    })
    .await
}
