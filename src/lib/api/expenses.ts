import { invokeCommand } from "../tauri";

export interface ExpenseResponse {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  payment_method: string | null;
  vendor: string | null;
  notes: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseRequest {
  category: string;
  amount: number;
  expense_date: string;
  description: string | null;
  payment_method: string | null;
  vendor: string | null;
  notes: string | null;
}

export interface UpdateExpenseRequest {
  category: string;
  amount: number;
  expense_date: string;
  description: string | null;
  payment_method: string | null;
  vendor: string | null;
  notes: string | null;
}

export async function createExpense(
  request: CreateExpenseRequest,
): Promise<ExpenseResponse> {
  return invokeCommand<ExpenseResponse>("create_expense", { request });
}

export async function getExpense(id: string): Promise<ExpenseResponse> {
  return invokeCommand<ExpenseResponse>("get_expense", { id });
}

export async function updateExpense(
  id: string,
  request: UpdateExpenseRequest,
): Promise<ExpenseResponse> {
  return invokeCommand<ExpenseResponse>("update_expense", { id, request });
}

export async function deleteExpense(id: string): Promise<void> {
  return invokeCommand<void>("delete_expense", { id });
}

export async function restoreExpense(id: string): Promise<ExpenseResponse> {
  return invokeCommand<ExpenseResponse>("restore_expense", { id });
}

export async function listExpenses(args: {
  search?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
}): Promise<ExpenseResponse[]> {
  return invokeCommand<ExpenseResponse[]>("list_expenses", {
    search: args.search ?? null,
    category: args.category ?? null,
    dateFrom: args.date_from ?? null,
    dateTo: args.date_to ?? null,
  });
}

export async function totalExpenses(
  dateFrom: string,
  dateTo: string,
): Promise<number> {
  return invokeCommand<number>("total_expenses", {
    dateFrom: dateFrom,
    dateTo: dateTo,
  });
}

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Electricity",
  "Water",
  "Gas",
  "Internet",
  "Equipment",
  "Maintenance",
  "Cleaning",
  "Supplies",
  "Staff",
  "Marketing",
  "Salary",
  "Other",
];

export const EXPENSE_PAYMENT_METHODS = [
  "Cash",
  "Card",
  "Bank Transfer",
  "Other",
];
