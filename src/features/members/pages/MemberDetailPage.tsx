import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { formatCurrency } from "../../../lib/utils/format";
import {
  getMember,
  type MemberResponse,
} from "../../../lib/api/members";
import {
  listMemberPayments,
  getPaymentSummary,
  type PaymentResponse,
  type PaymentSummary,
} from "../../../lib/api/payments";

interface Props {
  memberId: string;
  onBack: () => void;
}

const STATUS_BADGE: Record<string, "active" | "warning" | "expired" | "info"> = {
  active: "active",
  expiring: "warning",
  expired: "expired",
  none: "info",
};

const METHOD_BADGE: Record<string, "active" | "info"> = {
  Cash: "active",
  Card: "info",
  "Bank Transfer": "info",
  Other: "info",
};

export function MemberDetailPage({ memberId, onBack }: Props) {
  const [member, setMember] = useState<MemberResponse | null>(null);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [m, p] = await Promise.all([
        getMember(memberId),
        listMemberPayments(memberId),
      ]);
      setMember(m);
      setPayments(p);
      if (m.membership_plan_name) {
        const planId = p.length > 0 ? p[0].membership_plan_id : null;
        if (planId) {
          const s = await getPaymentSummary(memberId, planId).catch(() => null);
          setSummary(s);
        }
      }
    } catch (err) {
      console.error("MemberDetailPage load error:", err);
      setError(err instanceof Error ? err.message : "Failed to load member");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Loading member..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!member) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft size={14} className="mr-1" />
          Back to Members
        </Button>
      </div>

      <PageHeader
        title={member.full_name}
        description={`Member ${member.member_number}`}
      />

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2 p-5">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">
            Member Information
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <span className="text-text-muted">Member #</span>
              <div className="font-mono font-medium">{member.member_number}</div>
            </div>
            <div>
              <span className="text-text-muted">Full Name</span>
              <div className="font-medium">{member.full_name}</div>
            </div>
            {member.father_name && (
              <div>
                <span className="text-text-muted">Father Name</span>
                <div>{member.father_name}</div>
              </div>
            )}
            {member.phone && (
              <div>
                <span className="text-text-muted">Phone</span>
                <div>{member.phone}</div>
              </div>
            )}
            {member.cnic && (
              <div>
                <span className="text-text-muted">CNIC</span>
                <div className="font-mono">{member.cnic}</div>
              </div>
            )}
            {member.admission_fee != null && member.admission_fee > 0 && (
              <div>
                <span className="text-text-muted">Admission Fee</span>
                <div>
                  {formatCurrency(member.admission_fee)}
                  {!member.admission_fee_collected && (
                    <span className="ml-1 text-xs font-medium text-orange-600">
                      (not collected)
                    </span>
                  )}
                </div>
              </div>
            )}
            {member.gender && (
              <div>
                <span className="text-text-muted">Gender</span>
                <div>{member.gender}</div>
              </div>
            )}
            {member.date_of_birth && (
              <div>
                <span className="text-text-muted">Date of Birth</span>
                <div>{member.date_of_birth}</div>
              </div>
            )}
            {member.address && (
              <div className="col-span-2">
                <span className="text-text-muted">Address</span>
                <div>{member.address}</div>
              </div>
            )}
            {member.notes && (
              <div className="col-span-2">
                <span className="text-text-muted">Notes</span>
                <div>{member.notes}</div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">
            Membership
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-text-muted">Plan</span>
              <div className="font-medium">
                {member.membership_plan_name || "No Plan"}
              </div>
            </div>
            <div>
              <span className="text-text-muted">Status</span>
              <div>
                <Badge
                  variant={
                    STATUS_BADGE[member.membership_status ?? "none"] ?? "info"
                  }
                >
                  {member.membership_status
                    ? member.membership_status.charAt(0).toUpperCase() +
                      member.membership_status.slice(1)
                    : "No Plan"}
                </Badge>
              </div>
            </div>
            {member.membership_start_date && (
              <div>
                <span className="text-text-muted">Start Date</span>
                <div>{member.membership_start_date}</div>
              </div>
            )}
            {member.membership_expiry_date && (
              <div>
                <span className="text-text-muted">Expiry Date</span>
                <div>{member.membership_expiry_date}</div>
              </div>
            )}
            {summary && (
              <>
                <div className="border-t border-border pt-3">
                  <span className="text-text-muted">Plan Price</span>
                  <div>{formatCurrency(summary.plan_price)}</div>
                </div>
                {summary.previously_paid > 0 && (
                  <div>
                    <span className="text-text-muted">Paid So Far</span>
                    <div className="text-green-600">
                      {formatCurrency(summary.previously_paid)}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-text-muted">Outstanding</span>
                  <div
                    className={
                      summary.outstanding > 0
                        ? "font-semibold text-orange-600"
                        : "text-green-600"
                    }
                  >
                    {formatCurrency(summary.outstanding)}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-text-primary">
          Payment History
        </h3>
        {payments.length === 0 ? (
          <p className="text-sm text-text-muted">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-xs font-medium text-text-muted">
                    Receipt #
                  </th>
                  <th className="pb-2 text-left text-xs font-medium text-text-muted">
                    Date
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-text-muted">
                    Amount
                  </th>
                  <th className="pb-2 text-left text-xs font-medium text-text-muted">
                    Method
                  </th>
                  <th className="pb-2 text-left text-xs font-medium text-text-muted">
                    Period
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-text-muted">
                    Outstanding
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2.5 font-mono text-xs text-text-muted">
                      {p.receipt_number}
                    </td>
                    <td className="py-2.5 text-text-primary">{p.payment_date}</td>
                    <td className="py-2.5 text-right font-medium text-text-primary">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-2.5">
                      <Badge variant={METHOD_BADGE[p.payment_method] ?? "info"}>
                        {p.payment_method}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-text-muted text-xs">
                      {p.membership_start_date} → {p.membership_expiry_date}
                    </td>
                    <td className="py-2.5 text-right text-text-muted">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
