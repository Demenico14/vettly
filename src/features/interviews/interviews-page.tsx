"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight, Phone, UsersRound, Video } from "@/components/icons";
import { Alert, Avatar, Button, Card, EmptyState, Segmented, Skeleton, Switch } from "@/components/ui";
import { FilterSelect } from "@/components/ui/filter-select";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { services, MOCK_NOW, partsOf, type InterviewListItem } from "@/services";
import type { Interview } from "@/types/interviews";
import { cn } from "@/lib/utils";
import { RESPONSE, StatusBadge, dayLong, dayShort, endTime, time } from "./meta";
import { ScheduleDialog } from "./schedule-dialog";

type View = "week" | "upcoming" | "feedback" | "past";
const NOW = new Date(MOCK_NOW).getTime();
const HOUR_PX = 56;
const FIRST_HOUR = 7;
const LAST_HOUR = 18;

/** Monday of the week containing `iso`, as YYYY-MM-DD (Harare). */
function mondayOf(iso: string) {
  const { date, weekday } = partsOf(iso);
  const d = new Date(`${date}T12:00:00+02:00`);
  d.setUTCDate(d.getUTCDate() - ((weekday + 6) % 7));
  return d.toISOString().slice(0, 10);
}
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00+02:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function InterviewsPage() {
  const [items, setItems] = React.useState<InterviewListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [view, setView] = React.useState<View>("week");
  const [week, setWeek] = React.useState(() => mondayOf(MOCK_NOW));
  const [mine, setMine] = React.useState(false);
  const [vacancy, setVacancy] = React.useState<string[]>([]);
  const [scheduling, setScheduling] = React.useState(false);

  React.useEffect(() => {
    services.interviews
      .list()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, [reload]);

  // Phones get the agenda, not a seven-column grid.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off choice of default view by viewport
    if (window.innerWidth < 768) setView("upcoming");
  }, []);

  const all = (items ?? []).filter((i) => (!mine || i.myRole) && (vacancy.length === 0 || vacancy.includes(i.interview.vacancyTitle)));
  const due = all.filter((i) => i.myScorecardDue).length;
  const upcoming = all.filter((i) => i.interview.status === "scheduled" && new Date(i.interview.startsAt).getTime() >= NOW - 3600000);
  const feedback = all.filter((i) => i.interview.status === "completed" && (i.myScorecardDue || !i.interview.decision));
  const past = all.filter((i) => i.interview.status !== "scheduled" || new Date(i.interview.startsAt).getTime() < NOW - 3600000).reverse();

  return (
    <PageContainer
      className={cn(view === "week" && "max-w-none")}
      header={
        <PageHeader
          title="Interviews"
          description="Schedule interviews, prepare with the question set and the candidate's results, and record scorecards and the panel's decision."
          actions={
            <Button onClick={() => setScheduling(true)}>
              <CalendarPlus />
              Schedule interview
            </Button>
          }
        />
      }
    >
      {error ? (
        <Alert tone="danger" title="Interviews didn't load">
          {error}
        </Alert>
      ) : !items ? (
        <Skeleton className="h-[32rem] rounded-lg" />
      ) : (
        <div className="flex flex-col gap-5">
          {due > 0 && (
            <Alert tone="warning" title={`You owe ${due} scorecard${due > 1 ? "s" : ""}`} action={<Button size="sm" variant="secondary" onClick={() => setView("feedback")}>Show</Button>}>
              Submit while the interview is fresh. Other panellists&apos; scores stay hidden until you do.
            </Alert>
          )}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <Segmented
                label="View"
                value={view}
                onChange={setView}
                options={[
                  { value: "week", label: "Week" },
                  { value: "upcoming", label: <>Upcoming <span className="text-fg-subtle tabular">{upcoming.length}</span></> },
                  { value: "feedback", label: <>Feedback <span className="text-fg-subtle tabular">{feedback.length}</span></> },
                  { value: "past", label: "Past" },
                ]}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <FilterSelect label="Vacancy" value={vacancy} onChange={setVacancy} options={[...new Set((items ?? []).map((i) => i.interview.vacancyTitle))].map((v) => ({ value: v, label: v }))} />
              <label className="flex items-center gap-2 text-sm text-fg-muted">
                <Switch checked={mine} onCheckedChange={setMine} />
                Only mine
              </label>
            </div>
          </div>

          {view === "week" ? (
            <WeekGrid items={all} week={week} onWeek={setWeek} />
          ) : (
            <Agenda
              items={view === "upcoming" ? upcoming : view === "feedback" ? feedback : past}
              empty={view === "upcoming" ? "No interviews coming up" : view === "feedback" ? "Nothing waiting for feedback" : "No past interviews"}
              onSchedule={() => setScheduling(true)}
            />
          )}
        </div>
      )}
      <ScheduleDialog open={scheduling} onOpenChange={setScheduling} onScheduled={() => setReload((r) => r + 1)} />
    </PageContainer>
  );
}

