use rusqlite::{params, Connection};

use crate::dto::supplement::{
    InventoryMovementResponse, PurchaseResponse, SaleResponse, SupplementSummaryResponse,
    SupplierPaymentResponse,
};
use crate::errors::AppError;
use crate::models::{
    InventoryMovement, SupplementItem, SupplementPurchase, SupplementSale, SupplementSupplier,
    SupplierPayment,
};

// ============================================================================
// SUPPLIERS
// ============================================================================

pub fn create_supplier(conn: &Connection, s: &SupplementSupplier) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO supplement_suppliers (id, name, company, phone, email, address, notes, is_active, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            s.id,
            s.name,
            s.company,
            s.phone,
            s.email,
            s.address,
            s.notes,
            if s.is_active { 1 } else { 0 },
            s.created_at,
            s.updated_at,
        ],
    )?;
    Ok(())
}

pub fn get_supplier_by_id(
    conn: &Connection,
    id: &str,
) -> Result<Option<SupplementSupplier>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, company, phone, email, address, notes, is_active, created_at, updated_at \
         FROM supplement_suppliers WHERE id = ?1",
    )?;
    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(row_to_supplier(row)?))
    } else {
        Ok(None)
    }
}

pub fn update_supplier(conn: &Connection, s: &SupplementSupplier) -> Result<(), AppError> {
    let rows = conn.execute(
        "UPDATE supplement_suppliers SET name = ?1, company = ?2, phone = ?3, email = ?4, \
         address = ?5, notes = ?6, is_active = ?7, updated_at = ?8 WHERE id = ?9",
        params![
            s.name,
            s.company,
            s.phone,
            s.email,
            s.address,
            s.notes,
            if s.is_active { 1 } else { 0 },
            s.updated_at,
            s.id,
        ],
    )?;
    if rows == 0 {
        return Err(AppError::NotFoundError(format!(
            "Supplier '{}' not found",
            s.id
        )));
    }
    Ok(())
}

pub fn delete_supplier(conn: &Connection, id: &str) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM supplement_suppliers WHERE id = ?1", params![id])?;
    if rows == 0 {
        return Err(AppError::NotFoundError(format!(
            "Supplier '{}' not found",
            id
        )));
    }
    Ok(())
}

pub fn list_suppliers(
    conn: &Connection,
    search: &str,
    active_only: bool,
) -> Result<Vec<SupplementSupplier>, AppError> {
    let mut conditions = Vec::new();
    let mut param_values: Vec<String> = Vec::new();

    if active_only {
        conditions.push("is_active = 1".to_string());
    }
    if !search.trim().is_empty() {
        conditions.push(
            "(name LIKE ?1 OR company LIKE ?1 OR phone LIKE ?1 OR address LIKE ?1)".to_string(),
        );
        param_values.push(format!("%{}%", search.trim()));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT id, name, company, phone, email, address, notes, is_active, created_at, updated_at \
         FROM supplement_suppliers {} ORDER BY is_active DESC, name ASC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|v| v as &dyn rusqlite::types::ToSql)
        .collect();
    let mut rows = stmt.query(params_refs.as_slice())?;
    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        out.push(row_to_supplier(row)?);
    }
    Ok(out)
}

pub fn get_supplier_financials(
    conn: &Connection,
    supplier_id: &str,
) -> Result<(i64, i64, i64), AppError> {
    let (total_purchased, purchase_count): (i64, i64) = conn.query_row(
        "SELECT COALESCE(SUM(total_amount), 0), COUNT(*) FROM supplement_purchases WHERE supplier_id = ?1",
        params![supplier_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;
    let total_paid: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM supplier_payments WHERE supplier_id = ?1",
        params![supplier_id],
        |r| r.get(0),
    )?;
    Ok((total_purchased, total_paid, purchase_count))
}

fn row_to_supplier(row: &rusqlite::Row) -> Result<SupplementSupplier, rusqlite::Error> {
    Ok(SupplementSupplier {
        id: row.get(0)?,
        name: row.get(1)?,
        company: row.get(2)?,
        phone: row.get(3)?,
        email: row.get(4)?,
        address: row.get(5)?,
        notes: row.get(6)?,
        is_active: row.get::<_, i32>(7)? != 0,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

// ============================================================================
// INVENTORY ITEMS
// ============================================================================

pub fn create_item(conn: &Connection, item: &SupplementItem) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO supplement_items (id, name, category, brand, unit, cost_price, selling_price, \
         stock_quantity, min_stock_level, notes, is_active, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            item.id,
            item.name,
            item.category,
            item.brand,
            item.unit,
            item.cost_price,
            item.selling_price,
            item.stock_quantity,
            item.min_stock_level,
            item.notes,
            if item.is_active { 1 } else { 0 },
            item.created_at,
            item.updated_at,
        ],
    )?;
    Ok(())
}

pub fn get_item_by_id(conn: &Connection, id: &str) -> Result<Option<SupplementItem>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, category, brand, unit, cost_price, selling_price, stock_quantity, \
         min_stock_level, notes, is_active, created_at, updated_at \
         FROM supplement_items WHERE id = ?1",
    )?;
    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(row_to_item(row)?))
    } else {
        Ok(None)
    }
}

