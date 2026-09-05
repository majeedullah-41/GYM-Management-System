use rusqlite::{params, Connection, OptionalExtension};

use crate::errors::AppError;
use crate::models::{Membership, MonthlyBill};

pub fn get_open_membership(
    conn: &Connection,
    member_id: &str,
) -> Result<Option<Membership>, AppError> {
    conn.query_row(
        "SELECT id, member_id, membership_plan_id, enrollment_date, billing_start_date, agreed_fee, \
         status, status_changed_at, ended_at, created_at, updated_at, billing_cycle_days FROM memberships \
         WHERE member_id = ?1 AND ended_at IS NULL ORDER BY created_at DESC LIMIT 1",
        params![member_id], row_to_membership,
    ).optional().map_err(Into::into)
}

pub fn has_membership_history(conn: &Connection, member_id: &str) -> Result<bool, AppError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM memberships WHERE member_id=?1",
        params![member_id],
        |r| r.get(0),
    )?;
    Ok(count > 0)
}

pub fn get_latest_membership(
    conn: &Connection,
    member_id: &str,
) -> Result<Option<Membership>, AppError> {
    conn.query_row(
        "SELECT id, member_id, membership_plan_id, enrollment_date, billing_start_date, agreed_fee, \
         status, status_changed_at, ended_at, created_at, updated_at, billing_cycle_days FROM memberships \
         WHERE member_id=?1 ORDER BY created_at DESC LIMIT 1", params![member_id], row_to_membership)
        .optional().map_err(Into::into)
}

pub fn create_membership(conn: &Connection, membership: &Membership) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO memberships (id, member_id, membership_plan_id, enrollment_date, billing_start_date, \
         agreed_fee, status, status_changed_at, ended_at, created_at, updated_at, billing_cycle_days) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![membership.id, membership.member_id, membership.membership_plan_id,
            membership.enrollment_date, membership.billing_start_date, membership.agreed_fee,
            membership.status, membership.status_changed_at, membership.ended_at,
            membership.created_at, membership.updated_at, membership.billing_cycle_days],
    )?;
    Ok(())
}

pub fn end_membership(
    conn: &Connection,
    id: &str,
    status: &str,
    ended_at: &str,
    now: &str,
) -> Result<(), AppError> {
    conn.execute(
        "UPDATE memberships SET status=?2, status_changed_at=?3, ended_at=?3, updated_at=?4 WHERE id=?1 AND ended_at IS NULL",
        params![id, status, ended_at, now],
    )?;
    Ok(())
}

pub fn insert_bill(conn: &Connection, bill: &MonthlyBill) -> Result<bool, AppError> {
    let changed = conn.execute(
        "INSERT INTO monthly_membership_bills (id, membership_id, member_id, membership_plan_id, \
         billing_period, period_start, period_end, due_date, expected_amount, paid_amount, status, \
         created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13) \
         ON CONFLICT(membership_id, billing_period) DO NOTHING",
        params![
            bill.id,
            bill.membership_id,
            bill.member_id,
            bill.membership_plan_id,
            bill.billing_period,
            bill.period_start,
            bill.period_end,
            bill.due_date,
            bill.expected_amount,
            bill.paid_amount,
            bill.status,
            bill.created_at,
            bill.updated_at
        ],
    )?;
    Ok(changed > 0)
}

pub fn bill_exists_for_start(
    conn: &Connection,
    membership_id: &str,
    period_start: &str,
) -> Result<bool, AppError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM monthly_membership_bills WHERE membership_id=?1 AND period_start=?2",
        params![membership_id, period_start],
        |r| r.get(0),
    )?;
    Ok(count > 0)
}

pub fn normalize_initial_cycle(
    conn: &Connection,
    membership_id: &str,
    enrollment_date: &str,
    period_end: &str,
    now: &str,
) -> Result<(), AppError> {
    conn.execute(
        "UPDATE memberships SET billing_start_date=?2, updated_at=?3 WHERE id=?1",
        params![membership_id, enrollment_date, now],
    )?;
    conn.execute(
        "UPDATE monthly_membership_bills SET period_start=?2, due_date=?2, period_end=?3, updated_at=?4 \
         WHERE id=(SELECT id FROM monthly_membership_bills WHERE membership_id=?1 ORDER BY period_start LIMIT 1) \
           AND period_start < ?2",
        params![membership_id, enrollment_date, period_end, now],
    )?;
    Ok(())
}

