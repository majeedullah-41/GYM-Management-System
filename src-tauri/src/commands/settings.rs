use rusqlite::backup::Backup;
use tauri::State;

use crate::database::Database;
use crate::errors::AppError;
use crate::repositories::settings_repository::{
    self, AllSettings, GymSettings, PrintSettings, ReceiptSettings,
};

use super::db::run_db;

#[tauri::command]
pub async fn get_all_settings(state: State<'_, Database>) -> Result<AllSettings, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, |c| settings_repository::get_all_settings(c)).await
}

#[tauri::command]
pub async fn save_gym_settings(
    state: State<'_, Database>,
    gym: GymSettings,
) -> Result<(), AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        settings_repository::save_gym_settings(c, &gym)
    })
    .await
}

#[tauri::command]
pub async fn save_receipt_settings(
    state: State<'_, Database>,
    receipt: ReceiptSettings,
) -> Result<(), AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        settings_repository::save_receipt_settings(c, &receipt)
    })
    .await
}

#[tauri::command]
pub async fn save_print_settings(
    state: State<'_, Database>,
    print: PrintSettings,
) -> Result<(), AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        settings_repository::save_print_settings(c, &print)
    })
    .await
}

#[tauri::command]
pub async fn backup_database(
    state: State<'_, Database>,
    dest_path: String,
) -> Result<String, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        let path = if dest_path.is_empty() {
            let timestamp = chrono::Utc::now().format("%Y%m%d-%H%M%S");
            let filename = format!("GymBackup-{}.db", timestamp);
            let app_dir = dirs_next::data_local_dir()
                .unwrap_or_else(|| std::path::PathBuf::from("."))
                .join("com.gympos.app");
            std::fs::create_dir_all(&app_dir).ok();
            app_dir.join(&filename).to_string_lossy().to_string()
        } else {
            dest_path
        };

        let mut dest_conn = rusqlite::Connection::open(&path)
            .map_err(|e| AppError::InternalError(format!("Failed to create backup file: {}", e)))?;

        let backup = Backup::new(c, &mut dest_conn)
            .map_err(|e| AppError::InternalError(format!("Failed to initialize backup: {}", e)))?;

        backup
            .run_to_completion(500, std::time::Duration::from_millis(0), None)
            .map_err(|e| AppError::InternalError(format!("Backup failed: {}", e)))?;

        log::info!("Database backed up to: {}", path);

        Ok(path)
    })
    .await
}
