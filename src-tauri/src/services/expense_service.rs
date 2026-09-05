use chrono::NaiveDate;
use rusqlite::Connection;

use crate::dto::expense::{
    CreateExpenseRequest, ExpenseResponse, UpdateExpenseRequest, EXPENSE_CATEGORIES,
    EXPENSE_PAYMENT_METHODS,
};
use crate::errors::AppError;
use crate::models::Expense;
use crate::repositories::expense_repository;
use crate::utils::dates::now_iso8601;

pub fn create_expense(
    conn: &Connection,
    request: CreateExpenseRequest,
) -> Result<ExpenseResponse, AppError> {
    validate(&request.category, request.amount, &request.expense_date)?;

    if let Some(ref method) = request.payment_method {
        if !method.is_empty() && !EXPENSE_PAYMENT_METHODS.contains(&method.as_str()) {
            return Err(AppError::ValidationError(format!(
                "Invalid payment method '{}'. Must be one of: {}",
                method,
                EXPENSE_PAYMENT_METHODS.join(", ")
            )));
        }
    }

    let now = now_iso8601();
    let expense = Expense {
        id: uuid::Uuid::new_v4().to_string(),
        category: request.category,
        description: request
            .description
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty()),
        amount: request.amount,
        expense_date: request.expense_date,
        payment_method: request.payment_method.filter(|v| !v.trim().is_empty()),
        vendor: request
            .vendor
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty()),
        notes: request
            .notes
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty()),
        is_deleted: false,
        deleted_at: None,
        created_at: now.clone(),
        updated_at: now,
    };

    expense_repository::create(conn, &expense)?;
    log::info!(
        "Created expense: {} Rs. {} on {}",
        expense.category,
        expense.amount,
        expense.expense_date
    );
    Ok(ExpenseResponse::from_expense(expense))
}

pub fn get_expense(conn: &Connection, id: &str) -> Result<ExpenseResponse, AppError> {
    let expense = expense_repository::get_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Expense '{}' not found", id)))?;
    Ok(ExpenseResponse::from_expense(expense))
}

pub fn update_expense(
    conn: &Connection,
    id: &str,
    request: UpdateExpenseRequest,
) -> Result<ExpenseResponse, AppError> {
    let mut expense = expense_repository::get_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Expense '{}' not found", id)))?;

    validate(&request.category, request.amount, &request.expense_date)?;

    if let Some(ref method) = request.payment_method {
        if !method.is_empty() && !EXPENSE_PAYMENT_METHODS.contains(&method.as_str()) {
            return Err(AppError::ValidationError(format!(
                "Invalid payment method '{}'. Must be one of: {}",
                method,
                EXPENSE_PAYMENT_METHODS.join(", ")
            )));
        }
    }

    expense.category = request.category;
    expense.description = request
        .description
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    expense.amount = request.amount;
    expense.expense_date = request.expense_date;
    expense.payment_method = request.payment_method.filter(|v| !v.trim().is_empty());
    expense.vendor = request
        .vendor
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    expense.notes = request
        .notes
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    expense.updated_at = now_iso8601();

    expense_repository::update(conn, &expense)?;
    log::info!("Updated expense: {}", expense.id);
    Ok(ExpenseResponse::from_expense(expense))
}

pub fn delete_expense(conn: &Connection, id: &str) -> Result<(), AppError> {
    let now = now_iso8601();
    let deleted = expense_repository::soft_delete(conn, id, &now)?;
    if !deleted {
        return Err(AppError::NotFoundError(format!(
            "Expense '{}' not found",
            id
        )));
    }
    log::info!("Deleted expense: {}", id);
    Ok(())
}

pub fn restore_expense(conn: &Connection, id: &str) -> Result<ExpenseResponse, AppError> {
    let expense = expense_repository::get_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Expense '{}' not found", id)))?;

    if !expense.is_deleted {
        return Err(AppError::ValidationError("Expense is not deleted".into()));
    }

    let now = now_iso8601();
    expense_repository::restore(conn, id, &now)?;

    log::info!("Restored expense: {}", id);
    let restored = expense_repository::get_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Expense '{}' not found", id)))?;
    Ok(ExpenseResponse::from_expense(restored))
}

pub fn list_expenses(
    conn: &Connection,
    search: &str,
    category: Option<&str>,
    date_from: Option<&str>,
    date_to: Option<&str>,
) -> Result<Vec<ExpenseResponse>, AppError> {
    let expenses = expense_repository::list(conn, search, category, date_from, date_to)?;
    Ok(expenses
        .into_iter()
        .map(ExpenseResponse::from_expense)
        .collect())
}

pub fn total_expenses(conn: &Connection, date_from: &str, date_to: &str) -> Result<i64, AppError> {
    expense_repository::total_by_date_range(conn, date_from, date_to)
}

