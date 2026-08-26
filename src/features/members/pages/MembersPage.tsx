import { PageHeader } from "../../../components/ui/PageHeader";

export function MembersPage() {
  return (
    <div>
      <PageHeader
        title="Members"
        description="Manage gym members and memberships."
        action={{ label: "+ Add Member", onClick: () => {} }}
      />
    </div>
  );
}
