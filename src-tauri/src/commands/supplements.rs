use tauri::State;

use crate::database::Database;
use crate::dto::supplement::{
    AdjustStockRequest, CreateItemRequest, CreatePurchaseRequest, CreateSaleRequest,
    CreateSupplierPaymentRequest, CreateSupplierRequest, InventoryMovementResponse, ItemResponse,
    PurchaseResponse, SaleResponse, SupplementSummaryResponse, SupplierPaymentResponse,
    SupplierResponse, UpdateItemRequest, UpdateSupplierRequest,
};
use crate::errors::AppError;
use crate::services::supplement_service;

use super::db::run_db;

// ============================================================================
// SUPPLIERS
// ============================================================================

#[tauri::command]
pub async fn create_supplier(
    state: State<'_, Database>,
    request: CreateSupplierRequest,
) -> Result<SupplierResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| supplement_service::create_supplier(c, request)).await
}

#[tauri::command]
pub async fn update_supplier(
    state: State<'_, Database>,
    id: String,
    request: UpdateSupplierRequest,
) -> Result<SupplierResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        supplement_service::update_supplier(c, &id, request)
    })
    .await
}

#[tauri::command]
pub async fn delete_supplier(state: State<'_, Database>, id: String) -> Result<(), AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| supplement_service::delete_supplier(c, &id)).await
}

#[tauri::command]
pub async fn list_suppliers(
    state: State<'_, Database>,
    search: Option<String>,
    active_only: Option<bool>,
) -> Result<Vec<SupplierResponse>, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        supplement_service::list_suppliers(
            c,
            search.as_deref().unwrap_or(""),
            active_only.unwrap_or(false),
        )
    })
    .await
}

// ============================================================================
// INVENTORY ITEMS
// ============================================================================

#[tauri::command]
pub async fn create_supplement_item(
    state: State<'_, Database>,
    request: CreateItemRequest,
) -> Result<ItemResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| supplement_service::create_item(c, request)).await
}

#[tauri::command]
pub async fn update_supplement_item(
    state: State<'_, Database>,
    id: String,
    request: UpdateItemRequest,
) -> Result<ItemResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| supplement_service::update_item(c, &id, request)).await
}

#[tauri::command]
pub async fn adjust_supplement_stock(
    state: State<'_, Database>,
    request: AdjustStockRequest,
) -> Result<ItemResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| supplement_service::adjust_stock(c, request)).await
}

#[tauri::command]
pub async fn delete_supplement_item(
    state: State<'_, Database>,
    id: String,
) -> Result<(), AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| supplement_service::delete_item(c, &id)).await
}

#[tauri::command]
pub async fn list_supplement_items(
    state: State<'_, Database>,
    search: Option<String>,
    category: Option<String>,
    active_only: Option<bool>,
) -> Result<Vec<ItemResponse>, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        supplement_service::list_items(
            c,
            search.as_deref().unwrap_or(""),
            category.as_deref(),
            active_only.unwrap_or(false),
        )
    })
    .await
}

#[tauri::command]
pub async fn list_inventory_movements(
    state: State<'_, Database>,
    item_id: Option<String>,
    movement_type: Option<String>,
) -> Result<Vec<InventoryMovementResponse>, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        supplement_service::list_movements(c, item_id.as_deref(), movement_type.as_deref())
    })
    .await
}

// ============================================================================
// PURCHASES & SUPPLIER PAYMENTS
// ============================================================================

#[tauri::command]
pub async fn create_supplement_purchase(
    state: State<'_, Database>,
    request: CreatePurchaseRequest,
) -> Result<PurchaseResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| supplement_service::create_purchase(c, request)).await
}

#[tauri::command]
pub async fn delete_supplement_purchase(
    state: State<'_, Database>,
    id: String,
) -> Result<(), AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| supplement_service::delete_purchase(c, &id)).await
}

#[tauri::command]
pub async fn list_supplement_purchases(
    state: State<'_, Database>,
    supplier_id: Option<String>,
    item_id: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<Vec<PurchaseResponse>, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        supplement_service::list_purchases(
            c,
            supplier_id.as_deref(),
            item_id.as_deref(),
            date_from.as_deref(),
            date_to.as_deref(),
        )
    })
    .await
}

#[tauri::command]
pub async fn create_supplier_payment(
    state: State<'_, Database>,
    request: CreateSupplierPaymentRequest,
) -> Result<SupplierPaymentResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        supplement_service::create_supplier_payment(c, request)
    })
    .await
}

#[tauri::command]
pub async fn delete_supplier_payment(
    state: State<'_, Database>,
    id: String,
) -> Result<(), AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| supplement_service::delete_supplier_payment(c, &id)).await
}

#[tauri::command]
pub async fn list_supplier_payments(
    state: State<'_, Database>,
    supplier_id: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<Vec<SupplierPaymentResponse>, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        supplement_service::list_supplier_payments(
            c,
            supplier_id.as_deref(),
            date_from.as_deref(),
            date_to.as_deref(),
        )
    })
    .await
}

// ============================================================================
// POS SALES & SUMMARY
// ============================================================================

#[tauri::command]
pub async fn create_supplement_sale(
    state: State<'_, Database>,
    request: CreateSaleRequest,
) -> Result<SaleResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| supplement_service::create_sale(c, request)).await
}

#[tauri::command]
pub async fn delete_supplement_sale(
    state: State<'_, Database>,
    id: String,
) -> Result<(), AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| supplement_service::delete_sale(c, &id)).await
}

#[tauri::command]
pub async fn list_supplement_sales(
    state: State<'_, Database>,
    search: Option<String>,
    item_id: Option<String>,
    member_id: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<Vec<SaleResponse>, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        supplement_service::list_sales(
            c,
            search.as_deref().unwrap_or(""),
            item_id.as_deref(),
            member_id.as_deref(),
            date_from.as_deref(),
            date_to.as_deref(),
        )
    })
    .await
}

#[tauri::command]
pub async fn get_supplement_summary(
    state: State<'_, Database>,
) -> Result<SupplementSummaryResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, supplement_service::get_summary).await
}

