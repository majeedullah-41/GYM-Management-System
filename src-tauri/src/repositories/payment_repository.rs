use rusqlite::{params, Connection};

use crate::errors::AppError;
use crate::models::Payment;
use crate::utils::dates::now_iso8601;

pub fn create(conn: &Connection, payment: &Payment) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO payments (id, receipt_number, member_id, amount, payment_method, \
         payment_date, membership_plan_id, membership_start_date, membership_expiry_date, \
         notes, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            payment.id,
            payment.receipt_number,
            payment.member_id,
            payment.amount,
            payment.payment_method,
            payment.payment_date,
            payment.membership_plan_id,
            payment.membership_start_date,
            payment.membership_expiry_date,
            payment.notes,
            payment.created_at,
            payment.updated_at,
        ],
    )?;
    Ok(())
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Option<Payment>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, receipt_number, member_id, amount, payment_method, payment_date, \
         membership_plan_id, membership_start_date, membership_expiry_date, notes, \
         created_at, updated_at \
         FROM payments WHERE id = ?1",
    )?;
    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(row_to_payment(row)?))
    } else {
        Ok(None)
    }
}

pub fn list(
    conn: &Connection,
    search: &str,
    date_from: Option<&str>,
    date_to: Option<&str>,
) -> Result<Vec<Payment>, AppError> {
    let mut conditions = Vec::new();
    let mut param_values: Vec<String> = Vec::new();

    if !search.is_empty() {
        conditions.push(
            "(p.receipt_number LIKE ?1 OR m.full_name LIKE ?1 OR m.member_number LIKE ?1 OR m.phone LIKE ?1)"
                .to_string(),
        );
        param_values.push(format!("%{}%", search));
    }

    if let Some(from) = date_from {
        conditions.push("p.payment_date >= ?".to_string());
        param_values.push(from.to_string());
    }

    if let Some(to) = date_to {
        conditions.push("p.payment_date <= ?".to_string());
        param_values.push(to.to_string());
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT p.id, p.receipt_number, p.member_id, p.amount, p.payment_method, \
         p.payment_date, p.membership_plan_id, p.membership_start_date, \
         p.membership_expiry_date, p.notes, p.created_at, p.updated_at \
         FROM payments p \
         LEFT JOIN members m ON m.id = p.member_id \
         {} \
         ORDER BY p.payment_date DESC, p.created_at DESC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql)?;
    let mut payments = Vec::new();

    let params: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|s| s as &dyn rusqlite::types::ToSql)
        .collect();
    let mut rows = stmt.query(params.as_slice())?;
    while let Some(row) = rows.next()? {
        payments.push(row_to_payment(row)?);
    }

    Ok(payments)
}

pub fn list_by_member(conn: &Connection, member_id: &str) -> Result<Vec<Payment>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, receipt_number, member_id, amount, payment_method, payment_date, \
         membership_plan_id, membership_start_date, membership_expiry_date, notes, \
         created_at, updated_at \
         FROM payments WHERE member_id = ?1 \
         ORDER BY payment_date DESC, created_at DESC",
    )?;
    let mut payments = Vec::new();
    let mut rows = stmt.query(params![member_id])?;
    while let Some(row) = rows.next()? {
        payments.push(row_to_payment(row)?);
    }
    Ok(payments)
}

pub fn total_paid_for_plan(
    conn: &Connection,
    member_id: &str,
    plan_id: &str,
) -> Result<i64, AppError> {
    let total: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM payments \
         WHERE member_id = ?1 AND membership_plan_id = ?2",
        params![member_id, plan_id],
        |row| row.get(0),
    )?;
    Ok(total)
}

pub fn next_receipt_number(conn: &Connection) -> Result<String, AppError> {
    let max_num: Option<i64> = conn
        .query_row(
            "SELECT MAX(CAST(SUBSTR(receipt_number, 5) AS INTEGER)) FROM payments",
            [],
            |row| row.get(0),
        )
        .unwrap_or(None);

    let next = max_num.unwrap_or(0) + 1;
    Ok(format!("RCP-{:06}", next))
}

