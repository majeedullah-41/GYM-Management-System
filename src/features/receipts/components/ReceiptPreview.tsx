import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { useToast } from "../../../components/feedback/ToastProvider";
import {
  getReceiptByPaymentId,
  printReceipt,
  type ReceiptResponse,
} from "../../../lib/api/receipts";
import { formatCurrency } from "../../../lib/utils/format";
import {
  getAllSettings,
  type PrintSettings,
} from "../../../lib/api/settings";

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
        .catch((err) =>
          setError(err instanceof Error ? err.message : "Failed to load receipt"),
        )
        .finally(() => setLoading(false));
    }
  }, [isOpen, paymentId]);

  // Route according to the configured destination:
  // - "print_window" opens the native WebView print dialog on the settings-shaped receipt.
  // - "pdf" saves the receipt as a PDF via the backend (which honors settings + destination).
  const handlePrint = async () => {
    if (!receipt || printing) return;
    if (print?.destination === "print_window") {
      // Small delay lets the print portal mount before the dialog opens.
      setPrinting(true);
      window.setTimeout(() => window.print(), 150);
      window.setTimeout(() => setPrinting(false), 2000);
      return;
    }
    try {
      setPrinting(true);
      const res = await printReceipt(receipt);
      if (res.mode === "pdf") {
        addToast({ variant: "success", title: "Receipt saved as PDF", message: res.path || undefined });
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
            <Button
              onClick={handlePrint}
              loading={printing}
              disabled={!receipt || printing}
            >
              <Printer size={14} className="mr-1.5" />
              Print Receipt
            </Button>
          </>
        }
      >
        {loading && <LoadingState message="Loading receipt..." />}
        {error && <ErrorState message={error} />}
        {receipt && print && (
          <ReceiptContent receipt={receipt} print={print} footer={footer} />
        )}
      </Modal>

      {receipt && print && (
        <PrintPortal receipt={receipt} print={print} footer={footer} />
      )}
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
  return (
    <div
      className="mx-auto bg-white px-3 py-4 font-mono leading-snug text-gray-900"
      style={{ width: `${(print.paper_width === "58" ? 58 : 80) * 3.6}px` }}
    >
      {print.show_gym_name && (
        <div
          className="text-center font-bold"
          style={{ fontSize: print.font_size + 2 }}
        >
          {receipt.gym_name}
        </div>
      )}
      {print.show_gym_phone && receipt.gym_phone && (
        <div className="text-center" style={{ fontSize: print.font_size }}>
          {receipt.gym_phone}
        </div>
      )}
      {print.show_gym_address && receipt.gym_address && (
        <div className="text-center" style={{ fontSize: print.font_size }}>
          {receipt.gym_address}
        </div>
      )}
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
          value={`${receipt.membership_start_date}  to  ${receipt.membership_expiry_date}`}
          fontPx={print.font_size}
        />
      )}
      <PvDivider />
      {print.show_payment_details && (
        <>
          <PvRow label="Method" value={receipt.payment_method} fontPx={print.font_size} />
          <div
            className="text-center font-bold"
            style={{ fontSize: print.font_size + 1 }}
          >
            AMOUNT PAID&nbsp;&nbsp;{formatCurrency(receipt.amount)}
          </div>
        </>
      )}
      {print.show_remaining_balance && (
        <PvRow
          label="Remaining"
          value={receipt.remaining_balance > 0 ? formatCurrency(receipt.remaining_balance) : "Rs. 0"}
          fontPx={print.font_size}
        />
      )}
      <PvDivider />
      {print.show_notes && receipt.notes && (
        <div className="text-center" style={{ fontSize: print.font_size }}>
          {receipt.notes}
        </div>
      )}
      {print.show_footer && footer && (
        <div className="text-center" style={{ fontSize: print.font_size * 0.9 }}>
          {footer}
        </div>
      )}
    </div>
  );
}

function PrintPortal({
  receipt,
  print,
  footer,
}: {
  receipt: ReceiptResponse;
  print: PrintSettings;
  footer: string | null;
}) {
  return createPortal(
    <>
      <style>{`
        .receipt-print-portal { display: none !important; }
        @media print {
          body * { visibility: hidden !important; }
          .receipt-print-portal, .receipt-print-portal * { visibility: visible !important; }
          .receipt-print-portal {
            display: block !important;
            position: absolute !important;
            left: 0; top: 0;
            width: 100%;
          }
        }
      `}</style>
      <div
        id="receipt-print-portal"
        className="receipt-print-portal"
        aria-hidden="true"
      >
        <ReceiptContent receipt={receipt} print={print} footer={footer} />
      </div>
    </>,
    document.body,
  );
}

function PvRow({
  label,
  value,
  fontPx,
}: {
  label: string;
  value: string;
  fontPx: number;
}) {
  return (
    <div className="flex justify-between" style={{ fontSize: fontPx }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PvDivider() {
  return <div className="my-1.5 border-t border-gray-300" />;
}
