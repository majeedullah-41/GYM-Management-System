use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplementSupplier {
    pub id: String,
    pub name: String,
    pub company: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplementItem {
    pub id: String,
    pub name: String,
    pub category: String,
    pub brand: Option<String>,
    pub unit: String,
    pub cost_price: i64,
    pub selling_price: i64,
    pub stock_quantity: i64,
    pub min_stock_level: i64,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplementPurchase {
    pub id: String,
    pub invoice_number: String,
    pub supplier_id: String,
    pub item_id: String,
    pub item_name: String,
    pub quantity: i64,
    pub unit_cost: i64,
    pub total_amount: i64,
    pub paid_amount: i64,
    pub purchase_date: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplierPayment {
    pub id: String,
    pub supplier_id: String,
    pub purchase_id: Option<String>,
    pub expense_id: Option<String>,
    pub amount: i64,
    pub payment_method: String,
    pub payment_date: String,
    pub reference: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplementSale {
    pub id: String,
    pub invoice_number: String,
    pub member_id: Option<String>,
    pub customer_name: String,
    pub item_id: String,
    pub item_name: String,
    pub quantity: i64,
    pub unit_price: i64,
    pub cost_price: i64,
    pub discount: i64,
    pub total_amount: i64,
    pub payment_method: String,
    pub sale_date: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryMovement {
    pub id: String,
    pub item_id: String,
    pub movement_type: String,
    pub quantity_change: i64,
    pub previous_stock: i64,
    pub new_stock: i64,
    pub reference_id: Option<String>,
    pub reason: Option<String>,
    pub movement_date: String,
    pub created_at: String,
}

