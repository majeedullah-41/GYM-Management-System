use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use chrono::{Local, NaiveDate, NaiveTime, Utc};
use rusqlite::backup::Backup;
use rusqlite::{Connection, OpenFlags};

use crate::database::migrations;
use crate::errors::AppError;
use crate::repositories::settings_repository;
use crate::services::auth_service;

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
/// Files that this module did not create are never touched. Every path in
/// `protect` is always kept, even if it sorts older than the `keep` newest.
pub fn prune_old_backups(
    directory: &Path,
    keep: u32,
    protect: &[PathBuf],
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

    let before = doomed.len();
    doomed.retain(|path| !protect.contains(path));
    if doomed.len() != before {
        log::info!(
            "Kept {} older backup(s) that must survive pruning",
            before - doomed.len()
        );
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

fn ensure_backup_directory(directory: &Path) -> Result<(), AppError> {
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
    Ok(())
}

/// Copies `conn` into `directory/file_name`. The copy is assembled under a name
/// the pruner does not recognise, so a failed or interrupted backup never leaves
/// a truncated file looking like a real one.
fn write_backup_file(
    conn: &Connection,
    directory: &Path,
    file_name: &str,
) -> Result<PathBuf, AppError> {
    ensure_backup_directory(directory)?;

    let path = directory.join(file_name);
    let temporary = directory.join(format!("{file_name}{INCOMPLETE_BACKUP_SUFFIX}"));

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

    Ok(path)
}

fn backup_file_name(kind: BackupKind) -> String {
    format!(
        "{BACKUP_FILE_PREFIX}-{}-{timestamp}{BACKUP_FILE_EXTENSION}",
        kind.label(),
        timestamp = Local::now().format("%Y%m%d-%H%M%S"),
    )
}

pub fn create_backup(
    conn: &Connection,
    directory: &Path,
    kind: BackupKind,
) -> Result<PathBuf, AppError> {
    let path = write_backup_file(conn, directory, &backup_file_name(kind))?;

    let now = Utc::now().to_rfc3339();
    let daily_date =
        matches!(kind, BackupKind::Daily).then(|| Local::now().format("%Y-%m-%d").to_string());
    settings_repository::set_backup_timestamp(conn, &now, daily_date.as_deref())?;
    log::info!("{} backup saved to {}", kind.label(), path.display());

    let keep_count = settings_repository::get_backup_settings(conn).keep_count;
    if let Err(error) = prune_old_backups(directory, keep_count, &[path.clone()]) {
        log::warn!("Could not remove old backups: {error}");
    }

    Ok(path)
}

/// Confirms `source` is a Gym POS backup rather than an arbitrary file, so a
/// mistyped selection can never be written over the live database.
fn open_verified_backup(source: &Path) -> Result<Connection, AppError> {
    if !source.is_file() {
        return Err(AppError::ValidationError(
            "The selected backup file no longer exists".into(),
        ));
    }
    let conn = Connection::open_with_flags(source, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|_| invalid_backup())?;
    let tables: Vec<String> = conn
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .map_err(|_| invalid_backup())?
        .query_map([], |row| row.get(0))
        .map_err(|_| invalid_backup())?
        .filter_map(|row| row.ok())
        .collect();
    for required in ["members", "schema_migrations"] {
        if !tables.iter().any(|name| name == required) {
            return Err(invalid_backup());
        }
    }

    // A backup from a newer build carries migrations this build cannot run, and
    // restoring it would leave the schema in a state the app cannot read.
    let known = migrations::known_ids();
    let applied: Vec<String> = conn
        .prepare("SELECT id FROM schema_migrations")
        .map_err(|_| invalid_backup())?
        .query_map([], |row| row.get(0))
        .map_err(|_| invalid_backup())?
        .filter_map(|row| row.ok())
        .collect();
    if let Some(unknown) = applied.iter().find(|id| !known.contains(&id.as_str())) {
        return Err(AppError::ValidationError(format!(
            "This backup was created by a newer version of Gym POS and cannot be restored here ({unknown})"
        )));
    }

    Ok(conn)
}

fn invalid_backup() -> AppError {
    AppError::ValidationError(
        "The selected file is not a Gym POS backup. Pick a file created by 'Back Up Now'.".into(),
    )
}

#[derive(Debug)]
pub struct RestoreOutcome {
    /// Copy of the data that was live before the restore, kept so the restore can
    /// be undone. A restore without one is refused, so this is always present.
    pub safety_backup: PathBuf,
    pub source: PathBuf,
}

/// Replaces the live database with `source`.
///
/// The current data is copied to `safety_directory` first so a restore is always
/// reversible, then the backup is copied over the open connection through the
/// SQLite backup API — the live file is never replaced on disk, so the Windows
/// file lock on `gym.db` is not a problem. Finally the schema is brought up to
/// date, because a restore may rewind `schema_migrations`.
pub fn restore_backup(
    conn: &mut Connection,
    source: &Path,
    safety_directory: &Path,
) -> Result<RestoreOutcome, AppError> {
    let source_conn = open_verified_backup(source)?;

    let safety_backup = match write_backup_file(
        conn,
        safety_directory,
        &backup_file_name(BackupKind::Manual),
    ) {
        Ok(path) => {
            // The file being restored from must survive the pruning that the
            // safety copy triggers, even when only one backup is kept.
            let keep_count = settings_repository::get_backup_settings(conn).keep_count;
            if let Err(error) = prune_old_backups(
                safety_directory,
                keep_count,
                &[path.clone(), source.to_path_buf()],
            ) {
                log::warn!("Could not remove old backups: {error}");
            }
            log::info!("Safety backup saved to {} before restore", path.display());
            path
        }
        Err(error) => {
            // Losing the safety net is worse than losing the restore, so a
            // failure here aborts before the live data is touched.
            return Err(AppError::InternalError(format!(
                "Could not create a safety backup of the current data: {error}"
            )));
        }
    };

    {
        let backup = Backup::new(&source_conn, conn)
            .map_err(|error| AppError::InternalError(format!("Could not open backup: {error}")))?;
        backup
            .run_to_completion(500, Duration::ZERO, None)
            .map_err(|error| AppError::InternalError(format!("Restore failed: {error}")))?;
    }

    migrations::run_migrations(conn)?;
    auth_service::ensure_default_admin(conn)?;
    log::info!("Restored database from {}", source.display());

    Ok(RestoreOutcome {
        safety_backup,
        source: source.to_path_buf(),
    })
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

        let summary = prune_old_backups(&directory, 3, &[]).unwrap();

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

        prune_old_backups(&directory, 1, &[]).unwrap();

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

        let summary = prune_old_backups(&directory, 0, &[]).unwrap();

        assert!(summary.deleted.is_empty());
        assert_eq!(remaining_names(&directory).len(), 5);

        std::fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn pruning_orders_by_time_not_by_kind_name() {
        let directory = scratch_folder();
        touch(&directory, "GymBackup-daily-20260102-235959.db");
        touch(&directory, "GymBackup-closing-20260103-000001.db");

        let summary = prune_old_backups(&directory, 1, &[]).unwrap();

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

        let summary = prune_old_backups(&directory, 1, &[protected.clone()]).unwrap();

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
            let summary = prune_old_backups(&directory, 1, &[]).unwrap();
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

    fn gym_database(tag: &str) -> (PathBuf, Connection) {
        let path = std::env::temp_dir().join(format!("gym-pos-restore-{}-{}.db", tag, uuid::Uuid::new_v4()));
        let mut conn = Connection::open(&path).unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&mut conn).unwrap();
        (path, conn)
    }

    fn add_member(conn: &Connection, number: &str, name: &str) {
        conn.execute(
            "INSERT INTO members (id, member_number, full_name, is_archived, created_at, updated_at)
             VALUES (?1, ?2, ?3, 0, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
            rusqlite::params![uuid::Uuid::new_v4().to_string(), number, name],
        )
        .unwrap();
    }

    fn member_names(conn: &Connection) -> Vec<String> {
        let mut statement = conn
            .prepare("SELECT full_name FROM members ORDER BY full_name")
            .unwrap();
        let names = statement
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|row| row.ok())
            .collect();
        names
    }

    #[test]
    fn restore_reverts_live_data_and_keeps_the_previous_data_as_a_safety_copy() {
        let safety = scratch_folder();
        let (live_path, mut live) = gym_database("live");
        add_member(&live, "GYM-000001", "Live Member");
        let (source_path, source) = gym_database("source");
        add_member(&source, "GYM-000002", "Restored Member");

        let outcome = restore_backup(&mut live, &source_path, &safety).unwrap();

        assert_eq!(member_names(&live), vec!["Restored Member".to_string()]);
        let safety_path = outcome.safety_backup;
        let safety_copy = Connection::open(&safety_path).unwrap();
        assert_eq!(member_names(&safety_copy), vec!["Live Member".to_string()]);

        drop(safety_copy);
        drop(source);
        drop(live);
        std::fs::remove_dir_all(safety).unwrap();
        std::fs::remove_file(live_path).unwrap();
        std::fs::remove_file(source_path).unwrap();
    }

    #[test]
    fn restore_keeps_the_source_file_when_only_one_backup_is_kept() {
        let directory = scratch_folder();
        let (live_path, mut live) = gym_database("live-keep");
        live.execute(
            "INSERT INTO settings (key, value, created_at, updated_at)
             VALUES ('backup_keep_count', '1', 'now', 'now')",
            [],
        )
        .unwrap();
        // The restore source lives in the folder the safety copy is pruned in.
        let (source_origin, source_conn) = gym_database("keep-source");
        let source_path = directory.join("GymBackup-daily-20260101-090000.db");
        std::fs::copy(&source_origin, &source_path).unwrap();
        drop(source_conn);

        let outcome = restore_backup(&mut live, &source_path, &directory).unwrap();

        assert!(source_path.exists(), "the file being restored must survive pruning");
        assert!(outcome.safety_backup.exists());

        drop(live);
        std::fs::remove_dir_all(directory).unwrap();
        std::fs::remove_file(live_path).unwrap();
        std::fs::remove_file(source_origin).unwrap();
    }

    #[test]
    fn restore_rejects_files_that_are_not_gym_pos_backups() {
        let safety = scratch_folder();
        let (live_path, mut live) = gym_database("live-guard");
        add_member(&live, "GYM-000001", "Live Member");

        let not_a_database = scratch_folder().join("holiday-photo.db");
        std::fs::write(&not_a_database, b"not a database at all").unwrap();
        let error = restore_backup(&mut live, &not_a_database, &safety).unwrap_err();
        assert!(error.to_string().contains("not a Gym POS backup"), "got: {error}");

        let foreign_database = scratch_folder().join("contacts.db");
        Connection::open(&foreign_database)
            .unwrap()
            .execute_batch("CREATE TABLE contacts (id INTEGER PRIMARY KEY);")
            .unwrap();
        let error = restore_backup(&mut live, &foreign_database, &safety).unwrap_err();
        assert!(error.to_string().contains("not a Gym POS backup"), "got: {error}");

        let missing = scratch_folder().join("nowhere.db");
        let error = restore_backup(&mut live, &missing, &safety).unwrap_err();
        assert!(error.to_string().contains("no longer exists"), "got: {error}");

        assert_eq!(member_names(&live), vec!["Live Member".to_string()]);
        assert_eq!(remaining_names(&safety).len(), 0, "no copy without a restore");

        drop(live);
        std::fs::remove_dir_all(safety).unwrap();
        std::fs::remove_file(live_path).unwrap();
    }

    #[test]
    fn restore_rejects_a_backup_from_a_newer_build() {
        let safety = scratch_folder();
        let (live_path, mut live) = gym_database("live-newer");
        add_member(&live, "GYM-000001", "Live Member");
        let (source_path, source) = gym_database("source-newer");
        source
            .execute(
                "INSERT INTO schema_migrations (id, applied_at) VALUES ('999_from_the_future', 'now')",
                [],
            )
            .unwrap();
        drop(source);

        let error = restore_backup(&mut live, &source_path, &safety).unwrap_err();

        assert!(error.to_string().contains("newer version"), "got: {error}");
        assert_eq!(member_names(&live), vec!["Live Member".to_string()]);
        assert_eq!(remaining_names(&safety).len(), 0, "no copy without a restore");

        drop(live);
        std::fs::remove_dir_all(safety).unwrap();
        std::fs::remove_file(live_path).unwrap();
        std::fs::remove_file(source_path).unwrap();
    }

    #[test]
    fn restore_reapplies_migrations_missing_from_an_older_backup() {
        let safety = scratch_folder();
        let (live_path, mut live) = gym_database("live-schema");
        let (source_path, source) = gym_database("source-schema");
        add_member(&source, "GYM-000003", "Old Backup Member");
        // Rewind the source to the state before the admission date existed.
        source
            .execute_batch(
                "DELETE FROM schema_migrations WHERE id = '015_add_member_admission_date';
                 ALTER TABLE members DROP COLUMN admission_date;",
            )
            .unwrap();
        drop(source);

        restore_backup(&mut live, &source_path, &safety).unwrap();

        let applied: i64 = live
            .query_row(
                "SELECT COUNT(*) FROM schema_migrations WHERE id = '015_add_member_admission_date'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(applied, 1);
        let admission_date: Option<String> = live
            .query_row(
                "SELECT admission_date FROM members WHERE member_number = 'GYM-000003'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(admission_date.as_deref(), Some("2026-01-01"));

        drop(live);
        std::fs::remove_dir_all(safety).unwrap();
        std::fs::remove_file(live_path).unwrap();
        std::fs::remove_file(source_path).unwrap();
    }
}
