#[cfg(test)]
use chrono::{Duration, NaiveDate, Utc};
use rusqlite::Connection;

use crate::dto::member::{
    CreateMemberRequest, MemberResponse, MembershipInfo, UpdateMemberRequest,
};
use crate::errors::AppError;
use crate::models::Member;
use crate::repositories::{member_repository, membership_plan_repository};
use crate::utils::dates::now_iso8601;

pub fn create_member(
    conn: &Connection,
    request: CreateMemberRequest,
) -> Result<MemberResponse, AppError> {
    let full_name = request.full_name.trim().to_string();
    if full_name.is_empty() {
        return Err(AppError::ValidationError("Member name is required".into()));
    }

    if let Some(ref phone) = request.phone {
        if !phone.trim().is_empty() && phone.trim().len() < 10 {
            return Err(AppError::ValidationError(
                "Phone number must be at least 10 digits".into(),
            ));
        }
    }

    if let Some(ref plan_id) = request.membership_plan_id {
        let plan = membership_plan_repository::get_by_id(conn, plan_id)?.ok_or_else(|| {
            AppError::NotFoundError(format!("Membership plan '{}' not found", plan_id))
        })?;
        if !plan.is_active {
            return Err(AppError::ValidationError(
                "Cannot assign an inactive membership plan".into(),
            ));
        }
    }

    let now = now_iso8601();
    let member_number = member_repository::next_member_number(conn)?;

    let member = Member {
        id: uuid::Uuid::new_v4().to_string(),
        member_number,
        full_name,
        father_name: request
            .father_name
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty()),
        phone: request
            .phone
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty()),
        cnic: request
            .cnic
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty()),
        address: request
            .address
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty()),
        date_of_birth: request.date_of_birth,
        gender: request.gender,
        blood_group: normalize_blood_group(request.blood_group)?,
        photo_path: None,
        notes: request
            .notes
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty()),
        admission_fee: None,
        membership_plan_id: request.membership_plan_id,
        is_archived: false,
        created_at: now.clone(),
        updated_at: now,
    };

    let tx = conn.unchecked_transaction()?;
    member_repository::create(&tx, &member)?;
    if let Some(ref plan_id) = member.membership_plan_id {
        crate::services::billing_service::create_membership_for_plan(
            &tx,
            &member.id,
            plan_id,
            &crate::utils::dates::today_iso(),
        )?;
    }
    tx.commit()?;
    log::info!(
        "Created member: {} ({})",
        member.full_name,
        member.member_number
    );

    let membership = get_membership_info(conn, &member.id)?;
    Ok(MemberResponse::from_member(member, membership))
}

pub fn get_member(conn: &Connection, id: &str) -> Result<MemberResponse, AppError> {
    let member = member_repository::get_operational_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Member '{}' not found", id)))?;
    let membership = get_membership_info(conn, &member.id)?;
    Ok(MemberResponse::from_member(member, membership))
}

pub fn list_members(
    conn: &Connection,
    search: &str,
    status_filter: Option<&str>,
    include_archived: bool,
) -> Result<Vec<MemberResponse>, AppError> {
    let members = member_repository::list(conn, search, include_archived)?;

    let mut responses: Vec<MemberResponse> = Vec::with_capacity(members.len());
    for member in members {
        let membership = get_membership_info(conn, &member.id)?;

        if let Some(filter) = status_filter {
            let is_paid = membership.outstanding_balance <= 0;
            match filter {
                "paid" if !is_paid => continue,
                "unpaid" if is_paid => continue,
                "active" if membership.status.as_deref() != Some("active") => continue,
                "expiring" if membership.status.as_deref() != Some("expiring") => continue,
                "expired" if membership.status.as_deref() != Some("expired") => continue,
                "none" if membership.status.is_some() => continue,
                _ => {}
            }
        }

        responses.push(MemberResponse::from_member(member, membership));
    }

    Ok(responses)
}

