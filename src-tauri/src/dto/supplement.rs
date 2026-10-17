use serde::{Deserialize, Serialize};

use crate::models::{InventoryMovement, SupplementItem, SupplementSupplier};

#[allow(dead_code)]
pub const SUPPLEMENT_CATEGORIES: &[&str] = &[
    "Whey Protein",
    "Mass Gainer",
    "Pre-Workout",
    "Creatine",
    "BCAA / Amino",
    "Vitamins & Health",
    "Fat Burner",
    "Energy Drinks & Bars",
    "Accessories",
    "Other",
];

#[allow(dead_code)]
pub const SUPPLEMENT_UNITS: &[&str] = &[
    "Tub / Jar",
    "Bottle",
    "Box",
    "Pack",
    "Pouch / Bag",
    "Piece",
    "Serving / Scoop",
];

#[derive(Debug, Deserialize)]
pub struct CreateSupplierRequest {
    pub name: String,
    pub company: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSupplierRequest {
    pub name: String,
    pub company: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SupplierResponse {
    pub id: String,
    pub name: String,
    pub company: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub total_purchased: i64,
    pub total_paid: i64,
    pub total_due: i64,
    pub purchase_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

impl SupplierResponse {
    pub fn from_supplier(
        s: SupplementSupplier,
        total_purchased: i64,
        total_paid: i64,
        purchase_count: i64,
    ) -> Self {
        let total_due = (total_purchased - total_paid).max(0);
        Self {
            id: s.id,
            name: s.name,
            company: s.company,
            phone: s.phone,
            email: s.email,
            address: s.address,
            notes: s.notes,
            is_active: s.is_active,
            total_purchased,
            total_paid,
            total_due,
            purchase_count,
            created_at: s.created_at,
            updated_at: s.updated_at,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateItemRequest {
    pub name: String,
    pub category: String,
    pub brand: Option<String>,
    pub unit: Option<String>,
    pub cost_price: i64,
    pub selling_price: i64,
    pub initial_stock: Option<i64>,
    pub min_stock_level: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateItemRequest {
    pub name: String,
    pub category: String,
    pub brand: Option<String>,
    pub unit: Option<String>,
    pub cost_price: i64,
    pub selling_price: i64,
    pub min_stock_level: i64,
    pub notes: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct AdjustStockRequest {
    pub item_id: String,
    /// "add", "subtract", or "set"
    pub adjustment_type: String,
    pub quantity: i64,
    pub reason: Option<String>,
    pub movement_date: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ItemResponse {
    pub id: String,
    pub name: String,
    pub category: String,
    pub brand: Option<String>,
    pub unit: String,
    pub cost_price: i64,
    pub selling_price: i64,
    pub stock_quantity: i64,
    pub min_stock_level: i64,
    /// "in_stock", "low_stock", or "out_of_stock"
    pub stock_status: String,
    pub stock_value_cost: i64,
    pub stock_value_retail: i64,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl ItemResponse {
    pub fn from_item(item: SupplementItem) -> Self {
        let stock_status = if item.stock_quantity <= 0 {
            "out_of_stock".to_string()
        } else if item.stock_quantity <= item.min_stock_level {
            "low_stock".to_string()
        } else {
            "in_stock".to_string()
        };
        let qty = item.stock_quantity.max(0);
        let stock_value_cost = qty * item.cost_price;
        let stock_value_retail = qty * item.selling_price;

        Self {
            id: item.id,
            name: item.name,
            category: item.category,
            brand: item.brand,
            unit: item.unit,
            cost_price: item.cost_price,
            selling_price: item.selling_price,
            stock_quantity: item.stock_quantity,
            min_stock_level: item.min_stock_level,
            stock_status,
            stock_value_cost,
            stock_value_retail,
            notes: item.notes,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreatePurchaseRequest {
    pub supplier_id: String,
    pub item_id: String,
    pub quantity: i64,
    pub unit_cost: i64,
    pub paid_amount: Option<i64>,
    pub payment_method: Option<String>,
    pub purchase_date: String,
    pub invoice_number: Option<String>,
    pub update_item_cost: Option<bool>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PurchaseResponse {
    pub id: String,
    pub invoice_number: String,
    pub supplier_id: String,
    pub supplier_name: String,
    pub item_id: String,
    pub item_name: String,
    pub item_unit: String,
    pub quantity: i64,
    pub unit_cost: i64,
    pub total_amount: i64,
    pub paid_amount: i64,
    pub due_amount: i64,
    /// "paid", "partial", or "unpaid"
    pub payment_status: String,
    pub purchase_date: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateSupplierPaymentRequest {
    pub supplier_id: String,
    pub purchase_id: Option<String>,
    pub amount: i64,
    pub payment_method: String,
    pub payment_date: String,
    pub reference: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SupplierPaymentResponse {
    pub id: String,
    pub supplier_id: String,
    pub supplier_name: String,
    pub purchase_id: Option<String>,
    pub purchase_invoice: Option<String>,
    pub expense_id: Option<String>,
    pub amount: i64,
    pub payment_method: String,
    pub payment_date: String,
    pub reference: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateSaleRequest {
    pub member_id: Option<String>,
    pub customer_name: Option<String>,
    pub item_id: String,
    pub quantity: i64,
    pub unit_price: i64,
    pub discount: Option<i64>,
    pub payment_method: String,
    pub sale_date: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SaleResponse {
    pub id: String,
    pub invoice_number: String,
    pub member_id: Option<String>,
    pub member_number: Option<String>,
    pub customer_name: String,
    pub item_id: String,
    pub item_name: String,
    pub item_unit: String,
    pub quantity: i64,
    pub unit_price: i64,
    pub cost_price: i64,
    pub discount: i64,
    pub total_amount: i64,
    pub profit: i64,
    pub payment_method: String,
    pub sale_date: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct InventoryMovementResponse {
    pub id: String,
    pub item_id: String,
    pub item_name: String,
    pub item_unit: String,
    pub movement_type: String,
    pub quantity_change: i64,
    pub previous_stock: i64,
    pub new_stock: i64,
    pub reference_id: Option<String>,
    pub reason: Option<String>,
    pub movement_date: String,
    pub created_at: String,
}

impl InventoryMovementResponse {
    pub fn from_movement(m: InventoryMovement, item_name: String, item_unit: String) -> Self {
        Self {
            id: m.id,
            item_id: m.item_id,
            item_name,
            item_unit,
            movement_type: m.movement_type,
            quantity_change: m.quantity_change,
            previous_stock: m.previous_stock,
            new_stock: m.new_stock,
            reference_id: m.reference_id,
            reason: m.reason,
            movement_date: m.movement_date,
            created_at: m.created_at,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct SupplementSummaryResponse {
    pub total_items: i64,
    pub total_stock_units: i64,
    pub low_stock_count: i64,
    pub out_of_stock_count: i64,
    pub inventory_cost_value: i64,
    pub inventory_retail_value: i64,
    pub total_suppliers: i64,
    pub suppliers_with_dues: i64,
    pub total_purchased_amount: i64,
    pub total_paid_to_suppliers: i64,
    pub total_supplier_dues: i64,
    pub total_sales_revenue: i64,
    pub total_sales_profit: i64,
    pub total_sales_count: i64,
}

