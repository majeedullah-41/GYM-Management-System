import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  UserRoundPlus,
  Users,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Wallet,
  HandCoins,
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
  X,
  Droplet,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Select } from "../../../components/ui/Select";
import { Modal } from "../../../components/ui/Modal";
import { Dialog } from "../../../components/ui/Dialog";
import { Badge } from "../../../components/ui/Badge";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useToast } from "../../../components/feedback/ToastProvider";
import {
  listMembers,
  listMemberAddresses,
  createMember,
  updateMember,
  archiveMember,
  unarchiveMember,
  permanentlyDeleteMember,
  type MemberResponse,
  type CreateMemberRequest,
} from "../../../lib/api/members";
import { listActivePlans, type PlanResponse } from "../../../lib/api/membership-plans";
import { getMemberFormSettings } from "../../../lib/api/settings";
import { useNavigation } from "../../../components/layout/NavigationContext";
import { formatCurrency } from "../../../lib/utils/format";
import { MemberDetailRow } from "../components/MemberDetailRow";
import { MemberFormFields } from "../components/MemberFormFields";
import { usePrivacy, HideToggleButton, maskValue } from "../../../context/PrivacyContext";
import {
  EMPTY_FORM,
  DEFAULT_VISIBLE_MEMBER_FIELDS,
  MEMBER_FIELDS,
  todayIso,
  type FormData,
  type MemberFieldKey,
} from "../memberFields";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const BLOOD_GROUP_OPTIONS = [
  { value: "", label: "All Blood Groups" },
  ...BLOOD_GROUPS.map((group) => ({ value: group, label: group })),
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
];

const PAGE_SIZE = 20;

type SortField =
  | "member_number"
  | "full_name"
  | "phone"
  | "blood_group"
  | "membership_plan_name"
  | "membership_expiry_date"
  | "outstanding_balance";
type SortDir = "asc" | "desc";

