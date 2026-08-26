use std::path::Path;
use std::sync::Mutex;

use rusqlite::Connection;

use crate::errors::AppError;

use super::migrations;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(conn: Connection) -> Self {
        Self {
            conn: Mutex::new(conn),
        }
    }

    pub fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().unwrap()
    }
}

pub fn init_db(db_path: &Path) -> Result<Connection, AppError> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    migrations::run_migrations(&conn)?;
    Ok(conn)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;")
            .unwrap();
        migrations::run_migrations(&conn).unwrap();
        conn
    }

    #[test]
    fn should_initialize_database_with_all_tables() {
        let conn = test_db();
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(tables.contains(&"members".to_string()));
        assert!(tables.contains(&"membership_plans".to_string()));
        assert!(tables.contains(&"payments".to_string()));
        assert!(tables.contains(&"expenses".to_string()));
        assert!(tables.contains(&"receipts".to_string()));
        assert!(tables.contains(&"settings".to_string()));
        assert!(tables.contains(&"schema_migrations".to_string()));
    }

    #[test]
    fn should_enforce_foreign_keys() {
        let conn = test_db();
        let result = conn.execute(
            "INSERT INTO payments (id, receipt_number, member_id, amount, payment_method, \
             payment_date, membership_plan_id, membership_start_date, membership_expiry_date, \
             created_at, updated_at) VALUES ('p1', 'RCP-001', 'nonexistent', 1000, 'Cash', \
             '2026-01-01', 'plan1', '2026-01-01', '2026-02-01', '2026-01-01T00:00:00Z', \
             '2026-01-01T00:00:00Z')",
            [],
        );
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_zero_amount_payments() {
        let conn = test_db();

        conn.execute(
            "INSERT INTO members (id, member_number, full_name, is_archived, created_at, \
             updated_at) VALUES ('m1', 'GYM-000001', 'Test', 0, '2026-01-01T00:00:00Z', \
             '2026-01-01T00:00:00Z')",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO membership_plans (id, name, duration_days, price, is_active, \
             created_at, updated_at) VALUES ('plan1', 'Monthly', 30, 2000, 1, \
             '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
            [],
        )
        .unwrap();

        let result = conn.execute(
            "INSERT INTO payments (id, receipt_number, member_id, amount, payment_method, \
             payment_date, membership_plan_id, membership_start_date, membership_expiry_date, \
             created_at, updated_at) VALUES ('p1', 'RCP-002', 'm1', 0, 'Cash', '2026-01-01', \
             'plan1', '2026-01-01', '2026-02-01', '2026-01-01T00:00:00Z', \
             '2026-01-01T00:00:00Z')",
            [],
        );
        assert!(result.is_err());
    }

    #[test]
    fn should_run_migrations_idempotently() {
        let conn = test_db();
        migrations::run_migrations(&conn).unwrap();
        migrations::run_migrations(&conn).unwrap();
    }
}
