use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use chrono::{Local, NaiveDate, NaiveTime, Utc};
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

    fn from_label(label: &str) -> Option<Self> {
        match label {
            "manual" => Some(Self::Manual),
            "daily" => Some(Self::Daily),
            "closing" => Some(Self::Closing),
            _ => None,
        }
    }
}

const BACKUP_FILE_PREFIX: &str = "GymBackup";
const BACKUP_FILE_EXTENSION: &str = ".db";
const INCOMPLETE_BACKUP_SUFFIX: &str = ".db.incomplete";

#[derive(Debug, Default)]
pub struct PruneSummary {
    pub deleted: Vec<PathBuf>,
    pub failed: Vec<(PathBuf, String)>,
}

impl PruneSummary {
    fn log_failures(&self) {
        for (path, reason) in &self.failed {
            log::warn!("Could not delete old backup {}: {}", path.display(), reason);
        }
    }
}

/// Extracts the sortable stamp from a file this module created, so that only
/// `GymBackup-{manual|daily|closing}-{YYYYMMDD}-{HHMMSS}.db` is ever deleted.
fn parse_backup_stamp(name: &str) -> Option<String> {
    let stem = name.strip_suffix(BACKUP_FILE_EXTENSION)?;
    let mut parts = stem.split('-');
    let prefix = parts.next()?;
    let kind = parts.next()?;
    let date = parts.next()?;
    let time = parts.next()?;
    if parts.next().is_some() {
        return None;
    }
    if prefix != BACKUP_FILE_PREFIX || BackupKind::from_label(kind).is_none() {
        return None;
    }
    if date.len() != 8 || time.len() != 6 {
        return None;
    }
    if !date.bytes().chain(time.bytes()).all(|b| b.is_ascii_digit()) {
        return None;
    }
    if NaiveDate::parse_from_str(date, "%Y%m%d").is_err() {
        return None;
    }
    if NaiveTime::parse_from_str(time, "%H%M%S").is_err() {
        return None;
    }
    Some(format!("{date}{time}"))
}

