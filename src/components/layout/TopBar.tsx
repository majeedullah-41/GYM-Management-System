import { useMemo } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { useGym } from "../../context/GymContext";
import { LicenseExpiryNotice } from "../../features/licensing/components/LicenseExpiryNotice";
import type { Page } from "../../types";
import type { AuthUser } from "../../lib/api/auth";

interface TopBarProps {
  currentPage: Page;
  user: AuthUser;
}

const PAGE_TITLES: Record<Page, string> = {
  dashboard: "Dashboard",
  members: "Members",
  payments: "Payments",
  finances: "Finances",
  reports: "Reports",
  settings: "Settings",
  "member-detail": "Member Details",
};

export function TopBar({ currentPage, user }: TopBarProps) {
  const { gymName } = useGym();

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-PK", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date());
  }, []);

  return (
    <div className="shrink-0 border-b border-border bg-surface">
      <header className="relative flex h-16 items-center justify-between px-6">
        <div className="z-10 flex items-center gap-2">
          <span className="text-sm font-medium text-text-muted">
            {PAGE_TITLES[currentPage]}
          </span>
        </div>

        <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center px-4">
          <h1 className="pointer-events-auto max-w-[55%] truncate text-center text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl lg:text-4xl">
            {gymName}
          </h1>
        </div>

        <div className="z-10 flex items-center gap-3 text-xs text-text-muted">
          <CalendarDays size={17} className="text-secondary-text" />
          <span>{formattedDate}</span>
          <span className="hidden h-5 w-px bg-border sm:inline-block" />
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#375d4d] text-[11px] font-semibold text-white">
            {user.username.charAt(0).toUpperCase()}
          </span>
          <span className="hidden font-semibold text-text-primary sm:inline-block">{user.username}</span>
          <ChevronDown size={14} className="text-secondary-text" />
        </div>
      </header>

      <LicenseExpiryNotice />
    </div>
  );
}
