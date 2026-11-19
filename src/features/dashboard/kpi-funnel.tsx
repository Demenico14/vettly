"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, KanbanSquare, Minus } from "@/components/icons";
import { Card, CardHeader, EmptyState, Select, Skeleton } from "@/components/ui";
import { STAGE_META } from "@/components/domain/status-badge";
import type { DashboardPeriod, FunnelStep, Kpi, VacancySummary } from "@/types";
import { cn } from "@/lib/utils";
import { HISTORY_LABEL, PREVIOUS_LABEL } from "@/mocks/dashboard";

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

/** Eight thin bars of recent history. The current bucket is darker; hover shows each value. */
function History({ kpi }: { kpi: Kpi }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const max = Math.max(1, ...kpi.history);
  const last = kpi.history.length - 1;
  return (
    <div className="relative mt-3" onMouseLeave={() => setHover(null)}>
      <div className="flex h-7 max-w-40 items-end gap-[3px]" role="img" aria-label={`${kpi.label}, ${kpi.historyLabel}: ${kpi.history.join(", ")}`}>
        {kpi.history.map((v, i) => (
          <span
            key={i}
            onMouseEnter={() => setHover(i)}
            className="flex h-full flex-1 items-end"
          >
            <span
              className={cn(
                "w-full rounded-t-[2px] transition-colors",
                i === last ? "bg-primary-600" : hover === i ? "bg-primary-400" : "bg-primary-200",
              )}
              style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
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
    <section aria-label="Key statistics" className="overflow-hidden rounded-lg border border-line bg-line">
      <div className="grid grid-cols-2 gap-px md:grid-cols-3 xl:grid-cols-6">
        {loading || !kpis
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 bg-surface p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="mt-2 h-8 w-full" />
              </div>
            ))
          : kpis.map((k) => (
              <Link
                key={k.id}
                href={k.href}
                className="group flex flex-col bg-surface p-4 transition-colors hover:bg-surface-muted"
              >
                <p className="text-xs font-medium text-fg-muted group-hover:text-fg">{k.label}</p>
                <p className="mt-1.5 text-2xl leading-none font-bold tracking-[-0.01em] text-fg tabular">
                  {nf.format(k.value)}
                  {k.unit && <span className="ml-1 text-sm font-semibold text-fg-subtle">{k.unit}</span>}
                </p>
                <Delta kpi={k} period={period} />
                <History kpi={k} />
                <p className="mt-1 text-2xs text-fg-subtle">{HISTORY_LABEL[period]}</p>
              </Link>
            ))}
      </div>
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
                          s.stage === "assessment" ? "bg-primary-500" : "bg-primary-600",
                          hover !== null && hover !== i && "opacity-60",
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
