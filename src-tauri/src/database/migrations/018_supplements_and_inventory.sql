-- Supplements & Inventory Management
-- Migration: 018_supplements_and_inventory

-- Supplement Suppliers
CREATE TABLE IF NOT EXISTS supplement_suppliers (
    id         TEXT PRIMARY KEY NOT NULL,
    name       TEXT NOT NULL,
    company    TEXT,
    phone      TEXT,
    email      TEXT,
    address    TEXT,
    notes      TEXT,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_supplement_suppliers_name ON supplement_suppliers(name);
CREATE INDEX IF NOT EXISTS idx_supplement_suppliers_is_active ON supplement_suppliers(is_active);

-- Inventory / Supplement Items
CREATE TABLE IF NOT EXISTS supplement_items (
    id              TEXT PRIMARY KEY NOT NULL,
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,
    brand           TEXT,
    unit            TEXT NOT NULL DEFAULT 'Unit',
    cost_price      INTEGER NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    selling_price   INTEGER NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
    stock_quantity  INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER NOT NULL DEFAULT 5 CHECK (min_stock_level >= 0),
    notes           TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_supplement_items_name ON supplement_items(name);
CREATE INDEX IF NOT EXISTS idx_supplement_items_category ON supplement_items(category);
CREATE INDEX IF NOT EXISTS idx_supplement_items_is_active ON supplement_items(is_active);

-- Supplement Purchases (from Suppliers)
CREATE TABLE IF NOT EXISTS supplement_purchases (
    id             TEXT PRIMARY KEY NOT NULL,
    invoice_number TEXT NOT NULL,
    supplier_id    TEXT NOT NULL,
    item_id        TEXT NOT NULL,
    item_name      TEXT NOT NULL,
    quantity       INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost      INTEGER NOT NULL CHECK (unit_cost >= 0),
    total_amount   INTEGER NOT NULL CHECK (total_amount >= 0),
    paid_amount    INTEGER NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    purchase_date  TEXT NOT NULL,
    notes          TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    FOREIGN KEY (supplier_id) REFERENCES supplement_suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (item_id) REFERENCES supplement_items(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_supplement_purchases_supplier_id ON supplement_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplement_purchases_item_id ON supplement_purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_supplement_purchases_purchase_date ON supplement_purchases(purchase_date);

-- Supplier Payments (against purchases / supplier dues)
CREATE TABLE IF NOT EXISTS supplier_payments (
    id             TEXT PRIMARY KEY NOT NULL,
    supplier_id    TEXT NOT NULL,
    purchase_id    TEXT,
    expense_id     TEXT,
    amount         INTEGER NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL,
    payment_date   TEXT NOT NULL,
    reference      TEXT,
    notes          TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    FOREIGN KEY (supplier_id) REFERENCES supplement_suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (purchase_id) REFERENCES supplement_purchases(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_id ON supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_purchase_id ON supplier_payments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_payment_date ON supplier_payments(payment_date);

-- Supplement Sales (POS to Members or Walk-in Customers)
CREATE TABLE IF NOT EXISTS supplement_sales (
    id             TEXT PRIMARY KEY NOT NULL,
    invoice_number TEXT NOT NULL,
    member_id      TEXT,
    customer_name  TEXT NOT NULL,
    item_id        TEXT NOT NULL,
    item_name      TEXT NOT NULL,
    quantity       INTEGER NOT NULL CHECK (quantity > 0),
    unit_price     INTEGER NOT NULL CHECK (unit_price >= 0),
    cost_price     INTEGER NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    discount       INTEGER NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total_amount   INTEGER NOT NULL CHECK (total_amount >= 0),
    payment_method TEXT NOT NULL,
    sale_date      TEXT NOT NULL,
    notes          TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
    FOREIGN KEY (item_id) REFERENCES supplement_items(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_supplement_sales_member_id ON supplement_sales(member_id);
CREATE INDEX IF NOT EXISTS idx_supplement_sales_item_id ON supplement_sales(item_id);
CREATE INDEX IF NOT EXISTS idx_supplement_sales_sale_date ON supplement_sales(sale_date);

-- Inventory Stock Movements (Audit Trail)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id              TEXT PRIMARY KEY NOT NULL,
    item_id         TEXT NOT NULL,
    movement_type   TEXT NOT NULL,
    quantity_change INTEGER NOT NULL,
    previous_stock  INTEGER NOT NULL,
    new_stock       INTEGER NOT NULL,
    reference_id    TEXT,
    reason          TEXT,
    movement_date   TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES supplement_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_movement_date ON inventory_movements(movement_date);

