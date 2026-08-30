import { jsPDF } from "jspdf";
import { invokeCommand } from "./tauri";
import type { ReceiptResponse } from "./api/receipts";
import type {
  FinancialReport,
  PaymentReport,
  ExpenseReport,
  MemberReport,
  MembershipStatusReport,
} from "./api/reports";

const INDIGO: [number, number, number] = [79, 70, 229];
const SLATE: [number, number, number] = [71, 85, 105];
const GREEN: [number, number, number] = [22, 163, 74];
const RED: [number, number, number] = [220, 38, 38];
const LIGHT: [number, number, number] = [241, 245, 249];

function fmt(n: number): string {
  return "Rs. " + n.toLocaleString("en-US");
}

export interface SavePdfResult {
  mode: string;
  path: string | null;
  message: string;
}

async function savePdf(payload: string, name: string): Promise<SavePdfResult> {
  return invokeCommand<SavePdfResult>("save_pdf_bytes", {
    payload,
    suggestedName: name,
  });
}

// ─────────────────────────── RECEIPT ───────────────────────────
export async function renderReceiptPdf(
  r: ReceiptResponse,
): Promise<SavePdfResult> {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const m = 20;
  let y = 25;

  // Gym header
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(...INDIGO);
  pdf.text(r.gym_name, pageW / 2, y, { align: "center" });
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...SLATE);
  if (r.gym_address) {
    pdf.text(r.gym_address, pageW / 2, y, { align: "center" });
    y += 5;
  }
  if (r.gym_phone) {
    pdf.text(r.gym_phone, pageW / 2, y, { align: "center" });
    y += 5;
  }
  y += 4;
  // header rule
  pdf.setDrawColor(...INDIGO);
  pdf.setLineWidth(0.8);
  pdf.line(m, y, pageW - m, y);
  y += 6;

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...SLATE);
  pdf.text("PAYMENT RECEIPT", pageW / 2, y, { align: "center" });
  y += 8;

  pdf.setFontSize(10);
  y = row(pdf, m, y, "Receipt #", r.receipt_number);
  y = row(pdf, m, y, "Date", r.payment_date);
  y += 3;
  y = row(pdf, m, y, "Member", r.member_name);
  y = row(pdf, m, y, "Member #", r.member_number);
  y = row(pdf, m, y, "Plan", r.plan_name);
  y = row(pdf, m, y, "Period", `${r.membership_start_date} → ${r.membership_expiry_date}`);
  y += 3;
  y = row(pdf, m, y, "Payment Method", r.payment_method);
  y = rowAmount(pdf, m, y, "Amount Paid", fmt(r.amount), GREEN);
  if (r.remaining_balance > 0) {
    y = rowAmount(pdf, m, y, "Remaining Balance", fmt(r.remaining_balance), RED);
  }
  y += 3;
  if (r.notes) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...SLATE);
    pdf.text(`Notes: ${r.notes}`, m, y);
    y += 10;
  }

  // Footer
  y = Math.max(y + 2, 260);
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(m, y, pageW - m, y);
  pdf.setFontSize(9);
  pdf.setTextColor(150, 150, 150);
  pdf.text("Thank you for your payment!", pageW / 2, y + 6, { align: "center" });

  const bytes = pdf.output("arraybuffer");
  const name = `Receipt-${r.receipt_number.replace(/[^a-zA-Z0-9-_]/g, "_")}`;
  return savePdf(uint8(bytes), name);
}

function row(pdf: jsPDF, m: number, y: number, label: string, value: string): number {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...SLATE);
  pdf.text(label, m, y);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 41, 59);
  const rightX = pdf.internal.pageSize.getWidth() - m;
  pdf.text(value.length > 40 ? value.slice(0, 40) : value, rightX, y, { align: "right" });
  return y + 6;
}

function rowAmount(pdf: jsPDF, m: number, y: number, label: string, value: string, color: [number, number, number]): number {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(...SLATE);
  pdf.text(label, m, y);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...color);
  pdf.text(value, pdf.internal.pageSize.getWidth() - m, y, { align: "right" });
  return y + 7;
}

function uint8(buf: ArrayBuffer): string {
  const chunks: string[] = [];
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    chunks.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000))));
  }
  return btoa(chunks.join(""));
}

// ─────────────────────────── REPORT ───────────────────────────
export interface ReportPdfData {
  financial: FinancialReport;
  payment: PaymentReport;
  expense: ExpenseReport;
  member: MemberReport;
  membership_status: MembershipStatusReport;
  dateFrom?: string;
  dateTo?: string;
}

