CREATE TABLE users (
    id                       TEXT PRIMARY KEY NOT NULL,
    username                 TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash            TEXT NOT NULL,
    security_question        TEXT NOT NULL,
    security_answer_hash     TEXT NOT NULL,
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

CREATE UNIQUE INDEX idx_users_single_admin ON users ((1));