function FormatIcon({ format, className }: { format: Interview["format"]; className?: string }) {
  const Icon = format === "Video" ? Video : format === "Phone" ? Phone : UsersRound;
  return <Icon className={className} aria-hidden />;
}

function WeekGrid({ items, week, onWeek }: { items: InterviewListItem[]; week: string; onWeek: (w: string) => void }) {
  const days = Array.from({ length: 5 }, (_, i) => addDays(week, i));
  const today = partsOf(MOCK_NOW).date;
  const nowParts = partsOf(MOCK_NOW);
  const nowTop = ((Number(nowParts.time.slice(0, 2)) - FIRST_HOUR) * 60 + Number(nowParts.time.slice(3))) * (HOUR_PX / 60);
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);
  const inWeek = items.filter((i) => days.includes(partsOf(i.interview.startsAt).date) && i.interview.status !== "cancelled");

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="Previous week" onClick={() => onWeek(addDays(week, -7))}>
            <ChevronLeft />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Next week" onClick={() => onWeek(addDays(week, 7))}>
            <ChevronRight />
          </Button>
          <h2 className="ml-2 text-sm font-semibold text-fg">
            {dayShort(`${days[0]}T12:00:00+02:00`)} – {dayShort(`${days[4]}T12:00:00+02:00`)}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-fg-subtle sm:inline">Harare time (CAT)</span>
          <Button size="sm" variant="secondary" onClick={() => onWeek(mondayOf(MOCK_NOW))}>
            Today
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[46rem] grid-cols-[3.5rem_repeat(5,minmax(0,1fr))]">
          <div />
          {days.map((d) => (
            <div key={d} className={cn("border-b border-l border-line px-3 py-2 text-xs font-semibold", d === today ? "text-primary-700" : "text-fg-muted")}>
              {dayShort(`${d}T12:00:00+02:00`)}
              {d === today && <span className="ml-1.5 rounded-full bg-primary-600 px-1.5 py-0.5 text-2xs text-white">Today</span>}
            </div>
          ))}
          <div className="relative">
            {hours.map((h) => (
              <div key={h} className="pr-2 text-right text-2xs text-fg-subtle tabular" style={{ height: HOUR_PX }}>
                <span className="relative -top-1.5">{String(h).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>
          {days.map((d) => (
            <div key={d} className={cn("relative border-l border-line", d === today && "bg-primary-50/30")} style={{ height: hours.length * HOUR_PX }}>
              {hours.map((h) => (
                <div key={h} className="border-b border-line/70" style={{ height: HOUR_PX }} aria-hidden />
              ))}
              {d === today && nowTop > 0 && nowTop < hours.length * HOUR_PX && (
                <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-danger-500" style={{ top: nowTop }} aria-hidden>
                  <span className="absolute -top-1 -left-1 size-2 rounded-full bg-danger-500" />
                </div>
              )}
              {inWeek
                .filter((i) => partsOf(i.interview.startsAt).date === d)
                .map((i) => {
                  const iv = i.interview;
                  const t = partsOf(iv.startsAt).time;
                  const top = ((Number(t.slice(0, 2)) - FIRST_HOUR) * 60 + Number(t.slice(3))) * (HOUR_PX / 60);
                  const h = Math.max(30, iv.durationMin * (HOUR_PX / 60) - 3);
                  return (
                    <Link
                      key={iv.id}
                      href={`/interviews/${iv.id}`}
                      className={cn(
                        "absolute inset-x-1 z-20 overflow-hidden rounded-md border px-2 py-1 text-left text-xs transition-shadow hover:shadow-md",
                        iv.status === "scheduled" ? "border-primary-500/40 bg-primary-50 text-primary-900" : iv.status === "no_show" ? "border-danger-100 bg-danger-50 text-danger-700" : "border-line bg-ink-50 text-fg-muted",
                        i.myScorecardDue && "border-dashed border-accent-500 bg-accent-50 text-accent-700",
                      )}
                      style={{ top, height: h }}
                    >
                      <span className="flex items-center gap-1 font-semibold">
                        <FormatIcon format={iv.format} className="size-3 shrink-0" />
                        <span className="truncate">{iv.candidateName}</span>
                      </span>
                      <span className="block truncate opacity-80">
                        {t}–{endTime(iv)} · {iv.round}
                      </span>
                      {i.myScorecardDue && <span className="block truncate font-semibold">Your scorecard is due</span>}
                    </Link>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function Agenda({ items, empty, onSchedule }: { items: InterviewListItem[]; empty: string; onSchedule: () => void }) {
  if (items.length === 0)
    return (
      <Card>
        <EmptyState icon={<CalendarPlus />} title={empty} description="Schedule an interview from here, a candidate's profile or the pipeline." action={<Button size="sm" onClick={onSchedule}>Schedule interview</Button>} />
      </Card>
    );
  const groups = new Map<string, InterviewListItem[]>();
  items.forEach((i) => {
    const k = partsOf(i.interview.startsAt).date;
    groups.set(k, [...(groups.get(k) ?? []), i]);
  });
  return (
    <div className="flex flex-col gap-5">
      {[...groups].map(([date, list]) => (
        <section key={date}>
          <h2 className="mb-2 text-sm font-semibold text-fg">{dayLong(`${date}T12:00:00+02:00`)}</h2>
          <Card className="overflow-hidden">
            <ul>
              {list.map((i) => {
                const iv = i.interview;
                return (
                  <li key={iv.id} className="border-b border-line last:border-b-0">
                    <Link href={`/interviews/${iv.id}`} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 px-4 py-3.5 hover:bg-surface-muted sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:px-5">
                      <span className="text-sm font-semibold text-fg tabular">
                        {time(iv.startsAt)}
                        <span className="block text-xs font-normal text-fg-subtle">{iv.durationMin} min</span>
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <Avatar name={iv.candidateName} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-fg">{iv.candidateName}</span>
                            <span className="block truncate text-xs text-fg-subtle">
                              {iv.round} · {iv.vacancyTitle}
                            </span>
                          </span>
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
                          <span className="inline-flex items-center gap-1">
                            <FormatIcon format={iv.format} className="size-3.5" />
                            {iv.format === "In person" ? iv.location.split(",")[0] : iv.format}
                          </span>
                          <span>{i.panelNames.join(", ")}</span>
                          {iv.status === "scheduled" && <span className={RESPONSE[iv.candidateResponse].cls}>Candidate: {RESPONSE[iv.candidateResponse].label.toLowerCase()}</span>}
                        </span>
                      </span>
                      <span className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-auto sm:flex-col sm:items-end">
                        <StatusBadge status={iv.status} />
                        {i.myScorecardDue && <span className="text-xs font-semibold text-accent-700">Your scorecard is due</span>}
                        {iv.status === "completed" && !i.myScorecardDue && (
                          <span className="text-xs text-fg-subtle tabular">
                            {iv.decision ? `Decision: ${iv.decision.outcome}` : `${i.submitted} of ${i.expected} scorecards`}
                          </span>
                        )}
                        {i.myRole && iv.status === "scheduled" && <span className="text-xs text-fg-subtle">You: {i.myRole}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}

