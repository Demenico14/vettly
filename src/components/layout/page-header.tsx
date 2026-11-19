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
      {header && <div className={cn(INNER, "pt-6 pb-1 lg:pt-10")}>{header}</div>}
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
        <h1 className="text-[1.75rem] leading-[1.1] font-bold tracking-[-0.02em] text-fg sm:text-[2.125rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[0.9375rem] text-fg-muted">{description}</p>}
        {meta && <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
