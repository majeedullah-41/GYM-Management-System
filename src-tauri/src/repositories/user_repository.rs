use rusqlite::{params, Connection, OptionalExtension};

use crate::errors::AppError;
use crate::models::User;

fn map_user(row: &rusqlite::Row<'_>) -> rusqlite::Result<User> {
    Ok(User {
        id: row.get(0)?,
        username: row.get(1)?,
        password_hash: row.get(2)?,
        security_question: row.get(3)?,
        security_answer_hash: row.get(4)?,
        uses_default_credentials: row.get(5)?,
        failed_login_attempts: row.get(6)?,
        login_locked_until: row.get(7)?,
        failed_recovery_attempts: row.get(8)?,
        recovery_locked_until: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
        password_changed_at: row.get(12)?,
    })
}

const USER_COLUMNS: &str = "id, username, password_hash, security_question, security_answer_hash, \
    uses_default_credentials, failed_login_attempts, login_locked_until, failed_recovery_attempts, recovery_locked_until, \
    created_at, updated_at, password_changed_at";

pub fn count(conn: &Connection) -> Result<i64, AppError> {
    Ok(conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))?)
}

pub fn get_only(conn: &Connection) -> Result<Option<User>, AppError> {
    let sql = format!("SELECT {USER_COLUMNS} FROM users LIMIT 1");
    Ok(conn.query_row(&sql, [], map_user).optional()?)
}

pub fn find_by_username(conn: &Connection, username: &str) -> Result<Option<User>, AppError> {
    let sql = format!("SELECT {USER_COLUMNS} FROM users WHERE username = ?1 COLLATE NOCASE");
    Ok(conn
        .query_row(&sql, params![username], map_user)
        .optional()?)
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<Option<User>, AppError> {
    let sql = format!("SELECT {USER_COLUMNS} FROM users WHERE id = ?1");
    Ok(conn.query_row(&sql, params![id], map_user).optional()?)
}

pub fn create(conn: &Connection, user: &User) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO users (id, username, password_hash, security_question, security_answer_hash, \
         uses_default_credentials, created_at, updated_at, password_changed_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            user.id,
            user.username,
            user.password_hash,
            user.security_question,
            user.security_answer_hash,
            user.uses_default_credentials,
            user.created_at,
            user.updated_at,
            user.password_changed_at
        ],
    )?;
    Ok(())
}

pub fn record_login_failure(
    conn: &Connection,
    id: &str,
    attempts: i64,
    locked_until: Option<&str>,
    now: &str,
) -> Result<(), AppError> {
    conn.execute("UPDATE users SET failed_login_attempts=?2, login_locked_until=?3, last_failed_login_at=?4, updated_at=?4 WHERE id=?1",
        params![id, attempts, locked_until, now])?;
    Ok(())
}

pub fn clear_login_failures(conn: &Connection, id: &str, now: &str) -> Result<(), AppError> {
    conn.execute("UPDATE users SET failed_login_attempts=0, last_failed_login_at=NULL, login_locked_until=NULL, updated_at=?2 WHERE id=?1", params![id, now])?;
    Ok(())
}

pub fn record_recovery_failure(
    conn: &Connection,
    id: &str,
    attempts: i64,
    locked_until: Option<&str>,
    now: &str,
) -> Result<(), AppError> {
    conn.execute("UPDATE users SET failed_recovery_attempts=?2, recovery_locked_until=?3, last_failed_recovery_at=?4, updated_at=?4 WHERE id=?1",
        params![id, attempts, locked_until, now])?;
    Ok(())
}

pub fn clear_recovery_failures(conn: &Connection, id: &str, now: &str) -> Result<(), AppError> {
    conn.execute("UPDATE users SET failed_recovery_attempts=0, last_failed_recovery_at=NULL, recovery_locked_until=NULL, updated_at=?2 WHERE id=?1", params![id, now])?;
    Ok(())
}

pub fn update_username(
    conn: &Connection,
    id: &str,
    username: &str,
    now: &str,
) -> Result<(), AppError> {
    conn.execute(
        "UPDATE users SET username=?2, uses_default_credentials=0, updated_at=?3 WHERE id=?1",
        params![id, username, now],
    )?;
    Ok(())
}

pub fn update_password(conn: &Connection, id: &str, hash: &str, now: &str) -> Result<(), AppError> {
    conn.execute("UPDATE users SET password_hash=?2, uses_default_credentials=0, password_changed_at=?3, updated_at=?3, failed_login_attempts=0, login_locked_until=NULL WHERE id=?1",
        params![id, hash, now])?;
    Ok(())
}

pub fn update_security_question(
    conn: &Connection,
    id: &str,
    question: &str,
    answer_hash: &str,
    now: &str,
) -> Result<(), AppError> {
    conn.execute("UPDATE users SET security_question=?2, security_answer_hash=?3, updated_at=?4, failed_recovery_attempts=0, recovery_locked_until=NULL WHERE id=?1",
        params![id, question, answer_hash, now])?;
    Ok(())
}