fn row_to_payment(row: &rusqlite::Row) -> Result<Payment, rusqlite::Error> {
    Ok(Payment {
        id: row.get(0)?,
        receipt_number: row.get(1)?,
        member_id: row.get(2)?,
        amount: row.get(3)?,
        payment_method: row.get(4)?,
        payment_date: row.get(5)?,
        membership_plan_id: row.get(6)?,
        membership_start_date: row.get(7)?,
        membership_expiry_date: row.get(8)?,
        notes: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
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

    fn insert_test_member(conn: &Connection, name: &str) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        let now = now_iso8601();
        conn.execute(
            "INSERT INTO members (id, member_number, full_name, is_archived, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 0, ?4, ?5)",
            params![id, "GYM-000001", name, now, now],
        )
        .unwrap();
        id
    }

    fn insert_test_plan(conn: &Connection, name: &str, price: i64, days: i32) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        let now = now_iso8601();
        conn.execute(
            "INSERT INTO membership_plans (id, name, duration_days, price, is_active, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6)",
            params![id, name, days, price, now, now],
        )
        .unwrap();
        id
    }

    fn make_payment(member_id: &str, plan_id: &str, amount: i64) -> Payment {
        let now = now_iso8601();
        static COUNTER: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(1);
        let num = COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        Payment {
            id: uuid::Uuid::new_v4().to_string(),
            receipt_number: format!("RCP-{:06}", num),
            member_id: member_id.to_string(),
            amount,
            payment_method: "Cash".to_string(),
            payment_date: "2025-01-15".to_string(),
            membership_plan_id: plan_id.to_string(),
            membership_start_date: "2025-01-15".to_string(),
            membership_expiry_date: "2025-02-15".to_string(),
            notes: None,
            created_at: now.clone(),
            updated_at: now,
        }
    }

    #[test]
    fn should_create_payment() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        let payment = make_payment(&member_id, &plan_id, 2000);
        create(&conn, &payment).unwrap();

        let fetched = get_by_id(&conn, &payment.id).unwrap().unwrap();
        assert_eq!(fetched.amount, 2000);
        assert_eq!(fetched.payment_method, "Cash");
    }

    #[test]
    fn should_get_payment_by_id() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        let payment = make_payment(&member_id, &plan_id, 1500);
        create(&conn, &payment).unwrap();

        let result = get_by_id(&conn, &payment.id).unwrap();
        assert!(result.is_some());
        assert_eq!(result.unwrap().amount, 1500);
    }

    #[test]
    fn should_return_none_for_nonexistent_payment() {
        let conn = test_db();
        let result = get_by_id(&conn, "nonexistent").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn should_list_payments() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        create(&conn, &make_payment(&member_id, &plan_id, 2000)).unwrap();
        create(&conn, &make_payment(&member_id, &plan_id, 1000)).unwrap();

        let payments = list(&conn, "", None, None).unwrap();
        assert_eq!(payments.len(), 2);
    }

    #[test]
    fn should_list_payments_by_member() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        create(&conn, &make_payment(&member_id, &plan_id, 2000)).unwrap();
        create(&conn, &make_payment(&member_id, &plan_id, 500)).unwrap();

        let payments = list_by_member(&conn, &member_id).unwrap();
        assert_eq!(payments.len(), 2);
    }

    #[test]
    fn should_calculate_total_paid_for_plan() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        create(&conn, &make_payment(&member_id, &plan_id, 500)).unwrap();
        create(&conn, &make_payment(&member_id, &plan_id, 700)).unwrap();

        let total = total_paid_for_plan(&conn, &member_id, &plan_id).unwrap();
        assert_eq!(total, 1200);
    }

    #[test]
    fn should_return_zero_for_no_payments() {
        let conn = test_db();
        let total = total_paid_for_plan(&conn, "nonexistent", "nonexistent").unwrap();
        assert_eq!(total, 0);
    }

    #[test]
    fn should_generate_sequential_receipt_numbers() {
        let conn = test_db();
        let num1 = next_receipt_number(&conn).unwrap();
        assert_eq!(num1, "RCP-000001");

        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        let mut payment = make_payment(&member_id, &plan_id, 2000);
        payment.receipt_number = num1.clone();
        create(&conn, &payment).unwrap();

        let num2 = next_receipt_number(&conn).unwrap();
        assert_eq!(num2, "RCP-000002");
    }

    #[test]
    fn should_search_payments_by_receipt() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        let mut payment = make_payment(&member_id, &plan_id, 2000);
        payment.receipt_number = "RCP-000123".to_string();
        create(&conn, &payment).unwrap();

        let results = list(&conn, "000123", None, None).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].receipt_number, "RCP-000123");
    }

    #[test]
    fn should_filter_by_date_range() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);

        let mut p1 = make_payment(&member_id, &plan_id, 2000);
        p1.payment_date = "2025-01-10".to_string();
        create(&conn, &p1).unwrap();

        let mut p2 = make_payment(&member_id, &plan_id, 1000);
        p2.payment_date = "2025-03-20".to_string();
        create(&conn, &p2).unwrap();

        let results = list(&conn, "", Some("2025-03-01"), Some("2025-12-31")).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].amount, 1000);
    }
}
