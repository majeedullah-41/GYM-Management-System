# 10 — HWID LICENSING SYSTEM

**Module:** Licensing
**Priority:** P0 — Critical
**Status:** Planned
**Type:** System / Security Module
**Frontend Route:** `/license`
**Technology:** Tauri + Rust
**Storage:** Local Application Data
**Primary Mode:** Offline HWID-Bound Licensing

---

# 1. Purpose

The Licensing module protects the Gym Management System from
unauthorized installation and copying.

A license should be bound to a specific computer using a generated
Hardware ID (HWID).

The system should support:

- Unique installation/device identification
- HWID generation
- Offline activation
- Signed license verification
- License status checking
- Permanent licenses
- Optional expiry-based licenses
- License information screen
- Invalid-license handling
- License-file import
- License replacement
- Hardware-change handling
- Automated tests

The licensing system must be implemented primarily in Rust.

The React frontend must never be responsible for deciding whether a
license is valid.

---

# 2. Core Principle

The licensing architecture is:

```text
Customer Computer
       │
       ▼
Generate HWID
       │
       ▼
HWID sent to software vendor
       │
       ▼
Vendor License Generator
       │
       ▼
Signed License
       │
       ▼
Customer imports license
       │
       ▼
Rust verifies signature
       │
       ▼
Verify HWID
       │
       ▼
License Valid
       │
       ▼
Application Starts
```

The private signing key must NEVER be included inside the gym
application.

# 3. Security Model

Use asymmetric cryptographic signing.

Conceptually:

```text
PRIVATE KEY
    │
    │ signs
    ▼
License Payload
    │
    ▼
Signed License
```

The private key exists only with the software vendor/developer.

The application contains only:

```text
PUBLIC KEY
```

The application uses the public key to verify that a license was
actually created by the legitimate license issuer.

# 4. Critical Private-Key Rule

The production application MUST NOT contain:

* Private signing key
* Private key file
* Private key password
* License-generation secret

The application may contain the public verification key.

Architecture:

```text
Developer / Vendor

Private Key
     │
     ▼
License Generator
     │
     ▼
Signed License


Customer Application

Public Key
     │
     ▼
Verify License
```

Compromising the customer's computer should not expose the signing
private key.

# 5. Licensing Components

The licensing system should consist of two separate components:

1. Gym Management Application
2. License Generator

The Gym Management Application is distributed to customers.

The License Generator remains under developer/vendor control.

# 6. Gym Application Responsibilities

The customer application handles:

* Generate HWID
* Display HWID
* Import license
* Store license
* Verify signature
* Compare HWID
* Check expiry
* Determine license status
* Display license information

It must NOT generate legitimate production licenses.

# 7. License Generator Responsibilities

The vendor-side generator handles:

* Enter customer information
* Enter HWID
* Select license type
* Select expiry if applicable
* Generate license ID
* Build license payload
* Sign license
* Export license file/string

The generator contains or securely accesses the private signing key.

It must NOT be distributed with the customer application.

# 8. Basic Activation Workflow

When the software is opened without a license:

```text
Application Starts
       │
       ▼
Rust Licensing Service
       │
       ▼
License Exists?
       │
      NO
       │
       ▼
Generate HWID
       │
       ▼
Activation Screen
```

Example:

```text
┌───────────────────────────────────────────────────┐
│ Gym Management System                            │
│                                                   │
│ Software Activation                              │
│                                                   │
│ This computer is not activated.                   │
│                                                   │
│ Hardware ID                                       │
│ ┌───────────────────────────────────────────────┐ │
│ │ 7D42-91AC-B830-...                            │ │
│ └───────────────────────────────────────────────┘ │
│                                                   │
│ [ Copy Hardware ID ]                              │
│                                                   │
│ Send this Hardware ID to your software provider   │
│ to receive your license.                          │
│                                                   │
│ [ Import License ]                                │
└───────────────────────────────────────────────────┘
```

# 9. HWID

HWID means:

Hardware Identifier

It represents the computer on which the application is licensed.

The HWID should be generated in Rust.

