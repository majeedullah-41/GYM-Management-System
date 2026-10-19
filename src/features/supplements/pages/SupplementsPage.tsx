import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Truck,
  ShoppingCart,
  HandCoins,
  Store,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
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
import { capitalizeName, formatCurrency, formatDate } from "../../../lib/utils/format";
import {
  usePrivacy,
  HideToggleButton,
} from "../../../context/PrivacyContext";
import { useGym } from "../../../context/GymContext";
import { WhatsAppIcon } from "../../../components/whatsapp/WhatsAppIcon";
import {
  WhatsAppPreviewModal,
  type WhatsAppTarget,
} from "../../../components/whatsapp/WhatsAppPreviewModal";
import { listMembers, type MemberResponse } from "../../../lib/api/members";
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listSupplementItems,
  createSupplementItem,
  listSupplementPurchases,
  createSupplementPurchase,
  deleteSupplementPurchase,
  listSupplierPayments,
  createSupplierPayment,
  deleteSupplierPayment,
  listSupplementSales,
  createSupplementSale,
  deleteSupplementSale,
  getSupplementSummary,
  SUPPLEMENT_CATEGORIES,
  SUPPLEMENT_UNITS,
  SUPPLEMENT_PAYMENT_METHODS,
  type SupplierResponse,
  type ItemResponse,
  type PurchaseResponse,
  type SupplierPaymentResponse,
  type SaleResponse,
  type SupplementSummaryResponse,
} from "../../../lib/api/supplements";

type SupplementTab = "suppliers" | "purchases" | "payments" | "sales";

const todayStr = () => new Date().toISOString().split("T")[0];

