"use client";

import * as React from "react";
import { Download } from "@/components/icons";
import { Button, Card, Segmented } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Rounds up to a tidy axis maximum: 1, 2, 2.5 or 5 times a power of ten. */
export function niceMax(v: number, ticks = 4) {
  if (v <= 0) return ticks;
  const raw = v / ticks;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw)!;
  return step * ticks;
}

export const fmt = (n: number) => n.toLocaleString("en-GB");

export function toCsv(rows: Record<string, string | number | null>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]!);
  const cell = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c] ?? null)).join(","))].join("\n");
}

export function downloadCsv(name: string, rows: Record<string, string | number | null>[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** A card holding one chart, with a chart/table switch and CSV export. */
export function ChartCard({
  title,
  description,
  table,
  csv,
  children,
  className,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  table?: React.ReactNode;
  csv?: { name: string; rows: Record<string, string | number | null>[] };
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  const [view, setView] = React.useState<"chart" | "table">("chart");
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-fg-subtle">{description}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          {actions}
          {table && <Segmented label={`${title} view`} value={view} onChange={setView} options={[{ value: "chart", label: "Chart" }, { value: "table", label: "Table" }]} />}
          {csv && (
            <Button size="icon-sm" variant="ghost" aria-label={`Download ${title} as CSV`} onClick={() => downloadCsv(csv.name, csv.rows)}>
              <Download />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 px-5 pt-4 pb-5">{view === "table" && table ? <div className="overflow-x-auto">{table}</div> : children}</div>
    </Card>
  );
}

/** Vertical columns over time, with a recessive grid and a tooltip per column. */
export function ColumnChart({ data, label, unit = "", height = 200 }: { data: { label: string; detail: string; value: number }[]; label: string; unit?: string; height?: number }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const every = Math.ceil(data.length / 8);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <figure className="m-0" aria-label={`${label}: ${fmt(total)} in total`}>
      <div className="flex gap-2">
        <div className="relative w-8 shrink-0 text-right text-2xs text-fg-subtle tabular" style={{ height }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0" style={{ bottom: `${(t / max) * 100}%`, transform: "translateY(50%)" }}>
              {fmt(t)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {ticks.map((t) => (
              <div key={t} className={cn("absolute inset-x-0 border-t", t === 0 ? "border-line-strong" : "border-dashed border-line")} style={{ bottom: `${(t / max) * 100}%` }} />
            ))}
          </div>
          <div className="relative flex items-end gap-[2px]" style={{ height }} onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <div key={d.detail} className="group relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
                <div className={cn("w-full rounded-t-[4px] transition-colors", hover === i ? "bg-primary-700" : "bg-primary-500")} style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0 }} />
                {hover === i && (
                  <div className={cn("pointer-events-none absolute bottom-full z-10 mb-2 rounded-md bg-ink-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg", i < data.length / 2 ? "left-0" : "right-0")} style={{ bottom: `${(d.value / max) * 100}%` }}>
                    <span className="block text-ink-300">{d.detail}</span>
                    <span className="font-semibold tabular">
                      {fmt(d.value)} {unit}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-[2px] text-2xs text-fg-subtle" aria-hidden>
            {data.map((d, i) => (
              <span key={d.detail} className="flex-1 overflow-visible text-center whitespace-nowrap">
                {i % every === 0 || i === data.length - 1 ? d.label : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

/** Horizontal bars for ranked or ordered categories. Labels sit above each bar so long names never truncate. */
export function BarList({
  rows,
  max,
  format = fmt,
}: {
  rows: { key: string; label: React.ReactNode; value: number; note?: React.ReactNode; muted?: boolean }[];
  max?: number;
  format?: (n: number) => string;
}) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-fg">{r.label}</span>
            <span className="shrink-0 text-fg-muted tabular">
              <span className="font-semibold text-fg">{format(r.value)}</span>
              {r.note && <span className="ml-2 text-xs">{r.note}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-ink-100">
            <div className={cn("h-full rounded-full", r.muted ? "bg-ink-400" : "bg-primary-500")} style={{ width: `${Math.max((r.value / top) * 100, r.value ? 1 : 0)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const NORM = [2.3, 4.4, 9.2, 15, 19.1, 19.1, 15, 9.2, 4.4, 2.3];

/** Sten distribution against what the norm group would produce. */
export function StenHistogram({ stens, height = 120 }: { stens: number[]; height?: number }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const max = niceMax(Math.max(...stens, ...NORM), 2);
  return (
    <figure className="m-0">
      <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-line-strong" aria-hidden />
        <div className="flex h-full items-end gap-[2px]">
          {stens.map((v, i) => (
            <div key={i} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
              <div className={cn("w-full rounded-t-[4px]", hover === i ? "bg-primary-700" : "bg-primary-500")} style={{ height: `${(v / max) * 100}%`, minHeight: v ? 2 : 0 }} />
              <div className="pointer-events-none absolute inset-x-0.5 h-[2px] rounded-full bg-ink-800" style={{ bottom: `${(NORM[i]! / max) * 100}%` }} aria-hidden />
              {hover === i && (
                <div className={cn("pointer-events-none absolute bottom-full z-10 mb-1 rounded-md bg-ink-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg", i < 5 ? "left-0" : "right-0")}>
                  <span className="block text-ink-300">Sten {i + 1}</span>
                  <span className="font-semibold tabular">{v}%</span> <span className="text-ink-300">· norm {NORM[i]}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex gap-[2px] text-2xs text-fg-subtle tabular" aria-hidden>
        {stens.map((_, i) => (
          <span key={i} className="flex-1 text-center">
            {i + 1}
          </span>
        ))}
      </div>
    </figure>
  );
}

export function HistogramLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-fg-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-xs bg-primary-500" aria-hidden />
        Candidates in this period
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-[2px] w-3 rounded-full bg-ink-800" aria-hidden />
        Expected from the norm group
      </span>
    </div>
  );
}
