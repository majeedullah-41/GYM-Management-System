use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};

use argon2::{
    password_hash::{PasswordHash, SaltString},
    Argon2, PasswordHasher, PasswordVerifier,
};
use chrono::{DateTime, Duration, Utc};
use rand_core::OsRng;
use rusqlite::Connection;
use uuid::Uuid;

use crate::dto::auth::*;
use crate::errors::AppError;
use crate::models::User;
use crate::repositories::user_repository;

const MAX_ATTEMPTS: i64 = 5;
const COOLDOWN_MINUTES: i64 = 5;
const RECOVERY_GRANT_MINUTES: i64 = 5;
static AUTHENTICATED: AtomicBool = AtomicBool::new(false);

pub fn require_authenticated() -> Result<(), AppError> {
    if AUTHENTICATED.load(Ordering::SeqCst) {
        Ok(())
    } else {
        Err(AppError::ValidationError("Authentication required".into()))
    }
}

#[derive(Debug, Clone)]
struct Session {
    user_id: String,
}

#[derive(Debug, Clone)]
struct RecoveryGrant {
    user_id: String,
    expires_at: DateTime<Utc>,
}

#[derive(Default)]
struct AuthMemory {
    session: Option<Session>,
    recovery: Option<RecoveryGrant>,
}

#[derive(Default)]
pub struct AuthState(Mutex<AuthMemory>);

impl AuthState {
    pub fn require_user_id(&self) -> Result<String, AppError> {
        self.0
            .lock()
            .map_err(|_| internal())?
            .session
            .as_ref()
            .map(|s| s.user_id.clone())
            .ok_or_else(|| AppError::ValidationError("Authentication required".into()))
    }

    fn login(&self, id: String) -> Result<(), AppError> {
        let mut memory = self.0.lock().map_err(|_| internal())?;
        memory.session = Some(Session { user_id: id });
        memory.recovery = None;
        AUTHENTICATED.store(true, Ordering::SeqCst);
        Ok(())
    }

    pub fn logout(&self) -> Result<(), AppError> {
        let mut memory = self.0.lock().map_err(|_| internal())?;
        memory.session = None;
        memory.recovery = None;
        AUTHENTICATED.store(false, Ordering::SeqCst);
        Ok(())
    }
}

fn internal() -> AppError {
    AppError::InternalError("Authentication state is unavailable".into())
}
fn now() -> String {
    Utc::now().to_rfc3339()
}
fn normalize_username(value: &str) -> String {
    value.trim().to_lowercase()
}
fn normalize_answer(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}
fn hash_secret(value: &str) -> Result<String, AppError> {
    Argon2::default()
        .hash_password(value.as_bytes(), &SaltString::generate(&mut OsRng))
        .map(|hash| hash.to_string())
        .map_err(|_| internal())
}
fn verify_secret(hash: &str, value: &str) -> bool {
    PasswordHash::new(hash).ok().is_some_and(|parsed| {
        Argon2::default()
            .verify_password(value.as_bytes(), &parsed)
            .is_ok()
    })
}
fn validate_username(value: &str) -> Result<String, AppError> {
    let username = normalize_username(value);
    if !(3..=50).contains(&username.chars().count()) {
        return Err(AppError::ValidationError(
            "Username must be 3 to 50 characters".into(),
        ));
    }
    Ok(username)
}
fn validate_password(password: &str, confirm: &str) -> Result<(), AppError> {
    if password.len() < 8 {
        return Err(AppError::ValidationError(
            "Password must be at least 8 characters".into(),
        ));
    }
    if password != confirm {
        return Err(AppError::ValidationError("Passwords do not match".into()));
    }
    Ok(())
}
fn validate_question(question: &str, answer: &str) -> Result<(String, String), AppError> {
    let question = question.trim().to_string();
    let answer = normalize_answer(answer);
    if question.is_empty() || answer.is_empty() {
        return Err(AppError::ValidationError(
            "Security question and answer are required".into(),
        ));
    }
    Ok((question, answer))
}
fn is_locked(until: &Option<String>) -> bool {
    until
        .as_deref()
        .and_then(|v| DateTime::parse_from_rfc3339(v).ok())
        .is_some_and(|v| v.with_timezone(&Utc) > Utc::now())
}
fn safe(user: User) -> UserResponse {
    UserResponse {
        id: user.id,
        username: user.username,
        security_question: user.security_question,
        uses_default_credentials: user.uses_default_credentials,
        created_at: user.created_at,
        password_changed_at: user.password_changed_at,
    }
}

