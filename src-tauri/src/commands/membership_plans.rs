use tauri::State;

use crate::database::Database;
use crate::dto::membership_plan::{CreatePlanRequest, PlanResponse, UpdatePlanRequest};
use crate::errors::AppError;
use crate::services::membership_plan_service;

use super::db::run_db;

#[tauri::command]
pub async fn create_plan(
    state: State<'_, Database>,
    request: CreatePlanRequest,
) -> Result<PlanResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        membership_plan_service::create_plan(c, request)
    })
    .await
}

#[tauri::command]
pub async fn get_plan(state: State<'_, Database>, id: String) -> Result<PlanResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| membership_plan_service::get_plan(c, &id)).await
}

#[tauri::command]
pub async fn list_plans(state: State<'_, Database>) -> Result<Vec<PlanResponse>, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, |c| membership_plan_service::list_plans(c)).await
}

#[tauri::command]
pub async fn list_active_plans(state: State<'_, Database>) -> Result<Vec<PlanResponse>, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, |c| membership_plan_service::list_active_plans(c)).await
}

#[tauri::command]
pub async fn update_plan(
    state: State<'_, Database>,
    id: String,
    request: UpdatePlanRequest,
) -> Result<PlanResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        membership_plan_service::update_plan(c, &id, request)
    })
    .await
}

#[tauri::command]
pub async fn deactivate_plan(
    state: State<'_, Database>,
    id: String,
) -> Result<PlanResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        membership_plan_service::deactivate_plan(c, &id)
    })
    .await
}

#[tauri::command]
pub async fn reactivate_plan(
    state: State<'_, Database>,
    id: String,
) -> Result<PlanResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        membership_plan_service::reactivate_plan(c, &id)
    })
    .await
}
