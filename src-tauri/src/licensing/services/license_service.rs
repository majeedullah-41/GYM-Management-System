//! High-level license state machine: persistence, verification, expiry and
//! clock-rollback protection. All methods are synchronous so callers can run
//! them on a blocking thread.

use std::path::Path;
use std::sync::Mutex;

use chrono::NaiveDate;
use ed25519_dalek::VerifyingKey;
use serde::Serialize;

use crate::licensing::crypto::license_verifier;
use crate::licensing::crypto::keys;
use crate::licensing::domain::hwid::HwId;
use crate::licensing::domain::license::LicensePayload;
use crate::licensing::domain::license_status::LicenseStatus;

use super::hwid_service::{HwIdProvider, RegistryHwIdProvider};
use crate::licensing::repositories::license_repository;

#[derive(Debug, Clone, Serialize)]
pub struct LicenseInfo {
    pub license_id: String,
    pub customer_name: String,
    pub gym_name: String,
    pub license_type: String,
    pub issued_at: String,
    pub expires_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LicenseStatusResponse {
    pub status: LicenseStatus,
    pub license: Option<LicenseInfo>,
    pub hardware_id: String,
}

struct Cached {
    status: LicenseStatus,
    license: Option<LicensePayload>,
    last_seen: Option<NaiveDate>,
}

pub struct LicenseService {
    license_path: std::path::PathBuf,
    state_path: std::path::PathBuf,
    hardware: Box<dyn HwIdProvider>,
    public_key: Option<VerifyingKey>,
    persist_registry_anchor: bool,
    cached: Mutex<Cached>,
}

impl LicenseService {
    pub fn new(app_dir: &Path) -> Self {
        let public_key = keys::verifying_key().ok();
        let last_seen = license_repository::load_anchor(
            &app_dir.join(license_repository::LICENSE_STATE_FILE_NAME),
        )
        .and_then(|value| NaiveDate::parse_from_str(&value, "%Y-%m-%d").ok());
        Self::from_parts(
            app_dir,
            Box::new(RegistryHwIdProvider),
            public_key,
            last_seen,
            true,
        )
    }

    /// Construction with injectable dependencies, used by tests. Only reads
    /// the sidecar file so tests stay hermetic (no real registry access).
    #[cfg(test)]
    pub fn with_deps(
        app_dir: &Path,
        hardware: Box<dyn HwIdProvider>,
        public_key: Option<VerifyingKey>,
    ) -> Self {
        let last_seen = license_repository::load_state(
            &app_dir.join(license_repository::LICENSE_STATE_FILE_NAME),
        )
        .and_then(|value| NaiveDate::parse_from_str(&value, "%Y-%m-%d").ok());
        Self::from_parts(app_dir, hardware, public_key, last_seen, false)
    }

    fn from_parts(
        app_dir: &Path,
        hardware: Box<dyn HwIdProvider>,
        public_key: Option<VerifyingKey>,
        last_seen: Option<NaiveDate>,
        persist_registry_anchor: bool,
    ) -> Self {
        let license_path = app_dir.join(license_repository::LICENSE_FILE_NAME);
        let state_path = app_dir.join(license_repository::LICENSE_STATE_FILE_NAME);

        Self {
            license_path,
            state_path,
            hardware,
            public_key,
            persist_registry_anchor,
            cached: Mutex::new(Cached {
                status: LicenseStatus::Missing,
                license: None,
                last_seen,
            }),
        }
    }

    pub fn hardware_id(&self) -> String {
        self.hardware.current().as_str().to_string()
    }

    /// Current status without re-reading the files.
    pub fn snapshot(&self) -> LicenseStatusResponse {
        let cached = self.cached.lock().expect("license cache lock");
        LicenseStatusResponse {
            status: cached.status,
            license: cached.license.as_ref().map(info_from_payload),
            hardware_id: self.hardware_id(),
        }
    }

