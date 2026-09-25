/// Returns current UTC time in ISO 8601 / RFC 3339 format.
pub fn now_iso8601() -> String {
    chrono::Utc::now().to_rfc3339()
}

/// Returns current local date in YYYY-MM-DD format.
pub fn today_iso() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

/// Parses a date string in YYYY-MM-DD format.
pub fn parse_date(value: &str) -> Result<chrono::NaiveDate, crate::errors::AppError> {
    chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| crate::errors::AppError::ValidationError(format!("Invalid date '{value}'")))
}
