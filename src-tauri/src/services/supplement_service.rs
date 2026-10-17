use chrono::NaiveDate;
use rusqlite::Connection;

use crate::dto::supplement::{
    AdjustStockRequest, CreateItemRequest, CreatePurchaseRequest, CreateSaleRequest,
    CreateSupplierPaymentRequest, CreateSupplierRequest, InventoryMovementResponse, ItemResponse,
    PurchaseResponse, SaleResponse, SupplementSummaryResponse, SupplierPaymentResponse,
    SupplierResponse, UpdateItemRequest, UpdateSupplierRequest,
};
use crate::errors::AppError;
use crate::models::{
    Expense, InventoryMovement, SupplementItem, SupplementPurchase, SupplementSale,
    SupplementSupplier, SupplierPayment,
};
use crate::repositories::{expense_repository, member_repository, supplement_repository};
use crate::utils::dates::{now_iso8601, today_iso};

// ============================================================================
// SUPPLIERS
// ============================================================================

pub fn create_supplier(
    conn: &Connection,
    req: CreateSupplierRequest,
) -> Result<SupplierResponse, AppError> {
    let name = req.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::ValidationError(
            "Supplier name cannot be empty".into(),
        ));
    }

    let now = now_iso8601();
    let supplier = SupplementSupplier {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        company: clean_opt(req.company),
        phone: clean_opt(req.phone),
        email: clean_opt(req.email),
        address: clean_opt(req.address),
        notes: clean_opt(req.notes),
        is_active: true,
        created_at: now.clone(),
        updated_at: now,
    };

    supplement_repository::create_supplier(conn, &supplier)?;
    Ok(SupplierResponse::from_supplier(supplier, 0, 0, 0))
}

pub fn update_supplier(
    conn: &Connection,
    id: &str,
    req: UpdateSupplierRequest,
) -> Result<SupplierResponse, AppError> {
    let mut supplier = supplement_repository::get_supplier_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Supplier '{}' not found", id)))?;

    let name = req.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::ValidationError(
            "Supplier name cannot be empty".into(),
        ));
    }

    supplier.name = name;
    supplier.company = clean_opt(req.company);
    supplier.phone = clean_opt(req.phone);
    supplier.email = clean_opt(req.email);
    supplier.address = clean_opt(req.address);
    supplier.notes = clean_opt(req.notes);
    if let Some(active) = req.is_active {
        supplier.is_active = active;
    }
    supplier.updated_at = now_iso8601();

    supplement_repository::update_supplier(conn, &supplier)?;
    let (purchased, paid, count) = supplement_repository::get_supplier_financials(conn, &supplier.id)?;
    Ok(SupplierResponse::from_supplier(supplier, purchased, paid, count))
}

pub fn delete_supplier(conn: &Connection, id: &str) -> Result<(), AppError> {
    let (_, _, count) = supplement_repository::get_supplier_financials(conn, id)?;
    if count > 0 {
        return Err(AppError::ConflictError(
            "Cannot delete supplier with existing purchases. Deactivate the supplier instead."
                .into(),
        ));
    }
    supplement_repository::delete_supplier(conn, id)
}

pub fn list_suppliers(
    conn: &Connection,
    search: &str,
    active_only: bool,
) -> Result<Vec<SupplierResponse>, AppError> {
    let suppliers = supplement_repository::list_suppliers(conn, search, active_only)?;
    let mut out = Vec::with_capacity(suppliers.len());
    for s in suppliers {
        let (purchased, paid, count) = supplement_repository::get_supplier_financials(conn, &s.id)?;
        out.push(SupplierResponse::from_supplier(s, purchased, paid, count));
    }
    Ok(out)
}

// ============================================================================
// INVENTORY ITEMS
// ============================================================================

