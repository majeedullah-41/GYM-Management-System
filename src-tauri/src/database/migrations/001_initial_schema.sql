-- Gym Management System — Initial Schema
-- Migration: 001_initial_schema

-- Membership Plans
CREATE TABLE IF NOT EXISTS membership_plans (
    id            TEXT PRIMARY KEY NOT NULL,
    name          TEXT NOT NULL,
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    price         INTEGER NOT NULL CHECK (price >= 0),
    description   TEXT,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

-- Members
CREATE TABLE IF NOT EXISTS members (
    id            TEXT PRIMARY KEY NOT NULL,
    member_number TEXT UNIQUE NOT NULL,
    full_name     TEXT NOT NULL,
    father_name   TEXT,
    phone         TEXT,
    cnic          TEXT,
    address       TEXT,
    date_of_birth TEXT,
    gender        TEXT,
    photo_path    TEXT,
    notes         TEXT,
    is_archived   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_member_number ON members(member_number);
CREATE INDEX IF NOT EXISTS idx_members_full_name ON members(full_name);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_is_archived ON members(is_archived);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id                     TEXT PRIMARY KEY NOT NULL,
    receipt_number         TEXT UNIQUE NOT NULL,
    member_id              TEXT NOT NULL,
    amount                 INTEGER NOT NULL CHECK (amount > 0),
    payment_method         TEXT NOT NULL,
    payment_date           TEXT NOT NULL,
    membership_plan_id     TEXT NOT NULL,
    membership_start_date  TEXT NOT NULL,
    membership_expiry_date TEXT NOT NULL,
    notes                  TEXT,
    created_at             TEXT NOT NULL,
    updated_at             TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    FOREIGN KEY (membership_plan_id) REFERENCES membership_plans(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON payments(receipt_number);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id           TEXT PRIMARY KEY NOT NULL,
    category     TEXT NOT NULL,
    description  TEXT,
    amount       INTEGER NOT NULL CHECK (amount > 0),
    expense_date TEXT NOT NULL,
    notes        TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
    id            TEXT PRIMARY KEY NOT NULL,
    receipt_number TEXT UNIQUE NOT NULL,
    payment_id    TEXT NOT NULL,
    issued_at     TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);

-- Application Settings (key-value)
CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY NOT NULL,
    value      TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
