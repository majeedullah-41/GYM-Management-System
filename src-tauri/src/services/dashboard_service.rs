use chrono::{Datelike, Duration, Local, Utc};
use rusqlite::{params, Connection};

use crate::dto::dashboard::{DashboardSummary, ExpiringMember};
use crate::dto::member::MemberResponse;
use crate::errors::AppError;
use crate::repositories::{
    expense_repository, member_repository, payment_repository,
};

pub fn get_dashboard_summary(conn: &Connection) -> Result<DashboardSummary, AppError> {
    let today = Utc::now().date_naive();
    let today_str = today.format("%Y-%m-%d").to_string();

    let month_start = Local::now()
        .date_naive()
        .with_day(1)
        .unwrap()
        .format("%Y-%m-%d")
        .to_string();
    let month_end = {
        let now = Local::now().date_naive();
        let y = now.year();
        let m = now.month();
        let last_day = if m == 12 {
            chrono::NaiveDate::from_ymd_opt(y + 1, 1, 1)
        } else {
            chrono::NaiveDate::from_ymd_opt(y, m + 1, 1)
        }
        .unwrap()
        .pred_opt()
        .unwrap();
        last_day.format("%Y-%m-%d").to_string()
    };

    let total_members: i64 = conn.query_row(
        "SELECT COUNT(*) FROM members WHERE is_archived = 0",
        [],
        |row| row.get(0),
    )?;

    let all_members = member_repository::list(conn, "", false)?;

    let mut active_members: i64 = 0;
    let mut expiring_soon: i64 = 0;
    let mut expired_members: i64 = 0;
    let mut expiring_members_list: Vec<ExpiringMember> = Vec::new();

    for member in &all_members {
        let membership =
            crate::repositories::member_repository::get_latest_membership_info(conn, &member.id)?;
        if let Some(ref expiry_str) = membership.2 {
            if let Ok(expiry) = chrono::NaiveDate::parse_from_str(expiry_str, "%Y-%m-%d") {
                if expiry < today {
                    expired_members += 1;
                } else if expiry <= today + Duration::days(7) {
                    expiring_soon += 1;
                    let days = (expiry - today).num_days();
                    expiring_members_list.push(ExpiringMember {
                        id: member.id.clone(),
                        member_number: member.member_number.clone(),
                        full_name: member.full_name.clone(),
                        plan_name: membership.0.clone(),
                        membership_expiry_date: membership.2.clone(),
                        days_remaining: days,
                        outstanding: membership.3,
                    });
                } else {
                    active_members += 1;
                }
            }
        }
    }

    expiring_members_list.sort_by(|a, b| a.days_remaining.cmp(&b.days_remaining));

    let today_revenue: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_date = ?1",
        params![today_str],
        |row| row.get(0),
    )?;

    let month_revenue: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_date >= ?1 AND payment_date <= ?2",
        params![month_start, month_end],
        |row| row.get(0),
    )?;

    let month_expenses =
        expense_repository::total_by_date_range(conn, &month_start, &month_end)?;

    let recent_payments_raw = payment_repository::list(conn, "", None, None, None, None, None)?;
    let recent_limit = recent_payments_raw.into_iter().take(5);
    let mut recent_payments = Vec::new();
    for p in recent_limit {
        let resp = crate::services::payment_service::resolve_single(conn, p)?;
        recent_payments.push(resp);
    }

    let recent_members_raw: Vec<MemberResponse> = all_members
        .iter()
        .take(5)
        .map(|m| {
            let membership =
                crate::repositories::member_repository::get_latest_membership_info(conn, &m.id)?;
            let status = compute_status(&membership.2, today);
            Ok(MemberResponse {
                id: m.id.clone(),
                member_number: m.member_number.clone(),
                full_name: m.full_name.clone(),
                father_name: m.father_name.clone(),
                phone: m.phone.clone(),
                cnic: m.cnic.clone(),
                address: m.address.clone(),
                date_of_birth: m.date_of_birth.clone(),
                gender: m.gender.clone(),
                notes: m.notes.clone(),
                is_archived: m.is_archived,
                admission_fee: m.admission_fee,
                membership_plan_id: m.membership_plan_id.clone(),
                admission_fee_collected: false,
                membership_plan_name: membership.0,
                membership_start_date: membership.1,
                membership_expiry_date: membership.2,
                membership_status: Some(status),
                outstanding_balance: membership.3,
                created_at: m.created_at.clone(),
                updated_at: m.updated_at.clone(),
            })
        })
        .collect::<Result<Vec<_>, AppError>>()?;

    let total_outstanding = payment_repository::get_total_outstanding(conn)?;

    Ok(DashboardSummary {
        total_members,
        active_members,
        expiring_soon,
        expired_members,
        today_revenue,
        month_revenue,
        month_expenses,
        month_net_income: month_revenue - month_expenses,
        total_outstanding,
        recent_payments,
        recent_members: recent_members_raw,
        expiring_members: expiring_members_list,
    })
}

