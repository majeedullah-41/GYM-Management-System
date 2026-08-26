export interface Member {
  id: string;
  member_number: string;
  full_name: string;
  father_name: string | null;
  phone: string | null;
  cnic: string | null;
  emergency_contact: string | null;
  photo_path: string | null;
  membership_plan_id: string | null;
  membership_start_date: string | null;
  membership_expiry_date: string | null;
  status: "active" | "expiring" | "expired";
  notes: string | null;
  is_archived: boolean;
  archived_at: string | null;
  outstanding_balance: number;
  created_at: string;
  updated_at: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  receipt_number: string;
  member_id: string;
  amount: number;
  payment_method: "Cash" | "Card" | "BankTransfer" | "Other";
  payment_date: string;
  membership_plan_id: string | null;
  membership_start_date: string | null;
  membership_expiry_date: string | null;
  notes: string | null;
  is_voided: boolean;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  payment_id: string;
  gym_name: string;
  gym_tagline: string | null;
  member_name: string;
  member_number: string;
  plan_name: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  membership_start_date: string;
  membership_expiry_date: string;
  printed_at: string | null;
  created_at: string;
}

export type Page =
  | "dashboard"
  | "members"
  | "finances"
  | "reports"
  | "settings"
  | "member-detail";

export interface Toast {
  id: string;
  title: string;
  message?: string;
  variant: "success" | "error" | "warning" | "info";
}
