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
    pub show_payment_month: bool,
    pub show_amount_received: bool,
    pub show_method: bool,
    pub show_received_by: bool,
    pub show_remaining_balance: bool,
    pub show_notes: bool,
    pub show_footer: bool,
}

pub const DEFAULT_BACKUP_KEEP_COUNT: u32 = 3;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupSettings {
    pub directory: Option<String>,
    pub daily_enabled: bool,
    pub close_enabled: bool,
    pub last_backup_at: Option<String>,
    pub keep_count: u32,
}

impl Default for BackupSettings {
    fn default() -> Self {
        Self {
            directory: None,
            daily_enabled: true,
            close_enabled: true,
            last_backup_at: None,
            keep_count: DEFAULT_BACKUP_KEEP_COUNT,
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

pub const MEMBER_FORM_REQUIRED_FIELD: &str = "full_name";

const DEFAULT_MEMBER_FORM_FIELDS: [&str; 10] = [
    "full_name",
    "father_name",
    "phone",
    "cnic",
    "address",
    "date_of_birth",
    "admission_date",
    "gender",
    "blood_group",
    "membership_plan_id",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberFormSettings {
    pub visible_fields: Vec<String>,
}

impl MemberFormSettings {
    pub fn default_visible_fields() -> Vec<String> {
        DEFAULT_MEMBER_FORM_FIELDS
            .iter()
            .map(|field| field.to_string())
            .collect()
    }
}

pub fn get_member_form_settings(conn: &Connection) -> Result<MemberFormSettings, AppError> {
    let visible_fields = match get_setting(conn, "member_form_visible_fields") {
        Ok(raw) => serde_json::from_str::<Vec<String>>(&raw)
            .unwrap_or_else(|_| MemberFormSettings::default_visible_fields()),
        Err(AppError::DatabaseError(rusqlite::Error::QueryReturnedNoRows)) => {
            MemberFormSettings::default_visible_fields()
        }
        Err(error) => return Err(error),
    };
    Ok(MemberFormSettings { visible_fields })
}

pub fn save_member_form_settings(
    conn: &Connection,
    settings: &MemberFormSettings,
) -> Result<(), AppError> {
    let mut fields: Vec<String> = Vec::with_capacity(settings.visible_fields.len());
    for field in &settings.visible_fields {
        let key = field.trim().to_string();
        if key.is_empty() || fields.contains(&key) {
            continue;
        }
        fields.push(key);
    }
    if !fields.contains(&MEMBER_FORM_REQUIRED_FIELD.to_string()) {
        fields.insert(0, MEMBER_FORM_REQUIRED_FIELD.to_string());
    }

    let encoded = serde_json::to_string(&fields)
        .map_err(|error| AppError::InternalError(format!("Could not encode member form settings: {error}")))?;
    let now = chrono::Utc::now().to_rfc3339();
    set_setting(conn, "member_form_visible_fields", &encoded, &now)
}

pub const PAYMENT_FORM_REQUIRED_FIELDS: [&str; 5] = [
    "member",
    "membership_plan",
    "amount",
    "payment_method",
    "payment_date",
];

const DEFAULT_PAYMENT_FORM_FIELDS: [&str; 8] = [
    "member",
    "membership_plan",
    "amount",
    "payment_method",
    "payment_date",
    "summary",
    "payment_month",
    "notes",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentFormSettings {
    pub visible_fields: Vec<String>,
}

impl PaymentFormSettings {
    pub fn default_visible_fields() -> Vec<String> {
        DEFAULT_PAYMENT_FORM_FIELDS
            .iter()
            .map(|field| field.to_string())
            .collect()
    }
}

pub fn get_payment_form_settings(conn: &Connection) -> Result<PaymentFormSettings, AppError> {
    let visible_fields = match get_setting(conn, "payment_form_visible_fields") {
        Ok(raw) => serde_json::from_str::<Vec<String>>(&raw)
            .unwrap_or_else(|_| PaymentFormSettings::default_visible_fields()),
        Err(AppError::DatabaseError(rusqlite::Error::QueryReturnedNoRows)) => {
            PaymentFormSettings::default_visible_fields()
        }
        Err(error) => return Err(error),
    };
    Ok(PaymentFormSettings { visible_fields })
}

pub fn save_payment_form_settings(
    conn: &Connection,
    settings: &PaymentFormSettings,
) -> Result<(), AppError> {
    let mut fields: Vec<String> = Vec::with_capacity(
        PAYMENT_FORM_REQUIRED_FIELDS.len() + settings.visible_fields.len(),
    );
    for required in PAYMENT_FORM_REQUIRED_FIELDS {
        fields.push(required.to_string());
    }
    for field in &settings.visible_fields {
        let key = field.trim().to_string();
        if key.is_empty()
            || fields.contains(&key)
            || PAYMENT_FORM_REQUIRED_FIELDS.contains(&key.as_str())
        {
            continue;
        }
        fields.push(key);
    }

    let encoded = serde_json::to_string(&fields)
        .map_err(|error| AppError::InternalError(format!("Could not encode payment form settings: {error}")))?;
    let now = chrono::Utc::now().to_rfc3339();
    set_setting(conn, "payment_form_visible_fields", &encoded, &now)
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
    if get_setting(conn, "gym_name").is_err()
        && settings
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
        keep_count: get_u32_default(conn, "backup_keep_count", DEFAULT_BACKUP_KEEP_COUNT),
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
    set_setting(
        conn,
        "backup_keep_count",
        &backup.keep_count.to_string(),
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

fn get_u32_default(conn: &Connection, key: &str, default: u32) -> u32 {
    match get_setting(conn, key) {
        Ok(v) => v.trim().parse::<u32>().unwrap_or(default),
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
        show_payment_month: visible("print_show_payment_month"),
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
    set_bool("print_show_payment_month", print.show_payment_month)?;
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrations;

    fn test_db() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&mut conn).unwrap();
        conn
    }

    #[test]
    fn member_form_settings_defaults_to_all_fields() {
        let conn = test_db();
        let settings = get_member_form_settings(&conn).unwrap();
        assert_eq!(
            settings.visible_fields,
            MemberFormSettings::default_visible_fields()
        );
    }

    #[test]
    fn member_form_settings_roundtrip() {
        let conn = test_db();
        save_member_form_settings(
            &conn,
            &MemberFormSettings {
                visible_fields: vec![
                    "full_name".to_string(),
                    "phone".to_string(),
                    "cnic".to_string(),
                ],
            },
        )
        .unwrap();

        let loaded = get_member_form_settings(&conn).unwrap();
        assert_eq!(
            loaded.visible_fields,
            vec![
                "full_name".to_string(),
                "phone".to_string(),
                "cnic".to_string()
            ]
        );
    }

    #[test]
    fn member_form_settings_always_keeps_required_field_and_dedupes() {
        let conn = test_db();
        save_member_form_settings(
            &conn,
            &MemberFormSettings {
                visible_fields: vec![
                    "phone".to_string(),
                    "full_name".to_string(),
                    "full_name".to_string(),
                    "".to_string(),
                ],
            },
        )
        .unwrap();

        let loaded = get_member_form_settings(&conn).unwrap();
        assert_eq!(
            loaded.visible_fields,
            vec!["phone".to_string(), "full_name".to_string()]
        );
    }

    #[test]
    fn member_form_settings_reinserts_required_field_when_missing() {
        let conn = test_db();
        save_member_form_settings(
            &conn,
            &MemberFormSettings {
                visible_fields: vec!["phone".to_string()],
            },
        )
        .unwrap();

        let loaded = get_member_form_settings(&conn).unwrap();
        assert_eq!(loaded.visible_fields[0], "full_name");
        assert!(loaded.visible_fields.contains(&"phone".to_string()));
    }

    #[test]
    fn corrupted_settings_fall_back_to_defaults() {
        let conn = test_db();
        let now = chrono::Utc::now().to_rfc3339();
        set_setting(&conn, "member_form_visible_fields", "not-json", &now).unwrap();

        let settings = get_member_form_settings(&conn).unwrap();
        assert_eq!(
            settings.visible_fields,
            MemberFormSettings::default_visible_fields()
        );
    }

    #[test]
    fn payment_form_settings_defaults_to_all_fields() {
        let conn = test_db();
        let settings = get_payment_form_settings(&conn).unwrap();
        assert_eq!(
            settings.visible_fields,
            PaymentFormSettings::default_visible_fields()
        );
    }

    #[test]
    fn payment_form_settings_roundtrip() {
        let conn = test_db();
        save_payment_form_settings(
            &conn,
            &PaymentFormSettings {
                visible_fields: vec![
                    "member".to_string(),
                    "membership_plan".to_string(),
                    "amount".to_string(),
                    "payment_method".to_string(),
                    "payment_date".to_string(),
                    "summary".to_string(),
                    "notes".to_string(),
                ],
            },
        )
        .unwrap();

        let loaded = get_payment_form_settings(&conn).unwrap();
        assert_eq!(
            loaded.visible_fields,
            vec![
                "member".to_string(),
                "membership_plan".to_string(),
                "amount".to_string(),
                "payment_method".to_string(),
                "payment_date".to_string(),
                "summary".to_string(),
                "notes".to_string()
            ]
        );
    }

    #[test]
    fn payment_form_settings_always_keeps_required_fields_and_dedupes() {
        let conn = test_db();
        save_payment_form_settings(
            &conn,
            &PaymentFormSettings {
                visible_fields: vec![
                    "payment_date".to_string(),
                    "member".to_string(),
                    "payment_date".to_string(),
                    "".to_string(),
                    "payment_month".to_string(),
                    "payment_month".to_string(),
                ],
            },
        )
        .unwrap();

        let loaded = get_payment_form_settings(&conn).unwrap();
        assert_eq!(
            loaded.visible_fields,
            vec![
                "member".to_string(),
                "membership_plan".to_string(),
                "amount".to_string(),
                "payment_method".to_string(),
                "payment_date".to_string(),
                "payment_month".to_string()
            ]
        );
    }

    #[test]
    fn payment_form_settings_reinserts_required_fields_when_missing() {
        let conn = test_db();
        save_payment_form_settings(
            &conn,
            &PaymentFormSettings {
                visible_fields: vec!["notes".to_string(), "summary".to_string()],
            },
        )
        .unwrap();

        let loaded = get_payment_form_settings(&conn).unwrap();
        for required in PAYMENT_FORM_REQUIRED_FIELDS {
            assert!(loaded.visible_fields.contains(&required.to_string()));
        }
        assert_eq!(loaded.visible_fields[0], "member");
        assert!(loaded.visible_fields.contains(&"notes".to_string()));
        assert!(loaded.visible_fields.contains(&"summary".to_string()));
    }

    #[test]
    fn corrupted_payment_form_settings_fall_back_to_defaults() {
        let conn = test_db();
        let now = chrono::Utc::now().to_rfc3339();
        set_setting(&conn, "payment_form_visible_fields", "not-json", &now).unwrap();

        let settings = get_payment_form_settings(&conn).unwrap();
        assert_eq!(
            settings.visible_fields,
            PaymentFormSettings::default_visible_fields()
        );
    }
}