pub fn update_item(conn: &Connection, item: &SupplementItem) -> Result<(), AppError> {
    let rows = conn.execute(
        "UPDATE supplement_items SET name = ?1, category = ?2, brand = ?3, unit = ?4, \
         cost_price = ?5, selling_price = ?6, stock_quantity = ?7, min_stock_level = ?8, \
         notes = ?9, is_active = ?10, updated_at = ?11 WHERE id = ?12",
        params![
            item.name,
            item.category,
            item.brand,
            item.unit,
            item.cost_price,
            item.selling_price,
            item.stock_quantity,
            item.min_stock_level,
            item.notes,
            if item.is_active { 1 } else { 0 },
            item.updated_at,
            item.id,
        ],
    )?;
    if rows == 0 {
        return Err(AppError::NotFoundError(format!(
            "Item '{}' not found",
            item.id
        )));
    }
    Ok(())
}

pub fn delete_item(conn: &Connection, id: &str) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM supplement_items WHERE id = ?1", params![id])?;
    if rows == 0 {
        return Err(AppError::NotFoundError(format!("Item '{}' not found", id)));
    }
    Ok(())
}

pub fn list_items(
    conn: &Connection,
    search: &str,
    category: Option<&str>,
    active_only: bool,
) -> Result<Vec<SupplementItem>, AppError> {
    let mut conditions = Vec::new();
    let mut param_values: Vec<String> = Vec::new();

    if active_only {
        conditions.push("is_active = 1".to_string());
    }
    if !search.trim().is_empty() {
        conditions.push("(name LIKE ?1 OR brand LIKE ?1 OR category LIKE ?1)".to_string());
        param_values.push(format!("%{}%", search.trim()));
    }
    if let Some(cat) = category {
        if !cat.trim().is_empty() {
            conditions.push("category = ?".to_string());
            param_values.push(cat.trim().to_string());
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT id, name, category, brand, unit, cost_price, selling_price, stock_quantity, \
         min_stock_level, notes, is_active, created_at, updated_at \
         FROM supplement_items {} ORDER BY is_active DESC, name ASC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|v| v as &dyn rusqlite::types::ToSql)
        .collect();
    let mut rows = stmt.query(params_refs.as_slice())?;
    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        out.push(row_to_item(row)?);
    }
    Ok(out)
}

