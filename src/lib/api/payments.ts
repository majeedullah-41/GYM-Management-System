import { invokeCommand } from "../tauri";

export interface PaymentResponse {
  id: string;
  receipt_number: string;
  member_id: string;
  member_name: string | null;
  member_number: string | null;
  amount: number;
  payment_method: string;
  payment_date: string;
  membership_plan_id: string;
  membership_plan_name: string | null;
  membership_start_date: string;
  membership_expiry_date: string;
  description: string | null;
  reference: string | null;
  notes: string | null;
  is_voided: boolean;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentSummary {
  plan_price: number;
  previously_paid: number;
  outstanding: number;
  admission_fee: number | null;
  is_first_payment: boolean;
  membership_start_date: string | null;
  membership_expiry_date: string | null;
}

export interface CreatePaymentRequest {
  member_id: string;
  membership_plan_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  description?: string | null;
  reference?: string | null;
  notes?: string | null;
}

export interface UpdatePaymentRequest {
  description: string | null;
  reference: string | null;
  notes: string | null;
}

export const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Card",
  "Other",
] as const;

export async function createPayment(
  request: CreatePaymentRequest,
): Promise<PaymentResponse> {
  return invokeCommand<PaymentResponse>("create_payment", { request });
}

export async function getPayment(id: string): Promise<PaymentResponse> {
  return invokeCommand<PaymentResponse>("get_payment", { id });
}

export async function listPayments(args: {
  search?: string;
  date_from?: string;
  date_to?: string;
  member_id?: string;
  plan_id?: string;
  status?: string;
}): Promise<PaymentResponse[]> {
  return invokeCommand<PaymentResponse[]>("list_payments", {
    search: args.search ?? null,
    dateFrom: args.date_from ?? null,
    dateTo: args.date_to ?? null,
    memberId: args.member_id ?? null,
    planId: args.plan_id ?? null,
    status: args.status ?? null,
  });
}

export async function updatePayment(
  id: string,
  request: UpdatePaymentRequest,
): Promise<PaymentResponse> {
  return invokeCommand<PaymentResponse>("update_payment", { id, request });
}

export async function listMemberPayments(
  memberId: string,
): Promise<PaymentResponse[]> {
  return invokeCommand<PaymentResponse[]>("list_member_payments", {
    memberId: memberId,
  });
}

export async function getPaymentSummary(
  memberId: string,
  planId: string,
): Promise<PaymentSummary> {
  return invokeCommand<PaymentSummary>("get_payment_summary", {
    memberId: memberId,
    planId: planId,
  });
}

export async function voidPayment(
  id: string,
  reason: string,
): Promise<PaymentResponse> {
  return invokeCommand<PaymentResponse>("void_payment", {
    id,
    request: { reason },
  });
}