    /// Re-reads the license file and re-evaluates validity, updating the
    /// in-memory cache and the global gate flag.
    pub fn validate(&self) -> LicenseStatus {
        let bytes = match license_repository::load(&self.license_path) {
            Ok(Some(bytes)) => bytes,
            Ok(None) => return self.apply(LicenseStatus::Missing, None),
            Err(error) => {
                log::error!("License read error: {error}");
                return self.apply(LicenseStatus::Corrupted, None);
            }
        };
        let (status, payload) = self.evaluate(&bytes);
        if status.is_valid() {
            self.save_last_seen(self.effective_now());
        }
        self.apply(status, payload)
    }

    /// Applies new license contents. A rejected file is never persisted, so a
    /// bad activation cannot destroy a previously working license.
    pub fn import(&self, contents: &str) -> LicenseStatus {
        let bytes = contents.trim().as_bytes();
        let (status, payload) = self.evaluate(bytes);
        if !status.is_valid() {
            return self.apply(status, payload);
        }
        if let Err(error) = license_repository::save(&self.license_path, bytes) {
            log::error!("License persist error: {error}");
            return self.validate();
        }
        self.validate()
    }

    /// Re-activation entry point used when the hardware changes. Same behavior
    /// as `import` (an invalid file is rejected without persisting).
    pub fn replace(&self, contents: &str) -> LicenseStatus {
        self.import(contents)
    }

    /// Core evaluation of raw license bytes against this machine and clock.
    fn evaluate(&self, bytes: &[u8]) -> (LicenseStatus, Option<LicensePayload>) {
        let Some(verifying_key) = &self.public_key else {
            log::error!("App is not provisioned with a vendor public key");
            return (LicenseStatus::InvalidSignature, None);
        };
        let payload = match license_verifier::verify(bytes, verifying_key) {
            Ok(payload) => payload,
            Err(status) => return (status, None),
        };

        let machine = HwId(self.hardware_id());
        let license_target = HwId(payload.hwid.trim().to_string());
        if !license_target.matches(&machine) {
            return (LicenseStatus::HardwareMismatch, Some(payload));
        }

        if let Some(expires) = &payload.expires_at {
            let expiry = match NaiveDate::parse_from_str(expires, "%Y-%m-%d") {
                Ok(date) => date,
                Err(_) => return (LicenseStatus::Corrupted, Some(payload)),
            };
            if expiry < self.effective_now() {
                return (LicenseStatus::Expired, Some(payload));
            }
        }

        (LicenseStatus::Valid, Some(payload))
    }

    fn effective_now(&self) -> NaiveDate {
        let today = chrono::Local::now().date_naive();
        let seen = self.cached.lock().expect("license cache lock").last_seen;
        match seen {
            Some(seen) if seen > today => seen,
            _ => today,
        }
    }

    fn save_last_seen(&self, date: NaiveDate) {
        self.cached.lock().expect("license cache lock").last_seen = Some(date);
        let value = date.format("%Y-%m-%d").to_string();
        license_repository::save_state(&self.state_path, &value);
        if self.persist_registry_anchor {
            license_repository::registry_anchor::save(&value);
        }
    }

