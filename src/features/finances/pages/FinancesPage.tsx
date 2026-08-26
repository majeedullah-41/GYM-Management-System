import { useState } from "react";
import { PaymentsPage } from "./PaymentsPage";
import { ExpensesPage } from "./ExpensesPage";

type FinancesTab = "payments" | "expenses";

export function FinancesPage() {
  const [tab, setTab] = useState<FinancesTab>("payments");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-border bg-secondary-bg p-1">
        <button
          onClick={() => setTab("payments")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "payments"
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Payments
        </button>
        <button
          onClick={() => setTab("expenses")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "expenses"
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Expenses
        </button>
      </div>
      {tab === "payments" ? <PaymentsPage /> : <ExpensesPage />}
    </div>
  );
}