pub fn status(conn: &Connection, auth: &AuthState) -> Result<AuthStatusResponse, AppError> {
    let user = auth
        .require_user_id()
        .ok()
        .and_then(|id| user_repository::find_by_id(conn, &id).ok().flatten())
        .map(safe);
    if user.is_none() {
        auth.logout()?;
    }
    Ok(AuthStatusResponse {
        authenticated: user.is_some(),
        user,
    })
}

pub fn ensure_default_admin(conn: &Connection) -> Result<(), AppError> {
    if user_repository::count(conn)? > 0 {
        return Ok(());
    }
    let timestamp = now();
    let user = User {
        id: Uuid::new_v4().to_string(),
        username: "admin".into(),
        password_hash: hash_secret("admin")?,
        security_question: None,
        security_answer_hash: None,
        uses_default_credentials: true,
        failed_login_attempts: 0,
        login_locked_until: None,
        failed_recovery_attempts: 0,
        recovery_locked_until: None,
        created_at: timestamp.clone(),
        updated_at: timestamp.clone(),
        password_changed_at: timestamp,
    };
    user_repository::create(conn, &user)?;
    Ok(())
}

pub fn login(
    conn: &Connection,
    auth: &AuthState,
    request: LoginRequest,
) -> Result<UserResponse, AppError> {
    let username = normalize_username(&request.username);
    let mut user = user_repository::get_only(conn)?
        .ok_or_else(|| AppError::ValidationError("Invalid username or password".into()))?;
    if is_locked(&user.login_locked_until) {
        return Err(AppError::ValidationError(
            "Too many attempts. Try again in a few minutes".into(),
        ));
    }
    if user.username != username || !verify_secret(&user.password_hash, &request.password) {
        let attempts = user.failed_login_attempts + 1;
        let locked = (attempts >= MAX_ATTEMPTS)
            .then(|| (Utc::now() + Duration::minutes(COOLDOWN_MINUTES)).to_rfc3339());
        user_repository::record_login_failure(
            conn,
            &user.id,
            if locked.is_some() { 0 } else { attempts },
            locked.as_deref(),
            &now(),
        )?;
        return Err(AppError::ValidationError(
            "Invalid username or password".into(),
        ));
    }
    user_repository::clear_login_failures(conn, &user.id, &now())?;
    user.failed_login_attempts = 0;
    auth.login(user.id.clone())?;
    Ok(safe(user))
}

pub fn recovery_question(
    conn: &Connection,
    username: &str,
) -> Result<RecoveryQuestionResponse, AppError> {
    let user = user_repository::find_by_username(conn, &normalize_username(username))?
        .ok_or_else(|| AppError::ValidationError("Account could not be verified".into()))?;
    Ok(RecoveryQuestionResponse {
        recovery_available: user.security_question.is_some() && user.security_answer_hash.is_some(),
        security_question: user.security_question,
    })
}

pub fn verify_recovery(
    conn: &Connection,
    auth: &AuthState,
    request: RecoveryAnswerRequest,
) -> Result<RecoveryVerifiedResponse, AppError> {
    let user = user_repository::get_only(conn)?
        .ok_or_else(|| AppError::ValidationError("Account could not be verified".into()))?;
    if is_locked(&user.recovery_locked_until) {
        return Err(AppError::ValidationError(
            "Too many attempts. Try again in a few minutes".into(),
        ));
    }
    let answer_hash = user.security_answer_hash.as_deref().ok_or_else(|| {
        AppError::ValidationError("Password recovery is not configured for this account".into())
    })?;
    if user.username != normalize_username(&request.username)
        || !verify_secret(answer_hash, &normalize_answer(&request.answer))
    {
        let attempts = user.failed_recovery_attempts + 1;
        let locked = (attempts >= MAX_ATTEMPTS)
            .then(|| (Utc::now() + Duration::minutes(COOLDOWN_MINUTES)).to_rfc3339());
        user_repository::record_recovery_failure(
            conn,
            &user.id,
            if locked.is_some() { 0 } else { attempts },
            locked.as_deref(),
            &now(),
        )?;
        return Err(AppError::ValidationError(
            "Account could not be verified".into(),
        ));
    }
    user_repository::clear_recovery_failures(conn, &user.id, &now())?;
    auth.0.lock().map_err(|_| internal())?.recovery = Some(RecoveryGrant {
        user_id: user.id,
        expires_at: Utc::now() + Duration::minutes(RECOVERY_GRANT_MINUTES),
    });
    Ok(RecoveryVerifiedResponse { verified: true })
}