React must never generate the authoritative HWID.

# 10. HWID Requirements

The generated HWID should be:

* Stable
* Deterministic
* Privacy-conscious
* Normalized
* Hashed
* Suitable for device matching

The same supported computer configuration should normally produce the
same HWID after application restart.

# 11. Do Not Use One Fragile Identifier

Avoid relying exclusively on one easily changing property such as:

* MAC address
* IP address
* Username
* Computer hostname
* Disk free space

These values may change or be unreliable.

# 12. HWID Source Strategy

The exact hardware identifiers used should be selected per supported
operating system.

Conceptually:

```text
System Identifier
        +
Machine Identifier
        +
Selected Stable Hardware Information
        │
        ▼
Normalize
        │
        ▼
Hash
        │
        ▼
HWID
```

Do not expose raw hardware information unnecessarily.

# 13. HWID Privacy

The license should preferably contain the derived HWID rather than
unnecessary raw hardware information.

Prefer:

```text
SHA-256(
    normalized hardware fingerprint
)
```

instead of storing/displaying detailed hardware serial information.

# 14. HWID Normalization

Before hashing:

* Trim whitespace
* Normalize case
* Use stable ordering
* Normalize separators
* Handle missing values consistently

Otherwise logically identical device information could generate
different fingerprints.

# 15. HWID Service

Recommended Rust structure:

```text
licensing/
├── domain/
│   ├── license.rs
│   ├── license_status.rs
│   └── hwid.rs
│
├── services/
│   ├── license_service.rs
│   └── hwid_service.rs
│
├── repositories/
│   └── license_repository.rs
│
├── crypto/
│   └── license_verifier.rs
│
└── commands/
    └── license_commands.rs
```

Follow the project's overall architecture conventions if directory names
differ.

# 16. HWID Service Responsibility

The HWID service should handle:

* Read supported machine identifiers
* Normalize values
* Generate fingerprint
* Hash fingerprint
* Return HWID

Other modules should not independently calculate HWIDs.

# 17. License Types

Initial supported types:

* Permanent
* Expiring

Do not initially implement:

* Subscription server
* Floating licenses
* Concurrent-user licensing
* Cloud activation
* Feature marketplace

unless the business actually needs them.

# 18. Permanent License

Example:

```text
License Type:
Permanent

Expires:
Never
```

Once activated on the licensed hardware, it remains valid unless:

* Hardware changes beyond supported tolerance
* License file becomes invalid
* License is replaced

Since the system is offline, remote revocation is not guaranteed.

# 19. Expiring License

Example:

```text
License Type:
Expiring

Expires:
31/12/2027
```

Validation:

```text
Current Date <= Expiry Date
```

However, expiry checking must be designed carefully because an offline
computer's system clock can be changed.

# 20. Offline Licensing Limitation

A fully offline licensing system cannot perfectly defend against a user
who has complete administrative control over the computer.

Therefore the goal is:

```text
Strong practical licensing
+
Tamper resistance
+
Good validation
```

not mathematically impossible-to-bypass DRM.

The application should remain maintainable and reliable.

# 21. License Payload

Conceptually:

```text
LicensePayload {
    version
    license_id
    customer_name
    gym_name
    hwid
    license_type
    issued_at
    expires_at
}
```

Optional future fields:

* edition
* features
* notes

Do not include unnecessary personal information.

# 22. Example License Payload

Conceptually:

```text
version: 1

license_id:
LIC-2026-000124

customer_name:
Ali Khan

gym_name:
Swat Fitness Center

hwid:
<hashed-device-identifier>

license_type:
permanent

issued_at:
2026-09-05

expires_at:
null
```

# 23. License Signature

The payload must be cryptographically signed.

Conceptually:

```text
payload
   │
   ▼
Canonical Serialization
   │
   ▼
Private Key
   │
   ▼
Signature
```

Customer receives:

```text
Payload
+
Signature
```

The application verifies:

```text
Payload
+
Signature
+
Public Key
```

# 24. Recommended Signature Design

