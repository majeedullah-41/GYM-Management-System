import { invokeCommand } from "../tauri";

export interface GymSettings {
  gym_name: string;
  gym_logo: string | null;
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
  thermal_printer_name?: string | null;
  thermal_characters_per_line?: number | null;
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

export interface BackupSettings {
  directory: string | null;
  daily_enabled: boolean;
  close_enabled: boolean;
  last_backup_at: string | null;
}

export interface AllSettings {
  gym: GymSettings;
  receipt: ReceiptSettings;
  print: PrintSettings;
  backup: BackupSettings;
}

export async function getAllSettings(): Promise<AllSettings> {
  return invokeCommand<AllSettings>("get_all_settings");
}

export async function saveGymSettings(gym: GymSettings): Promise<void> {
  return invokeCommand<void>("save_gym_settings", { gym });
}

export async function saveReceiptSettings(receipt: ReceiptSettings): Promise<void> {
  return invokeCommand<void>("save_receipt_settings", { receipt });
}

export async function savePrintSettings(print: PrintSettings): Promise<void> {
  return invokeCommand<void>("save_print_settings", { print });
}

export async function saveBackupSettings(backup: BackupSettings): Promise<void> {
  return invokeCommand<void>("save_backup_settings", { backup });
}

export async function selectBackupFolder(): Promise<string | null> {
  return invokeCommand<string | null>("select_backup_folder");
}

export async function selectGymLogo(): Promise<string | null> {
  return invokeCommand<string | null>("select_gym_logo");
}

export async function backupDatabase(directory: string): Promise<string> {
  return invokeCommand<string>("backup_database", { directory });
}
