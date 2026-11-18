import * as React from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-sm bg-[linear-gradient(90deg,var(--color-ink-100)_25%,var(--color-ink-200)_50%,var(--color-ink-100)_75%)] bg-size-[200%_100%] animate-shimmer",
        className,
      )}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <div className="mb-4 grid size-11 place-items-center rounded-lg border border-line bg-surface-muted text-ink-500 [&_svg]:size-5">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-fg">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-5 flex gap-2">{action}</div>}
    </div>
  );
}

const ALERT = {
  info: { icon: Info, cls: "border-primary-200 bg-primary-50 text-primary-900", ic: "text-primary-600" },
  success: { icon: CircleCheck, cls: "border-success-100 bg-success-50 text-success-700", ic: "text-success-600" },
  warning: { icon: TriangleAlert, cls: "border-warning-100 bg-warning-50 text-warning-700", ic: "text-warning-600" },
  danger: { icon: CircleAlert, cls: "border-danger-100 bg-danger-50 text-danger-700", ic: "text-danger-600" },
} as const;

/** Inline message attached to a region of the page. */
export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof ALERT;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, cls, ic } = ALERT[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm", cls, className)}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", ic)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 opacity-90">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

export function Progress({
  value,
  label,
  tone = "primary",
  className,
}: {
  value: number;
  label: string;
  tone?: "primary" | "success" | "warning" | "danger";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ink-100", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-(--ease-out-expo)",
          tone === "primary" && "bg-primary-500",
          tone === "success" && "bg-success-500",
          tone === "warning" && "bg-warning-500",
          tone === "danger" && "bg-danger-500",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-line-strong bg-surface px-1 font-sans text-2xs font-semibold text-fg-subtle",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
