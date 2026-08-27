use tauri::State;

use crate::database::Database;
use crate::dto::member::{CreateMemberRequest, MemberResponse, UpdateMemberRequest};
use crate::errors::AppError;
use crate::services::member_service;

#[tauri::command]
pub fn create_member(
    state: State<'_, Database>,
    request: CreateMemberRequest,
) -> Result<MemberResponse, AppError> {
    member_service::create_member(&state.conn(), request)
}

#[tauri::command]
pub fn get_member(state: State<'_, Database>, id: String) -> Result<MemberResponse, AppError> {
    member_service::get_member(&state.conn(), &id)
}

#[tauri::command]
pub fn list_members(
    state: State<'_, Database>,
    search: Option<String>,
    status: Option<String>,
    include_archived: Option<bool>,
) -> Result<Vec<MemberResponse>, AppError> {
    member_service::list_members(
        &state.conn(),
        search.as_deref().unwrap_or(""),
        status.as_deref(),
        include_archived.unwrap_or(false),
    )
}

#[tauri::command]
pub fn update_member(
    state: State<'_, Database>,
    id: String,
    request: UpdateMemberRequest,
) -> Result<MemberResponse, AppError> {
    member_service::update_member(&state.conn(), &id, request)
}

#[tauri::command]
pub fn archive_member(
    state: State<'_, Database>,
    id: String,
) -> Result<MemberResponse, AppError> {
    member_service::archive_member(&state.conn(), &id)
}

#[tauri::command]
pub fn unarchive_member(
    state: State<'_, Database>,
    id: String,
) -> Result<MemberResponse, AppError> {
    member_service::unarchive_member(&state.conn(), &id)
}
