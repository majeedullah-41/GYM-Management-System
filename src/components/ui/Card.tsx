import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Card({ title, children, footer, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface shadow-[0_2px_5px_rgba(16,24,20,0.055)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:border-[#c7d0cb] hover:shadow-[0_7px_18px_rgba(16,24,20,0.075)] ${className}`}
    >
      {title && (
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
      {footer && (
        <div className="border-t border-border px-4 py-3">{footer}</div>
      )}
    </div>
  );
}
