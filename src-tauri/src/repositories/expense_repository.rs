use rusqlite::{params, Connection};

use crate::errors::AppError;
use crate::models::Expense;

pub fn create(conn: &Connection, expense: &Expense) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO expenses (id, category, description, amount, expense_date, \
         payment_method, vendor, notes, is_deleted, deleted_at, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, NULL, ?9, ?10)",
        params![
            expense.id,
            expense.category,
            expense.description,
            expense.amount,
            expense.expense_date,
            expense.payment_method,
            expense.vendor,
            expense.notes,
            expense.created_at,
            expense.updated_at,
        ],
    )?;
    Ok(())
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Option<Expense>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, category, description, amount, expense_date, payment_method, vendor, \
         notes, is_deleted, deleted_at, created_at, updated_at \
         FROM expenses WHERE id = ?1",
    )?;
    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(row_to_expense(row)?))
    } else {
        Ok(None)
    }
}

pub fn update(conn: &Connection, expense: &Expense) -> Result<(), AppError> {
    let rows = conn.execute(
        "UPDATE expenses SET category = ?1, description = ?2, amount = ?3, \
         expense_date = ?4, payment_method = ?5, vendor = ?6, notes = ?7, updated_at = ?8 \
         WHERE id = ?9",
        params![
            expense.category,
            expense.description,
            expense.amount,
            expense.expense_date,
            expense.payment_method,
            expense.vendor,
            expense.notes,
            expense.updated_at,
            expense.id,
        ],
    )?;
    if rows == 0 {
        return Err(AppError::NotFoundError(format!(
            "Expense '{}' not found",
            expense.id
        )));
    }
    Ok(())
}

pub fn soft_delete(conn: &Connection, id: &str, deleted_at: &str) -> Result<bool, AppError> {
    let rows = conn.execute(
        "UPDATE expenses SET is_deleted = 1, deleted_at = ?2, updated_at = ?2 WHERE id = ?1 AND is_deleted = 0",
        params![id, deleted_at],
    )?;
    Ok(rows > 0)
}

pub fn restore(conn: &Connection, id: &str, updated_at: &str) -> Result<bool, AppError> {
    let rows = conn.execute(
        "UPDATE expenses SET is_deleted = 0, deleted_at = NULL, updated_at = ?2 WHERE id = ?1 AND is_deleted = 1",
        params![id, updated_at],
    )?;
    Ok(rows > 0)
}

pub fn list(
    conn: &Connection,
    search: &str,
    category: Option<&str>,
    date_from: Option<&str>,
    date_to: Option<&str>,
) -> Result<Vec<Expense>, AppError> {
    let mut conditions = vec!["is_deleted = 0".to_string()];
    let mut param_values: Vec<String> = Vec::new();

    if !search.is_empty() {
        conditions.push("(description LIKE ?1 OR notes LIKE ?1 OR category LIKE ?1 OR vendor LIKE ?1)".to_string());
        param_values.push(format!("%{}%", search));
    }

    if let Some(cat) = category {
        conditions.push("category = ?".to_string());
        param_values.push(cat.to_string());
    }

    if let Some(from) = date_from {
        conditions.push("expense_date >= ?".to_string());
        param_values.push(from.to_string());
    }

    if let Some(to) = date_to {
        conditions.push("expense_date <= ?".to_string());
        param_values.push(to.to_string());
    }

    let where_clause = format!("WHERE {}", conditions.join(" AND "));

    let sql = format!(
        "SELECT id, category, description, amount, expense_date, payment_method, vendor, \
         notes, is_deleted, deleted_at, created_at, updated_at \
         FROM expenses {} ORDER BY expense_date DESC, created_at DESC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql)?;
    let mut expenses = Vec::new();

    let params: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|s| s as &dyn rusqlite::types::ToSql)
        .collect();
    let mut rows = stmt.query(params.as_slice())?;
    while let Some(row) = rows.next()? {
        expenses.push(row_to_expense(row)?);
    }

    Ok(expenses)
}

pub fn total_by_date_range(
    conn: &Connection,
    date_from: &str,
    date_to: &str,
) -> Result<i64, AppError> {
    let total: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM expenses \
         WHERE expense_date >= ?1 AND expense_date <= ?2 AND is_deleted = 0",
        params![date_from, date_to],
        |row| row.get(0),
    )?;
    Ok(total)
}

