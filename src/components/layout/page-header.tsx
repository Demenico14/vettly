import * as React from "react";
import { cn } from "@/lib/utils";

const INNER = "mx-auto w-full max-w-[84rem] px-4 sm:px-8 lg:px-12";

/**
 * Page frame, Notion style: the title sits directly on the white page with generous space above,
 * then the content. Pass the PageHeader as `header`.
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
      {header && <div className={cn(INNER, "pt-8 pb-2 lg:pt-14")}>{header}</div>}
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
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-base text-fg-muted">{description}</p>}
        {meta && <div className="mt-5 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
