"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRightLeft } from "@/components/icons";
import { Alert, Avatar, Card, Checkbox, EmptyState, Skeleton } from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { IllustrativeNotice } from "@/components/domain/assessment";
import { services, type InvitationView, type ScoredResult } from "@/services";
import type { Test } from "@/types/psychometrics";
import { BAND_LABEL } from "@/lib/psychometrics";
import { cn, ordinal } from "@/lib/utils";
import { PercentileBar } from "./meta";

const MAX = 4;
const QUESTIONNAIRE = ["personality", "integrity", "emotional_intelligence", "motivation"];

export function ResultsCompare() {
  const router = useRouter();
  const params = useSearchParams();
  const vacancyId = params.get("vacancy");
  const ids = React.useMemo(() => (params.get("i") ?? "").split(",").filter(Boolean), [params]);
  const [pool, setPool] = React.useState<InvitationView[] | null>(null);
  const [scored, setScored] = React.useState<Record<string, ScoredResult[]>>({});
  const [tests, setTests] = React.useState<Test[]>([]);

  React.useEffect(() => {
    services.assessments.library().then((l) => setTests(l.tests));
    services.assessments.invitations().then((all) => {
      const done = all.filter((v) => v.record.results.length > 0 && (!vacancyId || v.record.vacancyId === vacancyId));
      setPool(done);
      Promise.all(done.map((v) => services.assessments.invitation(v.record.id))).then((rs) => setScored(Object.fromEntries(rs.map((r) => [r.view.record.id, r.results]))));
    });
  }, [vacancyId]);

  const picked = (pool ?? []).filter((v) => ids.includes(v.record.id));
  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= MAX ? ids : [...ids, id];
    router.replace(`/assessments/compare?${vacancyId ? `vacancy=${vacancyId}&` : ""}i=${next.join(",")}`, { scroll: false });
  };
  const testIds = [...new Set(picked.flatMap((v) => (scored[v.record.id] ?? []).map((r) => r.testId)))];
  const testOf = (id: string) => tests.find((t) => t.id === id);
  const vacancyTitle = pool?.[0]?.record.vacancyTitle;
  const grid = { gridTemplateColumns: `minmax(var(--label-w),1.1fr) repeat(${Math.max(1, picked.length)}, minmax(10.5rem,1fr))` };

  return (
    <PageContainer
      header={
        <div>
          <Link href="/assessments" className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
            <ArrowLeft className="size-4" />
            Tests
          </Link>
          <PageHeader
            className="mt-4"
            title="Compare results"
            description={`Side by side on the same tests${vacancyTitle && vacancyId ? ` for ${vacancyTitle}` : ""}. Use it to plan interviews, not to rank people on scores alone.`}
            meta={<IllustrativeNotice>Sample tests · scores are not validated for hiring decisions</IllustrativeNotice>}
          />
        </div>
      }
    >
      {!pool ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : pool.length === 0 ? (
        <Card>
          <EmptyState icon={<ArrowRightLeft />} title="No results to compare yet" description="Results appear here once candidates finish their tests." />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-fg">Candidates with results ({pool.length})</p>
            <ul className="flex flex-wrap gap-2">
              {pool.map((v) => {
                const on = ids.includes(v.record.id);
                return (
                  <li key={v.record.id}>
                    <label className={cn("flex cursor-pointer items-center gap-2 rounded-full border py-1 pr-3 pl-2 text-sm", on ? "border-primary-500 bg-primary-50" : "border-line-strong bg-surface")}>
                      <Checkbox checked={on} disabled={!on && ids.length >= MAX} onCheckedChange={() => toggle(v.record.id)} aria-label={`Compare ${v.record.candidateName}`} />
                      {v.record.candidateName}
                      {!vacancyId && <span className="text-xs text-fg-subtle">· {v.record.vacancyTitle}</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          {picked.length < 2 ? (
            <Alert tone="info" title="Pick at least two candidates">
              Up to {MAX} at a time. Tests they didn&apos;t both take show as not taken.
            </Alert>
          ) : (
            <Card className="overflow-x-auto">
              <div role="table" className="min-w-fit [--label-w:9rem] sm:[--label-w:14rem]">
                <div role="row" className="grid border-b border-line" style={grid}>
                  <div role="columnheader" className="sticky left-0 z-10 bg-surface px-5 py-4 text-xs font-semibold text-fg-subtle">
                    Test
                  </div>
                  {picked.map((v) => (
                    <div key={v.record.id} role="columnheader" className="border-l border-line px-5 py-4">
                      <Link href={`/assessments/results/${v.record.id}`} className="flex items-center gap-2.5">
                        <Avatar name={v.record.candidateName} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-fg hover:underline">{v.record.candidateName}</span>
                          <span className="block text-xs text-fg-subtle">{v.record.review.reviewed ? "Reviewed" : "Not reviewed"}</span>
                        </span>
                      </Link>
                    </div>
                  ))}
                </div>
                {testIds.map((tid) => {
                  const t = testOf(tid);
                  if (!t) return null;
                  if (QUESTIONNAIRE.includes(t.family)) {
                    return (
                      <React.Fragment key={tid}>
                        <div role="row" className="grid border-b border-line bg-ink-50" style={grid}>
                          <div role="rowheader" className="sticky left-0 bg-ink-50 px-5 py-2 text-xs font-semibold text-fg-muted">
                            {t.name} · stens
                          </div>
                          {picked.map((v) => (
                            <div key={v.record.id} className="border-l border-line" />
                          ))}
                        </div>
                        {t.scales.map((sc) => {
                          const vals = picked.map((v) => scored[v.record.id]?.find((r) => r.testId === tid)?.scored.find((x) => x.scale === sc.code)?.sten);
                          if (vals.every((x) => x === undefined)) return null;
                          const spread = Math.max(...vals.filter((x): x is number => x !== undefined)) - Math.min(...vals.filter((x): x is number => x !== undefined));
                          return (
                            <div key={sc.code} role="row" className="grid border-b border-line" style={grid}>
                              <div role="rowheader" className="sticky left-0 z-10 bg-surface px-5 py-2 text-[0.8125rem] text-fg">
                                {sc.name}
                                {spread >= 4 && <span className="ml-1.5 text-2xs font-semibold text-accent-700">differs</span>}
                              </div>
                              {vals.map((st, i) => (
                                <div key={i} role="cell" className="flex items-center gap-2 border-l border-line px-5 py-2">
                                  {st === undefined ? (
                                    <span className="text-xs text-fg-subtle">Not taken</span>
                                  ) : (
                                    <>
                                      <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-ink-100" aria-hidden>
                                        <span className="rounded-full bg-primary-500" style={{ width: `${st * 10}%` }} />
                                      </span>
                                      <span className="w-5 text-right text-xs font-semibold text-fg tabular">{st}</span>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  }
                  return (
                    <div key={tid} role="row" className="grid border-b border-line" style={grid}>
                      <div role="rowheader" className="sticky left-0 z-10 bg-surface px-5 py-3.5 text-sm font-medium text-fg">
                        {t.name}
                      </div>
                      {picked.map((v) => {
                        const s = scored[v.record.id]?.find((r) => r.testId === tid)?.scored[0];
                        return (
                          <div key={v.record.id} role="cell" className="border-l border-line px-5 py-3.5">
                            {s ? (
                              <>
                                <p className="text-sm text-fg">
                                  <span className="font-semibold tabular">{ordinal(s.percentile)}</span> · {BAND_LABEL[s.band]}
                                </p>
                                <PercentileBar percentile={s.percentile} band={s.band} className="mt-1.5" />
                              </>
                            ) : (
                              <span className="text-xs text-fg-subtle">Not taken</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </PageContainer>
  );
}
