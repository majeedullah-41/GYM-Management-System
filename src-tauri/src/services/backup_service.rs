use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use chrono::{Local, Utc};
use rusqlite::backup::Backup;
use rusqlite::Connection;

use crate::errors::AppError;
use crate::repositories::settings_repository;

#[derive(Clone, Copy)]
pub enum BackupKind {
    Manual,
    Daily,
    Closing,
}

impl BackupKind {
    fn label(self) -> &'static str {
        match self {
            Self::Manual => "manual",
            Self::Daily => "daily",
            Self::Closing => "closing",
        }
    }
}

pub fn create_backup(
    conn: &Connection,
    directory: &Path,
    kind: BackupKind,
) -> Result<PathBuf, AppError> {
    if directory.as_os_str().is_empty() {
        return Err(AppError::ValidationError(
            "Select a backup folder first".into(),
        ));
    }
    std::fs::create_dir_all(directory).map_err(|error| {
        AppError::InternalError(format!("Could not create backup folder: {error}"))
    })?;
    if !directory.is_dir() {
        return Err(AppError::ValidationError(
            "The selected backup location is not a folder".into(),
        ));
    }

    let timestamp = Local::now().format("%Y%m%d-%H%M%S");
    let path = directory.join(format!("GymBackup-{}-{}.db", kind.label(), timestamp));
    let mut destination = Connection::open(&path)
        .map_err(|error| AppError::InternalError(format!("Could not create backup: {error}")))?;
    let backup = Backup::new(conn, &mut destination)
        .map_err(|error| AppError::InternalError(format!("Could not start backup: {error}")))?;
    backup
        .run_to_completion(500, Duration::ZERO, None)
        .map_err(|error| AppError::InternalError(format!("Backup failed: {error}")))?;

    let now = Utc::now().to_rfc3339();
    let daily_date =
        matches!(kind, BackupKind::Daily).then(|| Local::now().format("%Y-%m-%d").to_string());
    settings_repository::set_backup_timestamp(conn, &now, daily_date.as_deref())?;
    log::info!("{} backup saved to {}", kind.label(), path.display());
    Ok(path)
}

pub fn run_daily_backup_if_due(conn: &Connection) -> Result<Option<PathBuf>, AppError> {
    let settings = settings_repository::get_backup_settings(conn);
    if !settings.daily_enabled {
        return Ok(None);
    }
    let Some(directory) = settings.directory else {
        return Ok(None);
    };
    let today = Local::now().format("%Y-%m-%d").to_string();
    if settings_repository::last_daily_backup_date(conn).as_deref() == Some(today.as_str()) {
        return Ok(None);
    }
    create_backup(conn, Path::new(&directory), BackupKind::Daily).map(Some)
}

pub fn run_closing_backup(conn: &Connection) -> Result<Option<PathBuf>, AppError> {
    let settings = settings_repository::get_backup_settings(conn);
    if !settings.close_enabled {
        return Ok(None);
    }
    let Some(directory) = settings.directory else {
        return Ok(None);
    };
    create_backup(conn, Path::new(&directory), BackupKind::Closing).map(Some)
}

pub fn start_daily_backup_worker(conn: Arc<Mutex<Connection>>) {
    std::thread::spawn(move || loop {
        if let Ok(guard) = conn.lock() {
            if let Err(error) = run_daily_backup_if_due(&guard) {
                log::error!("Automatic daily backup failed: {error}");
            }
        } else {
            log::error!("Automatic daily backup could not access the database");
        }
        std::thread::sleep(Duration::from_secs(60 * 60));
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn source_database() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE settings (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE backup_test (value TEXT NOT NULL);
            INSERT INTO backup_test (value) VALUES ('gym data');",
        )
        .unwrap();
        conn
    }

    #[test]
    fn creates_readable_database_backup_in_selected_folder() {
        let conn = source_database();
        let directory =
            std::env::temp_dir().join(format!("gym-pos-backup-{}", uuid::Uuid::new_v4()));

        let path = create_backup(&conn, &directory, BackupKind::Manual).unwrap();
        let backup = Connection::open(&path).unwrap();
        let value: String = backup
            .query_row("SELECT value FROM backup_test", [], |row| row.get(0))
            .unwrap();

        assert_eq!(value, "gym data");
        assert!(path.starts_with(&directory));

        drop(backup);
        std::fs::remove_file(path).unwrap();
        std::fs::remove_dir(directory).unwrap();
    }

    #[test]
    fn automatic_backup_waits_until_folder_is_selected() {
        let conn = source_database();
        assert!(run_daily_backup_if_due(&conn).unwrap().is_none());
        assert!(run_closing_backup(&conn).unwrap().is_none());
    }
}
