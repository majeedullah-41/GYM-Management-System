import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { useToast } from "../../../components/feedback/ToastProvider";
import {
  getReceiptByPaymentId,
  type ReceiptResponse,
} from "../../../lib/api/receipts";
import { formatCurrency } from "../../../lib/utils/format";
import { renderReceiptPdf } from "../../../lib/pdf";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  paymentId: string | null;
}

export function ReceiptPreview({ isOpen, onClose, paymentId }: Props) {
  const { addToast } = useToast();
  const [receipt, setReceipt] = useState<ReceiptResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

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

  const handlePrint = async () => {
    if (!receipt || printing) return;
    try {
      setPrinting(true);
      const res = await renderReceiptPdf(receipt);
      if (res.mode === "pdf") {
        addToast({ variant: "success", title: "Receipt saved as PDF", message: res.path || undefined });
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
      {receipt && (
        <div className="receipt-preview rounded-md border border-border bg-white p-6 text-sm text-gray-900">
          <style>{`
            @media print {
              .receipt-preview { border: none !important; padding: 0 !important; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">{receipt.gym_name}</h2>
            {receipt.gym_address && (
              <p className="text-xs text-gray-500">{receipt.gym_address}</p>
            )}
            {receipt.gym_phone && (
              <p className="text-xs text-gray-500">{receipt.gym_phone}</p>
            )}
          </div>

          <div className="border-t border-b border-gray-200 py-2 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-500">Receipt #</span>
              <span className="font-mono font-medium">
                {receipt.receipt_number}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span>{receipt.payment_date}</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Member</span>
              <span className="font-medium">{receipt.member_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Member #</span>
              <span className="font-mono">{receipt.member_number}</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Plan</span>
              <span>{receipt.plan_name}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Period</span>
              <span>
                {receipt.membership_start_date} →{" "}
                {receipt.membership_expiry_date}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-2 mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Payment Method</span>
              <span>{receipt.payment_method}</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="font-medium">Amount Paid</span>
              <span className="font-bold text-primary">
                {formatCurrency(receipt.amount)}
              </span>
            </div>
            {receipt.remaining_balance > 0 && (
              <div className="flex justify-between text-base mt-1">
                <span className="font-medium text-orange-600">Remaining Balance</span>
                <span className="font-bold text-orange-600">
                  {formatCurrency(receipt.remaining_balance)}
                </span>
              </div>
            )}
          </div>

          {receipt.notes && (
            <div className="mb-4 text-xs text-gray-500">
              <span className="font-medium">Notes:</span> {receipt.notes}
            </div>
          )}

          <div className="text-center text-xs text-gray-400 mt-6 pt-2 border-t border-gray-200">
            Thank you for your payment!
          </div>
        </div>
      )}
    </Modal>
  );
}
