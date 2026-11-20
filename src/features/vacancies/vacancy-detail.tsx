"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CircleAlert,
  ClipboardList,

  MoreHorizontal,
  Pencil,
  RefreshCw,
  Sparkles,
  Users,
  UsersRound,
} from "@/components/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Skeleton,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tag,
} from "@/components/ui";
import { StageBadge, VacancyStatusBadge, VACANCY_META } from "@/components/domain/status-badge";
import { MatchScore } from "@/components/domain/assessment";
import { PageContainer } from "@/components/layout/page-header";
import { services, STATUS_MOVES, MOCK_NOW } from "@/services";
import { CHANNELS } from "@/mocks/vacancies";
import { TEST_BATTERIES } from "@/mocks/auth";
import type { CandidateSummary, Requirement, Vacancy, VacancyStatus } from "@/types";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { StatusDialog, VacancyActionsMenu, moveLabel } from "./status-actions";
import { REQUIREMENT_KIND, WEIGHT_LABELS } from "./vacancy-meta";

const NOW = new Date(MOCK_NOW);
const money = (n: number, c: string) => `${c} ${new Intl.NumberFormat("en-GB").format(n).replace(/,/g, " ")}`;

export function VacancyDetail({ id }: { id: string }) {
  const [v, setV] = React.useState<Vacancy | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [move, setMove] = React.useState<VacancyStatus | null>(null);
  const [cands, setCands] = React.useState<CandidateSummary[] | null>(null);

  React.useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before refetching
    setError(null);
    services.vacancies
      .get(id)
      .then((r) => alive && setV(r))
      .catch((e: Error) => alive && setError(e.message));
    services.vacancies
      .candidatesFor(id)
      .then((r) => alive && setCands(r))
      .catch(() => alive && setCands([]));
    return () => {
      alive = false;
    };
  }, [id, reload]);

  if (error) {
    return (
      <PageContainer>
        <BackLink />
        <Alert
          tone="danger"
          title="Vacancy not available"
          className="mt-4"
          action={
            <Button size="sm" variant="secondary" onClick={() => setReload((r) => r + 1)}>
              <RefreshCw />
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
      </PageContainer>
    );
  }

  if (!v) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-4 pt-6" aria-busy="true">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-4 w-64" />
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Skeleton className="h-96 rounded-lg" />
            <Skeleton className="h-96 rounded-lg" />
          </div>
        </div>
      </PageContainer>
    );
  }

  const primary = STATUS_MOVES[v.status][0];
  const essentialCount = v.requirements.filter((r) => r.priority === "essential").length;
  const essential = v.requirements.filter((r) => r.priority === "essential");
  const desirable = v.requirements.filter((r) => r.priority === "desirable");
  const missing = [
    !v.summary && "a summary",
    v.responsibilities.length === 0 && "responsibilities",
    essentialCount === 0 && "an essential requirement",
    !v.closesAt && "a closing date",
    !v.department && "a department",
    !v.location && "a location",
    !v.hiringManager && "a hiring manager",
    v.channels.length === 0 && "a publishing channel",
  ].filter(Boolean) as string[];
  const incomplete = missing.length > 0;

  return (
    <PageContainer
      header={
        <div>
          <BackLink />
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[1.75rem] leading-[1.1] font-bold tracking-[-0.02em] text-fg sm:text-[2.125rem]">{v.title}</h1>
                <VacancyStatusBadge status={v.status} />
              </div>
              <p className="mt-2 text-[0.9375rem] text-fg-muted">
                {[v.reference, v.department, v.location, v.workMode].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {v.status === "open" && (
                <Button variant="secondary" asChild>
                  <Link href={`/talent?vacancy=${v.id}`}>
                    <UsersRound />
                    Find talent
                  </Link>
                </Button>
              )}
              {v.status !== "filled" && (
                <Button variant="secondary" asChild>
                  <Link href={`/vacancies/${v.id}/edit`}>
                    <Pencil />
                    Edit
                  </Link>
                </Button>
              )}
              {primary && (v.status === "draft" && incomplete ? (
                <Button asChild>
                  <Link href={`/vacancies/${v.id}/edit`}>Finish and publish</Link>
                </Button>
              ) : (
                <Button variant={primary === "closed" ? "danger" : "primary"} onClick={() => setMove(primary)}>
                  {moveLabel(v.status, primary)}
                </Button>
              ))}
              <VacancyActionsMenu
                vacancy={v}
                onMove={(to) => (to === "open" && v.status === "draft" && incomplete ? (window.location.href = `/vacancies/${v.id}/edit`) : setMove(to))}
                onDuplicated={() => undefined}
                onDeleted={() => (window.location.href = "/vacancies")}
                trigger={
                  <Button variant="ghost" size="icon" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {v.status === "draft" && (
          <Alert
            tone={incomplete ? "warning" : "info"}
            title={incomplete ? "This draft isn't ready to publish" : "This vacancy is a draft"}
            action={
              incomplete ? (
                <Button size="sm" variant="secondary" asChild>
                  <Link href={`/vacancies/${v.id}/edit`}>Continue editing</Link>
                </Button>
              ) : undefined
            }
          >
            {incomplete
              ? `Still needed: ${missing.slice(0, -1).join(", ")}${missing.length > 1 ? " and " : ""}${missing[missing.length - 1]}.`
              : "Publish it to start receiving applications."}
          </Alert>
        )}

        <section aria-label="Pipeline" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Applicants", value: v.applicants, sub: v.newApplicants ? `+${v.newApplicants} new` : "No new today" },
            { label: "Shortlisted", value: v.shortlisted, sub: v.applicants ? `${Math.round((v.shortlisted / v.applicants) * 100)}% of applicants` : "—" },
            { label: "Interviewing", value: v.interviewing, sub: `${v.openings} ${v.openings === 1 ? "opening" : "openings"}` },
            {
              label: "Closes",
              value: v.closesAt ? formatDate(v.closesAt) : "Not set",
              sub: v.closesAt && v.status === "open" ? timeAgo(v.closesAt, NOW) : VACANCY_META[v.status].label,
            },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-[0.8125rem] font-medium text-fg-muted">{s.label}</p>
              <p className={cn("mt-1 font-bold tracking-[-0.01em] text-fg tabular", typeof s.value === "number" ? "text-2xl" : "text-lg")}>{s.value}</p>
              <p className="text-xs text-fg-subtle">{s.sub}</p>
            </Card>
          ))}
        </section>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="candidates" count={cands?.length}>
              Candidates
            </TabsTrigger>
            <TabsTrigger value="history" count={v.history.length}>
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
              <Card className="px-6 py-6 sm:px-8">
                <article className="max-w-[68ch]">
                  <h2 className="text-lg font-semibold text-fg">About the role</h2>
                  {v.summary ? (
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-fg-muted">{v.summary}</p>
                  ) : (
                    <p className="mt-2 text-sm text-fg-subtle italic">No summary yet.</p>
                  )}

                  <h2 className="mt-8 text-lg font-semibold text-fg">What you&apos;ll do</h2>
                  {v.responsibilities.length ? (
                    <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[0.9375rem] leading-relaxed text-fg-muted marker:text-ink-400">
                      {v.responsibilities.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-fg-subtle italic">No responsibilities yet.</p>
                  )}

                  <h2 className="mt-8 text-lg font-semibold text-fg">Requirements</h2>
                  <p className="mt-1 text-xs text-fg-subtle">Vettly assesses every applicant against each of these, citing evidence from their CV and tests.</p>
                  <RequirementGroup title="Essential" items={essential} />
                  <RequirementGroup title="Desirable" items={desirable} />

                  {v.benefits.length > 0 && (
                    <>
                      <h2 className="mt-8 text-lg font-semibold text-fg">What we offer</h2>
                      <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[0.9375rem] leading-relaxed text-fg-muted marker:text-ink-400">
                        {v.benefits.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </article>
              </Card>

              <div className="flex flex-col gap-5">
                <Card>
                  <CardHeader title="Details" />
                  <dl className="px-5 pb-4 text-sm">
                    {[
                      ["Department", v.department || "Not set"],
                      ["Location", [v.location || "Not set", v.workMode].join(" · ")],
                      ["Type", `${v.employmentType} · ${v.openings} ${v.openings === 1 ? "opening" : "openings"}`],
                      [
                        "Salary",
                        v.salaryMin && v.salaryMax ? `${money(v.salaryMin, v.currency)}–${v.salaryMax.toLocaleString("en-GB").replace(/,/g, " ")} / month` : "Not set",
                      ],
                      ["Salary on advert", v.salaryVisible ? "Shown" : "Hidden"],
                      ["Opened", v.status === "draft" ? "Not yet" : formatDate(v.openedAt)],
                      ["Last updated", timeAgo(v.updatedAt, NOW)],
                    ].map(([k, val]) => (
                      <div key={k} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-b border-line py-2 last:border-b-0">
                        <dt className="text-fg-subtle">{k}</dt>
                        <dd className="text-fg">{val}</dd>
                      </div>
                    ))}
                    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2">
                      <dt className="text-fg-subtle">Hiring manager</dt>
                      <dd className="flex items-center gap-2 text-fg">
                        <Avatar name={v.hiringManager || "Unassigned"} size="xs" />
                        {v.hiringManager || "Unassigned"}
                      </dd>
                    </div>
                  </dl>
                </Card>

                <Card>
                  <CardHeader title="Screening weights" description="Share of the overall match score" />
                  <ul className="flex flex-col gap-3 px-5 pb-5">
                    {(Object.keys(WEIGHT_LABELS) as (keyof typeof WEIGHT_LABELS)[]).map((k) => (
                      <li key={k} className="grid grid-cols-[7.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
                        <span className="text-fg-muted">{WEIGHT_LABELS[k]}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-ink-100" aria-hidden>
                          <span className="block h-full rounded-full bg-primary-500" style={{ width: `${v.weights[k]}%` }} />
                        </span>
                        <span className="text-right font-semibold text-fg tabular">{v.weights[k]}%</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card>
                  <CardHeader title="Psychometric tests" />
                  <div className="px-5 pb-5 text-sm">
                    {v.assessment.battery ? (
                      <>
                        <p className="flex items-center gap-2 font-medium text-fg">
                          <ClipboardList className="size-4 text-warning-600" aria-hidden />
                          {TEST_BATTERIES.find((b) => b.value === v.assessment.battery)?.label}
                        </p>
                        <p className="mt-1 text-xs text-fg-subtle">{TEST_BATTERIES.find((b) => b.value === v.assessment.battery)?.description}</p>
                        <p className="mt-3 text-fg-muted">
                          {v.assessment.autoSendOnShortlist ? "Sent automatically when a candidate is shortlisted" : "Sent by a recruiter"} · due{" "}
                          {v.assessment.deadlineDays} days after sending
                        </p>
                      </>
                    ) : (
                      <p className="text-fg-subtle">No tests for this vacancy.</p>
                    )}
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Published on" />
                  <div className="flex flex-wrap gap-1.5 px-5 pb-5">
                    {v.channels.length ? (
                      v.channels.map((c) => <Tag key={c}>{CHANNELS.find((x) => x.id === c)?.label}</Tag>)
                    ) : (
                      <p className="text-sm text-fg-subtle">No channels chosen yet.</p>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="candidates">
            <Card className="overflow-hidden">
              {!cands ? (
                <div className="flex flex-col gap-3 p-5">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : cands.length === 0 ? (
                <EmptyState
                  icon={<Users />}
                  title={v.status === "draft" ? "No candidates until you publish" : "No candidates in this sample"}
                  description={
                    v.status === "draft"
                      ? "Applications appear here once the vacancy is live."
                      : `${v.applicants} applicants are counted for this vacancy; detailed records for them arrive with the candidate module.`
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[40rem]">
                    <THead>
                      <TR>
                        <TH>Candidate</TH>
                        <TH>Stage</TH>
                        <TH>Match</TH>
                        <TH>Applied</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {cands.map((c) => (
                        <TR key={c.id}>
                          <TD>
                            <span className="flex items-center gap-3">
                              <Avatar name={c.name} size="sm" />
                              <span>
                                <Link href={`/candidates/${c.id}`} className="block font-semibold hover:underline">
                                  {c.name}
                                </Link>
                                <span className="block text-xs text-fg-subtle">
                                  {c.headline} · {c.location}
                                </span>
                              </span>
                            </span>
                          </TD>
                          <TD>
                            <StageBadge stage={c.stage} size="sm" />
                          </TD>
                          <TD>
                            <MatchScore score={c.matchScore} provenance={c.provenance} size="sm" />
                          </TD>
                          <TD className="whitespace-nowrap text-fg-muted">{timeAgo(c.appliedAt, NOW)}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                  <p className="border-t border-line px-4 py-2.5 text-xs text-fg-subtle">
                    Showing {cands.length} sample records of {v.applicants} applicants. Full candidate management arrives in Module 5.
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="px-5 py-5">
              <ol>
                {[...v.history].reverse().map((h, i, arr) => (
                  <li key={`${h.status}-${h.at}`} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < arr.length - 1 && <span className="absolute top-7 left-3.5 h-[calc(100%-1.75rem)] w-px bg-line" aria-hidden />}
                    <span className="relative grid size-7 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-600">
                      {h.status === "open" ? <Sparkles className="size-3.5" /> : h.status === "filled" ? <BadgeCheck className="size-3.5" /> : <Briefcase className="size-3.5" />}
                    </span>
                    <div className="pt-0.5 text-sm">
                      <p className="text-fg">
                        <span className="font-semibold">{h.by}</span> {h.status === "draft" ? "created the draft" : h.status === "open" ? "published the vacancy" : `marked it ${VACANCY_META[h.status].label.toLowerCase()}`}
                      </p>
                      {h.reason && <p className="mt-0.5 text-fg-muted">“{h.reason}”</p>}
                      <p className="text-xs text-fg-subtle">
                        {formatDate(h.at)} · {timeAgo(h.at, NOW)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <StatusDialog vacancy={v} to={move} onClose={() => setMove(null)} onChanged={setV} />
    </PageContainer>
  );
}

function BackLink() {
  return (
    <Link href="/vacancies" className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
      <ArrowLeft className="size-4" />
      Vacancies
    </Link>
  );
}

function RequirementGroup({ title, items }: { title: string; items: Requirement[] }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-fg">
        {title} <span className="font-normal text-fg-subtle">({items.length})</span>
      </h3>
      {items.length ? (
        <ul className="mt-2 flex flex-col divide-y divide-line rounded-md border border-line">
          {items.map((r) => {
            const k = REQUIREMENT_KIND[r.kind];
            return (
              <li key={r.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                <k.Icon className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
                <span className="min-w-0 flex-1 text-fg">
                  {r.years ? `${r.years}+ years: ` : ""}
                  {r.text}
                </span>
                <span className="shrink-0 text-xs text-fg-subtle">{k.label}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-fg-subtle">
          <CircleAlert className="size-4" /> None added.
        </p>
      )}
    </div>
  );
}

