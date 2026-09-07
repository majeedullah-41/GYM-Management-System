//! License activation commands. None of these go through `run_db` because they
//! must work before a valid license exists.

use tauri::State;

use crate::errors::AppError;
use crate::licensing::services::license_service::{LicenseService, LicenseStatusResponse};

#[tauri::command]
pub async fn get_license_status(
    state: State<'_, LicenseService>,
) -> Result<LicenseStatusResponse, AppError> {
    state.inner().validate();
    Ok(state.inner().snapshot())
}

#[tauri::command]
pub async fn get_hardware_id(state: State<'_, LicenseService>) -> Result<String, AppError> {
    Ok(state.inner().hardware_id())
}

#[tauri::command]
pub async fn import_license(
    state: State<'_, LicenseService>,
    contents: String,
) -> Result<LicenseStatusResponse, AppError> {
    if contents.trim().is_empty() {
        return Err(AppError::ValidationError(
            "License contents are empty".into(),
        ));
    }
    state.inner().import(&contents);
    Ok(state.inner().snapshot())
}

#[tauri::command]
pub async fn replace_license(
    state: State<'_, LicenseService>,
    contents: String,
) -> Result<LicenseStatusResponse, AppError> {
    if contents.trim().is_empty() {
        return Err(AppError::ValidationError(
            "License contents are empty".into(),
        ));
    }
    state.inner().replace(&contents);
    Ok(state.inner().snapshot())
}

#[tauri::command]
pub async fn select_license_file() -> Result<Option<String>, AppError> {
    let Some(file) = rfd::AsyncFileDialog::new()
        .set_title("Select license file")
        .add_filter("Gym POS license", &["gymlic"])
        .pick_file()
        .await
    else {
        return Ok(None);
    };
    let bytes = file.read().await;
    let contents = String::from_utf8(bytes).map_err(|_| {
        AppError::ValidationError("License file must be plain text (.gymlic)".into())
    })?;
    Ok(Some(contents))
}

#[tauri::command]
pub async fn validate_license(
    state: State<'_, LicenseService>,
) -> Result<LicenseStatusResponse, AppError> {
    state.inner().validate();
    Ok(state.inner().snapshot())
}