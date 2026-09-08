import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { useToast } from "../../../components/feedback/ToastProvider";
import {
  getReceiptByPaymentId,
  printReceipt,
  printThermalReceipt,
  type ReceiptResponse,
} from "../../../lib/api/receipts";
import { getAllSettings, type PrintSettings } from "../../../lib/api/settings";
import { ReceiptPaper } from "./ReceiptPaper";
import {
  DEFAULT_RECEIPT_TITLE,
  formatReceiptDate,
  formatReceiptPeriodDate,
  receiptFooterText,
  RECEIPT_BRANDING,
} from "./receiptFormat";
import { formatCurrency } from "../../../lib/utils/format";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  paymentId: string | null;
}

export function ReceiptPreview({ isOpen, onClose, paymentId }: Props) {
  const { addToast } = useToast();
  const [receipt, setReceipt] = useState<ReceiptResponse | null>(null);
  const [print, setPrint] = useState<PrintSettings | null>(null);
  const [footer, setFooter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getAllSettings()
        .then((s) => {
          setPrint(s.print);
          setFooter(s.receipt.receipt_footer);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && paymentId) {
      setLoading(true);
      setError(null);
      setReceipt(null);
      getReceiptByPaymentId(paymentId)
        .then(setReceipt)
        .catch((err) => setError(err instanceof Error ? err.message : "Failed to load receipt"))
        .finally(() => setLoading(false));
    }
  }, [isOpen, paymentId]);

  // Print Window uses a dedicated receipt-only document. PDF and direct thermal
  // output continue through the backend renderers using the same receipt data.
  const handlePrint = async () => {
    if (!receipt || printing) return;
    if (print?.destination === "print_window") {
      try {
        setPrinting(true);
        await printReceiptDocument(receipt, print, footer);
      } catch (err) {
        addToast({
          variant: "error",
          title: "Print failed",
          message: err instanceof Error ? err.message : "Could not open the print window",
        });
      } finally {
        setPrinting(false);
      }
      return;
    }
    if (print?.destination === "thermal") {
      try {
        setPrinting(true);
        const res = await printThermalReceipt(receipt, print.thermal_printer_name ?? null);
        if (res.mode === "thermal") {
          addToast({
            variant: "success",
            title: "Receipt sent to printer",
            message: res.message,
          });
        } else if (res.mode === "fallback") {
          addToast({
            variant: "warning",
            title: "Thermal printer unavailable",
            message: res.message,
          });
        } else {
          addToast({ variant: "info", title: "Print result", message: res.message });
        }
      } catch (err) {
        addToast({
          variant: "error",
          title: "Print failed",
          message: err instanceof Error ? err.message : "Could not print receipt",
        });
      } finally {
        setPrinting(false);
      }
      return;
    }
    try {
      setPrinting(true);
      const res = await printReceipt(receipt);
      if (res.mode === "pdf") {
        addToast({
          variant: "success",
          title: "Receipt saved as PDF",
          message: res.path || undefined,
        });
      } else if (res.mode === "print") {
        addToast({ variant: "info", title: "Receipt opened for printing", message: res.message });
      } else {
        addToast({ variant: "info", title: "Print cancelled" });
      }
    } catch (err) {
      addToast({
        variant: "error",
        title: "Print failed",
        message: err instanceof Error ? err.message : "Could not print receipt",
      });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Receipt Preview"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handlePrint} loading={printing} disabled={!receipt || printing}>
              <Printer size={14} className="mr-1.5" />
              Print Receipt
            </Button>
          </>
        }
      >
        {loading && <LoadingState message="Loading receipt..." />}
        {error && <ErrorState message={error} />}
        {receipt && print && (
          <div className="flex justify-center">
            <ReceiptPaper
              previewScale={3.6}
              data={{
                receiptNumber: receipt.receipt_number,
                issuedAt: receipt.issued_at,
                gymName: receipt.gym_name,
                gymTagline: receipt.gym_tagline,
                gymLogo: receipt.gym_logo,
                gymAddress: receipt.gym_address,
                gymPhone: receipt.gym_phone,
                memberName: receipt.member_name,
                memberNumber: receipt.member_number,
                planName: receipt.plan_name,
amount: receipt.amount,
              remainingBalance: receipt.remaining_balance,
              paymentMethod: receipt.payment_method,
                membershipStartDate: receipt.membership_start_date,
                membershipExpiryDate: receipt.membership_expiry_date,
              }}
              print={print}
              footer={footer}
            />
          </div>
        )}
      </Modal>

    </>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printReceiptDocument(
  receipt: ReceiptResponse,
  print: PrintSettings,
  footer: string | null,
): Promise<void> {
  const width = print.paper_width === "58" ? 58 : 80;
  const fontSize = width === 58 ? 8.5 : Math.max(9, Math.min(11, print.font_size));
  const labelWidth = width === 58 ? 18 : 21;
  const row = (label: string, value: string) =>
    `<div class="row"><span>${escapeHtml(label)}</span><span>:</span><span>${escapeHtml(value)}</span></div>`;
  const divider = '<div class="divider"></div>';

  const logo =
    print.show_gym_logo && receipt.gym_logo
      ? `<img class="logo" src="${escapeHtml(receipt.gym_logo)}" alt="" />`
      : "";
  const gymDetails = [
    print.show_gym_name
      ? `<div class="gym-name">${escapeHtml(receipt.gym_name.toUpperCase())}</div>`
      : "",
    print.show_gym_tagline && receipt.gym_tagline?.trim()
      ? `<div class="tagline">${escapeHtml(receipt.gym_tagline.trim())}</div>`
      : "",
    (() => {
      const contact = [
        print.show_gym_address ? receipt.gym_address?.trim() : "",
        print.show_gym_phone ? receipt.gym_phone?.trim() : "",
      ].filter(Boolean).join(" | ");
      return contact ? `<div class="contact">${escapeHtml(contact)}</div>` : "";
    })(),
  ].join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title></title><style>
@page { margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; width: ${width}mm; min-height: 0; background: white; color: black; }
body { padding: 5mm; font-family: "Courier New", monospace; font-size: ${fontSize}pt; line-height: 1.28; }
.header { text-align: center; }
.logo { display: block; width: 25mm; height: 17mm; margin: 0 auto 2.5mm; object-fit: contain; filter: grayscale(1); }
.gym-details { min-width: 0; text-align: center; overflow-wrap: anywhere; }
.gym-name { font-weight: 700; font-size: ${fontSize + 4}pt; letter-spacing: .2em; }
.tagline { margin-top: 1mm; font-size: ${fontSize + 1.5}pt; }
.contact { margin-top: 1mm; font-size: ${width === 58 ? 6.5 : 7.5}pt; white-space: ${width === 80 ? "nowrap" : "normal"}; letter-spacing: -.03em; }
.title, .center { text-align: center; }
.title { padding: 1mm 0; font-weight: 700; font-size: ${fontSize + 4}pt; }
.row { display: grid; grid-template-columns: ${labelWidth}mm 2mm minmax(0, 1fr); column-gap: 1mm; align-items: start; margin: .7mm 0; }
.row span:last-child { overflow-wrap: anywhere; }
.divider { margin: 3mm 0; border-top: 0.25mm dashed #000; }
.footer { padding: 1mm 0; font-size: ${fontSize + 1.5}pt; }
.footer div + div { margin-top: 2mm; }
</style></head><body>
<div class="header">${logo}<div class="gym-details">${gymDetails}</div></div>
${divider}
${print.show_receipt_title ? `<div class="title">${DEFAULT_RECEIPT_TITLE}</div>` : ""}
${divider}
${print.show_receipt_number ? row("Receipt #", receipt.receipt_number) : ""}
${print.show_date ? row("Date", formatReceiptDate(receipt.issued_at)) : ""}
${divider}
${print.show_member_info ? row("Member", receipt.member_name) + row("Member ID", receipt.member_number) : ""}
${print.show_plan_info ? row("Plan", receipt.plan_name) : ""}
${print.show_period ? row("Period", `${formatReceiptPeriodDate(receipt.membership_start_date)} - ${formatReceiptPeriodDate(receipt.membership_expiry_date)}`) : ""}
${
  print.show_amount_received ||
  print.show_method ||
  print.show_received_by ||
  print.show_remaining_balance
    ? divider +
      (print.show_received_by ? row("Received By", "Admin") : "") +
      (print.show_amount_received ? row("Amount Received", formatCurrency(receipt.amount)) : "") +
      (print.show_method ? row("Method", receipt.payment_method) : "") +
      (print.show_remaining_balance
        ? row("Remaining Amount", formatCurrency(receipt.remaining_balance))
        : "")
    : ""
}
${print.show_footer ? `${divider}<div class="center footer"><div>Thank you!</div><div>${escapeHtml(receiptFooterText(footer))}</div></div>` : ""}
${divider}<div class="center footer" style="font-size: ${Math.max(6.5, fontSize - 1)}pt;">${escapeHtml(RECEIPT_BRANDING)}</div>
</body></html>`;

  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.left = "-10000px";
    frame.style.top = "0";
    frame.style.width = `${width}mm`;
    frame.style.height = "1px";
    frame.style.border = "0";
    frame.style.background = "white";
    document.body.appendChild(frame);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      frame.remove();
    };
    try {
      const target = frame.contentWindow;
      const documentToPrint = frame.contentDocument;
      if (!target || !documentToPrint) throw new Error("Print document could not be created");
      documentToPrint.open();
      documentToPrint.write(html);
      documentToPrint.close();

      const printWhenReady = async () => {
        const images = Array.from(documentToPrint.images);
        await Promise.all(
          images.map((image) =>
            image.complete
              ? Promise.resolve()
              : new Promise<void>((done) => {
                  image.addEventListener("load", () => done(), { once: true });
                  image.addEventListener("error", () => done(), { once: true });
                }),
          ),
        );
        await documentToPrint.fonts?.ready;
        await new Promise<void>((done) => target.requestAnimationFrame(() => target.requestAnimationFrame(() => done())));

        const heightPx = Math.max(
          documentToPrint.body.scrollHeight,
          documentToPrint.documentElement.scrollHeight,
        );
        if (heightPx <= 0 || !documentToPrint.body.textContent?.trim()) {
          throw new Error("Receipt content was not ready for printing");
        }
        frame.style.height = `${heightPx}px`;

        target.addEventListener("afterprint", cleanup, { once: true });
        window.setTimeout(cleanup, 60_000);
        target.focus();
        target.print();
        resolve();
      };

      window.setTimeout(() => {
        printWhenReady().catch((error) => {
          cleanup();
          reject(error);
        });
      }, 50);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
