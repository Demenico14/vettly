import * as React from "react";
import { cn } from "@/lib/utils";

const INNER = "mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8";

/**
 * Page frame: an optional white title band across the top, then the content on the grey canvas.
 * Pass the PageHeader as `header` so it spans the full width.
 */
export function PageContainer({
  header,
  className,
  children,
}: {
  header?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {header && (
        <div className="border-b border-line bg-surface">
          <div className={cn(INNER, "py-5 lg:py-6")}>{header}</div>
        </div>
      )}
      <div className={cn(INNER, "py-6 lg:py-8", className)}>{children}</div>
    </>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  meta,
  breadcrumb,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {breadcrumb && <div className="mb-1.5 text-xs text-fg-subtle">{breadcrumb}</div>}
        <h1 className="text-2xl font-bold tracking-[-0.015em] text-fg">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
