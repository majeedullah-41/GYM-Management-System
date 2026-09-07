use chrono::NaiveDate;
use rusqlite::Connection;

use crate::dto::advance_payment::{
    AdvancePaymentPreview, CreateAdvancePaymentRequest,
};
use crate::dto::payment::PaymentResponse;
use crate::errors::AppError;
use crate::models::{Payment, Receipt};
use crate::repositories::{
    billing_repository, member_repository, membership_plan_repository, payment_repository,
    receipt_repository,
};
use crate::services::{billing_service, payment_service};
use crate::utils::constants::{is_valid_payment_method, PAYMENT_METHODS};
use crate::utils::dates::now_iso8601;

fn validate_count(count: u32) -> Result<(), AppError> {
    if count == 0 {
        return Err(AppError::ValidationError(
            "Period count must be at least 1".into(),
        ));
    }
    Ok(())
}

fn load_member(conn: &Connection, member_id: &str) -> Result<crate::models::Member, AppError> {
    let member = member_repository::get_operational_by_id(conn, member_id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Member {member_id:?} not found")))?;
    if member.is_archived {
        return Err(AppError::ValidationError(
            "Cannot record an advance payment for an archived member".into(),
        ));
    }
    Ok(member)
}

/// Generates the authoritative advance payment preview: the next-coverage
/// window for `period_count` plan cycles, the outstanding dues that will be
/// settled first, and the total amount. The frontend only displays these
/// values; the creation path recomputes them in Rust.
pub fn preview(
    conn: &Connection,
    member_id: &str,
    period_count: u32,
) -> Result<AdvancePaymentPreview, AppError> {
    validate_count(period_count)?;
    let member = load_member(conn, member_id)?;
    billing_service::ensure_monthly_billing_generated(conn, member_id)?;
    let membership = billing_repository::get_open_membership(conn, member_id)?
        .ok_or_else(|| {
            AppError::ValidationError(
                "Member has no active membership to extend with an advance payment".into(),
            )
        })?;
    let plan = membership_plan_repository::get_by_id(conn, &membership.membership_plan_id)?
        .ok_or_else(|| {
            AppError::NotFoundError(format!(
                "Membership plan '{}' not found",
                membership.membership_plan_id
            ))
        })?;
    if !plan.is_active {
        return Err(AppError::ValidationError(
            "Cannot calculate an advance payment for an inactive plan".into(),
        ));
    }

    let from_date = billing_service::next_billing_start(conn, member_id)?;
    let from = NaiveDate::parse_from_str(&from_date, "%Y-%m-%d").map_err(|_| {
        AppError::InternalError(format!("Invalid coverage start date '{from_date}'"))
    })?;
    let periods = billing_service::advance_periods(&membership, from, period_count);
    let coverage_start = periods
        .first()
        .map(|p| p.period_start.clone())
        .unwrap_or_else(|| from_date.clone());
    let coverage_end = periods
        .last()
        .map(|p| p.period_end.clone())
        .unwrap_or(from_date);
    let fee = membership.agreed_fee;
    let future_total = fee
        .checked_mul(i64::from(period_count))
        .ok_or_else(|| AppError::ValidationError("Advance total too large".into()))?;
    let outstanding_dues = billing_service::outstanding_amount(conn, member_id)?;

    Ok(AdvancePaymentPreview {
        member_id: member.id.clone(),
        member_name: member.full_name,
        member_number: member.member_number,
        membership_plan_id: membership.membership_plan_id.clone(),
        plan_name: plan.name,
        fee,
        period_count,
        paid_through: billing_service::paid_through(conn, member_id)?,
        coverage_start,
        coverage_end,
        coverage_periods: periods,
        outstanding_dues,
        future_total,
        total: outstanding_dues + future_total,
    })
}

/// Creates one payment that first settles all outstanding dues and then
/// pre-pays `period_count` upcoming plan cycles, all inside one transaction
/// (one payment, one receipt). The amount is computed authoritatively here in
/// Rust. Duplicate requests are deduplicated by idempotency key.
pub fn create(
    conn: &Connection,
    request: CreateAdvancePaymentRequest,
) -> Result<PaymentResponse, AppError> {
    validate_count(request.period_count)?;
    if !is_valid_payment_method(&request.payment_method) {
        return Err(AppError::ValidationError(format!(
            "Invalid payment method '{}'. Must be one of: {}",
            request.payment_method,
            PAYMENT_METHODS.join(", ")
        )));
    }
    if let Some(ref key) = request.idempotency_key {
        if key.trim().is_empty() {
            return Err(AppError::ValidationError(
                "Invalid payment request key".into(),
            ));
        }
        if let Some(existing) = payment_repository::get_by_idempotency_key(conn, key)? {
            return payment_service::resolve_single(conn, existing);
        }
    }

    let member = load_member(conn, &request.member_id)?;

    let tx = conn.unchecked_transaction()?;
    billing_service::ensure_monthly_billing_generated(&tx, &request.member_id)?;
    let membership = billing_repository::get_open_membership(&tx, &request.member_id)?
        .ok_or_else(|| {
            AppError::ValidationError(
                "Member has no active membership to extend with an advance payment".into(),
            )
        })?;
    let plan = membership_plan_repository::get_by_id(&tx, &membership.membership_plan_id)?
        .ok_or_else(|| {
            AppError::NotFoundError(format!(
                "Membership plan '{}' not found",
                membership.membership_plan_id
            ))
        })?;
    if !plan.is_active {
        return Err(AppError::ValidationError(
            "Cannot record an advance payment for an inactive plan".into(),
        ));
    }

    let pre_advance_due = billing_service::outstanding_amount(&tx, &request.member_id)?;
    let fee = membership.agreed_fee;
    let future_total = fee
        .checked_mul(i64::from(request.period_count))
        .ok_or_else(|| AppError::ValidationError("Advance total too large".into()))?;

    let from_date = billing_service::next_billing_start(&tx, &request.member_id)?;
    let future_bills =
        billing_service::generate_future_bills(&tx, &request.member_id, &from_date, request.period_count)?;

    // FIFO targets now include the freshly created future bills, so the
    // allocation settles oldest dues first and fills upcoming periods after.
    let targets = billing_repository::list_outstanding_bills(&tx, &request.member_id)?;
    let ledger_due: i64 = targets
        .iter()
        .map(|b| b.expected_amount - b.paid_amount)
        .sum();
    let amount = pre_advance_due + future_total;
    if amount != ledger_due {
        return Err(AppError::InternalError(
            "Advance payment total does not match the outstanding ledger".into(),
        ));
    }

    let now = now_iso8601();
    let receipt_number = payment_repository::next_receipt_number(&tx)?;
    let start_date = future_bills
        .first()
        .map(|b| b.period_start.clone())
        .unwrap_or_else(|| membership.billing_start_date.clone());
    let expiry_date = future_bills
        .last()
        .map(|b| b.period_end.clone())
        .unwrap_or_else(|| start_date.clone());

    let payment = Payment {
        id: uuid::Uuid::new_v4().to_string(),
        receipt_number: receipt_number.clone(),
        member_id: request.member_id.clone(),
        amount,
        payment_method: request.payment_method.clone(),
        payment_date: crate::utils::dates::today_iso(),
        membership_plan_id: membership.membership_plan_id.clone(),
        membership_start_date: start_date.clone(),
        membership_expiry_date: expiry_date.clone(),
        description: None,
        reference: None,
        notes: request.note,
        is_voided: false,
        voided_at: None,
        void_reason: None,
        created_at: now.clone(),
        updated_at: now.clone(),
    };
    payment_repository::create(&tx, &payment)?;
    payment_repository::set_recurring_metadata(
        &tx,
        &payment.id,
        request.idempotency_key.as_deref(),
    )?;
    billing_service::allocate_payment(&tx, &payment.id, &targets, amount, &now)?;

    let receipt = Receipt {
        id: uuid::Uuid::new_v4().to_string(),
        receipt_number: receipt_number.clone(),
        payment_id: payment.id.clone(),
        issued_at: now.clone(),
        created_at: now,
    };
    receipt_repository::create(&tx, &receipt)?;
    tx.commit()?;

    log::info!(
        "Advance payment {} recorded: Rs. {} for {} periods from {} ({})",
        receipt_number,
        payment.amount,
        request.period_count,
        member.full_name,
        member.member_number
    );

    payment_service::resolve_single(conn, payment)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrations;
    use crate::dto::payment::CreatePaymentRequest;
    use rusqlite::{params, Connection};

    fn test_db() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&mut conn).unwrap();
        conn
    }

    fn insert_member(conn: &Connection, name: &str) -> String {
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

    fn insert_plan(conn: &Connection, name: &str, price: i64, days: i32) -> String {
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

    /// Creates a member who is fully paid through the current period by running
    /// a normal payment (which builds the membership + current bill).
    fn setup_current_member(conn: &Connection) -> (String, String) {
        let member_id = insert_member(conn, "Ahmad");
        let plan_id = insert_plan(conn, "Monthly", 2000, 30);
        payment_service::create_payment(
            conn,
            CreatePaymentRequest {
                member_id: member_id.clone(),
                membership_plan_id: plan_id.clone(),
                amount: 2000,
                payment_method: "Cash".into(),
                payment_date: crate::utils::dates::today_iso(),
                description: None,
                reference: None,
                notes: None,
                idempotency_key: Some("current-payment".into()),
            },
        )
        .unwrap();
        (member_id, plan_id)
    }

    fn advance_request(member_id: &str, count: u32) -> CreateAdvancePaymentRequest {
        CreateAdvancePaymentRequest {
            member_id: member_id.to_string(),
            period_count: count,
            payment_method: "Cash".into(),
            note: None,
            idempotency_key: Some(format!("advance-{}-{}", member_id, count)),
        }
    }

    #[test]
    fn one_period_advance_covers_the_next_cycle_and_updates_paid_through() {
        let conn = test_db();
        let (member_id, _) = setup_current_member(&conn);
        let today = chrono::NaiveDate::parse_from_str(&crate::utils::dates::today_iso(), "%Y-%m-%d").unwrap();
        let expected_start = (today + chrono::Duration::days(30)).format("%Y-%m-%d").to_string();
        let expected_end = (today + chrono::Duration::days(59)).format("%Y-%m-%d").to_string();

        let v = preview(&conn, &member_id, 1).unwrap();
        assert_eq!(v.period_count, 1);
        assert_eq!(v.coverage_start, expected_start);
        assert_eq!(v.coverage_end, expected_end);
        assert_eq!(v.coverage_periods.len(), 1);
        assert_eq!(v.outstanding_dues, 0);
        assert_eq!(v.future_total, 2000);
        assert_eq!(v.total, 2000);

        let p = create(&conn, advance_request(&member_id, 1)).unwrap();
        assert_eq!(p.amount, 2000);
        assert_eq!(p.membership_start_date, expected_start);
        assert_eq!(p.membership_expiry_date, expected_end);
        assert_eq!(p.allocations.len(), 1);
        assert_eq!(
            billing_service::paid_through(&conn, &member_id).unwrap().as_deref(),
            Some(expected_end.as_str())
        );
    }

    #[test]
    fn three_period_advance_calculates_correct_total_and_coverage() {
        let conn = test_db();
        let (member_id, _) = setup_current_member(&conn);
        let today = chrono::NaiveDate::parse_from_str(&crate::utils::dates::today_iso(), "%Y-%m-%d").unwrap();

        let v = preview(&conn, &member_id, 3).unwrap();
        assert_eq!(v.coverage_periods.len(), 3);
        assert_eq!(v.future_total, 6000);
        assert_eq!(v.total, 6000);

        let p = create(&conn, advance_request(&member_id, 3)).unwrap();
        assert_eq!(p.amount, 6000);
        assert_eq!(p.allocations.len(), 3);
        let bills = billing_repository::list_member_bills(&conn, &member_id).unwrap();
        assert_eq!(bills.len(), 4);
        for bill in &bills[1..] {
            assert_eq!(bill.paid_amount, 2000);
            assert_eq!(bill.status, "PAID");
        }
        // Coverage ends at the last generated period (today + 30*4 - 1 days).
        let expected_end = (today + chrono::Duration::days(119)).format("%Y-%m-%d").to_string();
        assert_eq!(
            billing_service::paid_through(&conn, &member_id).unwrap().as_deref(),
            Some(expected_end.as_str())
        );
        assert_eq!(
            billing_service::get_billing_summary(&conn, &member_id).unwrap().total_outstanding,
            0
        );
    }

    #[test]
    fn subsequent_advance_starts_after_existing_coverage_without_overlap() {
        let conn = test_db();
        let (member_id, _) = setup_current_member(&conn);
        let today = chrono::NaiveDate::parse_from_str(&crate::utils::dates::today_iso(), "%Y-%m-%d").unwrap();
        create(&conn, advance_request(&member_id, 3)).unwrap();

        let first_end = (today + chrono::Duration::days(119)).format("%Y-%m-%d").to_string();
        assert_eq!(
            billing_service::paid_through(&conn, &member_id).unwrap().as_deref(),
            Some(first_end.as_str())
        );

        let v = preview(&conn, &member_id, 2).unwrap();
        let expected_start = (today + chrono::Duration::days(120)).format("%Y-%m-%d").to_string();
        assert_eq!(v.coverage_start, expected_start);

        create(&conn, advance_request(&member_id, 2)).unwrap();
        let bills = billing_repository::list_member_bills(&conn, &member_id).unwrap();
        // 1 original + 3 + 2 = 6 distinct periods, no duplicates.
        assert_eq!(bills.len(), 6);
        let starts: std::collections::HashSet<String> =
            bills.iter().map(|b| b.period_start.clone()).collect();
        assert_eq!(starts.len(), 6);
        let expected_end = (today + chrono::Duration::days(179)).format("%Y-%m-%d").to_string();
        assert_eq!(
            billing_service::paid_through(&conn, &member_id).unwrap().as_deref(),
            Some(expected_end.as_str())
        );
    }

    #[test]
    fn twelve_period_advance_creates_exactly_twelve_periods() {
        let conn = test_db();
        let (member_id, _) = setup_current_member(&conn);

        let v = preview(&conn, &member_id, 12).unwrap();
        assert_eq!(v.coverage_periods.len(), 12);
        assert_eq!(v.future_total, 24000);

        let p = create(&conn, advance_request(&member_id, 12)).unwrap();
        assert_eq!(p.amount, 24000);
        assert_eq!(p.allocations.len(), 12);
        let bills = billing_repository::list_member_bills(&conn, &member_id).unwrap();
        assert_eq!(bills.len(), 13);
        assert_eq!(billing_service::paid_through(&conn, &member_id).unwrap(), Some(v.coverage_end));
    }

    #[test]
    fn advance_settles_existing_dues_first_then_fills_future_periods() {
        let conn = test_db();
        let member_id = insert_member(&conn, "Ahmad");
        let plan_id = insert_plan(&conn, "Monthly", 2000, 30);
        // Partial payment leaves Rs. 1000 unpaid on the current period.
        payment_service::create_payment(
            &conn,
            CreatePaymentRequest {
                member_id: member_id.clone(),
                membership_plan_id: plan_id.clone(),
                amount: 1000,
                payment_method: "Cash".into(),
                payment_date: crate::utils::dates::today_iso(),
                description: None,
                reference: None,
                notes: None,
                idempotency_key: Some("partial".into()),
            },
        )
        .unwrap();

        let v = preview(&conn, &member_id, 2).unwrap();
        assert_eq!(v.outstanding_dues, 1000);
        assert_eq!(v.future_total, 4000);
        assert_eq!(v.total, 5000);

        let p = create(&conn, advance_request(&member_id, 2)).unwrap();
        assert_eq!(p.amount, 5000);
        // 3 allocations: current-period shortfall, then two future periods.
        assert_eq!(p.allocations.len(), 3);
        let bills = billing_repository::list_member_bills(&conn, &member_id).unwrap();
        assert_eq!(bills.len(), 3);
        assert_eq!(
            (
                bills[0].paid_amount,
                bills[1].paid_amount,
                bills[2].paid_amount
            ),
            (2000, 2000, 2000)
        );
        // The original shortfall was settled by the advance too.
        assert_eq!(
            billing_service::get_billing_summary(&conn, &member_id)
                .unwrap()
                .total_outstanding,
            0
        );
    }

    #[test]
    fn price_change_does_not_alter_existing_advance_payment() {
        let conn = test_db();
        let (member_id, plan_id) = setup_current_member(&conn);
        let p = create(&conn, advance_request(&member_id, 3)).unwrap();
        assert_eq!(p.amount, 6000);

        conn.execute(
            "UPDATE membership_plans SET price=?2 WHERE id=?1",
            params![plan_id, 2500],
        )
        .unwrap();

        let fetched = payment_service::get_payment(&conn, &p.id).unwrap();
        assert_eq!(fetched.amount, 6000);
        assert_eq!(fetched.allocations.len(), 3);
        let bills = billing_repository::list_member_bills(&conn, &member_id).unwrap();
        for bill in &bills[1..] {
            assert_eq!(bill.expected_amount, 2000);
            assert_eq!(bill.paid_amount, 2000);
        }
    }

    #[test]
    fn duplicate_submission_returns_same_payment_without_duplicating_coverage() {
        let conn = test_db();
        let (member_id, _) = setup_current_member(&conn);

        let first = create(&conn, advance_request(&member_id, 3)).unwrap();
        let retry = create(&conn, advance_request(&member_id, 3)).unwrap();
        assert_eq!(first.id, retry.id);

        let payments = payment_repository::list_by_member(&conn, &member_id).unwrap();
        assert_eq!(payments.len(), 2); // the initial current payment + 1 advance
        let bills = billing_repository::list_member_bills(&conn, &member_id).unwrap();
        assert_eq!(bills.len(), 4); // no extra future periods from the retry
    }

    #[test]
    fn transaction_failure_rolls_back_payment_future_bills_and_receipt() {
        let conn = test_db();
        let (member_id, _) = setup_current_member(&conn);
        conn.execute_batch(
            "CREATE TRIGGER fail_receipt BEFORE INSERT ON receipts BEGIN \
             SELECT RAISE(ABORT, 'receipt failed'); END;",
        )
        .unwrap();

        let result = create(&conn, advance_request(&member_id, 3));
        assert!(result.is_err());

        let bills = billing_repository::list_member_bills(&conn, &member_id).unwrap();
        assert_eq!(bills.len(), 1); // only the original current-period bill
        let payments = payment_repository::list_by_member(&conn, &member_id).unwrap();
        assert_eq!(payments.len(), 1);
        let receipts: i64 = conn
            .query_row("SELECT COUNT(*) FROM receipts", [], |r| r.get(0))
            .unwrap();
        assert_eq!(receipts, 1); // only the setup payment's receipt survived
    }

    #[test]
    fn voiding_advance_reverts_future_coverage() {
        let conn = test_db();
        let (member_id, _) = setup_current_member(&conn);
        let p = create(&conn, advance_request(&member_id, 2)).unwrap();

        payment_service::void_payment(&conn, &p.id, "test reversal").unwrap();

        let bills = billing_repository::list_member_bills(&conn, &member_id).unwrap();
        assert_eq!(bills.len(), 3);
        // The future bills are unpaid again; the original current bill stays paid.
        assert_eq!(bills[0].paid_amount, 2000);
        assert_eq!(bills[1].paid_amount, 0);
        assert_eq!(bills[2].paid_amount, 0);
        assert_eq!(
            billing_service::get_billing_summary(&conn, &member_id)
                .unwrap()
                .total_outstanding,
            4000
        );
    }

    #[test]
    fn rejects_zero_period_count() {
        let conn = test_db();
        let (member_id, _) = setup_current_member(&conn);
        assert!(preview(&conn, &member_id, 0).is_err());
        assert!(create(&conn, advance_request(&member_id, 0)).is_err());
    }

    #[test]
    fn rejects_invalid_payment_method() {
        let conn = test_db();
        let (member_id, _) = setup_current_member(&conn);
        let mut req = advance_request(&member_id, 2);
        req.payment_method = "Crypto".into();
        assert!(create(&conn, req).is_err());
    }

    #[test]
    fn rejects_archived_member() {
        let conn = test_db();
        let member_id = insert_member(&conn, "Archived");
        conn.execute(
            "UPDATE members SET is_archived=1 WHERE id=?1",
            params![member_id],
        )
        .unwrap();
        assert!(preview(&conn, &member_id, 1).is_err());
    }

    #[test]
    fn rejects_member_without_active_membership() {
        let conn = test_db();
        let member_id = insert_member(&conn, "Fresh");
        let result = preview(&conn, &member_id, 1);
        assert!(result.is_err());
    }

    // --- helpers ---
}