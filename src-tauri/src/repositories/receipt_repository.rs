use rusqlite::{params, Connection};

use crate::errors::AppError;
use crate::models::Receipt;

pub fn create(conn: &Connection, receipt: &Receipt) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO receipts (id, receipt_number, payment_id, issued_at, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            receipt.id,
            receipt.receipt_number,
            receipt.payment_id,
            receipt.issued_at,
            receipt.created_at,
        ],
    )?;
    Ok(())
}

pub fn get_by_payment_id(conn: &Connection, payment_id: &str) -> Result<Option<Receipt>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, receipt_number, payment_id, issued_at, created_at \
         FROM receipts WHERE payment_id = ?1 LIMIT 1",
    )?;
    let mut rows = stmt.query(params![payment_id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(Receipt {
            id: row.get(0)?,
            receipt_number: row.get(1)?,
            payment_id: row.get(2)?,
            issued_at: row.get(3)?,
            created_at: row.get(4)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn get_by_receipt_number(
    conn: &Connection,
    receipt_number: &str,
) -> Result<Option<Receipt>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, receipt_number, payment_id, issued_at, created_at \
         FROM receipts WHERE receipt_number = ?1 LIMIT 1",
    )?;
    let mut rows = stmt.query(params![receipt_number])?;
    if let Some(row) = rows.next()? {
        Ok(Some(Receipt {
            id: row.get(0)?,
            receipt_number: row.get(1)?,
            payment_id: row.get(2)?,
            issued_at: row.get(3)?,
            created_at: row.get(4)?,
        }))
    } else {
        Ok(None)
    }
}

#[allow(dead_code)]
pub fn next_receipt_number(conn: &Connection) -> Result<String, AppError> {
    let max_num: Option<i64> = conn
        .query_row(
            "SELECT MAX(CAST(SUBSTR(receipt_number, 5) AS INTEGER)) FROM receipts",
            [],
            |row| row.get(0),
        )
        .unwrap_or(None);

    let next = max_num.unwrap_or(0) + 1;
    Ok(format!("RCP-{:06}", next))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrations;
    use crate::utils::dates::now_iso8601;

    fn test_db() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&mut conn).unwrap();
        conn
    }

    fn insert_test_payment(conn: &Connection) -> String {
        let member_id = uuid::Uuid::new_v4().to_string();
        let plan_id = uuid::Uuid::new_v4().to_string();
        let payment_id = uuid::Uuid::new_v4().to_string();
        let now = now_iso8601();

        conn.execute(
            "INSERT INTO members (id, member_number, full_name, is_archived, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 0, ?4, ?5)",
            params![member_id, "GYM-000001", "Test Member", now, now],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO membership_plans (id, name, duration_days, price, is_active, created_at, updated_at) \
             VALUES (?1, ?2, 30, 2000, 1, ?3, ?4)",
            params![plan_id, "Monthly", now, now],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO payments (id, receipt_number, member_id, amount, payment_method, \
             payment_date, membership_plan_id, membership_start_date, membership_expiry_date, \
             created_at, updated_at) \
             VALUES (?1, ?2, ?3, 2000, 'Cash', '2025-01-15', ?4, '2025-01-15', '2025-02-15', ?5, ?6)",
            params![payment_id, "RCP-000001", member_id, plan_id, now, now],
        )
        .unwrap();

        payment_id
    }

    fn make_receipt(payment_id: &str, num: &str) -> Receipt {
        let now = now_iso8601();
        Receipt {
            id: uuid::Uuid::new_v4().to_string(),
            receipt_number: num.to_string(),
            payment_id: payment_id.to_string(),
            issued_at: now.clone(),
            created_at: now,
        }
    }

    #[test]
    fn should_create_receipt() {
        let conn = test_db();
        let payment_id = insert_test_payment(&conn);
        let receipt = make_receipt(&payment_id, "RCP-000001");
        create(&conn, &receipt).unwrap();

        let found = get_by_payment_id(&conn, &payment_id).unwrap().unwrap();
        assert_eq!(found.receipt_number, "RCP-000001");
        assert_eq!(found.payment_id, payment_id);
    }

    #[test]
    fn should_get_receipt_by_payment_id() {
        let conn = test_db();
        let payment_id = insert_test_payment(&conn);
        let receipt = make_receipt(&payment_id, "RCP-000001");
        create(&conn, &receipt).unwrap();

        let found = get_by_payment_id(&conn, &payment_id).unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, receipt.id);
    }

    #[test]
    fn should_return_none_for_nonexistent_payment() {
        let conn = test_db();
        let result = get_by_payment_id(&conn, "nonexistent").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn should_get_receipt_by_receipt_number() {
        let conn = test_db();
        let payment_id = insert_test_payment(&conn);
        let receipt = make_receipt(&payment_id, "RCP-000042");
        create(&conn, &receipt).unwrap();

        let found = get_by_receipt_number(&conn, "RCP-000042").unwrap().unwrap();
        assert_eq!(found.payment_id, payment_id);
    }

    #[test]
    fn should_generate_sequential_receipt_numbers() {
        let conn = test_db();
        let num1 = next_receipt_number(&conn).unwrap();
        assert_eq!(num1, "RCP-000001");

        let payment_id = insert_test_payment(&conn);
        let receipt = make_receipt(&payment_id, &num1);
        create(&conn, &receipt).unwrap();

        let num2 = next_receipt_number(&conn).unwrap();
        assert_eq!(num2, "RCP-000002");
    }
}
