use rusqlite::Connection;

use crate::errors::AppError;
use crate::utils::dates::now_iso8601;

struct Migration {
    id: &'static str,
    sql: &'static str,
}

fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            id: "001_initial_schema",
            sql: include_str!("001_initial_schema.sql"),
        },
        Migration {
            id: "002_add_payment_void",
            sql: include_str!("002_add_payment_void.sql"),
        },
        Migration {
            id: "003_add_expense_fields",
            sql: include_str!("003_add_expense_fields.sql"),
        },
        Migration {
            id: "004_add_payment_fields",
            sql: include_str!("004_add_payment_fields.sql"),
        },
        Migration {
            id: "005_add_member_admission_fee",
            sql: include_str!("005_add_member_admission_fee.sql"),
        },
        Migration {
            id: "006_add_member_initial_plan",
            sql: include_str!("006_add_member_initial_plan.sql"),
        },
        Migration {
            id: "007_payment_allocations",
            sql: include_str!("007_payment_allocations.sql"),
        },
        Migration {
            id: "008_monthly_membership_billing",
            sql: include_str!("008_monthly_membership_billing.sql"),
        },
        Migration {
            id: "009_plan_duration_billing_cycles",
            sql: include_str!("009_plan_duration_billing_cycles.sql"),
        },
    ]
}

pub fn run_migrations(conn: &mut Connection) -> Result<(), AppError> {
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
