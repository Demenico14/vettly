import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function TableContainer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-x-auto rounded-lg border border-line bg-surface", className)} {...props} />;
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full border-collapse text-sm tabular", className)} {...props} />;
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-surface-muted", className)} {...props} />;
}

export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TR({ className, selected, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return (
    <tr
      data-selected={selected || undefined}
      className={cn(
        "border-b border-line last:border-b-0 transition-colors [tbody_&]:hover:bg-ink-50 data-selected:bg-primary-50/70 data-selected:hover:bg-primary-50",
        className,
      )}
      {...props}
    />
  );
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "h-10 border-b border-line px-4 text-left align-middle text-xs font-semibold whitespace-nowrap text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle text-fg", className)} {...props} />;
}

export type SortDirection = "asc" | "desc";

/** A header cell whose label is a sort button. Announces sort state via aria-sort. */
export function SortableTH({
  label,
  active,
  direction,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onSort: () => void;
  className?: string;
  align?: "left" | "right";
}) {
  const Icon = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <TH
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={cn(align === "right" && "text-right", className)}
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "-mx-1.5 inline-flex items-center gap-1 rounded-sm px-1.5 py-1 hover:bg-ink-100 hover:text-fg",
          active && "text-fg",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        <Icon className={cn("size-3.5", !active && "text-ink-400")} aria-hidden />
      </button>
    </TH>
  );
}
