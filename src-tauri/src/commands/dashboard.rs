use tauri::State;

use crate::database::Database;
use crate::dto::dashboard::DashboardSummary;
use crate::errors::AppError;
use crate::services::dashboard_service;

#[tauri::command]
pub fn get_dashboard_summary(
    state: State<'_, Database>,
) -> Result<DashboardSummary, AppError> {
    dashboard_service::get_dashboard_summary(&state.conn())
}
