use chrono::{Duration, NaiveDate, Utc};
use rusqlite::Connection;

use crate::dto::payment::{CreatePaymentRequest, PaymentResponse, PaymentSummary};
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

    let (start_date, expiry_date) =
        match payment_repository::get_current_period(conn, &request.member_id, &request.membership_plan_id)? {
            Some((s, e)) => (s, e),
            None => {
                let s = Utc::now().date_naive();
                let e = s + Duration::days(plan.duration_days as i64);
                (s.format("%Y-%m-%d").to_string(), e.format("%Y-%m-%d").to_string())
            }
        };

    let previously_paid = payment_repository::total_paid_for_period(
        conn,
        &request.member_id,
        &request.membership_plan_id,
        &start_date,
        &expiry_date,
    )?;

    let outstanding = plan.price - previously_paid;
    if request.amount > outstanding {
        return Err(AppError::ValidationError(format!(
            "Payment amount Rs. {} exceeds outstanding balance Rs. {}",
            request.amount, outstanding
        )));
    }

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
        membership_start_date: start_date.clone(),
        membership_expiry_date: expiry_date.clone(),
        notes: request.notes,
        is_voided: false,
        voided_at: None,
        void_reason: None,
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
        "Payment {} recorded: Rs. {} from {} ({}) [outstanding: Rs. {}]",
        receipt_number,
        payment.amount,
        member.full_name,
        member.member_number,
        outstanding - payment.amount
    );

    Ok(PaymentResponse::from_payment(
        payment,
        Some(member.full_name),
        Some(member.member_number),
        Some(plan.name),
    ))
}

pub fn get_payment_summary(
    conn: &Connection,
    member_id: &str,
    plan_id: &str,
) -> Result<PaymentSummary, AppError> {
    let plan = membership_plan_repository::get_by_id(conn, plan_id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Plan '{}' not found", plan_id)))?;

    if !plan.is_active {
        return Err(AppError::ValidationError(
            "Cannot calculate summary for an inactive plan".into(),
        ));
    }

    let (start_date, expiry_date) =
        match payment_repository::get_current_period(conn, member_id, plan_id)? {
            Some((s, e)) => (Some(s), Some(e)),
            None => (None, None),
        };

    let previously_paid = match (&start_date, &expiry_date) {
        (Some(s), Some(e)) => {
            payment_repository::total_paid_for_period(conn, member_id, plan_id, s, e)?
        }
        _ => 0,
    };

    let outstanding = plan.price - previously_paid;

    Ok(PaymentSummary {
        plan_price: plan.price,
        previously_paid,
        outstanding,
        membership_start_date: start_date,
        membership_expiry_date: expiry_date,
    })
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

pub fn resolve_single(
    conn: &Connection,
    payment: Payment,
) -> Result<PaymentResponse, AppError> {
    resolve_payment_response(conn, payment)
}

pub fn void_payment(
    conn: &Connection,
    id: &str,
    reason: &str,
) -> Result<PaymentResponse, AppError> {
    let payment = payment_repository::get_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Payment '{}' not found", id)))?;

    if payment.is_voided {
        return Err(AppError::ValidationError(
            "Payment is already voided".into(),
        ));
    }

    if reason.trim().is_empty() {
        return Err(AppError::ValidationError(
            "Void reason is required".into(),
        ));
    }

    let now = now_iso8601();
    payment_repository::void_payment(conn, id, reason.trim(), &now)?;

    log::info!("Voided payment {}: {}", payment.receipt_number, reason);

    let updated = payment_repository::get_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Payment '{}' not found", id)))?;
    resolve_payment_response(conn, updated)
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
        let plan1 = insert_test_plan(&conn, "Monthly", 2000, 30, true);
        let plan2 = insert_test_plan(&conn, "Quarterly", 5000, 90, true);

        let p1 = create_payment(&conn, valid_request(&member_id, &plan1, 2000)).unwrap();
        assert_eq!(p1.receipt_number, "RCP-000001");

        let p2 = create_payment(&conn, valid_request(&member_id, &plan2, 1000)).unwrap();
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
        let plan1 = insert_test_plan(&conn, "Monthly", 2000, 30, true);
        let plan2 = insert_test_plan(&conn, "Quarterly", 5000, 90, true);

        create_payment(&conn, valid_request(&member_id, &plan1, 2000)).unwrap();
        create_payment(&conn, valid_request(&member_id, &plan2, 500)).unwrap();

        let payments = list_member_payments(&conn, &member_id).unwrap();
        assert_eq!(payments.len(), 2);
    }

    #[test]
    fn should_accept_all_valid_payment_methods() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");

        for method in &["Cash", "Card", "BankTransfer", "Other"] {
            let plan_id = insert_test_plan(&conn, &format!("Plan-{}", method), 2000, 30, true);
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

    #[test]
    fn should_allow_partial_payment() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let result = create_payment(&conn, valid_request(&member_id, &plan_id, 500)).unwrap();
        assert_eq!(result.amount, 500);
    }

    #[test]
    fn should_track_multiple_partial_payments() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        create_payment(&conn, valid_request(&member_id, &plan_id, 500)).unwrap();
        create_payment(&conn, valid_request(&member_id, &plan_id, 700)).unwrap();
        let p3 = create_payment(&conn, valid_request(&member_id, &plan_id, 800)).unwrap();
        assert_eq!(p3.amount, 800);
    }

    #[test]
    fn should_reject_overpayment() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        create_payment(&conn, valid_request(&member_id, &plan_id, 1500)).unwrap();
        let result = create_payment(&conn, valid_request(&member_id, &plan_id, 600));
        assert!(result.is_err());
    }

    #[test]
    fn should_get_payment_summary() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        create_payment(&conn, valid_request(&member_id, &plan_id, 500)).unwrap();
        let summary = get_payment_summary(&conn, &member_id, &plan_id).unwrap();

        assert_eq!(summary.plan_price, 2000);
        assert_eq!(summary.previously_paid, 500);
        assert_eq!(summary.outstanding, 1500);
    }

    #[test]
    fn should_get_payment_summary_with_no_payments() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let summary = get_payment_summary(&conn, &member_id, &plan_id).unwrap();
        assert_eq!(summary.plan_price, 2000);
        assert_eq!(summary.previously_paid, 0);
        assert_eq!(summary.outstanding, 2000);
    }
}