Use a well-established asymmetric digital signature algorithm supported
by a mature Rust cryptography library.

Do NOT invent a custom encryption/signature algorithm.

Do NOT use:

* MD5
* SHA1
* Base64 alone
* XOR
* Hard-coded secret comparison
* Custom homemade crypto

Base64 may be used for encoding, but encoding is NOT security.

# 25. Canonical Serialization

The exact bytes that are signed must be deterministic.

For example:

```text
License Payload
       ↓
Canonical Serialization
       ↓
Signature
```

Do not sign an unstable representation where field ordering can change
between generation and verification.

# 26. License File

Recommended file extension:

```text
.gymlic
```

Example:

```text
swat-fitness-center.gymlic
```

The file contains:

* License payload
* Signature
* Format/version information

# 27. License File Is Not Secret

Do not assume the license file itself can remain hidden.

Security must come from:

```text
Digital signature verification
+
HWID matching
```

not from hiding the file format.

# 28. Activation Workflow

Complete workflow:

```text
Install Application
       │
       ▼
Launch
       │
       ▼
No License
       │
       ▼
Generate HWID
       │
       ▼
User Copies HWID
       │
       ▼
Sends HWID to Vendor
       │
       ▼
Vendor Generates License
       │
       ▼
User Receives .gymlic
       │
       ▼
Import License
       │
       ▼
Verify Signature
       │
       ▼
Verify HWID
       │
       ▼
Verify License Rules
       │
       ▼
Store License
       │
       ▼
Application Activated
```

# 29. License Import

Activation screen provides:

```text
[ Import License ]
```

The user selects:

```text
customer.gymlic
```

The application must validate it BEFORE storing it as the active
license.

# 30. License Validation Order

Recommended validation pipeline:

```text
Read License
     │
     ▼
Parse Format
     │
     ▼
Check Format Version
     │
     ▼
Verify Signature
     │
     ▼
Read Signed Payload
     │
     ▼
Generate Current HWID
     │
     ▼
Compare HWID
     │
     ▼
Check License Type
     │
     ▼
Check Expiry
     │
     ▼
VALID
```

Fail closed when required validation fails.

# 31. Signature Validation

The most important validation is:

```text
verify(public_key, payload, signature)
```

If signature verification fails:

```text
INVALID LICENSE
```

Do not continue trusting fields from the license.

# 32. HWID Validation

After signature verification:

```text
license.hwid
      ==
current_machine.hwid
```

If they differ:

```text
License is not valid for this computer.
```

# 33. Expiry Validation

For an expiring license:

```text
Current Date
     <=
Expiry Date
```

If expired:

```text
License Expired
```

For permanent:

```text
expires_at = null
```

or another explicit permanent representation.

# 34. License Status

Define a proper domain type.

Conceptually:

```text
LicenseStatus {
    Valid,
    Missing,
    InvalidSignature,
    HardwareMismatch,
    Expired,
    Corrupted,
    UnsupportedVersion
}
```

Avoid scattering arbitrary strings throughout the codebase.

# 35. Application Startup

Licensing should be checked before the main application becomes
available.

```text
Tauri Starts
     │
     ▼
Initialize Backend
     │
     ▼
License Service
     │
     ▼
Validate License
     │
 ┌───┴────┐
 ▼        ▼
VALID   INVALID
 │        │
 ▼        ▼
App    Activation
```

# 36. Frontend Route Protection

The frontend may use license state to determine which screen to render.

However:

```text
React route protection
```

must NOT be the only enforcement.

Rust commands that require a valid license should also enforce licensing
where appropriate.

# 37. Do Not Trust React

Never use:

```text
localStorage.isLicensed = true
```

as licensing authority.

Never use:

```text
if (licensed) {
    showApp();
}
```

as the only protection.

React state is presentation state.

Rust is authoritative.

# 38. Tauri Command Protection

Sensitive application commands may use a common license guard.

Conceptually:

```text
Tauri Command
      │
      ▼
Require Valid License
      │
 ┌────┴─────┐
 ▼          ▼
VALID     INVALID
 │          │
 ▼          ▼
Continue   Reject
```

