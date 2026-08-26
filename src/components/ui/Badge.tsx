interface BadgeProps {
  variant:
    | "active"
    | "expiring"
    | "expired"
    | "info"
    | "success"
    | "warning"
    | "danger";
  children: React.ReactNode;
}

const BG_CLASSES: Record<string, string> = {
  active: "bg-green-50 text-success",
  expiring: "bg-amber-50 text-warning",
  expired: "bg-red-50 text-danger",
  info: "bg-blue-50 text-info",
  success: "bg-green-50 text-success",
  warning: "bg-amber-50 text-warning",
  danger: "bg-red-50 text-danger",
};

const DOT_CLASSES: Record<string, string> = {
  active: "bg-success",
  expiring: "bg-warning",
  expired: "bg-danger",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${BG_CLASSES[variant]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[variant]}`}
      />
      {children}
    </span>
  );
}
