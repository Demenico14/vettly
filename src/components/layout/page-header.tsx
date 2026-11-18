import * as React from "react";
import { cn } from "@/lib/utils";

export function PageContainer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8", className)} {...props} />;
}

export function PageHeader({
  title,
  description,
  actions,
  meta,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-fg">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
