"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, X } from "@/components/icons";
import { Alert, Avatar, Button, Card, Skeleton, Tooltip } from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { MatchScore, ProvenanceTag } from "@/components/domain/assessment";
import { StageBadge } from "@/components/domain/status-badge";
import { services } from "@/services";
import type { CandidateAssessment, Vacancy } from "@/types";
import { cn, ordinal } from "@/lib/utils";
import { OutcomeChip, essentials } from "./match-meta";

export function MatchCompare({ vacancyId }: { vacancyId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const ids = React.useMemo(() => (params.get("c") ?? "").split(",").filter(Boolean).slice(0, 3), [params]);
  const [data, setData] = React.useState<{ vacancy: Vacancy; assessments: CandidateAssessment[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    services.matching
      .rank(vacancyId)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [vacancyId]);

  const back = (
    <Link href={`/matching?vacancy=${vacancyId}`} className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
      <ArrowLeft className="size-4" />
      Matching{data ? ` · ${data.vacancy.title}` : ""}
    </Link>
  );

  if (error)
    return (
      <PageContainer>
        {back}
        <Alert tone="danger" title="Comparison not available" className="mt-4">
          {error}
        </Alert>
      </PageContainer>
    );

  const cols = data ? ids.map((id) => data.assessments.find((a) => a.candidateId === id)).filter((a): a is CandidateAssessment => !!a) : [];
  const rankOf = (id: string) => (data ? data.assessments.findIndex((a) => a.candidateId === id) + 1 : 0);
  cols.sort((x, y) => rankOf(x.candidateId) - rankOf(y.candidateId));
  const remove = (id: string) => {
    const next = ids.filter((x) => x !== id);
    router.replace(next.length ? `/matching/${vacancyId}/compare?c=${next.join(",")}` : `/matching?vacancy=${vacancyId}`, { scroll: false });
  };
  const best = cols.length ? Math.max(...cols.map((c) => c.score)) : 0;
  const grid = { gridTemplateColumns: `minmax(var(--label-w),1.2fr) repeat(${Math.max(cols.length, 1)}, minmax(11.5rem,1fr))` };

  return (
    <PageContainer
      header={
        <div>
          {back}
          <PageHeader
            className="mt-4"
            title="Compare candidates"
            description="Each requirement side by side, with the evidence Vettly found. Pick who goes forward on the evidence, not the score alone."
          />
        </div>
      }
    >
      {!data ? (
        <Skeleton className="h-[32rem] rounded-lg" />
      ) : cols.length < 2 ? (
        <Alert tone="info" title="Pick at least two candidates" action={<Button size="sm" variant="secondary" asChild><Link href={`/matching?vacancy=${vacancyId}`}>Back to ranking</Link></Button>}>
          Tick candidates in the ranking, then choose Compare.
        </Alert>
      ) : (
        <Card className="overflow-x-auto">
          <div role="table" aria-label={`Comparison for ${data.vacancy.title}`} className="min-w-fit [--label-w:8.5rem] sm:[--label-w:13rem]">
            <div role="row" className="grid border-b border-line" style={grid}>
              <div role="columnheader" className="sticky left-0 z-10 bg-surface px-5 py-4 text-xs font-semibold text-fg-subtle">
                {data.vacancy.title}
              </div>
              {cols.map((a) => (
                <div key={a.candidateId} role="columnheader" className="border-l border-line px-5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/matching/${vacancyId}/${a.candidateId}`} className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={a.candidateName} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-fg hover:underline">{a.candidateName}</span>
                        <span className="block text-xs text-fg-subtle">Ranked {rankOf(a.candidateId)}</span>
                      </span>
                    </Link>
                    <Tooltip content="Remove from comparison">
                      <Button size="icon-sm" variant="ghost" aria-label={`Remove ${a.candidateName}`} onClick={() => remove(a.candidateId)}>
                        <X />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>

            <Row label="Match" grid={grid}>
              {cols.map((a) => (
                <Cell key={a.candidateId} highlight={a.score === best}>
                  <MatchScore score={a.score} provenance={a.provenance} />
                  <div className="mt-1.5">
                    <ProvenanceTag provenance={a.provenance} compact />
                  </div>
                </Cell>
              ))}
            </Row>
            <Row label="Essential requirements met" grid={grid}>
              {cols.map((a) => {
                const e = essentials(a.requirements);
                return (
                  <Cell key={a.candidateId} highlight={e.met === e.total}>
                    <span className="text-sm font-semibold text-fg tabular">
                      {e.met} of {e.total}
                    </span>
                  </Cell>
                );
              })}
            </Row>
            <Row label="Psychometric tests" hint="Separate from CV evidence" grid={grid}>
              {cols.map((a) => (
                <Cell key={a.candidateId}>
                  {a.testScore !== null ? <span className="text-sm text-fg tabular">{ordinal(a.testScore)} percentile</span> : <span className="text-sm text-fg-subtle">No results yet</span>}
                </Cell>
              ))}
            </Row>
            <Row label="Stage" grid={grid}>
              {cols.map((a) => (
                <Cell key={a.candidateId}>
                  <StageBadge stage={a.stage} size="sm" />
                </Cell>
              ))}
            </Row>

            {(["essential", "desirable"] as const).map((p) => (
              <React.Fragment key={p}>
                <div role="row" className="grid border-b border-line bg-ink-50" style={grid}>
                  <div role="rowheader" className="sticky left-0 bg-ink-50 px-5 py-2 text-xs font-semibold text-fg-muted">
                    {p === "essential" ? "Essential" : "Desirable"}
                  </div>
                  {cols.map((a) => (
                    <div key={a.candidateId} className="border-l border-line" />
                  ))}
                </div>
                {data.vacancy.requirements
                  .filter((r) => r.priority === p)
                  .map((req) => (
                    <Row key={req.id} label={req.text} grid={grid}>
                      {cols.map((a) => {
                        const r = a.requirements.find((x) => x.requirement.id === req.id)!;
                        const top = r.evidence[0];
                        return (
                          <Cell key={a.candidateId}>
                            <OutcomeChip outcome={r.outcome} />
                            {r.review?.action === "changed" && <span className="ml-1.5 text-2xs font-semibold text-secondary-700">HR changed</span>}
                            <p className="mt-1.5 line-clamp-3 text-xs text-fg-muted">{top ? `“${top.quote}”` : r.rationale}</p>
                          </Cell>
                        );
                      })}
                    </Row>
                  ))}
              </React.Fragment>
            ))}

            <Row label="Strongest evidence" grid={grid}>
              {cols.map((a) => (
                <Cell key={a.candidateId}>
                  <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-fg-muted marker:text-ink-300">
                    {a.strengths.slice(0, 3).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                    {a.strengths.length === 0 && <li className="list-none -ml-4 text-fg-subtle">Nothing with strong evidence</li>}
                  </ul>
                </Cell>
              ))}
            </Row>
            <div role="row" className="grid" style={grid}>
              <div role="rowheader" className="sticky left-0 bg-surface px-5 py-4" />
              {cols.map((a) => (
                <div key={a.candidateId} role="cell" className="border-l border-line px-5 py-4">
                  <Button size="sm" variant={a.provenance === "ai_illustrative" ? "primary" : "secondary"} asChild>
                    <Link href={`/matching/${vacancyId}/${a.candidateId}`}>{a.provenance === "ai_illustrative" ? "Review assessment" : "Open assessment"}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}

function Row({ label, hint, grid, children }: { label: string; hint?: string; grid: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div role="row" className="grid border-b border-line" style={grid}>
      <div role="rowheader" className="sticky left-0 z-10 bg-surface px-4 py-3.5 text-[0.8125rem] font-medium text-pretty text-fg sm:px-5 sm:text-sm">
        {label}
        {hint && <span className="mt-0.5 block text-xs font-normal text-fg-subtle">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Cell({ highlight, children }: { highlight?: boolean; children: React.ReactNode }) {
  return (
    <div role="cell" className={cn("border-l border-line px-5 py-3.5", highlight && "bg-primary-50/40")}>
      {children}
    </div>
  );
}
