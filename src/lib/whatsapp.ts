export const DEFAULT_MEMBER_DUES_TEMPLATE =
  "Assalam-o-Alaikum [Member Name],\n\nThis is a friendly reminder from *[Gym Name]*. Your pending membership balance is *[Due Amount]* (Member ID: #[Member ID], Plan: [Plan Name]).\n\nKindly clear your remaining dues at your earliest convenience. Thank you!";

export const DEFAULT_SUPPLIER_DUES_TEMPLATE =
  "Assalam-o-Alaikum [Supplier Name],\n\nAccount update from *[Gym Name]*:\n• Total Purchased: [Total Purchased]\n• Total Paid: [Total Paid]\n• *Remaining Balance Due: [Remaining Due]*\n\nThank you!";

export const MEMBER_TEMPLATE_PLACEHOLDERS = [
  { token: "[Member Name]", label: "Member Name" },
  { token: "[Member ID]", label: "Member ID" },
  { token: "[Plan Name]", label: "Plan Name" },
  { token: "[Due Amount]", label: "Due Amount" },
  { token: "[Expiry Date]", label: "Expiry Date" },
  { token: "[Gym Name]", label: "Gym Name" },
];

export const SUPPLIER_TEMPLATE_PLACEHOLDERS = [
  { token: "[Supplier Name]", label: "Supplier Name" },
  { token: "[Company]", label: "Company" },
  { token: "[Total Purchased]", label: "Total Purchased" },
  { token: "[Total Paid]", label: "Total Paid" },
  { token: "[Remaining Due]", label: "Remaining Due" },
  { token: "[Gym Name]", label: "Gym Name" },
];

export function upgradeLegacyTemplate(
  template: string,
  recipientType: "member" | "supplier" = "member",
): string {
  return template
    .replace(/\{member_name\}/g, "[Member Name]")
    .replace(/\{member_number\}/g, "[Member ID]")
    .replace(/\{plan_name\}/g, "[Plan Name]")
    .replace(
      /\{due_amount\}/g,
      recipientType === "supplier" ? "[Remaining Due]" : "[Due Amount]",
    )
    .replace(/\{expiry_date\}/g, "[Expiry Date]")
    .replace(/\{gym_name\}/g, "[Gym Name]")
    .replace(/\{supplier_name\}/g, "[Supplier Name]")
    .replace(/\{company\}/g, "[Company]")
    .replace(/\{total_purchased\}/g, "[Total Purchased]")
    .replace(/\{total_paid\}/g, "[Total Paid]");
}

/**
 * Normalizes a local or international phone number into digits-only international format
 * suitable for WhatsApp (e.g., "0300-1234567" -> "923001234567").
 */
export function normalizeWhatsAppPhone(
  rawPhone: string | null | undefined,
  defaultCountryCode = "92",
): string {
  if (!rawPhone) return "";
  const code = defaultCountryCode.replace(/\D/g, "") || "92";
  let cleaned = rawPhone.trim().replace(/[\s\-().]/g, "");

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0")) {
    cleaned = code + cleaned.slice(1);
  } else if (cleaned.length === 10 && cleaned.startsWith("3")) {
    cleaned = code + cleaned;
  }

  return cleaned.replace(/\D/g, "");
}

export function buildWhatsAppUrl(
  phone: string,
  message: string,
  mode: "web" | "desktop" = "web",
): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const encodedText = encodeURIComponent(message);
  if (mode === "desktop") {
    return `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

const ENGLISH_LABEL_TO_KEY: Record<string, string> = {
  "member name": "member_name",
  "member id": "member_number",
  "member id #": "member_number",
  "plan name": "plan_name",
  "due amount": "due_amount",
  "remaining due": "due_amount",
  "expiry date": "expiry_date",
  "gym name": "gym_name",
  "supplier name": "supplier_name",
  company: "company",
  "total purchased": "total_purchased",
  "total paid": "total_paid",
};

export function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(
    /\[([^\[\]]+)\]|\{([^{}]+)\}/g,
    (match, bracketLabel?: string, braceKey?: string) => {
      if (bracketLabel !== undefined) {
        const mappedKey =
          ENGLISH_LABEL_TO_KEY[bracketLabel.trim().toLowerCase()] ??
          bracketLabel.trim();
        if (Object.prototype.hasOwnProperty.call(variables, mappedKey)) {
          return variables[mappedKey];
        }
        if (Object.prototype.hasOwnProperty.call(variables, bracketLabel)) {
          return variables[bracketLabel];
        }
        return match;
      }
      if (
        braceKey !== undefined &&
        Object.prototype.hasOwnProperty.call(variables, braceKey)
      ) {
        return variables[braceKey];
      }
      return match;
    },
  );
}

