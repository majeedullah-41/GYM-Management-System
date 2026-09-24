import { Select } from "../../../components/ui/Select";
import { PAYMENT_METHODS } from "../../../lib/api/payments";
import type { PaymentFieldKey } from "../paymentFields";

const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

interface PaymentFormFieldsProps {
  visibleFields: Set<PaymentFieldKey>;
  amount: string;
  onAmountChange: (value: string) => void;
  amountMax?: number;
  method: string;
  onMethodChange: (value: string) => void;
  paymentDate: string;
  onPaymentDateChange: (value: string) => void;
  paymentMonth?: string;
  onPaymentMonthChange?: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  disabled?: boolean;
}

export function PaymentFormFields({
  visibleFields,
  amount,
  onAmountChange,
  amountMax,
  method,
  onMethodChange,
  paymentDate,
  onPaymentDateChange,
  paymentMonth,
  onPaymentMonthChange,
  notes,
  onNotesChange,
  disabled = false,
}: PaymentFormFieldsProps) {
  const showAmount = visibleFields.has("amount");
  const showMethod = visibleFields.has("payment_method");
  const showDate = visibleFields.has("payment_date");
  const showMonth = visibleFields.has("payment_month") && onPaymentMonthChange !== undefined;
  const showNotes = visibleFields.has("notes");

  return (
    <div className="space-y-3">
      {!showMonth && (showAmount || showMethod || showDate) && (
        <div
          className={`grid gap-3 ${
            [showAmount, showMethod, showDate].filter(Boolean).length === 3
              ? "grid-cols-3"
              : [showAmount, showMethod, showDate].filter(Boolean).length === 2
              ? "grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {showAmount && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Amount (PKR) *</label>
              <input
                type="number"
                name="payment_amount"
                min={1}
                max={amountMax}
                placeholder="e.g. 2000"
                value={amount}
                disabled={disabled}
                onChange={(e) => onAmountChange(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
          {showMethod && (
            <Select
              label="Payment Method *"
              options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
              value={method}
              disabled={disabled}
              onChange={(e) => onMethodChange(e.target.value)}
            />
          )}
          {showDate && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Payment Date *</label>
              <input
                type="date"
                name="payment_date"
                value={paymentDate}
                disabled={disabled}
                onChange={(e) => onPaymentDateChange(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </div>
      )}

      {showMonth && (
        <>
          {(showAmount || showMethod) && (
            <div className={showAmount && showMethod ? "grid grid-cols-2 gap-3" : undefined}>
              {showAmount && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-primary">Amount (PKR) *</label>
                  <input
                    type="number"
                    name="payment_amount"
                    min={1}
                    max={amountMax}
                    placeholder="e.g. 2000"
                    value={amount}
                    disabled={disabled}
                    onChange={(e) => onAmountChange(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
              {showMethod && (
                <Select
                  label="Payment Method *"
                  options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                  value={method}
                  disabled={disabled}
                  onChange={(e) => onMethodChange(e.target.value)}
                />
              )}
            </div>
          )}

          <div className={showDate ? "grid grid-cols-2 gap-3" : undefined}>
            {showDate && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary">Payment Date *</label>
                <input
                  type="date"
                  name="payment_date"
                  value={paymentDate}
                  disabled={disabled}
                  onChange={(e) => onPaymentDateChange(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Payment Month</label>
              <input
                type="text"
                name="payment_month"
                value={paymentMonth}
                disabled={disabled}
                placeholder="e.g. January 2026"
                onChange={(e) => onPaymentMonthChange!(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </>
      )}

      {showNotes && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">Note (optional)</label>
          <textarea
            name="payment_notes"
            rows={1}
            value={notes}
            disabled={disabled}
            placeholder="Add a note..."
            onChange={(e) => onNotesChange(e.target.value)}
            className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      )}
    </div>
  );
}