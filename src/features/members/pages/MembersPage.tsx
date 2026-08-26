import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
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
  type MemberResponse,
} from "../../../lib/api/members";
import { RecordPaymentModal } from "../components/RecordPaymentModal";

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

export function MembersPage() {
  const { addToast } = useToast();

  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberResponse | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState<MemberResponse | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<MemberResponse | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setMembers(
        await listMembers({
          search,
          status: statusFilter || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

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
          className="w-44"
        />
      </div>

      {loading && <LoadingState message="Loading members..." />}
      {error && !loading && <ErrorState message={error} onRetry={loadMembers} />}

      {!loading && !error && members.length === 0 && (
        <EmptyState
          title={search || statusFilter ? "No members found" : "No members yet"}
          message={
            search || statusFilter
              ? "Try adjusting your search or filters."
              : "Add your first gym member to start managing memberships."
          }
          action={
            !search && !statusFilter
              ? { label: "+ Add Member", onClick: openCreateForm }
              : undefined
          }
        />
      )}

      {!loading && !error && members.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary-bg">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Member #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Expiry
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">
                    {m.member_number}
                  </td>
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {m.full_name}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {m.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {m.membership_plan_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {m.membership_expiry_date || "—"}
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
                    <div className="flex items-center justify-end gap-2">
                      {!m.is_archived && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setPaymentTarget(m)}
                        >
                          Pay
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditForm(m)}
                      >
                        Edit
                      </Button>
                      {!m.is_archived && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setArchiveTarget(m)}
                        >
                          Archive
                        </Button>
                      )}
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
