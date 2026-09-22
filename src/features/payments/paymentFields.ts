export type PaymentFieldKey =
  | "member"
  | "membership_plan"
  | "amount"
  | "payment_method"
  | "payment_date"
  | "summary"
  | "payment_month"
  | "notes";

export interface PaymentFieldDef {
  key: PaymentFieldKey;
  label: string;
  required?: boolean;
  locked?: boolean;
  description?: string;
}

export const PAYMENT_FIELDS: PaymentFieldDef[] = [
  {
    key: "member",
    label: "Member",
    required: true,
    locked: true,
    description: "The member the payment belongs to",
  },
  {
    key: "membership_plan",
    label: "Membership Plan",
    required: true,
    locked: true,
    description: "The plan being paid for",
  },
  {
    key: "amount",
    label: "Amount",
    required: true,
    locked: true,
    description: "Amount being paid",
  },
  {
    key: "payment_method",
    label: "Payment Method",
    required: true,
    locked: true,
    description: "Cash, bank transfer, card, etc.",
  },
  {
    key: "payment_date",
    label: "Payment Date",
    required: true,
    locked: true,
    description: "Date the payment is recorded",
  },
  {
    key: "summary",
    label: "Dues Summary",
    description: "Shows previous dues and outstanding balance",
  },
  {
    key: "payment_month",
    label: "Payment Month",
    description: "Month label shown in reports and receipts",
  },
  {
    key: "notes",
    label: "Notes",
    description: "Optional note for this payment",
  },
];

export const PAYMENT_REQUIRED_FIELDS: PaymentFieldKey[] = [
  "member",
  "membership_plan",
  "amount",
  "payment_method",
  "payment_date",
];

export const ALL_PAYMENT_FIELD_KEYS: PaymentFieldKey[] = PAYMENT_FIELDS.map((f) => f.key);

export const DEFAULT_VISIBLE_PAYMENT_FIELDS: PaymentFieldKey[] = ALL_PAYMENT_FIELD_KEYS;

export function normalizePaymentFields(values: string[]): PaymentFieldKey[] {
  const known = new Set<PaymentFieldKey>(ALL_PAYMENT_FIELD_KEYS);
  const result: PaymentFieldKey[] = [];
  for (const required of PAYMENT_REQUIRED_FIELDS) result.push(required);
  for (const value of values) {
    const key = value as PaymentFieldKey;
    if (!known.has(key) || result.includes(key)) continue;
    result.push(key);
  }
  return result;
}