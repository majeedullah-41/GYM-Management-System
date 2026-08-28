use tauri::State;

use crate::database::Database;
use crate::dto::dashboard::DashboardSummary;
use crate::errors::AppError;
use crate::services::dashboard_service;

use super::db::run_db;

#[tauri::command]
pub async fn get_dashboard_summary(
    state: State<'_, Database>,
) -> Result<DashboardSummary, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, |c| dashboard_service::get_dashboard_summary(c)).await
}
