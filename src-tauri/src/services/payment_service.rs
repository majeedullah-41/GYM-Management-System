use chrono::{Duration, NaiveDate, Utc};
use rusqlite::Connection;

use crate::dto::payment::{
    CreatePaymentRequest, PaymentResponse, PaymentSummary, UpdatePaymentRequest,
};
use crate::errors::AppError;
use crate::models::{Payment, Receipt};
use crate::repositories::{
    member_repository, membership_plan_repository, payment_repository, receipt_repository,
};
use crate::utils::constants::{is_valid_payment_method, PAYMENT_METHODS};
use crate::utils::dates::now_iso8601;

/// Returns the current active (non-expired) membership period for a member+plan.
/// A period whose expiry is in the past is treated as expired and ignored, so a
/// renewal starts a brand-new period instead of reusing the old, fully-paid one.
fn active_period(
    conn: &Connection,
    member_id: &str,
    plan_id: &str,
) -> Result<Option<(String, String)>, AppError> {
    let Some((start, expiry)) =
        payment_repository::get_current_period(conn, member_id, plan_id)?
    else {
        return Ok(None);
    };
    let today = Utc::now().date_naive();
    match NaiveDate::parse_from_str(&expiry, "%Y-%m-%d") {
        Ok(e) if e >= today => Ok(Some((start, expiry))),
        _ => Ok(None),
    }
}

