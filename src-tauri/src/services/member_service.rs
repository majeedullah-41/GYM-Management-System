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
        return Err(AppError::ValidationError(
            "Member name is required".into(),
        ));
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
        father_name: request.father_name.map(|v| v.trim().to_string()).filter(|v| !v.is_empty()),
        phone: request.phone.map(|v| v.trim().to_string()).filter(|v| !v.is_empty()),
        cnic: request.cnic.map(|v| v.trim().to_string()).filter(|v| !v.is_empty()),
        address: request.address.map(|v| v.trim().to_string()).filter(|v| !v.is_empty()),
        date_of_birth: request.date_of_birth,
        gender: request.gender,
        photo_path: None,
        notes: request.notes.map(|v| v.trim().to_string()).filter(|v| !v.is_empty()),
        admission_fee: request.admission_fee.filter(|v| *v > 0),
        membership_plan_id: request.membership_plan_id,
        is_archived: false,
        created_at: now.clone(),
        updated_at: now,
    };

    member_repository::create(conn, &member)?;
    log::info!("Created member: {} ({})", member.full_name, member.member_number);

    let membership = get_membership_info(conn, &member.id)?;
    Ok(MemberResponse::from_member(member, membership))
}

pub fn get_member(conn: &Connection, id: &str) -> Result<MemberResponse, AppError> {
    let member = member_repository::get_by_id(conn, id)?
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
            match filter {
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
    let mut member = member_repository::get_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Member '{}' not found", id)))?;

    let full_name = request.full_name.trim().to_string();
    if full_name.is_empty() {
        return Err(AppError::ValidationError(
            "Member name is required".into(),
        ));
    }

    if let Some(ref phone) = request.phone {
        if !phone.trim().is_empty() && phone.trim().len() < 10 {
            return Err(AppError::ValidationError(
                "Phone number must be at least 10 digits".into(),
            ));
        }
    }

    member.full_name = full_name;
    member.father_name = request.father_name.map(|v| v.trim().to_string()).filter(|v| !v.is_empty());
    member.phone = request.phone.map(|v| v.trim().to_string()).filter(|v| !v.is_empty());
    member.cnic = request.cnic.map(|v| v.trim().to_string()).filter(|v| !v.is_empty());
    member.address = request.address.map(|v| v.trim().to_string()).filter(|v| !v.is_empty());
    member.date_of_birth = request.date_of_birth;
    member.gender = request.gender;
    member.notes = request.notes.map(|v| v.trim().to_string()).filter(|v| !v.is_empty());
    member.admission_fee = request.admission_fee.filter(|v| *v > 0);
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

    member_repository::update(conn, &member)?;
    log::info!("Updated member: {} ({})", member.full_name, member.member_number);

    let membership = get_membership_info(conn, &member.id)?;
    Ok(MemberResponse::from_member(member, membership))
}

pub fn archive_member(conn: &Connection, id: &str) -> Result<MemberResponse, AppError> {
    let member = member_repository::get_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Member '{}' not found", id)))?;

    let now = now_iso8601();
    member_repository::archive(conn, id, &now)?;
    log::info!("Archived member: {} ({})", member.full_name, member.member_number);

    let mut updated = member;
    updated.is_archived = true;
    updated.updated_at = now;
    let membership = get_membership_info(conn, &updated.id)?;
    Ok(MemberResponse::from_member(updated, membership))
}

pub fn unarchive_member(conn: &Connection, id: &str) -> Result<MemberResponse, AppError> {
    let member = member_repository::get_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Member '{}' not found", id)))?;

    let now = now_iso8601();
    member_repository::unarchive(conn, id, &now)?;
    log::info!("Reactivated member: {} ({})", member.full_name, member.member_number);

    let mut updated = member;
    updated.is_archived = false;
    updated.updated_at = now;
    let membership = get_membership_info(conn, &updated.id)?;
    Ok(MemberResponse::from_member(updated, membership))
}

fn get_membership_info(
    conn: &Connection,
    member_id: &str,
) -> Result<MembershipInfo, AppError> {
    let (plan_name, start_date, expiry_date, outstanding) =
        member_repository::get_latest_membership_info(conn, member_id)?;

    let status = compute_membership_status(expiry_date.as_deref());
    let admission_fee_collected = member_repository::has_any_payments(conn, member_id)?;

    Ok(MembershipInfo {
        plan_name,
        start_date,
        expiry_date,
        status,
        outstanding_balance: outstanding,
        admission_fee_collected,
    })
}

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
            notes: None,
            admission_fee: None,
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
    fn should_create_member_with_admission_fee() {
        let conn = test_db();
        let result = create_member(
            &conn,
            CreateMemberRequest {
                full_name: "Ahmad Khan".to_string(),
                admission_fee: Some(500),
                ..valid_request("Ahmad Khan")
            },
        )
        .unwrap();
        assert_eq!(result.admission_fee, Some(500));
        assert!(!result.admission_fee_collected);
        assert!(!result.is_archived);
    }

    #[test]
    fn should_ignore_zero_or_negative_admission_fee() {
        let conn = test_db();
        let result = create_member(
            &conn,
            CreateMemberRequest {
                full_name: "Ahmad Khan".to_string(),
                admission_fee: Some(0),
                ..valid_request("Ahmad Khan")
            },
        )
        .unwrap();
        assert_eq!(result.admission_fee, None);
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
                admission_fee: None,
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
                notes: None,
                admission_fee: None,
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
