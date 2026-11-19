"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Briefcase, CalendarCheck, ClipboardList, Clock, Inbox, KanbanSquare, Minus, type IconComponent } from "@/components/icons";
import { Card, CardHeader, EmptyState, Select, Skeleton } from "@/components/ui";
import { STAGE_META } from "@/components/domain/status-badge";
import type { DashboardPeriod, FunnelStep, Kpi, VacancySummary } from "@/types";
import { cn } from "@/lib/utils";
import { PREVIOUS_LABEL } from "@/mocks/dashboard";

const nf = new Intl.NumberFormat("en-GB");

/* ---------- Key statistics ---------- */

function Delta({ kpi, period }: { kpi: Kpi; period: DashboardPeriod }) {
  const { delta, better, deltaUnit = "" } = kpi;
  const flat = delta === 0;
  const good = better === "none" || flat ? null : (delta > 0) === (better === "up");
  const Icon = flat ? Minus : delta > 0 ? ArrowUp : ArrowDown;
  const text = flat ? "No change" : `${delta > 0 ? "+" : "−"}${nf.format(Math.abs(delta))}${deltaUnit}`;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-fg-subtle">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-semibold",
          good === true && "text-success-700",
          good === false && "text-danger-700",
          good === null && "text-fg-muted",
        )}
      >
        <Icon className="size-3" weight="bold" aria-hidden />
        {text}
        {good !== null && <span className="sr-only">{good ? "(improvement)" : "(worse)"}</span>}
      </span>
      <span>vs {PREVIOUS_LABEL[period]}</span>
    </p>
  );
}

/** Each statistic has a category colour and icon, like a Health summary tile. */
const KPI_STYLE: Record<string, { Icon: IconComponent; label: string; tile: string; bar: string; barMuted: string }> = {
  open: { Icon: Briefcase, label: "text-ink-700", tile: "bg-ink-200/70 text-ink-700", bar: "bg-ink-600", barMuted: "bg-ink-200" },
  applications: { Icon: Inbox, label: "text-secondary-700", tile: "bg-secondary-100 text-secondary-700", bar: "bg-secondary-500", barMuted: "bg-secondary-100" },
  shortlisted: { Icon: KanbanSquare, label: "text-primary-700", tile: "bg-primary-100 text-primary-700", bar: "bg-primary-500", barMuted: "bg-primary-100" },
  tests: { Icon: ClipboardList, label: "text-warning-700", tile: "bg-warning-100 text-warning-700", bar: "bg-warning-500", barMuted: "bg-warning-100" },
  interviews: { Icon: CalendarCheck, label: "text-success-700", tile: "bg-success-100 text-success-700", bar: "bg-success-500", barMuted: "bg-success-100" },
  tth: { Icon: Clock, label: "text-ink-700", tile: "bg-ink-200/70 text-ink-700", bar: "bg-ink-600", barMuted: "bg-ink-200" },
};
const FALLBACK = KPI_STYLE.open!;

/** Eight thin bars of recent history in the tile's colour. The current bucket is solid; hover shows each value. */
function History({ kpi }: { kpi: Kpi }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const st = KPI_STYLE[kpi.id] ?? FALLBACK;
  const max = Math.max(1, ...kpi.history);
  const last = kpi.history.length - 1;
  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <div className="flex h-9 items-end gap-[3px]" role="img" aria-label={`${kpi.label}, ${kpi.historyLabel}: ${kpi.history.join(", ")}`}>
        {kpi.history.map((v, i) => (
          <span key={i} onMouseEnter={() => setHover(i)} className="flex h-full flex-1 items-end">
            <span
              className={cn("w-full rounded-t-[3px] transition-colors", i === last || hover === i ? st.bar : st.barMuted)}
              style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
            />
          </span>
        ))}
      </div>
      {hover !== null && (
        <span
          className="pointer-events-none absolute -top-7 z-10 -translate-x-1/2 rounded-sm bg-ink-900 px-1.5 py-0.5 text-2xs font-semibold whitespace-nowrap text-white tabular"
          style={{ left: `${((hover + 0.5) / kpi.history.length) * 100}%` }}
        >
          {hover === last ? "Now" : `${last - hover} back`}: {nf.format(kpi.history[hover]!)}
          {kpi.unit ? ` ${kpi.unit}` : ""}
        </span>
      )}
    </div>
  );
}

