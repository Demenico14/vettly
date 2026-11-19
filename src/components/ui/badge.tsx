import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "bg-ink-200/70 text-ink-700",
        primary: "bg-primary-50 text-primary-700",
        secondary: "bg-secondary-50 text-secondary-700",
        accent: "bg-accent-50 text-accent-700",
        success: "bg-success-50 text-success-700",
        warning: "bg-warning-50 text-warning-700",
        danger: "bg-danger-50 text-danger-700",
        outline: "border border-line-strong text-fg-muted",
        /** Formal status chip: neutral body, the dot carries the colour. Pass dotClassName. */
        status: "bg-ink-100 text-ink-700",
        solid: "bg-primary-600 text-white",
      },
      size: {
        sm: "h-5 px-2 text-2xs",
        md: "h-6 px-2.5 text-xs",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** Shows a status dot before the label. */
  dot?: boolean;
  /** Colour class for the dot, e.g. "bg-success-500". Defaults to the text colour. */
  dotClassName?: string;
}

export function Badge({ className, tone, size, dot, dotClassName, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot && <span className={cn("size-1.5 shrink-0 rounded-full", dotClassName ?? "bg-current")} aria-hidden />}
      {children}
    </span>
  );
}

/** Tinted chip for skills and keywords; distinct from bordered status chips. */
export function Tag({
  className,
  children,
  onRemove,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { onRemove?: () => void }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-sm bg-ink-100 px-2 text-xs font-medium text-ink-700",
        className,
      )}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="-mr-1 grid size-4 place-items-center rounded-xs text-ink-500 hover:bg-ink-200 hover:text-fg"
          aria-label={`Remove ${typeof children === "string" ? children : "tag"}`}
        >
          <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
}
