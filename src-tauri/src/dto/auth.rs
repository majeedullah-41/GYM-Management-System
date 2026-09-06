use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RecoveryAnswerRequest {
    pub username: String,
    pub answer: String,
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordRequest {
    pub new_password: String,
    pub confirm_password: String,
}

#[derive(Debug, Deserialize)]
pub struct ChangeUsernameRequest {
    pub username: String,
    pub current_password: String,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
    pub confirm_password: String,
}

#[derive(Debug, Deserialize)]
pub struct ChangeSecurityQuestionRequest {
    pub current_password: String,
    pub security_question: String,
    pub security_answer: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub security_question: Option<String>,
    pub uses_default_credentials: bool,
    pub created_at: String,
    pub password_changed_at: String,
}

#[derive(Debug, Serialize)]
pub struct AuthStatusResponse {
    pub authenticated: bool,
    pub user: Option<UserResponse>,
}

#[derive(Debug, Serialize)]
pub struct RecoveryQuestionResponse {
    pub recovery_available: bool,
    pub security_question: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RecoveryVerifiedResponse {
    pub verified: bool,
}
