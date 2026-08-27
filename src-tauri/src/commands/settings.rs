use tauri::State;
use rusqlite::backup::Backup;

use crate::database::Database;
use crate::errors::AppError;
use crate::repositories::settings_repository::{self, GymSettings, ReceiptSettings, AllSettings};

#[tauri::command]
pub fn get_all_settings(state: State<'_, Database>) -> Result<AllSettings, AppError> {
    settings_repository::get_all_settings(&state.conn())
}

#[tauri::command]
pub fn save_gym_settings(
    state: State<'_, Database>,
    gym: GymSettings,
) -> Result<(), AppError> {
    settings_repository::save_gym_settings(&state.conn(), &gym)
}

#[tauri::command]
pub fn save_receipt_settings(
    state: State<'_, Database>,
    receipt: ReceiptSettings,
) -> Result<(), AppError> {
    settings_repository::save_receipt_settings(&state.conn(), &receipt)
}

#[tauri::command]
pub fn backup_database(state: State<'_, Database>, dest_path: String) -> Result<String, AppError> {
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

    let conn = state.conn();
    let mut dest_conn = rusqlite::Connection::open(&path)
        .map_err(|e| AppError::InternalError(format!("Failed to create backup file: {}", e)))?;

    let backup = Backup::new(&conn, &mut dest_conn)
        .map_err(|e| AppError::InternalError(format!("Failed to initialize backup: {}", e)))?;

    backup
        .run_to_completion(500, std::time::Duration::from_millis(0), None)
        .map_err(|e| AppError::InternalError(format!("Backup failed: {}", e)))?;

    log::info!("Database backed up to: {}", path);
    Ok(path)
}
