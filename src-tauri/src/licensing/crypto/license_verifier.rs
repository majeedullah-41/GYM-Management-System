//! Ed25519 verification of Gym POS license envelopes.

use ed25519_dalek::{Signature, SigningKey, Verifier, VerifyingKey};
use serde_json::Value;

use super::super::domain::license::{
    canonical_payload, validate_payload_version, LicensePayload, LicenseType,
    LICENSE_FILE_FORMAT, LICENSE_FILE_VERSION,
};
use super::super::domain::license_status::LicenseStatus;

/// Verifies a license envelope byte-for-byte. Returns the payload on success,
/// or a `LicenseStatus` describing why the file is not a valid license.
pub fn verify(data: &[u8], public_key: &VerifyingKey) -> Result<LicensePayload, LicenseStatus> {
    let root: Value = serde_json::from_slice(data).map_err(|_| LicenseStatus::Corrupted)?;
    let envelope = root.as_object().ok_or(LicenseStatus::Corrupted)?;

    let format = envelope
        .get("format")
        .and_then(Value::as_str)
        .ok_or(LicenseStatus::Corrupted)?;
    if format != LICENSE_FILE_FORMAT {
        return Err(LicenseStatus::Corrupted);
    }

    let version = envelope
        .get("version")
        .and_then(Value::as_u64)
        .ok_or(LicenseStatus::Corrupted)?;
    if version != u64::from(LICENSE_FILE_VERSION) {
        return Err(LicenseStatus::UnsupportedVersion);
    }

    let payload_json = envelope
        .get("payload_json")
        .and_then(Value::as_str)
        .ok_or(LicenseStatus::Corrupted)?;
    let signature_hex = envelope
        .get("signature_hex")
        .and_then(Value::as_str)
        .ok_or(LicenseStatus::Corrupted)?;

    let payload = parse_payload(payload_json)?;
    validate_payload_version(&payload).map_err(|_| LicenseStatus::UnsupportedVersion)?;

    let signature_bytes = decode_hex_64(signature_hex).ok_or(LicenseStatus::Corrupted)?;
    let signature = Signature::from_bytes(&signature_bytes);

    let canonical = canonical_payload(&payload);
    public_key
        .verify(&canonical, &signature)
        .map_err(|_| LicenseStatus::InvalidSignature)?;

    Ok(payload)
}

/// Builds a signed envelope for a payload with the given key. Used by the
/// vendor generator and by tests; the app itself never signs.
pub fn build_envelope(payload: &LicensePayload, signing_key: &SigningKey) -> Vec<u8> {
    use ed25519_dalek::Signer;
    let signature = signing_key.sign(&canonical_payload(payload));
    let envelope = serde_json::json!({
        "format": LICENSE_FILE_FORMAT,
        "version": LICENSE_FILE_VERSION,
        "key_id": "dev",
        "payload_json": serde_json::to_string(&serde_json::json!({
            "version": payload.version,
            "license_id": payload.license_id,
            "customer_name": payload.customer_name,
            "gym_name": payload.gym_name,
            "hwid": payload.hwid,
            "license_type": payload.license_type.as_str(),
            "issued_at": payload.issued_at,
            "expires_at": payload.expires_at,
        })).expect("serialize payload"),
        "signature_hex": hex_bytes(&signature.to_bytes()),
    });
    serde_json::to_vec(&envelope).expect("serialize envelope")
}

fn parse_payload(json: &str) -> Result<LicensePayload, LicenseStatus> {
    let value: Value = serde_json::from_str(json).map_err(|_| LicenseStatus::Corrupted)?;
    let obj = value.as_object().ok_or(LicenseStatus::Corrupted)?;

    let get_str = |key: &str| {
        obj.get(key)
            .and_then(Value::as_str)
            .map(str::to_string)
    };

    let version = obj
        .get("version")
        .and_then(Value::as_u64)
        .ok_or(LicenseStatus::Corrupted)?;

    let license_id = get_str("license_id").ok_or(LicenseStatus::Corrupted)?;
    let customer_name = get_str("customer_name").ok_or(LicenseStatus::Corrupted)?;
    let gym_name = get_str("gym_name").ok_or(LicenseStatus::Corrupted)?;
    let hwid = get_str("hwid").ok_or(LicenseStatus::Corrupted)?;

    let license_type = obj
        .get("license_type")
        .and_then(Value::as_str)
        .and_then(LicenseType::parse)
        .ok_or(LicenseStatus::Corrupted)?;

    let issued_at = get_str("issued_at").ok_or(LicenseStatus::Corrupted)?;

    let expires_at = match obj.get("expires_at") {
        None | Some(Value::Null) => None,
        Some(Value::String(s)) => Some(s.clone()),
        Some(_) => None,
    };

    Ok(LicensePayload {
        version: version as u32,
        license_id,
        customer_name,
        gym_name,
        hwid,
        license_type,
        issued_at,
        expires_at,
    })
}

fn decode_hex_64(hex: &str) -> Option<[u8; 64]> {
    if hex.len() != 128 {
        return None;
    }
    let mut out = [0u8; 64];
    for (i, byte) in out.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16).ok()?;
    }
    Some(out)
}

