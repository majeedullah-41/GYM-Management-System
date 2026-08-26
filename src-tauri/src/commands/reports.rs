use tauri::State;

use crate::database::Database;
use crate::dto::report::{ReportRequest, ReportResponse};
use crate::errors::AppError;
use crate::services::report_service;

#[tauri::command]
pub fn generate_report(
    state: State<'_, Database>,
    request: ReportRequest,
) -> Result<ReportResponse, AppError> {
    report_service::generate_report(&state.conn(), request)
}
