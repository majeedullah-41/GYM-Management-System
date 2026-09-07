//! Vendor-side License Generator CLI.
//!
//! This tool is for the software vendor/developer ONLY. It is NOT distributed
//! with the customer application and it contains the private signing key path.
//!
//! Usage:
//!   license-generator gen-keys [--out path]
//!       Generates a new Ed25519 keypair. Writes the base64 private seed to the
//!       given path (default `keys/private.key`) and prints the public key hex
//!       for embedding into the app (see `PUBLIC_KEY_HEX` in
//!       src-tauri/src/licensing/crypto/keys.rs).
//!
//!   license-generator issue --hwid <HWID> [--customer NAME] [--gym NAME]
//!       [--type permanent|expiring] [--expires YYYY-MM-DD] [--out PATH]
//!       [--key PATH] [--license-id ID]
//!       Signs a license for the HWID and writes a `.gymlic` file.
//!
//! The private key is read from `--key` or the `LICENSE_PRIVATE_KEY` env var
//! (base64 of the 32-byte seed). The seed is NEVER embedded in source.

use std::path::{Path, PathBuf};
use std::process::ExitCode;

use ed25519_dalek::SigningKey;
use rand_core::OsRng;
use rand_core::RngCore;
use license_generator::{canonical_payload, hex_encode, LicensePayload, LicenseType};

const DEFAULT_KEY_FILE: &str = "keys/private.key";
const FORMAT: &str = "GYMLIC";
const FORMAT_VERSION: u32 = 1;
const KEY_ID: &str = "dev";

fn new_signing_key() -> ed25519_dalek::SigningKey {
    let mut seed = [0u8; 32];
    OsRng.fill_bytes(&mut seed);
    ed25519_dalek::SigningKey::from_bytes(&seed)
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    let Some(cmd) = args.get(1) else {
        eprintln!("{}", usage());
        return ExitCode::FAILURE;
    };

    match cmd.as_str() {
        "gen-keys" => gen_keys(args),
        "issue" => issue(args),
        "help" | "--help" | "-h" => {
            println!("{}", usage());
            ExitCode::SUCCESS
        }
        other => {
            eprintln!("Unknown command: {other}\n{}", usage());
            ExitCode::FAILURE
        }
    }
}

fn usage() -> String {
    "License Generator CLI
  gen-keys [--out path]
  issue --hwid <HWID> [--customer NAME] [--gym NAME]
        [--type permanent|expiring] [--expires YYYY-MM-DD]
        [--license-id ID] [--key PATH] [--out PATH]"
        .to_string()
}

fn get_flag(args: &[String], name: &str) -> Option<String> {
    let mut it = args.iter();
    while let Some(a) = it.next() {
        if a.as_str() == name {
            return it.next().cloned();
        }
    }
    None
}

fn has_flag(args: &[String], name: &str) -> bool {
    args.iter().any(|a| a.as_str() == name)
}

fn gen_keys(args: Vec<String>) -> ExitCode {
    let key_file = get_flag(&args, "--out").unwrap_or_else(|| DEFAULT_KEY_FILE.to_string());
    let signing_key = new_signing_key();
    let verifying_key = ed25519_dalek::VerifyingKey::from(&signing_key);
    let seed_b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, signing_key.to_bytes());

    if let Some(parent) = Path::new(&key_file).parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).expect("create key dir");
        }
    }
    std::fs::write(&key_file, seed_b64.trim()).expect("write key file");
    std::fs::write(format!("{key_file}.public"), hex_encode(&verifying_key.to_bytes()))
        .expect("write public key file");

    println!("Keypair generated.");
    println!("Private seed written to: {key_file}");
    println!("Public key written to:   {key_file}.public");
    println!("Public key hex (embed into keys.rs):");
    println!("{}", hex_encode(&verifying_key.to_bytes()));
    ExitCode::SUCCESS
}

