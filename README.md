# Gym POS

Offline-first Gym Management System for Windows.

Manage members, memberships, payments (with partial payment support), receipts, expenses, reports, and backups — fully usable without an internet connection.

## Stack

- **Desktop Framework:** Tauri 2
- **Backend:** Rust + SQLite
- **Frontend:** React + TypeScript

## Documentation

Product and technical specifications live in [`docs/`](./docs/):

| Document | Purpose |
| --- | --- |
| `01-PROJECT-SPECIFICATION.md` | Product overview, scope, goals |
| `02-ARCHITECTURE.md` | Layered architecture contract |
| `03-DATABASE-SPECIFICATION.md` | SQLite schema & data rules |
| `04-FEATURE-SPECIFICATIONS.md` | Functional behavior per module |
| `05-UI-UX-DESIGN-SYSTEM.md` | Design system & UI standards |
| `06-ARCHITECTURE-AND-CODE-STANDARDS.md` | Coding standards |
| `07-TESTING-AND-QUALITY-ASSURANCE.md` | Testing requirements |
| `10-IMPLEMENTATION-PLAN.md` | Phased implementation order |

## Development

```bash
npm install        # install frontend dependencies
npm run tauri dev  # run the desktop app in development mode
```

### Quality checks

```bash
npm run lint          # ESLint
npm run format:check  # Prettier
npm test              # Vitest
cargo test            # Rust tests (run inside src-tauri/)
```