pub fn create_payment(
    conn: &Connection,
    request: CreatePaymentRequest,
) -> Result<PaymentResponse, AppError> {
    if request.amount <= 0 {
        return Err(AppError::ValidationError(
            "Payment amount must be greater than zero".into(),
        ));
    }

    if !is_valid_payment_method(&request.payment_method) {
        return Err(AppError::ValidationError(format!(
            "Invalid payment method '{}'. Must be one of: {}",
            request.payment_method,
            PAYMENT_METHODS.join(", ")
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

    let active = active_period(conn, &request.member_id, &request.membership_plan_id)?;
    let (start_date, expiry_date) = match &active {
        Some((s, e)) => (s.clone(), e.clone()),
        None => {
            let s = Utc::now().date_naive();
            let e = s + Duration::days(plan.duration_days as i64);
            (s.format("%Y-%m-%d").to_string(), e.format("%Y-%m-%d").to_string())
        }
    };

    let is_first_payment = !member_repository::has_any_payments(conn, &request.member_id)?;
    let admission_fee = if is_first_payment {
        request.admission_fee.unwrap_or_else(|| member.admission_fee.unwrap_or(0))
    } else {
        0
    };

    // Total dues = accumulated shortfall across the member's lapsed/current
    // cycles for this plan (which includes the current cycle once its previous
    // coverage has lapsed), plus the price of a brand-new period only for a
    // first-time purchase (no prior period exists to roll forward).
    let accumulated = payment_repository::get_member_total_outstanding_for_plan(
        conn,
        &request.member_id,
        &request.membership_plan_id,
    )?;
    let has_prior_period = payment_repository::has_member_plan_periods(
        conn,
        &request.member_id,
        &request.membership_plan_id,
    )?;
    let new_period_owed = if has_prior_period { 0 } else { plan.price };
    let max_allowed = accumulated + new_period_owed + admission_fee;
    if request.amount > max_allowed {
        return Err(AppError::ValidationError(format!(
            "Payment amount Rs. {} exceeds total dues Rs. {}",
            request.amount, max_allowed
        )));
    }

    // FIFO settlement: apply the payment to the member's unpaid periods for
    // this plan (oldest-first), then to any newly opened period.
    let mut targets = payment_repository::get_member_unpaid_periods(
        conn,
        &request.member_id,
        Some(&request.membership_plan_id),
    )?;
    if new_period_owed > 0 {
        targets.push(payment_repository::MemberPeriod {
            plan_id: request.membership_plan_id.clone(),
            start_date: start_date.clone(),
            expiry_date: expiry_date.clone(),
            price: plan.price,
            paid: 0,
        });
    }

    let mut remaining = request.amount;
    let mut allocations: Vec<(String, String, String, i64)> = Vec::new();
    for target in &targets {
        if remaining <= 0 {
            break;
        }
        let shortfall = target.price - target.paid;
        if shortfall <= 0 {
            continue;
        }
        let alloc = remaining.min(shortfall);
        allocations.push((
            target.plan_id.clone(),
            target.start_date.clone(),
            target.expiry_date.clone(),
            alloc,
        ));
        remaining -= alloc;
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
        description: request.description,
        reference: request.reference,
        notes: request.notes,
        is_voided: false,
        voided_at: None,
        void_reason: None,
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    payment_repository::create(conn, &payment)?;
    payment_repository::create_allocations(conn, &payment.id, &allocations)?;

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

    let is_first_payment = !member_repository::has_any_payments(conn, member_id)?;
    let admission_fee = if is_first_payment {
        member_repository::get_by_id(conn, member_id)?.and_then(|m| m.admission_fee)
    } else {
        None
    };

    let back_due =
        payment_repository::get_member_total_outstanding_for_plan(conn, member_id, plan_id)?;

    let (membership_start_date, membership_expiry_date) =
        match active_period(conn, member_id, plan_id)? {
            Some((s, e)) => (Some(s), Some(e)),
            None => (None, None),
        };

    let previously_paid = match (&membership_start_date, &membership_expiry_date) {
        (Some(s), Some(e)) => {
            payment_repository::total_paid_for_period(conn, member_id, plan_id, s, e)?
        }
        _ => 0,
    };

    let has_prior_period =
        payment_repository::has_member_plan_periods(conn, member_id, plan_id)?;
    // A first-time purchase (no prior period) owes a full new period on top of
    // back-due; otherwise the current cycle is already part of back_due via the
    // roll-forward of lapsed cycles.
    let new_period_due = if has_prior_period { 0 } else { plan.price };
    let total_period_due = back_due + new_period_due;
    let outstanding = total_period_due + admission_fee.unwrap_or(0);

    Ok(PaymentSummary {
        plan_price: plan.price,
        back_due,
        new_period_due,
        previously_paid,
        outstanding,
        admission_fee,
        is_first_payment,
        membership_start_date,
        membership_expiry_date,
    })
}

pub fn get_payment(conn: &Connection, id: &str) -> Result<PaymentResponse, AppError> {
    let payment = payment_repository::get_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Payment '{}' not found", id)))?;
    resolve_payment_response(conn, payment)
}

#[allow(clippy::too_many_arguments)]
pub fn list_payments(
    conn: &Connection,
    search: &str,
    date_from: Option<&str>,
    date_to: Option<&str>,
    member_id: Option<&str>,
    plan_id: Option<&str>,
    status: Option<&str>,
) -> Result<Vec<PaymentResponse>, AppError> {
    let payments = payment_repository::list(
        conn, search, date_from, date_to, member_id, plan_id, status,
    )?;
    payments
        .into_iter()
        .map(|p| resolve_payment_response(conn, p))
        .collect()
}

pub fn update_payment(
    conn: &Connection,
    id: &str,
    request: UpdatePaymentRequest,
) -> Result<PaymentResponse, AppError> {
    let payment = payment_repository::get_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Payment '{}' not found", id)))?;

    if payment.is_voided {
        return Err(AppError::ValidationError(
            "Cannot update a voided payment".into(),
        ));
    }

    let now = now_iso8601();
    payment_repository::update_fields(
        conn,
        id,
        request.description,
        request.reference,
        request.notes,
        &now,
    )?;

    let updated = payment_repository::get_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Payment '{}' not found", id)))?;
    resolve_payment_response(conn, updated)
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
    payment_repository::delete_allocations_for_payment(conn, id)?;

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

    fn insert_test_member_with_fee(conn: &Connection, name: &str, fee: i64) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        let now = now_iso8601();
        conn.execute(
            "INSERT INTO members (id, member_number, full_name, admission_fee, is_archived, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6)",
            params![id, "GYM-000001", name, fee, now, now],
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
            admission_fee: None,
            description: None,
            reference: None,
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
            admission_fee: None,
            description: None,
            reference: None,
            notes: None,
        };
        let created = create_payment(&conn, req).unwrap();

        let results = list_payments(&conn, &created.receipt_number, None, None, None, None, None)
            .unwrap();
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

        for method in PAYMENT_METHODS {
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
    fn should_start_new_period_when_renewing_expired_plan() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);
        let now = now_iso8601();

        let expired_start = days_ago(31);
        let expired_expiry = days_ago(1);
        conn.execute(
            "INSERT INTO payments \
             (id, receipt_number, member_id, amount, payment_method, payment_date, \
              membership_plan_id, membership_start_date, membership_expiry_date, \
              is_voided, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10, ?11)",
            params![
                uuid::Uuid::new_v4().to_string(),
                "RCP-000001",
                member_id,
                2000,
                "Cash",
                &days_ago(31),
                plan_id,
                expired_start.clone(),
                expired_expiry.clone(),
                now,
                now,
            ],
        )
        .unwrap();

        let renewal = create_payment(&conn, valid_request(&member_id, &plan_id, 2000)).unwrap();

        assert_eq!(renewal.amount, 2000);
        assert_ne!(renewal.membership_start_date, expired_start);
        assert_ne!(renewal.membership_expiry_date, expired_expiry);
        assert!(!renewal.membership_start_date.is_empty());
        assert!(!renewal.membership_expiry_date.is_empty());
    }

    #[test]
    fn should_report_full_price_for_expired_plan_summary() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);
        let now = now_iso8601();

        conn.execute(
            "INSERT INTO payments \
             (id, receipt_number, member_id, amount, payment_method, payment_date, \
              membership_plan_id, membership_start_date, membership_expiry_date, \
              is_voided, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10, ?11)",
            params![
                uuid::Uuid::new_v4().to_string(),
                "RCP-000001",
                member_id,
                2000,
                "Cash",
                &days_ago(31),
                plan_id,
                &days_ago(31),
                &days_ago(1),
                now,
                now,
            ],
        )
        .unwrap();

        let summary = get_payment_summary(&conn, &member_id, &plan_id).unwrap();
        assert_eq!(summary.previously_paid, 0);
        assert_eq!(summary.outstanding, 2000);
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

    #[test]
    fn should_update_payment_editable_fields() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let created = create_payment(&conn, valid_request(&member_id, &plan_id, 2000)).unwrap();

        let updated = update_payment(
            &conn,
            &created.id,
            UpdatePaymentRequest {
                description: Some("Monthly membership".to_string()),
                reference: Some("TXN-999".to_string()),
                notes: Some("Paid in cash".to_string()),
            },
        )
        .unwrap();

        assert_eq!(updated.description.as_deref(), Some("Monthly membership"));
        assert_eq!(updated.reference.as_deref(), Some("TXN-999"));
        assert_eq!(updated.notes.as_deref(), Some("Paid in cash"));
        assert_eq!(updated.amount, 2000);
    }

    #[test]
    fn should_fail_updating_nonexistent_payment() {
        let conn = test_db();
        let result = update_payment(
            &conn,
            "nonexistent",
            UpdatePaymentRequest {
                description: None,
                reference: None,
                notes: None,
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn should_fail_updating_voided_payment() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);
        let created = create_payment(&conn, valid_request(&member_id, &plan_id, 2000)).unwrap();
        void_payment(&conn, &created.id, "Mistake").unwrap();

        let result = update_payment(
            &conn,
            &created.id,
            UpdatePaymentRequest {
                description: Some("x".to_string()),
                reference: None,
                notes: None,
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn should_filter_payments_by_status() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);
        let p1 = create_payment(&conn, valid_request(&member_id, &plan_id, 1000)).unwrap();
        create_payment(&conn, valid_request(&member_id, &plan_id, 1000)).unwrap();
        void_payment(&conn, &p1.id, "Mistake").unwrap();

        let valid = list_payments(&conn, "", None, None, None, None, Some("valid")).unwrap();
        assert_eq!(valid.len(), 1);
        let voided = list_payments(&conn, "", None, None, None, None, Some("voided")).unwrap();
        assert_eq!(voided.len(), 1);
        assert!(voided[0].is_voided);
    }

    #[test]
    fn should_include_admission_fee_in_first_payment_summary() {
        let conn = test_db();
        let member_id = insert_test_member_with_fee(&conn, "Ahmad", 500);
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let summary = get_payment_summary(&conn, &member_id, &plan_id).unwrap();
        assert_eq!(summary.plan_price, 2000);
        assert_eq!(summary.admission_fee, Some(500));
        assert!(summary.is_first_payment);
        assert_eq!(summary.outstanding, 2500);
    }

    #[test]
    fn should_not_include_admission_fee_after_first_payment() {
        let conn = test_db();
        let member_id = insert_test_member_with_fee(&conn, "Ahmad", 500);
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        create_payment(&conn, valid_request(&member_id, &plan_id, 2500)).unwrap();

        let summary = get_payment_summary(&conn, &member_id, &plan_id).unwrap();
        assert_eq!(summary.admission_fee, None);
        assert!(!summary.is_first_payment);
        assert_eq!(summary.outstanding, 0);
    }

    #[test]
    fn should_allow_payment_up_to_plan_price_plus_admission_fee() {
        let conn = test_db();
        let member_id = insert_test_member_with_fee(&conn, "Ahmad", 500);
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let result = create_payment(&conn, valid_request(&member_id, &plan_id, 2500)).unwrap();
        assert_eq!(result.amount, 2500);
    }

    #[test]
    fn should_respect_user_entered_admission_fee_higher_than_configured() {
        let conn = test_db();
        let member_id = insert_test_member_with_fee(&conn, "Ahmad", 500);
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let mut req = valid_request(&member_id, &plan_id, 2000);
        req.admission_fee = Some(1000);
        let result = create_payment(&conn, req).unwrap();
        assert_eq!(result.amount, 2000);
    }

    #[test]
    fn should_reject_amount_above_plan_price_plus_entered_fee() {
        let conn = test_db();
        let member_id = insert_test_member_with_fee(&conn, "Ahmad", 500);
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let mut req = valid_request(&member_id, &plan_id, 3100);
        req.admission_fee = Some(1000);
        let result = create_payment(&conn, req);
        assert!(result.is_err());
    }

    #[test]
    fn should_allow_partial_first_payment_covering_fee_and_part_of_plan() {
        let conn = test_db();
        let member_id = insert_test_member_with_fee(&conn, "Ahmad", 500);
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let result = create_payment(&conn, valid_request(&member_id, &plan_id, 1000)).unwrap();
        assert_eq!(result.amount, 1000);
    }

    #[test]
    fn should_not_include_fee_for_member_without_admission_fee() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        let summary = get_payment_summary(&conn, &member_id, &plan_id).unwrap();
        assert_eq!(summary.admission_fee, None);
        assert!(summary.is_first_payment);
        assert_eq!(summary.outstanding, 2000);
    }

    fn insert_payment(
        conn: &Connection,
        receipt_number: &str,
        member_id: &str,
        plan_id: &str,
        amount: i64,
        payment_date: &str,
        start_date: &str,
        expiry_date: &str,
    ) {
        let now = now_iso8601();
        conn.execute(
            "INSERT INTO payments \
             (id, receipt_number, member_id, amount, payment_method, payment_date, \
              membership_plan_id, membership_start_date, membership_expiry_date, \
              is_voided, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10, ?11)",
            params![
                uuid::Uuid::new_v4().to_string(),
                receipt_number,
                member_id,
                amount,
                "Cash",
                payment_date,
                plan_id,
                start_date,
                expiry_date,
                now,
                now,
            ],
        )
        .unwrap();
    }

    fn days_ago(n: i64) -> String {
        (chrono::Utc::now().date_naive() - chrono::Duration::days(n))
            .format("%Y-%m-%d")
            .to_string()
    }

    #[test]
    fn should_accumulate_dues_across_lapsed_unpaid_cycle() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        // An expired cycle that was only partially paid (Rs. 1000 of Rs. 2000),
        // ending 31 days ago. Since the member has not renewed, the lapsed full
        // cycle that followed AND the current cycle both accrue as dues.
        insert_payment(
            &conn,
            "RCP-000001",
            &member_id,
            &plan_id,
            1000,
            &days_ago(61),
            &days_ago(61),
            &days_ago(31),
        );

        let accumulated = payment_repository::get_member_total_outstanding(&conn, &member_id).unwrap();
        // 1000 (partial shortfall) + 2000 (lapsed full cycle) + 2000 (current) = 5000.
        assert_eq!(accumulated, 5000);
    }

    #[test]
    fn should_accrue_dues_for_fully_skipped_membership_months() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        // Member paid month one in full (ending 40 days ago) then stopped paying
        // entirely — no further payment rows exist. The completely skipped month
        // and the current month must still accrue as dues.
        insert_payment(
            &conn,
            "RCP-000001",
            &member_id,
            &plan_id,
            2000,
            &days_ago(70),
            &days_ago(70),
            &days_ago(40),
        );

        let accumulated = payment_repository::get_member_total_outstanding(&conn, &member_id).unwrap();
        // 0 (paid month) + 2000 (fully skipped month) + 2000 (current) = 4000.
        assert_eq!(accumulated, 4000);
    }

    #[test]
    fn should_not_count_fully_paid_expired_cycle_as_due() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        // The member is currently covered (last paid period extends past today),
        // so no lapsed or current cycles are owed.
        insert_payment(
            &conn,
            "RCP-000001",
            &member_id,
            &plan_id,
            2000,
            &days_ago(10),
            &days_ago(10),
            &days_ago(-20),
        );

        let accumulated = payment_repository::get_member_total_outstanding(&conn, &member_id).unwrap();
        assert_eq!(accumulated, 0);
    }

    #[test]
    fn should_settle_back_dues_first_on_renewal_payment() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        // An expired, partially-paid cycle (ending 31 days ago) leaving a
        // shortfall, plus a lapsed full cycle and the current cycle.
        insert_payment(
            &conn,
            "RCP-000001",
            &member_id,
            &plan_id,
            1000,
            &days_ago(61),
            &days_ago(61),
            &days_ago(31),
        );

        // Renew with a payment covering the oldest shortfall (1000) plus 1500
        // of the next (lapsed) cycle.
        create_payment(&conn, valid_request(&member_id, &plan_id, 2500)).unwrap();

        let accumulated = payment_repository::get_member_total_outstanding(&conn, &member_id).unwrap();
        // Lapsed cycle left 500 + current cycle 2000 = 2500; the oldest was settled first.
        assert_eq!(accumulated, 2500);
    }

    #[test]
    fn should_treat_member_with_unpaid_lapsed_cycle_as_unpaid() {
        let conn = test_db();
        let member_id = insert_test_member(&conn, "Ahmad");
        let plan_id = insert_test_plan(&conn, "Monthly", 2000, 30, true);

        // Member stopped paying after a partial first cycle: 1000 shortfall +
        // lapsed full cycle (2000) + current cycle (2000) = 5000 due.
        insert_payment(
            &conn,
            "RCP-000001",
            &member_id,
            &plan_id,
            1000,
            &days_ago(61),
            &days_ago(61),
            &days_ago(31),
        );

        let response = crate::services::member_service::get_member(&conn, &member_id).unwrap();
        assert!(!response.is_paid);
        assert_eq!(response.outstanding_balance, 5000);
    }
}