fn row_to_item(row: &rusqlite::Row) -> Result<SupplementItem, rusqlite::Error> {
    Ok(SupplementItem {
        id: row.get(0)?,
        name: row.get(1)?,
        category: row.get(2)?,
        brand: row.get(3)?,
        unit: row.get(4)?,
        cost_price: row.get(5)?,
        selling_price: row.get(6)?,
        stock_quantity: row.get(7)?,
        min_stock_level: row.get(8)?,
        notes: row.get(9)?,
        is_active: row.get::<_, i32>(10)? != 0,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

// ============================================================================
// PURCHASES & SUPPLIER PAYMENTS
// ============================================================================

pub fn next_purchase_invoice(conn: &Connection) -> Result<String, AppError> {
    let count: i64 =
        conn.query_row("SELECT COUNT(*) FROM supplement_purchases", [], |r| r.get(0))?;
    Ok(format!("PUR-{:05}", count + 1))
}

pub fn create_purchase(conn: &Connection, p: &SupplementPurchase) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO supplement_purchases (id, invoice_number, supplier_id, item_id, item_name, \
         quantity, unit_cost, total_amount, paid_amount, purchase_date, notes, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            p.id,
            p.invoice_number,
            p.supplier_id,
            p.item_id,
            p.item_name,
            p.quantity,
            p.unit_cost,
            p.total_amount,
            p.paid_amount,
            p.purchase_date,
            p.notes,
            p.created_at,
            p.updated_at,
        ],
    )?;
    Ok(())
}

pub fn get_purchase_by_id(
    conn: &Connection,
    id: &str,
) -> Result<Option<SupplementPurchase>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, invoice_number, supplier_id, item_id, item_name, quantity, unit_cost, \
         total_amount, paid_amount, purchase_date, notes, created_at, updated_at \
         FROM supplement_purchases WHERE id = ?1",
    )?;
    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(SupplementPurchase {
            id: row.get(0)?,
            invoice_number: row.get(1)?,
            supplier_id: row.get(2)?,
            item_id: row.get(3)?,
            item_name: row.get(4)?,
            quantity: row.get(5)?,
            unit_cost: row.get(6)?,
            total_amount: row.get(7)?,
            paid_amount: row.get(8)?,
            purchase_date: row.get(9)?,
            notes: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn delete_purchase(conn: &Connection, id: &str) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM supplement_purchases WHERE id = ?1", params![id])?;
    if rows == 0 {
        return Err(AppError::NotFoundError(format!(
            "Purchase '{}' not found",
            id
        )));
    }
    Ok(())
}

pub fn list_purchases(
    conn: &Connection,
    supplier_id: Option<&str>,
    item_id: Option<&str>,
    date_from: Option<&str>,
    date_to: Option<&str>,
) -> Result<Vec<PurchaseResponse>, AppError> {
    let mut conditions = Vec::new();
    let mut param_values: Vec<String> = Vec::new();

    if let Some(sid) = supplier_id {
        if !sid.trim().is_empty() {
            conditions.push("p.supplier_id = ?".to_string());
            param_values.push(sid.trim().to_string());
        }
    }
    if let Some(iid) = item_id {
        if !iid.trim().is_empty() {
            conditions.push("p.item_id = ?".to_string());
            param_values.push(iid.trim().to_string());
        }
    }
    if let Some(from) = date_from {
        if !from.trim().is_empty() {
            conditions.push("p.purchase_date >= ?".to_string());
            param_values.push(from.trim().to_string());
        }
    }
    if let Some(to) = date_to {
        if !to.trim().is_empty() {
            conditions.push("p.purchase_date <= ?".to_string());
            param_values.push(to.trim().to_string());
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT p.id, p.invoice_number, p.supplier_id, COALESCE(s.name, 'Unknown Supplier'), \
         p.item_id, p.item_name, COALESCE(i.unit, 'Unit'), p.quantity, p.unit_cost, \
         p.total_amount, p.paid_amount, p.purchase_date, p.notes, p.created_at, p.updated_at \
         FROM supplement_purchases p \
         LEFT JOIN supplement_suppliers s ON s.id = p.supplier_id \
         LEFT JOIN supplement_items i ON i.id = p.item_id \
         {} ORDER BY p.purchase_date DESC, p.created_at DESC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|v| v as &dyn rusqlite::types::ToSql)
        .collect();
    let mut rows = stmt.query(params_refs.as_slice())?;
    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        let total_amount: i64 = row.get(9)?;
        let paid_amount: i64 = row.get(10)?;
        let due_amount = (total_amount - paid_amount).max(0);
        let payment_status = if due_amount <= 0 {
            "paid".to_string()
        } else if paid_amount > 0 {
            "partial".to_string()
        } else {
            "unpaid".to_string()
        };
        let supplier_name: String = row.get(3)?;
        let item_name: String = row.get(5)?;
        out.push(PurchaseResponse {
            id: row.get(0)?,
            invoice_number: row.get(1)?,
            supplier_id: row.get(2)?,
            supplier_name: crate::utils::formatting::capitalize_name(&supplier_name),
            item_id: row.get(4)?,
            item_name: crate::utils::formatting::capitalize_name(&item_name),
            item_unit: row.get(6)?,
            quantity: row.get(7)?,
            unit_cost: row.get(8)?,
            total_amount,
            paid_amount,
            due_amount,
            payment_status,
            purchase_date: row.get(11)?,
            notes: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
        });
    }
    Ok(out)
}

pub fn create_supplier_payment(conn: &Connection, sp: &SupplierPayment) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO supplier_payments (id, supplier_id, purchase_id, expense_id, amount, \
         payment_method, payment_date, reference, notes, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            sp.id,
            sp.supplier_id,
            sp.purchase_id,
            sp.expense_id,
            sp.amount,
            sp.payment_method,
            sp.payment_date,
            sp.reference,
            sp.notes,
            sp.created_at,
            sp.updated_at,
        ],
    )?;
    Ok(())
}