fn issue(args: Vec<String>) -> ExitCode {
    let hwid = match get_flag(&args, "--hwid") {
        Some(h) if !h.trim().is_empty() => h,
        _ => {
            eprintln!("ERROR: --hwid is required");
            return ExitCode::FAILURE;
        }
    };
    let license_type = match get_flag(&args, "--type").as_deref() {
        None | Some("permanent") => LicenseType::Permanent,
        Some("expiring") => LicenseType::Expiring,
        Some(other) => {
            eprintln!("ERROR: unknown license type '{other}' (use permanent or expiring)");
            return ExitCode::FAILURE;
        }
    };
    let expires_at = match license_type {
        LicenseType::Expiring => match get_flag(&args, "--expires") {
            Some(e) if !e.trim().is_empty() => Some(e),
            _ => {
                eprintln!("ERROR: expiring license requires --expires YYYY-MM-DD");
                return ExitCode::FAILURE;
            }
        },
        LicenseType::Permanent => None,
    };

    let signing_key = load_signing_key(get_flag(&args, "--key").as_deref());

    let issued_at = local_today();
    let license_id = get_flag(&args, "--license-id").unwrap_or_else(|| new_license_id(&issued_at));
    let customer_name = get_flag(&args, "--customer").unwrap_or_default();
    let gym_name = get_flag(&args, "--gym").unwrap_or_default();

    let payload = LicensePayload {
        version: 1,
        license_id,
        customer_name,
        gym_name,
        hwid,
        license_type,
        issued_at,
        expires_at,
    };

    // Canonical serialization must match the app. The signature covers the
    // canonical bytes.
    let signature_hex = {
        use ed25519_dalek::Signer;
        let sig = signing_key.sign(&canonical_payload(&payload));
        hex_encode(&sig.to_bytes())
    };

    let envelope = LicenseEnvelope {
        format: FORMAT.to_string(),
        version: FORMAT_VERSION,
        key_id: KEY_ID.to_string(),
        payload_json: payload_to_json(&payload),
        signature_hex,
    };
    let json = serde_json::to_string_pretty(&envelope).expect("serialize envelope");

    let out_path = get_flag(&args, "--out")
        .unwrap_or_else(|| format!("{}.gymlic", slugify(&gym_name)));
    std::fs::write(&out_path, json).expect("write license file");

    println!("License generated successfully.");
    println!("License ID: {}", payload.license_id);
    println!("Customer:   {}", payload.customer_name);
    println!("Gym:        {}", payload.gym_name);
    println!("Type:       {}", payload.license_type.as_str());
    println!("HWID:       {}", payload.hwid);
    println!("Issued:     {}", payload.issued_at);
    if let Some(exp) = &payload.expires_at {
        println!("Expires:    {exp}");
    }
    println!("File:       {out_path}");
    ExitCode::SUCCESS
}

#[derive(serde::Serialize)]
struct LicenseEnvelope {
    format: String,
    version: u32,
    key_id: String,
    payload_json: String,
    signature_hex: String,
}

/// Serialize the payload as a canonical JSON object. The signature does NOT
/// cover this JSON directly; it covers the canonical_payload bytes. Keeping
/// the JSON human-readable aids inspection while the signature remains
/// authoritative over the canonical form.
fn payload_to_json(payload: &LicensePayload) -> String {
    let obj = serde_json::json!({
        "version": payload.version,
        "license_id": payload.license_id,
        "customer_name": payload.customer_name,
        "gym_name": payload.gym_name,
        "hwid": payload.hwid,
        "license_type": payload.license_type.as_str(),
        "issued_at": payload.issued_at,
        "expires_at": payload.expires_at,
    });
    serde_json::to_string(&obj).expect("serialize payload")
}

fn load_signing_key(key_path: Option<&str>) -> ed25519_dalek::SigningKey {
    let seed_b64 = if let Some(path) = key_path {
        std::fs::read_to_string(path).expect("read key file")
    } else if let Ok(env) = std::env::var("LICENSE_PRIVATE_KEY") {
        env
    } else {
        let default = PathBuf::from(DEFAULT_KEY_FILE);
        if default.exists() {
            std::fs::read_to_string(&default).expect("read default key file")
        } else {
            eprintln!(
                "ERROR: no private key. Provide --key PATH, LICENSE_PRIVATE_KEY, or run `gen-keys` first."
            );
            std::process::exit(1);
        }
    };
    let seed = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, seed_b64.trim())
        .expect("decode private seed (expect base64 of 32 bytes)");
    let bytes: [u8; 32] = seed
        .try_into()
        .map_err(|_| eprintln!("ERROR: private seed must be 32 bytes"))
        .unwrap();
    ed25519_dalek::SigningKey::from_bytes(&bytes)
}

fn local_today() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

use std::sync::atomic::{AtomicU32, Ordering};
static SEQ: AtomicU32 = AtomicU32::new(1);

fn new_license_id(date: &str) -> String {
    let n = SEQ.fetch_add(1, Ordering::SeqCst);
    let year = date.get(0..4).unwrap_or("2026");
    format!("LIC-{year}-{n:06}")
}

fn slugify(name: &str) -> String {
    if name.trim().is_empty() {
        return "license".to_string();
    }
    name.chars()
        .map(|c| if c.is_ascii_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}
