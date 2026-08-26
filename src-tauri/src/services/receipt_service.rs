use rusqlite::Connection;

use crate::dto::receipt::ReceiptResponse;
use crate::errors::AppError;
use crate::repositories::{
    member_repository, membership_plan_repository, payment_repository, receipt_repository,
    settings_repository,
};

pub fn get_receipt_by_payment_id(
    conn: &Connection,
    payment_id: &str,
) -> Result<ReceiptResponse, AppError> {
    let receipt = receipt_repository::get_by_payment_id(conn, payment_id)?
        .ok_or_else(|| {
            AppError::NotFoundError(format!(
                "No receipt found for payment '{}'",
                payment_id
            ))
        })?;

    let payment = payment_repository::get_by_id(conn, &receipt.payment_id)?
        .ok_or_else(|| AppError::NotFoundError("Payment not found".into()))?;

    assemble_receipt(conn, receipt.issued_at, &receipt.receipt_number, &payment)
}

pub fn get_receipt_by_number(
    conn: &Connection,
    receipt_number: &str,
) -> Result<ReceiptResponse, AppError> {
    let receipt = receipt_repository::get_by_receipt_number(conn, receipt_number)?
        .ok_or_else(|| {
            AppError::NotFoundError(format!(
                "Receipt '{}' not found",
                receipt_number
            ))
        })?;

    let payment = payment_repository::get_by_id(conn, &receipt.payment_id)?
        .ok_or_else(|| AppError::NotFoundError("Payment not found".into()))?;

    assemble_receipt(conn, receipt.issued_at, &receipt.receipt_number, &payment)
}

fn assemble_receipt(
    conn: &Connection,
    issued_at: String,
    receipt_number: &str,
    payment: &crate::models::Payment,
) -> Result<ReceiptResponse, AppError> {
    let settings = settings_repository::get_gym_settings(conn)?;

    let member_name = member_repository::get_by_id(conn, &payment.member_id)?
        .map(|m| m.full_name)
        .unwrap_or_default();

    let member_number = member_repository::get_by_id(conn, &payment.member_id)?
        .map(|m| m.member_number)
        .unwrap_or_default();

    let plan = membership_plan_repository::get_by_id(conn, &payment.membership_plan_id)?;
    let plan_name = plan.as_ref().map(|p| p.name.clone()).unwrap_or_default();

    let remaining_balance = if let Some(ref p) = plan {
        let total_paid = payment_repository::total_paid_for_period(
            conn,
            &payment.member_id,
            &payment.membership_plan_id,
            &payment.membership_start_date,
            &payment.membership_expiry_date,
        )?;
        p.price - total_paid
    } else {
        0
    };

    Ok(ReceiptResponse {
        id: uuid::Uuid::new_v4().to_string(),
        receipt_number: receipt_number.to_string(),
        issued_at,
        gym_name: settings.gym_name,
        gym_address: settings.gym_address,
        gym_phone: settings.gym_phone,
        member_name,
        member_number,
        plan_name,
        amount: payment.amount,
        payment_method: payment.payment_method.clone(),
        payment_date: payment.payment_date.clone(),
        membership_start_date: payment.membership_start_date.clone(),
        membership_expiry_date: payment.membership_expiry_date.clone(),
        notes: payment.notes.clone(),
        remaining_balance,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrations;
    use rusqlite::params;

    fn test_db() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&mut conn).unwrap();
        conn
    }

    fn seed_full(conn: &Connection) -> (String, String, String) {
        let now = crate::utils::dates::now_iso8601();
        let member_id = uuid::Uuid::new_v4().to_string();
        let plan_id = uuid::Uuid::new_v4().to_string();
        let payment_id = uuid::Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO members (id, member_number, full_name, is_archived, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 0, ?4, ?5)",
            params![member_id, "GYM-000001", "Ahmad Khan", now, now],
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

        let receipt = crate::models::Receipt {
            id: uuid::Uuid::new_v4().to_string(),
            receipt_number: "RCP-000001".to_string(),
            payment_id: payment_id.clone(),
            issued_at: now.clone(),
            created_at: now,
        };
        crate::repositories::receipt_repository::create(conn, &receipt).unwrap();

        (member_id, plan_id, payment_id)
    }

    #[test]
    fn should_get_receipt_by_payment_id() {
        let conn = test_db();
        let (_, _, payment_id) = seed_full(&conn);
        let receipt = get_receipt_by_payment_id(&conn, &payment_id).unwrap();
        assert_eq!(receipt.receipt_number, "RCP-000001");
        assert_eq!(receipt.member_name, "Ahmad Khan");
        assert_eq!(receipt.plan_name, "Monthly");
        assert_eq!(receipt.amount, 2000);
    }

    #[test]
    fn should_get_receipt_by_number() {
        let conn = test_db();
        seed_full(&conn);
        let receipt = get_receipt_by_number(&conn, "RCP-000001").unwrap();
        assert_eq!(receipt.member_number, "GYM-000001");
        assert_eq!(receipt.payment_method, "Cash");
    }

    #[test]
    fn should_return_default_gym_name() {
        let conn = test_db();
        seed_full(&conn);
        let receipt = get_receipt_by_number(&conn, "RCP-000001").unwrap();
        assert_eq!(receipt.gym_name, "Gym POS");
    }

    #[test]
    fn should_return_error_for_nonexistent_receipt() {
        let conn = test_db();
        let result = get_receipt_by_number(&conn, "RCP-999999");
        assert!(result.is_err());
    }
}