pub fn update_member(
    conn: &Connection,
    id: &str,
    request: UpdateMemberRequest,
) -> Result<MemberResponse, AppError> {
    let mut member = member_repository::get_operational_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Member '{}' not found", id)))?;

    let full_name = request.full_name.trim().to_string();
    if full_name.is_empty() {
        return Err(AppError::ValidationError("Member name is required".into()));
    }

    if let Some(ref phone) = request.phone {
        if !phone.trim().is_empty() && phone.trim().len() < 10 {
            return Err(AppError::ValidationError(
                "Phone number must be at least 10 digits".into(),
            ));
        }
    }

    member.full_name = full_name;
    member.father_name = request
        .father_name
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    member.phone = request
        .phone
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    member.cnic = request
        .cnic
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    member.address = request
        .address
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    member.date_of_birth = request.date_of_birth;
    member.gender = request.gender;
    member.blood_group = normalize_blood_group(request.blood_group)?;
    member.notes = request
        .notes
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    member.admission_fee = None;
    let old_plan_id = member.membership_plan_id.clone();
    member.membership_plan_id = request.membership_plan_id.clone();
    member.updated_at = now_iso8601();

    if let Some(ref plan_id) = member.membership_plan_id {
        let plan = membership_plan_repository::get_by_id(conn, plan_id)?.ok_or_else(|| {
            AppError::NotFoundError(format!("Membership plan '{}' not found", plan_id))
        })?;
        if !plan.is_active {
            return Err(AppError::ValidationError(
                "Cannot assign an inactive membership plan".into(),
            ));
        }
    }

    let tx = conn.unchecked_transaction()?;
    member_repository::update(&tx, &member)?;
    if old_plan_id != member.membership_plan_id {
        crate::services::billing_service::end_active_membership(
            &tx,
            id,
            "cancelled",
            &crate::utils::dates::today_iso(),
        )?;
        if let Some(ref plan_id) = member.membership_plan_id {
            crate::services::billing_service::create_membership_for_plan(
                &tx,
                id,
                plan_id,
                &crate::utils::dates::today_iso(),
            )?;
        }
    }
    tx.commit()?;
    log::info!(
        "Updated member: {} ({})",
        member.full_name,
        member.member_number
    );

    let membership = get_membership_info(conn, &member.id)?;
    Ok(MemberResponse::from_member(member, membership))
}

fn normalize_blood_group(value: Option<String>) -> Result<Option<String>, AppError> {
    let value = value.map(|group| group.trim().to_uppercase());
    match value.as_deref() {
        None | Some("") => Ok(None),
        Some("A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-") => Ok(value),
        Some(_) => Err(AppError::ValidationError("Invalid blood group".into())),
    }
}

pub fn archive_member(conn: &Connection, id: &str) -> Result<MemberResponse, AppError> {
    let member = member_repository::get_operational_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Member '{}' not found", id)))?;

    let now = now_iso8601();
    let tx = conn.unchecked_transaction()?;
    member_repository::archive(&tx, id, &now)?;
    crate::services::billing_service::end_active_membership(
        &tx,
        id,
        "cancelled",
        &crate::utils::dates::today_iso(),
    )?;
    tx.commit()?;
    log::info!(
        "Archived member: {} ({})",
        member.full_name,
        member.member_number
    );

    let mut updated = member;
    updated.is_archived = true;
    updated.updated_at = now;
    let membership = get_membership_info(conn, &updated.id)?;
    Ok(MemberResponse::from_member(updated, membership))
}

pub fn unarchive_member(conn: &Connection, id: &str) -> Result<MemberResponse, AppError> {
    let member = member_repository::get_operational_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Member '{}' not found", id)))?;

    let now = now_iso8601();
    let tx = conn.unchecked_transaction()?;
    member_repository::unarchive(&tx, id, &now)?;
    if let Some(ref plan_id) = member.membership_plan_id {
        let plan = membership_plan_repository::get_by_id(&tx, plan_id)?
            .ok_or_else(|| AppError::NotFoundError("Assigned plan not found".into()))?;
        if plan.is_active {
            crate::services::billing_service::create_membership_for_plan(
                &tx,
                id,
                plan_id,
                &crate::utils::dates::today_iso(),
            )?;
        }
    }
    tx.commit()?;
    log::info!(
        "Reactivated member: {} ({})",
        member.full_name,
        member.member_number
    );

    let mut updated = member;
    updated.is_archived = false;
    updated.updated_at = now;
    let membership = get_membership_info(conn, &updated.id)?;
    Ok(MemberResponse::from_member(updated, membership))
}

