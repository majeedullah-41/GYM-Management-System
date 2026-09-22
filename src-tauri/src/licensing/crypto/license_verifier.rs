use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
#[cfg(test)]
use ed25519_dalek::SigningKey;
use serde_json::Value;

use super::super::domain::license::{
    canonical_payload, validate_payload_version, LicensePayload, LicenseType,
    LICENSE_FILE_FORMAT,
};
#[allow(unused_imports)]
use super::super::domain::license::LICENSE_FILE_VERSION;
use super::super::domain::license_status::LicenseStatus;

pub const V2_ENCRYPTION_SECRET: &[u8] = b"gympos_license_v2_payload_encryption_key_2026";

pub fn v2_encryption_key() -> [u8; 32] {
    use sha2::{Digest, Sha256};
    Sha256::digest(V2_ENCRYPTION_SECRET).into()
}

pub fn decrypt_v2_payload(ciphertext_and_tag: &[u8], iv: &[u8]) -> Result<String, LicenseStatus> {
    let key = v2_encryption_key();
    let cipher = Aes256Gcm::new(&key.into());
    let nonce = Nonce::try_from(iv).map_err(|_| LicenseStatus::Corrupted)?;
    let plaintext_bytes = cipher
        .decrypt(&nonce, ciphertext_and_tag)
        .map_err(|_| LicenseStatus::Corrupted)?;
    String::from_utf8(plaintext_bytes).map_err(|_| LicenseStatus::Corrupted)
}

/// Verifies a license envelope byte-for-byte. Returns the payload on success,
/// or a `LicenseStatus` describing why the file is not a valid license.
pub fn verify(data: &[u8], public_key: &VerifyingKey) -> Result<LicensePayload, LicenseStatus> {
    let trimmed = std::str::from_utf8(data).map(|s| s.trim()).unwrap_or("");
    let json_bytes: std::borrow::Cow<[u8]> = if trimmed.starts_with("GYMLIC2.") {
        use base64::Engine;
        let b64 = &trimmed["GYMLIC2.".len()..];
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(b64.trim())
            .map_err(|_| LicenseStatus::Corrupted)?;
        std::borrow::Cow::Owned(decoded)
    } else {
        std::borrow::Cow::Borrowed(data)
    };

    let root: Value = serde_json::from_slice(&json_bytes).map_err(|_| LicenseStatus::Corrupted)?;
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

    let (payload_json, signature_hex) = match version {
        1 => {
            let payload_json = envelope
                .get("payload_json")
                .and_then(Value::as_str)
                .ok_or(LicenseStatus::Corrupted)?;
            let signature_hex = envelope
                .get("signature_hex")
                .and_then(Value::as_str)
                .ok_or(LicenseStatus::Corrupted)?;
            (payload_json.to_string(), signature_hex)
        }
        2 => {
            let iv_hex = envelope
                .get("iv")
                .and_then(Value::as_str)
                .ok_or(LicenseStatus::Corrupted)?;
            let ct_hex = envelope
                .get("ciphertext")
                .and_then(Value::as_str)
                .ok_or(LicenseStatus::Corrupted)?;
            let signature_hex = envelope
                .get("signature_hex")
                .and_then(Value::as_str)
                .ok_or(LicenseStatus::Corrupted)?;

            let iv = decode_hex_bytes(iv_hex).ok_or(LicenseStatus::Corrupted)?;
            let ct = decode_hex_bytes(ct_hex).ok_or(LicenseStatus::Corrupted)?;
            let decrypted = decrypt_v2_payload(&ct, &iv)?;
            (decrypted, signature_hex)
        }
        _ => return Err(LicenseStatus::UnsupportedVersion),
    };

    let payload = parse_payload(&payload_json)?;
    validate_payload_version(&payload).map_err(|_| LicenseStatus::UnsupportedVersion)?;

    let signature_bytes = decode_hex_64(signature_hex).ok_or(LicenseStatus::Corrupted)?;
    let signature = Signature::from_bytes(&signature_bytes);

    let canonical = canonical_payload(&payload);
    public_key
        .verify(&canonical, &signature)
        .map_err(|_| LicenseStatus::InvalidSignature)?;

    Ok(payload)
}