pub fn hex_bytes(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::licensing::domain::license::LicensePayload;
    use ed25519_dalek::SigningKey;

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

    pub fn envelope_for(payload: &LicensePayload, key: &SigningKey) -> Vec<u8> {
        build_envelope(payload, key)
    }

    pub fn hex(bytes: &[u8]) -> String {
        hex_bytes(bytes)
    }

    fn keypair(seed: u8) -> (SigningKey, VerifyingKey) {
        let sk = SigningKey::from_bytes(&[seed; 32]);
        let vk = VerifyingKey::from(&sk);
        (sk, vk)
    }

    #[test]
    fn verifies_genuine_license() {
        let (sk, vk) = keypair(7);
        let env = envelope_for(&sample_payload(), &sk);
        let payload = verify(&env, &vk).unwrap();
        assert_eq!(payload.license_id, "LIC-2026-000124");
        assert_eq!(payload.customer_name, "Ali Khan");
        assert_eq!(payload.license_type, LicenseType::Permanent);
        assert_eq!(payload.expires_at, None);
    }

    #[test]
    fn golden_vector_matches_vendor_generator() {
        // Signature produced by license-generator/src/lib.rs for this seed and
        // payload. Guards the canonical serialization parity cross-crate.
        let sk = SigningKey::from_bytes(&[9u8; 32]);
        let vk = VerifyingKey::from(&sk);
        let env = envelope_for(&sample_payload(), &sk);
        let payload = verify(&env, &vk).unwrap();
        assert_eq!(payload.gym_name, "Swat Fitness Center");

        // And the exact golden signature generated by the vendor crate.
        use ed25519_dalek::Signer;
        let signature = sk.sign(&canonical_payload(&sample_payload()));
        assert_eq!(
            hex(&signature.to_bytes()),
            "278830a414cd227a607ef54a20e441be499707203891efdaf1d51c4a696e62784a457d066465577caed419e6678bf8348f879cc140b5e32ec3a914391f68b20a"
        );
    }

    #[test]
    fn rejects_tampered_payload_field() {
        let (sk, vk) = keypair(7);
        let env = envelope_for(&sample_payload(), &sk);
        let mut value: Value = serde_json::from_slice(&env).unwrap();
        value["payload_json"] =
            serde_json::Value::String(r#"{"version":1,"license_id":"LIC-2026-000124","customer_name":"Malory","gym_name":"Swat Fitness Center","hwid":"00000000000000000000000000000007","license_type":"permanent","issued_at":"2026-09-05","expires_at":null}"#.to_string());
        let tampered = serde_json::to_vec(&value).unwrap();
        assert_eq!(
            verify(&tampered, &vk),
            Err(LicenseStatus::InvalidSignature)
        );
    }

    #[test]
    fn rejects_unknown_license_type() {
        let (sk, vk) = keypair(7);
        let env = envelope_for(&sample_payload(), &sk);
        let mut value: Value = serde_json::from_slice(&env).unwrap();
        value["payload_json"] =
            serde_json::Value::String(r#"{"version":1,"license_id":"LIC-2026-000124","customer_name":"Ali Khan","gym_name":"Swat Fitness Center","hwid":"00000000000000000000000000000007","license_type":"ultimate","issued_at":"2026-09-05","expires_at":null}"#.to_string());
        let bad = serde_json::to_vec(&value).unwrap();
        assert_eq!(verify(&bad, &vk), Err(LicenseStatus::Corrupted));
    }

    #[test]
    fn rejects_wrong_public_key() {
        let (sk, _) = keypair(7);
        let (_, other_vk) = keypair(8);
        let env = envelope_for(&sample_payload(), &sk);
        assert_eq!(
            verify(&env, &other_vk),
            Err(LicenseStatus::InvalidSignature)
        );
    }

    #[test]
    fn rejects_garbage_as_corrupted() {
        let (_, vk) = keypair(7);
        assert_eq!(verify(b"not a license", &vk), Err(LicenseStatus::Corrupted));
        assert_eq!(verify(&[], &vk), Err(LicenseStatus::Corrupted));
    }

    #[test]
    fn rejects_wrong_format() {
        let (sk, vk) = keypair(7);
        let env = envelope_for(&sample_payload(), &sk);
        let mut value: Value = serde_json::from_slice(&env).unwrap();
        value["format"] = Value::String("XX".into());
        let bad = serde_json::to_vec(&value).unwrap();
        assert_eq!(verify(&bad, &vk), Err(LicenseStatus::Corrupted));
    }

    #[test]
    fn rejects_unsupported_envelope_version() {
        let (sk, vk) = keypair(7);
        let env = envelope_for(&sample_payload(), &sk);
        let mut value: Value = serde_json::from_slice(&env).unwrap();
        value["version"] = Value::from(2u32);
        let bad = serde_json::to_vec(&value).unwrap();
        assert_eq!(verify(&bad, &vk), Err(LicenseStatus::UnsupportedVersion));
    }

    #[test]
    fn rejects_unsupported_payload_version() {
        let (sk, vk) = keypair(7);
        let env = envelope_for(&sample_payload(), &sk);
        let mut value: Value = serde_json::from_slice(&env).unwrap();
        value["payload_json"] =
            serde_json::Value::String(r#"{"version":2,"license_id":"LIC-2026-000124","customer_name":"Ali Khan","gym_name":"Swat Fitness Center","hwid":"00000000000000000000000000000007","license_type":"permanent","issued_at":"2026-09-05","expires_at":null}"#.to_string());
        let bad = serde_json::to_vec(&value).unwrap();
        assert_eq!(verify(&bad, &vk), Err(LicenseStatus::UnsupportedVersion));
    }

    #[test]
    fn rejects_bad_hex_signature() {
        let (sk, vk) = keypair(7);
        let env = envelope_for(&sample_payload(), &sk);
        let mut value: Value = serde_json::from_slice(&env).unwrap();
        value["signature_hex"] = Value::String("zz".repeat(64));
        let bad = serde_json::to_vec(&value).unwrap();
        assert_eq!(verify(&bad, &vk), Err(LicenseStatus::Corrupted));
    }
}