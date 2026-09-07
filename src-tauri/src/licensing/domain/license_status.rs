//! Possible activation states of the desktop app.

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum LicenseStatus {
    /// A valid license is installed and matches this machine.
    Valid,
    /// No license file is installed yet.
    Missing,
    /// The file is present but is not a valid Gym POS license file.
    Corrupted,
    /// The file parses but the signature (or the embedded public key) fails.
    InvalidSignature,
    /// The signed license targets a different machine.
    HardwareMismatch,
    /// The license has expired.
    Expired,
    /// The license file uses an unsupported envelope version.
    UnsupportedVersion,
}

impl LicenseStatus {
    pub fn is_valid(&self) -> bool {
        matches!(self, LicenseStatus::Valid)
    }
}