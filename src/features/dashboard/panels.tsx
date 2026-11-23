"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  CircleAlert,
  ClipboardList,
  Clock,
  DeviceMobile,
  FileSignature,
  FileStack,
  Inbox,
  KanbanSquare,
  MapPin,
  Sparkles,
  UserPlus,
} from "@/components/icons";
import {
  Avatar,
  AvatarStack,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Segmented,
  Skeleton,
  Table,
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
  toast,
} from "@/components/ui";
import { VacancyStatusBadge } from "@/components/domain/status-badge";
import { MatchScore } from "@/components/domain/assessment";
import { MOCK_NOW, deadlineIn, services } from "@/services";
import type {
  ActivityEvent,
  ActivityKind,
  AttentionItem,
  AttentionKind,
  InterviewSlot,
  RecentApplication,
  TestInvitationStatus,
  TestInvitationSummary,
  VacancySummary,
} from "@/types";
import { cn, timeAgo } from "@/lib/utils";

const NOW = new Date(MOCK_NOW);
const rel = (iso: string) => timeAgo(iso, NOW);
const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);
function dayLabel(iso: string) {
  const d = new Date(iso);
  const diff = Math.round((new Date(dayKey(iso)).getTime() - new Date(dayKey(MOCK_NOW)).getTime()) / 86400000);
  const date = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(d);
  if (diff === 0) return `Today · ${date}`;
  if (diff === 1) return `Tomorrow · ${date}`;
  return date;
}

function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-5" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline">
      {children}
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

/* ---------- Needs attention ---------- */

const ATTENTION: Record<AttentionKind, { Icon: typeof Inbox; cls: string }> = {
  ai_review: { Icon: Sparkles, cls: "border-dashed border-accent-500/60 bg-accent-50 text-accent-700" },
  test_results: { Icon: ClipboardList, cls: "border-primary-200 bg-primary-50 text-primary-700" },
  closing_soon: { Icon: Clock, cls: "border-warning-100 bg-warning-50 text-warning-700" },
  cv_failed: { Icon: CircleAlert, cls: "border-danger-100 bg-danger-50 text-danger-700" },
  offer_pending: { Icon: FileSignature, cls: "border-secondary-100 bg-secondary-50 text-secondary-700" },
};

