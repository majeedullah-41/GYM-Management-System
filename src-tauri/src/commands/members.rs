use tauri::State;

use crate::database::Database;
use crate::dto::member::{CreateMemberRequest, MemberResponse, UpdateMemberRequest};
use crate::errors::AppError;
use crate::services::member_service;

use super::db::run_db;

#[tauri::command]
pub async fn create_member(
    state: State<'_, Database>,
    request: CreateMemberRequest,
) -> Result<MemberResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| member_service::create_member(c, request)).await
}

#[tauri::command]
pub async fn get_member(
    state: State<'_, Database>,
    id: String,
) -> Result<MemberResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| member_service::get_member(c, &id)).await
}

#[tauri::command]
pub async fn list_members(
    state: State<'_, Database>,
    search: Option<String>,
    status: Option<String>,
    include_archived: Option<bool>,
) -> Result<Vec<MemberResponse>, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        member_service::list_members(
            c,
            search.as_deref().unwrap_or(""),
            status.as_deref(),
            include_archived.unwrap_or(false),
        )
    })
    .await
}

#[tauri::command]
pub async fn update_member(
    state: State<'_, Database>,
    id: String,
    request: UpdateMemberRequest,
) -> Result<MemberResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| {
        member_service::update_member(c, &id, request)
    })
    .await
}

#[tauri::command]
pub async fn archive_member(
    state: State<'_, Database>,
    id: String,
) -> Result<MemberResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| member_service::archive_member(c, &id)).await
}

#[tauri::command]
pub async fn unarchive_member(
    state: State<'_, Database>,
    id: String,
) -> Result<MemberResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| member_service::unarchive_member(c, &id)).await
}
