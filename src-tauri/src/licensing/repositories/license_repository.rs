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

/// Loads the most recent date on which a valid license was observed,
/// anchored in the sidecar file.
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

/// Loads the rollback anchor across both locations and returns the later of
/// the two. The registry copy makes "delete the state file and rewind the
/// clock" much harder: a user must now also clear the registry value.
pub fn load_anchor(state_path: &Path) -> Option<String> {
    let file = load_state(state_path);
    let registry = registry_anchor::load();
    match (file, registry) {
        (Some(file), Some(registry)) => Some(if file >= registry { file } else { registry }),
        (Some(file), None) => Some(file),
        (None, Some(registry)) => Some(registry),
        (None, None) => None,
    }
}

/// Secondary, harder-to-reach storage for the clock-rollback anchor. Written
/// every time a valid license is observed, mirroring the sidecar file.
#[cfg(target_os = "windows")]
pub mod registry_anchor {
    use windows::core::PCWSTR;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegCreateKeyW, RegOpenKeyExW, RegSetValueExW, HKEY, KEY_READ, REG_SZ,
        HKEY_CURRENT_USER,
    };

    #[cfg(test)]
    use windows::Win32::System::Registry::{RegDeleteValueW, KEY_WRITE};

    use crate::licensing::services::hwid_service::query_string_value;

    pub const SUBKEY: &str = "SOFTWARE\\EagleNest Creations\\GYM POS";
    pub const VALUE: &str = "LicenseLastSeen";

    pub fn load() -> Option<String> {
        reg_read_string(SUBKEY, VALUE)
    }

    pub fn save(last_seen: &str) {
        reg_write_string(SUBKEY, VALUE, last_seen);
    }

    #[cfg(test)]
    pub fn delete() {
        reg_delete_value(SUBKEY, VALUE);
    }

    fn reg_write_string(subkey: &str, value_name: &str, value_text: &str) {
        let wide_subkey = wide(subkey);
        let wide_value = wide(value_name);
        let mut key: HKEY = HKEY::default();
        let status = unsafe {
            RegCreateKeyW(
                HKEY_CURRENT_USER,
                PCWSTR::from_raw(wide_subkey.as_ptr()),
                &mut key,
            )
        };
        if status.is_err() {
            log::warn!("Could not create registry key for license anchor");
            return;
        }
        let wide_text = wide(value_text);
        let data = unsafe {
            std::slice::from_raw_parts(wide_text.as_ptr() as *const u8, wide_text.len() * 2)
        };
        let status = unsafe {
            RegSetValueExW(key, PCWSTR::from_raw(wide_value.as_ptr()), None, REG_SZ, Some(data))
        };
        if status.is_err() {
            log::warn!("Could not write license anchor value to registry");
        }
        unsafe { let _ = RegCloseKey(key); }
    }

    fn reg_read_string(subkey: &str, value_name: &str) -> Option<String> {
        let wide_subkey = wide(subkey);
        let wide_value = wide(value_name);
        let mut key: HKEY = HKEY::default();
        let status = unsafe {
            RegOpenKeyExW(
                HKEY_CURRENT_USER,
                PCWSTR::from_raw(wide_subkey.as_ptr()),
                None,
                KEY_READ,
                &mut key,
            )
        };
        if status.is_err() {
            return None;
        }
        let result = query_string_value(key, PCWSTR::from_raw(wide_value.as_ptr()));
        unsafe { let _ = RegCloseKey(key); }
        result
    }

    #[cfg(test)]
    fn reg_delete_value(subkey: &str, value_name: &str) {
        let wide_subkey = wide(subkey);
        let wide_value = wide(value_name);
        let mut key: HKEY = HKEY::default();
        let status = unsafe {
            RegOpenKeyExW(
                HKEY_CURRENT_USER,
                PCWSTR::from_raw(wide_subkey.as_ptr()),
                None,
                KEY_WRITE,
                &mut key,
            )
        };
        if status.is_ok() {
            unsafe {
                let _ = RegDeleteValueW(key, PCWSTR::from_raw(wide_value.as_ptr()));
                let _ = RegCloseKey(key);
            }
        }
    }

    fn wide(text: &str) -> Vec<u16> {
        text.encode_utf16().chain(std::iter::once(0)).collect()
    }
}

/// Non-Windows builds have no registry; the file sidecar is the only anchor.
#[cfg(not(target_os = "windows"))]
pub mod registry_anchor {
    pub const SUBKEY: &str = "";
    pub const VALUE: &str = "";

    pub fn load() -> Option<String> {
        None
    }

    pub fn save(_last_seen: &str) {}

    #[cfg(test)]
    pub fn delete() {}
}

/// Serializes tests that touch the real registry key so concurrent test runs
/// cannot race each other writing and deleting the same value.
#[cfg(all(test, target_os = "windows"))]
pub(crate) static REGISTRY_ANCHOR_TEST_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_dir() -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("gympos-licrepo-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn load_anchor_falls_back_to_file() {
        let dir = temp_dir();
        let state = dir.join(LICENSE_STATE_FILE_NAME);
        save_state(&state, "2026-09-01");
        assert_eq!(load_anchor(&state).as_deref(), Some("2026-09-01"));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn load_anchor_falls_back_to_file() {
        let _guard = REGISTRY_ANCHOR_TEST_LOCK.lock().unwrap();
        let dir = temp_dir();
        let state = dir.join(LICENSE_STATE_FILE_NAME);
        registry_anchor::delete();
        save_state(&state, "2026-09-01");
        assert_eq!(load_anchor(&state).as_deref(), Some("2026-09-01"));
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn load_anchor_is_none_without_any_state() {
        let dir = temp_dir();
        let state = dir.join(LICENSE_STATE_FILE_NAME);
        assert_eq!(load_anchor(&state), None);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn load_anchor_is_none_without_any_state() {
        let _guard = REGISTRY_ANCHOR_TEST_LOCK.lock().unwrap();
        registry_anchor::delete();
        let dir = temp_dir();
        let state = dir.join(LICENSE_STATE_FILE_NAME);
        assert_eq!(load_anchor(&state), None);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn registry_anchor_roundtrip_and_max_merge() {
        let _guard = REGISTRY_ANCHOR_TEST_LOCK.lock().unwrap();
        let dir = temp_dir();
        let state = dir.join(LICENSE_STATE_FILE_NAME);

        registry_anchor::delete();
        save_state(&state, "2026-09-01");

        assert_eq!(
            load_anchor(&state).as_deref(),
            Some("2026-09-01"),
            "registry absent -> file used"
        );

        registry_anchor::save("2026-12-31");
        assert_eq!(
            load_anchor(&state).as_deref(),
            Some("2026-12-31"),
            "later registry anchor wins over earlier file"
        );

        save_state(&state, "2027-01-15");
        assert_eq!(
            load_anchor(&state).as_deref(),
            Some("2027-01-15"),
            "later file anchor wins over earlier registry"
        );

        registry_anchor::delete();
        assert_eq!(
            load_anchor(&state).as_deref(),
            Some("2027-01-15"),
            "registry removed -> file still used"
        );
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn registry_anchor_is_not_defaulted_when_writing_fails() {
        let _guard = REGISTRY_ANCHOR_TEST_LOCK.lock().unwrap();
        registry_anchor::delete();
        assert_eq!(registry_anchor::load(), None);
        registry_anchor::save("2026-10-10");
        assert_eq!(registry_anchor::load().as_deref(), Some("2026-10-10"));
        registry_anchor::delete();
        assert_eq!(registry_anchor::load(), None);
    }
}