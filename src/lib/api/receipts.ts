import { invokeCommand } from "../tauri";

export interface ReceiptResponse {
  id: string;
  receipt_number: string;
  issued_at: string;
  gym_name: string;
  gym_address: string | null;
  gym_phone: string | null;
  member_name: string;
  member_number: string;
  plan_name: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  membership_start_date: string;
  membership_expiry_date: string;
  notes: string | null;
  remaining_balance: number;
}

export async function getReceiptByPaymentId(
  paymentId: string,
): Promise<ReceiptResponse> {
  return invokeCommand<ReceiptResponse>("get_receipt_by_payment_id", {
    paymentId: paymentId,
  });
}

export async function getReceiptByNumber(
  receiptNumber: string,
): Promise<ReceiptResponse> {
  return invokeCommand<ReceiptResponse>("get_receipt_by_number", {
    receiptNumber: receiptNumber,
  });
}

export async function printReceipt(receipt: ReceiptResponse): Promise<void> {
  return invokeCommand<void>("print_receipt_json", {
    receiptJson: JSON.stringify(receipt),
  });
}
