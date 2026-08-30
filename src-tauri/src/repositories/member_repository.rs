use rusqlite::{params, Connection};

use crate::errors::AppError;
use crate::models::Member;

pub fn create(conn: &Connection, member: &Member) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO members \
         (id, member_number, full_name, father_name, phone, cnic, address, \
          date_of_birth, gender, photo_path, notes, admission_fee, membership_plan_id, is_archived, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        params![
            member.id,
            member.member_number,
            member.full_name,
            member.father_name,
            member.phone,
            member.cnic,
            member.address,
            member.date_of_birth,
            member.gender,
            member.photo_path,
            member.notes,
            member.admission_fee,
            member.membership_plan_id,
            member.is_archived as i32,
            member.created_at,
            member.updated_at,
        ],
    )?;
    Ok(())
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Option<Member>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, member_number, full_name, father_name, phone, cnic, address, \
         date_of_birth, gender, photo_path, notes, admission_fee, membership_plan_id, is_archived, created_at, updated_at \
         FROM members WHERE id = ?1",
    )?;

    let mut rows = stmt.query_map(params![id], row_to_member)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn list(
    conn: &Connection,
    search: &str,
    include_archived: bool,
) -> Result<Vec<Member>, AppError> {
    let mut sql = String::from(
        "SELECT id, member_number, full_name, father_name, phone, cnic, address, \
         date_of_birth, gender, photo_path, notes, admission_fee, membership_plan_id, is_archived, created_at, updated_at \
         FROM members",
    );

    let mut conditions = Vec::new();
    let mut param_values: Vec<String> = Vec::new();

    if !search.is_empty() {
        conditions.push("(full_name LIKE ?1 OR member_number LIKE ?1 OR phone LIKE ?1)".to_string());
        param_values.push(format!("%{}%", search));
    }

    if !include_archived {
        conditions.push("is_archived = 0".to_string());
    }

    if !conditions.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&conditions.join(" AND "));
    }

    sql.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&sql)?;

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|v| v as &dyn rusqlite::types::ToSql)
        .collect();

    let members = stmt
        .query_map(param_refs.as_slice(), row_to_member)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(members)
}

pub fn get_latest_membership_info(
    conn: &Connection,
    member_id: &str,
) -> Result<(Option<String>, Option<String>, Option<String>, i64), AppError> {
    let result = conn.query_row(
        "SELECT mp.name, p.membership_start_date, p.membership_expiry_date, mp.price \
         FROM payments p \
         JOIN membership_plans mp ON mp.id = p.membership_plan_id \
         WHERE p.member_id = ?1 \
         ORDER BY p.payment_date DESC LIMIT 1",
        params![member_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get::<_, i64>(3)?)),
    );

    match result {
        Ok((plan_name, start_date, expiry_date, plan_price)) => {
            let total_paid: i64 = conn.query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM payments \
                 WHERE member_id = ?1 AND membership_start_date = ?2 AND membership_expiry_date = ?3",
                params![member_id, start_date, expiry_date],
                |row| row.get(0),
            )?;
            let outstanding = plan_price - total_paid;
            Ok((plan_name, start_date, expiry_date, outstanding))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok((None, None, None, 0)),
        Err(e) => Err(AppError::DatabaseError(e)),
    }
}

pub fn has_any_payments(conn: &Connection, member_id: &str) -> Result<bool, AppError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM payments WHERE member_id = ?1 AND is_voided = 0",
        params![member_id],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}

pub fn next_member_number(conn: &Connection) -> Result<String, AppError> {
    let max_num: Option<i64> = conn.query_row(
        "SELECT MAX(CAST(SUBSTR(member_number, 5) AS INTEGER)) FROM members",
        [],
        |row| row.get(0),
    )?;

    let next = max_num.unwrap_or(0) + 1;
    Ok(format!("GYM-{:06}", next))
}

pub fn update(conn: &Connection, member: &Member) -> Result<(), AppError> {
    let rows = conn.execute(
        "UPDATE members \
         SET full_name = ?2, father_name = ?3, phone = ?4, cnic = ?5, address = ?6, \
             date_of_birth = ?7, gender = ?8, notes = ?9, admission_fee = ?10, membership_plan_id = ?11, is_archived = ?12, updated_at = ?13 \
         WHERE id = ?1",
        params![
            member.id,
            member.full_name,
            member.father_name,
            member.phone,
            member.cnic,
            member.address,
            member.date_of_birth,
            member.gender,
            member.notes,
            member.admission_fee,
            member.membership_plan_id,
            member.is_archived as i32,
            member.updated_at,
        ],
    )?;

    if rows == 0 {
        return Err(AppError::NotFoundError(format!(
            "Member with id '{}' not found",
            member.id
        )));
    }

    Ok(())
}

pub fn archive(conn: &Connection, id: &str, archived_at: &str) -> Result<(), AppError> {
    let rows = conn.execute(
        "UPDATE members SET is_archived = 1, updated_at = ?2 WHERE id = ?1",
        params![id, archived_at],
    )?;

    if rows == 0 {
        return Err(AppError::NotFoundError(format!(
            "Member with id '{}' not found",
            id
        )));
    }

    Ok(())
}