fn compute_status(expiry: &Option<String>, today: chrono::NaiveDate) -> String {
    match expiry {
        None => "expired".to_string(),
        Some(ref exp) => {
            if let Ok(expiry_date) = chrono::NaiveDate::parse_from_str(exp, "%Y-%m-%d") {
                if expiry_date < today {
                    "expired".to_string()
                } else if expiry_date <= today + Duration::days(7) {
                    "expiring".to_string()
                } else {
                    "active".to_string()
                }
            } else {
                "expired".to_string()
            }
        }
    }
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

    #[test]
    fn should_return_empty_dashboard() {
        let conn = test_db();
        let summary = get_dashboard_summary(&conn).unwrap();
        assert_eq!(summary.total_members, 0);
        assert_eq!(summary.today_revenue, 0);
        assert_eq!(summary.month_expenses, 0);
        assert_eq!(summary.total_outstanding, 0);
        assert!(summary.recent_payments.is_empty());
        assert!(summary.recent_members.is_empty());
        assert!(summary.expiring_members.is_empty());
    }

    #[test]
    fn should_count_members() {
        let conn = test_db();
        let now = crate::utils::dates::now_iso8601();
        conn.execute(
            "INSERT INTO members (id, member_number, full_name, is_archived, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 0, ?4, ?5)",
            params!["m1", "GYM-000001", "Ahmad", now, now],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO members (id, member_number, full_name, is_archived, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 1, ?4, ?5)",
            params!["m2", "GYM-000002", "Archived", now, now],
        )
        .unwrap();

        let summary = get_dashboard_summary(&conn).unwrap();
        assert_eq!(summary.total_members, 1);
    }

    #[test]
    fn should_calculate_revenue() {
        let conn = test_db();
        let now = crate::utils::dates::now_iso8601();
        let today = Utc::now().date_naive().format("%Y-%m-%d").to_string();

        let member_id = "m1";
        let plan_id = "p1";
        conn.execute(
            "INSERT INTO members (id, member_number, full_name, is_archived, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 0, ?4, ?5)",
            params![member_id, "GYM-000001", "Ahmad", now, now],
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
             VALUES (?1, ?2, ?3, 2000, 'Cash', ?4, ?5, ?4, '2025-02-15', ?6, ?7)",
            params!["pay1", "RCP-000001", member_id, today, plan_id, now, now],
        )
        .unwrap();

        let summary = get_dashboard_summary(&conn).unwrap();
        assert_eq!(summary.today_revenue, 2000);
    }

    #[test]
    fn should_include_recent_members() {
        let conn = test_db();
        let now = crate::utils::dates::now_iso8601();
        for i in 0..3 {
            conn.execute(
                "INSERT INTO members (id, member_number, full_name, is_archived, created_at, updated_at) \
                 VALUES (?1, ?2, ?3, 0, ?4, ?5)",
                params![format!("m{}", i), format!("GYM-{:06}", i + 1), format!("Member {}", i), now, now],
            )
            .unwrap();
        }

        let summary = get_dashboard_summary(&conn).unwrap();
        assert_eq!(summary.recent_members.len(), 3);
    }

    #[test]
    fn should_populate_expiring_members() {
        let conn = test_db();
        let now = crate::utils::dates::now_iso8601();
        let today = Utc::now().date_naive();
        let expiry = (today + Duration::days(3)).format("%Y-%m-%d").to_string();

        let member_id = "m1";
        let plan_id = "p1";
        conn.execute(
            "INSERT INTO members (id, member_number, full_name, is_archived, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 0, ?4, ?5)",
            params![member_id, "GYM-000001", "Ahmad", now, now],
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
             VALUES (?1, ?2, ?3, 2000, 'Cash', ?4, ?5, ?4, ?6, ?7, ?8)",
            params!["pay1", "RCP-000001", member_id, now, plan_id, expiry, now, now],
        )
        .unwrap();

        let summary = get_dashboard_summary(&conn).unwrap();
        assert_eq!(summary.expiring_members.len(), 1);
        assert_eq!(summary.expiring_members[0].days_remaining, 3);
        assert_eq!(summary.expiring_members[0].full_name, "Ahmad");
    }

    #[test]
    fn should_populate_recent_payments() {
        let conn = test_db();
        let now = crate::utils::dates::now_iso8601();
        let today = Utc::now().date_naive().format("%Y-%m-%d").to_string();

        let member_id = "m1";
        let plan_id = "p1";
        conn.execute(
            "INSERT INTO members (id, member_number, full_name, is_archived, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 0, ?4, ?5)",
            params![member_id, "GYM-000001", "Ahmad", now, now],
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
             VALUES (?1, ?2, ?3, 2000, 'Cash', ?4, ?5, ?4, '2025-02-15', ?6, ?7)",
            params!["pay1", "RCP-000001", member_id, today, plan_id, now, now],
        )
        .unwrap();

        let summary = get_dashboard_summary(&conn).unwrap();
        assert_eq!(summary.recent_payments.len(), 1);
    }
}
