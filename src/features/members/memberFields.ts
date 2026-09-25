export type MemberFieldKey =
  | "full_name"
  | "father_name"
  | "phone"
  | "cnic"
  | "gender"
  | "date_of_birth"
  | "admission_date"
  | "blood_group"
  | "address"
  | "notes"
  | "membership_plan_id"
  | "monthly_fee";

export interface MemberFieldDef {
  key: MemberFieldKey;
  label: string;
  required?: boolean;
  locked?: boolean;
  description?: string;
}

export const MEMBER_FIELDS: MemberFieldDef[] = [
  {
    key: "full_name",
    label: "Full Name",
    required: true,
    locked: true,
    description: "Member's full name (required)",
  },
  { key: "father_name", label: "Father Name", description: "Member's father's name" },
  { key: "phone", label: "Phone", description: "Mobile / contact number" },
  { key: "cnic", label: "CNIC", description: "National identity card number" },
  { key: "gender", label: "Gender", description: "Male or female" },
  { key: "date_of_birth", label: "Date of Birth", description: "Birth date" },
  {
    key: "admission_date",
    label: "Admission Date",
    description: "Defaults to today, can be set to any date",
  },
  { key: "blood_group", label: "Blood Group", description: "A+, B-, etc." },
  { key: "address", label: "Address", description: "Residential address" },
  { key: "notes", label: "Notes", description: "Any additional information" },
  { key: "membership_plan_id", label: "Membership Plan", description: "Assigned plan on sign-up" },
];

export const FORM_ROWS: MemberFieldKey[][] = [
  ["full_name"],
  ["father_name", "phone"],
  ["cnic", "gender"],
  ["date_of_birth"],
  ["admission_date"],
  ["blood_group"],
  ["address"],
  ["notes"],
  ["membership_plan_id"],
];

export const DEFAULT_VISIBLE_MEMBER_FIELDS: MemberFieldKey[] = [
  "full_name",
  "father_name",
  "phone",
  "cnic",
  "gender",
  "date_of_birth",
  "admission_date",
  "blood_group",
  "address",
  "membership_plan_id",
];

export interface FormData {
  full_name: string;
  father_name: string;
  phone: string;
  cnic: string;
  address: string;
  date_of_birth: string;
  admission_date: string;
  gender: string;
  blood_group: string;
  notes: string;
  membership_plan_id: string;
  monthly_fee: string;
}

export const EMPTY_FORM: FormData = {
  full_name: "",
  father_name: "",
  phone: "",
  cnic: "",
  address: "",
  date_of_birth: "",
  admission_date: "",
  gender: "",
  blood_group: "",
  notes: "",
  membership_plan_id: "",
  monthly_fee: "",
};

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function capitalizeName(value: string): string {
  return value.replace(/(^|\s)(\p{L})/gu, (_full, prefix, letter) => prefix + letter.toUpperCase());
}
