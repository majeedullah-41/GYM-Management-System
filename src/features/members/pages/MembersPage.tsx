import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
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
  createMember,
  updateMember,
  archiveMember,
  unarchiveMember,
  type MemberResponse,
} from "../../../lib/api/members";
import { listActivePlans, type PlanResponse } from "../../../lib/api/membership-plans";
import { RecordPaymentModal } from "../components/RecordPaymentModal";
import { formatCurrency } from "../../../lib/utils/format";

interface FormData {
  full_name: string;
  father_name: string;
  phone: string;
  cnic: string;
  address: string;
  date_of_birth: string;
  gender: string;
  notes: string;
}

const EMPTY_FORM: FormData = {
  full_name: "",
  father_name: "",
  phone: "",
  cnic: "",
  address: "",
  date_of_birth: "",
  gender: "",
  notes: "",
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
  { value: "none", label: "No Membership" },
];

const STATUS_BADGE: Record<string, "active" | "warning" | "expired" | "info"> = {
  active: "active",
  expiring: "warning",
  expired: "expired",
  none: "info",
};

const PAGE_SIZE = 20;

type SortField = "member_number" | "full_name" | "phone" | "membership_plan_name" | "membership_expiry_date" | "outstanding_balance";
type SortDir = "asc" | "desc";