Avoid duplicating license-verification logic manually inside every
command.

Use a centralized guard/service.

# 39. License Storage

The active license should be stored in the application's local data
directory.

Conceptually:

```text
App Data/
├── gym.db
├── license.gymlic
└── ...
```

The exact location should use the operating system's appropriate
application-data directory.

Do not rely on the current working directory.

# 40. SQLite and License Storage

The license may be referenced by SQLite if needed, but the signed
license itself should remain independently verifiable.

Do not make:

```text
settings.is_licensed = 1
```

the source of truth.

That value could simply be changed.

The signed license is the authority.

# 41. License Information Screen

Settings should contain:

```text
Settings
   ↓
License
```

Example:

```text
┌──────────────────────────────────────────────────┐
│ License                                          │
│                                                  │
│ Status                                           │
│ ✓ Activated                                      │
│                                                  │
│ License ID                                       │
│ LIC-2026-000124                                  │
│                                                  │
│ Licensed To                                      │
│ Swat Fitness Center                              │
│                                                  │
│ License Type                                     │
│ Permanent                                        │
│                                                  │
│ Hardware ID                                      │
│ 7D42-91AC-B830-****                              │
│                                                  │
│ [ Copy HWID ]                                    │
│ [ Replace License ]                              │
└──────────────────────────────────────────────────┘
```

# 42. Expiring License UI

Example:

```text
Status
✓ Activated

Type
Expiring

Expires
31 Dec 2027
```

If approaching expiry, optionally show:

```text
License expires in 30 days.
```

Do not show warnings excessively early unless useful.

# 43. Missing License

If no license exists:

```text
Software Activation

This installation has not been activated.

Hardware ID:
XXXX-XXXX-XXXX

[ Copy HWID ]
[ Import License ]
```

Do not expose the main application.

# 44. Invalid License

If signature verification fails:

```text
License Invalid

The installed license could not be verified.

[ Import Another License ]
```

Do not expose cryptographic implementation details to normal users.

# 45. Hardware Mismatch

If the license belongs to another computer:

```text
License Not Valid for This Computer

This license was issued for a different device.

Current Hardware ID:
XXXX-XXXX-XXXX

[ Copy HWID ]
[ Import Another License ]
```

# 46. Expired License

Example:

```text
License Expired

This software license expired on:

31 Dec 2027

Please contact your software provider for a renewed license.

[ Copy HWID ]
[ Import New License ]
```

# 47. Corrupted License

If parsing fails:

```text
License File Damaged

The installed license could not be read.

[ Import Another License ]
```

Do not crash the application.

# 48. Unsupported License Version

License payloads must include:

```text
version
```

Example:

```text
version = 1
```

If a future incompatible format is loaded:

```text
This license format is not supported by this version of the application.
```

# 49. License Replacement

Settings may provide:

```text
[ Replace License ]
```

Workflow:

```text
Select New License
       ↓
Validate Completely
       ↓
VALID?
       │
   ┌───┴───┐
   ▼       ▼
  YES      NO
   │       │
   ▼       ▼
Replace   Keep Existing
```

Never delete a valid existing license before confirming that the
replacement is valid.

# 50. Hardware Change

Hardware changes can cause licensing problems.

Examples:

* Motherboard replacement
* OS reinstallation
* Disk replacement
* Major machine change

The exact HWID strategy should minimize false invalidations.

# 51. Hardware Change Policy

Recommended business process:

```text
Customer hardware changes
       │
       ▼
Application displays new HWID
       │
       ▼
Customer contacts vendor
       │
       ▼
Vendor verifies customer
       │
       ▼
Vendor issues replacement license
```

Do not create an overly complicated automatic hardware-transfer system
for the initial version.

# 52. Windows Reinstallation

If possible, choose machine identifiers that remain reasonably stable
across normal application reinstallations.

However, no HWID strategy should promise perfect persistence across all
OS/hardware changes.

Document the supported behavior.

# 53. License Generator

Create a separate internal utility.

Example:

```text
license-generator/
```