pub fn create_item(conn: &Connection, req: CreateItemRequest) -> Result<ItemResponse, AppError> {
    let name = req.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::ValidationError("Item name cannot be empty".into()));
    }
    let category = req.category.trim().to_string();
    if category.is_empty() {
        return Err(AppError::ValidationError(
            "Item category cannot be empty".into(),
        ));
    }
    if req.cost_price < 0 {
        return Err(AppError::ValidationError(
            "Cost price cannot be negative".into(),
        ));
    }
    if req.selling_price < 0 {
        return Err(AppError::ValidationError(
            "Selling price cannot be negative".into(),
        ));
    }
    let initial_stock = req.initial_stock.unwrap_or(0);
    if initial_stock < 0 {
        return Err(AppError::ValidationError(
            "Initial stock cannot be negative".into(),
        ));
    }
    let min_stock = req.min_stock_level.unwrap_or(5).max(0);
    let unit = clean_opt(req.unit).unwrap_or_else(|| "Tub / Jar".to_string());

    let now = now_iso8601();
    let item = SupplementItem {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        category,
        brand: clean_opt(req.brand),
        unit,
        cost_price: req.cost_price,
        selling_price: req.selling_price,
        stock_quantity: initial_stock,
        min_stock_level: min_stock,
        notes: clean_opt(req.notes),
        is_active: true,
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    supplement_repository::create_item(conn, &item)?;

    if initial_stock > 0 {
        let mov = InventoryMovement {
            id: uuid::Uuid::new_v4().to_string(),
            item_id: item.id.clone(),
            movement_type: "initial".to_string(),
            quantity_change: initial_stock,
            previous_stock: 0,
            new_stock: initial_stock,
            reference_id: None,
            reason: Some("Initial opening stock".to_string()),
            movement_date: today_iso(),
            created_at: now,
        };
        supplement_repository::create_movement(conn, &mov)?;
    }

    Ok(ItemResponse::from_item(item))
}

pub fn update_item(
    conn: &Connection,
    id: &str,
    req: UpdateItemRequest,
) -> Result<ItemResponse, AppError> {
    let mut item = supplement_repository::get_item_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Item '{}' not found", id)))?;

    let name = req.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::ValidationError("Item name cannot be empty".into()));
    }
    let category = req.category.trim().to_string();
    if category.is_empty() {
        return Err(AppError::ValidationError(
            "Item category cannot be empty".into(),
        ));
    }
    if req.cost_price < 0 || req.selling_price < 0 || req.min_stock_level < 0 {
        return Err(AppError::ValidationError(
            "Prices and minimum stock level cannot be negative".into(),
        ));
    }

    item.name = name;
    item.category = category;
    item.brand = clean_opt(req.brand);
    if let Some(u) = clean_opt(req.unit) {
        item.unit = u;
    }
    item.cost_price = req.cost_price;
    item.selling_price = req.selling_price;
    item.min_stock_level = req.min_stock_level;
    item.notes = clean_opt(req.notes);
    if let Some(active) = req.is_active {
        item.is_active = active;
    }
    item.updated_at = now_iso8601();

    supplement_repository::update_item(conn, &item)?;
    Ok(ItemResponse::from_item(item))
}

