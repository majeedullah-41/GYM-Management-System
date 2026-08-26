use rusqlite::Connection;

use crate::dto::membership_plan::{CreatePlanRequest, PlanResponse, UpdatePlanRequest};
use crate::errors::AppError;
use crate::models::MembershipPlan;
use crate::repositories::membership_plan_repository;
use crate::utils::dates::now_iso8601;

pub fn create_plan(conn: &Connection, request: CreatePlanRequest) -> Result<PlanResponse, AppError> {
    let name = request.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::ValidationError(
            "Plan name is required".into(),
        ));
    }
    if request.duration_days <= 0 {
        return Err(AppError::ValidationError(
            "Duration must be greater than 0 days".into(),
        ));
    }
    if request.price < 0 {
        return Err(AppError::ValidationError(
            "Price cannot be negative".into(),
        ));
    }

    if membership_plan_repository::exists_by_name(conn, &name, None)? {
        return Err(AppError::ConflictError(format!(
            "A plan named '{}' already exists",
            name
        )));
    }

    let now = now_iso8601();
    let plan = MembershipPlan {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        duration_days: request.duration_days,
        price: request.price,
        description: request
            .description
            .map(|d| d.trim().to_string())
            .filter(|d| !d.is_empty()),
        is_active: true,
        created_at: now.clone(),
        updated_at: now,
    };

    membership_plan_repository::create(conn, &plan)?;
    log::info!("Created membership plan: {} ({})", plan.name, plan.id);

    Ok(PlanResponse::from(plan))
}

pub fn get_plan(conn: &Connection, id: &str) -> Result<PlanResponse, AppError> {
    membership_plan_repository::get_by_id(conn, id)?
        .map(PlanResponse::from)
        .ok_or_else(|| AppError::NotFoundError(format!("Plan with id '{}' not found", id)))
}

pub fn list_plans(conn: &Connection) -> Result<Vec<PlanResponse>, AppError> {
    let plans = membership_plan_repository::list(conn)?;
    Ok(plans.into_iter().map(PlanResponse::from).collect())
}

pub fn list_active_plans(conn: &Connection) -> Result<Vec<PlanResponse>, AppError> {
    let plans = membership_plan_repository::list_active(conn)?;
    Ok(plans.into_iter().map(PlanResponse::from).collect())
}

pub fn update_plan(
    conn: &Connection,
    id: &str,
    request: UpdatePlanRequest,
) -> Result<PlanResponse, AppError> {
    let mut plan = membership_plan_repository::get_by_id(conn, id)?.ok_or_else(|| {
        AppError::NotFoundError(format!("Plan with id '{}' not found", id))
    })?;

    let name = request.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::ValidationError(
            "Plan name is required".into(),
        ));
    }
    if request.duration_days <= 0 {
        return Err(AppError::ValidationError(
            "Duration must be greater than 0 days".into(),
        ));
    }
    if request.price < 0 {
        return Err(AppError::ValidationError(
            "Price cannot be negative".into(),
        ));
    }

    if membership_plan_repository::exists_by_name(conn, &name, Some(id))? {
        return Err(AppError::ConflictError(format!(
            "A plan named '{}' already exists",
            name
        )));
    }

    plan.name = name;
    plan.duration_days = request.duration_days;
    plan.price = request.price;
    plan.description = request
        .description
        .map(|d| d.trim().to_string())
        .filter(|d| !d.is_empty());
    plan.updated_at = now_iso8601();

    membership_plan_repository::update(conn, &plan)?;
    log::info!("Updated membership plan: {} ({})", plan.name, plan.id);

    Ok(PlanResponse::from(plan))
}