pub fn list_member_bills(conn: &Connection, member_id: &str) -> Result<Vec<MonthlyBill>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, membership_id, member_id, membership_plan_id, billing_period, period_start, \
         period_end, due_date, expected_amount, paid_amount, status, created_at, updated_at \
         FROM monthly_membership_bills WHERE member_id=?1 ORDER BY period_start ASC, created_at ASC")?;
    let rows = stmt
        .query_map(params![member_id], row_to_bill)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn list_outstanding_bills(
    conn: &Connection,
    member_id: &str,
) -> Result<Vec<MonthlyBill>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, membership_id, member_id, membership_plan_id, billing_period, period_start, \
         period_end, due_date, expected_amount, paid_amount, status, created_at, updated_at \
         FROM monthly_membership_bills WHERE member_id=?1 AND paid_amount < expected_amount \
         ORDER BY period_start ASC, created_at ASC",
    )?;
    let rows = stmt
        .query_map(params![member_id], row_to_bill)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn set_bill_paid(
    conn: &Connection,
    bill_id: &str,
    paid: i64,
    status: &str,
    now: &str,
) -> Result<(), AppError> {
    conn.execute(
        "UPDATE monthly_membership_bills SET paid_amount=?2, status=?3, updated_at=?4 WHERE id=?1",
        params![bill_id, paid, status, now],
    )?;
    Ok(())
}

pub fn allocation_total(conn: &Connection, payment_id: &str) -> Result<i64, AppError> {
    Ok(conn.query_row("SELECT COALESCE(SUM(amount),0) FROM payment_allocations WHERE payment_id=?1 AND monthly_bill_id IS NOT NULL",
        params![payment_id], |r| r.get(0))?)
}

pub fn create_bill_allocation(
    conn: &Connection,
    payment_id: &str,
    bill_id: &str,
    plan_id: &str,
    start: &str,
    end: &str,
    amount: i64,
    now: &str,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO payment_allocations (id,payment_id,membership_plan_id,membership_start_date,\
        membership_expiry_date,amount,created_at,monthly_bill_id) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        params![
            uuid::Uuid::new_v4().to_string(),
            payment_id,
            plan_id,
            start,
            end,
            amount,
            now,
            bill_id
        ],
    )?;
    Ok(())
}

pub fn list_payment_allocations(
    conn: &Connection,
    payment_id: &str,
) -> Result<Vec<(String, String, String, i64)>, AppError> {
    let mut stmt = conn.prepare("SELECT b.billing_period,b.period_start,b.period_end,a.amount FROM payment_allocations a \
        JOIN monthly_membership_bills b ON b.id=a.monthly_bill_id WHERE a.payment_id=?1 ORDER BY b.period_start")?;
    let rows = stmt
        .query_map(params![payment_id], |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn list_payment_bill_allocations(
    conn: &Connection,
    payment_id: &str,
) -> Result<Vec<(String, i64, i64)>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT b.id,b.paid_amount,a.amount FROM payment_allocations a \
        JOIN monthly_membership_bills b ON b.id=a.monthly_bill_id WHERE a.payment_id=?1",
    )?;
    let rows = stmt
        .query_map(params![payment_id], |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn total_outstanding(conn: &Connection) -> Result<i64, AppError> {
    Ok(conn.query_row(
        "SELECT COALESCE(SUM(expected_amount-paid_amount),0) FROM monthly_membership_bills",
        [],
        |r| r.get(0),
    )?)
}

fn row_to_membership(row: &rusqlite::Row<'_>) -> Result<Membership, rusqlite::Error> {
    Ok(Membership {
        id: row.get(0)?,
        member_id: row.get(1)?,
        membership_plan_id: row.get(2)?,
        enrollment_date: row.get(3)?,
        billing_start_date: row.get(4)?,
        agreed_fee: row.get(5)?,
        status: row.get(6)?,
        status_changed_at: row.get(7)?,
        ended_at: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
        billing_cycle_days: row.get(11)?,
    })
}

fn row_to_bill(row: &rusqlite::Row<'_>) -> Result<MonthlyBill, rusqlite::Error> {
    Ok(MonthlyBill {
        id: row.get(0)?,
        membership_id: row.get(1)?,
        member_id: row.get(2)?,
        membership_plan_id: row.get(3)?,
        billing_period: row.get(4)?,
        period_start: row.get(5)?,
        period_end: row.get(6)?,
        due_date: row.get(7)?,
        expected_amount: row.get(8)?,
        paid_amount: row.get(9)?,
        status: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}
