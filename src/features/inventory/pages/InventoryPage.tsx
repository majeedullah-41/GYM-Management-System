import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Package,
  Boxes,
  AlertTriangle,
  Wallet,
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  SlidersHorizontal,
  History,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Modal } from "../../../components/ui/Modal";
import { Dialog } from "../../../components/ui/Dialog";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useToast } from "../../../components/feedback/ToastProvider";
import { formatCurrency, formatDate } from "../../../lib/utils/format";
import {
  usePrivacy,
  HideToggleButton,
} from "../../../context/PrivacyContext";
import {
  listSupplementItems,
  createSupplementItem,
  updateSupplementItem,
  deleteSupplementItem,
  adjustSupplementStock,
  listInventoryMovements,
  SUPPLEMENT_CATEGORIES,
  SUPPLEMENT_UNITS,
  type ItemResponse,
  type InventoryMovementResponse,
} from "../../../lib/api/supplements";

type TabType = "items" | "movements";

interface ItemFormState {
  name: string;
  category: string;
  brand: string;
  unit: string;
  cost_price: string;
  selling_price: string;
  initial_stock: string;
  min_stock_level: string;
  notes: string;
  is_active: boolean;
}

const EMPTY_ITEM_FORM: ItemFormState = {
  name: "",
  category: SUPPLEMENT_CATEGORIES[0],
  brand: "",
  unit: SUPPLEMENT_UNITS[0],
  cost_price: "",
  selling_price: "",
  initial_stock: "0",
  min_stock_level: "5",
  notes: "",
  is_active: true,
};

interface AdjustFormState {
  adjustment_type: "add" | "subtract" | "set";
  quantity: string;
  movement_date: string;
  reason: string;
}

