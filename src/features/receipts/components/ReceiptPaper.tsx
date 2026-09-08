import type { PrintSettings } from "../../../lib/api/settings";
import { formatCurrency } from "../../../lib/utils/format";
import {
  DEFAULT_RECEIPT_TITLE,
  formatReceiptDate,
  formatReceiptPeriodDate,
  receiptFooterText,
  RECEIPT_BRANDING,
} from "./receiptFormat";

export interface ReceiptPaperData {
  receiptNumber: string;
  issuedAt: string;
  gymName: string;
  gymTagline?: string | null;
  gymLogo?: string | null;
  gymAddress?: string | null;
  gymPhone?: string | null;
  memberName: string;
  memberNumber: string;
  planName: string;
  amount: number;
  remainingBalance: number;
  paymentMethod: string;
  membershipStartDate: string;
  membershipExpiryDate: string;
}

interface ReceiptPaperProps {
  data: ReceiptPaperData;
  print: PrintSettings;
  title?: string | null;
  footer?: string | null;
  widthMm?: number;
  previewScale?: number;
}

export function ReceiptPaper({
  data,
  print,
  title,
  footer,
  widthMm = print.paper_width === "58" ? 58 : 80,
  previewScale = 4.6,
}: ReceiptPaperProps) {
  const fontPx = Math.max(11, Math.round(print.font_size * 1.05));
  const contact = [
    print.show_gym_address ? data.gymAddress?.trim() : "",
    print.show_gym_phone ? data.gymPhone?.trim() : "",
  ].filter(Boolean).join(" | ");

  return (
    <div
      className="receipt-paper bg-white font-mono text-black"
      style={{
        width: `${widthMm * previewScale}px`,
        padding: widthMm === 58 ? "20px 14px 24px" : "26px 20px 30px",
        fontSize: fontPx,
        lineHeight: 1.32,
      }}
    >
      <header className="text-center">
        {print.show_gym_logo && data.gymLogo && (
          <img
            src={data.gymLogo}
            alt="Gym logo"
            className="mx-auto mb-3 h-20 w-28 object-contain grayscale"
          />
        )}
        {print.show_gym_name && (
          <div
            className="break-words font-bold uppercase"
            style={{ fontSize: fontPx + 5, letterSpacing: "0.2em" }}
          >
            {data.gymName}
          </div>
        )}
        {print.show_gym_tagline && data.gymTagline?.trim() && (
          <div className="mt-1 break-words" style={{ fontSize: fontPx + 2 }}>
            {data.gymTagline.trim()}
          </div>
        )}
        {contact && <div className="mt-1 break-words">{contact}</div>}
      </header>

      <ReceiptDash />
      {print.show_receipt_title && (
        <div className="py-1 text-center font-bold" style={{ fontSize: fontPx + 4 }}>
          {(title?.trim() || DEFAULT_RECEIPT_TITLE).toUpperCase()}
        </div>
      )}
      <ReceiptDash />

      <section className="space-y-0.5">
        {print.show_receipt_number && (
          <ReceiptField label="Receipt #" value={data.receiptNumber} />
        )}
        {print.show_date && <ReceiptField label="Date" value={formatReceiptDate(data.issuedAt)} />}
      </section>

      <ReceiptDash />
      {print.show_member_info && (
        <section className="space-y-0.5">
          <ReceiptField label="Member" value={data.memberName} />
          <ReceiptField label="Member ID" value={data.memberNumber} />
        </section>
      )}

      <section className="mt-1 space-y-0.5">
        {print.show_plan_info && <ReceiptField label="Plan" value={data.planName} />}
        {print.show_period && (
          <ReceiptField
            label="Period"
            value={`${formatReceiptPeriodDate(data.membershipStartDate)} - ${formatReceiptPeriodDate(data.membershipExpiryDate)}`}
          />
        )}
      </section>

      {print.show_amount_received ||
        print.show_method ||
        print.show_received_by ||
        print.show_remaining_balance ? (
        <>
          <ReceiptDash />
          <section className="space-y-0.5">
            {print.show_received_by && <ReceiptField label="Received By" value="Admin" />}
            {print.show_amount_received && (
              <ReceiptField label="Amount Received" value={formatCurrency(data.amount)} />
            )}
            {print.show_method && (
              <ReceiptField label="Method" value={data.paymentMethod} />
            )}
            {print.show_remaining_balance && (
              <ReceiptField label="Remaining Amount" value={formatCurrency(data.remainingBalance)} />
            )}
          </section>
        </>
      ) : null}

      {print.show_footer && (
        <>
          <ReceiptDash />
          <footer className="py-1 text-center">
            <div style={{ fontSize: fontPx + 2 }}>Thank you!</div>
            <div className="mt-2" style={{ fontSize: fontPx + 2 }}>
              {receiptFooterText(footer)}
            </div>
          </footer>
        </>
      )}

      <ReceiptDash />
      <footer className="py-1 text-center" style={{ fontSize: fontPx }}>
        {RECEIPT_BRANDING}
      </footer>
    </div>
  );
}

function ReceiptField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[31%_12px_minmax(0,1fr)] items-start gap-x-1">
      <span>{label}</span>
      <span>:</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}

function ReceiptDash() {
  return <div className="my-3 border-t border-dashed border-black" aria-hidden="true" />;
}
