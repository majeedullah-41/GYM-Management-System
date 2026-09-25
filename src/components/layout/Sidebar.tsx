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
    <aside className="flex h-screen w-[196px] shrink-0 flex-col border-r border-[#315044] bg-[linear-gradient(165deg,#122f27_0%,#0d271f_100%)] text-white shadow-[4px_0_18px_rgba(9,30,23,0.12)]">
      <div className="flex h-16 items-center gap-3 px-4">
        {gymLogo ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-white shadow-xs">
            <img src={gymLogo} alt={gymName} className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center text-white">
            <Dumbbell size={30} strokeWidth={2.4} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold leading-tight text-white">
            {gymName}
          </h1>
          {gymTagline && (
            <p className="truncate text-[10px] text-white/60">{gymTagline}</p>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`relative flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-xs font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                active
                  ? "border-white/10 bg-[#285744] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)]"
                  : "border-transparent text-white/80 hover:translate-x-px hover:border-white/5 hover:bg-white/8 hover:text-white"
              }`}
            >
              {active && (
                <span className="absolute -left-2 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r bg-[#5ad08a]" />
              )}
              <item.icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mx-4 border-t border-white/10 py-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">{username.charAt(0).toUpperCase()}</span>
          <div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{username}</p>
          <p className="text-[10px] text-white/55">Administrator</p></div>
        </div>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-xs text-white/75 hover:text-white"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