/// Deletes all but the `keep` most recent backups in `directory`, oldest first.
/// Files that this module did not create are never touched. A backup named by
/// `protect` is always kept, even if it sorts older than the `keep` newest.
pub fn prune_old_backups(
    directory: &Path,
    keep: u32,
    protect: Option<&Path>,
) -> Result<PruneSummary, AppError> {
    let mut summary = PruneSummary::default();
    if keep == 0 || directory.as_os_str().is_empty() {
        return Ok(summary);
    }
    if !directory.is_dir() {
        return Ok(summary);
    }

    let entries = std::fs::read_dir(directory).map_err(|error| {
        AppError::InternalError(format!("Could not read backup folder: {error}"))
    })?;

    let mut backups: Vec<(String, PathBuf)> = Vec::new();
    for entry in entries {
        let Ok(entry) = entry else { continue };
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        if let Some(stamp) = parse_backup_stamp(name) {
            backups.push((stamp, path));
        }
    }

    // Newest first, with the file name as a deterministic tie-breaker so that
    // backups sharing a timestamp are never ordered by `read_dir` iteration.
    backups.sort_by(|left, right| right.0.cmp(&left.0).then_with(|| right.1.cmp(&left.1)));

    let keep = keep as usize;
    let mut doomed: Vec<PathBuf> = backups.into_iter().skip(keep).map(|(_, path)| path).collect();

    if let Some(protected) = protect {
        let before = doomed.len();
        doomed.retain(|path| path != protected);
        if doomed.len() != before {
            log::info!(
                "Keeping new backup {} even though it is not among the {} newest",
                protected.display(),
                keep
            );
        }
    }

    for path in doomed {
        match std::fs::remove_file(&path) {
            Ok(()) => {
                log::info!("Deleted old backup {}", path.display());
                summary.deleted.push(path);
            }
            Err(error) => summary.failed.push((path, error.to_string())),
        }
    }

    summary.log_failures();
    Ok(summary)
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
    let path = directory.join(format!(
        "{BACKUP_FILE_PREFIX}-{}-{timestamp}{BACKUP_FILE_EXTENSION}",
        kind.label()
    ));
    // Written under a name the pruner does not recognise, so a failed or
    // interrupted backup never leaves a truncated file looking like a real one.
    let temporary = directory.join(format!(
        "{BACKUP_FILE_PREFIX}-{}-{timestamp}{INCOMPLETE_BACKUP_SUFFIX}",
        kind.label()
    ));

    let written = (|| -> Result<(), AppError> {
        let mut destination = Connection::open(&temporary).map_err(|error| {
            AppError::InternalError(format!("Could not create backup: {error}"))
        })?;
        {
            let backup = Backup::new(conn, &mut destination).map_err(|error| {
                AppError::InternalError(format!("Could not start backup: {error}"))
            })?;
            backup
                .run_to_completion(500, Duration::ZERO, None)
                .map_err(|error| AppError::InternalError(format!("Backup failed: {error}")))?;
        }
        // `Backup` and the destination connection must both be released before
        // the rename, otherwise Windows refuses to move the still-open file.
        drop(destination);
        Ok(())
    })();

    if let Err(error) = written {
        let _ = std::fs::remove_file(&temporary);
        return Err(error);
    }

    if path.exists() {
        let _ = std::fs::remove_file(&path);
    }
    if let Err(error) = std::fs::rename(&temporary, &path) {
        let _ = std::fs::remove_file(&temporary);
        return Err(AppError::InternalError(format!(
            "Could not finalize backup file: {error}"
        )));
    }

    let now = Utc::now().to_rfc3339();
    let daily_date =
        matches!(kind, BackupKind::Daily).then(|| Local::now().format("%Y-%m-%d").to_string());
    settings_repository::set_backup_timestamp(conn, &now, daily_date.as_deref())?;
    log::info!("{} backup saved to {}", kind.label(), path.display());

    let keep_count = settings_repository::get_backup_settings(conn).keep_count;
    if let Err(error) = prune_old_backups(directory, keep_count, Some(&path)) {
        log::warn!("Could not remove old backups: {error}");
    }

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

    fn scratch_folder() -> PathBuf {
        let directory = std::env::temp_dir().join(format!("gym-pos-prune-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&directory).unwrap();
        directory
    }

    fn touch(directory: &Path, name: &str) -> PathBuf {
        let path = directory.join(name);
        std::fs::write(&path, "backup").unwrap();
        path
    }

    fn remaining_names(directory: &Path) -> Vec<String> {
        let mut names: Vec<String> = std::fs::read_dir(directory)
            .unwrap()
            .map(|entry| entry.unwrap().file_name().to_string_lossy().to_string())
            .collect();
        names.sort();
        names
    }

    #[test]
    fn prunes_old_backups_and_keeps_newest_across_kinds() {
        let directory = scratch_folder();
        for name in [
            "GymBackup-manual-20260101-090000.db",
            "GymBackup-daily-20260102-090000.db",
            "GymBackup-closing-20260103-090000.db",
            "GymBackup-daily-20260104-090000.db",
            "GymBackup-manual-20260105-090000.db",
        ] {
            touch(&directory, name);
        }

        let summary = prune_old_backups(&directory, 3, None).unwrap();

        assert_eq!(summary.deleted.len(), 2);
        assert!(summary.failed.is_empty());
        assert_eq!(
            remaining_names(&directory),
            vec![
                "GymBackup-closing-20260103-090000.db",
                "GymBackup-daily-20260104-090000.db",
                "GymBackup-manual-20260105-090000.db",
            ]
        );

        std::fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn pruning_ignores_files_it_did_not_create() {
        let directory = scratch_folder();
        touch(&directory, "GymBackup-manual-20260101-090000.db");
        touch(&directory, "notes.txt");
        touch(&directory, "some-other-backup.db");
        touch(&directory, "GymBackup-weekend-20260102-090000.db");
        touch(&directory, "GymBackup-daily-2026010-090000.db");
        touch(&directory, "GymBackup-daily-20260102-090000.db.bak");

        prune_old_backups(&directory, 1, None).unwrap();

        assert_eq!(remaining_names(&directory).len(), 6);

        std::fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn pruning_keeps_everything_when_disabled() {
        let directory = scratch_folder();
        for index in 1..=5 {
            touch(
                &directory,
                &format!("GymBackup-daily-2026010{index}-090000.db"),
            );
        }

        let summary = prune_old_backups(&directory, 0, None).unwrap();

        assert!(summary.deleted.is_empty());
        assert_eq!(remaining_names(&directory).len(), 5);

        std::fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn pruning_orders_by_time_not_by_kind_name() {
        let directory = scratch_folder();
        touch(&directory, "GymBackup-daily-20260102-235959.db");
        touch(&directory, "GymBackup-closing-20260103-000001.db");

        let summary = prune_old_backups(&directory, 1, None).unwrap();

        assert_eq!(summary.deleted.len(), 1);
        assert!(directory.join("GymBackup-closing-20260103-000001.db").exists());
        assert!(!directory.join("GymBackup-daily-20260102-235959.db").exists());

        std::fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn backup_prunes_previous_files_down_to_the_configured_count() {
        let conn = source_database();
        let directory = scratch_folder();
        conn.execute(
            "INSERT INTO settings (key, value, created_at, updated_at)
             VALUES ('backup_keep_count', '2', 'now', 'now')",
            [],
        )
        .unwrap();

        for name in [
            "GymBackup-daily-20260101-090000.db",
            "GymBackup-daily-20260102-090000.db",
        ] {
            touch(&directory, name);
        }
        create_backup(&conn, &directory, BackupKind::Manual).unwrap();

        let remaining = remaining_names(&directory);
        assert_eq!(remaining.len(), 2);
        assert!(remaining.iter().any(|name| name.starts_with("GymBackup-manual-")));

        std::fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn parser_rejects_impossible_calendar_dates_and_times() {
        // Second 60 is deliberately absent: chrono parses it as a leap second,
        // and rejecting it would make a real backup permanently unprunable.
        for name in [
            "GymBackup-daily-20261301-090000.db",
            "GymBackup-daily-20260230-090000.db",
            "GymBackup-daily-20260101-250000.db",
            "GymBackup-daily-20260101-096000.db",
        ] {
            assert!(parse_backup_stamp(name).is_none(), "{name} should be rejected");
        }
    }

    #[test]
    fn parser_accepts_real_dates_including_leap_day() {
        for name in [
            "GymBackup-daily-20260101-000000.db",
            "GymBackup-daily-20240229-235959.db",
            "GymBackup-closing-20261231-120000.db",
        ] {
            assert!(parse_backup_stamp(name).is_some(), "{name} should be accepted");
        }
    }

    #[test]
    fn incomplete_backup_is_never_treated_as_a_prunable_backup() {
        let name = format!("GymBackup-manual-20260101-090000{INCOMPLETE_BACKUP_SUFFIX}");
        assert!(parse_backup_stamp(&name).is_none());
    }

    #[test]
    fn pruning_keeps_the_protected_backup_even_when_it_is_the_oldest() {
        let directory = scratch_folder();
        let protected = touch(&directory, "GymBackup-daily-20260101-090000.db");
        touch(&directory, "GymBackup-daily-20260102-090000.db");
        touch(&directory, "GymBackup-daily-20260103-090000.db");

        let summary = prune_old_backups(&directory, 1, Some(&protected)).unwrap();

        assert_eq!(summary.deleted.len(), 1);
        assert!(protected.exists());
        assert_eq!(
            remaining_names(&directory),
            vec![
                "GymBackup-daily-20260101-090000.db",
                "GymBackup-daily-20260103-090000.db",
            ]
        );

        std::fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn pruning_is_deterministic_when_timestamps_match() {
        let directory = scratch_folder();
        let keep_run = || {
            for name in [
                "GymBackup-daily-20260101-090000.db",
                "GymBackup-manual-20260101-090000.db",
                "GymBackup-closing-20260101-090000.db",
            ] {
                touch(&directory, name);
            }
            let summary = prune_old_backups(&directory, 1, None).unwrap();
            let remaining = remaining_names(&directory);
            for entry in std::fs::read_dir(&directory).unwrap() {
                std::fs::remove_file(entry.unwrap().path()).unwrap();
            }
            (summary.deleted.len(), remaining)
        };

        let first = keep_run();
        for _ in 0..8 {
            assert_eq!(keep_run(), first, "pruning must not depend on read_dir order");
        }
        assert_eq!(first, (2, vec!["GymBackup-manual-20260101-090000.db".to_string()]));

        std::fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn successful_backup_leaves_no_incomplete_file_behind() {
        let conn = source_database();
        let directory = scratch_folder();

        let path = create_backup(&conn, &directory, BackupKind::Daily).unwrap();

        assert_eq!(remaining_names(&directory).len(), 1);
        assert!(parse_backup_stamp(
            path.file_name().and_then(|name| name.to_str()).unwrap()
        )
        .is_some());

        std::fs::remove_dir_all(directory).unwrap();
    }
}