fn validate(category: &str, amount: i64, date: &str) -> Result<(), AppError> {
    if amount <= 0 {
        return Err(AppError::ValidationError(
            "Expense amount must be greater than zero".into(),
        ));
    }

    if !EXPENSE_CATEGORIES.contains(&category) {
        return Err(AppError::ValidationError(format!(
            "Invalid category '{}'. Must be one of: {}",
            category,
            EXPENSE_CATEGORIES.join(", ")
        )));
    }

    if NaiveDate::parse_from_str(date, "%Y-%m-%d").is_err() {
        return Err(AppError::ValidationError(
            "Invalid date format. Use YYYY-MM-DD".into(),
        ));
    }

    Ok(())
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

    fn valid_request(category: &str, amount: i64) -> CreateExpenseRequest {
        CreateExpenseRequest {
            category: category.to_string(),
            amount,
            expense_date: "2025-01-15".to_string(),
            description: None,
            payment_method: None,
            vendor: None,
            notes: None,
        }
    }

    #[test]
    fn should_create_expense_with_valid_data() {
        let conn = test_db();
        let result = create_expense(&conn, valid_request("Rent", 15000)).unwrap();
        assert_eq!(result.category, "Rent");
        assert_eq!(result.amount, 15000);
    }

    #[test]
    fn should_reject_zero_amount() {
        let conn = test_db();
        let result = create_expense(&conn, valid_request("Rent", 0));
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_negative_amount() {
        let conn = test_db();
        let result = create_expense(&conn, valid_request("Rent", -500));
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_invalid_category() {
        let conn = test_db();
        let result = create_expense(&conn, valid_request("InvalidCategory", 1000));
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_invalid_date() {
        let conn = test_db();
        let mut req = valid_request("Rent", 15000);
        req.expense_date = "15-01-2025".to_string();
        let result = create_expense(&conn, req);
        assert!(result.is_err());
    }

    #[test]
    fn should_accept_all_valid_categories() {
        let conn = test_db();
        for cat in EXPENSE_CATEGORIES {
            let result = create_expense(&conn, valid_request(cat, 1000));
            assert!(result.is_ok(), "Category '{}' should be valid", cat);
        }
    }

    #[test]
    fn should_update_expense() {
        let conn = test_db();
        let created = create_expense(&conn, valid_request("Rent", 15000)).unwrap();
        let updated = update_expense(
            &conn,
            &created.id,
            UpdateExpenseRequest {
                category: "Electricity".to_string(),
                amount: 5000,
                expense_date: "2025-02-01".to_string(),
                description: Some("Updated".to_string()),
                payment_method: None,
                vendor: None,
                notes: None,
            },
        )
        .unwrap();
        assert_eq!(updated.category, "Electricity");
        assert_eq!(updated.amount, 5000);
    }

    #[test]
    fn should_delete_expense() {
        let conn = test_db();
        let created = create_expense(&conn, valid_request("Rent", 15000)).unwrap();
        delete_expense(&conn, &created.id).unwrap();
        let expenses = list_expenses(&conn, "", None, None, None).unwrap();
        assert_eq!(expenses.len(), 0);
    }

    #[test]
    fn should_restore_expense() {
        let conn = test_db();
        let created = create_expense(&conn, valid_request("Rent", 15000)).unwrap();
        delete_expense(&conn, &created.id).unwrap();
        let restored = restore_expense(&conn, &created.id).unwrap();
        assert!(!restored.is_deleted);
    }

    #[test]
    fn should_list_expenses() {
        let conn = test_db();
        create_expense(&conn, valid_request("Rent", 15000)).unwrap();
        create_expense(&conn, valid_request("Electricity", 5000)).unwrap();
        let expenses = list_expenses(&conn, "", None, None, None).unwrap();
        assert_eq!(expenses.len(), 2);
    }

    #[test]
    fn should_search_expenses() {
        let conn = test_db();
        let mut req = valid_request("Equipment", 8000);
        req.description = Some("New dumbbells".to_string());
        create_expense(&conn, req).unwrap();
        create_expense(&conn, valid_request("Rent", 15000)).unwrap();

        let results = list_expenses(&conn, "dumbbells", None, None, None).unwrap();
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn should_filter_by_category() {
        let conn = test_db();
        create_expense(&conn, valid_request("Rent", 15000)).unwrap();
        create_expense(&conn, valid_request("Rent", 16000)).unwrap();
        create_expense(&conn, valid_request("Electricity", 5000)).unwrap();

        let results = list_expenses(&conn, "", Some("Rent"), None, None).unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn should_accept_valid_payment_methods() {
        let conn = test_db();
        for method in EXPENSE_PAYMENT_METHODS {
            let mut req = valid_request("Rent", 1000);
            req.payment_method = Some(method.to_string());
            let result = create_expense(&conn, req);
            assert!(result.is_ok(), "Method '{}' should be valid", method);
        }
    }

    #[test]
    fn should_reject_invalid_payment_method() {
        let conn = test_db();
        let mut req = valid_request("Rent", 1000);
        req.payment_method = Some("Crypto".to_string());
        let result = create_expense(&conn, req);
        assert!(result.is_err());
    }
}
