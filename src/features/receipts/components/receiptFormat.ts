export const DEFAULT_RECEIPT_TITLE = "PAYMENT RECEIPT";
export const DEFAULT_RECEIPT_FOOTER = "Stay Fit | Stay Healthy";
export const RECEIPT_BRANDING = "Software provided by EagleNest Creations (0346-4451505)";

export function receiptFooterText(footer?: string | null): string {
  if (footer === null || footer === "") return "";
  if (footer === undefined) return DEFAULT_RECEIPT_FOOTER;
  const value = footer.trim();
  if (value.toLowerCase() === "thank you for being a member") {
    return DEFAULT_RECEIPT_FOOTER;
  }
  return value;
}

export function formatReceiptDate(issuedAt: string): string {
  const date = new Date(issuedAt);
  if (Number.isNaN(date.getTime())) return issuedAt;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${day}/${month}/${year} ${time}`;
}

export function formatReceiptPeriodDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1].slice(2)}` : value;
}
