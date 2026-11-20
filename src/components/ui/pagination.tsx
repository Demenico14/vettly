"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Select } from "./select";

export interface PaginationState<T> {
  page: number;
  pages: number;
  pageSize: number;
  total: number;
  /** 1-based index of the first and last item on this page; 0 when empty. */
  from: number;
  to: number;
  items: T[];
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

/**
 * Splits a list into pages. Changing `resetKey` (for example the active filters) returns to page 1,
 * and the page is clamped when the list shrinks, so a filter never strands you on an empty page.
 */
export function usePagination<T>(all: T[], { pageSize: initial = 25, resetKey = "" }: { pageSize?: number; resetKey?: string } = {}): PaginationState<T> {
  const [state, setState] = React.useState({ key: resetKey, page: 1, size: initial });
  const size = state.size;
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = state.key === resetKey ? Math.min(Math.max(1, state.page), pages) : 1;
  const start = (page - 1) * size;
  return {
    page,
    pages,
    pageSize: size,
    total,
    from: total ? start + 1 : 0,
    to: Math.min(total, start + size),
    items: all.slice(start, start + size),
    setPage: (p) => setState({ key: resetKey, page: p, size }),
    setPageSize: (s) => setState({ key: resetKey, page: 1, size: s }),
  };
}

/** Page numbers with gaps: 1 … 4 5 6 … 13. */
function pageList(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  if (page <= 3) [2, 3, 4].forEach((p) => set.add(p));
  if (page >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach((p) => set.add(p));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1]! > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

const btn =
  "pressable inline-grid h-9 min-w-9 place-items-center rounded-md px-2 text-sm font-medium tabular text-fg-muted transition-colors hover:bg-ink-100 hover:text-fg disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-3 focus-visible:ring-primary-500/30 focus-visible:outline-none sm:h-8 sm:min-w-8";

/**
 * Footer for a paginated list: what's showing, rows per page and page controls.
 * Pass `anchor` (the list's container) to bring the top of the list into view when the page changes.
 */
export function Pagination<T>({
  p,
  noun = ["item", "items"],
  sizes = [10, 25, 50, 100],
  anchor,
  className,
}: {
  p: PaginationState<T>;
  noun?: [string, string];
  sizes?: number[];
  anchor?: React.RefObject<HTMLElement | null>;
  className?: string;
}) {
  if (p.total <= Math.min(...sizes)) {
    return p.total ? (
      <p className={cn("px-1 text-xs text-fg-subtle tabular", className)}>
        {p.total} {p.total === 1 ? noun[0] : noun[1]}
      </p>
    ) : null;
  }
  const go = (n: number) => {
    p.setPage(n);
    const el = anchor?.current;
    if (el && el.getBoundingClientRect().top < 64) el.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <p className="text-xs text-fg-muted tabular" aria-live="polite">
        <span className="font-semibold text-fg">
          {p.from.toLocaleString("en-GB")}–{p.to.toLocaleString("en-GB")}
        </span>{" "}
        of {p.total.toLocaleString("en-GB")} {p.total === 1 ? noun[0] : noun[1]}
      </p>
      <label className="hidden items-center gap-2 text-xs text-fg-muted sm:flex">
        Rows per page
        <Select size="sm" value={String(p.pageSize)} onValueChange={(v) => p.setPageSize(Number(v))} options={sizes.map((s) => ({ value: String(s), label: String(s) }))} className="w-20" />
      </label>
      {p.pages > 1 && (
        <nav aria-label={`${noun[1].charAt(0).toUpperCase() + noun[1].slice(1)} pages`} className="ml-auto flex items-center gap-1">
          <button type="button" className={btn} onClick={() => go(p.page - 1)} disabled={p.page === 1} aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-2 text-xs text-fg-muted tabular sm:hidden">
            Page {p.page} of {p.pages}
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            {pageList(p.page, p.pages).map((n, i) =>
              n === "gap" ? (
                <span key={`gap${i}`} className="w-6 text-center text-sm text-fg-subtle" aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  className={cn(btn, n === p.page && "bg-surface text-fg shadow-xs ring-1 ring-line-strong")}
                  aria-current={n === p.page ? "page" : undefined}
                  aria-label={`Page ${n}`}
                  onClick={() => go(n)}
                >
                  {n}
                </button>
              ),
            )}
          </span>
          <button type="button" className={btn} onClick={() => go(p.page + 1)} disabled={p.page === p.pages} aria-label="Next page">
            <ChevronRight className="size-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