pub fn get_supplier_payment_by_id(
    conn: &Connection,
    id: &str,
) -> Result<Option<SupplierPayment>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, supplier_id, purchase_id, expense_id, amount, payment_method, payment_date, \
         reference, notes, created_at, updated_at FROM supplier_payments WHERE id = ?1",
    )?;
    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(SupplierPayment {
            id: row.get(0)?,
            supplier_id: row.get(1)?,
            purchase_id: row.get(2)?,
            expense_id: row.get(3)?,
            amount: row.get(4)?,
            payment_method: row.get(5)?,
            payment_date: row.get(6)?,
            reference: row.get(7)?,
            notes: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn list_supplier_payments_by_purchase(
    conn: &Connection,
    purchase_id: &str,
) -> Result<Vec<SupplierPayment>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, supplier_id, purchase_id, expense_id, amount, payment_method, payment_date, \
         reference, notes, created_at, updated_at FROM supplier_payments WHERE purchase_id = ?1",
    )?;
    let mut rows = stmt.query(params![purchase_id])?;
    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        out.push(SupplierPayment {
            id: row.get(0)?,
            supplier_id: row.get(1)?,
            purchase_id: row.get(2)?,
            expense_id: row.get(3)?,
            amount: row.get(4)?,
            payment_method: row.get(5)?,
            payment_date: row.get(6)?,
            reference: row.get(7)?,
            notes: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        });
    }
    Ok(out)
}

pub fn delete_supplier_payment(conn: &Connection, id: &str) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM supplier_payments WHERE id = ?1", params![id])?;
    if rows == 0 {
        return Err(AppError::NotFoundError(format!(
            "Supplier payment '{}' not found",
            id
        )));
    }
    Ok(())
}

pub fn list_supplier_payments(
    conn: &Connection,
    supplier_id: Option<&str>,
    date_from: Option<&str>,
    date_to: Option<&str>,
) -> Result<Vec<SupplierPaymentResponse>, AppError> {
    let mut conditions = Vec::new();
    let mut param_values: Vec<String> = Vec::new();

    if let Some(sid) = supplier_id {
        if !sid.trim().is_empty() {
            conditions.push("sp.supplier_id = ?".to_string());
            param_values.push(sid.trim().to_string());
        }
    }
    if let Some(from) = date_from {
        if !from.trim().is_empty() {
            conditions.push("sp.payment_date >= ?".to_string());
            param_values.push(from.trim().to_string());
        }
    }
    if let Some(to) = date_to {
        if !to.trim().is_empty() {
            conditions.push("sp.payment_date <= ?".to_string());
            param_values.push(to.trim().to_string());
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT sp.id, sp.supplier_id, COALESCE(s.name, 'Unknown Supplier'), sp.purchase_id, \
         p.invoice_number, sp.expense_id, sp.amount, sp.payment_method, sp.payment_date, \
         sp.reference, sp.notes, sp.created_at, sp.updated_at \
         FROM supplier_payments sp \
         LEFT JOIN supplement_suppliers s ON s.id = sp.supplier_id \
         LEFT JOIN supplement_purchases p ON p.id = sp.purchase_id \
         {} ORDER BY sp.payment_date DESC, sp.created_at DESC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|v| v as &dyn rusqlite::types::ToSql)
        .collect();
    let mut rows = stmt.query(params_refs.as_slice())?;
    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        let supplier_name: String = row.get(2)?;
        out.push(SupplierPaymentResponse {
            id: row.get(0)?,
            supplier_id: row.get(1)?,
            supplier_name: crate::utils::formatting::capitalize_name(&supplier_name),
            purchase_id: row.get(3)?,
            purchase_invoice: row.get(4)?,
            expense_id: row.get(5)?,
            amount: row.get(6)?,
            payment_method: row.get(7)?,
            payment_date: row.get(8)?,
            reference: row.get(9)?,
            notes: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        });
    }
    Ok(out)
}

