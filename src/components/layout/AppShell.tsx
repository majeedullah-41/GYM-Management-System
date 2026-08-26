import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { NavigationContext } from "./NavigationContext";
import { ToastProvider } from "../feedback/ToastProvider";
import { DashboardPage } from "../../features/dashboard/pages/DashboardPage";
import { MembersPage } from "../../features/members/pages/MembersPage";
import { MemberDetailPage } from "../../features/members/pages/MemberDetailPage";
import { FinancesPage } from "../../features/finances/pages/FinancesPage";
import { ReportsPage } from "../../features/reports/pages/ReportsPage";
import { SettingsPage } from "../../features/settings/pages/SettingsPage";
import type { Page } from "../../types";

const PAGE_COMPONENTS: Record<Page, React.ComponentType> = {
  dashboard: DashboardPage,
  members: MembersPage,
  finances: FinancesPage,
  reports: ReportsPage,
  settings: SettingsPage,
  "member-detail": MembersPage,
};

export function AppShell() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const navigateTo = useCallback((page: Page) => {
    setSelectedMemberId(null);
    setCurrentPage(page);
  }, []);

  const navigateToMember = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
    setCurrentPage("member-detail");
  }, []);

  const openAddMember = useCallback(() => {
    setSelectedMemberId(null);
    setCurrentPage("members");
  }, []);

  const openRecordPayment = useCallback(() => {
    setSelectedMemberId(null);
    setCurrentPage("finances");
  }, []);

  const isDetailPage = currentPage === "member-detail";

  return (
    <NavigationContext.Provider
      value={{ navigateTo, navigateToMember, openAddMember, openRecordPayment }}
    >
      <ToastProvider>
        <div className="flex h-screen overflow-hidden">
          {!isDetailPage && (
            <Sidebar
              currentPage={currentPage}
              onNavigate={(page) => {
                setSelectedMemberId(null);
                setCurrentPage(page);
              }}
            />
          )}
          <main className="flex-1 overflow-auto p-6">
            {isDetailPage && selectedMemberId ? (
              <MemberDetailPage
                memberId={selectedMemberId}
                onBack={() => {
                  setSelectedMemberId(null);
                  setCurrentPage("members");
                }}
              />
            ) : (
              (() => {
                const Component = PAGE_COMPONENTS[currentPage];
                if (currentPage === "members") {
                  return (
                    <MembersPage
                      onMemberClick={navigateToMember}
                    />
                  );
                }
                return <Component />;
              })()
            )}
          </main>
        </div>
      </ToastProvider>
    </NavigationContext.Provider>
  );
}
