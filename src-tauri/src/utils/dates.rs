/// Returns current UTC time in ISO 8601 / RFC 3339 format.
pub fn now_iso8601() -> String {
    chrono::Utc::now().to_rfc3339()
}

/// Returns current local date in YYYY-MM-DD format.
pub fn today_iso() -> String {
    chrono::Local::now()
        .format("%Y-%m-%d")
        .to_string()
}