export async function renderReportPdf(data: ReportPdfData): Promise<SavePdfResult> {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const m = 18;
  let y = 22;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(...INDIGO);
  pdf.text("GYM REPORT", pageW / 2, y, { align: "center" });
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...SLATE);
  const range = data.dateFrom || data.dateTo
    ? `Period: ${data.dateFrom || "start"} → ${data.dateTo || "now"}`
    : "All Time";
  pdf.text(range, pageW / 2, y, { align: "center" });
  y += 15;

  // Summary section
  y = sectionHeader(pdf, m, y, "SUMMARY");
  y = statCards(pdf, m, y, [
    { label: "Total Revenue", value: fmt(data.financial.total_revenue), color: GREEN },
    { label: "Total Expenses", value: fmt(data.financial.total_expenses), color: RED },
    { label: "Net Income", value: fmt(data.financial.net_income), color: data.financial.net_income >= 0 ? GREEN : RED },
    { label: "Members", value: String(data.member.total_members), color: INDIGO },
  ]);
  y += 4;

  // Revenue by method
  if (data.financial.revenue_by_method.length > 0) {
    y = sectionHeader(pdf, m, y, "REVENUE BY PAYMENT METHOD");
    for (const item of data.financial.revenue_by_method) {
      y = row(pdf, m, y, item.category, fmt(item.amount));
    }
    y += 4;
  }

  // Expenses by category
  if (data.financial.expenses_by_category.length > 0) {
    y = sectionHeader(pdf, m, y, "EXPENSES BY CATEGORY");
    for (const item of data.financial.expenses_by_category) {
      y = row(pdf, m, y, item.category, fmt(item.amount));
    }
    y += 4;
  }

  // Payments table
  y = sectionHeader(pdf, m, y, "PAYMENT DETAILS");
  y = tableHeader(pdf, m, y, ["Receipt #", "Member", "Method", "Date", "Amount"]);
  for (const p of data.payment.payments) {
    y = tableRow(pdf, m, y, [
      p.receipt_number,
      truncate(p.member_name, 20),
      p.payment_method,
      p.payment_date,
      fmt(p.amount),
    ]);
  }
  y += 4;

  // Expenses table
  y = sectionHeader(pdf, m, y, "EXPENSE DETAILS");
  y = tableHeader(pdf, m, y, ["Date", "Description", "Category", "Amount"]);
  for (const e of data.expense.expenses) {
    y = tableRow(pdf, m, y, [
      e.date,
      truncate(e.description, 28),
      e.category,
      fmt(e.amount),
    ]);
  }
  y += 4;

  // Membership status
  y = sectionHeader(pdf, m, y, "MEMBERSHIP STATUS");
  y = membershipTable(pdf, m, y, "Active Members", data.membership_status.active);
  y = membershipTable(pdf, m, y, "Expiring Soon", data.membership_status.expiring_soon);
  y = membershipTable(pdf, m, y, "Expired", data.membership_status.expired);

  const bytes = pdf.output("arraybuffer");
  const dateLabel = data.dateFrom || data.dateTo
    ? `${data.dateFrom || "start"}-to-${data.dateTo || "now"}`
    : "all-time";
  return savePdf(uint8(bytes), `GymReport-${dateLabel.replace(/[^a-zA-Z0-9-_]/g, "_")}`);
}

// statCards renders 2x2 grid of stat boxes
function statCards(
  pdf: jsPDF,
  m: number,
  y: number,
  stats: { label: string; value: string; color: [number, number, number] }[],
): number {
  const cardW = (pdf.internal.pageSize.getWidth() - m * 2 - 8) / 2;
  const cardH = 20;
  stats.forEach((s, i) => {
    const col = i % 2;
    const rowIdx = Math.floor(i / 2);
    const x = m + col * (cardW + 8);
    const cy = y + rowIdx * (cardH + 6);
    pdf.setFillColor(...LIGHT);
    pdf.roundedRect(x, cy, cardW, cardH, 3, 3, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...SLATE);
    pdf.text(s.label, x + 6, cy + 8);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...s.color);
    pdf.text(truncate(s.value, 14), x + 6, cy + 16);
  });
  return y + 2 * (cardH + 6) + 4;
}

function sectionHeader(pdf: jsPDF, m: number, y: number, title: string): number {
  if (y > 250) {
    pdf.addPage();
    y = 22;
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...INDIGO);
  pdf.text(title, m, y);
  pdf.setDrawColor(...INDIGO);
  pdf.setLineWidth(0.5);
  pdf.line(m, y + 1.5, pdf.internal.pageSize.getWidth() - m, y + 1.5);
  return y + 8;
}

function tableHeader(pdf: jsPDF, m: number, y: number, cols: string[]): number {
  pdf.setFillColor(...INDIGO);
  pdf.roundedRect(m, y - 5, pdf.internal.pageSize.getWidth() - m * 2, 7, 1.5, 1.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(255, 255, 255);
  const widths = colWidths(cols.length);
  let x = m + 2;
  cols.forEach((c, i) => {
    pdf.text(c, x, y, { align: "left" });
    x += widths[i];
  });
  return y + 6;
}

function tableRow(pdf: jsPDF, m: number, y: number, cells: string[]): number {
  if (y > 270) {
    pdf.addPage();
    return tableHeader(pdf, m, 22, cellLabels(cells.length)) + 1;
  }
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(30, 41, 59);
  const widths = colWidths(cells.length);
  let x = m + 2;
  cells.forEach((c, i) => {
    pdf.text(c, x, y);
    x += widths[i];
  });
  // subtle zebra line
  pdf.setDrawColor(230, 230, 230);
  pdf.setLineWidth(0.2);
  pdf.line(m, y + 1.5, pdf.internal.pageSize.getWidth() - m, y + 1.5);
  return y + 6;
}

function colWidths(count: number): number[] {
  if (count === 5) return [30, 40, 34, 34, 36];
  return [32, 60, 42, 40];
}

function cellLabels(count: number): string[] {
  if (count === 5) return ["Receipt #", "Member", "Method", "Date", "Amount"];
  return ["Date", "Description", "Category", "Amount"];
}

function membershipTable(
  pdf: jsPDF,
  m: number,
  y: number,
  title: string,
  rows: { member_number: string; full_name: string; phone: string | null; plan_name: string | null; expiry_date: string | null }[],
): number {
  y += 2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(...SLATE);
  pdf.text(`${title} (${rows.length})`, m, y);
  y += 5;
  if (rows.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(150, 150, 150);
    pdf.text("  None.", m, y);
    return y + 5;
  }
  y = tableHeader(pdf, m, y, ["Member #", "Name", "Phone", "Plan", "Expiry"]);
  for (const r of rows) {
    y = tableRow(pdf, m, y, [
      r.member_number,
      truncate(r.full_name, 18),
      r.phone || "-",
      truncate(r.plan_name || "-", 18),
      r.expiry_date || "-",
    ]);
  }
  return y;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
}