This should NOT be part of the customer-facing application distribution.

# 54. License Generator UI

A simple internal tool is sufficient.

Example:

```text
┌───────────────────────────────────────────────────┐
│ License Generator                                 │
│                                                   │
│ Customer                                          │
│ [ Ali Khan                                  ]     │
│                                                   │
│ Gym                                               │
│ [ Swat Fitness Center                       ]     │
│                                                   │
│ HWID                                              │
│ [ 7D42-91AC-B830-...                        ]     │
│                                                   │
│ License Type                                      │
│ [ Permanent ▼ ]                                   │
│                                                   │
│ Expiry                                            │
│ [ — ]                                             │
│                                                   │
│                         [ Generate License ]       │
└───────────────────────────────────────────────────┘
```

# 55. License Generator Output

Example:

```text
swat-fitness-center.gymlic
```

The generator should show:

```text
License generated successfully.

License ID:
LIC-2026-000124

Customer:
Ali Khan

Gym:
Swat Fitness Center

Type:
Permanent

HWID:
7D42-91AC-B830-...
```

# 56. License ID

Every issued license should have a unique identifier.

Example:

```text
LIC-2026-000124
```

The license ID is informational/audit metadata.

Security still comes from the signature.

# 57. License Issuance Records

Recommended vendor-side record:

* License ID
* Customer
* Gym
* HWID
* Type
* Issued Date
* Expiry
* Notes

This can initially be maintained separately from the customer
application.

Do not require the customer's offline gym database to manage vendor
licensing records.

# 58. Private Key Storage

The private signing key must be protected.

It must NOT be:

* Committed to Git
* Stored in frontend source
* Included in Tauri resources
* Included in installer
* Uploaded with public source
* Hard-coded into generator source

Use appropriate secure key storage for the vendor environment.

# 59. Public Key

The public verification key may be compiled into the Rust application.

Conceptually:

```text
const LICENSE_PUBLIC_KEY = ...
```

or loaded from an immutable trusted application resource.

Changing the public key requires careful versioning/key-rotation design.

# 60. Key Rotation

Not required for the first implementation, but the license format should
allow future key rotation.

Conceptually:

```text
key_id
```

may be included in the license envelope.

Example:

```text
key_id = "2026-primary"
```

Do not overbuild rotation until needed.

# 61. Clock Manipulation

Expiring offline licenses have an inherent weakness:

```text
User changes system date backwards.
```

Basic mitigation may include storing the last successfully observed
application timestamp.

Example:

```text
last_seen_time
```

If:

```text
current_time < last_seen_time
```

the application may detect suspicious clock rollback.

# 62. Clock-Rollback Caution

Clock protection must not permanently lock legitimate users because of
a minor clock/configuration problem.

Design the behavior conservatively.

Permanent licenses do not need expiry clock enforcement.

# 63. Database Backup Interaction

License identity should be separate from gym business data.

Restoring:

```text
gym.db
```

should not automatically activate another computer.

Example:

```text
Computer A
License A
Gym Database

Copy database to:

Computer B
```

Computer B still needs:

```text
License for Computer B
```

# 64. Database Copy Protection

This distinction is important:

```text
Gym Data
    ≠
Software License
```

Backing up/restoring gym data should not bypass HWID licensing.

# 65. License and Settings

Settings may display license information.

Settings must NOT be able to directly change:

* license_status
* license_hwid
* license_expiry
* signature

These values come from the verified license.

# 66. License and Application Updates

A valid permanent license should normally remain valid after a normal
software update on the same licensed machine.

Do not unnecessarily bind licenses to exact application patch versions.

# 67. License Edition

Optional future capability:

* Standard
* Professional

Do NOT implement multiple editions until required.

If added later, edition must be part of the signed payload.

# 68. Feature Licensing

Optional future payload:

```text
features: [
    "members",
    "payments",
    "reports"
]
```

For the initial application:

```text
Valid License
=
Full Application
```

This is much simpler.

# 69. Development Mode

Automated development/testing needs a safe licensing strategy.

Do not require developers to manually activate every test run.

