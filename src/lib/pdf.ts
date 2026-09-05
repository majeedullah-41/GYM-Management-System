import { jsPDF } from "jspdf";
import { invokeCommand } from "./tauri";
import type {
  ExpenseReport,
  FinancialReport,
  MembershipStatusReport,
  PaymentReport,
} from "./api/reports";

const INDIGO: [number, number, number] = [79, 70, 229];
const INDIGO_DARK: [number, number, number] = [55, 48, 163];
const TEXT: [number, number, number] = [30, 41, 59];
const SLATE: [number, number, number] = [100, 116, 139];
const GREEN: [number, number, number] = [22, 163, 74];
const RED: [number, number, number] = [220, 38, 38];
const LIGHT: [number, number, number] = [248, 250, 252];
const BORDER: [number, number, number] = [226, 232, 240];

const MARGIN = 18;
const BOTTOM_MARGIN = 20;
const ROW_HEIGHT = 6.5;

interface PdfColumn {
  header: string;
  width: number;
  align?: "left" | "right";
}

function fmt(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-US")}`;
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

function uint8(buffer: ArrayBuffer): string {
  const chunks: string[] = [];
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    chunks.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000))));
  }
  return btoa(chunks.join(""));
}

export interface ReportPdfData {
  financial: FinancialReport;
  payment: PaymentReport;
  expense: ExpenseReport;
  membership_status: MembershipStatusReport;
  dateFrom?: string;
  dateTo?: string;
}

export async function renderReportPdf(data: ReportPdfData): Promise<SavePdfResult> {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let y = drawDocumentHeader(pdf, data.dateFrom, data.dateTo);

  y = drawSummary(pdf, y, data.financial);

  y = drawTable(
    pdf,
    y,
    `Payment Details (${data.payment.total_count})`,
    [
      { header: "Receipt #", width: 30 },
      { header: "Member", width: 43 },
      { header: "Method", width: 31 },
      { header: "Date", width: 31 },
      { header: "Amount", width: 39, align: "right" },
    ],
    data.payment.payments.map((payment) => [
      payment.receipt_number,
      payment.member_name,
      payment.payment_method,
      payment.payment_date,
      fmt(payment.amount),
    ]),
    "No payments were recorded for this period.",
  );

  y = drawTable(
    pdf,
    y,
    `Expense Details (${data.expense.total_count})`,
    [
      { header: "Date", width: 43 },
      { header: "Category", width: 82 },
      { header: "Amount", width: 49, align: "right" },
    ],
    data.expense.expenses.map((expense) => [expense.date, expense.category, fmt(expense.amount)]),
    "No expenses were recorded for this period.",
  );

  drawTable(
    pdf,
    y,
    `Active Memberships (${data.membership_status.active.length})`,
    [
      { header: "Member #", width: 40 },
      { header: "Name", width: 55 },
      { header: "Phone", width: 40 },
      { header: "Plan", width: 39 },
    ],
    data.membership_status.active.map((member) => [
      member.member_number,
      member.full_name,
      member.phone || "-",
      member.plan_name || "-",
    ]),
    "No active memberships found.",
  );

  addPageFooters(pdf);

  const bytes = pdf.output("arraybuffer");
  const dateLabel =
    data.dateFrom || data.dateTo
      ? `${data.dateFrom || "start"}-to-${data.dateTo || "now"}`
      : "all-time";
  return savePdf(uint8(bytes), `GymReport-${dateLabel.replace(/[^a-zA-Z0-9-_]/g, "_")}`);
}

function drawDocumentHeader(pdf: jsPDF, dateFrom?: string, dateTo?: string): number {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const range =
    dateFrom || dateTo ? `${dateFrom || "Beginning"} to ${dateTo || "Today"}` : "All time";

  pdf.setFillColor(...INDIGO_DARK);
  pdf.rect(0, 0, pageWidth, 36, "F");
  pdf.setFillColor(...INDIGO);
  pdf.rect(0, 33, pageWidth, 3, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255);
  pdf.text("GYM MANAGEMENT REPORT", MARGIN, 16);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(224, 231, 255);
  pdf.text(`Reporting period: ${range}`, MARGIN, 24);
  pdf.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, pageWidth - MARGIN, 24, {
    align: "right",
  });

  return 47;
}

function drawSummary(pdf: jsPDF, y: number, data: FinancialReport): number {
  y = ensureSpace(pdf, y, 38);
  y = drawSectionTitle(pdf, y, "Financial Summary");

  const gap = 4;
  const contentWidth = pdf.internal.pageSize.getWidth() - MARGIN * 2;
  const cardWidth = (contentWidth - gap * 2) / 3;
  const cards = [
    { label: "Total Revenue", value: fmt(data.total_revenue), color: GREEN },
    { label: "Total Expenses", value: fmt(data.total_expenses), color: RED },
    {
      label: "Net Income",
      value: fmt(data.net_income),
      color: data.net_income >= 0 ? GREEN : RED,
    },
  ];

  cards.forEach((card, index) => {
    const x = MARGIN + index * (cardWidth + gap);
    pdf.setFillColor(...LIGHT);
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(x, y, cardWidth, 22, 2, 2, "FD");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...SLATE);
    pdf.text(card.label, x + 4, y + 7);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...card.color);
    pdf.text(fitText(pdf, card.value, cardWidth - 8), x + 4, y + 16);
  });

  return y + 30;
}