/// Recomputes `paid_amount` on all purchases belonging to `supplier_id` so that
/// specific-purchase payments and general FIFO supplier payments are always in sync.
pub fn recalculate_supplier_purchase_paid_amounts(
    conn: &Connection,
    supplier_id: &str,
    updated_at: &str,
) -> Result<(), AppError> {
    let mut p_stmt = conn.prepare(
        "SELECT id, total_amount FROM supplement_purchases \
         WHERE supplier_id = ?1 ORDER BY purchase_date ASC, created_at ASC",
    )?;
    let mut purchases: Vec<(String, i64, i64)> = p_stmt
        .query_map(params![supplier_id], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?, 0i64))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut sp_stmt = conn.prepare(
        "SELECT purchase_id, amount FROM supplier_payments \
         WHERE supplier_id = ?1 ORDER BY payment_date ASC, created_at ASC",
    )?;
    let payments: Vec<(Option<String>, i64)> = sp_stmt
        .query_map(params![supplier_id], |r| {
            Ok((r.get::<_, Option<String>>(0)?, r.get::<_, i64>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut unallocated_pool: i64 = 0;

    // Pass 1: apply targeted payments to their specific purchase
    for (target_pid, amount) in payments {
        if let Some(pid) = target_pid {
            if let Some(p) = purchases.iter_mut().find(|(id, _, _)| *id == pid) {
                let remaining = (p.1 - p.2).max(0);
                let applied = amount.min(remaining);
                p.2 += applied;
                unallocated_pool += amount - applied;
            } else {
                unallocated_pool += amount;
            }
        } else {
            unallocated_pool += amount;
        }
    }

    // Pass 2: distribute unallocated pool FIFO across oldest unpaid purchases
    for p in purchases.iter_mut() {
        if unallocated_pool <= 0 {
            break;
        }
        let remaining = (p.1 - p.2).max(0);
        if remaining > 0 {
            let applied = unallocated_pool.min(remaining);
            p.2 += applied;
            unallocated_pool -= applied;
        }
    }

    for (pid, _, paid) in purchases {
        conn.execute(
            "UPDATE supplement_purchases SET paid_amount = ?1, updated_at = ?2 WHERE id = ?3",
            params![paid, updated_at, pid],
        )?;
    }

    Ok(())
}

// ============================================================================
// POS SALES
// ============================================================================

pub fn next_sale_invoice(conn: &Connection) -> Result<String, AppError> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM supplement_sales", [], |r| r.get(0))?;
    Ok(format!("SAL-{:05}", count + 1))
}

pub fn create_sale(conn: &Connection, s: &SupplementSale) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO supplement_sales (id, invoice_number, member_id, customer_name, item_id, \
         item_name, quantity, unit_price, cost_price, discount, total_amount, payment_method, \
         sale_date, notes, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        params![
            s.id,
            s.invoice_number,
            s.member_id,
            s.customer_name,
            s.item_id,
            s.item_name,
            s.quantity,
            s.unit_price,
            s.cost_price,
            s.discount,
            s.total_amount,
            s.payment_method,
            s.sale_date,
            s.notes,
            s.created_at,
            s.updated_at,
        ],
    )?;
    Ok(())
}

pub fn get_sale_by_id(conn: &Connection, id: &str) -> Result<Option<SupplementSale>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, invoice_number, member_id, customer_name, item_id, item_name, quantity, \
         unit_price, cost_price, discount, total_amount, payment_method, sale_date, notes, \
         created_at, updated_at FROM supplement_sales WHERE id = ?1",
    )?;
    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(SupplementSale {
            id: row.get(0)?,
            invoice_number: row.get(1)?,
            member_id: row.get(2)?,
            customer_name: row.get(3)?,
            item_id: row.get(4)?,
            item_name: row.get(5)?,
            quantity: row.get(6)?,
            unit_price: row.get(7)?,
            cost_price: row.get(8)?,
            discount: row.get(9)?,
            total_amount: row.get(10)?,
            payment_method: row.get(11)?,
            sale_date: row.get(12)?,
            notes: row.get(13)?,
            created_at: row.get(14)?,
            updated_at: row.get(15)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn delete_sale(conn: &Connection, id: &str) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM supplement_sales WHERE id = ?1", params![id])?;
    if rows == 0 {
        return Err(AppError::NotFoundError(format!("Sale '{}' not found", id)));
    }
    Ok(())
}

pub fn list_sales(
    conn: &Connection,
    search: &str,
    item_id: Option<&str>,
    member_id: Option<&str>,
    date_from: Option<&str>,
    date_to: Option<&str>,
) -> Result<Vec<SaleResponse>, AppError> {
    let mut conditions = Vec::new();
    let mut param_values: Vec<String> = Vec::new();

    if !search.trim().is_empty() {
        conditions.push(
            "(s.customer_name LIKE ?1 OR s.item_name LIKE ?1 OR s.invoice_number LIKE ?1)"
                .to_string(),
        );
        param_values.push(format!("%{}%", search.trim()));
    }
    if let Some(iid) = item_id {
        if !iid.trim().is_empty() {
            conditions.push("s.item_id = ?".to_string());
            param_values.push(iid.trim().to_string());
        }
    }
    if let Some(mid) = member_id {
        if !mid.trim().is_empty() {
            conditions.push("s.member_id = ?".to_string());
            param_values.push(mid.trim().to_string());
        }
    }
    if let Some(from) = date_from {
        if !from.trim().is_empty() {
            conditions.push("s.sale_date >= ?".to_string());
            param_values.push(from.trim().to_string());
        }
    }
    if let Some(to) = date_to {
        if !to.trim().is_empty() {
            conditions.push("s.sale_date <= ?".to_string());
            param_values.push(to.trim().to_string());
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT s.id, s.invoice_number, s.member_id, m.member_number, s.customer_name, \
         s.item_id, s.item_name, COALESCE(i.unit, 'Unit'), s.quantity, s.unit_price, \
         s.cost_price, s.discount, s.total_amount, s.payment_method, s.sale_date, \
         s.notes, s.created_at, s.updated_at \
         FROM supplement_sales s \
         LEFT JOIN members m ON m.id = s.member_id \
         LEFT JOIN supplement_items i ON i.id = s.item_id \
         {} ORDER BY s.sale_date DESC, s.created_at DESC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|v| v as &dyn rusqlite::types::ToSql)
        .collect();
    let mut rows = stmt.query(params_refs.as_slice())?;
    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        let quantity: i64 = row.get(8)?;
        let cost_price: i64 = row.get(10)?;
        let total_amount: i64 = row.get(12)?;
        let profit = total_amount - (quantity * cost_price);
        let customer_name: String = row.get(4)?;
        let item_name: String = row.get(6)?;
        out.push(SaleResponse {
            id: row.get(0)?,
            invoice_number: row.get(1)?,
            member_id: row.get(2)?,
            member_number: row.get(3)?,
            customer_name: crate::utils::formatting::capitalize_name(&customer_name),
            item_id: row.get(5)?,
            item_name: crate::utils::formatting::capitalize_name(&item_name),
            item_unit: row.get(7)?,
            quantity,
            unit_price: row.get(9)?,
            cost_price,
            discount: row.get(11)?,
            total_amount,
            profit,
            payment_method: row.get(13)?,
            sale_date: row.get(14)?,
            notes: row.get(15)?,
            created_at: row.get(16)?,
            updated_at: row.get(17)?,
        });
    }
    Ok(out)
}

// ============================================================================
// INVENTORY MOVEMENTS & SUMMARY
// ============================================================================

pub fn create_movement(conn: &Connection, m: &InventoryMovement) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO inventory_movements (id, item_id, movement_type, quantity_change, \
         previous_stock, new_stock, reference_id, reason, movement_date, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            m.id,
            m.item_id,
            m.movement_type,
            m.quantity_change,
            m.previous_stock,
            m.new_stock,
            m.reference_id,
            m.reason,
            m.movement_date,
            m.created_at,
        ],
    )?;
    Ok(())
}

