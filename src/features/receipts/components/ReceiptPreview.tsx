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
import { formatCurrency } from "../../../lib/utils/format";
import { getAllSettings, type PrintSettings } from "../../../lib/api/settings";

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

  // The backend renders the receipt at the configured thermal-paper width.
  // Print mode opens that PDF in the system viewer; PDF mode opens the save dialog.
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
        {receipt && print && <ReceiptContent receipt={receipt} print={print} footer={footer} />}
      </Modal>

    </>
  );
}

function ReceiptContent({
  receipt,
  print,
  footer,
}: {
  receipt: ReceiptResponse;
  print: PrintSettings;
  footer: string | null;
}) {
  const visibleNote =
    print.show_notes && receipt.notes && receipt.notes.toLowerCase() !== "paid in full"
      ? receipt.notes
      : null;
  const hasContentAfterRemaining = print.show_payment_details || Boolean(visibleNote) || print.show_footer;
  const hasBottomSection = print.show_remaining_balance || hasContentAfterRemaining;

  return (
    <div
      className="mx-auto bg-white px-3 py-4 font-mono leading-snug text-gray-900"
      style={{ width: `${(print.paper_width === "58" ? 58 : 80) * 3.6}px` }}
    >
      <div className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center">
        {print.show_gym_name && receipt.gym_logo && (
          <img src={receipt.gym_logo} alt="Gym logo" className="h-10 w-10 object-contain" />
        )}
        <div className="col-start-2 min-w-0 text-center">
          {print.show_gym_name && (
            <div className="font-bold" style={{ fontSize: print.font_size + 2 }}>
              {receipt.gym_name}
            </div>
          )}
          {print.show_gym_phone && receipt.gym_phone && (
            <div style={{ fontSize: print.font_size }}>{receipt.gym_phone}</div>
          )}
          {print.show_gym_address && receipt.gym_address && (
            <div style={{ fontSize: print.font_size }}>{receipt.gym_address}</div>
          )}
        </div>
      </div>
      <PvDivider />
      {print.show_receipt_title && (
        <div className="text-center font-bold" style={{ fontSize: print.font_size }}>
          RECEIPT
        </div>
      )}
      {print.show_receipt_number && receipt.receipt_number && (
        <PvRow label="Receipt #" value={receipt.receipt_number} fontPx={print.font_size} />
      )}
      {print.show_date && receipt.payment_date && (
        <PvRow label="Date" value={receipt.payment_date} fontPx={print.font_size} />
      )}
      <PvDivider />
      {print.show_member_info && (
        <>
          <PvRow label="Member" value={receipt.member_name} fontPx={print.font_size} />
          <PvRow label="Member #" value={receipt.member_number} fontPx={print.font_size} />
        </>
      )}
      <PvDivider />
      {print.show_plan_info && receipt.plan_name && (
        <PvRow label="Plan" value={receipt.plan_name} fontPx={print.font_size} />
      )}
      {print.show_period && (
        <PvRow
          label="Period"
          value={`${receipt.membership_start_date} to ${receipt.membership_expiry_date}`}
          fontPx={Math.max(8, print.font_size - 1)}
        />
      )}
      {hasBottomSection && <PvDivider />}
      {print.show_remaining_balance && (
        <PvRow
          label="Remaining"
          value={
            receipt.remaining_balance > 0 ? formatCurrency(receipt.remaining_balance) : "Rs. 0"
          }
          fontPx={print.font_size}
        />
      )}
      {print.show_remaining_balance && hasContentAfterRemaining && <PvDivider />}
      {print.show_payment_details && (
        <div className="text-center" style={{ fontSize: print.font_size }}>
          {receipt.remaining_balance <= 0
            ? "Paid in full"
            : `Balance due: ${formatCurrency(receipt.remaining_balance)}`}
        </div>
      )}
      {visibleNote && (
        <div className="text-center" style={{ fontSize: print.font_size }}>
          {visibleNote}
        </div>
      )}
      {print.show_footer && (
        <div className="text-center" style={{ fontSize: print.font_size * 0.9 }}>
          {footer?.trim() || "Thank you for being a member"}
        </div>
      )}
    </div>
  );
}

