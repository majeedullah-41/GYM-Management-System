#[derive(Debug, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub password_hash: String,
    pub security_question: Option<String>,
    pub security_answer_hash: Option<String>,
    pub uses_default_credentials: bool,
    pub failed_login_attempts: i64,
    pub login_locked_until: Option<String>,
    pub failed_recovery_attempts: i64,
    pub recovery_locked_until: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub password_changed_at: String,
}
