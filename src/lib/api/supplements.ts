import { invokeCommand } from "../tauri";

export interface SupplierResponse {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  total_purchased: number;
  total_paid: number;
  total_due: number;
  purchase_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierRequest {
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateSupplierRequest {
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface ItemResponse {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  stock_value_cost: number;
  stock_value_retail: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateItemRequest {
  name: string;
  category: string;
  brand?: string | null;
  unit?: string | null;
  cost_price: number;
  selling_price: number;
  initial_stock?: number;
  min_stock_level?: number;
  notes?: string | null;
}

export interface UpdateItemRequest {
  name: string;
  category: string;
  brand?: string | null;
  unit?: string | null;
  cost_price: number;
  selling_price: number;
  min_stock_level: number;
  notes?: string | null;
  is_active?: boolean;
}

export interface AdjustStockRequest {
  item_id: string;
  adjustment_type: "add" | "subtract" | "set";
  quantity: number;
  reason?: string | null;
  movement_date?: string | null;
}

export interface PurchaseResponse {
  id: string;
  invoice_number: string;
  supplier_id: string;
  supplier_name: string;
  item_id: string;
  item_name: string;
  item_unit: string;
  quantity: number;
  unit_cost: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: "paid" | "partial" | "unpaid";
  purchase_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseRequest {
  supplier_id: string;
  item_id: string;
  quantity: number;
  unit_cost: number;
  paid_amount?: number;
  payment_method?: string | null;
  purchase_date: string;
  invoice_number?: string | null;
  update_item_cost?: boolean;
  notes?: string | null;
}

export interface SupplierPaymentResponse {
  id: string;
  supplier_id: string;
  supplier_name: string;
  purchase_id: string | null;
  purchase_invoice: string | null;
  expense_id: string | null;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierPaymentRequest {
  supplier_id: string;
  purchase_id?: string | null;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference?: string | null;
  notes?: string | null;
}

export interface SaleResponse {
  id: string;
  invoice_number: string;
  member_id: string | null;
  member_number: string | null;
  customer_name: string;
  item_id: string;
  item_name: string;
  item_unit: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount: number;
  total_amount: number;
  profit: number;
  payment_method: string;
  sale_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSaleRequest {
  member_id?: string | null;
  customer_name?: string | null;
  item_id: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  payment_method: string;
  sale_date: string;
  notes?: string | null;
}

export interface InventoryMovementResponse {
  id: string;
  item_id: string;
  item_name: string;
  item_unit: string;
  movement_type: "purchase" | "sale" | "adjustment" | "initial";
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reference_id: string | null;
  reason: string | null;
  movement_date: string;
  created_at: string;
}

export interface SupplementSummaryResponse {
  total_items: number;
  total_stock_units: number;
  low_stock_count: number;
  out_of_stock_count: number;
  inventory_cost_value: number;
  inventory_retail_value: number;
  total_suppliers: number;
  suppliers_with_dues: number;
  total_purchased_amount: number;
  total_paid_to_suppliers: number;
  total_supplier_dues: number;
  total_sales_revenue: number;
  total_sales_profit: number;
  total_sales_count: number;
}

// Suppliers API
export async function createSupplier(
  request: CreateSupplierRequest,
): Promise<SupplierResponse> {
  return invokeCommand<SupplierResponse>("create_supplier", { request });
}

export async function updateSupplier(
  id: string,
  request: UpdateSupplierRequest,
): Promise<SupplierResponse> {
  return invokeCommand<SupplierResponse>("update_supplier", { id, request });
}

export async function deleteSupplier(id: string): Promise<void> {
  return invokeCommand<void>("delete_supplier", { id });
}

export async function listSuppliers(args?: {
  search?: string;
  active_only?: boolean;
}): Promise<SupplierResponse[]> {
  return invokeCommand<SupplierResponse[]>("list_suppliers", {
    search: args?.search ?? null,
    activeOnly: args?.active_only ?? null,
  });
}

// Inventory Items API
export async function createSupplementItem(
  request: CreateItemRequest,
): Promise<ItemResponse> {
  return invokeCommand<ItemResponse>("create_supplement_item", { request });
}

export async function updateSupplementItem(
  id: string,
  request: UpdateItemRequest,
): Promise<ItemResponse> {
  return invokeCommand<ItemResponse>("update_supplement_item", { id, request });
}

export async function adjustSupplementStock(
  request: AdjustStockRequest,
): Promise<ItemResponse> {
  return invokeCommand<ItemResponse>("adjust_supplement_stock", { request });
}

export async function deleteSupplementItem(id: string): Promise<void> {
  return invokeCommand<void>("delete_supplement_item", { id });
}

export async function listSupplementItems(args?: {
  search?: string;
  category?: string;
  active_only?: boolean;
}): Promise<ItemResponse[]> {
  return invokeCommand<ItemResponse[]>("list_supplement_items", {
    search: args?.search ?? null,
    category: args?.category ?? null,
    activeOnly: args?.active_only ?? null,
  });
}

export async function listInventoryMovements(args?: {
  item_id?: string;
  movement_type?: string;
}): Promise<InventoryMovementResponse[]> {
  return invokeCommand<InventoryMovementResponse[]>("list_inventory_movements", {
    itemId: args?.item_id ?? null,
    movementType: args?.movement_type ?? null,
  });
}

// Purchases & Supplier Payments API
export async function createSupplementPurchase(
  request: CreatePurchaseRequest,
): Promise<PurchaseResponse> {
  return invokeCommand<PurchaseResponse>("create_supplement_purchase", {
    request,
  });
}

export async function deleteSupplementPurchase(id: string): Promise<void> {
  return invokeCommand<void>("delete_supplement_purchase", { id });
}

export async function listSupplementPurchases(args?: {
  supplier_id?: string;
  item_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<PurchaseResponse[]> {
  return invokeCommand<PurchaseResponse[]>("list_supplement_purchases", {
    supplierId: args?.supplier_id ?? null,
    itemId: args?.item_id ?? null,
    dateFrom: args?.date_from ?? null,
    dateTo: args?.date_to ?? null,
  });
}

export async function createSupplierPayment(
  request: CreateSupplierPaymentRequest,
): Promise<SupplierPaymentResponse> {
  return invokeCommand<SupplierPaymentResponse>("create_supplier_payment", {
    request,
  });
}

export async function deleteSupplierPayment(id: string): Promise<void> {
  return invokeCommand<void>("delete_supplier_payment", { id });
}

export async function listSupplierPayments(args?: {
  supplier_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<SupplierPaymentResponse[]> {
  return invokeCommand<SupplierPaymentResponse[]>("list_supplier_payments", {
    supplierId: args?.supplier_id ?? null,
    dateFrom: args?.date_from ?? null,
    dateTo: args?.date_to ?? null,
  });
}

// POS Sales & Summary API
export async function createSupplementSale(
  request: CreateSaleRequest,
): Promise<SaleResponse> {
  return invokeCommand<SaleResponse>("create_supplement_sale", { request });
}

export async function deleteSupplementSale(id: string): Promise<void> {
  return invokeCommand<void>("delete_supplement_sale", { id });
}

export async function listSupplementSales(args?: {
  search?: string;
  item_id?: string;
  member_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<SaleResponse[]> {
  return invokeCommand<SaleResponse[]>("list_supplement_sales", {
    search: args?.search ?? null,
    itemId: args?.item_id ?? null,
    memberId: args?.member_id ?? null,
    dateFrom: args?.date_from ?? null,
    dateTo: args?.date_to ?? null,
  });
}

export async function getSupplementSummary(): Promise<SupplementSummaryResponse> {
  return invokeCommand<SupplementSummaryResponse>("get_supplement_summary");
}

export const SUPPLEMENT_CATEGORIES = [
  "Whey Protein",
  "Mass Gainer",
  "Pre-Workout",
  "Creatine",
  "BCAA / Amino",
  "Vitamins & Health",
  "Fat Burner",
  "Energy Drinks & Bars",
  "Accessories",
  "Other",
];

export const SUPPLEMENT_UNITS = [
  "Tub / Jar",
  "Bottle",
  "Box",
  "Pack",
  "Pouch / Bag",
  "Piece",
  "Serving / Scoop",
];

export const SUPPLEMENT_PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Card",
  "Other",
];