/// Builds a signed envelope for a payload with the given key. Test/vendor
/// utility only; the shipped app never signs.
#[cfg(test)]
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

fn decode_hex_bytes(hex: &str) -> Option<Vec<u8>> {
    if hex.len() % 2 != 0 || !hex.is_ascii() {
        return None;
    }
    let mut out = Vec::with_capacity(hex.len() / 2);
    for i in 0..(hex.len() / 2) {
        let byte = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16).ok()?;
        out.push(byte);
    }
    Some(out)
}

fn decode_hex_64(hex: &str) -> Option<[u8; 64]> {
    if hex.len() != 128 || !hex.is_ascii() {
        return None;
    }
    let mut out = [0u8; 64];
    for (i, byte) in out.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16).ok()?;
    }
    Some(out)
}

#[cfg(test)]
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

    pub fn envelope_v2_for(
        payload: &LicensePayload,
        key: &SigningKey,
        custom_iv: Option<[u8; 12]>,
    ) -> Vec<u8> {
        build_envelope_v2(payload, key, custom_iv)
    }

    pub fn hex(bytes: &[u8]) -> String {
        hex_bytes(bytes)
    }

    fn keypair(seed: u8) -> (SigningKey, VerifyingKey) {
        let sk = SigningKey::from_bytes(&[seed; 32]);
        let vk = VerifyingKey::from(&sk);
        (sk, vk)
    }

    pub fn build_envelope_v2(
        payload: &LicensePayload,
        signing_key: &SigningKey,
        custom_iv: Option<[u8; 12]>,
    ) -> Vec<u8> {
        use aes_gcm::{
            aead::{Aead, KeyInit},
            Aes256Gcm, Nonce,
        };
        use ed25519_dalek::Signer;
        let signature = signing_key.sign(&canonical_payload(payload));
        let iv = custom_iv.unwrap_or([1u8; 12]);
        let key = v2_encryption_key();
        let cipher = Aes256Gcm::new(&key.into());
        let nonce = Nonce::try_from(iv.as_slice()).expect("valid iv length");
        let payload_json = serde_json::to_string(&serde_json::json!({
            "version": payload.version,
            "license_id": payload.license_id,
            "customer_name": payload.customer_name,
            "gym_name": payload.gym_name,
            "hwid": payload.hwid,
            "license_type": payload.license_type.as_str(),
            "issued_at": payload.issued_at,
            "expires_at": payload.expires_at,
        }))
        .expect("serialize payload");
        let ct = cipher
            .encrypt(&nonce, payload_json.as_bytes())
            .unwrap();
        let envelope = serde_json::json!({
            "format": LICENSE_FILE_FORMAT,
            "version": 2,
            "key_id": "dev",
            "iv": hex_bytes(&iv),
            "ciphertext": hex_bytes(&ct),
            "signature_hex": hex_bytes(&signature.to_bytes()),
        });
        use base64::Engine;
        let b64 = base64::engine::general_purpose::STANDARD
            .encode(serde_json::to_vec(&envelope).unwrap());
        format!("GYMLIC2.{b64}").into_bytes()
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
    fn verifies_genuine_v2_license_token() {
        let (sk, vk) = keypair(7);
        let env_v2 = envelope_v2_for(&sample_payload(), &sk, None);
        assert!(env_v2.starts_with(b"GYMLIC2."));
        let payload = verify(&env_v2, &vk).unwrap();
        assert_eq!(payload.license_id, "LIC-2026-000124");
        assert_eq!(payload.customer_name, "Ali Khan");
        assert_eq!(payload.gym_name, "Swat Fitness Center");
        assert_eq!(payload.license_type, LicenseType::Permanent);
        assert_eq!(payload.expires_at, None);
    }

    #[test]
    fn rejects_tampered_v2_ciphertext() {
        let (sk, vk) = keypair(7);
        let env_v2 = envelope_v2_for(&sample_payload(), &sk, None);
        let str_v2 = std::str::from_utf8(&env_v2).unwrap();
        use base64::Engine;
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(&str_v2["GYMLIC2.".len()..])
            .unwrap();
        let mut value: Value = serde_json::from_slice(&decoded).unwrap();
        let ct = value["ciphertext"].as_str().unwrap().to_string();
        // Flip one character in ciphertext
        let mut corrupted_ct = ct.into_bytes();
        corrupted_ct[0] = if corrupted_ct[0] == b'a' { b'b' } else { b'a' };
        value["ciphertext"] = Value::String(String::from_utf8(corrupted_ct).unwrap());
        let reencoded = base64::engine::general_purpose::STANDARD
            .encode(serde_json::to_vec(&value).unwrap());
        let bad_token = format!("GYMLIC2.{reencoded}").into_bytes();
        assert_eq!(verify(&bad_token, &vk), Err(LicenseStatus::Corrupted));
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
        value["version"] = Value::from(99u32);
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

    #[test]
    fn rejects_non_ascii_hex_as_corrupted() {
        let (sk, vk) = keypair(7);
        let env = envelope_for(&sample_payload(), &sk);
        let mut value: Value = serde_json::from_slice(&env).unwrap();
        value["signature_hex"] = Value::String("é".repeat(64));
        let bad = serde_json::to_vec(&value).unwrap();
        assert_eq!(verify(&bad, &vk), Err(LicenseStatus::Corrupted));
    }

    #[test]
    fn dev_key_verifies_web_issued_license() {
        // End-to-end provisioning check: a license issued by the Vercel
        // license server must validate against the PUBLIC_KEY_HEX embedded in
        // keys.rs. Reads the file saved from a real server response.
        let path = "C:\\Users\\SALMAN~1\\AppData\\Local\\Temp\\opencode\\dev-test.gymlic";
        if !std::path::Path::new(path).exists() {
            eprintln!("skipping: web-issued license file not present");
            return;
        }
        let data = std::fs::read(path).expect("read issued license");
        let vk = crate::licensing::crypto::keys::verifying_key().expect("embedded dev key");
        let payload = verify(&data, &vk).expect("embedded dev key must verify web-issued license");
        assert_eq!(payload.license_id, "LIC-2026-FA6805");
        assert_eq!(payload.gym_name, "Bloating Fitness");
        assert_eq!(payload.hwid, "6045253d4f6eb77ebb55a2c92861caeac396a86284adef022f7d92cd6c10d40c");
        assert_eq!(payload.license_type, LicenseType::Expiring);
        assert_eq!(payload.expires_at, Some("2026-10-08".to_string()));
    }

    #[test]
    fn rejects_tampered_expiry_date() {
        // A user must NOT be able to extend a license by editing the
        // `payload_json` expiry in the .gymlic file.
        let (sk, vk) = keypair(7);
        let env = envelope_for(&sample_payload(), &sk);
        let mut value: Value = serde_json::from_slice(&env).unwrap();
        // Original is permanent: "expires_at":null -> attempt to set it to a
        // far-future date by hand.
        value["payload_json"] = Value::String(
            r#"{"version":1,"license_id":"LIC-2026-000124","customer_name":"Ali Khan","gym_name":"Swat Fitness Center","hwid":"00000000000000000000000000000007","license_type":"permanent","issued_at":"2026-09-05","expires_at":"2099-12-31"}"#
                .to_string(),
        );
        let tampered = serde_json::to_vec(&value).unwrap();
        assert_eq!(
            verify(&tampered, &vk),
            Err(LicenseStatus::InvalidSignature)
        );
    }
}