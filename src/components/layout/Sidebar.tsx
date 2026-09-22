import {
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  Settings,
  ReceiptText,
  LogOut,
  Dumbbell,
} from "lucide-react";
import { useGym } from "../../context/GymContext";
import type { Page } from "../../types";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  username: string;
  onLogout: () => Promise<void>;
  gymName?: string;
  gymLogo?: string | null;
}

const NAV_ITEMS: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "members", label: "Members", icon: Users },
  { id: "payments", label: "Payments", icon: ReceiptText },
  { id: "finances", label: "Expense", icon: Wallet },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  currentPage,
  onNavigate,
  username,
  onLogout,
  gymName: propGymName,
  gymLogo: propGymLogo,
}: SidebarProps) {
  const gymContext = useGym();
  const gymName = propGymName ?? gymContext.gymName ?? "Gym POS";
  const gymLogo = propGymLogo !== undefined ? propGymLogo : gymContext.gymLogo;
  const gymTagline = gymContext.gymTagline;

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        {gymLogo ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-white shadow-xs">
            <img src={gymLogo} alt={gymName} className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 shadow-xs">
            <Dumbbell size={18} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold text-text-primary leading-tight">
            {gymName}
          </h1>
          {gymTagline && (
            <p className="truncate text-[11px] text-text-muted">{gymTagline}</p>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50/90 font-semibold text-primary"
                  : "text-text-muted hover:bg-secondary-bg hover:text-text-primary"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-primary" />
              )}
              <item.icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-medium text-text-primary">{username}</p>
          <p className="text-xs text-text-muted">Administrator</p>
        </div>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-text-muted hover:bg-secondary-bg hover:text-text-primary"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
