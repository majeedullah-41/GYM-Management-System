use rusqlite::Connection;

use crate::dto::report::*;
use crate::errors::AppError;
use crate::utils::constants::is_valid_payment_method;

const VALID_REPORT_TYPES: &[&str] = &[
    "financial",
    "payment",
    "expense",
    "member",
    "membership_status",
];

pub fn generate_report(conn: &Connection, req: ReportRequest) -> Result<ReportResponse, AppError> {
    if !VALID_REPORT_TYPES.contains(&req.report_type.as_str()) {
        return Err(AppError::ValidationError(format!(
            "Invalid report type: {}. Valid types: {}",
            req.report_type,
            VALID_REPORT_TYPES.join(", ")
        )));
    }

    if let Some(ref df) = req.date_from {
        chrono::NaiveDate::parse_from_str(df, "%Y-%m-%d").map_err(|_| {
            AppError::ValidationError(format!(
                "Invalid date_from format: {}. Expected YYYY-MM-DD",
                df
            ))
        })?;
    }
    if let Some(ref dt) = req.date_to {
        chrono::NaiveDate::parse_from_str(dt, "%Y-%m-%d").map_err(|_| {
            AppError::ValidationError(format!(
                "Invalid date_to format: {}. Expected YYYY-MM-DD",
                dt
            ))
        })?;
    }

    if let Some(ref pm) = req.payment_method {
        if !is_valid_payment_method(pm) {
            return Err(AppError::ValidationError(format!(
                "Invalid payment_method: {}",
                pm
            )));
        }
    }

    match req.report_type.as_str() {
        "financial" => {
            let report = crate::repositories::report_repository::financial_report(
                conn,
                &req.date_from,
                &req.date_to,
            )?;
            Ok(ReportResponse::Financial(report))
        }
        "payment" => {
            let report = crate::repositories::report_repository::payment_report(
                conn,
                &req.date_from,
                &req.date_to,
                &req.member_id,
                &req.payment_method,
                &req.membership_plan_id,
            )?;
            Ok(ReportResponse::Payment(report))
        }
        "expense" => {
            let report = crate::repositories::report_repository::expense_report(
                conn,
                &req.date_from,
                &req.date_to,
                &req.expense_category,
            )?;
            Ok(ReportResponse::Expense(report))
        }
        "member" => {
            let report = crate::repositories::report_repository::member_report(conn)?;
            Ok(ReportResponse::Member(report))
        }
        "membership_status" => {
            let report = crate::repositories::report_repository::membership_status_report(conn)?;
            Ok(ReportResponse::MembershipStatus(report))
        }
        _ => unreachable!(),
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

    fn base_req(report_type: &str) -> ReportRequest {
        ReportRequest {
            report_type: report_type.into(),
            date_from: None,
            date_to: None,
            member_id: None,
            payment_method: None,
            membership_plan_id: None,
            expense_category: None,
        }
    }

    #[test]
    fn should_reject_invalid_report_type() {
        let conn = test_db();
        let req = base_req("invalid_type");
        let result = generate_report(&conn, req);
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_invalid_date_format() {
        let conn = test_db();
        let mut req = base_req("financial");
        req.date_from = Some("not-a-date".into());
        let result = generate_report(&conn, req);
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_invalid_payment_method() {
        let conn = test_db();
        let mut req = base_req("payment");
        req.payment_method = Some("Bitcoin".into());
        let result = generate_report(&conn, req);
        assert!(result.is_err());
    }

    #[test]
    fn should_generate_financial_report() {
        let conn = test_db();
        let req = base_req("financial");
        let result = generate_report(&conn, req).unwrap();
        match result {
            ReportResponse::Financial(r) => {
                assert_eq!(r.total_revenue, 0);
                assert_eq!(r.total_expenses, 0);
            }
            _ => panic!("Expected Financial report"),
        }
    }

    #[test]
    fn should_generate_payment_report() {
        let conn = test_db();
        let req = base_req("payment");
        let result = generate_report(&conn, req).unwrap();
        match result {
            ReportResponse::Payment(r) => {
                assert_eq!(r.total_count, 0);
            }
            _ => panic!("Expected Payment report"),
        }
    }

    #[test]
    fn should_generate_expense_report() {
        let conn = test_db();
        let req = base_req("expense");
        let result = generate_report(&conn, req).unwrap();
        match result {
            ReportResponse::Expense(r) => {
                assert_eq!(r.total_count, 0);
            }
            _ => panic!("Expected Expense report"),
        }
    }

    #[test]
    fn should_generate_member_report() {
        let conn = test_db();
        let req = base_req("member");
        let result = generate_report(&conn, req).unwrap();
        match result {
            ReportResponse::Member(r) => {
                assert_eq!(r.total_members, 0);
            }
            _ => panic!("Expected Member report"),
        }
    }

    #[test]
    fn should_generate_membership_status_report() {
        let conn = test_db();
        let req = base_req("membership_status");
        let result = generate_report(&conn, req).unwrap();
        match result {
            ReportResponse::MembershipStatus(r) => {
                assert!(r.active.is_empty());
            }
            _ => panic!("Expected MembershipStatus report"),
        }
    }

    #[test]
    fn should_accept_all_valid_report_types() {
        let conn = test_db();
        for rt in VALID_REPORT_TYPES {
            let req = base_req(rt);
            assert!(generate_report(&conn, req).is_ok());
        }
    }

    #[test]
    fn should_accept_valid_payment_methods() {
        let conn = test_db();
        for pm in crate::utils::constants::PAYMENT_METHODS {
            let mut req = base_req("payment");
            req.payment_method = Some(pm.to_string());
            assert!(generate_report(&conn, req).is_ok());
        }
    }
}
