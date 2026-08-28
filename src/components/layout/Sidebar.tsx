import {
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  Settings,
  ReceiptText,
} from "lucide-react";
import type { Page } from "../../types";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: typeof LayoutDashboard }[] =
  [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "members", label: "Members", icon: Users },
    { id: "payments", label: "Payments", icon: ReceiptText },
    { id: "finances", label: "Finances", icon: Wallet },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <h1 className="text-lg font-semibold text-text-primary">Gym POS</h1>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-white"
                  : "text-text-muted hover:bg-secondary-bg hover:text-text-primary"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-3">
        <p className="text-xs text-text-muted">Gym POS v0.1.0</p>
      </div>
    </aside>
  );
}