pub fn deactivate_plan(conn: &Connection, id: &str) -> Result<PlanResponse, AppError> {
    let mut plan = membership_plan_repository::get_by_id(conn, id)?.ok_or_else(|| {
        AppError::NotFoundError(format!("Plan with id '{}' not found", id))
    })?;

    plan.is_active = false;
    plan.updated_at = now_iso8601();

    membership_plan_repository::update(conn, &plan)?;
    log::info!("Deactivated membership plan: {} ({})", plan.name, plan.id);

    Ok(PlanResponse::from(plan))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrations;
    use rusqlite::Connection;

    fn test_db() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&mut conn).unwrap();
        conn
    }

    fn valid_request(name: &str) -> CreatePlanRequest {
        CreatePlanRequest {
            name: name.to_string(),
            duration_days: 30,
            price: 2000,
            description: None,
        }
    }

    #[test]
    fn should_create_plan_with_valid_data() {
        let conn = test_db();
        let result = create_plan(&conn, valid_request("Monthly")).unwrap();
        assert_eq!(result.name, "Monthly");
        assert!(result.is_active);
        assert!(!result.id.is_empty());
    }

    #[test]
    fn should_reject_empty_name() {
        let conn = test_db();
        let result = create_plan(&conn, valid_request(""));
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_whitespace_only_name() {
        let conn = test_db();
        let result = create_plan(&conn, valid_request("   "));
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_zero_duration() {
        let conn = test_db();
        let result = create_plan(
            &conn,
            CreatePlanRequest {
                name: "Bad".to_string(),
                duration_days: 0,
                price: 2000,
                description: None,
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_negative_duration() {
        let conn = test_db();
        let result = create_plan(
            &conn,
            CreatePlanRequest {
                name: "Bad".to_string(),
                duration_days: -5,
                price: 2000,
                description: None,
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn should_reject_negative_price() {
        let conn = test_db();
        let result = create_plan(
            &conn,
            CreatePlanRequest {
                name: "Bad".to_string(),
                duration_days: 30,
                price: -100,
                description: None,
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn should_allow_zero_price() {
        let conn = test_db();
        let result = create_plan(
            &conn,
            CreatePlanRequest {
                name: "Free".to_string(),
                duration_days: 7,
                price: 0,
                description: None,
            },
        );
        assert!(result.is_ok());
    }

    #[test]
    fn should_reject_duplicate_name() {
        let conn = test_db();
        create_plan(&conn, valid_request("Monthly")).unwrap();
        let result = create_plan(&conn, valid_request("Monthly"));
        assert!(result.is_err());
    }

    #[test]
    fn should_trim_name() {
        let conn = test_db();
        let result = create_plan(&conn, valid_request("  Monthly  ")).unwrap();
        assert_eq!(result.name, "Monthly");
    }

    #[test]
    fn should_get_plan() {
        let conn = test_db();
        let created = create_plan(&conn, valid_request("Monthly")).unwrap();
        let fetched = get_plan(&conn, &created.id).unwrap();
        assert_eq!(fetched.id, created.id);
    }

    #[test]
    fn should_return_error_for_nonexistent_plan() {
        let conn = test_db();
        let result = get_plan(&conn, "nonexistent");
        assert!(result.is_err());
    }

    #[test]
    fn should_list_plans() {
        let conn = test_db();
        create_plan(&conn, valid_request("Monthly")).unwrap();
        create_plan(&conn, valid_request("Quarterly")).unwrap();
        let plans = list_plans(&conn).unwrap();
        assert_eq!(plans.len(), 2);
    }

    #[test]
    fn should_update_plan() {
        let conn = test_db();
        let created = create_plan(&conn, valid_request("Monthly")).unwrap();
        let updated = update_plan(
            &conn,
            &created.id,
            UpdatePlanRequest {
                name: "Annual".to_string(),
                duration_days: 365,
                price: 20000,
                description: None,
            },
        )
        .unwrap();
        assert_eq!(updated.name, "Annual");
        assert_eq!(updated.duration_days, 365);
        assert_eq!(updated.price, 20000);
    }

    #[test]
    fn should_deactivate_plan() {
        let conn = test_db();
        let created = create_plan(&conn, valid_request("Monthly")).unwrap();
        let deactivated = deactivate_plan(&conn, &created.id).unwrap();
        assert!(!deactivated.is_active);
    }
}
