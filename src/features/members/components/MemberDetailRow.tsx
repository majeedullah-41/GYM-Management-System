import { useEffect, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { LoadingState } from "../../../components/ui/LoadingState";
import { formatCurrency } from "../../../lib/utils/format";
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

export function MemberDetailRow({ member }: { member: MemberResponse }) {
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
        const planId =
          p.length > 0 ? p[0].membership_plan_id : member.membership_plan_id;
        if (planId) {
          const s = await getPaymentSummary(member.id, planId).catch(
            () => null,
          );
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
      <div className="px-4 py-6">
        <LoadingState message="Loading member details..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-md border border-border bg-surface p-4 md:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">
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
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">
            Membership & Dues
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
                <Badge variant={member.is_paid ? "success" : "danger"}>
                  {member.is_paid ? "Paid" : "Unpaid"}
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
            <div className="border-t border-border pt-3">
              <span className="text-text-muted">Total Paid</span>
              <div className="font-medium text-green-600">
                {formatCurrency(
                  payments.reduce((sum, p) => sum + p.amount, 0),
                )}
              </div>
            </div>
            <div>
              <span className="text-text-muted">Pending Dues</span>
              <div
                className={
                  member.outstanding_balance > 0
                    ? "font-semibold text-orange-600"
                    : "text-green-600"
                }
              >
                {formatCurrency(member.outstanding_balance)}
              </div>
            </div>
            {summary && summary.is_first_payment && summary.admission_fee && (
              <div>
                <span className="text-text-muted">Admission Fee Due</span>
                <div className="text-orange-600">
                  {formatCurrency(summary.admission_fee)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-text-primary">
          Fee / Payment History
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
                    <td className="py-2.5 text-text-primary">
                      {p.payment_date}
                    </td>
                    <td className="py-2.5 text-right font-medium text-text-primary">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-2.5">
                      <Badge variant={METHOD_BADGE[p.payment_method] ?? "info"}>
                        {p.payment_method}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-xs text-text-muted">
                      {p.membership_start_date} → {p.membership_expiry_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
