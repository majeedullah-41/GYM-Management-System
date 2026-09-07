//! Canonical license payload format shared between the vendor License
//! Generator and the customer Gym POS application.
//!
//! THE CANONICAL SERIALIZATION HERE IS THE SOURCE OF TRUTH. The customer app's
//! `licensing/domain/license.rs` reproduces this exact serialization so that a
//! signature created here verifies there. Any change to the field list, order,
//! or separator MUST be mirrored on both sides and is covered by the golden
//! test vectors in each crate.
//!
//! A future Vercel/WASM keygen port MUST reproduce this function bit-for-bit.

/// License types supported by the system.
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

/// The signed license payload. `expires_at` is `None` for permanent licenses.
#[derive(Debug, Clone)]
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

/// Canonical serialization of the payload. Field order is fixed and
/// unambiguous because no field contains the `\x1e` separator character.
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
    match &payload.expires_at {
        Some(exp) => out.push_str(exp),
        None => {}
    }
    out.into_bytes()
}

/// Produces the SHA-256 hex digest of the canonical payload bytes. Kept as a
/// stand-alone helper so it can be mirrored on the app side.
pub fn payload_digest(payload: &LicensePayload) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(canonical_payload(payload));
    hex_encode(&hasher.finalize())
}

pub fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// Ed25519 signs the canonical payload bytes and returns the signature as
/// lowercase hex.
pub fn sign(payload: &LicensePayload, signing_key: &ed25519_dalek::SigningKey) -> String {
    use ed25519_dalek::Signer;
    let sig = signing_key.sign(&canonical_payload(payload));
    hex_encode(&sig.to_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;

    pub fn sample_payload() -> LicensePayload {
        LicensePayload {
            version: 1,
            license_id: "LIC-2026-000124".to_string(),
            customer_name: "Ali Khan".to_string(),
            gym_name: "Swat Fitness Center".to_string(),
            hwid: format!("{:032x}", 7u8),
            license_type: LicenseType::Permanent,
            issued_at: "2026-09-05".to_string(),
            expires_at: None,
        }
    }

    #[test]
    fn canonical_serialization_is_fixed_and_deterministic() {
        let p = sample_payload();
        let a = canonical_payload(&p);
        let b = canonical_payload(&p);
        assert_eq!(a, b);
        // Permanent license has an empty (but present) trailing expires_at
        // field. The serialization always has exactly 8 fields.
        let text = String::from_utf8(a).unwrap();
        assert_eq!(
            text,
            "1\x1eLIC-2026-000124\x1eAli Khan\x1eSwat Fitness Center\x1e00000000000000000000000000000007\x1epermanent\x1e2026-09-05\x1e"
        );
    }

    #[test]
    fn golden_signature_is_stable() {
        // Golden vector guards against accidental format drift between the
        // generator and the app verifier. The expected value was produced by
        // this exact seed/payload and must remain byte-identical.
        use ed25519_dalek::SigningKey;
        let seed_bytes = [9u8; 32];
        let signing_key = SigningKey::from_bytes(&seed_bytes);
        let p = sample_payload();
        let sig = sign(&p, &signing_key);
        assert_eq!(sig.len(), 128);
        let expected = "278830a414cd227a607ef54a20e441be499707203891efdaf1d51c4a696e62784a457d066465577caed419e6678bf8348f879cc140b5e32ec3a914391f68b20a";
        assert_eq!(sig, expected);
    }

    #[test]
    fn sign_and_verify_round_trip() {
        use ed25519_dalek::{Signature, SigningKey, Verifier, VerifyingKey};
        let seed_bytes = [42u8; 32];
        let signing_key = SigningKey::from_bytes(&seed_bytes);
        let verifying_key = VerifyingKey::from(&signing_key);
        let p = sample_payload();
        let sig = sign(&p, &signing_key);
        let sig_bytes: [u8; 64] = hex_decode_64(&sig);
        let signature = Signature::from_bytes(&sig_bytes);
        assert!(verifying_key.verify(&canonical_payload(&p), &signature).is_ok());
    }

    fn hex_decode_64(hex: &str) -> [u8; 64] {
        let mut out = [0u8; 64];
        for (i, b) in out.iter_mut().enumerate() {
            *b = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16).unwrap();
        }
        out
    }
}
