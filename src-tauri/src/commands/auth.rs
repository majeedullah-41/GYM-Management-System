use tauri::State;

use crate::database::Database;
use crate::dto::auth::*;
use crate::errors::AppError;
use crate::services::auth_service::{self, AuthState};

fn with_db<T>(
    database: &Database,
    action: impl FnOnce(&rusqlite::Connection) -> Result<T, AppError>,
) -> Result<T, AppError> {
    let conn = database.clone_conn();
    let guard = conn
        .lock()
        .map_err(|_| AppError::InternalError("Database is unavailable".into()))?;
    action(&guard)
}

#[tauri::command]
pub fn get_auth_status(
    database: State<'_, Database>,
    auth: State<'_, AuthState>,
) -> Result<AuthStatusResponse, AppError> {
    with_db(database.inner(), |conn| {
        auth_service::status(conn, auth.inner())
    })
}

#[tauri::command]
pub fn login(
    database: State<'_, Database>,
    auth: State<'_, AuthState>,
    request: LoginRequest,
) -> Result<UserResponse, AppError> {
    with_db(database.inner(), |conn| {
        auth_service::login(conn, auth.inner(), request)
    })
}

#[tauri::command]
pub fn logout(auth: State<'_, AuthState>) -> Result<(), AppError> {
    auth.logout()
}

#[tauri::command]
pub fn get_current_user(
    database: State<'_, Database>,
    auth: State<'_, AuthState>,
) -> Result<UserResponse, AppError> {
    with_db(database.inner(), |conn| {
        auth_service::current_user(conn, auth.inner())
    })
}

#[tauri::command]
pub fn get_recovery_question(
    database: State<'_, Database>,
    username: String,
) -> Result<RecoveryQuestionResponse, AppError> {
    with_db(database.inner(), |conn| {
        auth_service::recovery_question(conn, &username)
    })
}

#[tauri::command]
pub fn verify_recovery_answer(
    database: State<'_, Database>,
    auth: State<'_, AuthState>,
    request: RecoveryAnswerRequest,
) -> Result<RecoveryVerifiedResponse, AppError> {
    with_db(database.inner(), |conn| {
        auth_service::verify_recovery(conn, auth.inner(), request)
    })
}

#[tauri::command]
pub fn reset_password(
    database: State<'_, Database>,
    auth: State<'_, AuthState>,
    request: ResetPasswordRequest,
) -> Result<(), AppError> {
    with_db(database.inner(), |conn| {
        auth_service::reset_password(conn, auth.inner(), request)
    })
}

#[tauri::command]
pub fn change_username(
    database: State<'_, Database>,
    auth: State<'_, AuthState>,
    request: ChangeUsernameRequest,
) -> Result<UserResponse, AppError> {
    with_db(database.inner(), |conn| {
        auth_service::change_username(conn, auth.inner(), request)
    })
}

#[tauri::command]
pub fn change_password(
    database: State<'_, Database>,
    auth: State<'_, AuthState>,
    request: ChangePasswordRequest,
) -> Result<(), AppError> {
    with_db(database.inner(), |conn| {
        auth_service::change_password(conn, auth.inner(), request)
    })
}

#[tauri::command]
pub fn change_security_question(
    database: State<'_, Database>,
    auth: State<'_, AuthState>,
    request: ChangeSecurityQuestionRequest,
) -> Result<(), AppError> {
    with_db(database.inner(), |conn| {
        auth_service::change_security_question(conn, auth.inner(), request)
    })
}
