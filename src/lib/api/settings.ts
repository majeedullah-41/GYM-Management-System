import { invokeCommand } from "../tauri";

export interface GymSettings {
  gym_name: string;
  gym_address: string | null;
  gym_phone: string | null;
  gym_email: string | null;
  gym_website: string | null;
}

export interface ReceiptSettings {
  receipt_title: string;
  receipt_footer: string | null;
  show_phone: boolean;
  show_address: boolean;
  show_member_id: boolean;
  show_notes: boolean;
}

export interface PrintSettings {
  destination: string;
  paper_width: string;
  font_size: number;
  show_gym_name: boolean;
  show_gym_phone: boolean;
  show_gym_address: boolean;
  show_receipt_title: boolean;
  show_receipt_number: boolean;
  show_date: boolean;
  show_member_info: boolean;
  show_plan_info: boolean;
  show_period: boolean;
  show_payment_details: boolean;
  show_remaining_balance: boolean;
  show_notes: boolean;
  show_footer: boolean;
}

export interface AllSettings {
  gym: GymSettings;
  receipt: ReceiptSettings;
  print: PrintSettings;
}

export async function getAllSettings(): Promise<AllSettings> {
  return invokeCommand<AllSettings>("get_all_settings");
}

export async function saveGymSettings(gym: GymSettings): Promise<void> {
  return invokeCommand<void>("save_gym_settings", { gym });
}

export async function saveReceiptSettings(
  receipt: ReceiptSettings,
): Promise<void> {
  return invokeCommand<void>("save_receipt_settings", { receipt });
}

export async function savePrintSettings(
  print: PrintSettings,
): Promise<void> {
  return invokeCommand<void>("save_print_settings", { print });
}

export async function backupDatabase(destPath: string): Promise<void> {
  return invokeCommand<void>("backup_database", { destPath });
}
