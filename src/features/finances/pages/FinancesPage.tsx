import { PageHeader } from "../../../components/ui/PageHeader";

export function FinancesPage() {
  return (
    <div>
      <PageHeader
        title="Finances"
        description="Track payments and expenses."
        action={{ label: "Record Payment", onClick: () => {} }}
      />
    </div>
  );
}
