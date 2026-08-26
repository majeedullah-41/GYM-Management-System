use rusqlite::Connection;

use crate::dto::report::*;
use crate::errors::AppError;

pub fn financial_report(
    conn: &Connection,
    date_from: &Option<String>,
    date_to: &Option<String>,
) -> Result<FinancialReportResponse, AppError> {
    let mut where_clauses = Vec::new();
    let mut pay_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut exp_where_clauses = Vec::new();
    let mut exp_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref df) = date_from {
        where_clauses.push("payment_date >= ?");
        pay_params.push(Box::new(df.clone()));
        exp_where_clauses.push("expense_date >= ?");
        exp_params.push(Box::new(df.clone()));
    }
    if let Some(ref dt) = date_to {
        where_clauses.push("payment_date <= ?");
        pay_params.push(Box::new(dt.clone()));
        exp_where_clauses.push("expense_date <= ?");
        exp_params.push(Box::new(dt.clone()));
    }

    let pay_where = if where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };
    let exp_where = if exp_where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", exp_where_clauses.join(" AND "))
    };

    let total_revenue: i64 = conn.query_row(
        &format!("SELECT COALESCE(SUM(amount), 0) FROM payments {}", pay_where),
        rusqlite::params_from_iter(pay_params.iter().map(|p| p.as_ref())),
        |row| row.get(0),
    )?;

    let payment_count: i64 = conn.query_row(
        &format!("SELECT COUNT(*) FROM payments {}", pay_where),
        rusqlite::params_from_iter(pay_params.iter().map(|p| p.as_ref())),
        |row| row.get(0),
    )?;

    let total_expenses: i64 = conn.query_row(
        &format!("SELECT COALESCE(SUM(amount), 0) FROM expenses {}", exp_where),
        rusqlite::params_from_iter(exp_params.iter().map(|p| p.as_ref())),
        |row| row.get(0),
    )?;

    let expense_count: i64 = conn.query_row(
        &format!("SELECT COUNT(*) FROM expenses {}", exp_where),
        rusqlite::params_from_iter(exp_params.iter().map(|p| p.as_ref())),
        |row| row.get(0),
    )?;

    let mut stmt = conn.prepare(&format!(
        "SELECT payment_method, SUM(amount) FROM payments {} GROUP BY payment_method ORDER BY SUM(amount) DESC",
        pay_where
    ))?;
    let revenue_by_method = stmt
        .query_map(rusqlite::params_from_iter(pay_params.iter().map(|p| p.as_ref())), |row| {
            Ok(CategoryAmount {
                category: row.get(0)?,
                amount: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut stmt = conn.prepare(&format!(
        "SELECT category, SUM(amount) FROM expenses {} GROUP BY category ORDER BY SUM(amount) DESC",
        exp_where
    ))?;
    let expenses_by_category = stmt
        .query_map(rusqlite::params_from_iter(exp_params.iter().map(|p| p.as_ref())), |row| {
            Ok(CategoryAmount {
                category: row.get(0)?,
                amount: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(FinancialReportResponse {
        total_revenue,
        total_expenses,
        net_income: total_revenue - total_expenses,
        payment_count,
        expense_count,
        revenue_by_method,
        expenses_by_category,
    })
}

pub fn payment_report(
    conn: &Connection,
    date_from: &Option<String>,
    date_to: &Option<String>,
    member_id: &Option<String>,
    payment_method: &Option<String>,
    membership_plan_id: &Option<String>,
) -> Result<PaymentReportResponse, AppError> {
    let mut where_clauses = Vec::new();
    let mut param_values: Vec<String> = Vec::new();

    if let Some(ref df) = date_from {
        where_clauses.push("p.payment_date >= ?");
        param_values.push(df.clone());
    }
    if let Some(ref dt) = date_to {
        where_clauses.push("p.payment_date <= ?");
        param_values.push(dt.clone());
    }
    if let Some(ref mid) = member_id {
        where_clauses.push("p.member_id = ?");
        param_values.push(mid.clone());
    }
    if let Some(ref pm) = payment_method {
        where_clauses.push("p.payment_method = ?");
        param_values.push(pm.clone());
    }
    if let Some(ref pid) = membership_plan_id {
        where_clauses.push("p.membership_plan_id = ?");
        param_values.push(pid.clone());
    }

    let where_sql = if where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };

    let sql = format!(
        "SELECT p.receipt_number, m.full_name, m.member_number, p.amount, p.payment_method, p.payment_date \
         FROM payments p \
         LEFT JOIN members m ON p.member_id = m.id \
         {} ORDER BY p.payment_date DESC, p.created_at DESC",
        where_sql
    );

    let mut stmt = conn.prepare(&sql)?;
    let rusqlite_params: Vec<Box<dyn rusqlite::types::ToSql>> = param_values
        .iter()
        .map(|v| Box::new(v.clone()) as Box<dyn rusqlite::types::ToSql>)
        .collect();
    let payments = stmt
        .query_map(rusqlite::params_from_iter(rusqlite_params.iter().map(|p| p.as_ref())), |row| {
            Ok(PaymentReportRow {
                receipt_number: row.get(0)?,
                member_name: row.get(1)?,
                member_number: row.get(2)?,
                amount: row.get(3)?,
                payment_method: row.get(4)?,
                payment_date: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let total_amount = payments.iter().map(|p| p.amount).sum();
    let total_count = payments.len() as i64;

    Ok(PaymentReportResponse {
        payments,
        total_count,
        total_amount,
    })
}

pub fn expense_report(
    conn: &Connection,
    date_from: &Option<String>,
    date_to: &Option<String>,
    expense_category: &Option<String>,
) -> Result<ExpenseReportResponse, AppError> {
    let mut where_clauses = Vec::new();
    let mut param_values: Vec<String> = Vec::new();

    if let Some(ref df) = date_from {
        where_clauses.push("expense_date >= ?");
        param_values.push(df.clone());
    }
    if let Some(ref dt) = date_to {
        where_clauses.push("expense_date <= ?");
        param_values.push(dt.clone());
    }
    if let Some(ref cat) = expense_category {
        where_clauses.push("category = ?");
        param_values.push(cat.clone());
    }

    let where_sql = if where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };

    let sql = format!(
        "SELECT expense_date, description, category, amount \
         FROM expenses {} ORDER BY expense_date DESC",
        where_sql
    );

    let mut stmt = conn.prepare(&sql)?;
    let rusqlite_params: Vec<Box<dyn rusqlite::types::ToSql>> = param_values
        .iter()
        .map(|v| Box::new(v.clone()) as Box<dyn rusqlite::types::ToSql>)
        .collect();
    let expenses = stmt
        .query_map(rusqlite::params_from_iter(rusqlite_params.iter().map(|p| p.as_ref())), |row| {
            Ok(ExpenseReportRow {
                date: row.get(0)?,
                description: row.get(1)?,
                category: row.get(2)?,
                amount: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let total_amount = expenses.iter().map(|e| e.amount).sum();
    let total_count = expenses.len() as i64;

    Ok(ExpenseReportResponse {
        expenses,
        total_count,
        total_amount,
    })
}

pub fn member_report(conn: &Connection) -> Result<MemberReportResponse, AppError> {
    let today = crate::utils::dates::today_iso();

    let total_members: i64 = conn.query_row(
        "SELECT COUNT(*) FROM members WHERE is_archived = 0",
        [],
        |row| row.get(0),
    )?;

    let archived_members: i64 = conn.query_row(
        "SELECT COUNT(*) FROM members WHERE is_archived = 1",
        [],
        |row| row.get(0),
    )?;

    let all_members = crate::repositories::member_repository::list(conn, "", false)?;

    let mut active_members: i64 = 0;
    let mut expiring_soon: i64 = 0;
    let mut expired_members: i64 = 0;

    for member in &all_members {
        let membership =
            crate::repositories::member_repository::get_latest_membership_info(conn, &member.id)?;
        if let Some(ref expiry_str) = membership.2 {
            if let Ok(expiry) = chrono::NaiveDate::parse_from_str(expiry_str, "%Y-%m-%d") {
                let today_date =
                    chrono::NaiveDate::parse_from_str(&today, "%Y-%m-%d").unwrap();
                if expiry < today_date {
                    expired_members += 1;
                } else if expiry <= today_date + chrono::Duration::days(7) {
                    expiring_soon += 1;
                } else {
                    active_members += 1;
                }
            }
        }
    }

    Ok(MemberReportResponse {
        total_members,
        active_members,
        expiring_soon,
        expired_members,
        archived_members,
    })
}

pub fn membership_status_report(conn: &Connection) -> Result<MembershipStatusReportResponse, AppError> {
    let today = crate::utils::dates::today_iso();
    let today_date = chrono::NaiveDate::parse_from_str(&today, "%Y-%m-%d").unwrap();

    let all_members = crate::repositories::member_repository::list(conn, "", false)?;

    let mut active = Vec::new();
    let mut expiring_soon = Vec::new();
    let mut expired = Vec::new();

    for member in &all_members {
        let membership =
            crate::repositories::member_repository::get_latest_membership_info(conn, &member.id)?;

        let plan_name: Option<String> = membership.0;
        let expiry_date: Option<String> = membership.2.clone();

        if let Some(ref expiry_str) = expiry_date {
            if let Ok(expiry) = chrono::NaiveDate::parse_from_str(expiry_str, "%Y-%m-%d") {
                let row = MemberStatusRow {
                    member_number: member.member_number.clone(),
                    full_name: member.full_name.clone(),
                    phone: member.phone.clone(),
                    plan_name: plan_name.clone(),
                    expiry_date: expiry_date.clone(),
                };

                if expiry < today_date {
                    expired.push(row);
                } else if expiry <= today_date + chrono::Duration::days(7) {
                    expiring_soon.push(row);
                } else {
                    active.push(row);
                }
            }
        }
    }

    Ok(MembershipStatusReportResponse {
        active,
        expiring_soon,
        expired,
    })
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

    fn setup_financial_data(conn: &Connection) {
        let now = crate::utils::dates::now_iso8601();
        conn.execute(
            "INSERT INTO members (id, member_number, full_name, is_archived, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 0, ?4, ?5)",
            rusqlite::params!["m1", "GYM-000001", "Ahmad", now, now],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO membership_plans (id, name, duration_days, price, is_active, created_at, updated_at) \
             VALUES (?1, ?2, 30, 2000, 1, ?3, ?4)",
            rusqlite::params!["p1", "Monthly", now, now],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO payments (id, receipt_number, member_id, amount, payment_method, \
             payment_date, membership_plan_id, membership_start_date, membership_expiry_date, \
             notes, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 2000, 'Cash', ?4, ?5, ?4, '2025-02-15', NULL, ?6, ?7)",
            rusqlite::params!["pay1", "RCP-000001", "m1", "2025-01-15", "p1", now, now],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO payments (id, receipt_number, member_id, amount, payment_method, \
             payment_date, membership_plan_id, membership_start_date, membership_expiry_date, \
             notes, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 3500, 'Card', ?4, ?5, ?4, '2025-03-15', NULL, ?6, ?7)",
            rusqlite::params!["pay2", "RCP-000002", "m1", "2025-01-20", "p1", now, now],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO expenses (id, category, description, amount, expense_date, notes, created_at, updated_at) \
             VALUES (?1, 'Rent', 'January rent', 15000, '2025-01-05', NULL, ?2, ?3)",
            rusqlite::params!["e1", now, now],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO expenses (id, category, description, amount, expense_date, notes, created_at, updated_at) \
             VALUES (?1, 'Electricity', 'Electricity bill', 5000, '2025-01-10', NULL, ?2, ?3)",
            rusqlite::params!["e2", now, now],
        )
        .unwrap();
    }

    #[test]
    fn should_generate_financial_report() {
        let conn = test_db();
        setup_financial_data(&conn);

        let req = ReportRequest {
            report_type: "financial".into(),
            date_from: Some("2025-01-01".into()),
            date_to: Some("2025-12-31".into()),
            member_id: None,
            payment_method: None,
            membership_plan_id: None,
            expense_category: None,
        };

        let report = financial_report(&conn, &req.date_from, &req.date_to).unwrap();
        assert_eq!(report.total_revenue, 5500);
        assert_eq!(report.total_expenses, 20000);
        assert_eq!(report.net_income, -14500);
        assert_eq!(report.payment_count, 2);
        assert_eq!(report.expense_count, 2);
        assert_eq!(report.revenue_by_method.len(), 2);
        assert_eq!(report.expenses_by_category.len(), 2);
    }

    #[test]
    fn should_generate_empty_financial_report() {
        let conn = test_db();
        let report = financial_report(&conn, &None, &None).unwrap();
        assert_eq!(report.total_revenue, 0);
        assert_eq!(report.total_expenses, 0);
        assert_eq!(report.net_income, 0);
    }

    #[test]
    fn should_generate_payment_report() {
        let conn = test_db();
        setup_financial_data(&conn);

        let report = payment_report(&conn, &None, &None, &None, &None, &None).unwrap();
        assert_eq!(report.total_count, 2);
        assert_eq!(report.total_amount, 5500);
        assert_eq!(report.payments.len(), 2);
    }

    #[test]
    fn should_filter_payments_by_method() {
        let conn = test_db();
        setup_financial_data(&conn);

        let report =
            payment_report(&conn, &None, &None, &None, &Some("Card".into()), &None).unwrap();
        assert_eq!(report.total_count, 1);
        assert_eq!(report.total_amount, 3500);
    }

    #[test]
    fn should_generate_expense_report() {
        let conn = test_db();
        setup_financial_data(&conn);

        let report = expense_report(&conn, &None, &None, &None).unwrap();
        assert_eq!(report.total_count, 2);
        assert_eq!(report.total_amount, 20000);
    }

    #[test]
    fn should_filter_expenses_by_category() {
        let conn = test_db();
        setup_financial_data(&conn);

        let report =
            expense_report(&conn, &None, &None, &Some("Rent".into())).unwrap();
        assert_eq!(report.total_count, 1);
        assert_eq!(report.total_amount, 15000);
    }

    #[test]
    fn should_generate_member_report() {
        let conn = test_db();
        let now = crate::utils::dates::now_iso8601();
        conn.execute(
            "INSERT INTO members (id, member_number, full_name, is_archived, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 0, ?4, ?5)",
            rusqlite::params!["m1", "GYM-000001", "Active Member", now, now],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO members (id, member_number, full_name, is_archived, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 1, ?4, ?5)",
            rusqlite::params!["m2", "GYM-000002", "Archived Member", now, now],
        )
        .unwrap();

        let report = member_report(&conn).unwrap();
        assert_eq!(report.total_members, 1);
        assert_eq!(report.archived_members, 1);
    }

    #[test]
    fn should_generate_membership_status_report() {
        let conn = test_db();
        let now = crate::utils::dates::now_iso8601();
        conn.execute(
            "INSERT INTO members (id, member_number, full_name, is_archived, created_at, updated_at) \
             VALUES (?1, ?2, ?3, 0, ?4, ?5)",
            rusqlite::params!["m1", "GYM-000001", "Test Member", now, now],
        )
        .unwrap();

        let report = membership_status_report(&conn).unwrap();
        assert_eq!(report.active.len(), 0);
        assert_eq!(report.expired.len(), 0);
    }

    #[test]
    fn should_filter_by_date_range() {
        let conn = test_db();
        setup_financial_data(&conn);

        let report = payment_report(
            &conn,
            &Some("2025-01-15".into()),
            &Some("2025-01-15".into()),
            &None,
            &None,
            &None,
        )
        .unwrap();
        assert_eq!(report.total_count, 1);
        assert_eq!(report.total_amount, 2000);
    }
}