    fn apply(&self, status: LicenseStatus, payload: Option<LicensePayload>) -> LicenseStatus {
        crate::licensing::set_license_valid(status.is_valid());
        let mut cached = self.cached.lock().expect("license cache lock");
        cached.status = status;
        cached.license = payload;
        status
    }
}

fn info_from_payload(payload: &LicensePayload) -> LicenseInfo {
    LicenseInfo {
        license_id: payload.license_id.clone(),
        customer_name: payload.customer_name.clone(),
        gym_name: payload.gym_name.clone(),
        license_type: payload.license_type.as_str().to_string(),
        issued_at: payload.issued_at.clone(),
        expires_at: payload.expires_at.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::licensing::crypto::license_verifier::build_envelope;
    use crate::licensing::domain::license::LicenseType;
    use crate::licensing::services::hwid_service::MockHwIdProvider;
    use ed25519_dalek::{SigningKey, VerifyingKey};

    const MACHINE: &str = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";

    struct TestHarness {
        service: LicenseService,
        signing_key: SigningKey,
        _dir: std::path::PathBuf,
    }

    fn harness() -> TestHarness {
        let signing_key = SigningKey::from_bytes(&[7u8; 32]);
        let verifying_key = VerifyingKey::from(&signing_key);
        let dir = std::env::temp_dir().join(format!("gympos-lic-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let service = LicenseService::with_deps(
            &dir,
            Box::new(MockHwIdProvider(MACHINE.to_string())),
            Some(verifying_key),
        );
        TestHarness {
            service,
            signing_key,
            _dir: dir,
        }
    }

    fn write_license(h: &TestHarness, env: &[u8]) {
        std::fs::write(h.service.license_path.clone(), env).unwrap();
    }

    fn permanent(key: &SigningKey, hwid: &str) -> Vec<u8> {
        build_envelope(
            &LicensePayload {
                version: 1,
                license_id: "LIC-TEST-1".to_string(),
                customer_name: "Ali Khan".to_string(),
                gym_name: "Test Gym".to_string(),
                hwid: hwid.to_string(),
                license_type: LicenseType::Permanent,
                issued_at: "2026-01-01".to_string(),
                expires_at: None,
            },
            key,
        )
    }

    fn expiring(key: &SigningKey, hwid: &str, expires: &str) -> Vec<u8> {
        build_envelope(
            &LicensePayload {
                version: 1,
                license_id: "LIC-TEST-2".to_string(),
                customer_name: "Ali Khan".to_string(),
                gym_name: "Test Gym".to_string(),
                hwid: hwid.to_string(),
                license_type: LicenseType::Expiring,
                issued_at: "2026-01-01".to_string(),
                expires_at: Some(expires.to_string()),
            },
            key,
        )
    }

    #[test]
    fn missing_file_reports_missing_and_keeps_gate_closed() {
        let h = harness();
        assert_eq!(h.service.validate(), LicenseStatus::Missing);
        assert!(!crate::licensing::require_valid_license().is_ok());
        assert_eq!(h.service.snapshot().status, LicenseStatus::Missing);
    }

    #[test]
    fn valid_permanent_license_opens_gate() {
        let h = harness();
        let env = permanent(&h.signing_key, MACHINE);
        write_license(&h, &env);
        assert_eq!(h.service.validate(), LicenseStatus::Valid);
        assert!(crate::licensing::require_valid_license().is_ok());
        let snap = h.service.snapshot();
        assert_eq!(snap.license.unwrap().license_id, "LIC-TEST-1");
    }

    #[test]
    fn hardware_mismatch_is_rejected() {
        let h = harness();
        let env = permanent(&h.signing_key, "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
        write_license(&h, &env);
        assert_eq!(h.service.validate(), LicenseStatus::HardwareMismatch);
        assert!(!crate::licensing::require_valid_license().is_ok());
    }

    #[test]
    fn expired_license_is_rejected() {
        let h = harness();
        let env = expiring(&h.signing_key, MACHINE, "2000-01-01");
        write_license(&h, &env);
        assert_eq!(h.service.validate(), LicenseStatus::Expired);
    }

    #[test]
    fn future_expiry_is_valid() {
        let h = harness();
        let env = expiring(&h.signing_key, MACHINE, "2099-01-01");
        write_license(&h, &env);
        assert_eq!(h.service.validate(), LicenseStatus::Valid);
    }

    #[test]
    fn wrong_signature_is_rejected_before_hwid_check() {
        let h = harness();
        let other_key = SigningKey::from_bytes(&[9u8; 32]);
        let env = permanent(&other_key, MACHINE);
        write_license(&h, &env);
        assert_eq!(h.service.validate(), LicenseStatus::InvalidSignature);
    }

    #[test]
    fn import_persists_only_valid_license() {
        let h = harness();
        let bad = permanent(&h.signing_key, "wronghwidwronghwidwronghwidwronghwidwronghwidwronghwid");
        assert_eq!(
            h.service.import(std::str::from_utf8(&bad).unwrap()),
            LicenseStatus::HardwareMismatch
        );
        assert_eq!(h.service.validate(), LicenseStatus::Missing);

        let good = permanent(&h.signing_key, MACHINE);
        assert_eq!(
            h.service.import(std::str::from_utf8(&good).unwrap()),
            LicenseStatus::Valid
        );
        assert!(h.service.license_path.exists());
        assert_eq!(h.service.validate(), LicenseStatus::Valid);
    }

    #[test]
    fn import_rejects_garbage_string() {
        let h = harness();
        assert_eq!(
            h.service.import("this is not a license"),
            LicenseStatus::Corrupted
        );
        assert_eq!(h.service.validate(), LicenseStatus::Missing);
    }

    #[test]
    fn clock_rollback_cannot_extend_expired_license() {
        let dir = std::env::temp_dir().join(format!("gympos-lic-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let signing_key = SigningKey::from_bytes(&[7u8; 32]);
        let verifying_key = VerifyingKey::from(&signing_key);

        let service = LicenseService::with_deps(
            &dir,
            Box::new(MockHwIdProvider(MACHINE.to_string())),
            Some(verifying_key),
        );
        // A license that was valid when last_seen was recorded later than now.
        let env = expiring(&signing_key, MACHINE, "2026-09-05");
        write_to(&service.license_path, &env);
        crate::licensing::repositories::license_repository::save_state(
            &service.state_path,
            "2026-12-31",
        );

        // A fresh service re-reads the sidecar and must treat the license as
        // expired even though the system clock (2026-09-07) is before expiry.
        let reloaded = LicenseService::with_deps(
            &dir,
            Box::new(MockHwIdProvider(MACHINE.to_string())),
            Some(verifying_key),
        );
        assert_eq!(reloaded.validate(), LicenseStatus::Expired);

        let _ = std::fs::remove_dir_all(&dir);
    }

    fn write_to(path: &std::path::Path, bytes: &[u8]) {
        std::fs::write(path, bytes).unwrap();
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn valid_license_anchors_last_seen_in_registry_when_enabled() {
        use crate::licensing::repositories::license_repository::{
            registry_anchor, REGISTRY_ANCHOR_TEST_LOCK,
        };

        let _guard = REGISTRY_ANCHOR_TEST_LOCK.lock().unwrap();
        registry_anchor::delete();

        let dir = std::env::temp_dir().join(format!("gympos-lic-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let signing_key = SigningKey::from_bytes(&[7u8; 32]);
        let verifying_key = VerifyingKey::from(&signing_key);

        let service = LicenseService::from_parts(
            &dir,
            Box::new(MockHwIdProvider(MACHINE.to_string())),
            Some(verifying_key),
            None,
            true,
        );
        let env = expiring(&signing_key, MACHINE, "2099-01-01");
        write_to(&service.license_path, &env);

        assert_eq!(service.validate(), LicenseStatus::Valid);

        let today = chrono::Local::now().date_naive().format("%Y-%m-%d").to_string();
        assert_eq!(
            registry_anchor::load().as_deref(),
            Some(today.as_str()),
            "a valid license must write its last-seen date to the registry"
        );

        registry_anchor::delete();
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn hardware_id_is_exposed_for_vendor() {
        let h = harness();
        assert_eq!(h.service.hardware_id(), MACHINE);
    }

    // Silence an unused-code warning if a field read is optimized out.
    #[allow(dead_code)]
    fn verifying_key_field(h: &TestHarness) -> Option<VerifyingKey> {
        h.service.public_key.clone()
    }
}