Use explicit:

* Test configuration
* Test keys
* Mock license verifier

where appropriate.

Production builds must never accept test licenses.

# 70. Production vs Test Keys

Use separate cryptographic keys:

```text
TEST KEYPAIR
```

and:

```text
PRODUCTION KEYPAIR
```

Production applications must only trust production public keys.

Test private keys may exist in test infrastructure if appropriate.

Production private keys must remain protected.

# 71. Logging

Licensing may log non-sensitive events:

* License loaded
* License valid
* License missing
* License expired
* HWID mismatch
* License import attempted
* License replaced

Do NOT log:

* Private keys
* Raw signing secrets
* Unnecessary hardware identifiers

# 72. Error Handling

Licensing errors must never cause an uncontrolled application crash.

Expected behavior:

```text
License failure
      ↓
Controlled license status
      ↓
Activation UI
```

# 73. Backend API

Conceptual Tauri commands:

```text
get_license_status()
get_hardware_id()
get_license_info()
import_license(...)
```

Optional:

```text
replace_license(...)
```

Do not expose:

```text
generate_license()
sign_license()
get_private_key()
```

in the customer application.

# 74. Frontend Licensing Store

Frontend may maintain UI state such as:

```text
LicenseState {
    status
    licenseInfo
    hwid
    loading
    error
}
```

This state is NOT authoritative.

It reflects information returned by Rust.

# 75. Startup Performance

License verification should be fast.

Avoid:

* Network request
* Cloud dependency
* Slow hardware scanning
* Repeated expensive operations

The normal startup check should feel instantaneous.

# 76. Offline Requirement

The following must work completely offline:

* HWID generation
* License import
* Signature verification
* HWID comparison
* Permanent license verification
* Expiry verification
* Application startup

No licensing server is required for normal use.

# 77. Automated Tests — HWID

Test:

```text
Same mocked hardware identifiers
       ↓
Same HWID
```

Expected:

```text
PASS
```

Test normalization differences:

```text
ABC
abc
 ABC 
```

according to normalization rules.

Expected:

```text
Consistent fingerprint
```

# 78. Automated Tests — Valid License

Given:

* Correct signature
* Correct HWID
* Permanent license

Expected:

```text
LicenseStatus::Valid
```

# 79. Automated Tests — Invalid Signature

Modify one signed payload field.

Example:

```text
gym_name
```

Expected:

```text
InvalidSignature
```

The modified license must not be accepted.

# 80. Automated Tests — Wrong HWID

Given:

* Valid signature
* HWID = Machine A

run against:

* Machine B

Expected:

```text
HardwareMismatch
```

# 81. Automated Tests — Expired

Given:

```text
expires_at < current_date
```

Expected:

```text
Expired
```

# 82. Automated Tests — Permanent

Given:

```text
license_type = permanent
expires_at = null
```

Expected:

```text
Valid
```

when signature and HWID are valid.

# 83. Automated Tests — Corrupted File

Provide:

* Invalid bytes
* Malformed JSON/serialization
* Missing signature

Expected:

```text
Corrupted
```

or the appropriate controlled error.

The application must not crash.

# 84. Automated Tests — Unsupported Version

Given:

```text
version = unsupported
```

Expected:

```text
UnsupportedVersion
```

# 85. Automated Tests — Replacement

Start with:

```text
Valid License A
```

attempt replacement with:

```text
Invalid License B
```

Expected:

```text
License A remains installed.
```

Then replace with:

```text
Valid License C
```

Expected:

```text
License C becomes active.
```

# 86. Automated Tests — Database Restore

Activate Machine A.

Backup gym database.

Restore database on Machine B.

Expected:

```text
Machine B is NOT automatically licensed.
```

Licensing remains HWID-bound.

# 87. Frontend Tests

Test:

* [ ] Activation screen renders
* [ ] HWID displays
* [ ] Copy HWID works
* [ ] Import License works
* [ ] Invalid-license message works
* [ ] Hardware-mismatch message works
* [ ] Expired-license message works
* [ ] Corrupted-license message works
* [ ] Valid license opens application
* [ ] License information appears in Settings
* [ ] Replace License works
* [ ] Failed replacement preserves current license
* [ ] Loading states work
* [ ] Errors are user friendly