function PvRow({ label, value, fontPx }: { label: string; value: string; fontPx: number }) {
  return (
    <div className="flex justify-between" style={{ fontSize: fontPx }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PvDivider() {
  return <div className="my-1.5 border-t border-gray-400" />;
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
  const fontSize = Math.max(8, Math.min(16, print.font_size));
  const row = (label: string, value: string, size = fontSize) =>
    `<div class="row" style="font-size:${size}pt"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`;
  const divider = '<div class="divider"></div>';
  const visibleNote =
    print.show_notes && receipt.notes && receipt.notes.toLowerCase() !== "paid in full"
      ? receipt.notes
      : null;
  const hasContentAfterRemaining = print.show_payment_details || Boolean(visibleNote) || print.show_footer;
  const hasBottomSection = print.show_remaining_balance || hasContentAfterRemaining;

  const logo =
    print.show_gym_name && receipt.gym_logo
      ? `<img class="logo" src="${escapeHtml(receipt.gym_logo)}" alt="" />`
      : "";
  const gymDetails = [
    print.show_gym_name
      ? `<div class="gym-name">${escapeHtml(receipt.gym_name)}</div>`
      : "",
    print.show_gym_phone && receipt.gym_phone
      ? `<div>${escapeHtml(receipt.gym_phone)}</div>`
      : "",
    print.show_gym_address && receipt.gym_address
      ? `<div>${escapeHtml(receipt.gym_address)}</div>`
      : "",
  ].join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title></title><style>
@page { size: ${width}mm 90mm; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; width: ${width}mm; background: white; color: black; }
body { padding: 4mm; font-family: "Courier New", monospace; font-size: ${fontSize}pt; line-height: 1.2; }
.header { display: grid; grid-template-columns: 12mm minmax(0, 1fr) 12mm; align-items: center; }
.logo { width: 11mm; height: 11mm; object-fit: contain; }
.gym-details { grid-column: 2; min-width: 0; text-align: center; overflow-wrap: anywhere; }
.gym-name { font-weight: 700; font-size: ${fontSize + 2}pt; }
.title, .center { text-align: center; }
.title { font-weight: 700; }
.row { display: flex; justify-content: space-between; gap: 3mm; white-space: nowrap; }
.row span:last-child { text-align: right; }
.divider { margin: 1.5mm 0; border-top: 0.25mm solid #777; }
</style></head><body>
<div class="header">${logo}<div class="gym-details">${gymDetails}</div></div>
${divider}
${print.show_receipt_title ? '<div class="title">RECEIPT</div>' : ""}
${print.show_receipt_number ? row("Receipt #", receipt.receipt_number) : ""}
${print.show_date ? row("Date", receipt.payment_date) : ""}
${divider}
${print.show_member_info ? row("Member", receipt.member_name) + row("Member #", receipt.member_number) : ""}
${divider}
${print.show_plan_info ? row("Plan", receipt.plan_name) : ""}
${print.show_period ? row("Period", `${receipt.membership_start_date} to ${receipt.membership_expiry_date}`, Math.max(8, fontSize - 1)) : ""}
${hasBottomSection ? divider : ""}
${print.show_remaining_balance ? row("Remaining", receipt.remaining_balance > 0 ? formatCurrency(receipt.remaining_balance) : "Rs. 0") : ""}
${print.show_remaining_balance && hasContentAfterRemaining ? divider : ""}
${print.show_payment_details ? `<div class="center">${receipt.remaining_balance <= 0 ? "Paid in full" : `Balance due: ${escapeHtml(formatCurrency(receipt.remaining_balance))}`}</div>` : ""}
${visibleNote ? `<div class="center">${escapeHtml(visibleNote)}</div>` : ""}
${print.show_footer ? `<div class="center" style="font-size:${fontSize * 0.9}pt">${escapeHtml(footer?.trim() || "Thank you for being a member")}</div>` : ""}
</body></html>`;

  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.border = "0";
    frame.style.opacity = "0";
    document.body.appendChild(frame);

    const cleanup = () => window.setTimeout(() => frame.remove(), 1000);
    try {
      const target = frame.contentWindow;
      const documentToPrint = frame.contentDocument;
      if (!target || !documentToPrint) throw new Error("Print document could not be created");
      documentToPrint.open();
      documentToPrint.write(html);
      documentToPrint.close();
      window.setTimeout(() => {
        target.focus();
        target.print();
        cleanup();
        resolve();
      }, 250);
    } catch (error) {
      frame.remove();
      reject(error);
    }
  });
}