pub fn permanently_delete_member(conn: &Connection, id: &str) -> Result<(), AppError> {
    let member = member_repository::get_operational_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Member '{}' not found", id)))?;
    if !member.is_archived {
        return Err(AppError::ValidationError(
            "Archive the member before deleting them permanently".into(),
        ));
    }

    let now = now_iso8601();
    let today = crate::utils::dates::today_iso();
    let tx = conn.unchecked_transaction()?;

    // Preserve paid amounts, allocations, payments and receipts. Only forgive
    // the unpaid portion so historical revenue and receipt reprints stay valid.
    tx.execute(
        "UPDATE monthly_membership_bills \
         SET expected_amount = paid_amount, status = 'PAID', updated_at = ?2 \
         WHERE member_id = ?1 AND expected_amount > paid_amount",
        rusqlite::params![id, now],
    )?;
    tx.execute(
        "UPDATE memberships \
         SET status = 'terminated', ended_at = COALESCE(ended_at, ?2), \
             status_changed_at = ?3, updated_at = ?3 \
         WHERE member_id = ?1",
        rusqlite::params![id, today, now],
    )?;
    member_repository::mark_permanently_deleted(&tx, id, &now)?;
    tx.commit()?;

    log::info!(
        "Permanently removed member from operational views: {} ({})",
        member.full_name,
        member.member_number
    );
    Ok(())
}

fn get_membership_info(conn: &Connection, member_id: &str) -> Result<MembershipInfo, AppError> {
    let billing = crate::services::billing_service::get_billing_summary(conn, member_id)?;
    let plan_name = billing.plan_name;
    let start_date = billing.enrollment_date;
    let expiry_date = None;
    // Net balance: dues still owed minus any prepaid (advance) credit. A paid
    // ahead member therefore surfaces a negative balance here.
    let advance_credit =
        crate::services::billing_service::advance_credit(conn, member_id)?;
    let outstanding = billing.total_outstanding - advance_credit;
    let status = billing.membership_status;

    Ok(MembershipInfo {
        plan_name,
        start_date,
        expiry_date,
        status,
        outstanding_balance: outstanding,
    })
}

