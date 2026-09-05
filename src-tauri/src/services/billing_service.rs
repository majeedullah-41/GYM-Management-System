use chrono::{Datelike, Duration, NaiveDate};
use rusqlite::Connection;

use crate::dto::billing::{MembershipBillingSummary, MonthlyBillResponse};
use crate::errors::AppError;
use crate::models::{Membership, MonthlyBill};
use crate::repositories::{billing_repository, member_repository, membership_plan_repository};
use crate::utils::dates::{now_iso8601, today_iso};

fn parse_date(value: &str) -> Result<NaiveDate, AppError> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| AppError::ValidationError(format!("Invalid date '{value}'")))
}

fn cycle_key(date: NaiveDate) -> String {
    format!("{:04}{:03}", date.year(), date.ordinal())
}

pub fn create_membership_for_plan(
    conn: &Connection,
    member_id: &str,
    plan_id: &str,
    enrollment_date: &str,
) -> Result<Membership, AppError> {
    let plan = membership_plan_repository::get_by_id(conn, plan_id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Plan '{plan_id}' not found")))?;
    if !plan.is_active {
        return Err(AppError::ValidationError(
            "Cannot enroll in an inactive plan".into(),
        ));
    }
    let date = parse_date(enrollment_date)?;
    let now = now_iso8601();
    let membership = Membership {
        id: uuid::Uuid::new_v4().to_string(),
        member_id: member_id.to_string(),
        membership_plan_id: plan_id.to_string(),
        enrollment_date: enrollment_date.to_string(),
        billing_start_date: date.format("%Y-%m-%d").to_string(),
        agreed_fee: plan.price,
        billing_cycle_days: plan.duration_days,
        status: "active".into(),
        status_changed_at: enrollment_date.into(),
        ended_at: None,
        created_at: now.clone(),
        updated_at: now,
    };
    billing_repository::create_membership(conn, &membership)?;
    ensure_monthly_billing_generated(conn, member_id)?;
    Ok(membership)
}

/// Creates a conservative ledger membership for pre-ledger data. Already-paid
/// legacy coverage is honored; recurring billing starts when that coverage expires.
fn ensure_legacy_membership(
    conn: &Connection,
    member_id: &str,
) -> Result<Option<Membership>, AppError> {
    if let Some(m) = billing_repository::get_open_membership(conn, member_id)? {
        return Ok(Some(m));
    }
    if billing_repository::has_membership_history(conn, member_id)? {
        return Ok(None);
    }
    let member = member_repository::get_by_id(conn, member_id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Member '{member_id}' not found")))?;
    if member.is_archived {
        return Ok(None);
    }
    let Some(plan_id) = member.membership_plan_id else {
        return Ok(None);
    };
    let plan = membership_plan_repository::get_by_id(conn, &plan_id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Plan '{plan_id}' not found")))?;
    let today = parse_date(&today_iso())?;
    let legacy_parts: (Option<String>, Option<String>) = conn.query_row(
        "SELECT MIN(membership_start_date), MAX(membership_expiry_date) FROM payments \
         WHERE member_id=?1 AND membership_plan_id=?2 AND is_voided=0",
        rusqlite::params![member_id, plan_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;
    let legacy: Option<(String, String)> = legacy_parts.0.zip(legacy_parts.1);
    let enrollment = legacy
        .as_ref()
        .map(|v| v.0.clone())
        .unwrap_or_else(|| today_iso());
    let billing_start = legacy.and_then(|v| parse_date(&v.1).ok()).unwrap_or(today);
    let now = now_iso8601();
    let membership = Membership {
        id: uuid::Uuid::new_v4().to_string(),
        member_id: member_id.into(),
        membership_plan_id: plan_id,
        enrollment_date: enrollment,
        billing_start_date: billing_start.format("%Y-%m-%d").to_string(),
        agreed_fee: plan.price,
        billing_cycle_days: plan.duration_days,
        status: "active".into(),
        status_changed_at: today_iso(),
        ended_at: None,
        created_at: now.clone(),
        updated_at: now,
    };
    billing_repository::create_membership(conn, &membership)?;
    Ok(Some(membership))
}

pub fn ensure_monthly_billing_generated(
    conn: &Connection,
    member_id: &str,
) -> Result<usize, AppError> {
    ensure_billing_generated_at(conn, member_id, parse_date(&today_iso())?)
}

fn ensure_billing_generated_at(
    conn: &Connection,
    member_id: &str,
    current: NaiveDate,
) -> Result<usize, AppError> {
    let Some(membership) = ensure_legacy_membership(conn, member_id)? else {
        return Ok(0);
    };
    if membership.status != "active" || membership.ended_at.is_some() {
        return Ok(0);
    }
    let cycle_days = i64::from(membership.billing_cycle_days);
    let enrollment = parse_date(&membership.enrollment_date)?;
    let configured_start = parse_date(&membership.billing_start_date)?;
    let now = now_iso8601();
    if configured_start < enrollment {
        let first_end = enrollment + Duration::days(cycle_days - 1);
        billing_repository::normalize_initial_cycle(
            conn,
            &membership.id,
            &membership.enrollment_date,
            &first_end.format("%Y-%m-%d").to_string(),
            &now,
        )?;
    }
    let mut cursor = configured_start.max(enrollment);
    let mut inserted = 0;
    while cursor <= current {
        let following = cursor + Duration::days(cycle_days);
        let period_end = following - Duration::days(1);
        let bill = MonthlyBill {
            id: uuid::Uuid::new_v4().to_string(),
            membership_id: membership.id.clone(),
            member_id: membership.member_id.clone(),
            membership_plan_id: membership.membership_plan_id.clone(),
            billing_period: cycle_key(cursor),
            period_start: cursor.format("%Y-%m-%d").to_string(),
            period_end: period_end.format("%Y-%m-%d").to_string(),
            due_date: cursor.format("%Y-%m-%d").to_string(),
            expected_amount: membership.agreed_fee,
            paid_amount: 0,
            status: if current < following {
                "CURRENT".into()
            } else {
                "DUE".into()
            },
            created_at: now.clone(),
            updated_at: now.clone(),
        };
        if !billing_repository::bill_exists_for_start(conn, &membership.id, &bill.period_start)?
            && billing_repository::insert_bill(conn, &bill)?
        {
            inserted += 1;
        }
        cursor = following;
    }
    // A CURRENT row naturally becomes DUE when its plan-duration cycle expires.
    conn.execute(
        "UPDATE monthly_membership_bills SET status='DUE', updated_at=?1 \
        WHERE period_end < ?2 AND paid_amount=0 AND status='CURRENT'",
        rusqlite::params![now, current.format("%Y-%m-%d").to_string()],
    )?;
    Ok(inserted)
}

pub fn get_billing_summary(
    conn: &Connection,
    member_id: &str,
) -> Result<MembershipBillingSummary, AppError> {
    ensure_monthly_billing_generated(conn, member_id)?;
    let membership = match billing_repository::get_open_membership(conn, member_id)? {
        some @ Some(_) => some,
        None => billing_repository::get_latest_membership(conn, member_id)?,
    };
    let today = today_iso();
    let bills = billing_repository::list_member_bills(conn, member_id)?;
    let previous_dues = bills
        .iter()
        .filter(|b| b.period_end.as_str() < today.as_str())
        .map(|b| b.expected_amount - b.paid_amount)
        .sum();
    let current_month_fee = bills
        .iter()
        .filter(|b| {
            b.period_start.as_str() <= today.as_str() && b.period_end.as_str() >= today.as_str()
        })
        .map(|b| b.expected_amount - b.paid_amount)
        .sum();
    let total_outstanding = bills
        .iter()
        .map(|b| b.expected_amount - b.paid_amount)
        .sum();
    let plan_name = match &membership {
        Some(m) => {
            membership_plan_repository::get_by_id(conn, &m.membership_plan_id)?.map(|p| p.name)
        }
        None => None,
    };
    Ok(MembershipBillingSummary {
        membership_id: membership.as_ref().map(|m| m.id.clone()),
        membership_plan_id: membership.as_ref().map(|m| m.membership_plan_id.clone()),
        plan_name,
        monthly_fee: membership.as_ref().map(|m| m.agreed_fee).unwrap_or(0),
        enrollment_date: membership.as_ref().map(|m| m.enrollment_date.clone()),
        membership_status: membership.as_ref().map(|m| m.status.clone()),
        previous_dues,
        current_month_fee,
        total_outstanding,
        bills: bills.into_iter().map(MonthlyBillResponse::from).collect(),
    })
}

pub fn end_active_membership(
    conn: &Connection,
    member_id: &str,
    status: &str,
    date: &str,
) -> Result<(), AppError> {
    if let Some(m) = billing_repository::get_open_membership(conn, member_id)? {
        billing_repository::end_membership(conn, &m.id, status, date, &now_iso8601())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrations;
    use crate::dto::payment::CreatePaymentRequest;
    use rusqlite::{params, Connection};

    fn setup() -> (Connection, String, String) {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        migrations::run_migrations(&mut conn).unwrap();
        let now = now_iso8601();
        let member = "member-1".to_string();
        let plan = "plan-1".to_string();
        conn.execute("INSERT INTO membership_plans(id,name,duration_days,price,is_active,created_at,updated_at) VALUES(?1,'Monthly',30,2000,1,?2,?2)", params![plan,now]).unwrap();
        conn.execute("INSERT INTO members(id,member_number,full_name,membership_plan_id,is_archived,created_at,updated_at) VALUES(?1,'GYM-1','Ali',?2,0,?3,?3)", params![member,plan,now]).unwrap();
        (conn, member, plan)
    }

    #[test]
    fn generation_is_idempotent_and_crosses_years() {
        let (conn, member, plan) = setup();
        let current = parse_date(&today_iso()).unwrap();
        let start = current - Duration::days(300);
        create_membership_for_plan(&conn, &member, &plan, &start.format("%Y-%m-%d").to_string())
            .unwrap();
        ensure_monthly_billing_generated(&conn, &member).unwrap();
        ensure_monthly_billing_generated(&conn, &member).unwrap();
        let bills = billing_repository::list_member_bills(&conn, &member).unwrap();
        assert_eq!(bills.len(), 11);
        let unique: std::collections::HashSet<_> =
            bills.iter().map(|b| &b.billing_period).collect();
        assert_eq!(unique.len(), bills.len());
    }

    #[test]
    fn partial_payment_allocates_oldest_first_and_void_reverses_it() {
        let (conn, member, plan) = setup();
        let current = parse_date(&today_iso()).unwrap();
        let start = current - Duration::days(90);
        create_membership_for_plan(&conn, &member, &plan, &start.format("%Y-%m-%d").to_string())
            .unwrap();
        let payment = crate::services::payment_service::create_payment(
            &conn,
            CreatePaymentRequest {
                member_id: member.clone(),
                membership_plan_id: plan,
                amount: 5000,
                payment_method: "Cash".into(),
                payment_date: today_iso(),
                admission_fee: None,
                description: None,
                reference: None,
                notes: None,
                idempotency_key: Some("fifo-test".into()),
            },
        )
        .unwrap();
        let bills = billing_repository::list_member_bills(&conn, &member).unwrap();
        assert_eq!(
            (
                bills[0].paid_amount,
                bills[1].paid_amount,
                bills[2].paid_amount,
                bills[3].paid_amount
            ),
            (2000, 2000, 1000, 0)
        );
        assert_eq!(
            get_billing_summary(&conn, &member)
                .unwrap()
                .total_outstanding,
            3000
        );
        crate::services::payment_service::void_payment(&conn, &payment.id, "test reversal")
            .unwrap();
        assert_eq!(
            get_billing_summary(&conn, &member)
                .unwrap()
                .total_outstanding,
            8000
        );
    }

    #[test]
    fn ended_membership_does_not_generate_future_bills() {
        let (conn, member, plan) = setup();
        create_membership_for_plan(&conn, &member, &plan, &today_iso()).unwrap();
        end_active_membership(&conn, &member, "cancelled", &today_iso()).unwrap();
        assert_eq!(ensure_monthly_billing_generated(&conn, &member).unwrap(), 0);
        assert_eq!(
            billing_repository::list_member_bills(&conn, &member)
                .unwrap()
                .len(),
            1
        );
    }

    #[test]
    fn duplicate_request_returns_original_payment() {
        let (conn, member, plan) = setup();
        create_membership_for_plan(&conn, &member, &plan, &today_iso()).unwrap();
        let make_request = || CreatePaymentRequest {
            member_id: member.clone(),
            membership_plan_id: plan.clone(),
            amount: 1000,
            payment_method: "Cash".into(),
            payment_date: today_iso(),
            admission_fee: None,
            description: None,
            reference: None,
            notes: None,
            idempotency_key: Some("same-request".into()),
        };
        let first =
            crate::services::payment_service::create_payment(&conn, make_request()).unwrap();
        let retry =
            crate::services::payment_service::create_payment(&conn, make_request()).unwrap();
        assert_eq!(first.id, retry.id);
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM payments", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn receipt_failure_rolls_back_payment_and_allocations() {
        let (conn, member, plan) = setup();
        create_membership_for_plan(&conn, &member, &plan, &today_iso()).unwrap();
        conn.execute_batch("CREATE TRIGGER fail_receipt BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT, 'receipt failed'); END;").unwrap();
        let result = crate::services::payment_service::create_payment(
            &conn,
            CreatePaymentRequest {
                member_id: member.clone(),
                membership_plan_id: plan,
                amount: 1000,
                payment_method: "Cash".into(),
                payment_date: today_iso(),
                admission_fee: None,
                description: None,
                reference: None,
                notes: None,
                idempotency_key: Some("rollback-test".into()),
            },
        );
        assert!(result.is_err());
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM payments", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
        assert_eq!(
            billing_repository::list_member_bills(&conn, &member).unwrap()[0].paid_amount,
            0
        );
    }

    #[test]
    fn one_day_test_plan_stays_in_recurring_dues_workflow() {
        let (conn, member, _) = setup();
        let now = now_iso8601();
        conn.execute(
            "INSERT INTO membership_plans(id,name,duration_days,price,is_active,created_at,updated_at) \
             VALUES('day-pass','1 day',1,100,1,?1,?1)",
            params![now],
        )
        .unwrap();
        conn.execute(
            "UPDATE members SET membership_plan_id='day-pass' WHERE id=?1",
            params![member],
        )
        .unwrap();

        let payment = crate::services::payment_service::create_payment(
            &conn,
            CreatePaymentRequest {
                member_id: member.clone(),
                membership_plan_id: "day-pass".into(),
                amount: 100,
                payment_method: "Cash".into(),
                payment_date: today_iso(),
                admission_fee: None,
                description: None,
                reference: None,
                notes: None,
                idempotency_key: Some("day-pass-payment".into()),
            },
        )
        .unwrap();

        assert_eq!(payment.amount, 100);
        assert!(billing_repository::get_open_membership(&conn, &member)
            .unwrap()
            .is_some());
        let bills = billing_repository::list_member_bills(&conn, &member).unwrap();
        assert_eq!(bills.len(), 1);
        assert_eq!(bills[0].status, "PAID");
        assert_eq!(ensure_monthly_billing_generated(&conn, &member).unwrap(), 0);

        let today = parse_date(&today_iso()).unwrap();
        assert_eq!(
            ensure_billing_generated_at(&conn, &member, today + Duration::days(1)).unwrap(),
            1
        );
        let bills = billing_repository::list_member_bills(&conn, &member).unwrap();
        assert_eq!(bills.len(), 2);
        assert_eq!(
            bills[1].period_start,
            (today + Duration::days(1)).format("%Y-%m-%d").to_string()
        );
        assert_eq!(bills[1].expected_amount, 100);
        assert_eq!(bills[1].status, "CURRENT");

        // Reopening after two more missed daily cycles catches up once, without duplicates.
        assert_eq!(
            ensure_billing_generated_at(&conn, &member, today + Duration::days(3)).unwrap(),
            2
        );
        assert_eq!(
            ensure_billing_generated_at(&conn, &member, today + Duration::days(3)).unwrap(),
            0
        );
        let bills = billing_repository::list_member_bills(&conn, &member).unwrap();
        assert_eq!(bills.len(), 4);
        assert_eq!(bills[1].status, "DUE");
        assert_eq!(bills[2].status, "DUE");
        assert_eq!(bills[3].status, "CURRENT");
    }

    #[test]
    fn seven_day_plan_renews_when_each_week_expires() {
        let (conn, member, _) = setup();
        let now = now_iso8601();
        conn.execute(
            "INSERT INTO membership_plans(id,name,duration_days,price,is_active,created_at,updated_at) \
             VALUES('weekly','Weekly',7,700,1,?1,?1)",
            params![now],
        )
        .unwrap();
        let today = parse_date(&today_iso()).unwrap();
        let start = today - Duration::days(14);
        create_membership_for_plan(
            &conn,
            &member,
            "weekly",
            &start.format("%Y-%m-%d").to_string(),
        )
        .unwrap();

        let bills = billing_repository::list_member_bills(&conn, &member).unwrap();
        assert_eq!(bills.len(), 3);
        assert_eq!(bills[0].period_start, start.format("%Y-%m-%d").to_string());
        assert_eq!(
            bills[0].period_end,
            (start + Duration::days(6)).format("%Y-%m-%d").to_string()
        );
        assert_eq!(bills[2].period_start, today.format("%Y-%m-%d").to_string());
        assert_eq!(bills[2].status, "CURRENT");
    }
}
