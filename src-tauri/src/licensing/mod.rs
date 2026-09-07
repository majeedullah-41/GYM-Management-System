//! Licensing subsystem: Ed25519-verified `.gymlic` files, machine-bound HWID,
//! expiry and clock-rollback protection. The backend is authoritative: every
//! database command gated through `require_valid_license`.

pub mod crypto;
pub mod domain;
pub mod repositories;
pub mod services;

use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

use crate::errors::AppError;

use services::license_service::LicenseService;

static LICENSE_VALID: AtomicBool = AtomicBool::new(false);

/// Backend authority check used by `commands::db::run_db`. The React layer
/// hides screens with `LicenseGate`, but this guard prevents any DB access
/// unless a license was verified during this process.
pub fn require_valid_license() -> Result<(), AppError> {
    if LICENSE_VALID.load(Ordering::SeqCst) {
        Ok(())
    } else {
        Err(AppError::ValidationError(
            "A valid license is required".into(),
        ))
    }
}

pub(crate) fn set_license_valid(valid: bool) {
    LICENSE_VALID.store(valid, Ordering::SeqCst);
}

/// Builds the license service for the app data directory and evaluates the
/// installed license (opening or keeping closed the backend gate).
pub fn init(app_dir: &Path) -> LicenseService {
    let service = LicenseService::new(app_dir);
    let status = service.validate();
    log::info!("License status on startup: {status:?}");
    service
}