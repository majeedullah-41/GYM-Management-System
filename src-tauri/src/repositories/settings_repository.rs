use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use crate::errors::AppError;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GymSettings {
    pub gym_name: String,
    pub gym_tagline: Option<String>,
    pub gym_logo: Option<String>,
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
    pub thermal_printer_name: Option<String>,
    pub thermal_characters_per_line: Option<i64>,
    pub show_gym_name: bool,
    pub show_gym_logo: bool,
    pub show_gym_tagline: bool,
    pub show_gym_phone: bool,
    pub show_gym_address: bool,
    pub show_receipt_title: bool,
    pub show_receipt_number: bool,
    pub show_date: bool,
    pub show_member_info: bool,
    pub show_plan_info: bool,
    pub show_period: bool,
    pub show_amount_received: bool,
    pub show_method: bool,
    pub show_received_by: bool,
    pub show_remaining_balance: bool,
    pub show_notes: bool,
    pub show_footer: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupSettings {
    pub directory: Option<String>,
    pub daily_enabled: bool,
    pub close_enabled: bool,
    pub last_backup_at: Option<String>,
}

impl Default for BackupSettings {
    fn default() -> Self {
        Self {
            directory: None,
            daily_enabled: true,
            close_enabled: true,
            last_backup_at: None,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct AllSettings {
    pub gym: GymSettings,
    pub receipt: ReceiptSettings,
    pub print: PrintSettings,
    pub backup: BackupSettings,
}

pub fn get_gym_settings(conn: &Connection) -> Result<GymSettings, AppError> {
    let mut settings = GymSettings::default();

    if let Ok(name) = get_setting(conn, "gym_name") {
        settings.gym_name = name;
    }
    if let Ok(tagline) = get_setting(conn, "gym_tagline") {
        settings.gym_tagline = Some(tagline);
    }
    if let Ok(logo) = get_setting(conn, "gym_logo") {
        settings.gym_logo = Some(logo);
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
    if settings
        .gym_tagline
        .as_deref()
        .is_none_or(|value| value.trim().is_empty())
    {
        settings.gym_tagline = Some("Train Today Be Better".to_string());
    }

    Ok(settings)
}

pub fn get_receipt_settings(conn: &Connection) -> Result<ReceiptSettings, AppError> {
    let mut settings = ReceiptSettings::default();

    if let Ok(title) = get_setting(conn, "receipt_title") {
        settings.receipt_title = title;
    }
    if let Ok(footer) = get_setting(conn, "receipt_footer") {
        settings.receipt_footer = if footer
            .trim()
            .eq_ignore_ascii_case("Thank you for being a member")
        {
            Some("Stay Fit | Stay Healthy".to_string())
        } else {
            Some(footer)
        };
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
    if settings.receipt_footer.is_none() {
        settings.receipt_footer = Some("Stay Fit | Stay Healthy".to_string());
    }

    Ok(settings)
}

pub fn get_all_settings(conn: &Connection) -> Result<AllSettings, AppError> {
    Ok(AllSettings {
        gym: get_gym_settings(conn)?,
        receipt: get_receipt_settings(conn)?,
        print: get_print_settings(conn)?,
        backup: get_backup_settings(conn),
    })
}

pub fn get_backup_settings(conn: &Connection) -> BackupSettings {
    BackupSettings {
        directory: get_setting(conn, "backup_directory")
            .ok()
            .filter(|value| !value.trim().is_empty()),
        daily_enabled: get_bool_default(conn, "backup_daily_enabled", true),
        close_enabled: get_bool_default(conn, "backup_close_enabled", true),
        last_backup_at: get_setting(conn, "backup_last_at").ok(),
    }
}

pub fn save_backup_settings(conn: &Connection, backup: &BackupSettings) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    set_setting_optional(conn, "backup_directory", &backup.directory, &now)?;
    set_setting(
        conn,
        "backup_daily_enabled",
        if backup.daily_enabled { "1" } else { "0" },
        &now,
    )?;
    set_setting(
        conn,
        "backup_close_enabled",
        if backup.close_enabled { "1" } else { "0" },
        &now,
    )?;
    Ok(())
}

pub fn set_backup_timestamp(
    conn: &Connection,
    timestamp: &str,
    daily_date: Option<&str>,
) -> Result<(), AppError> {
    set_setting(conn, "backup_last_at", timestamp, timestamp)?;
    if let Some(date) = daily_date {
        set_setting(conn, "backup_last_daily_date", date, timestamp)?;
    }
    Ok(())
}

pub fn last_daily_backup_date(conn: &Connection) -> Option<String> {
    get_setting(conn, "backup_last_daily_date").ok()
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
        Ok(v) if v == "thermal" => "thermal".to_string(),
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
    let thermal_printer_name = get_setting(conn, "thermal_printer_name").ok();
    let thermal_characters_per_line = match get_setting(conn, "thermal_characters_per_line") {
        Ok(v) => v.parse::<i64>().ok().map(|c| c.clamp(16, 64)),
        Err(_) => None,
    };
    let current_receipt_layout =
        get_setting(conn, "receipt_layout_version").is_ok_and(|value| value == "reference-v1");
    let visible = |key: &str| {
        if current_receipt_layout {
            get_bool_default(conn, key, true)
        } else {
            true
        }
    };

    Ok(PrintSettings {
        destination,
        paper_width,
        font_size,
        thermal_printer_name,
        thermal_characters_per_line,
        show_gym_name: visible("print_show_gym_name"),
        show_gym_logo: visible("print_show_gym_logo"),
        show_gym_tagline: visible("print_show_gym_tagline"),
        show_gym_phone: visible("print_show_gym_phone"),
        show_gym_address: visible("print_show_gym_address"),
        show_receipt_title: visible("print_show_receipt_title"),
        show_receipt_number: visible("print_show_receipt_number"),
        show_date: visible("print_show_date"),
        show_member_info: visible("print_show_member_info"),
        show_plan_info: visible("print_show_plan_info"),
        show_period: visible("print_show_period"),
        show_amount_received: get_bool_default(conn, "print_show_amount_received", true),
        show_method: get_bool_default(conn, "print_show_method", true),
        show_received_by: get_bool_default(conn, "print_show_received_by", true),
        show_remaining_balance: get_bool_default(conn, "print_show_remaining_balance", true),
        show_notes: get_bool_default(conn, "print_show_notes", true),
        show_footer: visible("print_show_footer"),
    })
}

pub fn save_print_settings(conn: &Connection, print: &PrintSettings) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    let set = |key: &str, value: &str| set_setting(conn, key, value, &now);
    let set_bool = |key: &str, value: bool| set(key, if value { "1" } else { "0" });

    let destination = match print.destination.as_str() {
        "pdf" => "pdf",
        "thermal" => "thermal",
        _ => "print_window",
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
    set("receipt_layout_version", "reference-v1")?;
    set_setting_optional(
        conn,
        "thermal_printer_name",
        &print.thermal_printer_name,
        &now,
    )?;
    match print.thermal_characters_per_line {
        Some(c) => set("thermal_characters_per_line", &c.clamp(16, 64).to_string())?,
        None => {
            conn.execute(
                "DELETE FROM settings WHERE key = ?1",
                params!["thermal_characters_per_line"],
            )?;
        }
    }
    set_bool("print_show_gym_name", print.show_gym_name)?;
    set_bool("print_show_gym_logo", print.show_gym_logo)?;
    set_bool("print_show_gym_tagline", print.show_gym_tagline)?;
    set_bool("print_show_gym_phone", print.show_gym_phone)?;
    set_bool("print_show_gym_address", print.show_gym_address)?;
    set_bool("print_show_receipt_title", print.show_receipt_title)?;
    set_bool("print_show_receipt_number", print.show_receipt_number)?;
    set_bool("print_show_date", print.show_date)?;
    set_bool("print_show_member_info", print.show_member_info)?;
    set_bool("print_show_plan_info", print.show_plan_info)?;
    set_bool("print_show_period", print.show_period)?;
    set_bool("print_show_amount_received", print.show_amount_received)?;
    set_bool("print_show_method", print.show_method)?;
    set_bool("print_show_received_by", print.show_received_by)?;
    set_bool("print_show_remaining_balance", print.show_remaining_balance)?;
    set_bool("print_show_notes", print.show_notes)?;
    set_bool("print_show_footer", print.show_footer)?;
    Ok(())
}

pub fn save_gym_settings(conn: &Connection, gym: &GymSettings) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    set_setting(conn, "gym_name", &gym.gym_name, &now)?;
    set_setting_optional(conn, "gym_tagline", &gym.gym_tagline, &now)?;
    set_setting_optional(conn, "gym_logo", &gym.gym_logo, &now)?;
    set_setting_optional(conn, "gym_address", &gym.gym_address, &now)?;
    set_setting_optional(conn, "gym_phone", &gym.gym_phone, &now)?;
    set_setting_optional(conn, "gym_email", &gym.gym_email, &now)?;
    set_setting_optional(conn, "gym_website", &gym.gym_website, &now)?;
    Ok(())
}

pub fn save_receipt_settings(conn: &Connection, receipt: &ReceiptSettings) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    set_setting(conn, "receipt_title", &receipt.receipt_title, &now)?;
    match &receipt.receipt_footer {
        Some(f) => set_setting(conn, "receipt_footer", f, &now)?,
        None => set_setting(conn, "receipt_footer", "", &now)?,
    }
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
