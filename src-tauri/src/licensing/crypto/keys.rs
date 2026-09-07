//! Embedded vendor public key.
//!
//! Replace `PUBLIC_KEY_HEX` with the public key produced by:
//!
//!     license-generator gen-keys
//!
//! Do NOT commit a private key anywhere in this repository.

/// Lowercase hex of the Ed25519 public key the app uses to verify licenses.
/// The `dev` placeholder below is NOT usable for tamper-free verification;
/// regenerate a real keypair before shipping.
pub const PUBLIC_KEY_HEX: &str = "";

use ed25519_dalek::VerifyingKey;

use crate::errors::AppError;

pub fn verifying_key() -> Result<VerifyingKey, AppError> {
    if PUBLIC_KEY_HEX.len() == 64 {
        let bytes: [u8; 32] = decode_hex(PUBLIC_KEY_HEX)
            .ok_or_else(|| AppError::InternalError("Embedded public key is corrupt".into()))?;
        Ok(VerifyingKey::from_bytes(&bytes).map_err(|_| {
            AppError::InternalError("Embedded public key is not a valid Ed25519 point".into())
        })?)
    } else {
        Err(AppError::InternalError(
            "App has not been provisioned with a vendor public key".into(),
        ))
    }
}

fn decode_hex(hex: &str) -> Option<[u8; 32]> {
    if hex.len() != 64 {
        return None;
    }
    let mut out = [0u8; 32];
    for (i, byte) in out.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16).ok()?;
    }
    Some(out)
}