export function InventoryPage() {
  const { addToast } = useToast();
  const { mask } = usePrivacy();

  const [activeTab, setActiveTab] = useState<TabType>("items");
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [movements, setMovements] = useState<InventoryMovementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<
    "all" | "in_stock" | "low_stock" | "out_of_stock"
  >("all");
  const [showInactive, setShowInactive] = useState(false);

  // Movement filters
  const [movementItemFilter, setMovementItemFilter] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("");

  // Add / Edit Item Modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemResponse | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(EMPTY_ITEM_FORM);
  const [submittingItem, setSubmittingItem] = useState(false);

  // Stock Adjustment Modal
  const [adjustingItem, setAdjustingItem] = useState<ItemResponse | null>(null);
  const [adjustForm, setAdjustForm] = useState<AdjustFormState>({
    adjustment_type: "add",
    quantity: "",
    movement_date: new Date().toISOString().split("T")[0],
    reason: "",
  });
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Delete Item Dialog
  const [deletingItem, setDeletingItem] = useState<ItemResponse | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsData, movementsData] = await Promise.all([
        listSupplementItems({ active_only: false }),
        listInventoryMovements({
          item_id: movementItemFilter || undefined,
          movement_type: movementTypeFilter || undefined,
        }),
      ]);
      setItems(itemsData);
      setMovements(movementsData);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [movementItemFilter, movementTypeFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!showInactive && !item.is_active) return false;
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (stockFilter !== "all" && item.stock_status !== stockFilter)
        return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchBrand = (item.brand ?? "").toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchCat) return false;
      }
      return true;
    });
  }, [items, showInactive, categoryFilter, stockFilter, search]);

  const stats = useMemo(() => {
    const activeItems = items.filter((i) => i.is_active);
    const totalItems = activeItems.length;
    const totalUnits = activeItems.reduce(
      (acc, i) => acc + Math.max(0, i.stock_quantity),
      0,
    );
    const lowStock = activeItems.filter(
      (i) => i.stock_status === "low_stock",
    ).length;
    const outOfStock = activeItems.filter(
      (i) => i.stock_status === "out_of_stock",
    ).length;
    const costValue = activeItems.reduce(
      (acc, i) => acc + i.stock_value_cost,
      0,
    );
    const retailValue = activeItems.reduce(
      (acc, i) => acc + i.stock_value_retail,
      0,
    );
    return {
      totalItems,
      totalUnits,
      lowStock,
      outOfStock,
      costValue,
      retailValue,
    };
  }, [items]);

  const openCreateItem = () => {
    setEditingItem(null);
    setItemForm(EMPTY_ITEM_FORM);
    setItemModalOpen(true);
  };

  const openEditItem = (item: ItemResponse) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      brand: item.brand ?? "",
      unit: item.unit,
      cost_price: String(item.cost_price),
      selling_price: String(item.selling_price),
      initial_stock: String(item.stock_quantity),
      min_stock_level: String(item.min_stock_level),
      notes: item.notes ?? "",
      is_active: item.is_active,
    });
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = Number(itemForm.cost_price);
    const selling = Number(itemForm.selling_price);
    const minStock = Number(itemForm.min_stock_level);

    if (!itemForm.name.trim()) {
      addToast({ title: "Item name is required", variant: "error" });
      return;
    }
    if (Number.isNaN(cost) || cost < 0 || Number.isNaN(selling) || selling < 0) {
      addToast({ title: "Enter valid non-negative prices", variant: "error" });
      return;
    }

    setSubmittingItem(true);
    try {
      if (editingItem) {
        await updateSupplementItem(editingItem.id, {
          name: itemForm.name.trim(),
          category: itemForm.category,
          brand: itemForm.brand.trim() || null,
          unit: itemForm.unit,
          cost_price: Math.round(cost),
          selling_price: Math.round(selling),
          min_stock_level: Math.max(0, Math.round(minStock || 0)),
          notes: itemForm.notes.trim() || null,
          is_active: itemForm.is_active,
        });
        addToast({ title: "Inventory item updated", variant: "success" });
      } else {
        const initStock = Number(itemForm.initial_stock || "0");
        await createSupplementItem({
          name: itemForm.name.trim(),
          category: itemForm.category,
          brand: itemForm.brand.trim() || null,
          unit: itemForm.unit,
          cost_price: Math.round(cost),
          selling_price: Math.round(selling),
          initial_stock: Math.max(0, Math.round(initStock || 0)),
          min_stock_level: Math.max(0, Math.round(minStock || 0)),
          notes: itemForm.notes.trim() || null,
        });
        addToast({ title: "Supplement item added to inventory", variant: "success" });
      }
      setItemModalOpen(false);
      await loadData();
    } catch (err) {
      addToast({ title: "Failed to save item", message: String(err), variant: "error" });
    } finally {
      setSubmittingItem(false);
    }
  };

  const openAdjustModal = (item: ItemResponse) => {
    setAdjustingItem(item);
    setAdjustForm({
      adjustment_type: "add",
      quantity: "",
      movement_date: new Date().toISOString().split("T")[0],
      reason: "",
    });
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    const qty = Number(adjustForm.quantity);
    if (Number.isNaN(qty) || qty < 0 || (adjustForm.adjustment_type !== "set" && qty <= 0)) {
      addToast({ title: "Enter a valid quantity", variant: "error" });
      return;
    }

    setSubmittingAdjust(true);
    try {
      await adjustSupplementStock({
        item_id: adjustingItem.id,
        adjustment_type: adjustForm.adjustment_type,
        quantity: Math.round(qty),
        movement_date: adjustForm.movement_date,
        reason: adjustForm.reason.trim() || null,
      });
      addToast({ title: "Stock updated successfully", variant: "success" });
      setAdjustingItem(null);
      await loadData();
    } catch (err) {
      addToast({ title: "Stock adjustment failed", message: String(err), variant: "error" });
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    setSubmittingDelete(true);
    try {
      await deleteSupplementItem(deletingItem.id);
      addToast({ title: "Item deleted", variant: "success" });
      setDeletingItem(null);
      await loadData();
    } catch (err) {
      addToast({
        title: "Cannot delete item",
        message: String(err),
        variant: "error",
      });
    } finally {
      setSubmittingDelete(false);
    }
  };

  if (loading && items.length === 0) {
    return <LoadingState message="Loading inventory..." />;
  }

  if (error && items.length === 0) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Supplement Inventory
          </h1>
          <p className="text-xs text-text-muted">
            Track supplement products, stock levels, low-stock alerts, and stock movements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HideToggleButton />
          <Button variant="secondary" size="sm" onClick={() => void loadData()}>
            <RefreshCw size={15} className="mr-1.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreateItem}>
            <PlusCircle size={16} className="mr-1.5" />
            Add Supplement Item
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-muted">Active Items</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {stats.totalItems}
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                {stats.totalUnits} total units in stock
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
              <Package size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-muted">
                Stock Value (Cost)
              </p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {mask(formatCurrency(stats.costValue))}
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Purchase value of current stock
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700">
              <Wallet size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-muted">
                Retail Value (Selling)
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {mask(formatCurrency(stats.retailValue))}
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Est. profit:{" "}
                {mask(
                  formatCurrency(Math.max(0, stats.retailValue - stats.costValue)),
                )}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700">
              <Boxes size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-muted">Stock Alerts</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {stats.lowStock + stats.outOfStock}
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                {stats.outOfStock} out of stock · {stats.lowStock} low stock
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <AlertTriangle size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("items")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "items"
              ? "bg-[#122f27] text-white shadow-xs"
              : "text-text-secondary hover:bg-surface-hover"
          }`}
        >
          <Package size={15} />
          Inventory Items ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("movements")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "movements"
              ? "bg-[#122f27] text-white shadow-xs"
              : "text-text-secondary hover:bg-surface-hover"
          }`}
        >
          <History size={15} />
          Stock Movement Log ({movements.length})
        </button>
      </div>

      {activeTab === "items" ? (
        <Card className="p-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by item name, brand, or category..."
                className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: "", label: "All Categories" },
                  ...SUPPLEMENT_CATEGORIES.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Select
                value={stockFilter}
                onChange={(e) =>
                  setStockFilter(
                    e.target.value as
                      | "all"
                      | "in_stock"
                      | "low_stock"
                      | "out_of_stock",
                  )
                }
                options={[
                  { value: "all", label: "All Stock Levels" },
                  { value: "in_stock", label: "In Stock" },
                  { value: "low_stock", label: "Low Stock" },
                  { value: "out_of_stock", label: "Out of Stock" },
                ]}
              />
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                Show Inactive
              </label>
            </div>
          </div>

          {/* Items Table */}
          {filteredItems.length === 0 ? (
            <EmptyState
              title="No supplement items found"
              message="Add your first supplement product to start tracking inventory, purchases, and POS sales."
              action={{
                label: "Add Supplement Item",
                onClick: openCreateItem,
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-alt text-[11px] font-semibold uppercase text-text-muted">
                    <th className="px-3 py-2.5">Item / Brand</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5 text-right">Cost Price</th>
                    <th className="px-3 py-2.5 text-right">Selling Price</th>
                    <th className="px-3 py-2.5 text-center">Stock</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="px-3 py-2.5 text-right">Stock Value</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-surface-hover ${
                        !item.is_active ? "opacity-55" : ""
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-text-primary">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {item.brand ? `${item.brand} · ` : ""}
                          Unit: {item.unit}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">
                        {item.category}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-text-primary">
                        {mask(formatCurrency(item.cost_price))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
                        {mask(formatCurrency(item.selling_price))}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-sm font-bold text-text-primary">
                          {item.stock_quantity}
                        </span>{" "}
                        <span className="text-[11px] text-text-muted">
                          {item.unit}
                        </span>
                        <div className="text-[10px] text-text-muted">
                          Min: {item.min_stock_level}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {item.stock_status === "in_stock" && (
                          <Badge variant="success">In Stock</Badge>
                        )}
                        {item.stock_status === "low_stock" && (
                          <Badge variant="warning">Low Stock</Badge>
                        )}
                        {item.stock_status === "out_of_stock" && (
                          <Badge variant="danger">Out of Stock</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-text-primary">
                        {mask(formatCurrency(item.stock_value_cost))}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openAdjustModal(item)}
                            title="Adjust Stock"
                          >
                            <SlidersHorizontal size={13} className="mr-1" />
                            Stock
                          </Button>
                          <button
                            type="button"
                            onClick={() => openEditItem(item)}
                            className="rounded-md p-1.5 text-text-secondary hover:bg-surface-alt hover:text-text-primary"
                            title="Edit Item"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingItem(item)}
                            className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                            title="Delete Item"
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
        </Card>
      ) : (
        <Card className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={movementItemFilter}
              onChange={(e) => setMovementItemFilter(e.target.value)}
              options={[
                { value: "", label: "All Items" },
                ...items.map((i) => ({ value: i.id, label: i.name })),
              ]}
            />
            <Select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              options={[
                { value: "", label: "All Movement Types" },
                { value: "purchase", label: "Purchases (Restock)" },
                { value: "sale", label: "POS Sales" },
                { value: "adjustment", label: "Manual Adjustments" },
                { value: "initial", label: "Initial Stock" },
              ]}
            />
          </div>

          {movements.length === 0 ? (
            <EmptyState
              title="No stock movements recorded yet"
              message="Movements are automatically logged when you purchase from suppliers, sell items, or adjust stock."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-alt text-[11px] font-semibold uppercase text-text-muted">
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Item</th>
                    <th className="px-3 py-2.5">Type</th>
                    <th className="px-3 py-2.5 text-right">Change</th>
                    <th className="px-3 py-2.5 text-right">Stock Balance</th>
                    <th className="px-3 py-2.5">Reason / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-hover">
                      <td className="px-3 py-2.5 text-text-secondary">
                        {formatDate(m.movement_date)}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-text-primary">
                        {m.item_name}
                      </td>
                      <td className="px-3 py-2.5">
                        {m.movement_type === "purchase" && (
                          <Badge variant="success">Purchase</Badge>
                        )}
                        {m.movement_type === "sale" && (
                          <Badge variant="info">Sale</Badge>
                        )}
                        {m.movement_type === "adjustment" && (
                          <Badge variant="warning">Adjustment</Badge>
                        )}
                        {m.movement_type === "initial" && (
                          <Badge variant="info">Initial</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            m.quantity_change >= 0
                              ? "text-emerald-700"
                              : "text-red-600"
                          }`}
                        >
                          {m.quantity_change >= 0 ? (
                            <ArrowUpRight size={13} />
                          ) : (
                            <ArrowDownRight size={13} />
                          )}
                          {m.quantity_change > 0
                            ? `+${m.quantity_change}`
                            : m.quantity_change}{" "}
                          {m.item_unit}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-secondary">
                        {m.previous_stock} →{" "}
                        <span className="font-semibold text-text-primary">
                          {m.new_stock}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">
                        {m.reason ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Create / Edit Item Modal */}
      <Modal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={
          editingItem ? "Edit Supplement Item" : "Add New Supplement Item"
        }
      >
        <form onSubmit={(e) => void handleSaveItem(e)} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Item Name *"
              value={itemForm.name}
              onChange={(e) =>
                setItemForm({ ...itemForm, name: e.target.value })
              }
              placeholder="e.g. Gold Standard Whey 5lbs"
              required
            />
            <Input
              label="Brand"
              value={itemForm.brand}
              onChange={(e) =>
                setItemForm({ ...itemForm, brand: e.target.value })
              }
              placeholder="e.g. Optimum Nutrition"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Category *"
              value={itemForm.category}
              onChange={(e) =>
                setItemForm({ ...itemForm, category: e.target.value })
              }
              options={SUPPLEMENT_CATEGORIES.map((c) => ({
                value: c,
                label: c,
              }))}
            />
            <Select
              label="Unit *"
              value={itemForm.unit}
              onChange={(e) =>
                setItemForm({ ...itemForm, unit: e.target.value })
              }
              options={SUPPLEMENT_UNITS.map((u) => ({ value: u, label: u }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Default Cost Price (PKR) *"
              type="number"
              min={0}
              value={itemForm.cost_price}
              onChange={(e) =>
                setItemForm({ ...itemForm, cost_price: e.target.value })
              }
              placeholder="e.g. 18500"
              required
            />
            <Input
              label="Selling Price (PKR) *"
              type="number"
              min={0}
              value={itemForm.selling_price}
              onChange={(e) =>
                setItemForm({ ...itemForm, selling_price: e.target.value })
              }
              placeholder="e.g. 22000"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {!editingItem && (
              <Input
                label="Opening Stock Quantity"
                type="number"
                min={0}
                value={itemForm.initial_stock}
                onChange={(e) =>
                  setItemForm({ ...itemForm, initial_stock: e.target.value })
                }
              />
            )}
            <Input
              label="Low Stock Alert Threshold"
              type="number"
              min={0}
              value={itemForm.min_stock_level}
              onChange={(e) =>
                setItemForm({ ...itemForm, min_stock_level: e.target.value })
              }
            />
          </div>

          {editingItem && (
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={itemForm.is_active}
                onChange={(e) =>
                  setItemForm({ ...itemForm, is_active: e.target.checked })
                }
              />
              Item is active
            </label>
          )}

          <Input
            label="Notes"
            value={itemForm.notes}
            onChange={(e) =>
              setItemForm({ ...itemForm, notes: e.target.value })
            }
            placeholder="Flavor, batch info, or storage notes..."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setItemModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submittingItem}>
              {submittingItem
                ? "Saving..."
                : editingItem
                  ? "Save Changes"
                  : "Create Item"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={Boolean(adjustingItem)}
        onClose={() => setAdjustingItem(null)}
        title={`Adjust Stock — ${adjustingItem?.name ?? ""}`}
      >
        {adjustingItem && (
          <form
            onSubmit={(e) => void handleAdjustStock(e)}
            className="space-y-4"
          >
            <div className="rounded-lg border border-border bg-surface-alt p-3 text-xs">
              <span className="text-text-muted">Current Stock: </span>
              <span className="font-bold text-text-primary">
                {adjustingItem.stock_quantity} {adjustingItem.unit}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Adjustment Action"
                value={adjustForm.adjustment_type}
                onChange={(e) =>
                  setAdjustForm({
                    ...adjustForm,
                    adjustment_type: e.target.value as
                      | "add"
                      | "subtract"
                      | "set",
                  })
                }
                options={[
                  { value: "add", label: "Add Stock (+)" },
                  { value: "subtract", label: "Remove / Damaged Stock (-)" },
                  { value: "set", label: "Set Exact Stock (=)" },
                ]}
              />
              <Input
                label={`Quantity (${adjustingItem.unit}) *`}
                type="number"
                min={adjustForm.adjustment_type === "set" ? 0 : 1}
                value={adjustForm.quantity}
                onChange={(e) =>
                  setAdjustForm({ ...adjustForm, quantity: e.target.value })
                }
                required
              />
            </div>

            <Input
              label="Date"
              type="date"
              value={adjustForm.movement_date}
              onChange={(e) =>
                setAdjustForm({ ...adjustForm, movement_date: e.target.value })
              }
              required
            />

            <Input
              label="Reason / Note"
              value={adjustForm.reason}
              onChange={(e) =>
                setAdjustForm({ ...adjustForm, reason: e.target.value })
              }
              placeholder="e.g. Stock count correction, expired tub..."
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAdjustingItem(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submittingAdjust}>
                {submittingAdjust ? "Updating..." : "Update Stock"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Item Dialog */}
      <Dialog
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={() => void handleDeleteItem()}
        title="Delete Supplement Item"
        message={`Are you sure you want to delete "${deletingItem?.name ?? ""}"? Items with existing purchase or sales history cannot be deleted and should be marked inactive instead.`}
        confirmLabel={submittingDelete ? "Deleting..." : "Delete"}
        variant="danger"
      />
    </div>
  );
}

