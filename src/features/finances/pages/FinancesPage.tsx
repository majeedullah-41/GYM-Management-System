import { PageHeader } from "../../../components/ui/PageHeader";
import { ExpensesPage } from "./ExpensesPage";

export function FinancesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Finances"
        description="Manage expenses. Payments have their own dedicated section."
      />
      <ExpensesPage />
    </div>
  );
}
