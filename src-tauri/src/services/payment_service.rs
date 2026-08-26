use chrono::{Duration, NaiveDate, Utc};
use rusqlite::Connection;

use crate::dto::payment::{CreatePaymentRequest, PaymentResponse};
use crate::errors::AppError;
use crate::models::{Payment, Receipt};
use crate::repositories::{member_repository, membership_plan_repository, payment_repository, receipt_repository};
use crate::utils::dates::now_iso8601;

const VALID_METHODS: &[&str] = &["Cash", "Card", "BankTransfer", "Other"];

pub fn create_payment(
    conn: &Connection,
    request: CreatePaymentRequest,
) -> Result<PaymentResponse, AppError> {
    if request.amount <= 0 {
        return Err(AppError::ValidationError(
            "Payment amount must be greater than zero".into(),
        ));
    }

    if !VALID_METHODS.contains(&request.payment_method.as_str()) {
        return Err(AppError::ValidationError(format!(
            "Invalid payment method '{}'. Must be one of: {}",
            request.payment_method,
            VALID_METHODS.join(", ")
        )));
    }

    let member = member_repository::get_by_id(conn, &request.member_id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Member '{}' not found", request.member_id)))?;

    let plan = membership_plan_repository::get_by_id(conn, &request.membership_plan_id)?
        .ok_or_else(|| {
            AppError::NotFoundError(format!(
                "Membership plan '{}' not found",
                request.membership_plan_id
            ))
        })?;

    if !plan.is_active {
        return Err(AppError::ValidationError(
            "Cannot record payment for an inactive plan".into(),
        ));
    }

    if NaiveDate::parse_from_str(&request.payment_date, "%Y-%m-%d").is_err() {
        return Err(AppError::ValidationError(
            "Invalid payment date format. Use YYYY-MM-DD".into(),
        ));
    }

    let start_date = Utc::now().date_naive();
    let expiry_date = start_date + Duration::days(plan.duration_days as i64);
    let now = now_iso8601();
    let receipt_number = payment_repository::next_receipt_number(conn)?;

    let payment = Payment {
        id: uuid::Uuid::new_v4().to_string(),
        receipt_number: receipt_number.clone(),
        member_id: request.member_id.clone(),
        amount: request.amount,
        payment_method: request.payment_method.clone(),
        payment_date: request.payment_date,
        membership_plan_id: request.membership_plan_id.clone(),
        membership_start_date: start_date.format("%Y-%m-%d").to_string(),
        membership_expiry_date: expiry_date.format("%Y-%m-%d").to_string(),
        notes: request.notes,
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    payment_repository::create(conn, &payment)?;

    let receipt = Receipt {
        id: uuid::Uuid::new_v4().to_string(),
        receipt_number: receipt_number.clone(),
        payment_id: payment.id.clone(),
        issued_at: now.clone(),
        created_at: now,
    };
    receipt_repository::create(conn, &receipt)?;

    log::info!(
        "Payment {} recorded: Rs. {} from {} ({})",
        receipt_number,
        payment.amount,
        member.full_name,
        member.member_number
    );

    Ok(PaymentResponse::from_payment(
        payment,
        Some(member.full_name),
        Some(member.member_number),
        Some(plan.name),
    ))
}

pub fn get_payment(conn: &Connection, id: &str) -> Result<PaymentResponse, AppError> {
    let payment = payment_repository::get_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Payment '{}' not found", id)))?;
    resolve_payment_response(conn, payment)
}

pub fn list_payments(
    conn: &Connection,
    search: &str,
    date_from: Option<&str>,
    date_to: Option<&str>,
) -> Result<Vec<PaymentResponse>, AppError> {
    let payments = payment_repository::list(conn, search, date_from, date_to)?;
    payments
        .into_iter()
        .map(|p| resolve_payment_response(conn, p))
        .collect()
}

pub fn list_member_payments(
    conn: &Connection,
    member_id: &str,
) -> Result<Vec<PaymentResponse>, AppError> {
    let payments = payment_repository::list_by_member(conn, member_id)?;
    payments
        .into_iter()
        .map(|p| resolve_payment_response(conn, p))
        .collect()
}

fn resolve_payment_response(
    conn: &Connection,
    payment: Payment,
) -> Result<PaymentResponse, AppError> {
    let member_name = member_repository::get_by_id(conn, &payment.member_id)?
        .map(|m| m.full_name);
    let member_number = member_repository::get_by_id(conn, &payment.member_id)?
        .map(|m| m.member_number);
    let plan_name = membership_plan_repository::get_by_id(conn, &payment.membership_plan_id)?
        .map(|p| p.name);

    Ok(PaymentResponse::from_payment(
        payment,
        member_name,
        member_number,
        plan_name,
    ))
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

    fn insert_test_plan(conn: &Connection, name: &str, price: i64, days: i32, active: bool) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        let now = now_iso8601();
        conn.execute(
            "INSERT INTO membership_plans (id, name, duration_days, price, is_active, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, name, days, price, active as i32, now, now],
        )
        .unwrap();
        id
    }

    fn valid_request(member_id: &str, plan_id: &str, amount: i64) -> CreatePaymentRequest {
        CreatePaymentRequest {
            member_id: member_id.to_string(),
            membership_plan_id: plan_id.to_string(),
            amount,
            payment_method: "Cash".to_string(),
            payment_date: "2025-01-15".to_string(),
            notes: None,
        }
    }

    #[test]
    fn should_create_payment_with_valid_data() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let result = create_payment(&conn, valid_request(&member_id, &plan_id, 2000)).unwrap();
        assert_eq!(result.amount, 2000);
        assert!(result.receipt_number.starts_with("RCP-"));
        assert_eq!(result.member_name.as_deref(), Some("Ahmad"));
        assert_eq!(result.membership_plan_name.as_deref(), Some("Monthly"));
        assert!(!result.membership_start_date.is_empty());
        assert!(!result.membership_expiry_date.is_empty());
    }

    #[test]
    fn should_reject_zero_amount() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let result = create_payment(&conn, valid_request(&member_id, &plan_id, 0));
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_negative_amount() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let result = create_payment(&conn, valid_request(&member_id, &plan_id, -100));
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_invalid_member() {
        let conn = test_db();
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let result = create_payment(&conn, valid_request("nonexistent", &plan_id, 2000));
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_invalid_plan() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");

        let result = create_payment(&conn, valid_request(&member_id, "nonexistent", 2000));
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_inactive_plan() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, false);

        let result = create_payment(&conn, valid_request(&member_id, &plan_id, 2000));
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_invalid_payment_method() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let mut req = valid_request(&member_id, &plan_id, 2000);
        req.payment_method = "Crypto".to_string();
        let result = create_payment(&conn, req);
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_invalid_date_format() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let mut req = valid_request(&member_id, &plan_id, 2000);
        req.payment_date = "15-01-2025".to_string();
        let result = create_payment(&conn, req);
        assert!(result.is_err());
    }

    #[test]
    fn should_generate_correct_receipt_number() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let p1 = create_payment(&conn, valid_request(&member_id, &plan_id, 2000)).unwrap();
        assert_eq!(p1.receipt_number, "RCP-000001");

        let p2 = create_payment(&conn, valid_request(&member_id, &plan_id, 1000)).unwrap();
        assert_eq!(p2.receipt_number, "RCP-000002");
    }

    #[test]
    fn should_get_payment_with_resolved_names() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad Khan");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let created = create_payment(&conn, valid_request(&member_id, &plan_id, 2000)).unwrap();
        let fetched = get_payment(&conn, &created.id).unwrap();

        assert_eq!(fetched.member_name.as_deref(), Some("Ahmad Khan"));
        assert_eq!(fetched.membership_plan_name.as_deref(), Some("Monthly"));
    }

    #[test]
    fn should_list_payments_with_search() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let req = CreatePaymentRequest {
            member_id: member_id.clone(),
            membership_plan_id: plan_id.clone(),
            amount: 2000,
            payment_method: "Cash".to_string(),
            payment_date: "2025-01-15".to_string(),
            notes: None,
        };
        let created = create_payment(&conn, req).unwrap();

        let results = list_payments(&conn, &created.receipt_number, None, None).unwrap();
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn should_list_member_payments() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        create_payment(&conn, valid_request(&member_id, &plan_id, 2000)).unwrap();
        create_payment(&conn, valid_request(&member_id, &plan_id, 500)).unwrap();

        let payments = list_member_payments(&conn, &member_id).unwrap();
        assert_eq!(payments.len(), 2);
    }

    #[test]
    fn should_accept_all_valid_payment_methods() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        for method in &["Cash", "Card", "BankTransfer", "Other"] {
            let mut req = valid_request(&member_id, &plan_id, 2000);
            req.payment_method = method.to_string();
            let result = create_payment(&conn, req);
            assert!(result.is_ok(), "Method '{}' should be valid", method);
        }
    }

    #[test]
    fn should_reject_nonexistent_payment_lookup() {
        let conn = test_db();
        let result = get_payment(&conn, "nonexistent");
        assert!(result.is_err());
    }
}
