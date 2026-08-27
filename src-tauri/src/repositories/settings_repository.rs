use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use crate::errors::AppError;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GymSettings {
    pub gym_name: String,
    pub gym_address: Option<String>,
    pub gym_phone: Option<String>,
    pub gym_email: Option<String>,
    pub gym_website: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ReceiptSettings {
    pub receipt_title: String,
    pub receipt_footer: Option<String>,
    pub show_phone: bool,
    pub show_address: bool,
    pub show_member_id: bool,
    pub show_notes: bool,
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct AllSettings {
    pub gym: GymSettings,
    pub receipt: ReceiptSettings,
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
    if let Ok(email) = get_setting(conn, "gym_email") {
        settings.gym_email = Some(email);
    }
    if let Ok(website) = get_setting(conn, "gym_website") {
        settings.gym_website = Some(website);
    }

    if settings.gym_name.is_empty() {
        settings.gym_name = "Gym POS".to_string();
    }

    Ok(settings)
}

pub fn get_receipt_settings(conn: &Connection) -> Result<ReceiptSettings, AppError> {
    let mut settings = ReceiptSettings::default();

    if let Ok(title) = get_setting(conn, "receipt_title") {
        settings.receipt_title = title;
    }
    if let Ok(footer) = get_setting(conn, "receipt_footer") {
        settings.receipt_footer = Some(footer);
    }
    if let Ok(v) = get_setting(conn, "receipt_show_phone") {
        settings.show_phone = v == "1";
    } else {
        settings.show_phone = true;
    }
    if let Ok(v) = get_setting(conn, "receipt_show_address") {
        settings.show_address = v == "1";
    } else {
        settings.show_address = true;
    }
    if let Ok(v) = get_setting(conn, "receipt_show_member_id") {
        settings.show_member_id = v == "1";
    } else {
        settings.show_member_id = true;
    }
    if let Ok(v) = get_setting(conn, "receipt_show_notes") {
        settings.show_notes = v == "1";
    } else {
        settings.show_notes = true;
    }

    if settings.receipt_title.is_empty() {
        settings.receipt_title = "PAYMENT RECEIPT".to_string();
    }

    Ok(settings)
}

pub fn get_all_settings(conn: &Connection) -> Result<AllSettings, AppError> {
    Ok(AllSettings {
        gym: get_gym_settings(conn)?,
        receipt: get_receipt_settings(conn)?,
    })
}

pub fn save_gym_settings(conn: &Connection, gym: &GymSettings) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    set_setting(conn, "gym_name", &gym.gym_name, &now)?;
    set_setting_optional(conn, "gym_address", &gym.gym_address, &now)?;
    set_setting_optional(conn, "gym_phone", &gym.gym_phone, &now)?;
    set_setting_optional(conn, "gym_email", &gym.gym_email, &now)?;
    set_setting_optional(conn, "gym_website", &gym.gym_website, &now)?;
    Ok(())
}

pub fn save_receipt_settings(conn: &Connection, receipt: &ReceiptSettings) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    set_setting(conn, "receipt_title", &receipt.receipt_title, &now)?;
    set_setting_optional(conn, "receipt_footer", &receipt.receipt_footer, &now)?;
    set_setting(conn, "receipt_show_phone", if receipt.show_phone { "1" } else { "0" }, &now)?;
    set_setting(conn, "receipt_show_address", if receipt.show_address { "1" } else { "0" }, &now)?;
    set_setting(conn, "receipt_show_member_id", if receipt.show_member_id { "1" } else { "0" }, &now)?;
    set_setting(conn, "receipt_show_notes", if receipt.show_notes { "1" } else { "0" }, &now)?;
    Ok(())
}

fn get_setting(conn: &Connection, key: &str) -> Result<String, AppError> {
    let value: String = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    )?;
    Ok(value)
}

fn set_setting(conn: &Connection, key: &str, value: &str, now: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO settings (key, value, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4) \
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?4",
        params![key, value, now, now],
    )?;
    Ok(())
}

fn set_setting_optional(conn: &Connection, key: &str, value: &Option<String>, now: &str) -> Result<(), AppError> {
    match value {
        Some(v) if !v.is_empty() => set_setting(conn, key, v, now),
        _ => {
            conn.execute("DELETE FROM settings WHERE key = ?1", params![key])?;
            Ok(())
        }
    }
}
