use base64::Engine;
use tauri::State;

use crate::database::Database;
use crate::errors::AppError;
use crate::repositories::settings_repository::{
    self, AllSettings, BackupSettings, GymSettings, PrintSettings, ReceiptSettings,
};
use crate::services::auth_service;
use crate::services::backup_service::{self, BackupKind};

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
pub async fn save_backup_settings(
    state: State<'_, Database>,
    backup: BackupSettings,
) -> Result<(), AppError> {
    auth_service::require_authenticated()?;
    if let Some(directory) = backup.directory.as_deref() {
        let path = std::path::Path::new(directory);
        std::fs::create_dir_all(path).map_err(|error| {
            AppError::ValidationError(format!("Could not use the selected folder: {error}"))
        })?;
        if !path.is_dir() {
            return Err(AppError::ValidationError(
                "The selected backup location is not a folder".into(),
            ));
        }
    }

    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        settings_repository::save_backup_settings(c, &backup)
    })
    .await
}

#[tauri::command]
pub async fn select_backup_folder() -> Result<Option<String>, AppError> {
    auth_service::require_authenticated()?;
    Ok(rfd::AsyncFileDialog::new()
        .set_title("Select backup folder")
        .pick_folder()
        .await
        .map(|folder| folder.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn select_gym_logo() -> Result<Option<String>, AppError> {
    auth_service::require_authenticated()?;
    let Some(file) = rfd::AsyncFileDialog::new()
        .set_title("Select gym logo")
        .add_filter("Logo image", &["png", "jpg", "jpeg"])
        .pick_file()
        .await
    else {
        return Ok(None);
    };

    let bytes = file.read().await;
    if bytes.len() > 2 * 1024 * 1024 {
        return Err(AppError::ValidationError(
            "Logo image must be smaller than 2 MB".into(),
        ));
    }
    printpdf::image_crate::load_from_memory(&bytes).map_err(|_| {
        AppError::ValidationError("The selected file is not a valid PNG or JPEG image".into())
    })?;
    let extension = file
        .path()
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let mime = match extension.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        _ => {
            return Err(AppError::ValidationError(
                "Select a PNG or JPEG logo image".into(),
            ))
        }
    };
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(Some(format!("data:{mime};base64,{encoded}")))
}

#[tauri::command]
pub async fn backup_database(
    state: State<'_, Database>,
    directory: String,
) -> Result<String, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        let path =
            backup_service::create_backup(c, std::path::Path::new(&directory), BackupKind::Manual)?;
        Ok(path.to_string_lossy().to_string())
    })
    .await
}
