use rusqlite::{params, Connection};

use crate::errors::AppError;

#[derive(Debug, Clone, Default)]
pub struct GymSettings {
    pub gym_name: String,
    pub gym_address: Option<String>,
    pub gym_phone: Option<String>,
}

pub fn get_gym_settings(conn: &Connection) -> Result<GymSettings, AppError> {
    let mut settings = GymSettings::default();

    if let Ok(name) = get_setting(conn, "gym_name") {
        settings.gym_name = name;
    }
    if let Ok(addr) = get_setting(conn, "gym_address") {
        settings.gym_address = Some(addr);
    }
    if let Ok(phone) = get_setting(conn, "gym_phone") {
        settings.gym_phone = Some(phone);
    }

    if settings.gym_name.is_empty() {
        settings.gym_name = "Gym POS".to_string();
    }

    Ok(settings)
}

fn get_setting(conn: &Connection, key: &str) -> Result<String, AppError> {
    let value: String = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    )?;
    Ok(value)
}
