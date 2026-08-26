use rusqlite::Connection;

use crate::errors::AppError;
use crate::utils::dates::now_iso8601;

struct Migration {
    id: &'static str,
    sql: &'static str,
}

fn get_migrations() -> Vec<Migration> {
    vec![Migration {
        id: "001_initial_schema",
        sql: include_str!("001_initial_schema.sql"),
    }]
}

pub fn run_migrations(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            id         TEXT PRIMARY KEY NOT NULL,
            applied_at TEXT NOT NULL
        );",
    )?;

    let applied: Vec<String> = conn
        .prepare("SELECT id FROM schema_migrations")?
        .query_map([], |row| row.get(0))?
        .filter_map(|r| r.ok())
        .collect();

    for migration in get_migrations() {
        if !applied.contains(&migration.id.to_string()) {
            let tx = conn.transaction()?;
            tx.execute_batch(migration.sql)?;
            tx.execute(
                "INSERT INTO schema_migrations (id, applied_at) VALUES (?1, ?2)",
                rusqlite::params![migration.id, now_iso8601()],
            )?;
            tx.commit()?;
            log::info!("Applied migration: {}", migration.id);
        }
    }

    Ok(())
}
