"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, CircleCheck, Info, Minus, TriangleAlert } from "@/components/icons";
import { Alert, Badge, Card, Select, Segmented, Skeleton, Table, TBody, TD, TH, THead, TR, Tabs, TabsContent, TabsList, TabsTrigger, Tooltip } from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { STAGE_META, VACANCY_META } from "@/components/domain/status-badge";
import { services, IMPACT_THRESHOLD, MIN_GROUP } from "@/services";
import type { AnalyticsFilters, AnalyticsPeriod, AnalyticsReport, ImpactRow, KpiFigure } from "@/types/analytics";
import { cn } from "@/lib/utils";
import { BarList, ChartCard, ColumnChart, HistogramLegend, StenHistogram, fmt } from "./charts";

type Tab = "overview" | "vacancies" | "sources" | "team" | "assessments" | "fairness";
const TABS: [Tab, string][] = [
  ["overview", "Overview"],
  ["vacancies", "Vacancies"],
  ["sources", "Sources"],
  ["team", "Team"],
  ["assessments", "Tests"],
  ["fairness", "Fairness"],
];
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const pct = (n: number | null) => (n === null ? "–" : `${n}%`);
const num = (n: number | null, unit = "") => (n === null ? "–" : `${n}${unit}`);

export function AnalyticsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as Tab) || "overview";
  const [f, setF] = React.useState<AnalyticsFilters>({ period: (params.get("period") as AnalyticsPeriod) || "90d", department: "all", vacancyId: "all" });
  const [report, setReport] = React.useState<AnalyticsReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    services.analytics
      .report(f)
      .then((r) => alive && (setReport(r), setError(null)))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [f]);

  const go = (t: Tab) => router.replace(t === "overview" ? "/analytics" : `/analytics?tab=${t}`, { scroll: false });
  const flagged = report?.impact.filter((r) => r.flagged).length ?? 0;

  return (
    <PageContainer
      header={
        <PageHeader
          title="Analytics"
          description="How recruitment is going: volume, speed, where people come from, how tests perform, and whether any group is losing out."
        />
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Period"
            value={f.period}
            onChange={(period) => setF((x) => ({ ...x, period }))}
            options={[
              { value: "30d", label: "30 days" },
              { value: "90d", label: "90 days" },
              { value: "12m", label: "12 months" },
            ]}
          />
          <div className="w-full sm:w-52">
            <Select
              size="sm"
              value={f.department}
              onValueChange={(department) => setF((x) => ({ ...x, department, vacancyId: "all" }))}
              options={[{ value: "all", label: "All departments" }, ...(report?.departments ?? []).map((d) => ({ value: d, label: d }))]}
            />
          </div>
          <div className="w-full sm:w-60">
            <Select
              size="sm"
              value={f.vacancyId}
              onValueChange={(vacancyId) => setF((x) => ({ ...x, vacancyId }))}
              options={[{ value: "all", label: "All vacancies" }, ...(report?.vacancyOptions ?? []).map((v) => ({ value: v.id, label: v.title, description: v.department }))]}
            />
          </div>
          {report && <span className="text-xs text-fg-subtle sm:ml-auto">{`${shortDate(report.range.from)} to ${shortDate(report.range.to)}`}</span>}
        </div>

        <Tabs value={tab} onValueChange={(v) => go(v as Tab)}>
          <TabsList>
            {TABS.map(([k, label]) => (
              <TabsTrigger key={k} value={k}>
                {label}
                {k === "fairness" && flagged > 0 && <span className="rounded-full bg-warning-50 px-1.5 text-2xs leading-4 font-bold text-warning-700 tabular">{flagged} to review</span>}
              </TabsTrigger>
            ))}
          </TabsList>
          {error ? (
            <Alert tone="danger" title="Analytics didn't load" className="mt-5">
              {error}
            </Alert>
          ) : !report ? (
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
              <Skeleton className="col-span-full h-72 rounded-lg" />
            </div>
          ) : (
            <div className={cn("transition-opacity")}>
              <TabsContent value="overview">
                <Overview r={report} />
              </TabsContent>
              <TabsContent value="vacancies">
                <Vacancies r={report} />
              </TabsContent>
              <TabsContent value="sources">
                <Sources r={report} />
              </TabsContent>
              <TabsContent value="team">
                <Team r={report} />
              </TabsContent>
              <TabsContent value="assessments">
                <Assessments r={report} />
              </TabsContent>
              <TabsContent value="fairness">
                <Fairness r={report} />
              </TabsContent>
            </div>
          )}
        </Tabs>
      </div>
    </PageContainer>
  );
}