# 88. Integration Tests

Test complete activation:

```text
Application
     ↓
No License
     ↓
Generate HWID
     ↓
Generate Signed Test License
     ↓
Import
     ↓
Verify Signature
     ↓
Verify HWID
     ↓
Store
     ↓
Restart
     ↓
Application Opens
```

# 89. Security Tests

At minimum test:

* [ ] Change customer name in license
* [ ] Change gym name
* [ ] Change HWID
* [ ] Change expiry
* [ ] Change license type
* [ ] Remove signature
* [ ] Replace signature
* [ ] Corrupt license file
* [ ] Copy license to different mocked HWID

Every unauthorized modification must fail verification.

# 90. Application Access Rule

The central invariant is:

```text
Application Business Features
             │
             ▼
      Require Valid License
```

A frontend route alone must not define authorization.

# 91. Maintainability Rule

Keep licensing isolated from gym business logic.

Do NOT scatter:

```text
if license_valid
```

through hundreds of components.

Use:

```text
License Service
+
Application startup guard
+
Central backend enforcement
```

# 92. Module Boundaries

Licensing owns:

* HWID
* License parsing
* Signature verification
* License status
* Activation
* License persistence

Members owns:

* Members

Payments owns:

* Payments

Settings owns:

* Application configuration

Database backup owns:

* Gym data backup/restore

Do not mix these responsibilities.

# 93. Suggested Project Structure

Conceptually:

```text
src-tauri/
└── src/
    ├── licensing/
    │   ├── mod.rs
    │   ├── domain/
    │   │   ├── license.rs
    │   │   ├── license_status.rs
    │   │   └── hwid.rs
    │   │
    │   ├── services/
    │   │   ├── license_service.rs
    │   │   └── hwid_service.rs
    │   │
    │   ├── repositories/
    │   │   └── license_repository.rs
    │   │
    │   ├── crypto/
    │   │   └── license_verifier.rs
    │   │
    │   └── commands/
    │       └── license_commands.rs
    │
    └── ...
```

Frontend:

```text
src/
├── features/
│   └── licensing/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── services/
│       └── types/
│
└── ...
```

Follow the existing project conventions rather than creating a second
architecture.

# 94. Implementation Order

Implement in this order:

1. Define licensing requirements
2. Define license payload
3. Define license status enum
4. Define license format version
5. Select established signature library/algorithm
6. Create test keypair
7. Implement deterministic payload serialization
8. Implement signature verification
9. Add cryptographic verification tests
10. Implement HWID abstraction
11. Implement platform HWID provider
12. Add HWID tests using mocks
13. Implement License Service
14. Implement license persistence
15. Implement Tauri commands
16. Implement startup license guard
17. Implement Activation UI
18. Implement license import
19. Implement License Settings page
20. Implement replacement workflow
21. Implement vendor License Generator separately
22. Add integration tests
23. Add tampering tests
24. Add production/test key separation
25. Test on clean Windows installation
26. Test application reinstall
27. Test database backup/restore
28. Test hardware mismatch
29. Document license recovery process
30. Perform security review before release

# 95. Definition of Done

The licensing module is complete when:

* [ ] HWID is generated in Rust
* [ ] HWID is stable for supported hardware conditions
* [ ] Raw hardware information is minimized
* [ ] License payload is versioned
* [ ] License is cryptographically signed
* [ ] Private key is absent from customer application
* [ ] Public key verification works
* [ ] Invalid signatures are rejected
* [ ] Modified licenses are rejected
* [ ] HWID mismatch is rejected
* [ ] Permanent licenses work
* [ ] Expiring licenses work if enabled
* [ ] Missing licenses are handled
* [ ] Corrupted licenses are handled
* [ ] Unsupported versions are handled
* [ ] Activation works offline
* [ ] License import works
* [ ] License replacement works safely
* [ ] License persists across restart
* [ ] License information appears in Settings
* [ ] Copying gym database does not copy activation
* [ ] React is not the licensing authority
* [ ] Backend enforcement exists
* [ ] Test and production keys are separated
* [ ] Unit tests pass
* [ ] Integration tests pass
* [ ] Tampering tests pass
* [ ] Application does not crash on invalid license
* [ ] No production private key exists in repository
* [ ] No production private key exists in installer
* [ ] No licensing secrets exist in frontend

