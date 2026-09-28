import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { NavigationContext } from "./NavigationContext";
import { GymProvider } from "../../context/GymContext";
import { PrivacyProvider } from "../../context/PrivacyContext";
import { DashboardPage } from "../../features/dashboard/pages/DashboardPage";
import { MembersPage } from "../../features/members/pages/MembersPage";
import { FinancesPage } from "../../features/finances/pages/FinancesPage";
import { PaymentsPage } from "../../features/payments/pages/PaymentsPage";
import { ReportsPage } from "../../features/reports/pages/ReportsPage";
import { SettingsPage } from "../../features/settings/pages/SettingsPage";
import type { Page } from "../../types";
import type { AuthUser } from "../../lib/api/auth";
import { logout } from "../../lib/api/auth";

const PAGE_COMPONENTS: Record<Page, React.ComponentType> = {
  dashboard: DashboardPage,
  members: MembersPage,
  payments: PaymentsPage,
  finances: FinancesPage,
  reports: ReportsPage,
  settings: () => null,
  "member-detail": MembersPage,
};

// Page a cross-page flow started from, so it can be resumed once the flow ends.
interface ReturnTarget {
  page: Page;
  memberId: string | null;
}

export function AppShell({
  user,
  onSignedOut,
  onUserUpdated,
}: {
  user: AuthUser;
  onSignedOut: () => void;
  onUserUpdated: (user: AuthUser) => void;
}) {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [paymentMemberId, setPaymentMemberId] = useState<string | null>(null);
  const [returnTarget, setReturnTarget] = useState<ReturnTarget | null>(null);

  const navigateTo = useCallback((page: Page) => {
    setSelectedMemberId(null);
    setReturnTarget(null);
    setCurrentPage(page);
  }, []);

  const navigateToMember = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
    setReturnTarget(null);
    setCurrentPage("members");
  }, []);

  const navigateBack = useCallback(() => {
    if (!returnTarget) return;
    setSelectedMemberId(returnTarget.memberId);
    setPaymentMemberId(null);
    setReturnTarget(null);
    setCurrentPage(returnTarget.page);
  }, [returnTarget]);

  const openAddMember = useCallback(() => {
    setSelectedMemberId(null);
    setReturnTarget(null);
    setCurrentPage("members");
  }, []);

  const openRecordPayment = useCallback(() => {
    setSelectedMemberId(null);
    setPaymentMemberId(null);
    setReturnTarget({ page: currentPage, memberId: null });
    setCurrentPage("payments");
  }, [currentPage]);

  const openPaymentForMember = useCallback((memberId: string) => {
    setSelectedMemberId(null);
    setPaymentMemberId(memberId);
    setReturnTarget({ page: currentPage, memberId });
    setCurrentPage("payments");
  }, [currentPage]);

  return (
    <GymProvider>
      <NavigationContext.Provider
        value={{
          navigateTo,
          navigateToMember,
          navigateBack,
          openAddMember,
          openRecordPayment,
          openPaymentForMember,
        }}
      >
        <PrivacyProvider>
          <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar
              currentPage={currentPage}
              username={user.username}
              onLogout={async () => {
                await logout();
                onSignedOut();
              }}
              onNavigate={(page) => {
                setSelectedMemberId(null);
                setPaymentMemberId(null);
                setReturnTarget(null);
                setCurrentPage(page);
              }}
            />
            <div className="flex flex-1 flex-col overflow-hidden">
              <TopBar currentPage={currentPage} user={user} />
              <main className="flex-1 overflow-auto p-5 lg:px-6 lg:py-5">
                {(() => {
                  const Component = PAGE_COMPONENTS[currentPage];
                  if (currentPage === "dashboard") {
                    return <DashboardPage user={user} />;
                  }
                  if (currentPage === "members") {
                    return <MembersPage initialExpandedId={selectedMemberId} />;
                  }
                  if (currentPage === "payments") {
                    return <PaymentsPage initialMemberId={paymentMemberId} />;
                  }
                  if (currentPage === "settings") {
                    return (
                      <SettingsPage
                        user={user}
                        onUserUpdated={onUserUpdated}
                        onSignedOut={onSignedOut}
                      />
                    );
                  }
                  return <Component />;
                })()}
              </main>
            </div>
          </div>
        </PrivacyProvider>
      </NavigationContext.Provider>
    </GymProvider>
  );
}
