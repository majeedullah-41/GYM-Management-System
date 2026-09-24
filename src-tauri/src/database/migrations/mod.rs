use rusqlite::Connection;

use crate::errors::AppError;
use crate::utils::dates::now_iso8601;

struct Migration {
    id: &'static str,
    sql: &'static str,
    with_foreign_keys_off: bool,
}

fn get_migrations() -> Vec<Migration> {
    vec![
Migration {
            id: "001_initial_schema",
            sql: include_str!("001_initial_schema.sql"),
            with_foreign_keys_off: false,
        },
        Migration {
            id: "002_add_payment_void",
            sql: include_str!("002_add_payment_void.sql"),
            with_foreign_keys_off: false,
        },
        Migration {
            id: "003_add_expense_fields",
            sql: include_str!("003_add_expense_fields.sql"),
            with_foreign_keys_off: false,
        },
        Migration {
            id: "004_add_payment_fields",
            sql: include_str!("004_add_payment_fields.sql"),
            with_foreign_keys_off: false,
        },
        Migration {
            id: "005_add_member_admission_fee",
            sql: include_str!("005_add_member_admission_fee.sql"),
            with_foreign_keys_off: false,
        },
        Migration {
            id: "006_add_member_initial_plan",
            sql: include_str!("006_add_member_initial_plan.sql"),
            with_foreign_keys_off: false,
        },
        Migration {
            id: "007_payment_allocations",
            sql: include_str!("007_payment_allocations.sql"),
            with_foreign_keys_off: false,
        },
        Migration {
            id: "008_monthly_membership_billing",
            sql: include_str!("008_monthly_membership_billing.sql"),
            with_foreign_keys_off: false,
        },
        Migration {
            id: "009_plan_duration_billing_cycles",
            sql: include_str!("009_plan_duration_billing_cycles.sql"),
            with_foreign_keys_off: false,
        },
        Migration {
            id: "010_authentication",
            sql: include_str!("010_authentication.sql"),
            with_foreign_keys_off: false,
        },
        Migration {
            id: "011_optional_recovery_and_default_credentials",
            sql: include_str!("011_optional_recovery_and_default_credentials.sql"),
            with_foreign_keys_off: false,
        },
        Migration {
            id: "012_member_blood_group",
            sql: include_str!("012_member_blood_group.sql"),
            with_foreign_keys_off: false,
        },
        Migration {
            id: "013_permanently_deleted_members",
            sql: include_str!("013_permanently_deleted_members.sql"),
            with_foreign_keys_off: false,
        },
Migration {
            id: "014_payment_month",
            sql: include_str!("014_payment_month.sql"),
            with_foreign_keys_off: false,
        },
        Migration {
            id: "015_add_member_admission_date",
            sql: include_str!("015_add_member_admission_date.sql"),
            with_foreign_keys_off: false,
        },
        Migration {
            id: "016_payment_discounts",
            sql: include_str!("016_payment_discounts.sql"),
            with_foreign_keys_off: true,
        },
        Migration {
            id: "017_fix_payment_period_dates",
            sql: include_str!("017_fix_payment_period_dates.sql"),
            with_foreign_keys_off: false,
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
            if migration.with_foreign_keys_off {
                conn.execute_batch("PRAGMA foreign_keys = OFF;")?;
                conn.execute_batch("BEGIN TRANSACTION;")?;
                let result = (|| -> Result<(), AppError> {
                    conn.execute_batch(migration.sql)?;
                    conn.execute(
                        "INSERT INTO schema_migrations (id, applied_at) VALUES (?1, ?2)",
                        rusqlite::params![migration.id, now_iso8601()],
                    )?;
                    Ok(())
                })();
                if result.is_ok() {
                    conn.execute_batch("COMMIT;")?;
                } else {
                    conn.execute_batch("ROLLBACK;")?;
                }
                conn.execute_batch("PRAGMA foreign_keys = ON;")?;
                result?;
                log::info!("Applied migration: {}", migration.id);
                continue;
            }
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
