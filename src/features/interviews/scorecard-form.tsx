"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@/components/icons";
import { Alert, Button, Card, ConfirmModal, Field, Skeleton, Textarea, toast } from "@/components/ui";
import { PageContainer } from "@/components/layout/page-header";
import { services, MY_INTERVIEWER_ID, type CandidateContext, type InterviewListItem } from "@/services";
import type { Interviewer, QuestionSet, Rating, Recommendation } from "@/types/interviews";
import { RATING_ANCHORS } from "@/mocks/interviews";
import { cn } from "@/lib/utils";
import { RECOMMENDATION, dayLong, time } from "./meta";

type Data = { item: InterviewListItem; interviewers: Interviewer[]; questionSet: QuestionSet; context: CandidateContext; scorecardsVisible: boolean };

export function ScorecardForm({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<Data | null>(null);
  const [ratings, setRatings] = React.useState<Record<string, Rating>>({});
  const [recommendation, setRecommendation] = React.useState<Recommendation | null>(null);
  const [summary, setSummary] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"draft" | "submit" | null>(null);
  const [confirming, setConfirming] = React.useState(false);

  React.useEffect(() => {
    services.interviews.get(id).then((d) => {
      setData(d);
      const mine = d.item.interview.scorecards.find((s) => s.interviewerId === MY_INTERVIEWER_ID);
      if (mine) {
        setRatings(Object.fromEntries(mine.ratings.map((r) => [r.competencyId, r])));
        setRecommendation(mine.recommendation);
        setSummary(mine.summary);
      }
    });
  }, [id]);

  if (!data)
    return (
      <PageContainer>
        <Skeleton className="mt-6 h-96 rounded-lg" />
      </PageContainer>
    );
  const iv = data.item.interview;
  const mine = iv.scorecards.find((s) => s.interviewerId === MY_INTERVIEWER_ID);
  const comps = data.questionSet.competencies;
  const done = comps.filter((c) => ratings[c.id]?.rating && (ratings[c.id]?.evidence.trim().length ?? 0) >= 15).length;
  const set = (cid: string, patch: Partial<Rating>) =>
    setRatings((r) => {
      const prev: Rating = r[cid] ?? { competencyId: cid, rating: 0, evidence: "" };
      return { ...r, [cid]: { ...prev, ...patch } };
    });

  const save = async (submit: boolean) => {
    setBusy(submit ? "submit" : "draft");
    setError(null);
    try {
      await services.interviews.saveScorecard(iv.id, { ratings: Object.values(ratings).filter((r) => r.rating > 0), recommendation, summary }, submit);
      if (submit) {
        toast.success("Scorecard submitted", "You can now see the rest of the panel's scores.");
        router.push(`/interviews/${iv.id}`);
      } else toast.success("Draft saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not saved.");
      setConfirming(false);
    } finally {
      setBusy(null);
    }
  };

  const back = (
    <Link href={`/interviews/${iv.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
      <ArrowLeft className="size-4" />
      {iv.round}
    </Link>
  );

  if (!mine || mine.status === "submitted" || iv.status !== "completed")
    return (
      <PageContainer>
        {back}
        <Alert tone="info" title={mine?.status === "submitted" ? "You've already submitted your scorecard" : !mine ? "You're not scoring this interview" : "Scorecards open once the interview has taken place"} className="mt-4" />
      </PageContainer>
    );

  return (
    <PageContainer
      header={
        <div>
          {back}
          <h1 className="mt-4 text-[1.75rem] leading-[1.1] font-bold tracking-[-0.02em] text-fg sm:text-[2.125rem]">Your scorecard: {iv.candidateName}</h1>
          <p className="mt-1.5 text-[0.9375rem] text-fg-muted">
            {iv.round} · {iv.vacancyTitle} · {dayLong(iv.startsAt)}, {time(iv.startsAt)}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">Rate what the candidate showed in the interview, with the evidence. Score each competency on its own before deciding your overall view. Other panellists can&apos;t see your scores until they submit theirs.</p>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {comps.map((c, n) => {
          const r = ratings[c.id];
          return (
            <Card key={c.id} className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-fg">
                    {n + 1}. {c.name}
                  </h2>
                  <p className="text-sm text-fg-muted">{c.description}</p>
                </div>
                {r?.rating && r.evidence.trim().length >= 15 ? <span className="text-xs font-semibold text-success-700">Done</span> : null}
              </div>
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer font-semibold text-primary-700 select-none">Questions asked</summary>
                <ul className="mt-1 list-disc pl-5 text-fg-muted">
                  {c.questions.map((q) => (
                    <li key={q.id}>{q.text}</li>
                  ))}
                </ul>
              </details>
              <fieldset className="mt-4">
                <legend className="mb-2 text-sm font-semibold text-fg">Rating</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                  {RATING_ANCHORS.map((a) => (
                    <label
                      key={a.value}
                      className={cn(
                        "flex cursor-pointer flex-col rounded-md border px-3 py-2 text-left transition-colors has-focus-visible:ring-3 has-focus-visible:ring-primary-500/30",
                        r?.rating === a.value ? "border-primary-500 bg-primary-50" : "border-line-strong hover:border-ink-400",
                      )}
                    >
                      <input type="radio" name={`rate-${c.id}`} className="sr-only" checked={r?.rating === a.value} onChange={() => set(c.id, { rating: a.value })} />
                      <span className="text-lg font-bold text-fg tabular">{a.value}</span>
                      <span className="text-xs font-semibold text-fg">{a.label}</span>
                      <span className="mt-0.5 hidden text-2xs text-fg-subtle sm:block">{a.hint}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Evidence" required className="mt-4" hint="What the candidate said or did. Quote specifics; avoid impressions like 'seemed confident'.">
                <Textarea rows={3} value={r?.evidence ?? ""} onChange={(e) => set(c.id, { evidence: e.target.value })} />
              </Field>
            </Card>
          );
        })}

        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold text-fg">Overall</h2>
          <fieldset className="mt-3">
            <legend className="mb-2 text-sm font-semibold text-fg">Recommendation</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(RECOMMENDATION) as Recommendation[]).map((k) => (
                <label key={k} className={cn("cursor-pointer rounded-full border px-4 py-1.5 text-sm font-semibold has-focus-visible:ring-3 has-focus-visible:ring-primary-500/30", recommendation === k ? RECOMMENDATION[k].cls + " border-transparent" : "border-line-strong text-fg-muted")}>
                  <input type="radio" name="recommendation" className="sr-only" checked={recommendation === k} onChange={() => setRecommendation(k)} />
                  {RECOMMENDATION[k].label}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Summary for the panel" optional className="mt-4">
            <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Strengths, concerns and anything the next round should explore." />
          </Field>
        </Card>

        {error && (
          <Alert tone="danger" title="Not submitted">
            {error}
          </Alert>
        )}
        <div className="material-bar sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-line px-4 py-3 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
          <p className="text-xs text-fg-muted tabular">
            {done} of {comps.length} competencies scored with evidence
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" loading={busy === "draft"} onClick={() => save(false)}>
              Save draft
            </Button>
            <Button loading={busy === "submit"} onClick={() => setConfirming(true)}>
              Submit
            </Button>
          </div>
        </div>
      </div>
      <ConfirmModal
        open={confirming}
        onOpenChange={setConfirming}
        tone="primary"
        title="Submit your scorecard?"
        description="You can't change it afterwards. Other panellists' scores become visible to you once it's in."
        confirmLabel="Submit scorecard"
        onConfirm={() => save(true)}
      />
    </PageContainer>
  );
}