pub fn reset_password(
    conn: &Connection,
    auth: &AuthState,
    request: ResetPasswordRequest,
) -> Result<(), AppError> {
    validate_password(&request.new_password, &request.confirm_password)?;
    let id = {
        let memory = auth.0.lock().map_err(|_| internal())?;
        memory
            .recovery
            .as_ref()
            .filter(|g| g.expires_at > Utc::now())
            .map(|g| g.user_id.clone())
            .ok_or_else(|| AppError::ValidationError("Recovery authorization has expired".into()))?
    };
    user_repository::update_password(conn, &id, &hash_secret(&request.new_password)?, &now())?;
    auth.logout()
}

fn authenticated_user(conn: &Connection, auth: &AuthState) -> Result<User, AppError> {
    let id = auth.require_user_id()?;
    user_repository::find_by_id(conn, &id)?
        .ok_or_else(|| AppError::ValidationError("Authentication required".into()))
}

pub fn current_user(conn: &Connection, auth: &AuthState) -> Result<UserResponse, AppError> {
    Ok(safe(authenticated_user(conn, auth)?))
}

pub fn change_username(
    conn: &Connection,
    auth: &AuthState,
    request: ChangeUsernameRequest,
) -> Result<UserResponse, AppError> {
    let mut user = authenticated_user(conn, auth)?;
    if !verify_secret(&user.password_hash, &request.current_password) {
        return Err(AppError::ValidationError(
            "Current password is incorrect".into(),
        ));
    }
    let username = validate_username(&request.username)?;
    user_repository::update_username(conn, &user.id, &username, &now())?;
    user.username = username;
    user.uses_default_credentials = false;
    Ok(safe(user))
}

pub fn change_password(
    conn: &Connection,
    auth: &AuthState,
    request: ChangePasswordRequest,
) -> Result<(), AppError> {
    let user = authenticated_user(conn, auth)?;
    if !verify_secret(&user.password_hash, &request.current_password) {
        return Err(AppError::ValidationError(
            "Current password is incorrect".into(),
        ));
    }
    validate_password(&request.new_password, &request.confirm_password)?;
    user_repository::update_password(conn, &user.id, &hash_secret(&request.new_password)?, &now())?;
    auth.logout()
}