pub fn unarchive(conn: &Connection, id: &str, updated_at: &str) -> Result<(), AppError> {
    let rows = conn.execute(
        "UPDATE members SET is_archived = 0, updated_at = ?2 WHERE id = ?1",
        params![id, updated_at],
    )?;

    if rows == 0 {
        return Err(AppError::NotFoundError(format!(
            "Member with id '{}' not found",
            id
        )));
    }

    Ok(())
}

fn row_to_member(row: &rusqlite::Row<'_>) -> Result<Member, rusqlite::Error> {
    Ok(Member {
        id: row.get("id")?,
        member_number: row.get("member_number")?,
        full_name: row.get("full_name")?,
        father_name: row.get("father_name")?,
        phone: row.get("phone")?,
        cnic: row.get("cnic")?,
        address: row.get("address")?,
        date_of_birth: row.get("date_of_birth")?,
        gender: row.get("gender")?,
        photo_path: row.get("photo_path")?,
        notes: row.get("notes")?,
        admission_fee: row.get("admission_fee")?,
        membership_plan_id: row.get("membership_plan_id")?,
        is_archived: row.get("is_archived")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
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

    fn make_member(name: &str) -> Member {
        Member {
            id: uuid::Uuid::new_v4().to_string(),
            member_number: "GYM-000001".to_string(),
            full_name: name.to_string(),
            father_name: None,
            phone: None,
            cnic: None,
            address: None,
            date_of_birth: None,
            gender: None,
            photo_path: None,
            notes: None,
            admission_fee: None,
            membership_plan_id: None,
            is_archived: false,
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn should_create_and_get_member() {
        let conn = test_db();
        let mut member = make_member("Ahmad Khan");
        member.member_number = next_member_number(&conn).unwrap();
        create(&conn, &member).unwrap();

        let fetched = get_by_id(&conn, &member.id).unwrap().unwrap();
        assert_eq!(fetched.full_name, "Ahmad Khan");
        assert_eq!(fetched.member_number, "GYM-000001");
    }

    #[test]
    fn should_generate_sequential_member_numbers() {
        let conn = test_db();
        let n1 = next_member_number(&conn).unwrap();
        let mut m1 = make_member("A");
        m1.member_number = n1.clone();
        create(&conn, &m1).unwrap();

        let n2 = next_member_number(&conn).unwrap();
        assert_eq!(n1, "GYM-000001");
        assert_eq!(n2, "GYM-000002");
    }

    #[test]
    fn should_list_non_archived_members() {
        let conn = test_db();
        let mut m1 = make_member("Active");
        m1.member_number = next_member_number(&conn).unwrap();
        create(&conn, &m1).unwrap();

        let mut m2 = make_member("Archived");
        m2.member_number = next_member_number(&conn).unwrap();
        m2.is_archived = true;
        create(&conn, &m2).unwrap();

        let all = list(&conn, "", false).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].full_name, "Active");
    }

    #[test]
    fn should_search_by_name() {
        let conn = test_db();
        let mut m1 = make_member("Ahmad Khan");
        m1.member_number = next_member_number(&conn).unwrap();
        create(&conn, &m1).unwrap();

        let mut m2 = make_member("Hamza Ali");
        m2.member_number = next_member_number(&conn).unwrap();
        create(&conn, &m2).unwrap();

        let results = list(&conn, "ahmad", false).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].full_name, "Ahmad Khan");
    }

    #[test]
    fn should_search_by_member_number() {
        let conn = test_db();
        let mut m = make_member("Test");
        m.member_number = next_member_number(&conn).unwrap();
        create(&conn, &m).unwrap();

        let results = list(&conn, "000001", false).unwrap();
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn should_update_member() {
        let conn = test_db();
        let mut member = make_member("Old Name");
        member.member_number = next_member_number(&conn).unwrap();
        create(&conn, &member).unwrap();

        member.full_name = "New Name".to_string();
        member.updated_at = "2026-06-01T00:00:00Z".to_string();
        update(&conn, &member).unwrap();

        let fetched = get_by_id(&conn, &member.id).unwrap().unwrap();
        assert_eq!(fetched.full_name, "New Name");
    }

    #[test]
    fn should_archive_member() {
        let conn = test_db();
        let mut member = make_member("To Archive");
        member.member_number = next_member_number(&conn).unwrap();
        create(&conn, &member).unwrap();

        archive(&conn, &member.id, "2026-06-01T00:00:00Z").unwrap();

        let fetched = get_by_id(&conn, &member.id).unwrap().unwrap();
        assert!(fetched.is_archived);

        let active = list(&conn, "", false).unwrap();
        assert_eq!(active.len(), 0);
    }

    #[test]
    fn should_return_error_for_nonexistent_member() {
        let conn = test_db();
        let result = get_by_id(&conn, "nonexistent");
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[test]
    fn should_include_archived_when_requested() {
        let conn = test_db();
        let mut m = make_member("Archived");
        m.member_number = next_member_number(&conn).unwrap();
        m.is_archived = true;
        create(&conn, &m).unwrap();

        let results = list(&conn, "", true).unwrap();
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn should_get_empty_membership_info_for_new_member() {
        let conn = test_db();
        let member = make_member("No Payments");
        let info = get_latest_membership_info(&conn, &member.id).unwrap();
        assert_eq!(info.0, None);
        assert_eq!(info.3, 0);
    }
}
