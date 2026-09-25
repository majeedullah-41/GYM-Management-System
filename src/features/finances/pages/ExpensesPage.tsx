import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  PlusCircle,
  TrendingDown,
  HandCoins,
  Wallet,
  Tag,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { Modal } from "../../../components/ui/Modal";
import { Dialog } from "../../../components/ui/Dialog";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useToast } from "../../../components/feedback/ToastProvider";
import { formatCurrency, formatDate } from "../../../lib/utils/format";
import { usePrivacy, HideToggleButton, maskValue } from "../../../context/PrivacyContext";
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  EXPENSE_CATEGORIES,
  type ExpenseResponse,
} from "../../../lib/api/expenses";

const CUSTOM_CATEGORIES_KEY = "gym_custom_expense_categories";

function loadStoredCustomCategories(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function saveStoredCustomCategories(cats: string[]) {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(cats));
  } catch {
    // Ignore storage errors
  }
}

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

const PAGE_SIZE = 20;

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  iconClass,
  surfaceClass,
  onClick,
  active = false,
  hidden = false,
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  helper: string;
  iconClass: string;
  surfaceClass: string;
  onClick?: () => void;
  active?: boolean;
  hidden?: boolean;
}) {
  return (
    <Card
      className={`${surfaceClass} ${
        onClick ? "cursor-pointer transition-all duration-200 hover:-translate-y-0.5" : ""
      } ${active ? "ring-2 ring-primary ring-offset-1" : ""}`}
    >
      <div onClick={onClick} className="flex min-w-0 items-start gap-4">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
        >
          <Icon size={19} />
        </div>
        <div className="min-w-0">
          <div className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {label}
          </div>
          <div
            className="mt-1.5 break-words text-xl font-bold leading-tight text-text-primary"
            aria-hidden={hidden}
          >
            {hidden ? maskValue() : value}
          </div>
          <div className="mt-1.5 text-[11px] text-text-muted">{helper}</div>
        </div>
      </div>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <div className="space-y-3">
        <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
        <div className="h-7 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
      </div>
    </Card>
  );
}

