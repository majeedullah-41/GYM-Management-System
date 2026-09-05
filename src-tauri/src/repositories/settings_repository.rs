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

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PrintSettings {
    pub destination: String,
    pub paper_width: String,
    pub font_size: i64,
    pub show_gym_name: bool,
    pub show_gym_phone: bool,
    pub show_gym_address: bool,
    pub show_receipt_title: bool,
    pub show_receipt_number: bool,
    pub show_date: bool,
    pub show_member_info: bool,
    pub show_plan_info: bool,
    pub show_period: bool,
    pub show_payment_details: bool,
    pub show_remaining_balance: bool,
    pub show_notes: bool,
    pub show_footer: bool,
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct AllSettings {
    pub gym: GymSettings,
    pub receipt: ReceiptSettings,
    pub print: PrintSettings,
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
        print: get_print_settings(conn)?,
    })
}

fn get_bool_default(conn: &Connection, key: &str, default: bool) -> bool {
    match get_setting(conn, key) {
        Ok(v) => v == "1",
        Err(_) => default,
    }
}

pub fn get_print_settings(conn: &Connection) -> Result<PrintSettings, AppError> {
    let destination = match get_setting(conn, "print_destination") {
        Ok(v) if v == "pdf" => "pdf".to_string(),
        _ => "print_window".to_string(),
    };
    let paper_width = match get_setting(conn, "print_paper_width") {
        Ok(v) if v == "58" => "58".to_string(),
        _ => "80".to_string(),
    };
    let font_size = match get_setting(conn, "print_font_size") {
        Ok(v) => v.parse::<i64>().unwrap_or(11).clamp(8, 16),
        Err(_) => 11,
    };

    Ok(PrintSettings {
        destination,
        paper_width,
        font_size,
        show_gym_name: get_bool_default(conn, "print_show_gym_name", true),
        show_gym_phone: get_bool_default(conn, "print_show_gym_phone", true),
        show_gym_address: get_bool_default(conn, "print_show_gym_address", true),
        show_receipt_title: get_bool_default(conn, "print_show_receipt_title", true),
        show_receipt_number: get_bool_default(conn, "print_show_receipt_number", true),
        show_date: get_bool_default(conn, "print_show_date", true),
        show_member_info: get_bool_default(conn, "print_show_member_info", true),
        show_plan_info: get_bool_default(conn, "print_show_plan_info", true),
        show_period: get_bool_default(conn, "print_show_period", true),
        show_payment_details: get_bool_default(conn, "print_show_payment_details", true),
        show_remaining_balance: get_bool_default(conn, "print_show_remaining_balance", true),
        show_notes: get_bool_default(conn, "print_show_notes", true),
        show_footer: get_bool_default(conn, "print_show_footer", true),
    })
}

pub fn save_print_settings(conn: &Connection, print: &PrintSettings) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    let set = |key: &str, value: &str| set_setting(conn, key, value, &now);
    let set_bool = |key: &str, value: bool| set(key, if value { "1" } else { "0" });

    let destination = if print.destination == "pdf" {
        "pdf"
    } else {
        "print_window"
    };
    let paper_width = if print.paper_width == "58" {
        "58"
    } else {
        "80"
    };
    let font_size = print.font_size.clamp(8, 16);

    set("print_destination", destination)?;
    set("print_paper_width", paper_width)?;
    set("print_font_size", &font_size.to_string())?;
    set_bool("print_show_gym_name", print.show_gym_name)?;
    set_bool("print_show_gym_phone", print.show_gym_phone)?;
    set_bool("print_show_gym_address", print.show_gym_address)?;
    set_bool("print_show_receipt_title", print.show_receipt_title)?;
    set_bool("print_show_receipt_number", print.show_receipt_number)?;
    set_bool("print_show_date", print.show_date)?;
    set_bool("print_show_member_info", print.show_member_info)?;
    set_bool("print_show_plan_info", print.show_plan_info)?;
    set_bool("print_show_period", print.show_period)?;
    set_bool("print_show_payment_details", print.show_payment_details)?;
    set_bool("print_show_remaining_balance", print.show_remaining_balance)?;
    set_bool("print_show_notes", print.show_notes)?;
    set_bool("print_show_footer", print.show_footer)?;
    Ok(())
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
    set_setting(
        conn,
        "receipt_show_phone",
        if receipt.show_phone { "1" } else { "0" },
        &now,
    )?;
    set_setting(
        conn,
        "receipt_show_address",
        if receipt.show_address { "1" } else { "0" },
        &now,
    )?;
    set_setting(
        conn,
        "receipt_show_member_id",
        if receipt.show_member_id { "1" } else { "0" },
        &now,
    )?;
    set_setting(
        conn,
        "receipt_show_notes",
        if receipt.show_notes { "1" } else { "0" },
        &now,
    )?;
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

fn set_setting_optional(
    conn: &Connection,
    key: &str,
    value: &Option<String>,
    now: &str,
) -> Result<(), AppError> {
    match value {
        Some(v) if !v.is_empty() => set_setting(conn, key, v, now),
        _ => {
            conn.execute("DELETE FROM settings WHERE key = ?1", params![key])?;
            Ok(())
        }
    }
}
