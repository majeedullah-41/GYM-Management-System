import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { ToastProvider } from "../feedback/ToastProvider";
import { DashboardPage } from "../../features/dashboard/pages/DashboardPage";
import { MembersPage } from "../../features/members/pages/MembersPage";
import { PaymentsPage } from "../../features/finances/pages/PaymentsPage";
import { ReportsPage } from "../../features/reports/pages/ReportsPage";
import { SettingsPage } from "../../features/settings/pages/SettingsPage";
import type { Page } from "../../types";

const PAGE_COMPONENTS: Record<Page, React.ComponentType> = {
  dashboard: DashboardPage,
  members: MembersPage,
  finances: PaymentsPage,
  reports: ReportsPage,
  settings: SettingsPage,
};

export function AppShell() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const PageComponent = PAGE_COMPONENTS[currentPage];

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1 overflow-auto p-6">
          <PageComponent />
        </main>
      </div>
    </ToastProvider>
  );
}