const AVATAR_COLORS = [
  { bg: "bg-emerald-100", text: "text-emerald-800" },
  { bg: "bg-blue-100", text: "text-blue-800" },
  { bg: "bg-amber-100", text: "text-amber-800" },
  { bg: "bg-purple-100", text: "text-purple-800" },
  { bg: "bg-rose-100", text: "text-rose-800" },
  { bg: "bg-teal-100", text: "text-teal-800" },
  { bg: "bg-indigo-100", text: "text-indigo-800" },
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

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

function SortIcon({
  field,
  activeField,
  direction,
}: {
  field: SortField;
  activeField: SortField;
  direction: SortDir;
}) {
  if (activeField !== field) return <ArrowUpDown size={13} className="text-text-muted/60" />;
  return direction === "asc" ? (
    <ArrowUp size={13} className="text-primary font-bold" />
  ) : (
    <ArrowDown size={13} className="text-primary font-bold" />
  );
}

function sortMembers(members: MemberResponse[], field: SortField, dir: SortDir): MemberResponse[] {
  const sorted = [...members].sort((a, b) => {
    let va: string | number;
    let vb: string | number;
    switch (field) {
      case "member_number":
        va = a.member_number;
        vb = b.member_number;
        break;
      case "full_name":
        va = a.full_name.toLowerCase();
        vb = b.full_name.toLowerCase();
        break;
      case "phone":
        va = a.phone ?? "";
        vb = b.phone ?? "";
        break;
      case "blood_group":
        va = a.blood_group ? BLOOD_GROUPS.indexOf(a.blood_group) : BLOOD_GROUPS.length;
        vb = b.blood_group ? BLOOD_GROUPS.indexOf(b.blood_group) : BLOOD_GROUPS.length;
        return dir === "asc" ? va - vb : vb - va;
      case "membership_plan_name":
        va = a.membership_plan_name ?? "";
        vb = b.membership_plan_name ?? "";
        break;
      case "membership_expiry_date":
        va = a.membership_expiry_date ?? "";
        vb = b.membership_expiry_date ?? "";
        break;
      case "outstanding_balance":
        va = a.outstanding_balance;
        vb = b.outstanding_balance;
        break;
      default:
        return 0;
    }
    if (typeof va === "number" && typeof vb === "number") {
      return dir === "asc" ? va - vb : vb - va;
    }
    const sa = String(va);
    const sb = String(vb);
    return dir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
  });
  return sorted;
}

function formatCnic(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function MembersPage({
  initialExpandedId,
}: {
  initialExpandedId?: string | null;
} = {}) {
  const { addToast } = useToast();
  const { openPaymentForMember } = useNavigation();
  const { hidden } = usePrivacy();

  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [kpiMembers, setKpiMembers] = useState<MemberResponse[]>([]);

  const loadKpiMembers = useCallback(async () => {
    try {
      const all = await listMembers({ include_archived: true });
      setKpiMembers(all);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadKpiMembers();
  }, [loadKpiMembers]);

  const [sortField, setSortField] = useState<SortField>("member_number");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberResponse | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId ?? null);

  useEffect(() => {
    if (initialExpandedId) setExpandedId(initialExpandedId);
  }, [initialExpandedId]);

  const [archiveTarget, setArchiveTarget] = useState<MemberResponse | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<MemberResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formFieldKeys, setFormFieldKeys] = useState<MemberFieldKey[]>(
    DEFAULT_VISIBLE_MEMBER_FIELDS,
  );

  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);

  const loadAddressSuggestions = useCallback(async () => {
    try {
      setAddressSuggestions(await listMemberAddresses());
    } catch {
      setAddressSuggestions([]);
    }
  }, []);

  useEffect(() => {
    loadAddressSuggestions();
  }, [loadAddressSuggestions]);

  const loadFormFields = useCallback(async () => {
    try {
      const settings = await getMemberFormSettings();
      const known = new Set(MEMBER_FIELDS.map((f) => f.key));
      const fields = settings.visible_fields.filter((k): k is MemberFieldKey =>
        known.has(k as MemberFieldKey),
      );
      if (!fields.includes("full_name")) fields.unshift("full_name");
      setFormFieldKeys(fields);
    } catch {
      setFormFieldKeys(DEFAULT_VISIBLE_MEMBER_FIELDS);
    }
  }, []);

  useEffect(() => {
    loadFormFields();
  }, [loadFormFields]);

  const visibleFields = useMemo(() => new Set(formFieldKeys), [formFieldKeys]);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setMembers(
        await listMembers({
          search,
          status: statusFilter || undefined,
          include_archived: showArchived,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, showArchived]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    listActivePlans()
      .then(setPlans)
      .catch(() => {});
  }, []);

  // Compute overall KPI metrics from all members (unfiltered, including archived)
  const stats = useMemo(() => {
    const activeMembers = kpiMembers.filter((m) => !m.is_archived);
    const total = activeMembers.length;
    const active = activeMembers.filter((m) => m.is_paid).length;
    const unpaid = activeMembers.filter((m) => !m.is_paid || m.outstanding_balance > 0).length;
    const paid = activeMembers.filter((m) => m.is_paid && m.outstanding_balance === 0).length;
    const outstanding = activeMembers.reduce((sum, m) => sum + (m.outstanding_balance || 0), 0);
    const archived = kpiMembers.filter((m) => m.is_archived).length;
    return { total, active, unpaid, paid, outstanding, archived };
  }, [kpiMembers]);

  const filteredMembers = useMemo(() => {
    return members.filter(
      (member) =>
        member.is_archived === showArchived &&
        (!planFilter || member.membership_plan_name === planFilter) &&
        (!bloodGroupFilter || member.blood_group === bloodGroupFilter),
    );
  }, [members, planFilter, bloodGroupFilter, showArchived]);

  const sortedMembers = useMemo(
    () => sortMembers(filteredMembers, sortField, sortDir),
    [filteredMembers, sortField, sortDir],
  );

  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedMembers = sortedMembers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, planFilter, bloodGroupFilter, showArchived]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const openCreateForm = () => {
    setEditingMember(null);
    setFormData({ ...EMPTY_FORM, admission_date: todayIso() });
    setFormErrors({});
    setFormOpen(true);
    loadFormFields();
    loadAddressSuggestions();
  };

  const openEditForm = (member: MemberResponse) => {
    setEditingMember(member);
    setFormData({
      full_name: member.full_name,
      father_name: member.father_name ?? "",
      phone: member.phone ?? "",
      cnic: member.cnic ? formatCnic(member.cnic) : "",
      address: member.address ?? "",
      date_of_birth: member.date_of_birth ?? "",
      admission_date: member.admission_date ?? "",
      gender: member.gender ?? "",
      blood_group: member.blood_group ?? "",
      notes: member.notes ?? "",
      membership_plan_id: member.membership_plan_id ?? "",
      monthly_fee: member.monthly_fee ? String(member.monthly_fee) : "",
    });
    setFormErrors({});
    setFormOpen(true);
    loadFormFields();
    loadAddressSuggestions();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.full_name.trim()) errors.full_name = "Name is required";
    if (formData.phone.trim() && !/^\d{11}$/.test(formData.phone.trim()))
      errors.phone = "Phone must be exactly 11 digits";
    if (formData.cnic.trim() && formData.cnic.replace(/-/g, "").length !== 13)
      errors.cnic = "CNIC must be exactly 13 digits";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    let newEnrollmentId: string | null = null;
    try {
      setSubmitting(true);
      const visible = (key: MemberFieldKey) => visibleFields.has(key);
      const existingField = (key: keyof MemberResponse): string | null =>
        editingMember ? (editingMember[key] as string | null) : null;

      const payload: CreateMemberRequest = {
        full_name: formData.full_name.trim(),
        father_name: visible("father_name")
          ? formData.father_name.trim() || null
          : existingField("father_name"),
        phone: visible("phone") ? formData.phone.trim() || null : existingField("phone"),
        cnic: visible("cnic")
          ? formData.cnic.trim()
            ? formData.cnic.replace(/-/g, "")
            : null
          : existingField("cnic"),
        address: visible("address") ? formData.address.trim() || null : existingField("address"),
        date_of_birth: visible("date_of_birth")
          ? formData.date_of_birth || null
          : existingField("date_of_birth"),
        admission_date: visible("admission_date")
          ? formData.admission_date || null
          : existingField("admission_date"),
        gender: visible("gender") ? formData.gender || null : existingField("gender"),
        blood_group: visible("blood_group")
          ? formData.blood_group || null
          : existingField("blood_group"),
        notes: visible("notes") ? formData.notes.trim() || null : existingField("notes"),
        membership_plan_id: visible("membership_plan_id")
          ? formData.membership_plan_id
            ? formData.membership_plan_id || null
            : null
          : existingField("membership_plan_id"),
        monthly_fee:
          visible("membership_plan_id") && formData.membership_plan_id
            ? formData.monthly_fee
              ? Number(formData.monthly_fee)
              : null
            : (editingMember?.monthly_fee ?? null),
      };

      if (editingMember) {
        await updateMember(editingMember.id, payload);
        addToast({
          variant: "success",
          title: "Member updated",
          message: `"${payload.full_name}" has been updated.`,
        });
      } else {
        const created = await createMember(payload);
        newEnrollmentId = payload.membership_plan_id ? created.id : null;
        addToast({
          variant: "success",
          title: "Member added",
          message: `"${payload.full_name}" has been added.`,
        });
      }

      setFormOpen(false);
      await Promise.all([loadMembers(), loadKpiMembers()]);
      if (newEnrollmentId) openPaymentForMember(newEnrollmentId);
    } catch (err) {
      addToast({
        variant: "error",
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to save member",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveMember(archiveTarget.id);
      addToast({
        variant: "success",
        title: "Member archived",
        message: `"${archiveTarget.full_name}" has been archived.`,
      });
      setArchiveTarget(null);
      await Promise.all([loadMembers(), loadKpiMembers()]);
    } catch (err) {
      addToast({
        variant: "error",
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to archive member",
      });
    }
  };

  const handleReactivate = async () => {
    if (!reactivateTarget) return;
    try {
      await unarchiveMember(reactivateTarget.id);
      addToast({
        variant: "success",
        title: "Member reactivated",
        message: `"${reactivateTarget.full_name}" has been reactivated.`,
      });
      setReactivateTarget(null);
      await Promise.all([loadMembers(), loadKpiMembers()]);
    } catch (err) {
      addToast({
        variant: "error",
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to reactivate member",
      });
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await permanentlyDeleteMember(deleteTarget.id);
      addToast({
        variant: "success",
        title: "Member permanently removed",
        message: `"${deleteTarget.full_name}" was removed. Payment and receipt history was preserved.`,
      });
      setDeleteTarget(null);
      setExpandedId(null);
      await Promise.all([loadMembers(), loadKpiMembers()]);
    } catch (err) {
      addToast({
        variant: "error",
        title: "Could not delete member",
        message: err instanceof Error ? err.message : "Failed to permanently delete member",
      });
    } finally {
      setDeleting(false);
    }
  };

  const planOptions = [
    { value: "", label: "All Plans" },
    ...plans.map((p) => ({ value: p.name, label: p.name })),
  ];

  const hasActiveFilters = Boolean(
    search || statusFilter || planFilter || bloodGroupFilter || showArchived,
  );

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPlanFilter("");
    setBloodGroupFilter("");
    setShowArchived(false);
  };

  return (
    <div className="members-page space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Members</h1>
          <p className="mt-1 text-xs text-text-muted">
            Manage member registrations, membership plans, and dues.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <HideToggleButton />
          <Button
            variant="secondary"
            onClick={() => {
              loadMembers();
              loadKpiMembers();
            }}
          >
            <RefreshCw size={15} />
            Refresh
          </Button>
          <Button onClick={openCreateForm} className="bg-[#17613f] hover:bg-[#104b31]">
            <UserRoundPlus size={16} />
            Add Member
          </Button>
        </div>
      </div>

      {/* 5 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              icon={Users}
              label="Total Members"
              value={stats.total}
              helper="Registered members"
              iconClass="bg-emerald-100 text-emerald-700"
              surfaceClass="bg-gradient-to-br from-emerald-50 to-white"
              onClick={() => {
                setStatusFilter("");
                setShowArchived(false);
              }}
              active={!statusFilter && !showArchived}
              hidden={hidden}
            />
            <StatCard
              icon={UserCheck}
              label="Active Members"
              value={stats.active}
              helper="Currently active"
              iconClass="bg-blue-100 text-blue-600"
              surfaceClass="bg-gradient-to-br from-blue-50 to-white"
              onClick={() => {
                setStatusFilter("paid");
                setShowArchived(false);
              }}
              active={statusFilter === "paid" && !showArchived}
              hidden={hidden}
            />
            <StatCard
              icon={CheckCircle2}
              label="Paid Status"
              value={stats.paid}
              helper="No balance due"
              iconClass="bg-amber-100 text-amber-600"
              surfaceClass="bg-gradient-to-br from-amber-50 to-white"
              onClick={() => {
                setStatusFilter("paid");
                setShowArchived(false);
              }}
              hidden={hidden}
            />
            <StatCard
              icon={AlertCircle}
              label="Unpaid / Dues"
              value={stats.unpaid}
              helper="Pending dues"
              iconClass="bg-red-100 text-red-600"
              surfaceClass="bg-gradient-to-br from-red-50 to-white"
              onClick={() => {
                setStatusFilter("unpaid");
                setShowArchived(false);
              }}
              active={statusFilter === "unpaid" && !showArchived}
              hidden={hidden}
            />
            <StatCard
              icon={Wallet}
              label="Outstanding"
              value={formatCurrency(stats.outstanding)}
              helper="Unpaid balance"
              iconClass="bg-violet-100 text-violet-600"
              surfaceClass="bg-gradient-to-br from-violet-50 to-white"
              onClick={() => {
                setStatusFilter("unpaid");
                setShowArchived(false);
              }}
              hidden={hidden}
            />
          </>
        )}
      </div>

      {/* Filter & Search Toolbar Card */}
      <Card className="p-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                name="member_search"
                placeholder="Search by name, phone, or member #..."
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
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-36 text-xs"
            />

            <Select
              options={planOptions}
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-38 text-xs"
            />

            <Select
              options={BLOOD_GROUP_OPTIONS}
              value={bloodGroupFilter}
              onChange={(e) => setBloodGroupFilter(e.target.value)}
              className="w-36 text-xs"
            />

            <label className="flex items-center gap-2 text-xs font-medium text-text-muted cursor-pointer select-none rounded-md border border-border px-3 py-2 hover:bg-secondary-bg transition-colors">
              <input
                type="checkbox"
                name="show_archived"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
              />
              Archived ({stats.archived})
            </label>

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
              Showing {sortedMembers.length} {sortedMembers.length === 1 ? "member" : "members"}
            </span>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading && <LoadingState message="Loading gym members..." />}
      {error && !loading && <ErrorState message={error} onRetry={loadMembers} />}

      {!loading && !error && sortedMembers.length === 0 && (
        <EmptyState
          title={hasActiveFilters ? "No members matching filters" : "No members registered yet"}
          message={
            hasActiveFilters
              ? "Try adjusting your search criteria or reset active filters."
              : "Register your first gym member to begin tracking attendance and subscriptions."
          }
          action={
            !hasActiveFilters
              ? { label: "+ Add Member", onClick: openCreateForm }
              : { label: "Clear Filters", onClick: resetFilters }
          }
        />
      )}

      {!loading && !error && sortedMembers.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-[#fafbfa] text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th
                    onClick={() => toggleSort("member_number")}
                    className="cursor-pointer select-none px-4 py-3 text-left hover:text-text-primary"
                  >
                    <span className="inline-flex items-center gap-1">
                      Member #{" "}
                      <SortIcon field="member_number" activeField={sortField} direction={sortDir} />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleSort("full_name")}
                    className="cursor-pointer select-none px-4 py-3 text-left hover:text-text-primary"
                  >
                    <span className="inline-flex items-center gap-1">
                      Member{" "}
                      <SortIcon field="full_name" activeField={sortField} direction={sortDir} />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleSort("phone")}
                    className="cursor-pointer select-none px-4 py-3 text-left hover:text-text-primary"
                  >
                    <span className="inline-flex items-center gap-1">
                      Phone <SortIcon field="phone" activeField={sortField} direction={sortDir} />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleSort("membership_plan_name")}
                    className="cursor-pointer select-none px-4 py-3 text-left hover:text-text-primary"
                  >
                    <span className="inline-flex items-center gap-1">
                      Plan{" "}
                      <SortIcon
                        field="membership_plan_name"
                        activeField={sortField}
                        direction={sortDir}
                      />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleSort("blood_group")}
                    className="cursor-pointer select-none px-4 py-3 text-left hover:text-text-primary"
                  >
                    <span className="inline-flex items-center gap-1">
                      Blood Group{" "}
                      <SortIcon field="blood_group" activeField={sortField} direction={sortDir} />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th
                    onClick={() => toggleSort("outstanding_balance")}
                    className="cursor-pointer select-none px-4 py-3 text-right hover:text-text-primary"
                  >
                    <span className="inline-flex items-center gap-1">
                      Balance{" "}
                      <SortIcon
                        field="outstanding_balance"
                        activeField={sortField}
                        direction={sortDir}
                      />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedMembers.map((m) => {
                  const avatarColor = getAvatarColor(m.full_name);
                  const isExpanded = expandedId === m.id;

                  return (
                    <Fragment key={m.id}>
                      <tr
                        onClick={() => setExpandedId((cur) => (cur === m.id ? null : m.id))}
                        className={`group border-b border-border cursor-pointer transition-colors hover:bg-[#f6faf7] ${
                          isExpanded ? "bg-[#f4f8f5] border-l-4 border-l-[#286148]" : ""
                        }`}
                      >
                        {/* Member # */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 font-mono text-xs text-text-muted">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-md bg-secondary-bg/80 transition-transform ${
                                isExpanded ? "rotate-180 bg-[#17613f]/10 text-primary" : ""
                              }`}
                            >
                              <ChevronDown size={14} />
                            </span>
                            <span className="font-semibold text-text-primary">
                              {m.member_number}
                            </span>
                          </div>
                        </td>

                        {/* Member Info (Avatar + Name) */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor.bg} ${avatarColor.text}`}
                            >
                              {m.full_name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                                {m.full_name}
                              </span>
                              {m.father_name && (
                                <span className="block truncate text-[11px] text-text-muted">
                                  S/O {m.father_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-3 font-mono text-xs text-text-muted">
                          {m.phone || "—"}
                        </td>

                        {/* Plan */}
                        <td className="px-4 py-3">
                          {m.membership_plan_name ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                              {m.membership_plan_name}
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>

                        {/* Blood Group */}
                        <td className="px-4 py-3">
                          {m.blood_group ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-red-50/80 px-2 py-0.5 text-xs font-semibold text-red-700">
                              <Droplet size={11} className="text-red-500" />
                              {m.blood_group}
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge variant={m.is_paid ? "active" : "danger"}>
                            {m.is_paid ? "Paid" : "Unpaid"}
                          </Badge>
                        </td>

                        {/* Balance */}
                        <td className="px-4 py-3 text-right">
                          {m.outstanding_balance > 0 ? (
                            <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200/60">
                              {hidden ? maskValue() : formatCurrency(m.outstanding_balance)}
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              {hidden ? maskValue() : formatCurrency(0)}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!m.is_archived && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPaymentForMember(m.id);
                                }}
                                className="gap-1 bg-[#17613f] hover:bg-[#104b31]"
                              >
                                <HandCoins size={13} />
                                Pay
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditForm(m);
                              }}
                              className="gap-1"
                            >
                              <Pencil size={13} />
                              Edit
                            </Button>
                            {!m.is_archived ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setArchiveTarget(m);
                                }}
                                title="Archive member"
                              >
                                <Archive size={13} />
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReactivateTarget(m);
                                  }}
                                  className="gap-1"
                                >
                                  <RotateCcw size={13} />
                                  Reactivate
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(m);
                                  }}
                                  title="Permanently delete member"
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Member Details Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0 border-b border-border">
                            <MemberDetailRow
                              member={m}
                              onEdit={openEditForm}
                              onPay={(memberId) => openPaymentForMember(memberId)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-border bg-[#fafbfa] px-4 py-3 text-xs text-text-muted">
            <span>
              Showing {Math.min((safePage - 1) * PAGE_SIZE + 1, sortedMembers.length)}–
              {Math.min(safePage * PAGE_SIZE, sortedMembers.length)} of {sortedMembers.length}{" "}
              members
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
              <span className="font-semibold text-text-primary">
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

      {/* Add / Edit Member Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingMember ? `Edit Member — ${editingMember.full_name}` : "Add New Gym Member"}
        maxWidthClassName="max-w-2xl"
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
              {editingMember ? "Save Changes" : "Register Member"}
            </Button>
          </>
        }
      >
        <MemberFormFields
          visibleFields={visibleFields}
          formData={formData}
          errors={formErrors}
          onChange={(key, value) =>
            setFormData((prev) => {
              if (key === "membership_plan_id") {
                const plan = plans.find((p) => p.id === value);
                return {
                  ...prev,
                  membership_plan_id: value,
                  monthly_fee: plan ? String(plan.price) : "",
                };
              }
              return { ...prev, [key]: value };
            })
          }
          plans={plans}
          addressSuggestions={addressSuggestions}
        />
      </Modal>

      {/* Archive Confirmation Dialog */}
      <Dialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title="Archive Member"
        message={`This will archive "${archiveTarget?.full_name ?? ""}". They will be hidden from the active members list, but their receipt records and payment history will remain intact.`}
        confirmLabel="Archive Member"
        variant="danger"
        onConfirm={handleArchive}
      />

      {/* Reactivate Confirmation Dialog */}
      <Dialog
        isOpen={!!reactivateTarget}
        onClose={() => setReactivateTarget(null)}
        title="Reactivate Member"
        message={`This will reactivate "${reactivateTarget?.full_name ?? ""}". They will appear in the active member directory once again.`}
        confirmLabel="Reactivate"
        variant="info"
        onConfirm={handleReactivate}
      />

      {/* Permanent Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => {
          if (deleting) return;
          setDeleteTarget(null);
        }}
        title="Delete Member Permanently"
        footer={
          <>
            <Button variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" loading={deleting} onClick={handlePermanentDelete}>
              Delete Permanently
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Are you sure you want to permanently delete{" "}
          <strong className="text-text-primary">{deleteTarget?.full_name}</strong>? Their remaining
          unpaid balance will be cleared. Existing payments, receipts, and revenue history will
          remain preserved. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
