import * as React from "react";
import { cn } from "@/lib/utils";

export function DSSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-line pt-10 pb-4 first:border-t-0 first:pt-0">
      <h2 id={`${id}-title`} className="text-xl font-extrabold tracking-[-0.015em] text-fg">
        {title}
      </h2>
      {description && <p className="mt-1.5 max-w-[68ch] text-sm text-fg-muted">{description}</p>}
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </section>
  );
}

/** A framed demo area with an optional caption row. */
export function Specimen({
  label,
  note,
  children,
  className,
  bodyClassName,
}: {
  label?: string;
  note?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-surface", className)}>
      {(label || note) && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-surface-muted px-4 py-2.5">
          {label && <h3 className="text-xs font-bold text-fg">{label}</h3>}
          {note && <p className="text-2xs text-fg-subtle">{note}</p>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}
