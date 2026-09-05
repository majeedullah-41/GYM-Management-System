import { useCallback, useEffect, useState } from "react";
import { Search, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { Modal } from "../../../components/ui/Modal";
import { Dialog } from "../../../components/ui/Dialog";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useToast } from "../../../components/feedback/ToastProvider";
import { formatCurrency } from "../../../lib/utils/format";
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  EXPENSE_CATEGORIES,
  type ExpenseResponse,
} from "../../../lib/api/expenses";

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
];

const FORM_CATEGORIES = EXPENSE_CATEGORIES.map((c) => ({
  value: c,
  label: c,
}));

interface FormData {
  category: string;
  amount: string;
  expense_date: string;
  notes: string;
}

const EMPTY_FORM: FormData = {
  category: "",
  amount: "",
  expense_date: new Date().toISOString().split("T")[0],
  notes: "",
};

const DATE_PRESETS = [
  { value: "", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

function getDateRange(preset: string): { from: string; to: string } | null {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  switch (preset) {
    case "today":
      return { from: fmt(now), to: fmt(now) };
    case "week": {
      const s = new Date(now);
      s.setDate(now.getDate() - now.getDay());
      return { from: fmt(s), to: fmt(now) };
    }
    case "month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(s), to: fmt(now) };
    }
    case "year": {
      const s = new Date(now.getFullYear(), 0, 1);
      return { from: fmt(s), to: fmt(now) };
    }
    default:
      return null;
  }
}

export function ExpensesPage() {
  const { addToast } = useToast();
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [datePreset, setDatePreset] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ExpenseResponse | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const range = getDateRange(datePreset);
      setExpenses(
        await listExpenses({
          search,
          category: categoryFilter || undefined,
          date_from: range?.from,
          date_to: range?.to,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, datePreset]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingExpense(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (expense: ExpenseResponse) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      amount: String(expense.amount),
      expense_date: expense.expense_date,
      notes: expense.notes ?? "",
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.category) errors.category = "Category is required";
    const amount = parseInt(formData.amount, 10);
    if (!amount || amount <= 0) errors.amount = "Amount must be greater than zero";
    if (!formData.expense_date) errors.expense_date = "Date is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      setSubmitting(true);
      const payload = {
        category: formData.category,
        amount: parseInt(formData.amount, 10),
        expense_date: formData.expense_date,
        description: editingExpense?.description ?? null,
        payment_method: editingExpense?.payment_method ?? null,
        vendor: editingExpense?.vendor ?? null,
        notes: formData.notes.trim() || null,
      };

      if (editingExpense) {
        await updateExpense(editingExpense.id, payload);
        addToast({ variant: "success", title: "Expense updated" });
      } else {
        await createExpense(payload);
        addToast({ variant: "success", title: "Expense recorded" });
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to save expense",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpense(deleteTarget.id);
      addToast({ variant: "success", title: "Expense deleted" });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to delete expense",
      });
    }
  };

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense"
        description="Track and manage gym expenses."
        action={{ label: "+ Add Expense", onClick: openCreate }}
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            name="expense_search"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <Select
          options={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-44"
        />
        <Select
          options={DATE_PRESETS}
          value={datePreset}
          onChange={(e) => setDatePreset(e.target.value)}
          className="w-40"
        />
      </div>

      {totalAmount > 0 && !loading && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm">
            <span className="text-text-muted">Total:</span>
            <span className="font-semibold text-text-primary">{formatCurrency(totalAmount)}</span>
          </div>
          <span className="text-xs text-text-muted">
            {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {loading && <LoadingState message="Loading expenses..." />}
      {error && !loading && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && expenses.length === 0 && (
        <EmptyState
          title={search || categoryFilter || datePreset ? "No expenses found" : "No expenses yet"}
          message={
            search || categoryFilter || datePreset
              ? "Try adjusting your filters."
              : "Record your first expense to start tracking gym costs."
          }
        />
      )}

      {!loading && !error && expenses.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary-bg">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 text-text-muted">{e.expense_date}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-secondary-bg px-2.5 py-0.5 text-xs font-medium text-text-primary">
                      {e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-text-primary">
                    {formatCurrency(e.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(e)}
                        className="rounded p-1 text-text-muted hover:bg-secondary-bg hover:text-text-primary transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(e)}
                        className="rounded p-1 text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingExpense ? "Edit Expense" : "Add Expense"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleSubmit}>
              {editingExpense ? "Save Changes" : "Add Expense"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Category *"
            options={[{ value: "", label: "Select category..." }, ...FORM_CATEGORIES]}
            value={formData.category}
            onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
            error={formErrors.category}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Amount (PKR) *</label>
              <input
                type="number"
                name="expense_amount"
                min={1}
                placeholder="e.g. 5000"
                value={formData.amount}
                onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {formErrors.amount && <p className="text-xs text-red-500">{formErrors.amount}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Date *</label>
              <input
                type="date"
                name="expense_date"
                value={formData.expense_date}
                onChange={(e) => setFormData((p) => ({ ...p, expense_date: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {formErrors.expense_date && (
                <p className="text-xs text-red-500">{formErrors.expense_date}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              Notes <span className="text-text-muted">(optional)</span>
            </label>
            <textarea
              name="expense_notes"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              rows={2}
              placeholder="Additional notes"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Dialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Expense"
        message={`Are you sure you want to delete this ${deleteTarget?.category ?? ""} expense of ${deleteTarget ? formatCurrency(deleteTarget.amount) : ""}? This action cannot be undone.`}
        confirmLabel="Delete Expense"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
