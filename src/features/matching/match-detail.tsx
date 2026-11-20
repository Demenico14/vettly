"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, RefreshCw, Sparkles, UserRound } from "@/components/icons";
import { Alert, Avatar, Button, Card, CardHeader, Skeleton, Tag, toast, Tooltip } from "@/components/ui";
import { PageContainer, PageTitle } from "@/components/layout/page-header";
import { IllustrativeNotice, ProvenanceTag } from "@/components/domain/assessment";
import { StageBadge } from "@/components/domain/status-badge";
import { services, MOCK_NOW } from "@/services";
import type { CandidateAssessment, CandidateProfile, Evidence, Vacancy } from "@/types";
import { cn, ordinal, timeAgo } from "@/lib/utils";
import { CATEGORY_LABEL, essentials } from "./match-meta";
import { RequirementRow } from "./requirement-row";
import { EvidenceViewer } from "./evidence-viewer";

const NOW = new Date(MOCK_NOW);
type Loaded = { vacancy: Vacancy; assessment: CandidateAssessment; rank: number; total: number; prev: string | null; next: string | null };

function band(score: number) {
  if (score >= 80) return { label: "Strong match", text: "text-success-700" };
  if (score >= 60) return { label: "Partial match", text: "text-secondary-700" };
  if (score >= 40) return { label: "Weak match", text: "text-warning-700" };
  return { label: "Low match", text: "text-danger-700" };
}

