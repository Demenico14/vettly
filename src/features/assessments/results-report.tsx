"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRightLeft, BadgeCheck, Bell, ChatText, Flag, RefreshCw, Sparkles, TriangleAlert, UserRound } from "@/components/icons";
import { Alert, Button, Card, CardHeader, Input, Segmented, Skeleton, Switch, Textarea, toast } from "@/components/ui";
import { PageContainer } from "@/components/layout/page-header";
import { IllustrativeNotice } from "@/components/domain/assessment";
import { services, MOCK_NOW, type InvitationView, type ScoredResult } from "@/services";
import type { NormGroup, Test } from "@/types/psychometrics";
import { BAND_LABEL } from "@/lib/psychometrics";
import { cn, ordinal, timeAgo } from "@/lib/utils";
import { InvitationBadge, PercentileBar, StenScale, day, dayTime } from "./meta";

const NOW = new Date(MOCK_NOW);
type ReportKind = "hr" | "candidate" | "interview";
const QUESTIONNAIRE = ["personality", "integrity", "emotional_intelligence", "motivation"];

export function ResultsReport({ id }: { id: string }) {
  const [data, setData] = React.useState<{ view: InvitationView; results: ScoredResult[] } | null>(null);
  const [lib, setLib] = React.useState<{ tests: Test[]; normGroups: NormGroup[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [kind, setKind] = React.useState<ReportKind>("hr");

  React.useEffect(() => {
    let alive = true;
    services.assessments
      .invitation(id)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    services.assessments.library().then((l) => alive && setLib(l));
    return () => {
      alive = false;
    };
  }, [id, reload]);

  const back = (
    <Link href="/assessments" className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
      <ArrowLeft className="size-4" />
      Assessments
    </Link>
  );
  if (error)
    return (
      <PageContainer>
        {back}
        <Alert
          tone="danger"
          title="Results not available"
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
  if (!data || !lib)
    return (
      <PageContainer>
        <div className="flex flex-col gap-4 pt-6" aria-busy="true">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </PageContainer>
    );

  const { view: v, results } = data;
  const r = v.record;
  const testOf = (tid: string) => lib.tests.find((t) => t.id === tid)!;
  const normOf = (code: string) => lib.normGroups.find((n) => n.code === code);
  const pending = v.testIds.filter((tid) => !results.some((x) => x.testId === tid));
  const set = (record: typeof r) => setData((d) => (d ? { ...d, view: { ...d.view, record } } : d));

  return (
    <PageContainer
      header={
        <div>
          {back}
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[1.75rem] leading-[1.1] font-bold tracking-[-0.02em] text-fg sm:text-[2.125rem]">{r.candidateName}</h1>
                <InvitationBadge status={r.status} size="md" />
              </div>
              <p className="mt-1.5 text-[0.9375rem] text-fg-muted">
                {r.vacancyTitle} · {v.batteryLabel} · sent {day(r.sentAt)} by {r.sentBy}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="secondary" asChild>
                <Link href={`/candidates/${r.candidateId}`}>
                  <UserRound />
                  Profile
                </Link>
              </Button>
              {results.length > 0 && (
                <Button variant="secondary" asChild>
                  <Link href={`/assessments/compare?vacancy=${r.vacancyId}&i=${r.id}`}>
                    <ArrowRightLeft />
                    Compare
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <StatusPanel v={v} pending={pending.map(testOf)} onChanged={() => setReload((x) => x + 1)} />

          {results.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Segmented
                  label="Report"
                  value={kind}
                  onChange={setKind}
                  options={[
                    { value: "hr", label: "HR report" },
                    { value: "candidate", label: "Candidate feedback" },
                    { value: "interview", label: "Interview guide" },
                  ]}
                />
                <IllustrativeNotice>Illustrative results · not real scores</IllustrativeNotice>
              </div>

              {kind === "hr" && (
                <>
                  <Card className="p-5 sm:p-6">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <Sparkles className="size-4 text-accent-600" aria-hidden />
                      Summary
                    </h2>
                    <p className="mt-2 max-w-[70ch] text-[0.9375rem] leading-relaxed text-fg-muted">{narrative(r.candidateName, results, testOf, normOf)}</p>
                    <p className="mt-3 text-2xs font-semibold text-accent-700">Generated summary · check it against the scores below</p>
                  </Card>
                  {results.map((res) => (
                    <ResultCard key={res.testId} res={res} test={testOf(res.testId)} norm={normOf(res.scored[0]!.normCode)} attempt={r.attempts.find((a) => a.testId === res.testId)} />
                  ))}
                  {r.accommodations.length > 0 && (
                    <Alert tone="info" title="Accommodations applied">
                      {r.accommodations.map((a) => `${a.extraTimePercent ? `+${a.extraTimePercent}% time` : a.type.replace(/_/g, " ")}: ${a.note}`).join(" ")}
                    </Alert>
                  )}
                  <p className="text-xs text-fg-subtle">
                    Use these results alongside the CV evidence and a structured interview. Scores never reject a candidate on their own, and the candidate can ask for a review.
                  </p>
                </>
              )}
              {kind === "candidate" && <CandidateFeedback name={r.candidateName} results={results} testOf={testOf} />}
              {kind === "interview" && <InterviewGuide results={results} testOf={testOf} />}
            </>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          {r.status === "completed" && <ReviewPanel v={v} onChange={set} />}
          <Card>
            <CardHeader title="Activity" description="Every send, reminder, change and review." />
            <ol className="flex flex-col px-5 pb-5">
              {[...r.audit].reverse().map((a, i, arr) => (
                <li key={`${a.at}-${i}`} className="relative grid grid-cols-[0.75rem_minmax(0,1fr)] gap-3 pb-4 last:pb-0">
                  <span className="relative flex justify-center" aria-hidden>
                    <span className={cn("mt-1.5 size-2 rounded-full", a.action === "delivery_failed" || a.action === "expired" ? "bg-danger-500" : i === 0 ? "bg-primary-500" : "bg-ink-300")} />
                    {i < arr.length - 1 && <span className="absolute top-3.5 h-[calc(100%-0.25rem)] w-px bg-line" />}
                  </span>
                  <div className="min-w-0 text-xs">
                    <p className="text-fg">
                      <span className="font-semibold">{ACTION[a.action] ?? a.action}</span> · {a.by}
                    </p>
                    {a.detail && <p className="text-fg-muted">{prettyDetail(a.detail, testOf)}</p>}
                    <p className="text-fg-subtle tabular">{dayTime(a.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </PageContainer>
  );
}

const ACTION: Record<string, string> = {
  sent: "Sent",
  delivered: "Delivered",
  delivery_failed: "Not delivered",
  opened: "Opened",
  consented: "Consent given",
  started: "Started",
  completed: "Finished",
  reminded: "Reminder sent",
  extended: "Deadline changed",
  cancelled: "Cancelled",
  resent: "Sent again",
  restored: "Change undone",
  reviewed: "Review",
  note: "Note added",
  flagged: "Concern",
  expired: "Expired",
};

function prettyDetail(d: string, testOf: (id: string) => Test) {
  return d.startsWith("tst_") ? (testOf(d)?.name ?? d) : d;
}

function StatusPanel({ v, pending, onChanged }: { v: InvitationView; pending: Test[]; onChanged: () => void }) {
  const r = v.record;
  if (r.status === "completed") return null;
  const open = ["sent", "opened", "in_progress"].includes(r.status);
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fg">
            {r.status === "expired" ? "The deadline passed" : r.status === "cancelled" ? "These tests were cancelled" : r.status === "in_progress" ? "Part-way through" : r.openedAt ? "Opened, not started" : "Waiting for the candidate"}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            {r.outcomeNote ?? (open ? `Due ${day(r.deadline)} at 17:00. ${r.remindersSent.length ? `${r.remindersSent.length} reminder${r.remindersSent.length > 1 ? "s" : ""} sent.` : "No reminders sent yet."}` : "")}
          </p>
        </div>
        {open && (
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              const x = await services.assessments.remind([r.id]);
              if (x.reminded) toast.success("Reminder sent", r.candidateName);
              else toast.warning("Not sent", x.skipped[0]?.reason);
              onChanged();
            }}
          >
            <Bell />
            Send reminder
          </Button>
        )}
      </div>
      {r.deliveryIssues.length > 0 && open && (
        <Alert tone="danger" title="Part of the invitation wasn't delivered" className="mt-4">
          {r.deliveryIssues.map((d) => `${d.channel.toUpperCase()}: ${d.reason}`).join(" ")} Check the candidate&apos;s contact details ({v.email ?? "no email"}, {v.phone ?? "no phone"}), then send a reminder.
        </Alert>
      )}
      {pending.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {pending.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 rounded-md bg-ink-50 px-3 py-2 text-sm">
              <span className="text-fg">{t.name}</span>
              <span className="text-xs text-fg-subtle">{r.progress?.[t.id] ? `Saved part-way (${r.progress[t.id]} answered)` : "Not started"}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ResultCard({ res, test, norm, attempt }: { res: ScoredResult; test: Test; norm?: NormGroup; attempt?: { completedAt: string | null; device: string; disconnects: number } }) {
  const profile = QUESTIONNAIRE.includes(test.family);
  const s = res.scored[0]!;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-base font-semibold text-fg">{test.name}</h3>
          <p className="text-xs text-fg-subtle">
            Compared with {norm?.name ?? s.normCode} (n = {s.normN.toLocaleString("en-ZA")})
            {attempt?.completedAt && ` · finished ${dayTime(attempt.completedAt)} on ${attempt.device}`}
          </p>
        </div>
        <Link href={`/assessments/library/${test.id}`} className="text-xs font-semibold text-primary-700 hover:underline">
          About this test
        </Link>
      </div>
      {profile ? (
        <TraitProfile res={res} test={test} />
      ) : (
        <div className="grid grid-cols-1 gap-5 px-5 py-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:px-6">
          <div>
            <p className="flex items-baseline gap-1 font-bold text-fg tabular">
              <span className="text-4xl leading-none tracking-[-0.02em]">{ordinal(s.percentile)}</span>
              <span className="text-sm text-fg-subtle">percentile</span>
            </p>
            <p className="mt-1 text-sm font-medium text-fg">{BAND_LABEL[s.band]}</p>
          </div>
          <div className="flex flex-col gap-3">
            <PercentileBar percentile={s.percentile} band={s.band} />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
              {[
                [test.scoringModel === "irt_theta" ? "Ability estimate (θ)" : "Raw score", test.scoringModel === "irt_theta" ? s.raw.toFixed(2) : `${s.raw}${test.items > 1 && test.scoringModel === "number_correct" ? ` / ${test.items}` : ""}`],
                ["T-score", s.t],
                ["Sten", s.sten],
                ["Stanine", s.stanine],
              ].map(([k, val]) => (
                <div key={k}>
                  <dt className="text-fg-subtle">{k}</dt>
                  <dd className="font-semibold text-fg tabular">{val}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
      {res.flags.length > 0 && (
        <p className="flex items-start gap-1.5 border-t border-line px-5 py-3 text-xs text-fg-muted sm:px-6">
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-warning-600" aria-hidden />
          {res.flags.join(" ")}
        </p>
      )}
    </Card>
  );
}

function TraitProfile({ res, test }: { res: ScoredResult; test: Test }) {
  const domains = [...new Set(test.scales.map((s) => s.domain ?? "Scales"))];
  return (
    <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
      {domains.map((d) => (
        <section key={d}>
          <h4 className="mb-2 text-xs font-semibold text-fg-muted">{d}</h4>
          <ul className="flex flex-col gap-2.5">
            {test.scales
              .filter((s) => (s.domain ?? "Scales") === d)
              .map((sc) => {
                const s = res.scored.find((x) => x.scale === sc.code);
                if (!s) return null;
                return (
                  <li key={sc.code} className="grid grid-cols-1 items-center gap-x-4 gap-y-1 md:grid-cols-[minmax(0,1fr)_14rem_minmax(0,1fr)]">
                    <p className="order-2 text-xs text-fg-subtle md:order-none md:text-right">
                      <span className="font-semibold md:hidden">Low: </span>
                      {sc.low ?? "Lower"}
                    </p>
                    <div className="order-1 md:order-none">
                      <p className="mb-0.5 text-xs font-semibold text-fg md:text-center">{sc.name}</p>
                      <StenScale sten={s.sten} label={sc.name} />
                    </div>
                    <p className="order-3 text-xs text-fg-subtle md:order-none">
                      <span className="font-semibold md:hidden">High: </span>
                      {sc.high ?? "Higher"}
                    </p>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
      <p className="text-2xs text-fg-subtle">Stens 1–10. Most people score 4–7. Neither end is better: what fits depends on the role.</p>
    </div>
  );
}

/* ---------- Generated text ---------- */

const lowerFirst = (x: string) => x.charAt(0).toLowerCase() + x.slice(1);

function narrative(name: string, results: ScoredResult[], testOf: (id: string) => Test, normOf: (c: string) => NormGroup | undefined) {
  const first = name.split(" ")[0];
  const parts: string[] = [];
  const ability = results.filter((r) => !QUESTIONNAIRE.includes(testOf(r.testId).family));
  if (ability.length) {
    const lines = ability.map((r) => {
      const s = r.scored[0]!;
      return `${BAND_LABEL[s.band].toLowerCase()} on ${testOf(r.testId).name.replace(/ · .*$/, "").toLowerCase()} (${ordinal(s.percentile)} percentile against ${lowerFirst(normOf(s.normCode)?.name ?? "the norm group")})`;
    });
    parts.push(`${first} scored ${lines.join(", and ")}.`);
  }
  for (const r of results.filter((x) => QUESTIONNAIRE.includes(testOf(x.testId).family))) {
    const t = testOf(r.testId);
    const high = r.scored.filter((s) => s.sten >= 8).map((s) => t.scales.find((x) => x.code === s.scale)!.name.toLowerCase());
    const low = r.scored.filter((s) => s.sten <= 3).map((s) => t.scales.find((x) => x.code === s.scale)!.name.toLowerCase());
    if (high.length) parts.push(`The ${t.shortName.toLowerCase()} profile stands out for ${high.slice(0, 4).join(", ")}.`);
    if (low.length) parts.push(`${first} describes themselves as less drawn to ${low.slice(0, 3).join(" and ")}.`);
    if (!high.length && !low.length) parts.push(`The ${t.shortName.toLowerCase()} profile is balanced, with no extreme scales.`);
  }
  return parts.join(" ");
}

function CandidateFeedback({ name, results, testOf }: { name: string; results: ScoredResult[]; testOf: (id: string) => Test }) {
  const strengths: string[] = [];
  const develop: string[] = [];
  for (const r of results) {
    const t = testOf(r.testId);
    if (QUESTIONNAIRE.includes(t.family)) {
      r.scored.filter((s) => s.sten >= 8).forEach((s) => strengths.push(t.scales.find((x) => x.code === s.scale)!.high!));
      r.scored.filter((s) => s.sten <= 3).forEach((s) => develop.push(`You tend to: ${t.scales.find((x) => x.code === s.scale)!.low!.toLowerCase()} Think about when the opposite would help.`));
    }
  }
  return (
    <Card className="p-5 sm:p-7">
      <p className="text-xs font-semibold text-fg-subtle">Preview of what {name.split(" ")[0]} receives by email</p>
      <h3 className="mt-3 text-lg font-semibold text-fg">Your assessment feedback</h3>
      <p className="mt-1 text-sm text-fg-muted">Thank you for completing your assessments. Here is a summary of your results, in bands rather than exact scores.</p>
      <ul className="mt-5 flex flex-col gap-3">
        {results
          .filter((r) => !QUESTIONNAIRE.includes(testOf(r.testId).family))
          .map((r) => (
            <li key={r.testId} className="flex items-center justify-between gap-3 border-b border-line pb-3 text-sm">
              <span className="text-fg">{testOf(r.testId).name.replace(/ · .*$/, "")}</span>
              <span className="font-semibold text-fg">{BAND_LABEL[r.scored[0]!.band]}</span>
            </li>
          ))}
      </ul>
      {strengths.length > 0 && (
        <section className="mt-5">
          <h4 className="text-sm font-semibold text-fg">What you described as your strengths</h4>
          <ul className="mt-2 list-disc pl-5 text-sm text-fg-muted">
            {strengths.slice(0, 5).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}
      {develop.length > 0 && (
        <section className="mt-5">
          <h4 className="text-sm font-semibold text-fg">Areas to think about</h4>
          <ul className="mt-2 list-disc pl-5 text-sm text-fg-muted">
            {develop.slice(0, 5).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-6 text-xs text-fg-subtle">
        These results are one part of your application, alongside your CV and interviews. If you think something affected your results, or you want them reviewed, reply to this email.
      </p>
    </Card>
  );
}

function InterviewGuide({ results, testOf }: { results: ScoredResult[]; testOf: (id: string) => Test }) {
  const items: { scale: string; hypothesis: string; questions: string[] }[] = [];
  for (const r of results) {
    const t = testOf(r.testId);
    if (QUESTIONNAIRE.includes(t.family)) {
      for (const s of r.scored) {
        const sc = t.scales.find((x) => x.code === s.scale)!;
        if (s.sten >= 8 && sc.high)
          items.push({
            scale: `${sc.name} (sten ${s.sten})`,
            hypothesis: `Likely strength: ${sc.high.toLowerCase()} Check whether it is overplayed.`,
            questions: [`Tell me about a time when being ${sc.name.toLowerCase()} made a real difference to a result.`, `When has this approach worked against you? What did you change?`],
          });
        if (s.sten <= 3 && sc.low)
          items.push({
            scale: `${sc.name} (sten ${s.sten})`,
            hypothesis: `Possible gap: ${sc.low.toLowerCase()} Explore how they cope when the role needs the opposite.`,
            questions: [`Describe a situation where you had to ${sc.high?.toLowerCase().replace(/\.$/, "") ?? "work this way"}. How did it go?`, `What do you do when a task needs more of this than comes naturally?`],
          });
      }
    } else {
      const s = r.scored[0]!;
      if (s.percentile < 30)
        items.push({
          scale: `${t.name} (${ordinal(s.percentile)} percentile)`,
          hypothesis: "Below the sift guide. Look for evidence of this ability elsewhere before drawing conclusions.",
          questions: [`Walk me through a recent task where you had to ${t.family === "ability" ? "work accurately with this kind of information" : "handle this kind of situation"}.`],
        });
    }
  }
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Interview guide" description="Hypotheses to test at interview, not conclusions. Probe with evidence from real situations." />
      {items.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-fg-muted">No scales stand out strongly enough to need specific probing. Use the standard structured interview for this role.</p>
      ) : (
        <ol className="border-t border-line">
          {items.slice(0, 8).map((it) => (
            <li key={it.scale} className="border-b border-line px-5 py-4 last:border-b-0 sm:px-6">
              <p className="text-sm font-semibold text-fg">{it.scale}</p>
              <p className="mt-0.5 text-sm text-fg-muted">{it.hypothesis}</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {it.questions.map((q) => (
                  <li key={q} className="flex gap-2 text-sm text-fg">
                    <ChatText className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
                    {q}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function ReviewPanel({ v, onChange }: { v: InvitationView; onChange: (r: InvitationView["record"]) => void }) {
  const r = v.record;
  const [note, setNote] = React.useState("");
  const [concern, setConcern] = React.useState(r.review.concern ?? "");
  const [editingConcern, setEditingConcern] = React.useState(false);
  return (
    <Card>
      <CardHeader title="HR review" description="Results inform the decision. They never reject anyone on their own." />
      <div className="flex flex-col gap-4 px-5 pb-5">
        <label className="flex items-start justify-between gap-3 rounded-md bg-ink-50 px-3 py-2.5">
          <span className="text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-fg">
              {r.review.reviewed && <BadgeCheck className="size-4 text-success-600" aria-hidden />}
              Reviewed
            </span>
            <span className="block text-xs text-fg-subtle">
              {r.review.reviewed && r.review.reviewedBy ? `${r.review.reviewedBy} · ${timeAgo(r.review.reviewedAt!, NOW)}` : "Not yet reviewed"}
            </span>
          </span>
          <Switch
            checked={r.review.reviewed}
            onCheckedChange={async (c) => {
              onChange(await services.assessments.setReviewed(r.id, c));
              toast.success(c ? "Marked as reviewed" : "Review reopened");
            }}
          />
        </label>

        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
            <Flag className="size-4 text-ink-500" aria-hidden />
            Concern for the panel
          </p>
          {r.review.concern && !editingConcern ? (
            <div className="mt-1.5 rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {r.review.concern}
              <div className="mt-1.5 flex gap-3 text-xs font-semibold">
                <button type="button" className="hover:underline" onClick={() => setEditingConcern(true)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="hover:underline"
                  onClick={async () => {
                    onChange(await services.assessments.setConcern(r.id, null));
                    setConcern("");
                    toast.success("Concern cleared");
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <form
              className="mt-1.5 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!concern.trim()) return;
                onChange(await services.assessments.setConcern(r.id, concern));
                setEditingConcern(false);
                toast.success("Concern flagged", "The interview panel will see it.");
              }}
            >
              <Input value={concern} onChange={(e) => setConcern(e.target.value)} placeholder="e.g. Very low composure; explore pressure" aria-label="Concern" />
              <Button type="submit" variant="secondary" disabled={!concern.trim()}>
                Flag
              </Button>
            </form>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-fg">Notes</p>
          <ul className="mt-2 flex flex-col gap-2">
            {r.review.notes.map((n, i) => (
              <li key={i} className="rounded-md bg-ink-50 px-3 py-2 text-sm">
                <p className="text-fg-muted">{n.body}</p>
                <p className="mt-1 text-2xs text-fg-subtle">
                  {n.by} · {timeAgo(n.at, NOW)}
                </p>
              </li>
            ))}
            {r.review.notes.length === 0 && <li className="text-xs text-fg-subtle">No notes yet.</li>}
          </ul>
          <form
            className="mt-2 flex flex-col gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!note.trim()) return;
              onChange(await services.assessments.addNote(r.id, note));
              setNote("");
              toast.success("Note added");
            }}
          >
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should the panel know?" aria-label="Add a note" />
            <Button type="submit" size="sm" variant="secondary" className="self-end" disabled={!note.trim()}>
              Add note
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
}
