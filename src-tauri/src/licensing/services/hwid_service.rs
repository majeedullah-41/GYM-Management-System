//! Multi-source hardware fingerprint for Windows.
//!
//! Sources (missing values contribute empty strings deterministically:
//! every part carries its own label so two different gaps cannot collide):
//!   - `HKLM\SOFTWARE\Microsoft\Cryptography` MachineGuid
//!   - `HKLM\SYSTEM\CurrentControlSet\Control\IDConfigDB\Hardware Profiles\Current` HwProfileGuid
//!   - `HKLM\HARDWARE\DESCRIPTION\System\CentralProcessor\0` ProcessorId
//!   - system-drive volume serial number
//!
//! Produces the lowercase SHA-256 hex of the joined sources. Abstracted behind
//! `HwIdProvider` so unit tests can inject a fixed identity.

use sha2::{Digest, Sha256};
use windows::core::{w, PCWSTR};
use windows::Win32::System::Registry::{
    RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY, KEY_READ, REG_SZ, HKEY_LOCAL_MACHINE,
};

/// Source of the machine identity.
pub trait HwIdProvider: Send + Sync {
    fn current(&self) -> String;
}

/// Production provider reading the Windows registry and volume serial.
#[derive(Default)]
pub struct RegistryHwIdProvider;

impl HwIdProvider for RegistryHwIdProvider {
    fn current(&self) -> String {
        Self::compute()
    }
}

impl RegistryHwIdProvider {
    pub fn compute() -> String {
        let machine_guid = reg_query_string(
            HKEY_LOCAL_MACHINE,
            w!("SOFTWARE\\Microsoft\\Cryptography"),
            w!("MachineGuid"),
        )
        .unwrap_or_default();

        let hw_profile_guid = reg_query_string(
            HKEY_LOCAL_MACHINE,
            w!("SYSTEM\\CurrentControlSet\\Control\\IDConfigDB\\Hardware Profiles\\Current"),
            w!("HwProfileGuid"),
        )
        .unwrap_or_default();

        let cpu_id = reg_query_string(
            HKEY_LOCAL_MACHINE,
            w!("HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0"),
            w!("ProcessorId"),
        )
        .unwrap_or_default();

        let volume_serial = volume_serial().map(|v| v.to_string()).unwrap_or_default();

        fingerprint(&[
            format!("machine:{machine_guid}"),
            format!("hwprofile:{hw_profile_guid}"),
            format!("cpu:{cpu_id}"),
            format!("vol:{volume_serial}"),
        ])
    }
}

/// Pure, deterministic fingerprint used for testing and stable hashing.
pub fn fingerprint(parts: &[String]) -> String {
    let mut input = String::new();
    for (i, part) in parts.iter().enumerate() {
        if i > 0 {
            input.push('\x1f');
        }
        input.push_str(part);
    }
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let digest = hasher.finalize();
    digest.iter().map(|b| format!("{b:02x}")).collect()
}

fn reg_query_string(root: HKEY, subkey: PCWSTR, value: PCWSTR) -> Option<String> {
    let mut key: HKEY = HKEY::default();
    let status = unsafe { RegOpenKeyExW(root, subkey, None, KEY_READ, &mut key) };
    if status.is_err() {
        return None;
    }

    let result = query_string_value(key, value);
    unsafe { let _ = RegCloseKey(key); }
    result
}

fn query_string_value(key: HKEY, value: PCWSTR) -> Option<String> {
    let mut size: u32 = 0;
    let status = unsafe {
        RegQueryValueExW(
            key,
            value,
            None,
            Some(std::ptr::null_mut()),
            None,
            Some(&mut size),
        )
    };
    if status.is_err() || size == 0 || (size as usize) % 2 != 0 {
        return None;
    }

    let mut buffer = vec![0u8; size as usize];
    let mut value_type = REG_SZ;
    let status = unsafe {
        RegQueryValueExW(
            key,
            value,
            None,
            Some(&mut value_type),
            Some(buffer.as_mut_ptr()),
            Some(&mut size),
        )
    };
    if status.is_err() || value_type != REG_SZ {
        return None;
    }

    let wide: Vec<u16> = buffer
        .chunks_exact(2)
        .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
        .collect();
    let text = String::from_utf16_lossy(&wide);
    Some(text.trim_end_matches('\0').to_string())
}

fn volume_serial() -> Option<u32> {
    let drive = std::env::var("SystemDrive").unwrap_or_else(|_| "C:".to_string());
    let root = format!("{drive}\\");
    let wide: Vec<u16> = root.encode_utf16().chain(std::iter::once(0)).collect();
    let mut serial: u32 = 0;
    let result = unsafe {
        windows::Win32::Storage::FileSystem::GetVolumeInformationW(
            PCWSTR::from_raw(wide.as_ptr()),
            None,
            Some(&mut serial),
            None,
            None,
            None,
        )
    };
    result.ok().map(|()| serial)
}

#[cfg(test)]
pub struct MockHwIdProvider(pub String);

#[cfg(test)]
impl HwIdProvider for MockHwIdProvider {
    fn current(&self) -> String {
        self.0.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fingerprint_is_deterministic_and_order_sensitive() {
        let a = fingerprint(&["machine:x".into(), "cpu:y".into()]);
        let b = fingerprint(&["machine:x".into(), "cpu:y".into()]);
        assert_eq!(a, b);
        assert_eq!(a.len(), 64);
        let c = fingerprint(&["cpu:y".into(), "machine:x".into()]);
        assert_ne!(a, c);
    }

    #[test]
    fn missing_values_are_stable() {
        let empty = fingerprint(&[
            "machine:".into(),
            "hwprofile:".into(),
            "cpu:".into(),
            "vol:".into(),
        ]);
        let non_empty = fingerprint(&[
            "machine:abc".into(),
            "hwprofile:".into(),
            "cpu:".into(),
            "vol:".into(),
        ]);
        assert_eq!(empty.len(), 64);
        assert_ne!(empty, non_empty);
    }
}