function Kpi({ k, previous }: { k: KpiFigure; previous: string | null }) {
  const good = k.delta === null || k.delta === 0 ? null : (k.delta > 0) === (k.better === "up");
  const Icon = !k.delta ? Minus : k.delta > 0 ? ArrowUp : ArrowDown;
  return (
    <Card className="px-4 py-3.5">
      <Tooltip content={k.hint}>
        <span className="inline-flex cursor-help items-center gap-1 text-xs font-medium text-fg-muted">
          {k.label}
          <Info className="size-3 text-fg-subtle" />
        </span>
      </Tooltip>
      <span className="mt-1 block text-2xl font-bold text-fg tabular">
        {k.value === null ? "–" : fmt(k.value)}
        {k.value !== null && k.unit && <span className={cn("text-sm font-semibold text-fg-muted", k.unit !== "%" && "ml-1")}>{k.unit}</span>}
      </span>
      {previous && k.delta !== null ? (
        <span className={cn("mt-0.5 inline-flex items-center gap-1 text-xs", good === null ? "text-fg-subtle" : good ? "text-success-700" : "text-danger-700")}>
          <Icon className="size-3" />
          <span className="tabular">
            {k.delta > 0 ? "+" : ""}
            {k.delta}
            {k.deltaUnit === "%" ? "%" : k.deltaUnit === "pts" ? " pts" : k.deltaUnit === "days" ? (Math.abs(k.delta) === 1 ? " day" : " days") : ""}
          </span>
          <span className="text-fg-subtle">vs {previous}</span>
        </span>
      ) : (
        <span className="mt-0.5 block text-xs text-fg-subtle">{previous ? "Nothing to compare" : "Whole year"}</span>
      )}
    </Card>
  );
}