# 96. AI Coding Rules

Before implementing Licensing, the AI agent MUST read:

* [ ] ARCHITECTURE.md
* [ ] DATABASE-SPECIFICATION.md
* [ ] TESTING-STRATEGY.md
* [ ] SECURITY documentation
* [ ] SETTINGS.md
* [ ] This LICENSING.md

The AI agent MUST:

* [ ] Keep licensing logic in Rust
* [ ] Use layered architecture
* [ ] Use established cryptographic libraries
* [ ] Use asymmetric digital signatures
* [ ] Keep the private key outside the customer application
* [ ] Keep the private key outside frontend code
* [ ] Use deterministic signed data
* [ ] Validate signature before trusting payload
* [ ] Validate HWID
* [ ] Validate expiry where applicable
* [ ] Version the license format
* [ ] Handle corrupted licenses safely
* [ ] Add automated tests
* [ ] Add tampering tests
* [ ] Mock hardware information in unit tests
* [ ] Keep production/test keys separate
* [ ] Preserve an existing valid license when replacement fails
* [ ] Keep licensing independent from gym business data

The AI agent MUST NOT:

* [ ] Invent custom cryptography
* [ ] Use Base64 as security
* [ ] Use MD5
* [ ] Use SHA1
* [ ] Store the private signing key in React
* [ ] Store the private signing key in Rust customer application
* [ ] Commit the production private key to Git
* [ ] Include the license generator in customer builds
* [ ] Trust localStorage for licensing
* [ ] Trust SQLite boolean flags as licensing authority
* [ ] Generate production licenses inside the customer application
* [ ] Rely only on frontend route protection
* [ ] Use MAC address alone as HWID
* [ ] Use IP address as HWID
* [ ] Crash when license parsing fails
* [ ] Disable automated tests to make licensing work
* [ ] Mix licensing logic with Payments/Members/Finances

# 97. Final Architecture

```text
                    SOFTWARE VENDOR
                          │
                    Private Key
                          │
                          ▼
                  License Generator
                          │
                  Signs License
                          │
                          ▼
                    .gymlic File
                          │
                          │ Customer receives
                          ▼
┌─────────────────────────────────────────────────────┐
│               CUSTOMER COMPUTER                    │
│                                                     │
│                 Tauri Application                   │
│                        │                            │
│                        ▼                            │
│                 Rust License Service                │
│                        │                            │
│          ┌─────────────┼──────────────┐             │
│          ▼             ▼              ▼             │
│     Public Key       HWID          License File     │
│          │             │              │             │
│          └─────────────┼──────────────┘             │
│                        ▼                            │
│                  Verify License                     │
│                        │                            │
│                 ┌──────┴──────┐                     │
│                 ▼             ▼                     │
│               VALID         INVALID                 │
│                 │             │                     │
│                 ▼             ▼                     │
│            Main System    Activation                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

# 98. Golden Rules

The licensing system must always maintain these invariants:

```text
PRIVATE KEY
    =
VENDOR ONLY

CUSTOMER APPLICATION
    =
PUBLIC KEY ONLY

VALID LICENSE
    =
VALID SIGNATURE
+
MATCHING HWID
+
VALID LICENSE RULES

GYM DATABASE
    ≠
SOFTWARE LICENSE

FRONTEND LICENSE STATE
    ≠
LICENSING AUTHORITY
```

and most importantly:

```text
License Generation
        │
        ▼
Vendor Environment

License Verification
        │
        ▼
Customer Application
```

The customer application verifies licenses.

It never possesses the secret required to issue legitimate production
licenses.