export function MatchDetail({ vacancyId, candidateId }: { vacancyId: string; candidateId: string }) {
  const [data, setData] = React.useState<Loaded | null>(null);
  const [profile, setProfile] = React.useState<CandidateProfile | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [evidence, setEvidence] = React.useState<Evidence | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before refetching
    setError(null);
    services.matching
      .get(vacancyId, candidateId)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    services.profiles.get(candidateId).then((p) => alive && setProfile(p), () => undefined);
    return () => {
      alive = false;
    };
  }, [vacancyId, candidateId, reload]);

  if (error)
    return (
      <PageContainer>
        <BackLink vacancyId={vacancyId} title="Matching" />
        <Alert
          tone="danger"
          title="Assessment not available"
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
  if (!data)
    return (
      <PageContainer>
        <div className="flex flex-col gap-4 pt-6" aria-busy="true">
          <Skeleton className="h-8 w-72" />
          <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Skeleton className="h-56 rounded-lg" />
            <Skeleton className="h-56 rounded-lg lg:col-span-2" />
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </PageContainer>
    );

  const { vacancy, assessment: a } = data;
  const locked = a.provenance !== "ai_illustrative";
  const reviewed = a.requirements.filter((r) => r.review).length;
  const set = (next: CandidateAssessment) => setData((d) => (d ? { ...d, assessment: next } : d));
  const act = async (fn: () => Promise<CandidateAssessment>, ok?: string) => {
    try {
      set(await fn());
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error("Not saved", e instanceof Error ? e.message : undefined);
    }
  };
  const confirm = async () => {
    setBusy(true);
    try {
      const next = await services.matching.confirm(vacancy.id, a.candidateId);
      set(next);
      toast.withUndo(
        "Assessment confirmed",
        () => act(() => services.matching.reopen(vacancy.id, a.candidateId), "Assessment reopened"),
        `${a.candidateName} · ${next.score}%`,
      );
    } finally {
      setBusy(false);
    }
  };
  const b = band(a.score);
  const ess = essentials(a.requirements);
  const groups = (["essential", "desirable"] as const).map((p) => ({ p, items: a.requirements.filter((r) => r.requirement.priority === p) }));

  return (
    <PageContainer
      header={
        <div>
          <BackLink vacancyId={vacancy.id} title={`Matching · ${vacancy.title}`} />
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar name={a.candidateName} size="lg" />
              <div className="min-w-0">
                <PageTitle>{a.candidateName}</PageTitle>
                <p className="mt-1.5 text-md text-fg-muted">
                  {a.headline} · {a.location}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <StageBadge stage={a.stage} size="sm" />
                  <span className="text-xs text-fg-subtle">
                    Ranked {data.rank} of {data.total} for {vacancy.title}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="secondary" asChild>
                <Link href={`/candidates/${a.candidateId}`}>
                  <UserRound />
                  Profile
                </Link>
              </Button>
              <div className="flex">
                <PrevNext vacancyId={vacancy.id} id={data.prev} dir="prev" />
                <PrevNext vacancyId={vacancy.id} id={data.next} dir="next" />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          {/* Score and sign-off */}
          <Card className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-fg">Match</p>
              <ProvenanceTag provenance={a.provenance} compact />
            </div>
            <p className={cn("mt-3 flex items-baseline gap-1 font-bold tracking-[-0.03em] tabular", b.text)}>
              <span className="text-[3.25rem] leading-none">{a.score}</span>
              <span className="text-lg text-fg-subtle">%</span>
            </p>
            <p className="mt-1 text-sm font-medium text-fg">{b.label}</p>
            <p className="mt-0.5 text-xs text-fg-subtle">
              {ess.met} of {ess.total} essential requirements met
              {a.score !== a.aiScore && ` · Vettly suggested ${a.aiScore}%`}
            </p>
            {a.testScore !== null && (
              <p className="mt-3 rounded-md bg-ink-50 px-3 py-2 text-xs text-fg-muted">
                With psychometric results ({vacancy.weights.assessments}%): <span className="font-semibold text-fg tabular">{a.scoreWithTests}%</span>
                <br />
                Test average: {ordinal(a.testScore)} percentile
              </p>
            )}
            <div className="mt-auto pt-5">
              {locked ? (
                <div className="flex flex-col gap-2">
                  <p className="flex items-start gap-1.5 text-xs text-success-700">
                    <BadgeCheck className="mt-px size-3.5 shrink-0" aria-hidden />
                    <span>
                      Confirmed by {a.confirmedBy} {a.confirmedAt ? timeAgo(a.confirmedAt, NOW) : ""}
                    </span>
                  </p>
                  <Button size="sm" variant="ghost" className="self-start" onClick={() => act(() => services.matching.reopen(vacancy.id, a.candidateId), "Assessment reopened")}>
                    Reopen to review
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button onClick={confirm} loading={busy} className="w-full">
                    <BadgeCheck />
                    Confirm assessment
                  </Button>
                  <p className="text-xs text-fg-subtle">
                    {reviewed} of {a.requirements.length} requirements reviewed. The rest are recorded as agreed when you confirm.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Explanation and breakdown */}
          <Card className="grid grid-cols-1 gap-6 p-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-8 sm:p-6">
            <section>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Sparkles className="size-4 text-accent-600" aria-hidden />
                Why this score
              </h2>
              <p className="mt-2 text-md leading-relaxed text-pretty text-fg-muted">{a.explanation}</p>
              <p className="mt-3 text-2xs font-semibold text-accent-700">AI explanation · illustrative · check it against the evidence below</p>
            </section>
            <section aria-labelledby="breakdown-h">
              <h2 id="breakdown-h" className="text-sm font-semibold text-fg">
                How it adds up
              </h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {a.breakdown
                  .filter((c) => c.weight > 0)
                  .map((c) => {
                    const excluded = c.category === "assessments";
                    return (
                      <li key={c.category} className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-x-3 gap-y-1 text-xs">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={cn("font-medium text-fg", excluded && "text-fg-subtle")}>{CATEGORY_LABEL[c.category]}</span>
                          <span className="text-fg-subtle tabular">{c.weight}% weight</span>
                        </span>
                        <span className={cn("text-right font-semibold tabular", c.score === null || excluded ? "text-fg-subtle" : "text-fg")}>
                          {c.score === null ? "–" : `${c.score}`}
                        </span>
                        <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-ink-100" aria-hidden>
                          <span className={cn("block h-full rounded-full", excluded ? "bg-ink-300" : "bg-primary-500")} style={{ width: `${c.score ?? 0}%` }} />
                        </span>
                      </li>
                    );
                  })}
              </ul>
              <p className="mt-3 text-2xs text-fg-subtle">
                Psychometric results are kept out of the CV match. Turn them on in the ranking to include them.
              </p>
            </section>
          </Card>
        </div>

        <IllustrativeNotice className="self-start">Matched by fixed rules from the CV · check the evidence before you rely on it</IllustrativeNotice>

        {groups.map(
          (g) =>
            g.items.length > 0 && (
              <Card key={g.p} className="overflow-hidden">
                <CardHeader
                  title={g.p === "essential" ? "Essential requirements" : "Desirable requirements"}
                  description={g.p === "essential" ? "Count twice as much towards the score." : "Strengthen a candidate, but nobody is ruled out for missing them."}
                />
                <ul className="border-t border-line">
                  {g.items.map((r) => (
                    <RequirementRow
                      key={r.requirement.id}
                      r={r}
                      locked={locked}
                      onShowEvidence={setEvidence}
                      onAgree={() => act(() => services.matching.agree(vacancy.id, a.candidateId, r.requirement.id))}
                      onChange={(o, reason) => act(() => services.matching.change(vacancy.id, a.candidateId, r.requirement.id, o, reason), "Outcome changed")}
                      onUndo={() => act(() => services.matching.undo(vacancy.id, a.candidateId, r.requirement.id))}
                    />
                  ))}
                </ul>
              </Card>
            ),
        )}

        <Card>
          <CardHeader title="Skills" description="Skills the vacancy asks for, against what the CV shows." />
          <div className="grid grid-cols-1 gap-5 px-5 pb-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {(
              [
                ["Shown", a.skills.matched, "bg-primary-50 text-primary-800"],
                ["Partly shown", a.skills.partial, "bg-secondary-50 text-secondary-800"],
                ["Not found", a.skills.missing, "border border-dashed border-ink-400 text-fg-muted"],
                ["Also on the CV", a.skills.extra, "bg-ink-100 text-ink-700"],
              ] as const
            ).map(([label, list, cls]) => (
              <div key={label}>
                <p className="text-xs font-semibold text-fg-subtle">
                  {label} <span className="tabular">({list.length})</span>
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {list.length === 0 && <li className="text-xs text-fg-subtle">None</li>}
                  {list.map((s) => (
                    <li key={s}>
                      <Tag className={cn("h-auto py-1 text-left whitespace-normal", cls)}>{s}</Tag>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <EvidenceViewer profile={profile} evidence={evidence} onClose={() => setEvidence(null)} />
    </PageContainer>
  );
}

function PrevNext({ vacancyId, id, dir }: { vacancyId: string; id: string | null; dir: "prev" | "next" }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const label = dir === "prev" ? "Higher-ranked candidate" : "Next candidate down";
  const cls = cn("rounded-none", dir === "prev" ? "rounded-l-md" : "-ml-px rounded-r-md");
  if (!id)
    return (
      <Button variant="secondary" size="icon" disabled aria-label={label} className={cls}>
        <Icon />
      </Button>
    );
  return (
    <Tooltip content={label}>
      <Button variant="secondary" size="icon" asChild className={cls}>
        <Link href={`/matching/${vacancyId}/${id}`} aria-label={label}>
          <Icon />
        </Link>
      </Button>
    </Tooltip>
  );
}

function BackLink({ vacancyId, title }: { vacancyId: string; title: string }) {
  return (
    <Link href={`/matching?vacancy=${vacancyId}`} className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
      <ArrowLeft className="size-4" />
      {title}
    </Link>
  );
}
