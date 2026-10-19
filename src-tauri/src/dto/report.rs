use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(untagged)]
pub enum ReportResponse {
    Financial(FinancialReportResponse),
    Payment(PaymentReportResponse),
    Expense(ExpenseReportResponse),
    Member(MemberReportResponse),
    MembershipStatus(MembershipStatusReportResponse),
    Inventory(InventoryReportResponse),
    Supplier(SupplierReportResponse),
}

#[derive(Debug, Clone, Deserialize)]
pub struct ReportRequest {
    pub report_type: String,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub member_id: Option<String>,
    pub payment_method: Option<String>,
    pub membership_plan_id: Option<String>,
    pub expense_category: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FinancialReportResponse {
    pub total_revenue: i64,
    pub total_expenses: i64,
    pub net_income: i64,
    pub payment_count: i64,
    pub expense_count: i64,
    pub revenue_by_method: Vec<CategoryAmount>,
    pub expenses_by_category: Vec<CategoryAmount>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CategoryAmount {
    pub category: String,
    pub amount: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct PaymentReportResponse {
    pub payments: Vec<PaymentReportRow>,
    pub total_count: i64,
    pub total_amount: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct PaymentReportRow {
    pub receipt_number: String,
    pub member_name: String,
    pub member_number: String,
    pub amount: i64,
    pub payment_method: String,
    pub payment_date: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExpenseReportResponse {
    pub expenses: Vec<ExpenseReportRow>,
    pub total_count: i64,
    pub total_amount: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExpenseReportRow {
    pub date: String,
    pub description: String,
    pub category: String,
    pub amount: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MemberReportResponse {
    pub total_members: i64,
    pub active_members: i64,
    pub expiring_soon: i64,
    pub expired_members: i64,
    pub archived_members: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MembershipStatusReportResponse {
    pub active: Vec<MemberStatusRow>,
    pub expiring_soon: Vec<MemberStatusRow>,
    pub expired: Vec<MemberStatusRow>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MemberStatusRow {
    pub member_number: String,
    pub full_name: String,
    pub phone: Option<String>,
    pub plan_name: Option<String>,
    pub expiry_date: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InventoryReportResponse {
    pub total_items: i64,
    pub total_stock_units: i64,
    pub low_stock_count: i64,
    pub out_of_stock_count: i64,
    pub inventory_cost_value: i64,
    pub inventory_retail_value: i64,
    pub period_sales_revenue: i64,
    pub period_sales_profit: i64,
    pub period_sales_count: i64,
    pub items: Vec<InventoryReportItemRow>,
    pub sales: Vec<InventoryReportSaleRow>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InventoryReportItemRow {
    pub id: String,
    pub name: String,
    pub category: String,
    pub brand: Option<String>,
    pub unit: String,
    pub cost_price: i64,
    pub selling_price: i64,
    pub stock_quantity: i64,
    pub min_stock_level: i64,
    pub stock_status: String,
    pub stock_value_cost: i64,
    pub stock_value_retail: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct InventoryReportSaleRow {
    pub id: String,
    pub invoice_number: String,
    pub customer_name: String,
    pub item_name: String,
    pub item_unit: String,
    pub quantity: i64,
    pub unit_price: i64,
    pub total_amount: i64,
    pub profit: i64,
    pub payment_method: String,
    pub sale_date: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SupplierReportResponse {
    pub total_suppliers: i64,
    pub suppliers_with_dues: i64,
    pub total_purchases_amount: i64,
    pub total_paid_amount: i64,
    pub total_dues_amount: i64,
    pub suppliers: Vec<SupplierReportRow>,
    pub purchases: Vec<SupplierPurchaseReportRow>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SupplierReportRow {
    pub id: String,
    pub name: String,
    pub company: Option<String>,
    pub phone: Option<String>,
    pub total_purchased: i64,
    pub total_paid: i64,
    pub total_due: i64,
    pub purchase_count: i64,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct SupplierPurchaseReportRow {
    pub id: String,
    pub invoice_number: String,
    pub supplier_name: String,
    pub item_name: String,
    pub quantity: i64,
    pub unit_cost: i64,
    pub total_amount: i64,
    pub paid_amount: i64,
    pub due_amount: i64,
    pub payment_status: String,
    pub purchase_date: String,
}

