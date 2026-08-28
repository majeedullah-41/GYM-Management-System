use tauri::State;

use crate::database::Database;
use crate::dto::report::{ReportRequest, ReportResponse};
use crate::errors::AppError;
use crate::services::report_service;

use super::db::run_db;

#[tauri::command]
pub async fn generate_report(
    state: State<'_, Database>,
    request: ReportRequest,
) -> Result<ReportResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| report_service::generate_report(c, request)).await
}
