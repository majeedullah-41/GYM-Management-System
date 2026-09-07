//! Domain types for a Gym POS license.
//!
//! The canonical serialization in this module MUST remain byte-identical to
//! the vendor `license-generator` crate (`license-generator/src/lib.rs`). Any
//! divergence is caught by the golden test vector in `crypto/license_verifier.rs`.

use crate::errors::AppError;

pub const LICENSE_FILE_FORMAT: &str = "GYMLIC";
pub const LICENSE_FILE_VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LicenseType {
    Permanent,
    Expiring,
}

impl LicenseType {
    pub fn as_str(&self) -> &'static str {
        match self {
            LicenseType::Permanent => "permanent",
            LicenseType::Expiring => "expiring",
        }
    }

    pub fn parse(s: &str) -> Option<LicenseType> {
        match s {
            "permanent" => Some(LicenseType::Permanent),
            "expiring" => Some(LicenseType::Expiring),
            _ => None,
        }
    }
}

/// Verified payload of a license.
#[derive(Debug, Clone, PartialEq)]
pub struct LicensePayload {
    pub version: u32,
    pub license_id: String,
    pub customer_name: String,
    pub gym_name: String,
    pub hwid: String,
    pub license_type: LicenseType,
    pub issued_at: String,
    pub expires_at: Option<String>,
}

/// Canonical serialization of a payload. This MUST match the generator
/// implementation exactly: 8 fields joined by `\x1e`. For permanent licenses
/// `expires_at` contributes zero bytes, so the serialization always has a
/// trailing field separator.
pub fn canonical_payload(payload: &LicensePayload) -> Vec<u8> {
    let mut out = String::new();
    out.push_str(&payload.version.to_string());
    out.push('\x1e');
    out.push_str(&payload.license_id);
    out.push('\x1e');
    out.push_str(&payload.customer_name);
    out.push('\x1e');
    out.push_str(&payload.gym_name);
    out.push('\x1e');
    out.push_str(&payload.hwid);
    out.push('\x1e');
    out.push_str(payload.license_type.as_str());
    out.push('\x1e');
    out.push_str(&payload.issued_at);
    out.push('\x1e');
    if let Some(expires) = &payload.expires_at {
        out.push_str(expires);
    }
    out.into_bytes()
}

/// Validates that a payload carries a well-formed, supported version.
pub fn validate_payload_version(payload: &LicensePayload) -> Result<(), AppError> {
    if payload.version != LICENSE_FILE_VERSION {
        return Err(AppError::ValidationError(
            "License format version is not supported".into(),
        ));
    }
    Ok(())
}