export function ExpensesPage() {
  const { hidden } = usePrivacy();
  const { addToast } = useToast();
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [datePreset, setDatePreset] = useState("");

  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, datePreset]);

  const [customCategories, setCustomCategories] = useState<string[]>(loadStoredCustomCategories);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  const allCategories = useMemo(() => {
    const set = new Set<string>(EXPENSE_CATEGORIES);
    for (const c of customCategories) {
      if (c && c.trim()) set.add(c.trim());
    }
    for (const e of expenses) {
      if (e.category && e.category.trim()) set.add(e.category.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [customCategories, expenses]);

  const categoryFilterOptions = useMemo(
    () => [
      { value: "", label: "All Categories" },
      ...allCategories.map((c) => ({ value: c, label: c })),
    ],
    [allCategories],
  );

  const formCategoryOptions = useMemo(
    () => [
      ...allCategories.map((c) => ({ value: c, label: c })),
      { value: "__custom__", label: "+ Add new category..." },
    ],
    [allCategories],
  );

  const openCreate = () => {
    setEditingExpense(null);
    setFormData(EMPTY_FORM);
    setIsCustomCategory(false);
    setCustomCategoryInput("");
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (expense: ExpenseResponse) => {
    setEditingExpense(expense);
    setIsCustomCategory(false);
    setCustomCategoryInput("");
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
    const cat = isCustomCategory ? customCategoryInput.trim() : formData.category.trim();
    if (!cat) errors.category = "Category is required";
    const amount = parseInt(formData.amount, 10);
    if (!amount || amount <= 0) errors.amount = "Amount must be greater than zero";
    if (!formData.expense_date) errors.expense_date = "Date is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    const cat = isCustomCategory ? customCategoryInput.trim() : formData.category.trim();
    try {
      setSubmitting(true);
      const payload = {
        category: cat,
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

      if (!allCategories.includes(cat)) {
        const next = [...customCategories, cat];
        setCustomCategories(next);
        saveStoredCustomCategories(next);
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

  const totalAmount = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const avgExpense = useMemo(
    () => (expenses.length > 0 ? Math.round(totalAmount / expenses.length) : 0),
    [expenses, totalAmount],
  );

  const topCategory = useMemo(() => {
    if (expenses.length === 0) return { name: "None", amount: 0 };
    const catMap: Record<string, number> = {};
    for (const e of expenses) {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    }
    let best = "None";
    let max = 0;
    for (const [k, v] of Object.entries(catMap)) {
      if (v > max) {
        max = v;
        best = k;
      }
    }
    return { name: best, amount: max };
  }, [expenses]);

  const hasActiveFilters = Boolean(search || categoryFilter || datePreset);

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setDatePreset("");
  };

  const totalPages = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedExpenses = expenses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="expenses-page space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Expenses</h1>
          <p className="mt-1 text-xs text-text-muted">
            Track, categorize, and manage all gym operations and maintenance expenses.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <HideToggleButton />
          <Button variant="secondary" onClick={load}>
            <RefreshCw size={15} />
            Refresh
          </Button>
          <Button onClick={openCreate} className="bg-[#17613f] hover:bg-[#104b31]">
            <PlusCircle size={16} />
            Add Expense
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              icon={TrendingDown}
              label="Total Expenses"
              value={formatCurrency(totalAmount)}
              helper="Total expenditures recorded"
              iconClass="bg-red-100 text-red-600"
              surfaceClass="bg-gradient-to-br from-red-50 to-white"
              hidden={hidden}
              onClick={() => {
                setCategoryFilter("");
                setDatePreset("");
              }}
              active={!categoryFilter && !datePreset}
            />
            <StatCard
              icon={Wallet}
              label="Total Entries"
              value={expenses.length}
              helper="Expense transactions"
              iconClass="bg-blue-100 text-blue-600"
              surfaceClass="bg-gradient-to-br from-blue-50 to-white"
              hidden={hidden}
            />
            <StatCard
              icon={HandCoins}
              label="Average Expense"
              value={formatCurrency(avgExpense)}
              helper="Per transaction average"
              iconClass="bg-amber-100 text-amber-600"
              surfaceClass="bg-gradient-to-br from-amber-50 to-white"
              hidden={hidden}
            />
            <StatCard
              icon={Tag}
              label="Top Category"
              value={topCategory.name}
              helper={
                hidden
                  ? maskValue()
                  : topCategory.amount > 0
                    ? `${formatCurrency(topCategory.amount)} spent`
                    : "No entries"
              }
              iconClass="bg-purple-100 text-purple-600"
              surfaceClass="bg-gradient-to-br from-purple-50 to-white"
              hidden={hidden}
              onClick={() => {
                if (topCategory.name !== "None") {
                  setCategoryFilter(topCategory.name);
                }
              }}
              active={categoryFilter === topCategory.name && topCategory.name !== "None"}
            />
          </>
        )}
      </div>

      {/* Filter & Search Toolbar Card */}
      <Card className="p-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px] flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                name="expense_search"
                placeholder="Search expenses by category, vendor, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-8 text-xs text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <Select
              options={categoryFilterOptions}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-44 text-xs"
            />

            <Select
              options={DATE_PRESETS}
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="w-36 text-xs"
            />

            {hasActiveFilters && (
              <Button
                variant="secondary"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                <RotateCcw size={13} />
                Reset
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end lg:self-center text-xs text-text-muted font-medium">
            <span>
              Showing {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
            </span>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading && <LoadingState message="Loading expenses..." />}
      {error && !loading && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && expenses.length === 0 && (
        <EmptyState
          title={hasActiveFilters ? "No expenses found" : "No expenses recorded yet"}
          message={
            hasActiveFilters
              ? "Try adjusting your search criteria or reset active filters."
              : "Record your first expense to begin tracking gym operating costs."
          }
          action={
            !hasActiveFilters
              ? { label: "+ Add Expense", onClick: openCreate }
              : { label: "Clear Filters", onClick: resetFilters }
          }
        />
      )}

      {!loading && !error && expenses.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-[#fafbfa] text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Notes / Details</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedExpenses.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-border transition-colors hover:bg-[#f6faf7] last:border-b-0"
                  >
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {formatDate(e.expense_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200">
                        <Tag size={11} className="text-emerald-600" />
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted max-w-xs truncate">
                      {e.notes || e.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-text-primary whitespace-nowrap">
                      {hidden ? maskValue() : formatCurrency(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEdit(e)}
                          className="h-7 px-2 text-xs"
                          title="Edit expense"
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setDeleteTarget(e)}
                          className="h-7 px-2 text-xs text-danger hover:text-danger hover:border-danger/30"
                          title="Delete expense"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-border bg-[#fafbfa] px-4 py-3 text-xs text-text-muted">
            <span>
              Showing {Math.min((safePage - 1) * PAGE_SIZE + 1, expenses.length)}–
              {Math.min(safePage * PAGE_SIZE, expenses.length)} of {expenses.length}{" "}
              {expenses.length === 1 ? "expense" : "expenses"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={15} />
              </Button>
              <span className="font-medium text-text-primary">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingExpense ? "Edit Expense" : "Add Expense"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={submitting}
              onClick={handleSubmit}
              className="bg-[#17613f] hover:bg-[#104b31]"
            >
              {editingExpense ? "Save Changes" : "Record Expense"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          {isCustomCategory ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-medium text-text-primary">
                  New Category Name *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCategory(false);
                    setCustomCategoryInput("");
                    setFormData((p) => ({ ...p, category: "" }));
                  }}
                  className="text-[11px] font-semibold text-[#17613f] hover:underline cursor-pointer"
                >
                  ← Select from list
                </button>
              </div>
              <input
                type="text"
                name="custom_category"
                autoFocus
                placeholder="e.g. Generator Fuel, Water Dispenser, Repairs..."
                value={customCategoryInput}
                onChange={(e) => {
                  setCustomCategoryInput(e.target.value);
                  setFormData((p) => ({ ...p, category: e.target.value }));
                }}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {formErrors.category && (
                <p className="text-xs text-red-500">{formErrors.category}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-medium text-text-primary">Category *</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCategory(true);
                    setCustomCategoryInput("");
                    setFormData((p) => ({ ...p, category: "" }));
                  }}
                  className="text-[11px] font-semibold text-[#17613f] hover:underline cursor-pointer"
                >
                  + Add new category
                </button>
              </div>
              <Select
                options={[{ value: "", label: "Select category..." }, ...formCategoryOptions]}
                value={formData.category}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setIsCustomCategory(true);
                    setCustomCategoryInput("");
                    setFormData((p) => ({ ...p, category: "" }));
                  } else {
                    setFormData((p) => ({ ...p, category: e.target.value }));
                  }
                }}
                error={formErrors.category}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-text-primary">Amount (PKR) *</label>
              <input
                type="number"
                name="expense_amount"
                min={1}
                placeholder="e.g. 5000"
                value={formData.amount}
                onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {formErrors.amount && <p className="text-xs text-red-500">{formErrors.amount}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-text-primary">Date *</label>
              <input
                type="date"
                name="expense_date"
                value={formData.expense_date}
                onChange={(e) => setFormData((p) => ({ ...p, expense_date: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {formErrors.expense_date && (
                <p className="text-xs text-red-500">{formErrors.expense_date}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-text-primary">
              Notes <span className="text-text-muted">(optional)</span>
            </label>
            <textarea
              name="expense_notes"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="Vendor info, item details, receipt reference..."
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Expense"
        message={`Are you sure you want to delete this ${deleteTarget?.category ?? ""} expense of ${deleteTarget ? (hidden ? maskValue() : formatCurrency(deleteTarget.amount)) : ""}? This action cannot be undone.`}
        confirmLabel="Delete Expense"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
