//! Persistence for the license file and the clock-rollback sidecar.

use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::errors::AppError;

pub const LICENSE_FILE_NAME: &str = "license.gymlic";
pub const LICENSE_STATE_FILE_NAME: &str = "license_state.json";

pub fn load(path: &Path) -> Result<Option<Vec<u8>>, AppError> {
    match std::fs::read(path) {
        Ok(bytes) => Ok(Some(bytes)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(AppError::InternalError(format!(
            "Failed to read license file: {error}"
        ))),
    }
}

pub fn save(path: &Path, bytes: &[u8]) -> Result<(), AppError> {
    std::fs::write(path, bytes).map_err(|error| {
        AppError::InternalError(format!("Failed to write license file: {error}"))
    })
}

#[derive(Serialize, Deserialize)]
struct LicenseState {
    last_seen: Option<String>,
}

/// Loads the most recent date on which a valid license was observed.
pub fn load_state(path: &Path) -> Option<String> {
    let contents = std::fs::read_to_string(path).ok()?;
    let state: LicenseState = serde_json::from_str(&contents).ok()?;
    state.last_seen
}

pub fn save_state(path: &Path, last_seen: &str) {
    let state = LicenseState {
        last_seen: Some(last_seen.to_string()),
    };
    if let Ok(json) = serde_json::to_string(&state) {
        let _ = std::fs::write(path, json);
    }
}