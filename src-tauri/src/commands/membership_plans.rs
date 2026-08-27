use tauri::State;

use crate::database::Database;
use crate::dto::membership_plan::{CreatePlanRequest, PlanResponse, UpdatePlanRequest};
use crate::errors::AppError;
use crate::services::membership_plan_service;

#[tauri::command]
pub fn create_plan(
    state: State<'_, Database>,
    request: CreatePlanRequest,
) -> Result<PlanResponse, AppError> {
    membership_plan_service::create_plan(&state.conn(), request)
}

#[tauri::command]
pub fn get_plan(state: State<'_, Database>, id: String) -> Result<PlanResponse, AppError> {
    membership_plan_service::get_plan(&state.conn(), &id)
}

#[tauri::command]
pub fn list_plans(state: State<'_, Database>) -> Result<Vec<PlanResponse>, AppError> {
    membership_plan_service::list_plans(&state.conn())
}

#[tauri::command]
pub fn list_active_plans(state: State<'_, Database>) -> Result<Vec<PlanResponse>, AppError> {
    membership_plan_service::list_active_plans(&state.conn())
}

#[tauri::command]
pub fn update_plan(
    state: State<'_, Database>,
    id: String,
    request: UpdatePlanRequest,
) -> Result<PlanResponse, AppError> {
    membership_plan_service::update_plan(&state.conn(), &id, request)
}

#[tauri::command]
pub fn deactivate_plan(
    state: State<'_, Database>,
    id: String,
) -> Result<PlanResponse, AppError> {
    membership_plan_service::deactivate_plan(&state.conn(), &id)
}

#[tauri::command]
pub fn reactivate_plan(
    state: State<'_, Database>,
    id: String,
) -> Result<PlanResponse, AppError> {
    membership_plan_service::reactivate_plan(&state.conn(), &id)
}