#[cfg(test)]
fn compute_membership_status(expiry_date: Option<&str>) -> Option<String> {
    let expiry_str = expiry_date?;
    let today = Utc::now().date_naive();
    let expiry = NaiveDate::parse_from_str(expiry_str, "%Y-%m-%d").ok()?;

    if expiry < today {
        Some("expired".to_string())
    } else if expiry <= today + Duration::days(7) {
        Some("expiring".to_string())
    } else {
        Some("active".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrations;
    use crate::dto::member::CreateMemberRequest;
    use crate::dto::payment::CreatePaymentRequest;
    use rusqlite::Connection;

    fn test_db() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&mut conn).unwrap();
        conn
    }

    fn valid_request(name: &str) -> CreateMemberRequest {
        CreateMemberRequest {
            full_name: name.to_string(),
            father_name: None,
            phone: None,
            cnic: None,
            address: None,
            date_of_birth: None,
            gender: None,
            blood_group: None,
            notes: None,
            membership_plan_id: None,
        }
    }

    fn insert_active_plan(conn: &Connection, id: &str, name: &str) {
        conn.execute(
            "INSERT INTO membership_plans (id, name, duration_days, price, description, is_active, created_at, updated_at) \
             VALUES (?1, ?2, 30, 2000, NULL, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
            rusqlite::params![id, name],
        )
        .unwrap();
    }

    fn insert_inactive_plan(conn: &Connection, id: &str, name: &str) {
        conn.execute(
            "INSERT INTO membership_plans (id, name, duration_days, price, description, is_active, created_at, updated_at) \
             VALUES (?1, ?2, 30, 2000, NULL, 0, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
            rusqlite::params![id, name],
        )
        .unwrap();
    }

    #[test]
    fn should_create_member_with_valid_data() {
        let conn = test_db();
        let result = create_member(&conn, valid_request("Ahmad Khan")).unwrap();
        assert_eq!(result.full_name, "Ahmad Khan");
        assert!(result.member_number.starts_with("GYM-"));
        assert!(!result.is_archived);
    }

    #[test]
    fn should_store_and_normalize_blood_group() {
        let conn = test_db();
        let result = create_member(
            &conn,
            CreateMemberRequest {
                blood_group: Some("  ab+  ".to_string()),
                ..valid_request("Ahmad Khan")
            },
        )
        .unwrap();

        assert_eq!(result.blood_group.as_deref(), Some("AB+"));
        let stored: Option<String> = conn
            .query_row(
                "SELECT blood_group FROM members WHERE id = ?1",
                [&result.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(stored.as_deref(), Some("AB+"));
    }

    #[test]
    fn should_reject_invalid_blood_group() {
        let conn = test_db();
        let result = create_member(
            &conn,
            CreateMemberRequest {
                blood_group: Some("X+".to_string()),
                ..valid_request("Ahmad Khan")
            },
        );

        assert!(matches!(result, Err(AppError::ValidationError(_))));
    }

    #[test]
    fn should_create_member_with_initial_plan() {
        let conn = test_db();
        insert_active_plan(&conn, "plan-1", "Monthly");

        let result = create_member(
            &conn,
            CreateMemberRequest {
                full_name: "Ahmad Khan".to_string(),
                membership_plan_id: Some("plan-1".to_string()),
                ..valid_request("Ahmad Khan")
            },
        )
        .unwrap();
        assert_eq!(result.membership_plan_id.as_deref(), Some("plan-1"));
    }

    #[test]
    fn should_reject_missing_plan() {
        let conn = test_db();
        let result = create_member(
            &conn,
            CreateMemberRequest {
                full_name: "Ahmad Khan".to_string(),
                membership_plan_id: Some("missing".to_string()),
                ..valid_request("Ahmad Khan")
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_inactive_plan() {
        let conn = test_db();
        insert_inactive_plan(&conn, "plan-inactive", "Old");

        let result = create_member(
            &conn,
            CreateMemberRequest {
                full_name: "Ahmad Khan".to_string(),
                membership_plan_id: Some("plan-inactive".to_string()),
                ..valid_request("Ahmad Khan")
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_empty_name() {
        let conn = test_db();
        let result = create_member(&conn, valid_request(""));
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_whitespace_only_name() {
        let conn = test_db();
        let result = create_member(&conn, valid_request("   "));
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_short_phone() {
        let conn = test_db();
        let result = create_member(
            &conn,
            CreateMemberRequest {
                full_name: "Test".to_string(),
                phone: Some("123".to_string()),
                ..valid_request("Test")
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn should_trim_name() {
        let conn = test_db();
        let result = create_member(&conn, valid_request("  Ahmad  ")).unwrap();
        assert_eq!(result.full_name, "Ahmad");
    }

    #[test]
    fn should_get_member() {
        let conn = test_db();
        let created = create_member(&conn, valid_request("Ahmad")).unwrap();
        let fetched = get_member(&conn, &created.id).unwrap();
        assert_eq!(fetched.id, created.id);
    }

    #[test]
    fn should_list_members() {
        let conn = test_db();
        create_member(&conn, valid_request("Ahmad")).unwrap();
        create_member(&conn, valid_request("Hamza")).unwrap();

        let members = list_members(&conn, "", None, false).unwrap();
        assert_eq!(members.len(), 2);
    }

    #[test]
    fn should_search_by_name() {
        let conn = test_db();
        create_member(&conn, valid_request("Ahmad Khan")).unwrap();
        create_member(&conn, valid_request("Hamza Ali")).unwrap();

        let results = list_members(&conn, "ahmad", None, false).unwrap();
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn should_update_member() {
        let conn = test_db();
        let created = create_member(&conn, valid_request("Old Name")).unwrap();
        let updated = update_member(
            &conn,
            &created.id,
            UpdateMemberRequest {
                full_name: "New Name".to_string(),
                father_name: None,
                phone: None,
                cnic: None,
                address: None,
                date_of_birth: None,
                gender: None,
                blood_group: None,
                notes: None,
                membership_plan_id: None,
            },
        )
        .unwrap();
        assert_eq!(updated.full_name, "New Name");
    }

    #[test]
    fn should_archive_member() {
        let conn = test_db();
        let created = create_member(&conn, valid_request("To Archive")).unwrap();
        let archived = archive_member(&conn, &created.id).unwrap();
        assert!(archived.is_archived);

        let active = list_members(&conn, "", None, false).unwrap();
        assert_eq!(active.len(), 0);
    }

    #[test]
    fn permanently_deleted_member_keeps_payment_history_and_clears_dues() {
        let conn = test_db();
        insert_active_plan(&conn, "plan-delete", "Monthly Delete Test");
        let created = create_member(
            &conn,
            CreateMemberRequest {
                membership_plan_id: Some("plan-delete".to_string()),
                ..valid_request("Historical Member")
            },
        )
        .unwrap();
        let payment = crate::services::payment_service::create_payment(
            &conn,
            CreatePaymentRequest {
                member_id: created.id.clone(),
                membership_plan_id: "plan-delete".to_string(),
                amount: 500,
                payment_method: "Cash".to_string(),
                payment_date: crate::utils::dates::today_iso(),
                description: None,
                reference: None,
                notes: None,
                idempotency_key: Some("delete-history-test".to_string()),
            },
        )
        .unwrap();

        let revenue_before: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE is_voided = 0",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let receipt_count_before: i64 = conn
            .query_row("SELECT COUNT(*) FROM receipts", [], |row| row.get(0))
            .unwrap();
        let allocation_count_before: i64 = conn
            .query_row("SELECT COUNT(*) FROM payment_allocations", [], |row| {
                row.get(0)
            })
            .unwrap();

        archive_member(&conn, &created.id).unwrap();
        assert!(
            get_membership_info(&conn, &created.id)
                .unwrap()
                .outstanding_balance
                > 0
        );

        permanently_delete_member(&conn, &created.id).unwrap();

        assert!(get_member(&conn, &created.id).is_err());
        assert!(list_members(&conn, "", None, true).unwrap().is_empty());
        assert_eq!(
            get_membership_info(&conn, &created.id)
                .unwrap()
                .outstanding_balance,
            0
        );
        let historical = crate::services::payment_service::get_payment(&conn, &payment.id).unwrap();
        assert_eq!(historical.member_name.as_deref(), Some("Historical Member"));
        assert!(
            crate::services::receipt_service::get_receipt_by_payment_id(&conn, &payment.id).is_ok()
        );
        let revenue_after: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE is_voided = 0",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let receipt_count_after: i64 = conn
            .query_row("SELECT COUNT(*) FROM receipts", [], |row| row.get(0))
            .unwrap();
        let allocation_count_after: i64 = conn
            .query_row("SELECT COUNT(*) FROM payment_allocations", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(revenue_after, revenue_before);
        assert_eq!(receipt_count_after, receipt_count_before);
        assert_eq!(allocation_count_after, allocation_count_before);
    }

    #[test]
    fn permanently_deleting_active_member_is_rejected() {
        let conn = test_db();
        let created = create_member(&conn, valid_request("Active Member")).unwrap();

        let result = permanently_delete_member(&conn, &created.id);

        assert!(matches!(result, Err(AppError::ValidationError(_))));
        assert!(get_member(&conn, &created.id).is_ok());
    }

    #[test]
    fn member_balance_includes_advance_credit_as_negative() {
        let conn = test_db();
        insert_active_plan(&conn, "plan-credit", "Monthly");
        let created = create_member(
            &conn,
            CreateMemberRequest {
                membership_plan_id: Some("plan-credit".to_string()),
                ..valid_request("Ahead Member")
            },
        )
        .unwrap();

        crate::services::advance_payment_service::create(
            &conn,
            crate::dto::advance_payment::CreateAdvancePaymentRequest {
                member_id: created.id.clone(),
                period_count: 3,
                payment_method: "Cash".to_string(),
                note: None,
                idempotency_key: Some("credit-adv".to_string()),
            },
        )
        .unwrap();

        let listed = list_members(&conn, "", None, false).unwrap();
        assert_eq!(listed.len(), 1);
        // Dues are settled and three future periods are prepaid: -3 x 2000.
        assert_eq!(listed[0].outstanding_balance, -6000);
        assert!(listed[0].is_paid);
    }

    #[test]
    fn should_compute_active_status() {
        let status = compute_membership_status(Some("2099-12-31"));
        assert_eq!(status.as_deref(), Some("active"));
    }

    #[test]
    fn should_compute_expired_status() {
        let status = compute_membership_status(Some("2020-01-01"));
        assert_eq!(status.as_deref(), Some("expired"));
    }

    #[test]
    fn should_compute_expiring_status() {
        let today = Utc::now().date_naive();
        let in_5_days = (today + Duration::days(5)).format("%Y-%m-%d").to_string();
        let status = compute_membership_status(Some(&in_5_days));
        assert_eq!(status.as_deref(), Some("expiring"));
    }

    #[test]
    fn should_return_none_status_when_no_expiry() {
        let status = compute_membership_status(None);
        assert!(status.is_none());
    }
}