pub fn list_movements(
    conn: &Connection,
    item_id: Option<&str>,
    movement_type: Option<&str>,
) -> Result<Vec<InventoryMovementResponse>, AppError> {
    let mut conditions = Vec::new();
    let mut param_values: Vec<String> = Vec::new();

    if let Some(iid) = item_id {
        if !iid.trim().is_empty() {
            conditions.push("m.item_id = ?".to_string());
            param_values.push(iid.trim().to_string());
        }
    }
    if let Some(mtype) = movement_type {
        if !mtype.trim().is_empty() {
            conditions.push("m.movement_type = ?".to_string());
            param_values.push(mtype.trim().to_string());
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT m.id, m.item_id, COALESCE(i.name, 'Deleted Item'), COALESCE(i.unit, 'Unit'), \
         m.movement_type, m.quantity_change, m.previous_stock, m.new_stock, m.reference_id, \
         m.reason, m.movement_date, m.created_at \
         FROM inventory_movements m \
         LEFT JOIN supplement_items i ON i.id = m.item_id \
         {} ORDER BY m.movement_date DESC, m.created_at DESC LIMIT 200",
        where_clause
    );

    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|v| v as &dyn rusqlite::types::ToSql)
        .collect();
    let mut rows = stmt.query(params_refs.as_slice())?;
    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        let mov = InventoryMovement {
            id: row.get(0)?,
            item_id: row.get(1)?,
            movement_type: row.get(4)?,
            quantity_change: row.get(5)?,
            previous_stock: row.get(6)?,
            new_stock: row.get(7)?,
            reference_id: row.get(8)?,
            reason: row.get(9)?,
            movement_date: row.get(10)?,
            created_at: row.get(11)?,
        };
        out.push(InventoryMovementResponse::from_movement(
            mov,
            row.get(2)?,
            row.get(3)?,
        ));
    }
    Ok(out)
}