pub fn adjust_stock(conn: &Connection, req: AdjustStockRequest) -> Result<ItemResponse, AppError> {
    let mut item = supplement_repository::get_item_by_id(conn, &req.item_id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Item '{}' not found", req.item_id)))?;

    let prev = item.stock_quantity;
    let new_stock = match req.adjustment_type.as_str() {
        "add" => {
            if req.quantity <= 0 {
                return Err(AppError::ValidationError(
                    "Quantity to add must be greater than zero".into(),
                ));
            }
            prev + req.quantity
        }
        "subtract" => {
            if req.quantity <= 0 {
                return Err(AppError::ValidationError(
                    "Quantity to subtract must be greater than zero".into(),
                ));
            }
            if prev - req.quantity < 0 {
                return Err(AppError::ValidationError(format!(
                    "Cannot reduce stock below zero (current stock: {})",
                    prev
                )));
            }
            prev - req.quantity
        }
        "set" => {
            if req.quantity < 0 {
                return Err(AppError::ValidationError(
                    "Stock quantity cannot be negative".into(),
                ));
            }
            req.quantity
        }
        other => {
            return Err(AppError::ValidationError(format!(
                "Invalid adjustment_type '{}'. Use 'add', 'subtract', or 'set'",
                other
            )));
        }
    };

    let diff = new_stock - prev;
    let now = now_iso8601();
    let mov_date = clean_opt(req.movement_date).unwrap_or_else(today_iso);
    validate_date(&mov_date)?;

    item.stock_quantity = new_stock;
    item.updated_at = now.clone();
    supplement_repository::update_item(conn, &item)?;

    if diff != 0 {
        let mov = InventoryMovement {
            id: uuid::Uuid::new_v4().to_string(),
            item_id: item.id.clone(),
            movement_type: "adjustment".to_string(),
            quantity_change: diff,
            previous_stock: prev,
            new_stock,
            reference_id: None,
            reason: clean_opt(req.reason).or_else(|| Some("Manual stock adjustment".to_string())),
            movement_date: mov_date,
            created_at: now,
        };
        supplement_repository::create_movement(conn, &mov)?;
    }

    Ok(ItemResponse::from_item(item))
}

pub fn delete_item(conn: &Connection, id: &str) -> Result<(), AppError> {
    let purchases = supplement_repository::list_purchases(conn, None, Some(id), None, None)?;
    if !purchases.is_empty() {
        return Err(AppError::ConflictError(
            "Cannot delete item with purchase history. Deactivate the item instead.".into(),
        ));
    }
    let sales = supplement_repository::list_sales(conn, "", Some(id), None, None, None)?;
    if !sales.is_empty() {
        return Err(AppError::ConflictError(
            "Cannot delete item with sales history. Deactivate the item instead.".into(),
        ));
    }
    supplement_repository::delete_item(conn, id)
}

pub fn list_items(
    conn: &Connection,
    search: &str,
    category: Option<&str>,
    active_only: bool,
) -> Result<Vec<ItemResponse>, AppError> {
    let items = supplement_repository::list_items(conn, search, category, active_only)?;
    Ok(items.into_iter().map(ItemResponse::from_item).collect())
}

pub fn list_movements(
    conn: &Connection,
    item_id: Option<&str>,
    movement_type: Option<&str>,
) -> Result<Vec<InventoryMovementResponse>, AppError> {
    supplement_repository::list_movements(conn, item_id, movement_type)
}

// ============================================================================
// PURCHASES & SUPPLIER PAYMENTS
// ============================================================================

pub fn create_purchase(
    conn: &Connection,
    req: CreatePurchaseRequest,
) -> Result<PurchaseResponse, AppError> {
    validate_date(&req.purchase_date)?;
    if req.quantity <= 0 {
        return Err(AppError::ValidationError(
            "Purchase quantity must be greater than zero".into(),
        ));
    }
    if req.unit_cost < 0 {
        return Err(AppError::ValidationError(
            "Unit cost cannot be negative".into(),
        ));
    }

    let supplier = supplement_repository::get_supplier_by_id(conn, &req.supplier_id)?
        .ok_or_else(|| AppError::NotFoundError("Supplier not found".into()))?;
    let mut item = supplement_repository::get_item_by_id(conn, &req.item_id)?
        .ok_or_else(|| AppError::NotFoundError("Supplement item not found".into()))?;

    let total_amount = req.quantity * req.unit_cost;
    let paid_amount = req.paid_amount.unwrap_or(0);
    if paid_amount < 0 {
        return Err(AppError::ValidationError(
            "Paid amount cannot be negative".into(),
        ));
    }
    if paid_amount > total_amount {
        return Err(AppError::ValidationError(format!(
            "Paid amount ({}) cannot exceed total purchase amount ({})",
            paid_amount, total_amount
        )));
    }

    let invoice_number = match clean_opt(req.invoice_number) {
        Some(inv) => inv,
        None => supplement_repository::next_purchase_invoice(conn)?,
    };

    let now = now_iso8601();
    let purchase = SupplementPurchase {
        id: uuid::Uuid::new_v4().to_string(),
        invoice_number: invoice_number.clone(),
        supplier_id: supplier.id.clone(),
        item_id: item.id.clone(),
        item_name: item.name.clone(),
        quantity: req.quantity,
        unit_cost: req.unit_cost,
        total_amount,
        paid_amount,
        purchase_date: req.purchase_date.clone(),
        notes: clean_opt(req.notes),
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    supplement_repository::create_purchase(conn, &purchase)?;

    // Update item stock and cost price
    let prev_stock = item.stock_quantity;
    item.stock_quantity += req.quantity;
    if req.update_item_cost.unwrap_or(true) && req.unit_cost > 0 {
        item.cost_price = req.unit_cost;
    }
    item.updated_at = now.clone();
    supplement_repository::update_item(conn, &item)?;

    // Log stock movement
    let mov = InventoryMovement {
        id: uuid::Uuid::new_v4().to_string(),
        item_id: item.id.clone(),
        movement_type: "purchase".to_string(),
        quantity_change: req.quantity,
        previous_stock: prev_stock,
        new_stock: item.stock_quantity,
        reference_id: Some(purchase.id.clone()),
        reason: Some(format!(
            "Purchased from {} ({})",
            supplier.name, invoice_number
        )),
        movement_date: req.purchase_date.clone(),
        created_at: now.clone(),
    };
    supplement_repository::create_movement(conn, &mov)?;

    // If paid_amount > 0, record SupplierPayment and auto-record Expense
    if paid_amount > 0 {
        let method = clean_opt(req.payment_method).unwrap_or_else(|| "Cash".to_string());
        let expense_id = uuid::Uuid::new_v4().to_string();
        let expense = Expense {
            id: expense_id.clone(),
            category: "Supplements".to_string(),
            description: Some(format!(
                "Supplement Purchase {} — {} ({} {})",
                invoice_number, item.name, req.quantity, item.unit
            )),
            amount: paid_amount,
            expense_date: req.purchase_date.clone(),
            payment_method: Some(method.clone()),
            vendor: Some(supplier.name.clone()),
            notes: purchase.notes.clone(),
            is_deleted: false,
            deleted_at: None,
            created_at: now.clone(),
            updated_at: now.clone(),
        };
        expense_repository::create(conn, &expense)?;

        let sp = SupplierPayment {
            id: uuid::Uuid::new_v4().to_string(),
            supplier_id: supplier.id.clone(),
            purchase_id: Some(purchase.id.clone()),
            expense_id: Some(expense_id),
            amount: paid_amount,
            payment_method: method,
            payment_date: req.purchase_date.clone(),
            reference: Some(invoice_number.clone()),
            notes: Some(format!("Initial payment for {}", invoice_number)),
            created_at: now.clone(),
            updated_at: now.clone(),
        };
        supplement_repository::create_supplier_payment(conn, &sp)?;
    }

    supplement_repository::recalculate_supplier_purchase_paid_amounts(conn, &supplier.id, &now)?;

    let list = supplement_repository::list_purchases(conn, Some(&supplier.id), None, None, None)?;
    list.into_iter()
        .find(|p| p.id == purchase.id)
        .ok_or_else(|| AppError::InternalError("Failed to load created purchase".into()))
}

pub fn delete_purchase(conn: &Connection, id: &str) -> Result<(), AppError> {
    let purchase = supplement_repository::get_purchase_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Purchase '{}' not found", id)))?;

    let now = now_iso8601();

    // Revert item stock if item still exists
    if let Some(mut item) = supplement_repository::get_item_by_id(conn, &purchase.item_id)? {
        let prev = item.stock_quantity;
        item.stock_quantity = (prev - purchase.quantity).max(0);
        item.updated_at = now.clone();
        supplement_repository::update_item(conn, &item)?;

        let mov = InventoryMovement {
            id: uuid::Uuid::new_v4().to_string(),
            item_id: item.id,
            movement_type: "adjustment".to_string(),
            quantity_change: item.stock_quantity - prev,
            previous_stock: prev,
            new_stock: item.stock_quantity,
            reference_id: Some(purchase.id.clone()),
            reason: Some(format!(
                "Purchase {} deleted",
                purchase.invoice_number
            )),
            movement_date: today_iso(),
            created_at: now.clone(),
        };
        supplement_repository::create_movement(conn, &mov)?;
    }

    // Delete any payments linked directly to this purchase & soft-delete their expenses
    let linked_payments =
        supplement_repository::list_supplier_payments_by_purchase(conn, &purchase.id)?;
    for sp in linked_payments {
        if let Some(ref exp_id) = sp.expense_id {
            let _ = expense_repository::soft_delete(conn, exp_id, &now);
        }
        supplement_repository::delete_supplier_payment(conn, &sp.id)?;
    }

    supplement_repository::delete_purchase(conn, &purchase.id)?;
    supplement_repository::recalculate_supplier_purchase_paid_amounts(
        conn,
        &purchase.supplier_id,
        &now,
    )?;

    Ok(())
}

pub fn list_purchases(
    conn: &Connection,
    supplier_id: Option<&str>,
    item_id: Option<&str>,
    date_from: Option<&str>,
    date_to: Option<&str>,
) -> Result<Vec<PurchaseResponse>, AppError> {
    supplement_repository::list_purchases(conn, supplier_id, item_id, date_from, date_to)
}

pub fn create_supplier_payment(
    conn: &Connection,
    req: CreateSupplierPaymentRequest,
) -> Result<SupplierPaymentResponse, AppError> {
    if req.amount <= 0 {
        return Err(AppError::ValidationError(
            "Payment amount must be greater than zero".into(),
        ));
    }
    validate_date(&req.payment_date)?;

    let supplier = supplement_repository::get_supplier_by_id(conn, &req.supplier_id)?
        .ok_or_else(|| AppError::NotFoundError("Supplier not found".into()))?;

    let (total_purchased, total_paid, _) =
        supplement_repository::get_supplier_financials(conn, &supplier.id)?;
    let supplier_due = (total_purchased - total_paid).max(0);

    if req.amount > supplier_due {
        return Err(AppError::ValidationError(format!(
            "Payment amount ({}) exceeds supplier's total outstanding due ({})",
            req.amount, supplier_due
        )));
    }

    let mut invoice_label: Option<String> = None;
    let purchase_id = clean_opt(req.purchase_id);
    if let Some(ref pid) = purchase_id {
        let purchase = supplement_repository::get_purchase_by_id(conn, pid)?
            .ok_or_else(|| AppError::NotFoundError("Referenced purchase not found".into()))?;
        let purchase_due = (purchase.total_amount - purchase.paid_amount).max(0);
        if req.amount > purchase_due {
            return Err(AppError::ValidationError(format!(
                "Payment amount ({}) exceeds due amount ({}) for invoice {}",
                req.amount, purchase_due, purchase.invoice_number
            )));
        }
        invoice_label = Some(purchase.invoice_number);
    }

    let now = now_iso8601();
    let method = if req.payment_method.trim().is_empty() {
        "Cash".to_string()
    } else {
        req.payment_method.trim().to_string()
    };

    // Auto-record in main Expenses table
    let expense_id = uuid::Uuid::new_v4().to_string();
    let desc = match invoice_label {
        Some(ref inv) => format!("Supplier Due Payment — {} (Invoice {})", supplier.name, inv),
        None => format!("Supplier Due Payment — {}", supplier.name),
    };
    let expense = Expense {
        id: expense_id.clone(),
        category: "Supplements".to_string(),
        description: Some(desc),
        amount: req.amount,
        expense_date: req.payment_date.clone(),
        payment_method: Some(method.clone()),
        vendor: Some(supplier.name.clone()),
        notes: clean_opt(req.notes.clone()),
        is_deleted: false,
        deleted_at: None,
        created_at: now.clone(),
        updated_at: now.clone(),
    };
    expense_repository::create(conn, &expense)?;

    let sp = SupplierPayment {
        id: uuid::Uuid::new_v4().to_string(),
        supplier_id: supplier.id.clone(),
        purchase_id,
        expense_id: Some(expense_id),
        amount: req.amount,
        payment_method: method,
        payment_date: req.payment_date,
        reference: clean_opt(req.reference),
        notes: clean_opt(req.notes),
        created_at: now.clone(),
        updated_at: now.clone(),
    };
    supplement_repository::create_supplier_payment(conn, &sp)?;
    supplement_repository::recalculate_supplier_purchase_paid_amounts(conn, &supplier.id, &now)?;

    Ok(SupplierPaymentResponse {
        id: sp.id,
        supplier_id: sp.supplier_id,
        supplier_name: supplier.name,
        purchase_id: sp.purchase_id,
        purchase_invoice: invoice_label,
        expense_id: sp.expense_id,
        amount: sp.amount,
        payment_method: sp.payment_method,
        payment_date: sp.payment_date,
        reference: sp.reference,
        notes: sp.notes,
        created_at: sp.created_at,
        updated_at: sp.updated_at,
    })
}

pub fn delete_supplier_payment(conn: &Connection, id: &str) -> Result<(), AppError> {
    let sp = supplement_repository::get_supplier_payment_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Payment '{}' not found", id)))?;

    let now = now_iso8601();
    if let Some(ref exp_id) = sp.expense_id {
        let _ = expense_repository::soft_delete(conn, exp_id, &now);
    }

    supplement_repository::delete_supplier_payment(conn, &sp.id)?;
    supplement_repository::recalculate_supplier_purchase_paid_amounts(
        conn,
        &sp.supplier_id,
        &now,
    )?;

    Ok(())
}

pub fn list_supplier_payments(
    conn: &Connection,
    supplier_id: Option<&str>,
    date_from: Option<&str>,
    date_to: Option<&str>,
) -> Result<Vec<SupplierPaymentResponse>, AppError> {
    supplement_repository::list_supplier_payments(conn, supplier_id, date_from, date_to)
}

// ============================================================================
// POS SALES
// ============================================================================

pub fn create_sale(conn: &Connection, req: CreateSaleRequest) -> Result<SaleResponse, AppError> {
    validate_date(&req.sale_date)?;
    if req.quantity <= 0 {
        return Err(AppError::ValidationError(
            "Sale quantity must be greater than zero".into(),
        ));
    }
    if req.unit_price < 0 {
        return Err(AppError::ValidationError(
            "Unit price cannot be negative".into(),
        ));
    }
    let discount = req.discount.unwrap_or(0);
    if discount < 0 {
        return Err(AppError::ValidationError(
            "Discount cannot be negative".into(),
        ));
    }

    let mut item = supplement_repository::get_item_by_id(conn, &req.item_id)?
        .ok_or_else(|| AppError::NotFoundError("Supplement item not found".into()))?;

    if item.stock_quantity < req.quantity {
        return Err(AppError::ValidationError(format!(
            "Insufficient stock for '{}'. Available: {} {}, Requested: {}",
            item.name, item.stock_quantity, item.unit, req.quantity
        )));
    }

    let subtotal = req.quantity * req.unit_price;
    if discount > subtotal {
        return Err(AppError::ValidationError(
            "Discount cannot exceed total sale amount".into(),
        ));
    }
    let total_amount = subtotal - discount;

    let member_id = clean_opt(req.member_id);
    let mut member_number: Option<String> = None;
    let customer_name = if let Some(ref mid) = member_id {
        let member = member_repository::get_by_id(conn, mid)?
            .ok_or_else(|| AppError::NotFoundError("Selected member not found".into()))?;
        member_number = Some(member.member_number);
        member.full_name
    } else {
        clean_opt(req.customer_name).unwrap_or_else(|| "Walk-in Customer".to_string())
    };

    let invoice_number = supplement_repository::next_sale_invoice(conn)?;
    let now = now_iso8601();
    let method = if req.payment_method.trim().is_empty() {
        "Cash".to_string()
    } else {
        req.payment_method.trim().to_string()
    };

    let sale = SupplementSale {
        id: uuid::Uuid::new_v4().to_string(),
        invoice_number: invoice_number.clone(),
        member_id,
        customer_name: customer_name.clone(),
        item_id: item.id.clone(),
        item_name: item.name.clone(),
        quantity: req.quantity,
        unit_price: req.unit_price,
        cost_price: item.cost_price,
        discount,
        total_amount,
        payment_method: method,
        sale_date: req.sale_date.clone(),
        notes: clean_opt(req.notes),
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    supplement_repository::create_sale(conn, &sale)?;

    // Deduct stock
    let prev_stock = item.stock_quantity;
    item.stock_quantity -= req.quantity;
    item.updated_at = now.clone();
    supplement_repository::update_item(conn, &item)?;

    // Record stock movement
    let mov = InventoryMovement {
        id: uuid::Uuid::new_v4().to_string(),
        item_id: item.id.clone(),
        movement_type: "sale".to_string(),
        quantity_change: -req.quantity,
        previous_stock: prev_stock,
        new_stock: item.stock_quantity,
        reference_id: Some(sale.id.clone()),
        reason: Some(format!("Sold to {} ({})", customer_name, invoice_number)),
        movement_date: req.sale_date,
        created_at: now,
    };
    supplement_repository::create_movement(conn, &mov)?;

    let profit = total_amount - (req.quantity * sale.cost_price);
    Ok(SaleResponse {
        id: sale.id,
        invoice_number: sale.invoice_number,
        member_id: sale.member_id,
        member_number,
        customer_name: sale.customer_name,
        item_id: sale.item_id,
        item_name: sale.item_name,
        item_unit: item.unit,
        quantity: sale.quantity,
        unit_price: sale.unit_price,
        cost_price: sale.cost_price,
        discount: sale.discount,
        total_amount: sale.total_amount,
        profit,
        payment_method: sale.payment_method,
        sale_date: sale.sale_date,
        notes: sale.notes,
        created_at: sale.created_at,
        updated_at: sale.updated_at,
    })
}

pub fn delete_sale(conn: &Connection, id: &str) -> Result<(), AppError> {
    let sale = supplement_repository::get_sale_by_id(conn, id)?
        .ok_or_else(|| AppError::NotFoundError(format!("Sale '{}' not found", id)))?;

    let now = now_iso8601();
    if let Some(mut item) = supplement_repository::get_item_by_id(conn, &sale.item_id)? {
        let prev = item.stock_quantity;
        item.stock_quantity += sale.quantity;
        item.updated_at = now.clone();
        supplement_repository::update_item(conn, &item)?;

        let mov = InventoryMovement {
            id: uuid::Uuid::new_v4().to_string(),
            item_id: item.id,
            movement_type: "adjustment".to_string(),
            quantity_change: sale.quantity,
            previous_stock: prev,
            new_stock: item.stock_quantity,
            reference_id: Some(sale.id.clone()),
            reason: Some(format!("Sale {} deleted/restocked", sale.invoice_number)),
            movement_date: today_iso(),
            created_at: now,
        };
        supplement_repository::create_movement(conn, &mov)?;
    }

    supplement_repository::delete_sale(conn, &sale.id)
}

pub fn list_sales(
    conn: &Connection,
    search: &str,
    item_id: Option<&str>,
    member_id: Option<&str>,
    date_from: Option<&str>,
    date_to: Option<&str>,
) -> Result<Vec<SaleResponse>, AppError> {
    supplement_repository::list_sales(conn, search, item_id, member_id, date_from, date_to)
}

pub fn get_summary(conn: &Connection) -> Result<SupplementSummaryResponse, AppError> {
    supplement_repository::get_summary(conn)
}

fn clean_opt(val: Option<String>) -> Option<String> {
    val.map(|v| v.trim().to_string()).filter(|v| !v.is_empty())
}

fn validate_date(date: &str) -> Result<(), AppError> {
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
    use crate::repositories::expense_repository;

    fn test_db() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&mut conn).unwrap();
        conn
    }

    #[test]
    fn should_handle_full_supplement_purchase_payment_due_and_sale_flow() {
        let conn = test_db();

        // 1. Create Supplier
        let supplier = create_supplier(
            &conn,
            CreateSupplierRequest {
                name: "Optimum Nutrition PK".into(),
                company: Some("ON Distributors".into()),
                phone: Some("0300-1234567".into()),
                email: None,
                address: Some("Lahore".into()),
                notes: None,
            },
        )
        .unwrap();
        assert_eq!(supplier.total_due, 0);

        // 2. Create Inventory Item
        let item = create_item(
            &conn,
            CreateItemRequest {
                name: "Gold Standard Whey 5lbs".into(),
                category: "Whey Protein".into(),
                brand: Some("Optimum Nutrition".into()),
                unit: Some("Tub / Jar".into()),
                cost_price: 18000,
                selling_price: 22000,
                initial_stock: Some(2),
                min_stock_level: Some(3),
                notes: None,
            },
        )
        .unwrap();
        assert_eq!(item.stock_quantity, 2);
        assert_eq!(item.stock_status, "low_stock");

        // 3. Purchase 10 tubs @ 18,500 = 185,000, pay 85,000 now -> 100,000 due
        let purchase = create_purchase(
            &conn,
            CreatePurchaseRequest {
                supplier_id: supplier.id.clone(),
                item_id: item.id.clone(),
                quantity: 10,
                unit_cost: 18500,
                paid_amount: Some(85000),
                payment_method: Some("Bank Transfer".into()),
                purchase_date: "2026-10-15".into(),
                invoice_number: Some("INV-1001".into()),
                update_item_cost: Some(true),
                notes: Some("First batch".into()),
            },
        )
        .unwrap();

        assert_eq!(purchase.total_amount, 185000);
        assert_eq!(purchase.paid_amount, 85000);
        assert_eq!(purchase.due_amount, 100000);
        assert_eq!(purchase.payment_status, "partial");

        // Verify stock updated to 12 and cost updated to 18,500
        let items = list_items(&conn, "", None, true).unwrap();
        assert_eq!(items[0].stock_quantity, 12);
        assert_eq!(items[0].cost_price, 18500);
        assert_eq!(items[0].stock_status, "in_stock");

        // Verify expense was auto-created in main expenses table
        let expenses = expense_repository::list(&conn, "", Some("Supplements"), None, None).unwrap();
        assert_eq!(expenses.len(), 1);
        assert_eq!(expenses[0].amount, 85000);

        // 4. Pay 60,000 towards supplier due
        let sp = create_supplier_payment(
            &conn,
            CreateSupplierPaymentRequest {
                supplier_id: supplier.id.clone(),
                purchase_id: Some(purchase.id.clone()),
                amount: 60000,
                payment_method: "Cash".into(),
                payment_date: "2026-10-16".into(),
                reference: Some("RCP-202".into()),
                notes: Some("Part payment".into()),
            },
        )
        .unwrap();
        assert_eq!(sp.amount, 60000);

        // Check supplier remaining due is 40,000
        let suppliers = list_suppliers(&conn, "", false).unwrap();
        assert_eq!(suppliers[0].total_purchased, 185000);
        assert_eq!(suppliers[0].total_paid, 145000);
        assert_eq!(suppliers[0].total_due, 40000);

        // Expense list now has 2 supplement expenses
        let expenses = expense_repository::list(&conn, "", Some("Supplements"), None, None).unwrap();
        assert_eq!(expenses.len(), 2);

        // 5. Sell 3 tubs via POS @ 22,000 with 1,000 discount = 65,000
        let sale = create_sale(
            &conn,
            CreateSaleRequest {
                member_id: None,
                customer_name: Some("Ali Khan".into()),
                item_id: item.id.clone(),
                quantity: 3,
                unit_price: 22000,
                discount: Some(1000),
                payment_method: "Cash".into(),
                sale_date: "2026-10-17".into(),
                notes: None,
            },
        )
        .unwrap();
        assert_eq!(sale.total_amount, 65000);
        assert_eq!(sale.profit, 65000 - (3 * 18500));

        // Verify stock decreased from 12 to 9
        let items = list_items(&conn, "", None, true).unwrap();
        assert_eq!(items[0].stock_quantity, 9);

        // Summary check
        let summary = get_summary(&conn).unwrap();
        assert_eq!(summary.total_items, 1);
        assert_eq!(summary.total_stock_units, 9);
        assert_eq!(summary.total_supplier_dues, 40000);
        assert_eq!(summary.total_sales_revenue, 65000);
    }
}