function Overview({ r }: { r: AnalyticsReport }) {
  const applied = r.funnel[0]!.count;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {r.kpis.map((k) => (
          <Kpi key={k.id} k={k} previous={r.range.previousLabel} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ChartCard
          title="Applications"
          description={`${r.range.label}, ${r.filters.period === "12m" ? "by month" : r.filters.period === "90d" ? "by week" : "by day"}`}
          csv={{ name: `applications-${r.filters.period}`, rows: r.trend.map((b) => ({ period: b.detail, applications: b.applications })) }}
          table={
            <SimpleTable head={["Period", "Applications"]} rows={r.trend.map((b) => [b.detail, fmt(b.applications)])} />
          }
        >
          <ColumnChart data={r.trend.map((b) => ({ label: b.label, detail: b.detail, value: b.applications }))} label="Applications" unit={r.trend.length ? "applications" : ""} />
        </ChartCard>
        <ChartCard
          title="Funnel"
          description="How far this period's applicants got. Percentages are of the stage before."
          csv={{ name: `funnel-${r.filters.period}`, rows: r.funnel.map((s) => ({ stage: STAGE_META[s.stage].label, applications: s.count, conversion_pct: s.conversion, median_days_from_previous: s.medianDays })) }}
          table={
            <SimpleTable
              head={["Stage", "Reached", "From previous", "Median days"]}
              rows={r.funnel.map((s) => [STAGE_META[s.stage].label, fmt(s.count), pct(s.conversion), num(s.medianDays)])}
            />
          }
        >
          <BarList
            max={applied}
            rows={r.funnel.map((s) => ({ key: s.stage, label: STAGE_META[s.stage].label, value: s.count, note: s.conversion !== null ? `${s.conversion}%` : undefined }))}
          />
          <p className="mt-4 text-xs text-fg-subtle">
            Of {fmt(applied)}: {fmt(r.outcomes.active)} still in progress, {fmt(r.outcomes.rejected)} not taken forward, {fmt(r.outcomes.withdrawn)} withdrew
            {r.outcomes.declined ? `, ${r.outcomes.declined} declined an offer` : ""}.
          </p>
        </ChartCard>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="Time between stages" description="Median days to move on from the stage before. Long waits are where candidates drop out.">
          <BarList
            rows={r.funnel.slice(1).map((s) => ({ key: s.stage, label: `To ${STAGE_META[s.stage].label.toLowerCase()}`, value: s.medianDays ?? 0, muted: s.medianDays === null }))}
            format={(n) => (n ? `${n} days` : "–")}
          />
        </ChartCard>
        <ChartCard
          title="Hires"
          description="Offers accepted in the period, and how long each took from application."
          csv={{ name: `hires-${r.filters.period}`, rows: r.hires.map((h) => ({ vacancy: h.vacancyTitle, applied: h.appliedAt.slice(0, 10), accepted: h.acceptedAt.slice(0, 10), days: h.days, source: h.source })) }}
        >
          {r.hires.length === 0 ? (
            <p className="text-sm text-fg-subtle">No offers accepted in this period.</p>
          ) : (
            <BarList rows={r.hires.map((h, i) => ({ key: `${h.vacancyTitle}${i}`, label: h.vacancyTitle, value: h.days, note: `accepted ${shortDate(h.acceptedAt)}` }))} format={(n) => `${n} days`} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function SimpleTable({ head, rows, align }: { head: string[]; rows: React.ReactNode[][]; align?: ("left" | "right")[] }) {
  return (
    <Table>
      <THead>
        <TR>
          {head.map((h, i) => (
            <TH key={h} className={cn((align?.[i] ?? (i ? "right" : "left")) === "right" && "text-right")}>
              {h}
            </TH>
          ))}
        </TR>
      </THead>
      <TBody>
        {rows.map((row, i) => (
          <TR key={i}>
            {row.map((c, j) => (
              <TD key={j} className={cn("text-sm", (align?.[j] ?? (j ? "right" : "left")) === "right" ? "text-right text-fg-muted tabular" : "text-fg")}>
                {c}
              </TD>
            ))}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

function Vacancies({ r }: { r: AnalyticsReport }) {
  return (
    <ChartCard
      title="Vacancy performance"
      description="Vacancies open at any point in the period, over their whole life. Time to fill runs from opening to the last offer accepted."
      csv={{
        name: `vacancies-${r.filters.period}`,
        rows: r.vacancies.map((v) => ({ vacancy: v.title, department: v.department, recruiter: v.recruiter, status: v.status, days_open: v.daysOpen, applications: v.applications, shortlisted: v.shortlisted, interviews: v.interviews, offers: v.offers, hires: v.hires, openings: v.openings, time_to_fill_days: v.timeToFill })),
      }}
    >
      {r.vacancies.length === 0 ? (
        <p className="text-sm text-fg-subtle">No vacancies in this period.</p>
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Vacancy</TH>
                <TH>Status</TH>
                <TH className="text-right">Applications</TH>
                <TH className="text-right">Shortlisted</TH>
                <TH className="text-right">Interviewed</TH>
                <TH className="text-right">Offers</TH>
                <TH className="text-right">Hired</TH>
                <TH className="text-right">Days open</TH>
                <TH className="text-right">Time to fill</TH>
              </TR>
            </THead>
            <TBody>
              {r.vacancies.map((v) => (
                <TR key={v.id}>
                  <TD className="min-w-44">
                    {v.id.startsWith("vac_h_") ? (
                      <span className="block font-semibold text-fg">{v.title}</span>
                    ) : (
                      <Link href={`/vacancies/${v.id}`} className="block font-semibold text-fg hover:underline">
                        {v.title}
                      </Link>
                    )}
                    <span className="block text-xs text-fg-subtle">
                      {v.department} · {v.recruiter}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone="status" size="sm" dot dotClassName={VACANCY_DOT[v.status]}>
                      {VACANCY_META[v.status].label}
                    </Badge>
                  </TD>
                  <TD className="text-right text-sm font-semibold text-fg tabular">{fmt(v.applications)}</TD>
                  <TD className="text-right text-sm text-fg-muted tabular">
                    {v.shortlisted}
                    <span className="block text-2xs text-fg-subtle">{v.applications ? Math.round((100 * v.shortlisted) / v.applications) : 0}%</span>
                  </TD>
                  <TD className="text-right text-sm text-fg-muted tabular">{v.interviews}</TD>
                  <TD className="text-right text-sm text-fg-muted tabular">{v.offers}</TD>
                  <TD className="text-right text-sm text-fg-muted tabular">
                    {v.hires}
                    <span className="text-fg-subtle"> / {v.openings}</span>
                  </TD>
                  <TD className="text-right text-sm text-fg-muted tabular">{v.daysOpen}</TD>
                  <TD className="text-right text-sm text-fg tabular">{v.timeToFill === null ? <span className="text-fg-subtle">{v.status === "open" || v.status === "paused" ? "Open" : "Not filled"}</span> : `${v.timeToFill} days`}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </ChartCard>
  );
}

const VACANCY_DOT: Record<string, string> = { open: "bg-success-500", paused: "bg-warning-500", closed: "bg-ink-400", filled: "bg-primary-500", draft: "bg-ink-300" };

function Sources({ r }: { r: AnalyticsReport }) {
  const totalSpend = r.sources.reduce((s, x) => s + x.spendUsd, 0);
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <ChartCard title="Applications by source" description={`${r.range.label}. The note is the share shortlisted.`}>
        <BarList rows={r.sources.map((s) => ({ key: s.source, label: s.source, value: s.applications, note: `${s.shortlistRate}% shortlisted` }))} />
      </ChartCard>
      <ChartCard
        title="Source quality and cost"
        description={`Spend is LinkedIn's subscription, VacancyMail listings and referral bonuses: US$${fmt(totalSpend)} in this period.`}
        csv={{ name: `sources-${r.filters.period}`, rows: r.sources.map((s) => ({ source: s.source, applications: s.applications, shortlisted_pct: s.shortlistRate, interviews: s.interviews, hires: s.hires, spend_usd: s.spendUsd, cost_per_hire_usd: s.costPerHire })) }}
      >
        <div className="-mx-5 overflow-x-auto">
          <SimpleTable
            head={["Source", "Applications", "Shortlisted", "Interviewed", "Hired", "Spend", "Per hire"]}
            rows={r.sources.map((s) => [s.source, fmt(s.applications), `${s.shortlistRate}%`, s.interviews, s.hires, s.spendUsd ? `US$${fmt(s.spendUsd)}` : "Free", s.costPerHire ? `US$${fmt(s.costPerHire)}` : "–"])}
          />
        </div>
      </ChartCard>
    </div>
  );
}

function Team({ r }: { r: AnalyticsReport }) {
  return (
    <div className="flex flex-col gap-5">
      <ChartCard
        title="Recruiter workload and speed"
        description="Applications received for each recruiter's vacancies in the period. Use this to balance workload, not to rank people: vacancy mix drives most of the difference."
        csv={{ name: `recruiters-${r.filters.period}`, rows: r.recruiters.map((x) => ({ recruiter: x.name, vacancies: x.vacancies, applications: x.applications, median_days_to_review: x.medianDaysToReview, interviews: x.interviews, offers: x.offers, accepted: x.accepted, median_time_to_hire_days: x.medianTimeToHire })) }}
      >
        <div className="-mx-5 overflow-x-auto">
          <SimpleTable
            head={["Recruiter", "Vacancies", "Applications", "First review", "Interviewed", "Offers answered", "Accepted", "Time to hire"]}
            rows={r.recruiters.map((x) => [
              <span key="n" className="font-semibold">
                {x.name}
              </span>,
              x.vacancies,
              fmt(x.applications),
              x.medianDaysToReview === null ? "–" : `${x.medianDaysToReview} days`,
              x.interviews,
              x.offers,
              x.accepted,
              x.medianTimeToHire === null ? "–" : `${x.medianTimeToHire} days`,
            ])}
          />
        </div>
        <p className="mt-3 text-xs text-fg-subtle">First review is the median days from application to the first screening decision. Time to hire is the median for offers accepted in the period.</p>
      </ChartCard>
    </div>
  );
}

function Assessments({ r }: { r: AnalyticsReport }) {
  if (!r.tests.length)
    return (
      <Card className="p-6">
        <p className="text-sm text-fg-subtle">No tests were sent in this period.</p>
      </Card>
    );
  const sent = r.tests.reduce((s, t) => s + t.sent, 0);
  const done = r.tests.reduce((s, t) => s + t.completed, 0);
  return (
    <div className="flex flex-col gap-5">
      <ChartCard
        title="Completion and drop-off by test"
        description={`${fmt(sent)} tests sent, ${fmt(done)} completed. Completion counts only tests whose deadline has passed.`}
        csv={{ name: `tests-${r.filters.period}`, rows: r.tests.map((t) => ({ test: t.name, sent: t.sent, completed: t.completed, in_progress: t.inProgress, not_started: t.notStarted, abandoned: t.abandoned, completion_pct: t.completionRate, median_minutes: t.medianMinutes, time_limit_minutes: t.timeLimit, median_days_to_complete: t.medianDaysToComplete, mean_sten: t.meanSten })) }}
      >
        <div className="-mx-5 overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Test</TH>
                <TH className="text-right">Sent</TH>
                <TH className="min-w-48">Outcome</TH>
                <TH className="text-right">Completion</TH>
                <TH className="text-right">Time taken</TH>
                <TH className="text-right">Days to finish</TH>
              </TR>
            </THead>
            <TBody>
              {r.tests.map((t) => (
                <TR key={t.testId}>
                  <TD className="text-sm font-semibold text-fg">
                    <Link href={`/assessments/library/${t.testId}`} className="hover:underline">
                      {t.name}
                    </Link>
                  </TD>
                  <TD className="text-right text-sm text-fg-muted tabular">{t.sent}</TD>
                  <TD>
                    <OutcomeBar t={t} />
                  </TD>
                  <TD className="text-right text-sm font-semibold text-fg tabular">{pct(t.completionRate)}</TD>
                  <TD className="text-right text-sm text-fg-muted tabular">
                    {num(t.medianMinutes, " min")}
                    <span className="block text-2xs text-fg-subtle">limit {t.timeLimit} min</span>
                  </TD>
                  <TD className="text-right text-sm text-fg-muted tabular">{num(t.medianDaysToComplete)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
        <OutcomeLegend />
      </ChartCard>
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-md font-semibold text-fg">Score distributions</h2>
            <p className="text-xs text-fg-subtle">Stens of completed tests. Candidates who reach testing are already screened, so scores sitting above the norm is expected.</p>
          </div>
          <HistogramLegend />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {r.tests
            .filter((t) => t.completed > 0)
            .map((t) => (
              <Card key={t.testId} className="p-4">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-fg">{t.name}</span>
                  <span className="shrink-0 text-xs text-fg-subtle tabular">
                    {t.completed < MIN_GROUP ? "Small sample · " : ""}n = {t.completed} · mean {t.meanSten}
                  </span>
                </div>
                <StenHistogram stens={t.stens} />
              </Card>
            ))}
        </div>
      </section>
    </div>
  );
}

function OutcomeBar({ t }: { t: AnalyticsReport["tests"][number] }) {
  const parts = [
    { n: t.completed, cls: "bg-primary-500", label: "completed" },
    { n: t.inProgress, cls: "bg-primary-200", label: "in progress" },
    { n: t.abandoned, cls: "bg-ink-500", label: "started, not finished" },
    { n: t.notStarted, cls: "bg-ink-200", label: "never started" },
  ];
  return (
    <Tooltip content={parts.map((p) => `${p.n} ${p.label}`).join(" · ")}>
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full" aria-label={parts.map((p) => `${p.n} ${p.label}`).join(", ")}>
        {parts
          .filter((p) => p.n)
          .map((p) => (
            <div key={p.label} className={p.cls} style={{ width: `${(p.n / t.sent) * 100}%` }} />
          ))}
      </div>
    </Tooltip>
  );
}

function OutcomeLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-xs text-fg-muted">
      {[
        ["bg-primary-500", "Completed"],
        ["bg-primary-200", "In progress"],
        ["bg-ink-500", "Started, not finished"],
        ["bg-ink-200", "Never started or expired"],
      ].map(([c, l]) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-xs", c)} aria-hidden />
          {l}
        </span>
      ))}
    </div>
  );
}

function Fairness({ r }: { r: AnalyticsReport }) {
  const flagged = r.impact.filter((x) => x.flagged);
  return (
    <div className="flex flex-col gap-5">
      {flagged.length > 0 ? (
        <Alert tone="warning" title={`${flagged.length} ${flagged.length === 1 ? "decision needs" : "decisions need"} a closer look`}>
          {flagged.map((x) => `${x.decision} (${x.dimension.toLowerCase()})`).join("; ")}. A group is selected at less than {Math.round(IMPACT_THRESHOLD * 100)}% of the rate of the most-selected group, and the gap is unlikely to be chance (p &lt; 0.05). This is a prompt to review, not proof of bias: check the step is
          job-relevant, whether a time limit is needed, and whether the cut-off is set higher than the role requires.
        </Alert>
      ) : (
        <Alert tone="success" title="Nothing needs review">
          No group large enough to compare is selected at a clearly lower rate: either every group is at {Math.round(IMPACT_THRESHOLD * 100)}% or more of the most-selected group&rsquo;s rate, or the gap is small enough to be chance.
        </Alert>
      )}
      <p className="text-xs text-fg-subtle">
        Based on voluntary, self-declared information ({r.disclosure.gender}% of applicants gave gender, {r.disclosure.age}% gave age). Only totals are shown, never individuals, and groups under {`${MIN_GROUP} people`} are not compared. &ldquo;Watch&rdquo; means a gap below the guide that small numbers could explain. Recruiters never see this
        information while reviewing candidates.
      </p>
      {(["stage", "test"] as const).map((kind) => {
        const rows = r.impact.filter((x) => x.kind === kind);
        if (!rows.length) return null;
        return (
          <ChartCard
            key={kind}
            title={kind === "stage" ? "Selection decisions" : "Test results"}
            description={kind === "stage" ? "Who moved on at each human decision, by group." : "Share of each group scoring sten 5 or above (average or better against the norm)."}
            csv={{
              name: `adverse-impact-${kind}-${r.filters.period}`,
              rows: rows.flatMap((x) => x.groups.map((g) => ({ decision: x.decision, dimension: x.dimension, group: g.group, people: g.suppressed ? `under ${MIN_GROUP}` : g.n, selected: g.suppressed ? null : g.selected, rate_pct: g.rate, impact_ratio: g.ratio }))),
            }}
          >
            <div className="flex flex-col divide-y divide-line">
              {rows.map((x) => (
                <ImpactBlock key={x.id} x={x} />
              ))}
            </div>
          </ChartCard>
        );
      })}
    </div>
  );
}

function ImpactBlock({ x }: { x: ImpactRow }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-fg">{x.decision}</span>
        <span className="text-xs text-fg-subtle">by {x.dimension.toLowerCase()}</span>
        {x.status === "review" ? (
          <Badge tone="warning" size="sm">
            <TriangleAlert />
            Review
          </Badge>
        ) : x.status === "watch" ? (
          <Badge tone="neutral" size="sm">
            <Info />
            Watch: small numbers
          </Badge>
        ) : x.status === "insufficient" ? (
          <Badge tone="neutral" size="sm">
            Too few to compare
          </Badge>
        ) : (
          <Badge tone="success" size="sm">
            <CircleCheck />
            Within guide
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {x.groups.map((g) => {
          const low = x.status === "review" && g.ratio !== null && g.ratio < IMPACT_THRESHOLD;
          return (
            <div key={g.group} className={cn("rounded-md px-3 py-2", low ? "bg-warning-50" : "bg-ink-50")}>
              <span className="block text-xs text-fg-muted">{g.group}</span>
              {g.suppressed ? (
                <span className="block text-sm text-fg-subtle">Too few to compare</span>
              ) : (
                <>
                  <span className="block text-sm text-fg tabular">
                    <span className="font-semibold">{g.rate}%</span> <span className="text-xs text-fg-subtle">of {fmt(g.n)}</span>
                  </span>
                  <span className={cn("block text-xs tabular", low ? "font-semibold text-warning-700" : "text-fg-subtle")}>
                    {low && <TriangleAlert className="mr-1 inline size-3 align-[-1px]" />}
                    ratio {g.ratio?.toFixed(2)}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
