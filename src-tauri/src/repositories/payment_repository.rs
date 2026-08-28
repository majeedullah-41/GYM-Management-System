use rusqlite::{params, Connection};

use crate::errors::AppError;
use crate::models::Payment;

const SELECT_COLS: &str = "id, receipt_number, member_id, amount, payment_method, payment_date, \
     membership_plan_id, membership_start_date, membership_expiry_date, description, reference, \
     notes, is_voided, voided_at, void_reason, created_at, updated_at";

pub fn create(conn: &Connection, payment: &Payment) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO payments (id, receipt_number, member_id, amount, payment_method, \
         payment_date, membership_plan_id, membership_start_date, membership_expiry_date, \
         description, reference, notes, is_voided, voided_at, void_reason, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 0, NULL, NULL, ?13, ?14)",
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
            payment.description,
            payment.reference,
            payment.notes,
            payment.created_at,
            payment.updated_at,
        ],
    )?;
    Ok(())
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Option<Payment>, AppError> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {} FROM payments WHERE id = ?1",
        SELECT_COLS
    ))?;
    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(row_to_payment(row)?))
    } else {
        Ok(None)
    }
}

#[allow(clippy::too_many_arguments)]
pub fn list(
    conn: &Connection,
    search: &str,
    date_from: Option<&str>,
    date_to: Option<&str>,
    member_id: Option<&str>,
    plan_id: Option<&str>,
    status: Option<&str>,
) -> Result<Vec<Payment>, AppError> {
    let mut conditions = Vec::new();
    let mut param_values: Vec<String> = Vec::new();

    if !search.is_empty() {
        conditions.push(
            "(p.receipt_number LIKE ?1 OR m.full_name LIKE ?1 OR m.member_number LIKE ?1 \
             OR m.phone LIKE ?1 OR p.reference LIKE ?1 OR p.description LIKE ?1)"
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

    if let Some(member) = member_id {
        conditions.push("p.member_id = ?".to_string());
        param_values.push(member.to_string());
    }

    if let Some(plan) = plan_id {
        conditions.push("p.membership_plan_id = ?".to_string());
        param_values.push(plan.to_string());
    }

    if let Some(status) = status {
        match status {
            "valid" => conditions.push("p.is_voided = 0".to_string()),
            "voided" => conditions.push("p.is_voided = 1".to_string()),
            _ => {}
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT p.id, p.receipt_number, p.member_id, p.amount, p.payment_method, \
         p.payment_date, p.membership_plan_id, p.membership_start_date, \
         p.membership_expiry_date, p.description, p.reference, p.notes, p.is_voided, \
         p.voided_at, p.void_reason, p.created_at, p.updated_at \
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
    let mut stmt = conn.prepare(&format!(
        "SELECT {} FROM payments WHERE member_id = ?1 \
         ORDER BY payment_date DESC, created_at DESC",
        SELECT_COLS
    ))?;
    let mut payments = Vec::new();
    let mut rows = stmt.query(params![member_id])?;
    while let Some(row) = rows.next()? {
        payments.push(row_to_payment(row)?);
    }
    Ok(payments)
}

pub fn update_fields(
    conn: &Connection,
    id: &str,
    description: Option<String>,
    reference: Option<String>,
    notes: Option<String>,
    updated_at: &str,
) -> Result<(), AppError> {
    let rows = conn.execute(
        "UPDATE payments SET description = ?2, reference = ?3, notes = ?4, updated_at = ?5 \
         WHERE id = ?1",
        params![id, description, reference, notes, updated_at],
    )?;
    if rows == 0 {
        return Err(AppError::NotFoundError(format!(
            "Payment '{}' not found",
            id
        )));
    }
    Ok(())
}

pub fn total_paid_for_period(
    conn: &Connection,
    member_id: &str,
    plan_id: &str,
    start_date: &str,
    expiry_date: &str,
) -> Result<i64, AppError> {
    let total: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM payments \
         WHERE member_id = ?1 AND membership_plan_id = ?2 \
         AND membership_start_date = ?3 AND membership_expiry_date = ?4 \
         AND is_voided = 0",
        params![member_id, plan_id, start_date, expiry_date],
        |row| row.get(0),
    )?;
    Ok(total)
}

pub fn get_current_period(
    conn: &Connection,
    member_id: &str,
    plan_id: &str,
) -> Result<Option<(String, String)>, AppError> {
    let result = conn.query_row(
        "SELECT membership_start_date, membership_expiry_date FROM payments \
         WHERE member_id = ?1 AND membership_plan_id = ?2 AND is_voided = 0 \
         ORDER BY membership_start_date DESC LIMIT 1",
        params![member_id, plan_id],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
    );
    match result {
        Ok((s, e)) => Ok(Some((s, e))),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

pub fn get_total_outstanding(conn: &Connection) -> Result<i64, AppError> {
    let mut stmt = conn.prepare(
        "SELECT p.membership_plan_id, p.membership_start_date, p.membership_expiry_date, \
         mp.price \
         FROM (SELECT DISTINCT membership_plan_id, membership_start_date, membership_expiry_date \
               FROM payments WHERE is_voided = 0) p \
         JOIN membership_plans mp ON p.membership_plan_id = mp.id",
    )?;
    let mut total_outstanding: i64 = 0;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let plan_id: String = row.get(0)?;
        let start_date: String = row.get(1)?;
        let expiry_date: String = row.get(2)?;
        let plan_price: i64 = row.get(3)?;

        let total_paid: i64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM payments \
             WHERE membership_plan_id = ?1 AND membership_start_date = ?2 AND membership_expiry_date = ?3 \
             AND is_voided = 0",
            params![plan_id, start_date, expiry_date],
            |row| row.get(0),
        )?;

        if total_paid < plan_price {
            total_outstanding += plan_price - total_paid;
        }
    }
    Ok(total_outstanding)
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

pub fn void_payment(
    conn: &Connection,
    id: &str,
    reason: &str,
    voided_at: &str,
) -> Result<(), AppError> {
    let rows = conn.execute(
        "UPDATE payments SET is_voided = 1, void_reason = ?2, voided_at = ?3, updated_at = ?3 \
         WHERE id = ?1 AND is_voided = 0",
        params![id, reason, voided_at],
    )?;
    if rows == 0 {
        return Err(AppError::NotFoundError(format!(
            "Payment '{}' not found or already voided",
            id
        )));
    }
    Ok(())
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
        description: row.get(9)?,
        reference: row.get(10)?,
        notes: row.get(11)?,
        is_voided: row.get::<_, i32>(12)? != 0,
        voided_at: row.get(13)?,
        void_reason: row.get(14)?,
        created_at: row.get(15)?,
        updated_at: row.get(16)?,
    })
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
            description: None,
            reference: None,
            notes: None,
            is_voided: false,
            voided_at: None,
            void_reason: None,
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
        assert!(!fetched.is_voided);
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

        let payments = list(&conn, "", None, None, None, None, None).unwrap();
        assert_eq!(payments.len(), 2);
    }

    #[test]
    fn should_list_payments_by_member() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        create(&conn, &make_payment(&member_id, &plan_id, 2000)).unwrap();
        create(&conn, &make_payment(&member_id, &plan_id, 500)).unwrap();

        let payments = list(
            &conn,
            "",
            None,
            None,
            Some(&member_id),
            None,
            None,
        )
        .unwrap();
        assert_eq!(payments.len(), 2);
    }

    #[test]
    fn should_calculate_total_paid_for_period() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        create(&conn, &make_payment(&member_id, &plan_id, 500)).unwrap();
        create(&conn, &make_payment(&member_id, &plan_id, 700)).unwrap();

        let total = total_paid_for_period(
            &conn, &member_id, &plan_id, "2025-01-15", "2025-02-15",
        )
        .unwrap();
        assert_eq!(total, 1200);
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

        let results = list(&conn, "000123", None, None, None, None, None).unwrap();
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

        let results = list(
            &conn,
            "",
            Some("2025-03-01"),
            Some("2025-12-31"),
            None,
            None,
            None,
        )
        .unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].amount, 1000);
    }

    #[test]
    fn should_filter_by_plan() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        create(&conn, &make_payment(&member_id, &plan_id, 2000)).unwrap();

        let results = list(&conn, "", None, None, None, Some(&plan_id), None).unwrap();
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn should_filter_by_status_valid() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        let p1 = make_payment(&member_id, &plan_id, 2000);
        create(&conn, &p1).unwrap();
        let p2 = make_payment(&member_id, &plan_id, 1000);
        create(&conn, &p2).unwrap();
        void_payment(&conn, &p1.id, "Duplicate", "2025-06-01T00:00:00Z").unwrap();

        let valid = list(&conn, "", None, None, None, None, Some("valid")).unwrap();
        assert_eq!(valid.len(), 1);
        assert!(!valid[0].is_voided);

        let voided = list(&conn, "", None, None, None, None, Some("voided")).unwrap();
        assert_eq!(voided.len(), 1);
        assert!(voided[0].is_voided);
    }

    #[test]
    fn should_update_fields() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        let payment = make_payment(&member_id, &plan_id, 2000);
        create(&conn, &payment).unwrap();

        update_fields(
            &conn,
            &payment.id,
            Some("Monthly fee".to_string()),
            Some("TXN-123".to_string()),
            Some("Note".to_string()),
            "2025-06-01T00:00:00Z",
        )
        .unwrap();

        let fetched = get_by_id(&conn, &payment.id).unwrap().unwrap();
        assert_eq!(fetched.description.as_deref(), Some("Monthly fee"));
        assert_eq!(fetched.reference.as_deref(), Some("TXN-123"));
        assert_eq!(fetched.notes.as_deref(), Some("Note"));
    }

    #[test]
    fn should_void_payment() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        let payment = make_payment(&member_id, &plan_id, 2000);
        create(&conn, &payment).unwrap();

        void_payment(&conn, &payment.id, "Duplicate entry", "2025-06-01T00:00:00Z").unwrap();

        let fetched = get_by_id(&conn, &payment.id).unwrap().unwrap();
        assert!(fetched.is_voided);
        assert_eq!(fetched.void_reason.as_deref(), Some("Duplicate entry"));
    }

    #[test]
    fn should_exclude_voided_from_total_paid() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        let p1 = make_payment(&member_id, &plan_id, 500);
        create(&conn, &p1).unwrap();
        let p2 = make_payment(&member_id, &plan_id, 700);
        create(&conn, &p2).unwrap();

        void_payment(&conn, &p1.id, "Wrong amount", "2025-06-01T00:00:00Z").unwrap();

        let total = total_paid_for_period(
            &conn, &member_id, &plan_id, "2025-01-15", "2025-02-15",
        )
        .unwrap();
        assert_eq!(total, 700);
    }

    #[test]
    fn should_not_void_already_voided() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30);
        let payment = make_payment(&member_id, &plan_id, 2000);
        create(&conn, &payment).unwrap();

        void_payment(&conn, &payment.id, "First", "2025-06-01T00:00:00Z").unwrap();
        let result = void_payment(&conn, &payment.id, "Second", "2025-06-02T00:00:00Z");
        assert!(result.is_err());
    }
}