pub fn get_summary(conn: &Connection) -> Result<SupplementSummaryResponse, AppError> {
    let (
        total_items,
        total_stock_units,
        low_stock_count,
        out_of_stock_count,
        inventory_cost_value,
        inventory_retail_value,
    ): (i64, i64, i64, i64, i64, i64) = conn.query_row(
        "SELECT \
            COUNT(*), \
            COALESCE(SUM(CASE WHEN stock_quantity > 0 THEN stock_quantity ELSE 0 END), 0), \
            COALESCE(SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= min_stock_level THEN 1 ELSE 0 END), 0), \
            COALESCE(SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END), 0), \
            COALESCE(SUM(CASE WHEN stock_quantity > 0 THEN stock_quantity * cost_price ELSE 0 END), 0), \
            COALESCE(SUM(CASE WHEN stock_quantity > 0 THEN stock_quantity * selling_price ELSE 0 END), 0) \
         FROM supplement_items WHERE is_active = 1",
        [],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
    )?;

    let total_suppliers: i64 = conn.query_row(
        "SELECT COUNT(*) FROM supplement_suppliers WHERE is_active = 1",
        [],
        |r| r.get(0),
    )?;

    let total_purchased_amount: i64 = conn.query_row(
        "SELECT COALESCE(SUM(total_amount), 0) FROM supplement_purchases",
        [],
        |r| r.get(0),
    )?;

    let total_paid_to_suppliers: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM supplier_payments",
        [],
        |r| r.get(0),
    )?;

    // Calculate supplier-by-supplier dues so overpayment on one supplier doesn't mask another's due
    let suppliers = list_suppliers(conn, "", false)?;
    let mut total_supplier_dues: i64 = 0;
    let mut suppliers_with_dues: i64 = 0;
    for s in suppliers {
        let (purchased, paid, _) = get_supplier_financials(conn, &s.id)?;
        let due = (purchased - paid).max(0);
        if due > 0 {
            total_supplier_dues += due;
            suppliers_with_dues += 1;
        }
    }

    let (total_sales_count, total_sales_revenue, total_sales_profit): (i64, i64, i64) = conn
        .query_row(
            "SELECT \
                COUNT(*), \
                COALESCE(SUM(total_amount), 0), \
                COALESCE(SUM(total_amount - (quantity * cost_price)), 0) \
             FROM supplement_sales",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )?;

    Ok(SupplementSummaryResponse {
        total_items,
        total_stock_units,
        low_stock_count,
        out_of_stock_count,
        inventory_cost_value,
        inventory_retail_value,
        total_suppliers,
        suppliers_with_dues,
        total_purchased_amount,
        total_paid_to_suppliers,
        total_supplier_dues,
        total_sales_revenue,
        total_sales_profit,
        total_sales_count,
    })
}

