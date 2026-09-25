import { useEffect, useState } from "react";
import {
  Calendar,
  CreditCard,
  Droplet,
  FileText,
  HandCoins,
  MapPin,
  Pencil,
  Phone,
  Receipt,
  User,
  Wallet,
} from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import { formatCurrency, formatDate, formatPeriod } from "../../../lib/utils/format";
import { usePrivacy, maskValue } from "../../../context/PrivacyContext";
import {
  listMemberPayments,
  getPaymentSummary,
  type PaymentResponse,
  type PaymentSummary,
} from "../../../lib/api/payments";
import type { MemberResponse } from "../../../lib/api/members";

const METHOD_BADGE: Record<string, "active" | "info"> = {
  Cash: "active",
  Card: "info",
  "Bank Transfer": "info",
  Other: "info",
};

const AVATAR_COLORS = [
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

interface MemberDetailRowProps {
  member: MemberResponse;
  onEdit?: (member: MemberResponse) => void;
  onPay?: (memberId: string) => void;
}

export function MemberDetailRow({ member, onEdit, onPay }: MemberDetailRowProps) {
  const { hidden } = usePrivacy();
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const p = await listMemberPayments(member.id);
        if (cancelled) return;
        setPayments(p);
        const planId = p.length > 0 ? p[0].membership_plan_id : member.membership_plan_id;
        if (planId) {
          const s = await getPaymentSummary(member.id, planId).catch(() => null);
          if (!cancelled) setSummary(s);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [member.id, member.membership_plan_id]);

  if (loading) {
    return (
      <div className="px-6 py-8">
        <LoadingState message="Loading member profile & billing..." />
      </div>
    );
  }

  const lastPayment = payments.find((payment) => !payment.is_voided);
  const totalPaid = payments.reduce((sum, p) => sum + (p.is_voided ? 0 : p.amount), 0);
  const avatarColor = getAvatarColor(member.full_name);

  return (
    <div className="space-y-4 bg-[#f8faf8] p-5 border-y border-border/80">
      {/* Top Banner Card */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold shadow-xs ${avatarColor.bg} ${avatarColor.text}`}
          >
            {member.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-text-primary">{member.full_name}</h2>
              <span className="rounded-md bg-secondary-bg px-2 py-0.5 font-mono text-xs font-semibold text-text-muted">
                {member.member_number}
              </span>
              <Badge variant={member.is_paid ? "active" : "danger"}>
                {member.is_paid ? "Active / Paid" : "Unpaid Dues"}
              </Badge>
              {member.blood_group && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                  <Droplet size={11} className="text-red-500" />
                  {member.blood_group}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {member.father_name && `S/O ${member.father_name} · `}
              {member.membership_plan_name ? (
                <span className="font-medium text-emerald-800">
                  {member.membership_plan_name} Plan
                </span>
              ) : (
                "No active plan"
              )}
              {member.admission_date && ` · Joined ${formatDate(member.admission_date)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onPay && !member.is_archived && (
            <Button size="sm" onClick={() => onPay(member.id)} className="gap-1.5">
              <HandCoins size={14} />
              Receive Payment
            </Button>
          )}
          {onEdit && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onEdit(member)}
              className="gap-1.5"
            >
              <Pencil size={14} />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* 2-Column Info Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Personal Details Card */}
        <Card title="Personal Information">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <User size={13} className="text-text-muted" />
                Full Name
              </span>
              <p className="mt-1 font-medium text-text-primary">{member.full_name}</p>
            </div>

            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <User size={13} className="text-text-muted" />
                Father Name
              </span>
              <p className="mt-1 font-medium text-text-primary">{member.father_name || "—"}</p>
            </div>

            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <Phone size={13} className="text-text-muted" />
                Phone Number
              </span>
              <p className="mt-1 font-medium text-text-primary">{member.phone || "—"}</p>
            </div>

            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <CreditCard size={13} className="text-text-muted" />
                CNIC Number
              </span>
              <p className="mt-1 font-mono font-medium text-text-primary">{member.cnic || "—"}</p>
            </div>

            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <Calendar size={13} className="text-text-muted" />
                Date of Birth
              </span>
              <p className="mt-1 font-medium text-text-primary">
                {formatDate(member.date_of_birth)}
              </p>
            </div>

            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <Calendar size={13} className="text-text-muted" />
                Admission Date
              </span>
              <p className="mt-1 font-medium text-text-primary">
                {formatDate(member.admission_date)}
              </p>
            </div>

            <div className="col-span-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <MapPin size={13} className="text-text-muted" />
                Address
              </span>
              <p className="mt-1 font-medium text-text-primary">{member.address || "—"}</p>
            </div>

            {member.notes && (
              <div className="col-span-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <FileText size={13} className="text-text-muted" />
                  Notes
                </span>
                <p className="mt-1 rounded-md bg-secondary-bg/60 p-2 text-text-primary">
                  {member.notes}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Membership & Financial Card */}
        <Card title="Membership & Dues Status">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg bg-emerald-50/70 p-3 border border-emerald-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                Current Plan
              </span>
              <p className="mt-1 text-sm font-bold text-emerald-950">
                {member.membership_plan_name || "No Plan"}
              </p>
              {summary && (
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Fee: {hidden ? maskValue() : formatCurrency(summary.plan_price)}
                </p>
              )}
            </div>

            <div
              className={`rounded-lg p-3 border ${
                member.outstanding_balance > 0
                  ? "bg-amber-50/70 border-amber-200"
                  : "bg-emerald-50/70 border-emerald-200"
              }`}
            >
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  member.outstanding_balance > 0 ? "text-amber-800" : "text-emerald-800"
                }`}
              >
                Outstanding Balance
              </span>
              <p
                className={`mt-1 text-sm font-bold ${
                  member.outstanding_balance > 0 ? "text-amber-900" : "text-emerald-900"
                }`}
              >
                {hidden ? maskValue() : formatCurrency(member.outstanding_balance)}
              </p>
              <p
                className={`text-[11px] mt-0.5 ${
                  member.outstanding_balance > 0 ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {member.outstanding_balance > 0 ? "Payment pending" : "All cleared"}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Membership Period
              </span>
              <p className="mt-1 font-medium text-text-primary">
                {formatPeriod(member.membership_start_date, member.membership_expiry_date, "→")}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Last Payment Date
              </span>
              <p className="mt-1 font-medium text-text-primary">
                {formatDate(lastPayment?.payment_date)}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Total Lifetime Paid
              </span>
              <p className="mt-1 font-semibold text-emerald-700">
                {hidden ? maskValue() : formatCurrency(totalPaid)}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Previous Dues
              </span>
              <p
                className={`mt-1 font-semibold ${
                  (summary?.previous_dues ?? 0) > 0 ? "text-amber-600" : "text-text-primary"
                }`}
              >
                {hidden ? maskValue() : formatCurrency(summary?.previous_dues ?? 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Payment History */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Receipt size={16} className="text-primary" />
              Recent Payment Receipts
            </h3>
            <span className="text-xs text-text-muted">{payments.length} recorded</span>
          </div>

          {payments.length === 0 ? (
            <p className="py-8 text-center text-xs text-text-muted">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-muted">
                    <th className="pb-2 text-left font-medium">Receipt #</th>
                    <th className="pb-2 text-left font-medium">Date</th>
                    <th className="pb-2 text-left font-medium">Method</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 5).map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border transition-colors hover:bg-[#f6faf7] last:border-0"
                    >
                      <td className="py-2.5 font-mono text-[11px] text-text-muted">
                        {p.receipt_number}
                      </td>
                      <td className="py-2.5 text-text-muted">{formatDate(p.payment_date)}</td>
                      <td className="py-2.5">
                        {p.is_voided ? (
                          <Badge variant="danger">Voided</Badge>
                        ) : (
                          <Badge variant={METHOD_BADGE[p.payment_method] ?? "info"}>
                            {p.payment_method}
                          </Badge>
                        )}
                      </td>
                      <td
                        className={`py-2.5 text-right font-semibold ${
                          p.is_voided ? "line-through text-text-muted" : "text-text-primary"
                        }`}
                      >
                        {hidden ? maskValue() : formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Membership Dues History */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Wallet size={16} className="text-primary" />
              Membership Bills & Dues
            </h3>
            <span className="text-xs text-text-muted">
              {summary?.bills.length ?? 0} bill periods
            </span>
          </div>

          {!summary || summary.bills.length === 0 ? (
            <p className="py-8 text-center text-xs text-text-muted">
              No membership bills generated yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-muted">
                    <th className="pb-2 text-left font-medium">Plan Period</th>
                    <th className="pb-2 text-right font-medium">Expected</th>
                    <th className="pb-2 text-right font-medium">Paid</th>
                    <th className="pb-2 text-right font-medium">Due</th>
                    <th className="pb-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...summary.bills]
                    .reverse()
                    .slice(0, 5)
                    .map((bill) => (
                      <tr
                        key={bill.id}
                        className="border-b border-border transition-colors hover:bg-[#f6faf7] last:border-0"
                      >
                        <td className="py-2.5 text-text-primary">
                          {formatPeriod(bill.period_start, bill.period_end)}
                        </td>
                        <td className="py-2.5 text-right font-medium text-text-muted">
                          {hidden ? maskValue() : formatCurrency(bill.expected_amount)}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-emerald-700">
                          {hidden ? maskValue() : formatCurrency(bill.paid_amount)}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-amber-700">
                          {hidden ? maskValue() : formatCurrency(bill.remaining_amount)}
                        </td>
                        <td className="py-2.5 text-right">
                          <Badge
                            variant={
                              bill.status === "PAID"
                                ? "active"
                                : bill.status === "CURRENT"
                                  ? "info"
                                  : "danger"
                            }
                          >
                            {bill.status.replace("PARTIALLY_PAID", "PARTIAL")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
