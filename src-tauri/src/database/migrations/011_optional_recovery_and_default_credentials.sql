DROP INDEX IF EXISTS idx_users_single_admin;

CREATE TABLE users_next (
    id                       TEXT PRIMARY KEY NOT NULL,
    username                 TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash            TEXT NOT NULL,
    security_question        TEXT,
    security_answer_hash     TEXT,
    uses_default_credentials INTEGER NOT NULL DEFAULT 0 CHECK (uses_default_credentials IN (0, 1)),
    failed_login_attempts    INTEGER NOT NULL DEFAULT 0,
    last_failed_login_at     TEXT,
    login_locked_until       TEXT,
    failed_recovery_attempts INTEGER NOT NULL DEFAULT 0,
    last_failed_recovery_at  TEXT,
    recovery_locked_until    TEXT,
    created_at               TEXT NOT NULL,
    updated_at               TEXT NOT NULL,
    password_changed_at      TEXT NOT NULL
);

INSERT INTO users_next (
    id, username, password_hash, security_question, security_answer_hash,
    uses_default_credentials, failed_login_attempts, last_failed_login_at,
    login_locked_until, failed_recovery_attempts, last_failed_recovery_at,
    recovery_locked_until, created_at, updated_at, password_changed_at
)
SELECT
    id, username, password_hash, security_question, security_answer_hash,
    0, failed_login_attempts, last_failed_login_at, login_locked_until,
    failed_recovery_attempts, last_failed_recovery_at, recovery_locked_until,
    created_at, updated_at, password_changed_at
FROM users;

DROP TABLE users;
ALTER TABLE users_next RENAME TO users;
CREATE UNIQUE INDEX idx_users_single_admin ON users ((1));