function sortMembers(members: MemberResponse[], field: SortField, dir: SortDir): MemberResponse[] {
  const sorted = [...members].sort((a, b) => {
    let va: string | number;
    let vb: string | number;
    switch (field) {
      case "member_number": va = a.member_number; vb = b.member_number; break;
      case "full_name": va = a.full_name.toLowerCase(); vb = b.full_name.toLowerCase(); break;
      case "phone": va = a.phone ?? ""; vb = b.phone ?? ""; break;
      case "membership_plan_name": va = a.membership_plan_name ?? ""; vb = b.membership_plan_name ?? ""; break;
      case "membership_expiry_date": va = a.membership_expiry_date ?? ""; vb = b.membership_expiry_date ?? ""; break;
      case "outstanding_balance": va = a.outstanding_balance; vb = b.outstanding_balance; break;
      default: return 0;
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

export function MembersPage({
  onMemberClick,
}: {
  onMemberClick?: (memberId: string) => void;
} = {}) {
  const { addToast } = useToast();

  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [plans, setPlans] = useState<PlanResponse[]>([]);

  const [sortField, setSortField] = useState<SortField>("member_number");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberResponse | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState<MemberResponse | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<MemberResponse | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<MemberResponse | null>(null);

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
    listActivePlans().then(setPlans).catch(() => {});
  }, []);

  const filteredMembers = useMemo(() => {
    if (!planFilter) return members;
    return members.filter((m) => m.membership_plan_name === planFilter);
  }, [members, planFilter]);

  const sortedMembers = useMemo(
    () => sortMembers(filteredMembers, sortField, sortDir),
    [filteredMembers, sortField, sortDir],
  );

  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedMembers = sortedMembers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, planFilter, showArchived]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-text-muted" />;
    return sortDir === "asc"
      ? <ArrowUp size={14} className="text-primary" />
      : <ArrowDown size={14} className="text-primary" />;
  };

  const openCreateForm = () => {
    setEditingMember(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEditForm = (member: MemberResponse) => {
    setEditingMember(member);
    setFormData({
      full_name: member.full_name,
      father_name: member.father_name ?? "",
      phone: member.phone ?? "",
      cnic: member.cnic ?? "",
      address: member.address ?? "",
      date_of_birth: member.date_of_birth ?? "",
      gender: member.gender ?? "",
      notes: member.notes ?? "",
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.full_name.trim()) errors.full_name = "Name is required";
    if (formData.phone.trim() && formData.phone.trim().length < 10)
      errors.phone = "Phone must be at least 10 digits";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload = {
        full_name: formData.full_name.trim(),
        father_name: formData.father_name.trim() || null,
        phone: formData.phone.trim() || null,
        cnic: formData.cnic.trim() || null,
        address: formData.address.trim() || null,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        notes: formData.notes.trim() || null,
      };

      if (editingMember) {
        await updateMember(editingMember.id, payload);
        addToast({
          variant: "success",
          title: "Member updated",
          message: `"${payload.full_name}" has been updated.`,
        });
      } else {
        await createMember(payload);
        addToast({
          variant: "success",
          title: "Member added",
          message: `"${payload.full_name}" has been added.`,
        });
      }

      setFormOpen(false);
      await loadMembers();
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
      await loadMembers();
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
      await loadMembers();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to reactivate member",
      });
    }
  };

  const planOptions = [
    { value: "", label: "All Plans" },
    ...plans.map((p) => ({ value: p.name, label: p.name })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Manage gym members and memberships."
        action={{ label: "+ Add Member", onClick: openCreateForm }}
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            name="member_search"
            placeholder="Search by name, phone or member #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
        />
        <Select
          options={planOptions}
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="w-40"
        />
        <label className="flex items-center gap-2 text-sm text-text-muted whitespace-nowrap">
          <input
            type="checkbox"
            name="show_archived"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          Show Archived
        </label>
      </div>

      {loading && <LoadingState message="Loading members..." />}
      {error && !loading && <ErrorState message={error} onRetry={loadMembers} />}

      {!loading && !error && sortedMembers.length === 0 && (
        <EmptyState
          title={search || statusFilter || planFilter || showArchived ? "No members found" : "No members yet"}
          message={
            search || statusFilter || planFilter || showArchived
              ? "Try adjusting your search or filters."
              : "Add your first gym member to start managing memberships."
          }
          action={
            !search && !statusFilter && !planFilter && !showArchived
              ? { label: "+ Add Member", onClick: openCreateForm }
              : undefined
          }
        />
      )}

      {!loading && !error && sortedMembers.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary-bg">
                  {([
                    ["member_number", "Member #"],
                    ["full_name", "Name"],
                    ["phone", "Phone"],
                    ["membership_plan_name", "Plan"],
                    ["membership_expiry_date", "Expiry"],
                  ] as const).map(([field, label]) => (
                    <th
                      key={field}
                      onClick={() => toggleSort(field)}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted cursor-pointer hover:text-text-primary select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        {label} <SortIcon field={field} />
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Status
                  </th>
                  <th
                    onClick={() => toggleSort("outstanding_balance")}
                    className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted cursor-pointer hover:text-text-primary select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      Balance <SortIcon field="outstanding_balance" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedMembers.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => onMemberClick?.(m.id)}
                    className={`border-b border-border last:border-b-0 ${
                      onMemberClick
                        ? "cursor-pointer hover:bg-secondary-bg"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">
                      {m.member_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {m.full_name}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {m.phone || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {m.membership_plan_name || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {m.membership_expiry_date || "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={STATUS_BADGE[m.membership_status ?? "none"] ?? "info"}
                      >
                        {m.membership_status
                          ? m.membership_status.charAt(0).toUpperCase() +
                            m.membership_status.slice(1)
                          : "No Plan"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.outstanding_balance > 0 ? (
                        <span className="text-orange-600 font-medium">
                          {formatCurrency(m.outstanding_balance)}
                        </span>
                      ) : (
                        <span className="text-green-600">\u2014</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!m.is_archived && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setPaymentTarget(m); }}
                          >
                            Pay
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openEditForm(m); }}
                        >
                          Edit
                        </Button>
                        {!m.is_archived ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setArchiveTarget(m); }}
                          >
                            Archive
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setReactivateTarget(m); }}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-text-muted">
            <span>
              Showing {Math.min((safePage - 1) * PAGE_SIZE + 1, sortedMembers.length)}–
              {Math.min(safePage * PAGE_SIZE, sortedMembers.length)} of {sortedMembers.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-text-primary font-medium">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingMember ? "Edit Member" : "Add Member"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleSubmit}>
              {editingMember ? "Save Changes" : "Add Member"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Ahmad Khan"
            value={formData.full_name}
            onChange={(e) =>
              setFormData((p) => ({ ...p, full_name: e.target.value }))
            }
            error={formErrors.full_name}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Father Name"
              value={formData.father_name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, father_name: e.target.value }))
              }
            />
            <Input
              label="Phone"
              placeholder="03xxxxxxxxx"
              value={formData.phone}
              onChange={(e) =>
                setFormData((p) => ({ ...p, phone: e.target.value }))
              }
              error={formErrors.phone}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="CNIC"
              placeholder="xxxxx-xxxxxxx-x"
              value={formData.cnic}
              onChange={(e) =>
                setFormData((p) => ({ ...p, cnic: e.target.value }))
              }
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">
                Gender
              </label>
              <select
                name="member_gender"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                value={formData.gender}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, gender: e.target.value }))
                }
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
          <Input
            label="Date of Birth"
            type="date"
            value={formData.date_of_birth}
            onChange={(e) =>
              setFormData((p) => ({ ...p, date_of_birth: e.target.value }))
            }
          />
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) =>
              setFormData((p) => ({ ...p, address: e.target.value }))
            }
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              Notes <span className="text-text-muted">(optional)</span>
            </label>
            <textarea
              name="member_notes"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="Additional notes about this member"
              value={formData.notes}
              onChange={(e) =>
                setFormData((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>
        </div>
      </Modal>

      <Dialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title="Archive Member"
        message={`This will archive "${archiveTarget?.full_name ?? ""}". They will be hidden from the active member list. Their payment history will remain available.`}
        confirmLabel="Archive Member"
        variant="danger"
        onConfirm={handleArchive}
      />

      <Dialog
        isOpen={!!reactivateTarget}
        onClose={() => setReactivateTarget(null)}
        title="Reactivate Member"
        message={`This will reactivate "${reactivateTarget?.full_name ?? ""}". They will appear in the active member list again.`}
        confirmLabel="Reactivate"
        variant="info"
        onConfirm={handleReactivate}
      />

      {paymentTarget && (
        <RecordPaymentModal
          isOpen={!!paymentTarget}
          onClose={() => setPaymentTarget(null)}
          memberId={paymentTarget.id}
          memberName={paymentTarget.full_name}
          onPaymentRecorded={loadMembers}
        />
      )}
    </div>
  );
}