export function SupplementsPage() {
  const { addToast } = useToast();
  const { mask } = usePrivacy();
  const { gymName } = useGym();

  const [activeTab, setActiveTab] = useState<SupplementTab>("suppliers");
  const [summary, setSummary] = useState<SupplementSummaryResponse | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [purchases, setPurchases] = useState<PurchaseResponse[]>([]);
  const [payments, setPayments] = useState<SupplierPaymentResponse[]>([]);
  const [sales, setSales] = useState<SaleResponse[]>([]);
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [whatsAppTarget, setWhatsAppTarget] = useState<WhatsAppTarget | null>(null);

  const openSupplierWhatsApp = (supplier: SupplierResponse) => {
    setWhatsAppTarget({
      recipientType: "supplier",
      recipientName: supplier.name,
      rawPhone: supplier.phone,
      variables: {
        supplier_name: supplier.name,
        company: supplier.company || supplier.name,
        total_purchased: formatCurrency(supplier.total_purchased),
        total_paid: formatCurrency(supplier.total_paid),
        due_amount: formatCurrency(supplier.total_due),
        gym_name: gymName || "Gym",
      },
    });
  };

  // Filters
  const [supplierSearch, setSupplierSearch] = useState("");
  const [duesOnly, setDuesOnly] = useState(false);
  const [purchaseSupplierFilter, setPurchaseSupplierFilter] = useState("");
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState("");
  const [paymentSupplierFilter, setPaymentSupplierFilter] = useState("");
  const [saleSearch, setSaleSearch] = useState("");

  // Supplier Modal
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] =
    useState<SupplierResponse | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    is_active: true,
  });
  const [savingSupplier, setSavingSupplier] = useState(false);

  // Purchase Modal
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: "",
    item_id: "",
    quantity: "1",
    unit_cost: "",
    paid_amount: "",
    payment_method: "Cash",
    purchase_date: todayStr(),
    invoice_number: "",
    notes: "",
  });
  const [savingPurchase, setSavingPurchase] = useState(false);

  // Quick Add Item inside Purchase Modal
  const [quickItemModalOpen, setQuickItemModalOpen] = useState(false);
  const [quickItemForm, setQuickItemForm] = useState({
    name: "",
    category: SUPPLEMENT_CATEGORIES[0],
    brand: "",
    unit: SUPPLEMENT_UNITS[0],
    cost_price: "",
    selling_price: "",
  });
  const [savingQuickItem, setSavingQuickItem] = useState(false);

  // Supplier Payment (Pay Due) Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    supplier_id: "",
    purchase_id: "",
    amount: "",
    payment_method: "Cash",
    payment_date: todayStr(),
    reference: "",
    notes: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);

  // POS Sale Modal
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [customerMode, setCustomerMode] = useState<"walkin" | "member">(
    "walkin",
  );
  const [saleForm, setSaleForm] = useState({
    member_id: "",
    customer_name: "",
    item_id: "",
    quantity: "1",
    unit_price: "",
    discount: "0",
    payment_method: "Cash",
    sale_date: todayStr(),
    notes: "",
  });
  const [savingSale, setSavingSale] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "supplier" | "purchase" | "payment" | "sale";
    id: string;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        summaryData,
        suppliersData,
        itemsData,
        purchasesData,
        paymentsData,
        salesData,
        membersData,
      ] = await Promise.all([
        getSupplementSummary(),
        listSuppliers({ active_only: false }),
        listSupplementItems({ active_only: false }),
        listSupplementPurchases(),
        listSupplierPayments(),
        listSupplementSales(),
        listMembers({}),
      ]);
      setSummary(summaryData);
      setSuppliers(suppliersData);
      setItems(itemsData);
      setPurchases(purchasesData);
      setPayments(paymentsData);
      setSales(salesData);
      setMembers(membersData);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Filtered Lists
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (duesOnly && s.total_due <= 0) return false;
      if (supplierSearch.trim()) {
        const q = supplierSearch.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchComp = (s.company ?? "").toLowerCase().includes(q);
        const matchPhone = (s.phone ?? "").toLowerCase().includes(q);
        if (!matchName && !matchComp && !matchPhone) return false;
      }
      return true;
    });
  }, [suppliers, duesOnly, supplierSearch]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (purchaseSupplierFilter && p.supplier_id !== purchaseSupplierFilter)
        return false;
      if (purchaseStatusFilter && p.payment_status !== purchaseStatusFilter)
        return false;
      return true;
    });
  }, [purchases, purchaseSupplierFilter, purchaseStatusFilter]);

  const filteredPayments = useMemo(() => {
    return payments.filter((sp) => {
      if (paymentSupplierFilter && sp.supplier_id !== paymentSupplierFilter)
        return false;
      return true;
    });
  }, [payments, paymentSupplierFilter]);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (saleSearch.trim()) {
        const q = saleSearch.toLowerCase();
        const matchCust = s.customer_name.toLowerCase().includes(q);
        const matchItem = s.item_name.toLowerCase().includes(q);
        const matchInv = s.invoice_number.toLowerCase().includes(q);
        if (!matchCust && !matchItem && !matchInv) return false;
      }
      return true;
    });
  }, [sales, saleSearch]);

  // Supplier actions
  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: "",
      company: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      is_active: true,
    });
    setSupplierModalOpen(true);
  };

  const openEditSupplier = (s: SupplierResponse) => {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name,
      company: s.company ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      notes: s.notes ?? "",
      is_active: s.is_active,
    });
    setSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      addToast({ title: "Supplier name is required", variant: "error" });
      return;
    }
    if (!supplierForm.phone.trim()) {
      addToast({ title: "Supplier phone number is required", variant: "error" });
      return;
    }
    setSavingSupplier(true);
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, {
          name: supplierForm.name.trim(),
          company: supplierForm.company.trim() || null,
          phone: supplierForm.phone.trim() || null,
          email: supplierForm.email.trim() || null,
          address: supplierForm.address.trim() || null,
          notes: supplierForm.notes.trim() || null,
          is_active: supplierForm.is_active,
        });
        addToast({ title: "Supplier updated", variant: "success" });
      } else {
        await createSupplier({
          name: supplierForm.name.trim(),
          company: supplierForm.company.trim() || null,
          phone: supplierForm.phone.trim() || null,
          email: supplierForm.email.trim() || null,
          address: supplierForm.address.trim() || null,
          notes: supplierForm.notes.trim() || null,
        });
        addToast({ title: "Supplier added", variant: "success" });
      }
      setSupplierModalOpen(false);
      await loadAll();
    } catch (err) {
      addToast({
        title: "Failed to save supplier",
        message: String(err),
        variant: "error",
      });
    } finally {
      setSavingSupplier(false);
    }
  };

  // Purchase actions
  const openNewPurchase = (preselectedSupplierId?: string) => {
    const defaultSupplier =
      preselectedSupplierId || suppliers.find((s) => s.is_active)?.id || "";
    const defaultItem = items.find((i) => i.is_active);
    setPurchaseForm({
      supplier_id: defaultSupplier,
      item_id: defaultItem?.id ?? "",
      quantity: "1",
      unit_cost: defaultItem ? String(defaultItem.cost_price) : "",
      paid_amount: "",
      payment_method: "Cash",
      purchase_date: todayStr(),
      invoice_number: "",
      notes: "",
    });
    setPurchaseModalOpen(true);
  };

  const handlePurchaseItemChange = (itemId: string) => {
    const found = items.find((i) => i.id === itemId);
    setPurchaseForm((prev) => ({
      ...prev,
      item_id: itemId,
      unit_cost: found ? String(found.cost_price) : prev.unit_cost,
    }));
  };

  const purchaseTotal = useMemo(() => {
    const q = Math.max(0, Number(purchaseForm.quantity) || 0);
    const c = Math.max(0, Number(purchaseForm.unit_cost) || 0);
    return Math.round(q * c);
  }, [purchaseForm.quantity, purchaseForm.unit_cost]);

  const purchaseDue = useMemo(() => {
    const paid = Math.max(0, Number(purchaseForm.paid_amount) || 0);
    return Math.max(0, purchaseTotal - paid);
  }, [purchaseTotal, purchaseForm.paid_amount]);

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.supplier_id) {
      addToast({ title: "Please select a supplier", variant: "error" });
      return;
    }
    if (!purchaseForm.item_id) {
      addToast({ title: "Please select an inventory item", variant: "error" });
      return;
    }
    const qty = Math.round(Number(purchaseForm.quantity) || 0);
    const unitCost = Math.round(Number(purchaseForm.unit_cost) || 0);
    const paidAmount = Math.round(Number(purchaseForm.paid_amount || "0"));

    if (qty <= 0) {
      addToast({ title: "Quantity must be greater than zero", variant: "error" });
      return;
    }

    setSavingPurchase(true);
    try {
      await createSupplementPurchase({
        supplier_id: purchaseForm.supplier_id,
        item_id: purchaseForm.item_id,
        quantity: qty,
        unit_cost: unitCost,
        paid_amount: paidAmount,
        payment_method: purchaseForm.payment_method,
        purchase_date: purchaseForm.purchase_date,
        invoice_number: purchaseForm.invoice_number.trim() || null,
        update_item_cost: true,
        notes: purchaseForm.notes.trim() || null,
      });
      addToast({
        title: "Purchase recorded & stock updated",
        message:
          paidAmount > 0
            ? `${formatCurrency(paidAmount)} auto-recorded in Expenses.`
            : "Added to supplier outstanding dues.",
        variant: "success",
      });
      setPurchaseModalOpen(false);
      await loadAll();
    } catch (err) {
      addToast({
        title: "Failed to record purchase",
        message: String(err),
        variant: "error",
      });
    } finally {
      setSavingPurchase(false);
    }
  };

  const handleQuickCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickItemForm.name.trim()) return;
    setSavingQuickItem(true);
    try {
      const created = await createSupplementItem({
        name: quickItemForm.name.trim(),
        category: quickItemForm.category,
        brand: quickItemForm.brand.trim() || null,
        unit: quickItemForm.unit,
        cost_price: Math.round(Number(quickItemForm.cost_price) || 0),
        selling_price: Math.round(Number(quickItemForm.selling_price) || 0),
        initial_stock: 0,
        min_stock_level: 5,
      });
      const updatedItems = await listSupplementItems({ active_only: false });
      setItems(updatedItems);
      setPurchaseForm((prev) => ({
        ...prev,
        item_id: created.id,
        unit_cost: String(created.cost_price),
      }));
      setQuickItemModalOpen(false);
      addToast({ title: `Item "${created.name}" created`, variant: "success" });
    } catch (err) {
      addToast({
        title: "Failed to create item",
        message: String(err),
        variant: "error",
      });
    } finally {
      setSavingQuickItem(false);
    }
  };

  // Supplier Payment (Pay Due) actions
  const openPayDueModal = (
    supplierId?: string,
    purchaseId?: string,
    suggestedAmount?: number,
  ) => {
    const defaultSup =
      supplierId ||
      suppliers.find((s) => s.total_due > 0)?.id ||
      suppliers[0]?.id ||
      "";
    const supObj = suppliers.find((s) => s.id === defaultSup);
    const amt =
      suggestedAmount !== undefined
        ? String(suggestedAmount)
        : supObj && supObj.total_due > 0
          ? String(supObj.total_due)
          : "";
    setPaymentForm({
      supplier_id: defaultSup,
      purchase_id: purchaseId ?? "",
      amount: amt,
      payment_method: "Cash",
      payment_date: todayStr(),
      reference: "",
      notes: "",
    });
    setPaymentModalOpen(true);
  };

  const selectedPaymentSupplier = useMemo(
    () => suppliers.find((s) => s.id === paymentForm.supplier_id) ?? null,
    [suppliers, paymentForm.supplier_id],
  );

  const unpaidPurchasesForSupplier = useMemo(
    () =>
      purchases.filter(
        (p) =>
          p.supplier_id === paymentForm.supplier_id && p.due_amount > 0,
      ),
    [purchases, paymentForm.supplier_id],
  );

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.supplier_id) {
      addToast({ title: "Please select a supplier", variant: "error" });
      return;
    }
    const amt = Math.round(Number(paymentForm.amount) || 0);
    if (amt <= 0) {
      addToast({
        title: "Payment amount must be greater than zero",
        variant: "error",
      });
      return;
    }

    setSavingPayment(true);
    try {
      await createSupplierPayment({
        supplier_id: paymentForm.supplier_id,
        purchase_id: paymentForm.purchase_id || null,
        amount: amt,
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        reference: paymentForm.reference.trim() || null,
        notes: paymentForm.notes.trim() || null,
      });
      addToast({
        title: "Supplier payment recorded",
        message: `${formatCurrency(amt)} deducted from dues & added to Expenses.`,
        variant: "success",
      });
      setPaymentModalOpen(false);
      await loadAll();
    } catch (err) {
      addToast({
        title: "Payment failed",
        message: String(err),
        variant: "error",
      });
    } finally {
      setSavingPayment(false);
    }
  };

  // POS Sale actions
  const openNewSaleModal = () => {
    const availItem =
      items.find((i) => i.is_active && i.stock_quantity > 0) ||
      items.find((i) => i.is_active);
    setCustomerMode("walkin");
    setSaleForm({
      member_id: "",
      customer_name: "",
      item_id: availItem?.id ?? "",
      quantity: "1",
      unit_price: availItem ? String(availItem.selling_price) : "",
      discount: "0",
      payment_method: "Cash",
      sale_date: todayStr(),
      notes: "",
    });
    setSaleModalOpen(true);
  };

  const selectedSaleItem = useMemo(
    () => items.find((i) => i.id === saleForm.item_id) ?? null,
    [items, saleForm.item_id],
  );

  const saleCalculations = useMemo(() => {
    const qty = Math.max(0, Number(saleForm.quantity) || 0);
    const price = Math.max(0, Number(saleForm.unit_price) || 0);
    const disc = Math.max(0, Number(saleForm.discount) || 0);
    const subtotal = Math.round(qty * price);
    const total = Math.max(0, subtotal - disc);
    const cost = selectedSaleItem ? qty * selectedSaleItem.cost_price : 0;
    const profit = total - cost;
    return { subtotal, total, profit };
  }, [saleForm.quantity, saleForm.unit_price, saleForm.discount, selectedSaleItem]);

  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.item_id) {
      addToast({ title: "Select a supplement item", variant: "error" });
      return;
    }
    const qty = Math.round(Number(saleForm.quantity) || 0);
    const price = Math.round(Number(saleForm.unit_price) || 0);
    const disc = Math.round(Number(saleForm.discount) || 0);

    setSavingSale(true);
    try {
      await createSupplementSale({
        member_id:
          customerMode === "member" && saleForm.member_id
            ? saleForm.member_id
            : null,
        customer_name:
          customerMode === "walkin"
            ? saleForm.customer_name.trim() || "Walk-in Customer"
            : null,
        item_id: saleForm.item_id,
        quantity: qty,
        unit_price: price,
        discount: disc,
        payment_method: saleForm.payment_method,
        sale_date: saleForm.sale_date,
        notes: saleForm.notes.trim() || null,
      });
      addToast({
        title: "Sale completed & stock updated",
        variant: "success",
      });
      setSaleModalOpen(false);
      await loadAll();
    } catch (err) {
      addToast({
        title: "Could not complete sale",
        message: String(err),
        variant: "error",
      });
    } finally {
      setSavingSale(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "supplier") {
        await deleteSupplier(deleteTarget.id);
      } else if (deleteTarget.type === "purchase") {
        await deleteSupplementPurchase(deleteTarget.id);
      } else if (deleteTarget.type === "payment") {
        await deleteSupplierPayment(deleteTarget.id);
      } else if (deleteTarget.type === "sale") {
        await deleteSupplementSale(deleteTarget.id);
      }
      addToast({ title: `${deleteTarget.label} deleted`, variant: "success" });
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      addToast({
        title: `Cannot delete ${deleteTarget.label}`,
        message: String(err),
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !summary) {
    return <LoadingState message="Loading supplements..." />;
  }

  if (error && !summary) {
    return <ErrorState message={error} onRetry={loadAll} />;
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Supplements Management
          </h1>
          <p className="text-xs text-text-muted">
            Manage suppliers, purchase stock, pay supplier dues (auto-synced with Expenses), and POS sales
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HideToggleButton />
          <Button variant="secondary" size="sm" onClick={() => void loadAll()}>
            <RefreshCw size={15} className="mr-1.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openNewPurchase()}
          >
            <ShoppingCart size={15} className="mr-1.5" />
            Record Purchase
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openPayDueModal()}
          >
            <HandCoins size={15} className="mr-1.5" />
            Pay Supplier Due
          </Button>
          <Button size="sm" onClick={openNewSaleModal}>
            <Store size={15} className="mr-1.5" />
            New Sale (POS)
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-muted">
                  Total Purchased
                </p>
                <p className="mt-1 text-2xl font-bold text-text-primary">
                  {mask(formatCurrency(summary.total_purchased_amount))}
                </p>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  Across {summary.total_suppliers} active suppliers
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700">
                <ShoppingCart size={20} />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-muted">
                  Paid to Suppliers
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {mask(formatCurrency(summary.total_paid_to_suppliers))}
                </p>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  Auto-recorded in Gym Expenses
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
                <CheckCircle2 size={20} />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-muted">
                  Outstanding Supplier Dues
                </p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    summary.total_supplier_dues > 0
                      ? "text-amber-600"
                      : "text-emerald-700"
                  }`}
                >
                  {mask(formatCurrency(summary.total_supplier_dues))}
                </p>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  {summary.suppliers_with_dues} supplier(s) with pending balance
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <AlertCircle size={20} />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-muted">
                  POS Sales Revenue
                </p>
                <p className="mt-1 text-2xl font-bold text-text-primary">
                  {mask(formatCurrency(summary.total_sales_revenue))}
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-700 font-medium">
                  Net Profit: {mask(formatCurrency(summary.total_sales_profit))} (
                  {summary.total_sales_count} sales)
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700">
                <TrendingUp size={20} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("suppliers")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "suppliers"
              ? "bg-[#122f27] text-white shadow-xs"
              : "text-text-secondary hover:bg-surface-hover"
          }`}
        >
          <Truck size={15} />
          Suppliers & Dues ({suppliers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("purchases")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "purchases"
              ? "bg-[#122f27] text-white shadow-xs"
              : "text-text-secondary hover:bg-surface-hover"
          }`}
        >
          <ShoppingCart size={15} />
          Purchase Items ({purchases.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "payments"
              ? "bg-[#122f27] text-white shadow-xs"
              : "text-text-secondary hover:bg-surface-hover"
          }`}
        >
          <HandCoins size={15} />
          Payments & Dues ({payments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sales")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "sales"
              ? "bg-[#122f27] text-white shadow-xs"
              : "text-text-secondary hover:bg-surface-hover"
          }`}
        >
          <Store size={15} />
          POS Sales ({sales.length})
        </button>
      </div>

      {/* TAB 1: SUPPLIERS & DUES */}
      {activeTab === "suppliers" && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                placeholder="Search supplier by name, company, or phone..."
                className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={duesOnly}
                  onChange={(e) => setDuesOnly(e.target.checked)}
                />
                With Outstanding Dues Only
              </label>
              <Button size="sm" onClick={openAddSupplier}>
                <PlusCircle size={15} className="mr-1.5" />
                Add Supplier
              </Button>
            </div>
          </div>

          {filteredSuppliers.length === 0 ? (
            <EmptyState
              title="No suppliers found"
              message="Add your supplement suppliers to record item purchases, payments, and track outstanding dues."
              action={{
                label: "Add Supplier",
                onClick: openAddSupplier,
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-alt text-[11px] font-semibold uppercase text-text-muted">
                    <th className="px-3 py-2.5">Supplier / Company</th>
                    <th className="px-3 py-2.5">Contact</th>
                    <th className="px-3 py-2.5 text-center">Purchases</th>
                    <th className="px-3 py-2.5 text-right">Total Purchased</th>
                    <th className="px-3 py-2.5 text-right">Total Paid</th>
                    <th className="px-3 py-2.5 text-right">Outstanding Due</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-hover">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-text-primary">
                          {s.name}
                        </div>
                        {s.company && (
                          <div className="text-[11px] text-text-muted">
                            {s.company}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">
                        <div>{s.phone ?? "—"}</div>
                        {s.address && (
                          <div className="text-[11px] text-text-muted">
                            {s.address}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium text-text-primary">
                        {s.purchase_count}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-text-primary">
                        {mask(formatCurrency(s.total_purchased))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-emerald-700">
                        {mask(formatCurrency(s.total_paid))}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {s.total_due > 0 ? (
                          <span className="font-bold text-amber-600">
                            {mask(formatCurrency(s.total_due))}
                          </span>
                        ) : (
                          <Badge variant="success">Cleared</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.total_due > 0 && (
                            <Button
                              size="sm"
                              onClick={() =>
                                openPayDueModal(s.id, undefined, s.total_due)
                              }
                            >
                              Pay Due
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openNewPurchase(s.id)}
                          >
                            + Purchase
                          </Button>
                          <button
                            type="button"
                            onClick={() => openSupplierWhatsApp(s)}
                            className="rounded-md border border-[#25D366]/40 bg-[#25D366]/10 p-1.5 text-[#128C7E] hover:bg-[#25D366]/20"
                            title="Send WhatsApp Supplier Dues Update"
                          >
                            <WhatsAppIcon size={15} className="text-[#25D366]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditSupplier(s)}
                            className="rounded-md p-1.5 text-text-secondary hover:bg-surface-alt hover:text-text-primary"
                            title="Edit Supplier"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: "supplier",
                                id: s.id,
                                label: `Supplier "${s.name}"`,
                              })
                            }
                            className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                            title="Delete Supplier"
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
      )}

      {/* TAB 2: PURCHASES (RESTOCK) */}
      {activeTab === "purchases" && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={purchaseSupplierFilter}
                onChange={(e) => setPurchaseSupplierFilter(e.target.value)}
                options={[
                  { value: "", label: "All Suppliers" },
                  ...suppliers.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
              <Select
                value={purchaseStatusFilter}
                onChange={(e) => setPurchaseStatusFilter(e.target.value)}
                options={[
                  { value: "", label: "All Payment Statuses" },
                  { value: "paid", label: "Fully Paid" },
                  { value: "partial", label: "Partially Paid (Due)" },
                  { value: "unpaid", label: "Unpaid (On Credit)" },
                ]}
              />
            </div>
            <Button size="sm" onClick={() => openNewPurchase()}>
              <PlusCircle size={15} className="mr-1.5" />
              Record Purchase
            </Button>
          </div>

          {filteredPurchases.length === 0 ? (
            <EmptyState
              title="No supplement purchases found"
              message="Record a purchase from a supplier to automatically restock inventory and track supplier payments & dues."
              action={{
                label: "Record Purchase",
                onClick: () => openNewPurchase(),
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-alt text-[11px] font-semibold uppercase text-text-muted">
                    <th className="px-3 py-2.5">Invoice / Date</th>
                    <th className="px-3 py-2.5">Supplier</th>
                    <th className="px-3 py-2.5">Item</th>
                    <th className="px-3 py-2.5 text-center">Qty</th>
                    <th className="px-3 py-2.5 text-right">Unit Cost</th>
                    <th className="px-3 py-2.5 text-right">Total</th>
                    <th className="px-3 py-2.5 text-right">Paid</th>
                    <th className="px-3 py-2.5 text-right">Due</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-hover">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-text-primary">
                          {p.invoice_number}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {formatDate(p.purchase_date)}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-text-primary">
                        {p.supplier_name}
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">
                        {p.item_name}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-text-primary">
                        {p.quantity} {p.item_unit}
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-secondary">
                        {mask(formatCurrency(p.unit_cost))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-text-primary">
                        {mask(formatCurrency(p.total_amount))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-emerald-700">
                        {mask(formatCurrency(p.paid_amount))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-amber-600">
                        {p.due_amount > 0
                          ? mask(formatCurrency(p.due_amount))
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {p.payment_status === "paid" && (
                          <Badge variant="success">Paid</Badge>
                        )}
                        {p.payment_status === "partial" && (
                          <Badge variant="warning">Partial</Badge>
                        )}
                        {p.payment_status === "unpaid" && (
                          <Badge variant="danger">Unpaid Due</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.due_amount > 0 && (
                            <Button
                              size="sm"
                              onClick={() =>
                                openPayDueModal(
                                  p.supplier_id,
                                  p.id,
                                  p.due_amount,
                                )
                              }
                            >
                              Pay Due
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: "purchase",
                                id: p.id,
                                label: `Purchase ${p.invoice_number}`,
                              })
                            }
                            className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                            title="Delete Purchase"
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
      )}

      {/* TAB 3: PAYMENTS & DUES */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          {/* Suppliers with Pending Dues Quick Bar */}
          {suppliers.some((s) => s.total_due > 0) && (
            <Card className="border-amber-200 bg-amber-50/50 p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-amber-900">
                  Suppliers with Pending Dues
                </h3>
                <span className="text-xs font-semibold text-amber-800">
                  Total Due:{" "}
                  {mask(formatCurrency(summary?.total_supplier_dues ?? 0))}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {suppliers
                  .filter((s) => s.total_due > 0)
                  .map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-amber-200/80 bg-white p-3 shadow-2xs"
                    >
                      <div>
                        <div className="text-xs font-bold text-text-primary">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-amber-700 font-semibold">
                          Due: {mask(formatCurrency(s.total_due))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openSupplierWhatsApp(s)}
                          className="rounded-md border border-[#25D366]/40 bg-[#25D366]/10 p-1.5 text-[#128C7E] hover:bg-[#25D366]/20"
                          title="Send WhatsApp Supplier Dues Update"
                        >
                          <WhatsAppIcon size={15} className="text-[#25D366]" />
                        </button>
                        <Button
                          size="sm"
                          onClick={() =>
                            openPayDueModal(s.id, undefined, s.total_due)
                          }
                        >
                          Pay Now
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          <Card className="p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Select
                value={paymentSupplierFilter}
                onChange={(e) => setPaymentSupplierFilter(e.target.value)}
                options={[
                  { value: "", label: "All Suppliers" },
                  ...suppliers.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
              <Button size="sm" onClick={() => openPayDueModal()}>
                <PlusCircle size={15} className="mr-1.5" />
                Record Supplier Payment
              </Button>
            </div>

            {filteredPayments.length === 0 ? (
              <EmptyState
                title="No supplier payments recorded yet"
                message="Payments made during purchases or against supplier dues appear here and are automatically added to Gym Expenses."
                action={{
                  label: "Record Supplier Payment",
                  onClick: () => openPayDueModal(),
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface-alt text-[11px] font-semibold uppercase text-text-muted">
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Supplier</th>
                      <th className="px-3 py-2.5">Invoice / Ref</th>
                      <th className="px-3 py-2.5">Method</th>
                      <th className="px-3 py-2.5 text-right">Amount Paid</th>
                      <th className="px-3 py-2.5">Notes</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPayments.map((sp) => (
                      <tr key={sp.id} className="hover:bg-surface-hover">
                        <td className="px-3 py-2.5 text-text-secondary">
                          {formatDate(sp.payment_date)}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-text-primary">
                          {sp.supplier_name}
                        </td>
                        <td className="px-3 py-2.5 text-text-secondary">
                          {sp.purchase_invoice || sp.reference || "General Due"}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="info">{sp.payment_method}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
                          {mask(formatCurrency(sp.amount))}
                        </td>
                        <td className="px-3 py-2.5 text-text-muted">
                          {sp.notes ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: "payment",
                                id: sp.id,
                                label: `Supplier payment of ${formatCurrency(sp.amount)}`,
                              })
                            }
                            className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                            title="Delete Payment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: POS SALES */}
      {activeTab === "sales" && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                value={saleSearch}
                onChange={(e) => setSaleSearch(e.target.value)}
                placeholder="Search sales by customer, item, or invoice #..."
                className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </div>
            <Button size="sm" onClick={openNewSaleModal}>
              <PlusCircle size={15} className="mr-1.5" />
              New Supplement Sale
            </Button>
          </div>

          {filteredSales.length === 0 ? (
            <EmptyState
              title="No supplement sales recorded"
              message="Sell supplements to gym members or walk-in customers to automatically deduct inventory and track profit."
              action={{
                label: "New Supplement Sale",
                onClick: openNewSaleModal,
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-alt text-[11px] font-semibold uppercase text-text-muted">
                    <th className="px-3 py-2.5">Invoice / Date</th>
                    <th className="px-3 py-2.5">Customer</th>
                    <th className="px-3 py-2.5">Item</th>
                    <th className="px-3 py-2.5 text-center">Qty</th>
                    <th className="px-3 py-2.5 text-right">Unit Price</th>
                    <th className="px-3 py-2.5 text-right">Discount</th>
                    <th className="px-3 py-2.5 text-right">Total</th>
                    <th className="px-3 py-2.5 text-right">Profit</th>
                    <th className="px-3 py-2.5">Method</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-hover">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-text-primary">
                          {s.invoice_number}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {formatDate(s.sale_date)}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-text-primary">
                          {s.customer_name}
                        </div>
                        {s.member_number && (
                          <div className="text-[10px] text-emerald-700 font-semibold">
                            Member #{s.member_number}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-text-primary">
                        {s.item_name}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {s.quantity} {s.item_unit}
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-secondary">
                        {mask(formatCurrency(s.unit_price))}
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-secondary">
                        {s.discount > 0
                          ? mask(formatCurrency(s.discount))
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-text-primary">
                        {mask(formatCurrency(s.total_amount))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
                        {mask(formatCurrency(s.profit))}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="info">{s.payment_method}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              type: "sale",
                              id: s.id,
                              label: `Sale ${s.invoice_number}`,
                            })
                          }
                          className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                          title="Delete / Void Sale (Restores Stock)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* MODAL 1: ADD / EDIT SUPPLIER */}
      <Modal
        isOpen={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}
      >
        <form onSubmit={(e) => void handleSaveSupplier(e)} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Supplier Name *"
              value={supplierForm.name}
              onChange={(e) =>
                setSupplierForm({ ...supplierForm, name: capitalizeName(e.target.value) })
              }
              placeholder="e.g. Bilal Traders"
              required
            />
            <Input
              label="Company / Brand Distributor"
              value={supplierForm.company}
              onChange={(e) =>
                setSupplierForm({ ...supplierForm, company: capitalizeName(e.target.value) })
              }
              placeholder="e.g. Optimum Nutrition PK"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Phone Number *"
              value={supplierForm.phone}
              onChange={(e) =>
                setSupplierForm({ ...supplierForm, phone: e.target.value })
              }
              placeholder="0300-1234567"
              required
            />
            <Input
              label="Email"
              value={supplierForm.email}
              onChange={(e) =>
                setSupplierForm({ ...supplierForm, email: e.target.value })
              }
              placeholder="supplier@example.com"
            />
          </div>
          <Input
            label="Address / City"
            value={supplierForm.address}
            onChange={(e) =>
              setSupplierForm({ ...supplierForm, address: capitalizeName(e.target.value) })
            }
            placeholder="Market / City address"
          />
          <Input
            label="Notes"
            value={supplierForm.notes}
            onChange={(e) =>
              setSupplierForm({ ...supplierForm, notes: e.target.value })
            }
            placeholder="Bank account details or credit terms..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSupplierModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingSupplier}>
              {savingSupplier
                ? "Saving..."
                : editingSupplier
                  ? "Save Changes"
                  : "Add Supplier"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: RECORD PURCHASE */}
      <Modal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        title="Record Supplement Purchase (Restock)"
      >
        <form onSubmit={(e) => void handleSavePurchase(e)} className="space-y-4">
          <Select
            label="Supplier *"
            value={purchaseForm.supplier_id}
            onChange={(e) =>
              setPurchaseForm({ ...purchaseForm, supplier_id: e.target.value })
            }
            options={[
              { value: "", label: "Select Supplier..." },
              ...suppliers.map((s) => ({
                value: s.id,
                label: s.company ? `${s.name} (${s.company})` : s.name,
              })),
            ]}
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-primary">
                Supplement Item *
              </label>
              <button
                type="button"
                onClick={() => setQuickItemModalOpen(true)}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                + Create New Item
              </button>
            </div>
            <Select
              value={purchaseForm.item_id}
              onChange={(e) => handlePurchaseItemChange(e.target.value)}
              options={[
                { value: "", label: "Select Inventory Item..." },
                ...items.map((i) => ({
                  value: i.id,
                  label: `${i.name} (In Stock: ${i.stock_quantity} ${i.unit})`,
                })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Quantity *"
              type="number"
              min={1}
              value={purchaseForm.quantity}
              onChange={(e) =>
                setPurchaseForm({ ...purchaseForm, quantity: e.target.value })
              }
              required
            />
            <Input
              label="Unit Cost (PKR) *"
              type="number"
              min={0}
              value={purchaseForm.unit_cost}
              onChange={(e) =>
                setPurchaseForm({ ...purchaseForm, unit_cost: e.target.value })
              }
              required
            />
          </div>

          {/* Live Purchase & Due Calculation */}
          <div className="rounded-lg border border-border bg-surface-alt p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">Total Purchase Amount:</span>
              <span className="font-bold text-text-primary">
                {formatCurrency(purchaseTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-muted">Quick Pay Selection:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setPurchaseForm({
                      ...purchaseForm,
                      paid_amount: String(purchaseTotal),
                    })
                  }
                  className="rounded border border-border bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-surface-hover"
                >
                  Full Paid
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPurchaseForm({
                      ...purchaseForm,
                      paid_amount: String(Math.round(purchaseTotal / 2)),
                    })
                  }
                  className="rounded border border-border bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-surface-hover"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPurchaseForm({ ...purchaseForm, paid_amount: "0" })
                  }
                  className="rounded border border-border bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-surface-hover"
                >
                  On Credit (0 Paid)
                </button>
              </div>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5">
              <span className="text-text-muted">Remaining Supplier Due:</span>
              <span
                className={`font-bold ${
                  purchaseDue > 0 ? "text-amber-600" : "text-emerald-700"
                }`}
              >
                {formatCurrency(purchaseDue)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Amount Paid Now (PKR)"
              type="number"
              min={0}
              max={purchaseTotal}
              value={purchaseForm.paid_amount}
              onChange={(e) =>
                setPurchaseForm({ ...purchaseForm, paid_amount: e.target.value })
              }
              placeholder="0 if buying on credit"
            />
            <Select
              label="Payment Method"
              value={purchaseForm.payment_method}
              onChange={(e) =>
                setPurchaseForm({
                  ...purchaseForm,
                  payment_method: e.target.value,
                })
              }
              options={SUPPLEMENT_PAYMENT_METHODS.map((m) => ({
                value: m,
                label: m,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Purchase Date *"
              type="date"
              value={purchaseForm.purchase_date}
              onChange={(e) =>
                setPurchaseForm({
                  ...purchaseForm,
                  purchase_date: e.target.value,
                })
              }
              required
            />
            <Input
              label="Supplier Invoice # (Optional)"
              value={purchaseForm.invoice_number}
              onChange={(e) =>
                setPurchaseForm({
                  ...purchaseForm,
                  invoice_number: e.target.value,
                })
              }
              placeholder="Auto-generated if blank"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPurchaseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingPurchase}>
              {savingPurchase ? "Recording..." : "Save Purchase"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* QUICK CREATE ITEM MODAL */}
      <Modal
        isOpen={quickItemModalOpen}
        onClose={() => setQuickItemModalOpen(false)}
        title="Quick Add Inventory Item"
      >
        <form
          onSubmit={(e) => void handleQuickCreateItem(e)}
          className="space-y-3"
        >
          <Input
            label="Item Name *"
            value={quickItemForm.name}
            onChange={(e) =>
              setQuickItemForm({ ...quickItemForm, name: capitalizeName(e.target.value) })
            }
            placeholder="e.g. Creatine Monohydrate 300g"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={quickItemForm.category}
              onChange={(e) =>
                setQuickItemForm({ ...quickItemForm, category: e.target.value })
              }
              options={SUPPLEMENT_CATEGORIES.map((c) => ({
                value: c,
                label: c,
              }))}
            />
            <Select
              label="Unit"
              value={quickItemForm.unit}
              onChange={(e) =>
                setQuickItemForm({ ...quickItemForm, unit: e.target.value })
              }
              options={SUPPLEMENT_UNITS.map((u) => ({ value: u, label: u }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cost Price (PKR) *"
              type="number"
              min={0}
              value={quickItemForm.cost_price}
              onChange={(e) =>
                setQuickItemForm({
                  ...quickItemForm,
                  cost_price: e.target.value,
                })
              }
              required
            />
            <Input
              label="Selling Price (PKR) *"
              type="number"
              min={0}
              value={quickItemForm.selling_price}
              onChange={(e) =>
                setQuickItemForm({
                  ...quickItemForm,
                  selling_price: e.target.value,
                })
              }
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setQuickItemModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingQuickItem}>
              {savingQuickItem ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: PAY SUPPLIER DUE */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Record Supplier Payment (Clear Dues)"
      >
        <form onSubmit={(e) => void handleSavePayment(e)} className="space-y-4">
          <Select
            label="Supplier *"
            value={paymentForm.supplier_id}
            onChange={(e) => {
              const sup = suppliers.find((s) => s.id === e.target.value);
              setPaymentForm({
                ...paymentForm,
                supplier_id: e.target.value,
                purchase_id: "",
                amount: sup && sup.total_due > 0 ? String(sup.total_due) : "",
              });
            }}
            options={[
              { value: "", label: "Select Supplier..." },
              ...suppliers.map((s) => ({
                value: s.id,
                label: `${s.name} — Due: ${formatCurrency(s.total_due)}`,
              })),
            ]}
          />

          {selectedPaymentSupplier && (
            <div className="rounded-lg border border-border bg-surface-alt p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Total Purchased:</span>
                <span className="font-medium">
                  {formatCurrency(selectedPaymentSupplier.total_purchased)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Previously Paid:</span>
                <span className="font-medium text-emerald-700">
                  {formatCurrency(selectedPaymentSupplier.total_paid)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-bold">
                <span>Outstanding Balance Due:</span>
                <span className="text-amber-600">
                  {formatCurrency(selectedPaymentSupplier.total_due)}
                </span>
              </div>
            </div>
          )}

          {unpaidPurchasesForSupplier.length > 0 && (
            <Select
              label="Apply to Specific Purchase Invoice (Optional)"
              value={paymentForm.purchase_id}
              onChange={(e) => {
                const pur = unpaidPurchasesForSupplier.find(
                  (p) => p.id === e.target.value,
                );
                setPaymentForm({
                  ...paymentForm,
                  purchase_id: e.target.value,
                  amount: pur ? String(pur.due_amount) : paymentForm.amount,
                });
              }}
              options={[
                {
                  value: "",
                  label: "Auto-allocate across oldest unpaid invoices (FIFO)",
                },
                ...unpaidPurchasesForSupplier.map((p) => ({
                  value: p.id,
                  label: `${p.invoice_number} (${p.item_name}) — Due: ${formatCurrency(p.due_amount)}`,
                })),
              ]}
            />
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Payment Amount (PKR) *"
              type="number"
              min={1}
              value={paymentForm.amount}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, amount: e.target.value })
              }
              required
            />
            <Select
              label="Payment Method *"
              value={paymentForm.payment_method}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  payment_method: e.target.value,
                })
              }
              options={SUPPLEMENT_PAYMENT_METHODS.map((m) => ({
                value: m,
                label: m,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Payment Date *"
              type="date"
              value={paymentForm.payment_date}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, payment_date: e.target.value })
              }
              required
            />
            <Input
              label="Reference / Receipt #"
              value={paymentForm.reference}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, reference: e.target.value })
              }
              placeholder="e.g. Bank TXN or slip #"
            />
          </div>

          <Input
            label="Notes"
            value={paymentForm.notes}
            onChange={(e) =>
              setPaymentForm({ ...paymentForm, notes: e.target.value })
            }
            placeholder="Payment note (also saved in Gym Expenses)"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingPayment}>
              {savingPayment ? "Recording..." : "Confirm Payment"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: POS SUPPLEMENT SALE */}
      <Modal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        title="New Supplement Sale (POS)"
      >
        <form onSubmit={(e) => void handleSaveSale(e)} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCustomerMode("walkin")}
              className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${
                customerMode === "walkin"
                  ? "border-[#122f27] bg-[#122f27] text-white"
                  : "border-border text-text-secondary"
              }`}
            >
              Walk-in Customer
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode("member")}
              className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${
                customerMode === "member"
                  ? "border-[#122f27] bg-[#122f27] text-white"
                  : "border-border text-text-secondary"
              }`}
            >
              Gym Member
            </button>
          </div>

          {customerMode === "member" ? (
            <Select
              label="Select Gym Member *"
              value={saleForm.member_id}
              onChange={(e) =>
                setSaleForm({ ...saleForm, member_id: e.target.value })
              }
              options={[
                { value: "", label: "Choose Member..." },
                ...members.map((m) => ({
                  value: m.id,
                  label: `${m.full_name} (#${m.member_number})`,
                })),
              ]}
            />
          ) : (
            <Input
              label="Customer Name"
              value={saleForm.customer_name}
              onChange={(e) =>
                setSaleForm({ ...saleForm, customer_name: capitalizeName(e.target.value) })
              }
              placeholder="Walk-in Customer (optional)"
            />
          )}

          <Select
            label="Supplement Item *"
            value={saleForm.item_id}
            onChange={(e) => {
              const found = items.find((i) => i.id === e.target.value);
              setSaleForm({
                ...saleForm,
                item_id: e.target.value,
                unit_price: found
                  ? String(found.selling_price)
                  : saleForm.unit_price,
              });
            }}
            options={[
              { value: "", label: "Select Item..." },
              ...items
                .filter((i) => i.is_active)
                .map((i) => ({
                  value: i.id,
                  label: `${i.name} — Stock: ${i.stock_quantity} ${i.unit} (${formatCurrency(i.selling_price)})`,
                })),
            ]}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label="Quantity *"
              type="number"
              min={1}
              max={selectedSaleItem?.stock_quantity ?? undefined}
              value={saleForm.quantity}
              onChange={(e) =>
                setSaleForm({ ...saleForm, quantity: e.target.value })
              }
              required
            />
            <Input
              label="Unit Price (PKR) *"
              type="number"
              min={0}
              value={saleForm.unit_price}
              onChange={(e) =>
                setSaleForm({ ...saleForm, unit_price: e.target.value })
              }
              required
            />
            <Input
              label="Discount (PKR)"
              type="number"
              min={0}
              value={saleForm.discount}
              onChange={(e) =>
                setSaleForm({ ...saleForm, discount: e.target.value })
              }
            />
          </div>

          <div className="rounded-lg border border-border bg-surface-alt p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-text-muted">Total Payable:</span>
              <span className="text-sm font-bold text-text-primary">
                {formatCurrency(saleCalculations.total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Estimated Profit:</span>
              <span className="font-semibold text-emerald-700">
                {formatCurrency(saleCalculations.profit)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Payment Method *"
              value={saleForm.payment_method}
              onChange={(e) =>
                setSaleForm({ ...saleForm, payment_method: e.target.value })
              }
              options={SUPPLEMENT_PAYMENT_METHODS.map((m) => ({
                value: m,
                label: m,
              }))}
            />
            <Input
              label="Sale Date *"
              type="date"
              value={saleForm.sale_date}
              onChange={(e) =>
                setSaleForm({ ...saleForm, sale_date: e.target.value })
              }
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSaleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingSale}>
              {savingSale ? "Completing Sale..." : "Complete Sale"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
        title={`Delete ${deleteTarget?.label ?? ""}`}
        message={`Are you sure you want to delete this record? Stock levels, supplier dues, and linked expenses will be automatically updated.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        variant="danger"
      />

      {/* WHATSAPP DUES PREVIEW & SEND MODAL */}
      <WhatsAppPreviewModal
        target={whatsAppTarget}
        onClose={() => setWhatsAppTarget(null)}
      />
    </div>
  );
}

