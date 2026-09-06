# Authentication

**Module:** Authentication  
**Settings section:** `Settings → User Information`  
**Mode:** Single offline administrator

## 1. Authoritative flow

The application ships with one default administrator account. It must not show an account-creation form on first launch.

```text
Application starts
      ↓
License check
      ↓
License valid
      ↓
Login
      ↓
admin / admin
      ↓
Dashboard
```

Authentication and licensing are separate systems. If licensing is added, a valid license is checked before Login. The current repository does not define a licensing module.

## 2. Default administrator

On database initialization, if no user exists, create:

```text
Username: admin
Password: admin
Security question: NULL
Security answer hash: NULL
Uses default credentials: true
```

`admin` must be passed through Argon2id with a unique salt. Only the encoded hash is stored. The plaintext default password must never be written to SQLite, settings, logs, frontend storage, or source-controlled data files.

The single-user constraint must be enforced by database and service logic.

## 3. Login screen

Login is always the first authentication screen:

```text
┌──────────────────────────────────────────────┐
│                   Gym POS                    │
│                                              │
│                    Login                     │
│                                              │
│ Username                                     │
│ [ admin                                ]     │
│                                              │
│ Password                                     │
│ [ ••••••••••••                         ]     │
│                                              │
│ [ ] Show Password                            │
│                                              │
│                 [ Login ]                    │
│                                              │
│              Forgot Password?                │
└──────────────────────────────────────────────┘
```

It must not contain Confirm Password, Security Question, Security Answer, Create Account, or Create Administrator Account fields.

Default credentials are only intended for initial access. A subtle, non-blocking notice may recommend changing them from `Settings → User Information`, but it must not restrict use of the application.

## 4. Username and password rules

- Normalize usernames by trimming and converting to lowercase.
- Username comparison is case-insensitive.
- Usernames contain 3–50 characters.
- New passwords contain at least 8 characters and must match confirmation.
- The initial password `admin` is an intentional exception used only for the seeded account.
- Password verification and hashing happen only in Rust.
- Passwords use Argon2id with centralized parameters and a unique salt.
- Login errors must not reveal whether the username or password was wrong.

## 5. Sessions and command protection

Rust owns the authenticated session. React may mirror safe session information for rendering but is never the security authority. Authentication must not depend on `localStorage` or `sessionStorage`.

Sessions are memory-only and are invalidated by:

- Logout
- Application restart
- Successful password change
- Successful password recovery

Sensitive Tauri commands—including member, payment, expense, report, receipt, printing, backup, plan, dashboard, and settings commands—must reject unauthenticated calls.

## 6. Login attempt limiting

After five failed login attempts, apply a short temporary cooldown. Track:

```text
failed_login_attempts
last_failed_login_at
login_locked_until
```

A successful login resets the attempt count and lock. Never permanently lock the only local administrator.

## 7. Settings → User Information

All account management belongs in this section:

```text
User Information

Username
admin

Account Type
Administrator

Account Created
...

Last Password Change
...

[ Change Username ]
[ Change Password ]

Account Recovery

Security Question
Not configured

[ Set Security Question ]
```

If recovery is configured, show the question and label the action `Change Security Question`.

A non-blocking warning may appear while `uses_default_credentials` is true:

```text
Default administrator credentials are still in use.
For improved security, change the username or password.
```

## 8. Change username

Workflow:

```text
Current username
New username
Current password
Save
```

Rust verifies the current password, validates and normalizes the new username, and updates the database. A username change sets `uses_default_credentials` to false.

## 9. Change password

Workflow:

```text
Current password
New password
Confirm new password
Update Password
```

Rust verifies the current password, validates confirmation and length, hashes the new password, updates `password_changed_at`, sets `uses_default_credentials` to false, and invalidates the session. The user must log in again.

## 10. Optional security question

Recovery setup is optional and must never block login. Its initial state is valid:

```text
security_question = NULL
security_answer_hash = NULL
```

Setting or changing recovery information requires the current password. Suggested questions:

- What was the name of your first school?
- What was the name of your first teacher?
- What city were you born in?
- What was the name of your childhood best friend?
- What was the name of your first pet?
- Custom Question

Normalize answers by trimming, lowercasing, and collapsing whitespace. Hash the normalized answer using Argon2id with a unique salt. Never store or return the plaintext answer.

## 11. Forgot password

The Login screen always provides `Forgot Password?`.

If either recovery field is `NULL`, show:

```text
Password Recovery

No security question has been configured for this account.
Password recovery is unavailable.

[ Back to Login ]
```

Do not invent another recovery mechanism.

When recovery is configured:

```text
Enter username
      ↓
Load security question
      ↓
Enter normalized answer
      ↓
Rust verifies answer hash
      ↓
Issue short-lived in-memory recovery authorization
      ↓
Enter and confirm new password
      ↓
Hash and save password
      ↓
Invalidate session and recovery authorization
      ↓
Return to Login
```

The old password is never displayed or recoverable. Five failed recovery attempts trigger a temporary recovery cooldown.

## 12. Database model

```text
users
--------------------------------
id
username UNIQUE COLLATE NOCASE
password_hash
security_question NULL
security_answer_hash NULL
uses_default_credentials
failed_login_attempts
last_failed_login_at NULL
login_locked_until NULL
failed_recovery_attempts
last_failed_recovery_at NULL
recovery_locked_until NULL
created_at
updated_at
password_changed_at
```

Authentication data is included in normal database backups. Restoring a backup restores the credentials stored in that backup.

## 13. Architecture

- Tauri commands are thin transport adapters.
- Authentication policy, hashing, normalization, locks, and session handling live in Rust services.
- Parameterized SQL lives only in the repository/database layer.
- Frontend DTOs expose safe fields only.
- Never return password hashes, security-answer hashes, recovery authorization internals, or database diagnostics to React.
- Never log credentials or hashes.

## 14. Required commands

Use project naming conventions for commands equivalent to:

```text
login
logout
get_auth_status
get_current_user
change_username
change_password
get_recovery_question
change_security_question
verify_recovery_answer
reset_password
```

There is no first-run account-creation command or screen.

## 15. Automated tests

At minimum verify:

- A fresh database automatically creates `admin`.
- `verify_password("admin")` succeeds and the plaintext is not stored.
- `admin / admin` logs in; a wrong password fails.
- Initial recovery fields are `NULL` and recovery is unavailable without crashing.
- Setting a security question requires the current password and stores only a hash.
- Changing the password makes the old password fail and the new password succeed.
- Changing the username makes the old username fail and the new username succeed.
- Recovery works only after a correct configured answer.
- Failed login and recovery attempts are limited.
- Password reset and password change invalidate the session.
- Protected backend commands reject unauthenticated access.
- Login, forgot-password, Settings user information, account changes, and logout render and work in frontend tests.

## 16. Definition of done

- Fresh databases automatically receive the hashed default administrator.
- Login is the first screen and has `admin` prefilled.
- No account-creation or mandatory recovery screen appears.
- The user can immediately log in with `admin / admin`.
- User Information supports username and password changes.
- Security-question setup is optional and supports set/change states.
- Forgot Password safely reports unavailable recovery when not configured.
- Configured recovery can reset the password without revealing the old password.
- Rust owns sessions and protects sensitive commands.
- Passwords and answers are never stored in plaintext.
- Backend, frontend, and integration tests pass.
