//! Hardware identifier concept shared between the verifier and the HWID service.

/// A machine identity string (as signed into a license) or a locally-computed
/// identity. Comparison is case-insensitive: both sides are lowercase hex.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HwId(pub String);

impl HwId {
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Case-insensitive match so signature/HWID comparison tolerates hex case.
    pub fn matches(&self, other: &HwId) -> bool {
        self.0.eq_ignore_ascii_case(&other.0)
    }
}

impl From<String> for HwId {
    fn from(value: String) -> Self {
        HwId(value)
    }
}

impl From<&str> for HwId {
    fn from(value: &str) -> Self {
        HwId(value.to_string())
    }
}