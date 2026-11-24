"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightLeft, PenLine, Sparkles, UsersRound } from "@/components/icons";
import { BulkAction, BulkBar, LoadError, Avatar, Button, Card, Checkbox, EmptyState, Pagination, Skeleton, Switch, Table, TableScroll, TBody, TD, TH, THead, TR, Tooltip, usePagination } from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { IllustrativeNotice, MatchScore, ProvenanceTag } from "@/components/domain/assessment";
import { StageBadge } from "@/components/domain/status-badge";
import { services, type VacancyMatchSummary } from "@/services";
import type { CandidateAssessment, Vacancy } from "@/types";
import { cn, ordinal } from "@/lib/utils";
import { CATEGORY_LABEL, OutcomeDots, essentials } from "./match-meta";

const MAX_COMPARE = 3;

export function MatchingOverview() {
  const router = useRouter();
  const params = useSearchParams();
  const [summaries, setSummaries] = React.useState<VacancyMatchSummary[] | null>(null);
  const [data, setData] = React.useState<{ vacancy: Vacancy; assessments: CandidateAssessment[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [withTests, setWithTests] = React.useState(false);
  const [picked, setPicked] = React.useState<string[]>([]);

  const vacancyId = params.get("vacancy") ?? summaries?.[0]?.vacancy.id ?? null;

  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    services.matching
      .vacancies()
      .then(setSummaries)
      .catch((e: Error) => setError(e.message));
  }, [attempt]);

  React.useEffect(() => {
    if (!vacancyId) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the previous vacancy while the next loads
    setData(null);
    setPicked([]);
    services.matching
      .rank(vacancyId)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [vacancyId]);

  const rows = React.useMemo(() => {
    if (!data) return [];
    const value = (a: CandidateAssessment) => (withTests ? (a.scoreWithTests ?? a.score) : a.score);
    return [...data.assessments].sort((a, b) => value(b) - value(a) || a.candidateName.localeCompare(b.candidateName));
  }, [data, withTests]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_COMPARE ? p : [...p, id]));

  return (
    <PageContainer
      header={
        <PageHeader
          title="Screening"
          description="Vettly checks every CV against the vacancy's requirements and shows the evidence it found. Scores are suggestions until someone in HR confirms them."
          meta={<IllustrativeNotice>Scores come from fixed matching rules · no AI model is used</IllustrativeNotice>}
        />
      }
    >
      {error ? (
        <LoadError title="Screening didn't load" onRetry={() => (setError(null), setAttempt((a) => a + 1))}>
          {error}
        </LoadError>
      ) : !summaries ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-10 w-full max-w-xl rounded-full" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : summaries.length === 0 ? (
        <Card>
          <EmptyState icon={<UsersRound />} title="Nothing to match yet" description="Once candidates apply or you upload CVs for a vacancy, Vettly assesses them here." />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <nav aria-label="Vacancies" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex gap-2">
              {summaries.map((s) => {
                const active = s.vacancy.id === vacancyId;
                return (
                  <li key={s.vacancy.id}>
                    <button
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => router.replace(`/matching?vacancy=${s.vacancy.id}`, { scroll: false })}
                      className={cn(
                        "pressable flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                        active ? "border-primary-600 bg-primary-600 text-white" : "border-line-strong bg-surface text-fg-muted hover:border-ink-400 hover:text-fg",
                      )}
                    >
                      {s.vacancy.title}
                      <span className={cn("text-xs tabular", active ? "text-white/75" : "text-fg-subtle")}>{s.assessed}</span>
                      {s.toReview > 0 && (
                        <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", active ? "text-accent-100" : "text-accent-700")}>
                          <span className={cn("size-1.5 rounded-full", active ? "bg-accent-300" : "bg-accent-500")} aria-hidden />
                          {s.toReview} to review
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {!data ? (
            <Skeleton className="h-96 rounded-lg" />
          ) : (
            <>
              <VacancyContext vacancy={data.vacancy} assessments={data.assessments} withTests={withTests} onWithTests={setWithTests} />
              <Card className="overflow-hidden">
                <RankingList rows={rows} vacancy={data.vacancy} withTests={withTests} picked={picked} onToggle={toggle} />
              </Card>
            </>
          )}
        </div>
      )}

      {data && picked.length > 0 && (
        <BulkBar label={`${picked.length} of ${MAX_COMPARE} picked`} onClear={() => setPicked([])} clearLabel="Clear picked candidates">
          <BulkAction primary disabled={picked.length < 2} asChild={picked.length >= 2}>
            {picked.length >= 2 ? (
              <Link href={`/matching/${data.vacancy.id}/compare?c=${picked.join(",")}`}>
                <ArrowRightLeft />
                Compare
              </Link>
            ) : (
              <span>
                <ArrowRightLeft />
                Pick one more
              </span>
            )}
          </BulkAction>
        </BulkBar>
      )}
    </PageContainer>
  );
}

function VacancyContext({
  vacancy,
  assessments,
  withTests,
  onWithTests,
}: {
  vacancy: Vacancy;
  assessments: CandidateAssessment[];
  withTests: boolean;
  onWithTests: (v: boolean) => void;
}) {
  const ess = vacancy.requirements.filter((r) => r.priority === "essential").length;
  const tested = assessments.filter((a) => a.testScore !== null).length;
  const weights = (Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).filter((k) => vacancy.weights[k] > 0);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="min-w-0">
        <p className="text-sm text-fg-muted">
          <span className="font-semibold text-fg">{vacancy.requirements.length} requirements</span>
          {`, ${ess} essential. Scored with this vacancy's weights:`}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-muted">
          {weights.map((k) => (
            <span key={k} className={cn("inline-flex items-center gap-1.5", k === "assessments" && !withTests && "text-fg-subtle line-through decoration-ink-300")}>
              <span className="font-semibold text-fg tabular">{vacancy.weights[k]}%</span>
              {CATEGORY_LABEL[k]}
            </span>
          ))}
          <Link href={`/vacancies/${vacancy.id}/edit`} className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline">
            <PenLine className="size-3.5" />
            Edit
          </Link>
        </div>
      </div>
      <label className="flex items-start gap-3 rounded-lg bg-surface px-4 py-3 shadow-platter lg:max-w-sm">
        <Switch checked={withTests} onCheckedChange={onWithTests} disabled={tested === 0} className="mt-0.5" />
        <span className="text-sm">
          <span className="block font-semibold text-fg">Include psychometric results</span>
          <span className="block text-xs text-fg-subtle">
            {tested === 0
              ? "No candidate has finished their tests yet."
              : `A separate input from CV evidence, worth ${vacancy.weights.assessments}%. ${tested} of ${assessments.length} have results.`}
          </span>
        </span>
      </label>
    </div>
  );
}

function RankingList({
  rows,
  vacancy,
  withTests,
  picked,
  onToggle,
}: {
  rows: CandidateAssessment[];
  vacancy: Vacancy;
  withTests: boolean;
  picked: string[];
  onToggle: (id: string) => void;
}) {
  const href = (a: CandidateAssessment) => `/matching/${vacancy.id}/${a.candidateId}`;
  const full = picked.length >= MAX_COMPARE;
  const shown = (a: CandidateAssessment) => (withTests && a.scoreWithTests !== null ? a.scoreWithTests : a.score);
  const missing = (a: CandidateAssessment) => a.requirements.filter((r) => r.outcome === "missing").length;
  const pager = usePagination(rows, { resetKey: String(withTests) });
  const top = React.useRef<HTMLDivElement>(null);
  const offset = (pager.page - 1) * pager.pageSize;

  return (
    <div ref={top} className="scroll-mt-16">
      <ol className="md:hidden" start={offset + 1}>
        {pager.items.map((a, i) => {
          const e = essentials(a.requirements);
          return (
            <li key={a.candidateId} className="flex items-start gap-3 border-b border-line px-4 py-3.5 last:border-b-0">
              <span className="w-6 pt-1.5 text-right text-xs font-semibold text-fg-subtle tabular">{offset + i + 1}</span>
              <Link href={href(a)} className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-fg">{a.candidateName}</span>
                  <MatchScore score={shown(a)} provenance={a.provenance} size="sm" />
                </span>
                <span className="mt-0.5 block truncate text-xs text-fg-subtle">{a.headline}</span>
                <span className="mt-2 flex flex-wrap items-center gap-2">
                  <OutcomeDots items={a.requirements} />
                  <span className="text-xs text-fg-muted">
                    {e.met}/{e.total} essential
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <TableScroll className="hidden md:block">
        <Table>
          <THead sticky>
            <TR>
              <TH className="w-10 pr-0">
                <span className="sr-only">Pick to compare</span>
              </TH>
              <TH className="w-10 text-right">#</TH>
              <TH>Candidate</TH>
              <TH>{withTests ? "Match incl. tests" : "Match"}</TH>
              <TH>Requirements</TH>
              <TH>Gaps</TH>
              {withTests && <TH>Tests</TH>}
              <TH>Stage</TH>
              <TH className="w-24">
                <span className="sr-only">Review</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {pager.items.map((a, i) => {
              const e = essentials(a.requirements);
              const on = picked.includes(a.candidateId);
              const gaps = missing(a);
              return (
                <TR key={a.candidateId} className={cn(on && "bg-primary-50/50")}>
                  <TD className="pr-0">
                    <Tooltip content={!on && full ? `Compare up to ${MAX_COMPARE} at a time` : on ? "Remove from comparison" : "Pick to compare"}>
                      <span>
                        <Checkbox
                          aria-label={`Compare ${a.candidateName}`}
                          checked={on}
                          disabled={!on && full}
                          onCheckedChange={() => onToggle(a.candidateId)}
                        />
                      </span>
                    </Tooltip>
                  </TD>
                  <TD className="text-right text-xs font-semibold text-fg-subtle tabular">{offset + i + 1}</TD>
                  <TD>
                    <Link href={href(a)} className="flex items-center gap-3">
                      <Avatar name={a.candidateName} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-fg hover:underline">{a.candidateName}</span>
                        <span className="block truncate text-xs text-fg-subtle">{a.headline}</span>
                      </span>
                    </Link>
                  </TD>
                  <TD>
                    <div className="flex flex-col gap-1">
                      <MatchScore score={shown(a)} provenance={a.provenance} size="sm" />
                      <ProvenanceTag provenance={a.provenance} compact />
                    </div>
                  </TD>
                  <TD>
                    <div className="flex flex-col gap-1.5">
                      <OutcomeDots items={a.requirements} />
                      <span className="text-xs text-fg-muted">
                        {e.met} of {e.total} essential met
                      </span>
                    </div>
                  </TD>
                  <TD className="text-xs whitespace-nowrap">
                    {gaps > 0 ? (
                      <span className="font-medium text-accent-700">{gaps} with no evidence</span>
                    ) : (
                      <span className="text-fg-subtle">None</span>
                    )}
                  </TD>
                  {withTests && (
                    <TD className="text-xs whitespace-nowrap tabular">
                      {a.testScore !== null ? (
                        <span className="font-semibold text-fg">{ordinal(a.testScore)} percentile</span>
                      ) : (
                        <span className="text-fg-subtle">No results yet</span>
                      )}
                    </TD>
                  )}
                  <TD>
                    <StageBadge stage={a.stage} size="sm" />
                  </TD>
                  <TD className="text-right">
                    <Button size="sm" variant={a.provenance === "ai_illustrative" ? "secondary" : "ghost"} asChild>
                      <Link href={href(a)}>
                        {a.provenance === "ai_illustrative" ? (
                          <>
                            <Sparkles />
                            Review
                          </>
                        ) : (
                          "Open"
                        )}
                      </Link>
                    </Button>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </TableScroll>
      <div className="border-t border-line px-4 py-2.5">
        <Pagination p={pager} noun={["candidate", "candidates"]} anchor={top} />
      </div>
    </div>
  );
}