pub fn change_security_question(
    conn: &Connection,
    auth: &AuthState,
    request: ChangeSecurityQuestionRequest,
) -> Result<(), AppError> {
    let user = authenticated_user(conn, auth)?;
    if !verify_secret(&user.password_hash, &request.current_password) {
        return Err(AppError::ValidationError(
            "Current password is incorrect".into(),
        ));
    }
    let (question, answer) =
        validate_question(&request.security_question, &request.security_answer)?;
    user_repository::update_security_question(
        conn,
        &user.id,
        &question,
        &hash_secret(&answer)?,
        &now(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrations;

    fn database() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        migrations::run_migrations(&mut conn).unwrap();
        ensure_default_admin(&conn).unwrap();
        conn
    }

    #[test]
    fn fresh_database_has_hashed_default_admin_without_recovery() {
        let conn = database();
        let stored = user_repository::find_by_username(&conn, "ADMIN")
            .unwrap()
            .unwrap();
        assert_eq!(stored.username, "admin");
        assert_ne!(stored.password_hash, "admin");
        assert!(verify_secret(&stored.password_hash, "admin"));
        assert!(stored.security_question.is_none());
        assert!(stored.security_answer_hash.is_none());
        assert!(stored.uses_default_credentials);
    }

    #[test]
    fn secret_hashes_use_unique_salts() {
        let first = hash_secret("same-password").unwrap();
        let second = hash_secret("same-password").unwrap();
        assert_ne!(first, second);
        assert!(verify_secret(&first, "same-password"));
        assert!(verify_secret(&second, "same-password"));
    }

    #[test]
    fn login_is_case_insensitive_and_rejects_bad_password() {
        let conn = database();
        let auth = AuthState::default();
        let bad = login(
            &conn,
            &auth,
            LoginRequest {
                username: "admin".into(),
                password: "wrong-password".into(),
            },
        );
        assert!(bad
            .unwrap_err()
            .to_string()
            .contains("Invalid username or password"));
        let user = login(
            &conn,
            &auth,
            LoginRequest {
                username: "ADMIN".into(),
                password: "admin".into(),
            },
        )
        .unwrap();
        assert_eq!(user.username, "admin");
    }

    #[test]
    fn recovery_is_unavailable_until_question_is_configured() {
        let conn = database();
        let response = recovery_question(&conn, "admin").unwrap();
        assert!(!response.recovery_available);
        assert!(response.security_question.is_none());

        let auth = AuthState::default();
        let result = verify_recovery(
            &conn,
            &auth,
            RecoveryAnswerRequest {
                username: "admin".into(),
                answer: "anything".into(),
            },
        );
        assert!(result.unwrap_err().to_string().contains("not configured"));
    }

    #[test]
    fn username_and_password_changes_replace_default_credentials() {
        let conn = database();
        let auth = AuthState::default();
        login(
            &conn,
            &auth,
            LoginRequest {
                username: "admin".into(),
                password: "admin".into(),
            },
        )
        .unwrap();
        change_password(
            &conn,
            &auth,
            ChangePasswordRequest {
                current_password: "admin".into(),
                new_password: "NewPassword123".into(),
                confirm_password: "NewPassword123".into(),
            },
        )
        .unwrap();
        assert!(login(
            &conn,
            &auth,
            LoginRequest {
                username: "admin".into(),
                password: "admin".into(),
            },
        )
        .is_err());
        assert!(login(
            &conn,
            &auth,
            LoginRequest {
                username: "admin".into(),
                password: "NewPassword123".into(),
            },
        )
        .is_ok());

        let changed = change_username(
            &conn,
            &auth,
            ChangeUsernameRequest {
                username: "majeed".into(),
                current_password: "NewPassword123".into(),
            },
        )
        .unwrap();
        assert_eq!(changed.username, "majeed");
        assert!(!changed.uses_default_credentials);
        auth.logout().unwrap();

        assert!(login(
            &conn,
            &auth,
            LoginRequest {
                username: "admin".into(),
                password: "NewPassword123".into(),
            },
        )
        .is_err());
        assert!(login(
            &conn,
            &auth,
            LoginRequest {
                username: "majeed".into(),
                password: "NewPassword123".into(),
            },
        )
        .is_ok());
    }

    #[test]
    fn normalized_recovery_answer_can_reset_password() {
        let conn = database();
        let auth = AuthState::default();
        login(
            &conn,
            &auth,
            LoginRequest {
                username: "admin".into(),
                password: "admin".into(),
            },
        )
        .unwrap();
        change_security_question(
            &conn,
            &auth,
            ChangeSecurityQuestionRequest {
                current_password: "admin".into(),
                security_question: "First school?".into(),
                security_answer: "  My   School ".into(),
            },
        )
        .unwrap();
        auth.logout().unwrap();
        verify_recovery(
            &conn,
            &auth,
            RecoveryAnswerRequest {
                username: "admin".into(),
                answer: " MY school ".into(),
            },
        )
        .unwrap();
        reset_password(
            &conn,
            &auth,
            ResetPasswordRequest {
                new_password: "replacement-pass".into(),
                confirm_password: "replacement-pass".into(),
            },
        )
        .unwrap();
        assert!(login(
            &conn,
            &auth,
            LoginRequest {
                username: "admin".into(),
                password: "replacement-pass".into()
            }
        )
        .is_ok());
    }
}