export function AttentionPanel({ items, loading }: { items?: AttentionItem[]; loading: boolean }) {
  const total = items?.reduce((s, i) => s + i.count, 0) ?? 0;
  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Needs your attention"
        description={loading ? "Checking…" : total ? `${total} items across your vacancies` : "Nothing waiting on you"}
      />
      {loading || !items ? (
        <PanelSkeleton rows={5} />
      ) : items.length === 0 ? (
        <EmptyState icon={<CalendarCheck />} title="You're up to date" description="AI assessments to review, test results and expiring offers will appear here." className="py-8" />
      ) : (
        <ul className="border-t border-line">
          {items.map((it) => {
            const { Icon, cls } = ATTENTION[it.kind];
            return (
              <li key={it.id}>
                <Link href={it.href} className="group flex items-center gap-3 border-b border-line px-5 py-3 last:border-b-0 hover:bg-surface-muted">
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-md border", cls)}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-fg">{it.title}</span>
                    <span className="block truncate text-xs text-fg-subtle">{it.detail}</span>
                  </span>
                  {it.count > 1 && (
                    <span className="rounded-xs bg-ink-100 px-1.5 text-xs font-bold text-ink-700 tabular">{it.count}</span>
                  )}
                  <ArrowRight className="size-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Active vacancies ---------- */

export function VacanciesPanel({ vacancies, loading }: { vacancies?: VacancySummary[]; loading: boolean }) {
  const router = useRouter();
  const [scope, setScope] = React.useState<"active" | "all">("active");
  const rows = (vacancies ?? []).filter((v) => scope === "all" || v.status === "open" || v.status === "paused");
  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Vacancies"
        description="Applicants, shortlist and interviews per vacancy"
        actions={
          <Segmented
            label="Vacancy scope"
            value={scope}
            onChange={setScope}
            options={[
              { value: "active", label: "Active" },
              { value: "all", label: "All" },
            ]}
          />
        }
      />
      {loading || !vacancies ? (
        <PanelSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Briefcase />}
          title="No vacancies yet"
          description="Create a vacancy with its requirements and Vettly starts scoring applications against it."
          action={
            <Button size="sm" onClick={() => router.push("/vacancies/new")}>
              Create vacancy
            </Button>
          }
          className="py-8"
        />
      ) : (
        <>
        <ul className="border-t border-line sm:hidden">
          {rows.map((v) => (
            <li key={v.id}>
              <Link href={`/vacancies/${v.id}`} className="flex items-start justify-between gap-3 border-b border-line px-5 py-3 last:border-b-0 hover:bg-surface-muted">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-fg">{v.title}</span>
                  <span className="block truncate text-xs text-fg-subtle">
                    {v.location} · {v.applicants} applicants · {v.shortlisted} shortlisted
                  </span>
                  <span className="mt-1 block text-xs text-fg-muted">
                    {v.status === "filled" ? "Filled" : v.closesAt ? `Closes ${rel(v.closesAt)}` : "No closing date"}
                  </span>
                </span>
                <VacancyStatusBadge status={v.status} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
        <TableContainer className="mx-5 mb-5 hidden rounded-md sm:block">
          <Table className="min-w-[38rem]">
            <THead>
              <TR>
                <TH>Vacancy</TH>
                <TH>Status</TH>
                <TH className="text-right">Applicants</TH>
                <TH>Progress</TH>
                <TH>Closes</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((v) => {
                const closingSoon = v.closesAt && v.status === "open" && new Date(v.closesAt).getTime() - NOW.getTime() < 3 * 86400000;
                return (
                  <TR key={v.id} className="cursor-pointer" onClick={() => router.push(`/vacancies/${v.id}`)}>
                    <TD>
                      <Link href={`/vacancies/${v.id}`} className="font-semibold text-fg hover:underline" onClick={(e) => e.stopPropagation()}>
                        {v.title}
                      </Link>
                      <p className="text-xs text-fg-subtle">
                        {v.department} · {v.location}
                      </p>
                    </TD>
                    <TD>
                      <VacancyStatusBadge status={v.status} size="sm" />
                    </TD>
                    <TD className="text-right">
                      <span className="font-semibold">{v.applicants}</span>
                      {v.newApplicants > 0 && <span className="ml-1 text-xs font-semibold text-primary-700">+{v.newApplicants}</span>}
                    </TD>
                    <TD>
                      <span className="block text-xs whitespace-nowrap text-fg-muted">
                        {v.shortlisted} shortlisted · {v.interviewing} interviewing
                      </span>
                      <span className="mt-1 flex h-1.5 w-32 overflow-hidden rounded-full bg-ink-100" aria-hidden>
                        <span className="h-full bg-primary-300" style={{ width: `${Math.min(100, (v.shortlisted / Math.max(1, v.applicants)) * 400)}%` }} />
                        <span className="h-full bg-primary-600" style={{ width: `${Math.min(100, (v.interviewing / Math.max(1, v.applicants)) * 400)}%` }} />
                      </span>
                    </TD>
                    <TD className="whitespace-nowrap">
                      {v.closesAt ? (
                        <span className={cn("text-sm", closingSoon ? "font-semibold text-warning-700" : "text-fg-muted")}>
                          {v.status === "filled" ? "Closed" : rel(v.closesAt)}
                        </span>
                      ) : (
                        <span className="text-sm text-fg-subtle">No date</span>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableContainer>
        </>
      )}
    </Card>
  );
}

/* ---------- Upcoming interviews ---------- */

const FORMAT_ICON = { "In person": MapPin, Video: CalendarDays, Phone: DeviceMobile } as const;

export function InterviewsPanel({ interviews, loading }: { interviews?: InterviewSlot[]; loading: boolean }) {
  const groups = React.useMemo(() => {
    const m = new Map<string, InterviewSlot[]>();
    (interviews ?? []).forEach((iv) => {
      const k = dayKey(iv.startsAt);
      m.set(k, [...(m.get(k) ?? []), iv]);
    });
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [interviews]);

  return (
    <Card className="flex flex-col">
      <CardHeader title="Upcoming interviews" description="Next 7 days" actions={<PanelLink href="/interviews">Calendar</PanelLink>} />
      {loading || !interviews ? (
        <PanelSkeleton rows={4} />
      ) : interviews.length === 0 ? (
        <EmptyState icon={<CalendarDays />} title="No interviews scheduled" description="Shortlisted candidates you schedule appear here with their panel." className="py-8" />
      ) : (
        <div className="border-t border-line">
          {groups.map(([k, slots]) => (
            <section key={k} aria-label={dayLabel(slots[0]!.startsAt)}>
              <h3 className="bg-surface-muted px-5 py-1.5 text-2xs font-semibold text-fg-muted">{dayLabel(slots[0]!.startsAt)}</h3>
              <ul>
                {slots.map((iv) => {
                  const Icon = FORMAT_ICON[iv.format];
                  return (
                    <li key={iv.id} className="flex gap-4 border-t border-line px-5 py-3">
                      <div className="w-12 shrink-0 pt-0.5 text-right">
                        <p className="text-sm font-semibold text-fg tabular">{time(iv.startsAt)}</p>
                        <p className="text-2xs text-fg-subtle tabular">{iv.durationMin} min</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/interviews/${iv.id}`} className="block truncate text-sm font-semibold text-fg hover:underline">
                          {iv.candidateName}
                        </Link>
                        <p className="truncate text-xs text-fg-muted">
                          {iv.round} · {iv.vacancyTitle}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1 truncate text-xs text-fg-subtle">
                            <Icon className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">
                              {iv.format} · {iv.location}
                            </span>
                          </span>
                          <AvatarStack names={iv.panel} size="xs" max={3} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------- Psychometric tests ---------- */

const TEST_STATUS: Record<TestInvitationStatus, { label: string; dot: string }> = {
  not_sent: { label: "Not sent", dot: "bg-ink-300" },
  sent: { label: "Sent", dot: "bg-ink-400" },
  opened: { label: "Opened", dot: "bg-secondary-300" },
  in_progress: { label: "In progress", dot: "bg-secondary-500" },
  completed: { label: "Completed", dot: "bg-success-500" },
  expired: { label: "Expired", dot: "bg-danger-500" },
  cancelled: { label: "Cancelled", dot: "bg-ink-300" },
};

export function TestsPanel({ tests, loading }: { tests?: TestInvitationSummary[]; loading: boolean }) {
  const router = useRouter();
  const [rows, setRows] = React.useState<TestInvitationSummary[] | undefined>(tests);
  const [reminded, setReminded] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- local copy so reminders and resends update in place
    setRows(tests);
  }, [tests]);

  const pending = rows?.filter((t) => ["sent", "opened", "in_progress"].includes(t.status)).length ?? 0;
  const ready = rows?.filter((t) => t.status === "completed").length ?? 0;

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Psychometric tests"
        description={loading || !rows ? "Loading…" : `${pending} awaiting completion · ${ready} results ready`}
        actions={<PanelLink href="/assessments">All tests</PanelLink>}
      />
      {loading || !rows ? (
        <PanelSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="No tests sent yet"
          description="Send psychometric tests to shortlisted candidates and track completion here."
          action={
            <Button size="sm" variant="secondary" onClick={() => router.push("/assessments")}>
              Send tests
            </Button>
          }
          className="py-8"
        />
      ) : (
        <ul className="border-t border-line">
          {rows.map((t) => {
            const st = TEST_STATUS[t.status];
            const overdueSoon = ["sent", "opened", "in_progress"].includes(t.status) && new Date(t.deadline).getTime() - NOW.getTime() < 2 * 86400000;
            return (
              <li key={t.id} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
                <Avatar name={t.candidateName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{t.candidateName}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
                    <span className="inline-flex items-center gap-1">
                      <span className={cn("size-1.5 rounded-full", st.dot)} aria-hidden />
                      {st.label}
                    </span>
                    <span className="tabular">
                      {t.completed} of {t.total} {t.total === 1 ? "test" : "tests"}
                    </span>
                    <span className={cn(overdueSoon && "font-semibold text-warning-700")}>
                      {t.status === "expired" ? `Expired ${rel(t.deadline)}` : t.status === "completed" ? t.vacancyTitle : `Due ${rel(t.deadline)}`}
                    </span>
                  </p>
                </div>
                {t.status === "completed" ? (
                  <Button size="sm" variant="soft" onClick={() => router.push(`/assessments/results/${t.id}`)}>
                    View results
                  </Button>
                ) : t.status === "expired" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        const r = await services.assessments.resend(t.id, deadlineIn(5));
                        setRows((rs) => rs?.map((x) => (x.id === t.id ? { ...x, status: "sent", sentAt: r.sentAt, deadline: r.deadline } : x)));
                        toast.success("New test link sent", `${t.candidateName} · due in 5 days`);
                      } catch (e) {
                        toast.error("Not sent", e instanceof Error ? e.message : undefined);
                      }
                    }}
                  >
                    Resend
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={reminded.has(t.id)}
                    onClick={async () => {
                      try {
                        const r = await services.assessments.remind([t.id]);
                        if (!r.reminded) return toast.error("Reminder not sent", r.skipped[0]?.reason);
                        setReminded((s) => new Set(s).add(t.id));
                        toast.success("Reminder sent", t.candidateName);
                      } catch (e) {
                        toast.error("Reminder not sent", e instanceof Error ? e.message : undefined);
                      }
                    }}
                  >
                    {reminded.has(t.id) ? "Reminded" : "Remind"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Recent applications ---------- */

export function ApplicationsPanel({ applications, loading }: { applications?: RecentApplication[]; loading: boolean }) {
  return (
    <Card className="flex flex-col">
      <CardHeader title="Recent applications" description="Newest first, with Vettly's initial match" actions={<PanelLink href="/candidates">All candidates</PanelLink>} />
      {loading || !applications ? (
        <PanelSkeleton rows={5} />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<UserPlus />}
          title="No applications yet"
          description="Share a vacancy link or upload CVs you received by email."
          className="py-8"
        />
      ) : (
        <ul className="border-t border-line">
          {applications.slice(0, 6).map((a) => (
            <li key={a.id}>
              <Link href={`/candidates/${a.id}`} className="flex items-center gap-3 border-b border-line px-5 py-3 hover:bg-surface-muted">
                <Avatar name={a.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg">{a.name}</span>
                  <span className="block truncate text-xs text-fg-subtle">
                    {a.appliedFor} · {a.source} · {rel(a.appliedAt)}
                  </span>
                </span>
                <MatchScore score={a.matchScore} provenance={a.provenance} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Activity ---------- */

const ACTIVITY_ICON: Record<ActivityKind, { Icon: typeof Inbox; cls: string }> = {
  application: { Icon: Inbox, cls: "text-ink-600" },
  ai: { Icon: Sparkles, cls: "text-accent-600" },
  assessment: { Icon: ClipboardList, cls: "text-primary-700" },
  stage: { Icon: KanbanSquare, cls: "text-ink-600" },
  interview: { Icon: CalendarCheck, cls: "text-secondary-600" },
  offer: { Icon: FileSignature, cls: "text-success-700" },
  vacancy: { Icon: Briefcase, cls: "text-ink-600" },
};

export function ActivityPanel({ events, loading }: { events?: ActivityEvent[]; loading: boolean }) {
  return (
    <Card className="flex flex-col">
      <CardHeader title="Recruitment activity" description="The latest six. The audit log has everything." actions={<PanelLink href="/settings/audit">Audit log</PanelLink>} />
      {loading || !events ? (
        <PanelSkeleton rows={6} />
      ) : events.length === 0 ? (
        <EmptyState icon={<FileStack />} title="No activity yet" description="Applications, stage moves, tests and offers will be listed here as they happen." className="py-8" />
      ) : (
        <ol className="border-t border-line px-5 py-4">
          {events.slice(0, 6).map((e, i) => {
            const { Icon, cls } = ACTIVITY_ICON[e.kind];
            return (
              <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < Math.min(events.length, 6) - 1 && <span className="absolute top-7 left-3.5 h-[calc(100%-1.75rem)] w-px bg-line" aria-hidden />}
                <span className={cn("relative grid size-7 shrink-0 place-items-center rounded-full border border-line bg-surface", cls)}>
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm text-fg">
                    <span className="font-semibold">{e.actor}</span> {e.text}
                  </p>
                  <p className="text-xs text-fg-subtle">
                    {e.context} · {rel(e.at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