fn row_to_expense(row: &rusqlite::Row) -> Result<Expense, rusqlite::Error> {
    Ok(Expense {
        id: row.get(0)?,
        category: row.get(1)?,
        description: row.get(2)?,
        amount: row.get(3)?,
        expense_date: row.get(4)?,
        payment_method: row.get(5)?,
        vendor: row.get(6)?,
        notes: row.get(7)?,
        is_deleted: row.get::<_, i32>(8)? != 0,
        deleted_at: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrations;
    use crate::utils::dates::now_iso8601;

    fn test_db() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&mut conn).unwrap();
        conn
    }

    fn make_expense(category: &str, amount: i64, date: &str) -> Expense {
        let now = now_iso8601();
        Expense {
            id: uuid::Uuid::new_v4().to_string(),
            category: category.to_string(),
            description: Some("Test expense".to_string()),
            amount,
            expense_date: date.to_string(),
            payment_method: Some("Cash".to_string()),
            vendor: None,
            notes: None,
            is_deleted: false,
            deleted_at: None,
            created_at: now.clone(),
            updated_at: now,
        }
    }

    #[test]
    fn should_create_expense() {
        let conn = test_db();
        let expense = make_expense("Rent", 15000, "2025-01-15");
        create(&conn, &expense).unwrap();

        let found = get_by_id(&conn, &expense.id).unwrap().unwrap();
        assert_eq!(found.category, "Rent");
        assert_eq!(found.amount, 15000);
        assert!(!found.is_deleted);
    }

    #[test]
    fn should_get_expense_by_id() {
        let conn = test_db();
        let expense = make_expense("Electricity", 5000, "2025-01-20");
        create(&conn, &expense).unwrap();

        let found = get_by_id(&conn, &expense.id).unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().amount, 5000);
    }

    #[test]
    fn should_return_none_for_nonexistent() {
        let conn = test_db();
        let result = get_by_id(&conn, "nonexistent").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn should_update_expense() {
        let conn = test_db();
        let mut expense = make_expense("Rent", 15000, "2025-01-15");
        create(&conn, &expense).unwrap();

        expense.amount = 18000;
        expense.updated_at = now_iso8601();
        update(&conn, &expense).unwrap();

        let found = get_by_id(&conn, &expense.id).unwrap().unwrap();
        assert_eq!(found.amount, 18000);
    }

    #[test]
    fn should_soft_delete_expense() {
        let conn = test_db();
        let expense = make_expense("Rent", 15000, "2025-01-15");
        create(&conn, &expense).unwrap();

        let deleted = soft_delete(&conn, &expense.id, "2025-06-01T00:00:00Z").unwrap();
        assert!(deleted);

        let found = get_by_id(&conn, &expense.id).unwrap().unwrap();
        assert!(found.is_deleted);

        let listed = list(&conn, "", None, None, None).unwrap();
        assert_eq!(listed.len(), 0);
    }

    #[test]
    fn should_restore_expense() {
        let conn = test_db();
        let expense = make_expense("Rent", 15000, "2025-01-15");
        create(&conn, &expense).unwrap();

        soft_delete(&conn, &expense.id, "2025-06-01T00:00:00Z").unwrap();
        let restored = restore(&conn, &expense.id, "2025-06-02T00:00:00Z").unwrap();
        assert!(restored);

        let found = get_by_id(&conn, &expense.id).unwrap().unwrap();
        assert!(!found.is_deleted);
        assert!(found.deleted_at.is_none());
    }

    #[test]
    fn should_return_false_when_deleting_nonexistent() {
        let conn = test_db();
        let deleted = soft_delete(&conn, "nonexistent", "2025-06-01T00:00:00Z").unwrap();
        assert!(!deleted);
    }

    #[test]
    fn should_list_all_expenses() {
        let conn = test_db();
        create(&conn, &make_expense("Rent", 15000, "2025-01-15")).unwrap();
        create(&conn, &make_expense("Electricity", 5000, "2025-01-20")).unwrap();

        let expenses = list(&conn, "", None, None, None).unwrap();
        assert_eq!(expenses.len(), 2);
    }

    #[test]
    fn should_search_by_description() {
        let conn = test_db();
        create(&conn, &make_expense("Rent", 15000, "2025-01-15")).unwrap();
        let mut e2 = make_expense("Equipment", 8000, "2025-02-01");
        e2.description = Some("Treadmill repair".to_string());
        create(&conn, &e2).unwrap();

        let results = list(&conn, "treadmill", None, None, None).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].category, "Equipment");
    }

    #[test]
    fn should_filter_by_category() {
        let conn = test_db();
        create(&conn, &make_expense("Rent", 15000, "2025-01-15")).unwrap();
        create(&conn, &make_expense("Electricity", 5000, "2025-01-20")).unwrap();
        create(&conn, &make_expense("Rent", 15000, "2025-02-15")).unwrap();

        let results = list(&conn, "", Some("Rent"), None, None).unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn should_filter_by_date_range() {
        let conn = test_db();
        create(&conn, &make_expense("Rent", 15000, "2025-01-15")).unwrap();
        create(&conn, &make_expense("Electricity", 5000, "2025-06-20")).unwrap();

        let results = list(&conn, "", None, Some("2025-06-01"), Some("2025-12-31")).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].category, "Electricity");
    }

    #[test]
    fn should_calculate_total_by_date_range() {
        let conn = test_db();
        create(&conn, &make_expense("Rent", 15000, "2025-01-15")).unwrap();
        create(&conn, &make_expense("Electricity", 5000, "2025-01-20")).unwrap();
        create(&conn, &make_expense("Rent", 15000, "2025-06-15")).unwrap();

        let total = total_by_date_range(&conn, "2025-01-01", "2025-01-31").unwrap();
        assert_eq!(total, 20000);
    }

    #[test]
    fn should_return_zero_for_empty_range() {
        let conn = test_db();
        let total = total_by_date_range(&conn, "2099-01-01", "2099-12-31").unwrap();
        assert_eq!(total, 0);
    }
}