function drawTable(
  pdf: jsPDF,
  startY: number,
  title: string,
  columns: PdfColumn[],
  rows: string[][],
  emptyMessage: string,
): number {
  let y = ensureSpace(pdf, startY, rows.length > 0 ? 28 : 24);
  y = drawSectionTitle(pdf, y, title);

  if (rows.length === 0) {
    pdf.setFillColor(...LIGHT);
    pdf.setDrawColor(...BORDER);
    pdf.roundedRect(MARGIN, y, contentWidth(pdf), 13, 2, 2, "FD");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...SLATE);
    pdf.text(emptyMessage, MARGIN + 4, y + 8);
    return y + 20;
  }

  y = drawTableHeader(pdf, y, columns);
  rows.forEach((cells, rowIndex) => {
    if (y + ROW_HEIGHT > pdf.internal.pageSize.getHeight() - BOTTOM_MARGIN) {
      y = addContinuationPage(pdf);
      y = drawSectionTitle(pdf, y, `${title} - continued`);
      y = drawTableHeader(pdf, y, columns);
    }
    y = drawTableRow(pdf, y, columns, cells, rowIndex % 2 === 1);
  });

  return y + 7;
}

function drawSectionTitle(pdf: jsPDF, y: number, title: string): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11.5);
  pdf.setTextColor(...TEXT);
  pdf.text(title, MARGIN, y);
  pdf.setDrawColor(...INDIGO);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, y + 2, MARGIN + 10, y + 2);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.25);
  pdf.line(MARGIN + 10, y + 2, pdf.internal.pageSize.getWidth() - MARGIN, y + 2);
  return y + 7;
}

function drawTableHeader(pdf: jsPDF, y: number, columns: PdfColumn[]): number {
  pdf.setFillColor(...INDIGO);
  pdf.roundedRect(MARGIN, y, contentWidth(pdf), 8, 1.5, 1.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);

  let x = MARGIN;
  columns.forEach((column) => {
    const textX = column.align === "right" ? x + column.width - 2.5 : x + 2.5;
    pdf.text(column.header, textX, y + 5.2, { align: column.align || "left" });
    x += column.width;
  });
  return y + 8.5;
}

function drawTableRow(
  pdf: jsPDF,
  y: number,
  columns: PdfColumn[],
  cells: string[],
  shaded: boolean,
): number {
  if (shaded) {
    pdf.setFillColor(...LIGHT);
    pdf.rect(MARGIN, y, contentWidth(pdf), ROW_HEIGHT, "F");
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.2);
  pdf.setTextColor(...TEXT);
  let x = MARGIN;
  columns.forEach((column, index) => {
    const value = fitText(pdf, String(cells[index] ?? "-"), column.width - 5);
    const textX = column.align === "right" ? x + column.width - 2.5 : x + 2.5;
    pdf.text(value, textX, y + 4.4, { align: column.align || "left" });
    x += column.width;
  });

  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.15);
  pdf.line(MARGIN, y + ROW_HEIGHT, pdf.internal.pageSize.getWidth() - MARGIN, y + ROW_HEIGHT);
  return y + ROW_HEIGHT;
}

function ensureSpace(pdf: jsPDF, y: number, neededHeight: number): number {
  return y + neededHeight > pdf.internal.pageSize.getHeight() - BOTTOM_MARGIN
    ? addContinuationPage(pdf)
    : y;
}

function addContinuationPage(pdf: jsPDF): number {
  pdf.addPage();
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...INDIGO_DARK);
  pdf.text("GYM MANAGEMENT REPORT", MARGIN, 13);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, 16, pageWidth - MARGIN, 16);
  return 24;
}

function addPageFooters(pdf: jsPDF): void {
  const pageCount = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, pageHeight - 13, pageWidth - MARGIN, pageHeight - 13);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...SLATE);
    pdf.text("Gym POS", MARGIN, pageHeight - 8);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 8, {
      align: "right",
    });
  }
}

function contentWidth(pdf: jsPDF): number {
  return pdf.internal.pageSize.getWidth() - MARGIN * 2;
}

function fitText(pdf: jsPDF, value: string, maxWidth: number): string {
  if (pdf.getTextWidth(value) <= maxWidth) return value;
  let shortened = value;
  while (shortened.length > 1 && pdf.getTextWidth(`${shortened}...`) > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}...`;
}
