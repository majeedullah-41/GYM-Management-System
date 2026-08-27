use rusqlite::{params, Connection};

use crate::errors::AppError;
use crate::models::MembershipPlan;

pub fn create(conn: &Connection, plan: &MembershipPlan) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO membership_plans \
         (id, name, duration_days, price, description, is_active, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            plan.id,
            plan.name,
            plan.duration_days,
            plan.price,
            plan.description,
            plan.is_active as i32,
            plan.created_at,
            plan.updated_at,
        ],
    )?;
    Ok(())
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Option<MembershipPlan>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, duration_days, price, description, is_active, created_at, updated_at \
         FROM membership_plans WHERE id = ?1",
    )?;

    let mut rows = stmt.query_map(params![id], |row| {
        Ok(MembershipPlan {
            id: row.get("id")?,
            name: row.get("name")?,
            duration_days: row.get("duration_days")?,
            price: row.get("price")?,
            description: row.get("description")?,
            is_active: row.get("is_active")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    })?;

    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn list(conn: &Connection) -> Result<Vec<MembershipPlan>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, duration_days, price, description, is_active, created_at, updated_at \
         FROM membership_plans ORDER BY name",
    )?;

    let plans = stmt
        .query_map([], |row| {
            Ok(MembershipPlan {
                id: row.get("id")?,
                name: row.get("name")?,
                duration_days: row.get("duration_days")?,
                price: row.get("price")?,
                description: row.get("description")?,
                is_active: row.get("is_active")?,
                created_at: row.get("created_at")?,
                updated_at: row.get("updated_at")?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(plans)
}

pub fn list_active(conn: &Connection) -> Result<Vec<MembershipPlan>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, duration_days, price, description, is_active, created_at, updated_at \
         FROM membership_plans WHERE is_active = 1 ORDER BY name",
    )?;

    let plans = stmt
        .query_map([], |row| {
            Ok(MembershipPlan {
                id: row.get("id")?,
                name: row.get("name")?,
                duration_days: row.get("duration_days")?,
                price: row.get("price")?,
                description: row.get("description")?,
                is_active: row.get("is_active")?,
                created_at: row.get("created_at")?,
                updated_at: row.get("updated_at")?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(plans)
}

pub fn update(conn: &Connection, plan: &MembershipPlan) -> Result<(), AppError> {
    let rows = conn.execute(
        "UPDATE membership_plans \
         SET name = ?2, duration_days = ?3, price = ?4, description = ?5, \
             is_active = ?6, updated_at = ?7 \
         WHERE id = ?1",
        params![
            plan.id,
            plan.name,
            plan.duration_days,
            plan.price,
            plan.description,
            plan.is_active as i32,
            plan.updated_at,
        ],
    )?;

    if rows == 0 {
        return Err(AppError::NotFoundError(format!(
            "Plan with id '{}' not found",
            plan.id
        )));
    }

    Ok(())
}

pub fn exists_by_name(
    conn: &Connection,
    name: &str,
    exclude_id: Option<&str>,
) -> Result<bool, AppError> {
    let count: i32 = match exclude_id {
        Some(exclude_id) => conn.query_row(
            "SELECT COUNT(*) FROM membership_plans WHERE name = ?1 AND id != ?2",
            params![name, exclude_id],
            |row| row.get(0),
        )?,
        None => conn.query_row(
            "SELECT COUNT(*) FROM membership_plans WHERE name = ?1",
            params![name],
            |row| row.get(0),
        )?,
    };

    Ok(count > 0)
}

pub fn count_members_by_plan(conn: &Connection, plan_id: &str) -> Result<i32, AppError> {
    let count: i32 = conn.query_row(
        "SELECT COUNT(DISTINCT member_id) FROM payments \
         WHERE membership_plan_id = ?1 AND is_voided = 0",
        params![plan_id],
        |row| row.get(0),
    )?;
    Ok(count)
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

    fn make_plan(name: &str) -> MembershipPlan {
        MembershipPlan {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.to_string(),
            duration_days: 30,
            price: 2000,
            description: None,
            is_active: true,
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn should_create_plan() {
        let conn = test_db();
        let plan = make_plan("Monthly");
        create(&conn, &plan).unwrap();

        let fetched = get_by_id(&conn, &plan.id).unwrap().unwrap();
        assert_eq!(fetched.name, "Monthly");
        assert_eq!(fetched.price, 2000);
    }

    #[test]
    fn should_return_none_for_nonexistent_id() {
        let conn = test_db();
        let result = get_by_id(&conn, "nonexistent").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn should_list_all_plans() {
        let conn = test_db();
        create(&conn, &make_plan("Monthly")).unwrap();
        create(&conn, &make_plan("Quarterly")).unwrap();

        let plans = list(&conn).unwrap();
        assert_eq!(plans.len(), 2);
    }

    #[test]
    fn should_list_active_plans_only() {
        let conn = test_db();
        let active = make_plan("Active Plan");
        create(&conn, &active).unwrap();

        let mut inactive = make_plan("Inactive Plan");
        inactive.is_active = false;
        create(&conn, &inactive).unwrap();

        let active_plans = list_active(&conn).unwrap();
        assert_eq!(active_plans.len(), 1);
        assert_eq!(active_plans[0].name, "Active Plan");
    }

    #[test]
    fn should_update_plan() {
        let conn = test_db();
        let mut plan = make_plan("Old Name");
        create(&conn, &plan).unwrap();

        plan.name = "New Name".to_string();
        plan.price = 3000;
        update(&conn, &plan).unwrap();

        let fetched = get_by_id(&conn, &plan.id).unwrap().unwrap();
        assert_eq!(fetched.name, "New Name");
        assert_eq!(fetched.price, 3000);
    }

    #[test]
    fn should_return_error_when_updating_nonexistent_plan() {
        let conn = test_db();
        let plan = make_plan("Ghost");
        let result = update(&conn, &plan);
        assert!(result.is_err());
    }

    #[test]
    fn should_deactivate_plan() {
        let conn = test_db();
        let mut plan = make_plan("Monthly");
        create(&conn, &plan).unwrap();

        plan.is_active = false;
        plan.updated_at = "2026-02-01T00:00:00Z".to_string();
        update(&conn, &plan).unwrap();

        let active_plans = list_active(&conn).unwrap();
        assert_eq!(active_plans.len(), 0);
    }

    #[test]
    fn should_detect_existing_plan_name() {
        let conn = test_db();
        create(&conn, &make_plan("Monthly")).unwrap();

        assert!(exists_by_name(&conn, "Monthly", None).unwrap());
        assert!(!exists_by_name(&conn, "Quarterly", None).unwrap());
    }

    #[test]
    fn should_exclude_id_from_name_check() {
        let conn = test_db();
        let plan = make_plan("Monthly");
        create(&conn, &plan).unwrap();

        // Same name but excluding own ID should return false
        assert!(!exists_by_name(&conn, "Monthly", Some(&plan.id)).unwrap());
    }
}