export function KpiStrip({ kpis, period, loading }: { kpis?: Kpi[]; period: DashboardPeriod; loading: boolean }) {
  return (
    <section aria-label="Key statistics" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {loading || !kpis
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-platter">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))
        : kpis.map((k) => {
            const st = KPI_STYLE[k.id] ?? FALLBACK;
            return (
              <Link
                key={k.id}
                href={k.href}
                className="pressable group flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-platter transition-shadow hover:shadow-md"
              >
                <span className="flex items-center gap-2">
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-md", st.tile)}>
                    <st.Icon className="size-3.5" weight="fill" aria-hidden />
                  </span>
                  <span className={cn("min-w-0 text-[0.8125rem] leading-tight font-semibold", st.label)}>{k.label}</span>
                </span>
                <span>
                  <span className="block text-[1.75rem] leading-none font-bold tracking-[-0.02em] text-fg tabular">
                    {nf.format(k.value)}
                    {k.unit && <span className="ml-1 text-sm font-semibold tracking-normal text-fg-subtle">{k.unit}</span>}
                  </span>
                  <Delta kpi={k} period={period} />
                </span>
                <History kpi={k} />
              </Link>
            );
          })}
    </section>
  );
}

/* ---------- Funnel ---------- */

export function Funnel({
  steps,
  loading,
  error,
  onRetry,
  vacancyId,
  onVacancyChange,
  vacancies,
}: {
  steps?: FunnelStep[];
  loading: boolean;
  error?: string;
  onRetry: () => void;
  vacancyId: string;
  onVacancyChange: (id: string) => void;
  vacancies: VacancySummary[];
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const top = Math.max(1, steps?.[0]?.count ?? 1, ...(steps?.map((s) => s.count) ?? [1]));
  const total = steps?.reduce((s, x) => s + x.count, 0) ?? 0;

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Recruitment funnel"
        description="Applications reaching each stage in the period. Conversion is from the stage before."
        actions={
          <Select
            size="sm"
            aria-label="Filter funnel by vacancy"
            value={vacancyId}
            onValueChange={onVacancyChange}
            className="w-48"
            options={[{ value: "all", label: "All vacancies" }, ...vacancies.map((v) => ({ value: v.id, label: v.title }))]}
          />
        }
      />
      <div className="flex-1 px-5 pb-5">
        {error ? (
          <div className="flex flex-col items-start gap-3 rounded-md border border-danger-100 bg-danger-50 p-4 text-sm text-danger-700">
            <p className="font-semibold">The funnel could not be loaded.</p>
            <p>{error} Your other figures are unaffected.</p>
            <button type="button" onClick={onRetry} className="font-semibold underline">
              Try again
            </button>
          </div>
        ) : loading || !steps ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[6.5rem_minmax(0,1fr)_4rem] items-center gap-3">
                <Skeleton className="h-3 w-20" />
                <span style={{ width: `${100 - i * 12}%` }}>
                  <Skeleton className="h-5 w-full" />
                </span>
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        ) : total === 0 ? (
          <EmptyState
            icon={<KanbanSquare />}
            title="No applications in this period"
            description="When candidates apply or you upload CVs, their progress through each stage appears here."
            className="py-8"
          />
        ) : (
          <>
            <ol className="flex flex-col gap-2" onMouseLeave={() => setHover(null)}>
              {steps.map((s, i) => {
                const prev = i > 0 ? steps[i - 1]!.count : null;
                const conv = prev ? Math.round((s.count / prev) * 100) : null;
                const width = (s.count / top) * 100;
                return (
                  <li
                    key={s.stage}
                    onMouseEnter={() => setHover(i)}
                    className={cn(
                      "relative grid grid-cols-[6.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 rounded-sm py-1",
                      hover === i && "bg-surface-muted",
                    )}
                  >
                    <span className="text-sm text-fg-muted">{STAGE_META[s.stage].label}</span>
                    <span className="relative h-5">
                      <span
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-r-[4px] transition-[width,background-color] duration-500 ease-(--ease-out-expo)",
                          hover === i ? "bg-primary-600" : "bg-primary-500",
                        )}
                        style={{ width: `${Math.max(width, s.count ? 1.5 : 0)}%` }}
                      />
                    </span>
                    <span className="text-right text-sm tabular">
                      <span className="font-semibold text-fg">{nf.format(s.count)}</span>
                      {conv !== null && <span className="ml-1.5 text-xs text-fg-subtle">{conv}%</span>}
                    </span>
                    {hover === i && (
                      <span className="pointer-events-none absolute -top-8 left-28 z-10 rounded-sm bg-ink-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-md">
                        {nf.format(s.count)} reached {STAGE_META[s.stage].label}
                        {conv !== null && ` · ${conv}% of ${STAGE_META[steps[i - 1]!.stage].label.toLowerCase()}`}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 text-xs text-fg-subtle">
              Psychometric tests are sent at the Assessment stage. Hover a stage for its conversion.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
