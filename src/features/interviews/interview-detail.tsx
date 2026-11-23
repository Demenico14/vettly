"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, CalendarPlus, ChatText, Check, ClipboardList, EyeOff, Phone, Plus, RefreshCw, Sparkles, Trash2, UsersRound, Video, X } from "@/components/icons";
import { Alert, Avatar, Button, Card, CardHeader, Checkbox, Field, Input, Modal, ModalClose, ModalContent, Skeleton, Textarea, toast } from "@/components/ui";
import { PageContainer, PageTitle } from "@/components/layout/page-header";
import { MatchScore } from "@/components/domain/assessment";
import { STAGE_META, StageBadge } from "@/components/domain/status-badge";
import { services, MOCK_NOW, harare, partsOf, type CandidateContext, type Conflict, type InterviewListItem } from "@/services";
import { currentUserId } from "@/lib/current-user";
import type { ApplicationStage } from "@/types";
import type { DecisionOutcome, Interview, Interviewer, Question, QuestionSet } from "@/types/interviews";
import { cn, dotted } from "@/lib/utils";
import { RECOMMENDATION, RESPONSE, RatingDots, StatusBadge, dayLong, endTime, time } from "./meta";

type Data = { item: InterviewListItem; interviewers: Interviewer[]; questionSet: QuestionSet; context: CandidateContext; scorecardsVisible: boolean };
const NOW = new Date(MOCK_NOW).getTime();
const NEXT_STAGE: Partial<Record<ApplicationStage, ApplicationStage>> = { screening: "shortlisted", shortlisted: "interview", assessment: "interview", interview: "offer" };

export function InterviewDetail({ id }: { id: string }) {
  const [data, setData] = React.useState<Data | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [dialog, setDialog] = React.useState<"reschedule" | "cancel" | "no_show" | null>(null);

  React.useEffect(() => {
    let alive = true;
    services.interviews
      .get(id)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id, reload]);
  const refresh = () => setReload((r) => r + 1);

  const back = (
    <Link href="/interviews" className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
      <ArrowLeft className="size-4" />
      Interviews
    </Link>
  );
  if (error)
    return (
      <PageContainer>
        {back}
        <Alert tone="danger" title="Interview not available" className="mt-4" action={<Button size="sm" variant="secondary" onClick={refresh}><RefreshCw />Try again</Button>}>
          {error}
        </Alert>
      </PageContainer>
    );
  if (!data)
    return (
      <PageContainer>
        <Skeleton className="mt-6 h-96 rounded-lg" />
      </PageContainer>
    );

  const { item, context: cx } = data;
  const iv = item.interview;
  const started = new Date(iv.startsAt).getTime() <= NOW;
  const Icon = iv.format === "Video" ? Video : iv.format === "Phone" ? Phone : UsersRound;
  const myCard = iv.scorecards.find((s) => s.interviewerId === currentUserId());

  return (
    <PageContainer
      header={
        <div>
          {back}
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar name={iv.candidateName} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <PageTitle>{iv.candidateName}</PageTitle>
                  <StatusBadge status={iv.status} size="md" />
                </div>
                <p className="mt-1.5 text-md text-fg-muted">
                  {iv.round} · {iv.vacancyTitle}
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg">
                  <span className="font-semibold">
                    {dayLong(iv.startsAt)}, {time(iv.startsAt)}–{endTime(iv)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-fg-muted">
                    <Icon className="size-4" aria-hidden />
                    {iv.location}
                  </span>
                </p>
                {iv.status === "scheduled" && <p className={cn("mt-1 text-xs font-medium", RESPONSE[iv.candidateResponse].cls)}>Candidate: {RESPONSE[iv.candidateResponse].label.toLowerCase()}</p>}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {iv.meetingLink && iv.status === "scheduled" && (
                <Button asChild>
                  <a href={iv.meetingLink} target="_blank" rel="noreferrer">
                    <Video />
                    Join
                  </a>
                </Button>
              )}
              {item.myScorecardDue && (
                <Button asChild>
                  <Link href={`/interviews/${iv.id}/scorecard`}>
                    <ClipboardList />
                    {myCard?.status === "draft" ? "Finish your scorecard" : "Write your scorecard"}
                  </Link>
                </Button>
              )}
              {iv.status === "scheduled" && started && (
                <>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await services.interviews.markCompleted(iv.id);
                      toast.success("Marked as completed", "Scorecards are open for the panel.");
                      refresh();
                    }}
                  >
                    <Check />
                    It took place
                  </Button>
                  <Button variant="ghost" onClick={() => setDialog("no_show")}>
                    No-show
                  </Button>
                </>
              )}
              {iv.status === "scheduled" && !started && (
                <>
                  <Button variant="secondary" onClick={() => setDialog("reschedule")}>
                    <CalendarPlus />
                    Reschedule
                  </Button>
                  <Button variant="ghost" className="text-danger-700" onClick={() => setDialog("cancel")}>
                    <X />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {iv.statusNote && (
            <Alert tone={iv.candidateResponse === "reschedule_requested" ? "warning" : iv.status === "no_show" ? "danger" : "info"} title={iv.candidateResponse === "reschedule_requested" ? "The candidate asked for another time" : iv.status === "no_show" ? "The candidate didn't attend" : iv.status === "cancelled" ? "Cancelled" : "Note"}
              action={iv.candidateResponse === "reschedule_requested" && iv.status === "scheduled" ? <Button size="sm" variant="secondary" onClick={() => setDialog("reschedule")}>Reschedule</Button> : undefined}>
              {iv.statusNote}
            </Alert>
          )}
          {iv.status === "completed" && <Scorecards data={data} />}
          {iv.status === "completed" && <Decision data={data} onDone={refresh} />}
          <Questions data={data} onChange={refresh} />
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Candidate" />
            <div className="flex flex-col gap-3 px-5 pb-5 text-sm">
              <p className="text-fg-muted">
                {dotted(cx.headline, cx.location)}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {cx.stage && <StageBadge stage={cx.stage} size="sm" />}
                {cx.matchScore !== null && cx.provenance && (
                  <Link href={`/matching/${iv.vacancyId}/${iv.candidateId}`} className="hover:opacity-80" aria-label="Open the match assessment">
                    <MatchScore score={cx.matchScore} provenance={cx.provenance} size="sm" />
                  </Link>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" asChild>
                  <Link href={`/candidates/${iv.candidateId}`}>Profile</Link>
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/matching/${iv.vacancyId}/${iv.candidateId}`}>Assessment</Link>
                </Button>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Psychometric tests" description="A summary for the panel. Use alongside the interview, not instead of it." />
            <div className="px-5 pb-5 text-sm">
              {cx.tests.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {cx.tests.map((t) => (
                    <li key={t.name} className="flex flex-col">
                      <span className="font-medium text-fg">{t.name}</span>
                      <span className="text-xs text-fg-muted">{t.result}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-fg-muted">{cx.testsStatus}</p>
              )}
              {cx.tests.length > 0 && cx.testsStatus && <p className="mt-2 text-xs text-fg-subtle">{cx.testsStatus}</p>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Panel" />
            <ul className="flex flex-col px-5 pb-5">
              {iv.panel.map((p) => {
                const ivr = data.interviewers.find((i) => i.id === p.interviewerId);
                const card = iv.scorecards.find((s) => s.interviewerId === p.interviewerId);
                return (
                  <li key={p.interviewerId} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
                    <Avatar name={ivr?.name ?? "?"} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">
                        {ivr?.name}
                        {p.interviewerId === currentUserId() && <span className="text-fg-subtle"> (you)</span>}
                      </span>
                      <span className="block truncate text-xs text-fg-subtle">
                        {p.role === "lead" ? "Lead" : p.role === "observer" ? "Observer" : "Panellist"} · {ivr?.title}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-2xs">
                      {iv.status === "completed" && card ? (
                        <span className={card.status === "submitted" ? "font-semibold text-success-700" : "text-accent-700"}>{card.status === "submitted" ? "Scored" : card.status === "draft" ? "Draft" : "Not scored"}</span>
                      ) : (
                        <span className={RESPONSE[p.response].cls}>{RESPONSE[p.response].label}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Activity" />
            <ol className="flex flex-col gap-2.5 px-5 pb-5 text-xs">
              {[...iv.history].reverse().map((h, i) => (
                <li key={i}>
                  <p className="text-fg">
                    <span className="font-semibold">{h.text}</span> · {h.by}
                  </p>
                  <p className="text-fg-subtle tabular">{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Harare" }).format(new Date(h.at))}</p>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
      <ActionDialog kind={dialog} interview={iv} onClose={() => setDialog(null)} onDone={refresh} />
    </PageContainer>
  );
}

function QuestionBlock({ q, onRemove }: { q: Question; onRemove?: () => void }) {
  return (
    <li className="border-b border-line py-3 last:border-b-0">
      <div className="flex items-start gap-2">
        <ChatText className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">{q.text}</p>
          {q.followUps.length > 0 && <p className="mt-1 text-xs text-fg-muted">Follow-up: {q.followUps.join(" · ")}</p>}
          {(q.lookFor.length > 0 || q.redFlags.length > 0) && (
            <details className="mt-1.5 text-xs">
              <summary className="cursor-pointer font-semibold text-primary-700 select-none">What to listen for</summary>
              <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-success-700">Good evidence</p>
                  <ul className="list-disc pl-4 text-fg-muted">
                    {q.lookFor.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
                {q.redFlags.length > 0 && (
                  <div>
                    <p className="font-semibold text-danger-700">Watch for</p>
                    <ul className="list-disc pl-4 text-fg-muted">
                      {q.redFlags.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
        {onRemove && (
          <Button size="icon-sm" variant="ghost" aria-label="Remove question" onClick={onRemove}>
            <Trash2 />
          </Button>
        )}
      </div>
    </li>
  );
}

function Questions({ data, onChange }: { data: Data; onChange: () => void }) {
  const iv = data.item.interview;
  const [adding, setAdding] = React.useState(false);
  const [text, setText] = React.useState("");
  const editable = iv.status === "scheduled";
  const added = new Set(iv.extraQuestions.map((q) => q.id));
  const probes = data.context.probes.filter((p) => !added.has(p.id));
  return (
    <Card className="overflow-hidden">
      <CardHeader title={data.questionSet.name} description={data.questionSet.description} />
      <div className="flex flex-col gap-5 border-t border-line px-5 py-5 sm:px-6">
        {data.questionSet.competencies.map((c) => (
          <section key={c.id}>
            <h3 className="text-sm font-semibold text-fg">{c.name}</h3>
            <p className="text-xs text-fg-subtle">
              {c.description}
              {c.requirement && ` Evidences: ${c.requirement}.`}
            </p>
            <ul className="mt-1">
              {c.questions.map((q) => (
                <QuestionBlock key={q.id} q={q} />
              ))}
            </ul>
          </section>
        ))}
        {iv.extraQuestions.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-fg">Added for this interview</h3>
            <ul className="mt-1">
              {iv.extraQuestions.map((q) => (
                <QuestionBlock
                  key={q.id}
                  q={q}
                  onRemove={
                    editable
                      ? async () => {
                          await services.interviews.removeQuestion(iv.id, q.id);
                          onChange();
                        }
                      : undefined
                  }
                />
              ))}
            </ul>
          </section>
        )}
        {editable && probes.length > 0 && (
          <section className="rounded-md border border-dashed border-accent-500/60 bg-accent-50/50 px-4 py-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-accent-700">
              <Sparkles className="size-4" aria-hidden />
              Suggested from psychometric results
            </h3>
            <p className="text-xs text-fg-muted">Probes for the candidate&apos;s most distinctive scales. Add the ones you want to use.</p>
            <ul className="mt-2 flex flex-col gap-2">
              {probes.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-fg">{p.text}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await services.interviews.addQuestion(iv.id, p);
                      toast.success("Question added");
                      onChange();
                    }}
                  >
                    <Plus />
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {editable &&
          (adding ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (text.trim().length < 10) return;
                await services.interviews.addQuestion(iv.id, { id: `q_custom_${Date.now()}`, text: text.trim(), followUps: [], lookFor: [], redFlags: [] });
                setText("");
                setAdding(false);
                onChange();
              }}
            >
              <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about a specific past situation, e.g. 'Tell us about a time…'" aria-label="New question" autoFocus />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={text.trim().length < 10}>
                  Add question
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setAdding(true)}>
              <Plus />
              Add a question for this interview
            </Button>
          ))}
      </div>
    </Card>
  );
}

function Scorecards({ data }: { data: Data }) {
  const iv = data.item.interview;
  const submitted = iv.scorecards.filter((s) => s.status === "submitted");
  if (!data.scorecardsVisible)
    return (
      <Card className="flex items-start gap-3 p-5">
        <EyeOff className="mt-0.5 size-5 shrink-0 text-ink-500" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-fg">
            {submitted.length} of {iv.scorecards.length} scorecards in
          </p>
          <p className="text-sm text-fg-muted">Other panellists&apos; scores stay hidden until you submit yours, so everyone scores independently.</p>
        </div>
      </Card>
    );
  const comps = data.questionSet.competencies;
  const name = (id: string) => data.interviewers.find((i) => i.id === id)?.name ?? id;
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Scorecards" description={`${submitted.length} of ${iv.scorecards.length} submitted · 1 little evidence, 3 meets, 5 exceptional`} />
      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[19rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-fg-subtle">
              <th className="px-4 py-2.5 font-semibold sm:px-5">Competency</th>
              {iv.scorecards.map((s) => (
                <th key={s.interviewerId} className="px-3 py-2.5 font-semibold">
                  {name(s.interviewerId).split(" ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comps.map((c) => (
              <tr key={c.id} className="border-b border-line">
                <th scope="row" className="px-5 py-2.5 text-left font-medium text-fg">
                  {c.name}
                </th>
                {iv.scorecards.map((s) => {
                  const r = s.ratings.find((x) => x.competencyId === c.id);
                  return (
                    <td key={s.interviewerId} className="px-3 py-2.5" title={r?.evidence}>
                      {s.status === "submitted" && r ? <RatingDots rating={r.rating} /> : <span className="text-xs text-fg-subtle">–</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th scope="row" className="px-5 py-2.5 text-left font-semibold text-fg">
                Recommendation
              </th>
              {iv.scorecards.map((s) => (
                <td key={s.interviewerId} className="px-3 py-2.5">
                  {s.status === "submitted" && s.recommendation ? (
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-2xs font-semibold whitespace-nowrap", RECOMMENDATION[s.recommendation].cls)}>{RECOMMENDATION[s.recommendation].label}</span>
                  ) : (
                    <span className="text-xs text-accent-700">Not submitted</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-3 border-t border-line px-5 py-4">
        {submitted.map((s) => (
          <li key={s.interviewerId} className="text-sm">
            <p className="font-semibold text-fg">{name(s.interviewerId)}</p>
            <p className="text-fg-muted">{s.summary}</p>
            <details className="mt-1 text-xs">
              <summary className="cursor-pointer font-semibold text-primary-700 select-none">Evidence</summary>
              <ul className="mt-1 flex flex-col gap-1 text-fg-muted">
                {s.ratings.map((r) => (
                  <li key={r.competencyId}>
                    <span className="font-semibold text-fg">{comps.find((c) => c.id === r.competencyId)?.name} ({r.rating}):</span> {r.evidence}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Decision({ data, onDone }: { data: Data; onDone: () => void }) {
  const iv = data.item.interview;
  const stage = data.context.stage;
  const [outcome, setOutcome] = React.useState<DecisionOutcome>("advance");
  const [rationale, setRationale] = React.useState("");
  const [move, setMove] = React.useState(true);
  const [moveTo, setMoveTo] = React.useState<ApplicationStage>(stage ? (NEXT_STAGE[stage] ?? "interview") : "interview");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const lead = iv.panel.find((p) => p.role === "lead")?.interviewerId === currentUserId();
  if (iv.decision)
    return (
      <Card className="flex items-start gap-3 p-5">
        <BadgeCheck className="mt-0.5 size-5 shrink-0 text-success-600" aria-hidden />
        <div className="text-sm">
          <p className="font-semibold text-fg">Panel decision: {iv.decision.outcome === "advance" ? "advance" : iv.decision.outcome === "hold" ? "on hold" : "do not progress"}</p>
          <p className="text-fg-muted">{iv.decision.rationale}</p>
          <p className="mt-1 text-xs text-fg-subtle">
            {iv.decision.by} · {iv.decision.at.slice(0, 10)}
          </p>
          {iv.decision.outcome === "advance" && (stage === "interview" || stage === "offer") && (
            <Button size="sm" className="mt-3" asChild>
              <Link href={`/offers/new?candidate=${iv.candidateId}&vacancy=${iv.vacancyId}`}>Create offer</Link>
            </Button>
          )}
        </div>
      </Card>
    );
  const pending = iv.scorecards.filter((s) => s.status !== "submitted").length;
  if (!lead) return null;
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold text-fg">Panel decision</h2>
      <p className="mt-0.5 text-sm text-fg-muted">
        {pending ? `Waiting for ${pending} scorecard${pending > 1 ? "s" : ""} before the panel can decide.` : "Agree the outcome with the panel and record why. It goes on the candidate's decision record."}
      </p>
      {!pending && (
        <div className="mt-4 flex flex-col gap-4">
          {error && (
            <Alert tone="danger" title="Not saved">
              {error}
            </Alert>
          )}
          <div role="radiogroup" aria-label="Outcome" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(
              [
                ["advance", "Advance", "Move to the next step"],
                ["hold", "Hold", "Keep warm; decide later"],
                ["reject", "Do not progress", "Close the application"],
              ] as const
            ).map(([v, label, hint]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={outcome === v}
                onClick={() => {
                  setOutcome(v);
                  setMoveTo(v === "reject" ? "rejected" : stage ? (NEXT_STAGE[stage] ?? "interview") : "interview");
                  setMove(v !== "hold");
                }}
                className={cn("rounded-md border px-3 py-2.5 text-left", outcome === v ? (v === "reject" ? "border-danger-500 bg-danger-50" : "border-primary-500 bg-primary-50/60") : "border-line hover:border-ink-400")}
              >
                <span className="block text-sm font-semibold text-fg">{label}</span>
                <span className="block text-xs text-fg-muted">{hint}</span>
              </button>
            ))}
          </div>
          <Field label="Rationale" required hint="Based on the evidence in the scorecards, not impressions.">
            <Textarea rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="e.g. Strong evidence on IFRS and leadership from both panellists; treasury is a development area." />
          </Field>
          {outcome !== "hold" && stage && (
            <label className="flex flex-wrap items-center gap-2 text-sm text-fg">
              <Checkbox checked={move} onCheckedChange={(v) => setMove(v === true)} />
              Also move the candidate to
              <select value={moveTo} onChange={(e) => setMoveTo(e.target.value as ApplicationStage)} disabled={!move} className="h-8 rounded-md border border-line-strong bg-surface px-2 text-sm">
                {(outcome === "reject" ? (["rejected"] as ApplicationStage[]) : (["interview", "offer"] as ApplicationStage[])).map((s) => (
                  <option key={s} value={s}>
                    {STAGE_META[s].label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-fg-subtle">(now {STAGE_META[stage].label})</span>
            </label>
          )}
          <Button
            className="self-start"
            variant={outcome === "reject" ? "danger" : "primary"}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await services.interviews.decide(iv.id, outcome, rationale, outcome !== "hold" && move ? moveTo : null);
                toast.success("Decision recorded", outcome === "advance" && move ? `${iv.candidateName} moved to ${STAGE_META[moveTo].label}` : iv.candidateName);
                onDone();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Not saved.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Record decision
          </Button>
        </div>
      )}
    </Card>
  );
}

function ActionDialog({ kind, interview: iv, onClose, onDone }: { kind: "reschedule" | "cancel" | "no_show" | null; interview: Interview; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = React.useState("");
  const [start, setStart] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [conflicts, setConflicts] = React.useState<Conflict[]>([]);
  const [anyway, setAnyway] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!kind) return;
    const p = partsOf(iv.startsAt);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset per dialog
    setDate(p.date);
    setStart(p.time);
    setReason(iv.candidateResponse === "reschedule_requested" && iv.statusNote ? iv.statusNote : "");
    setError(null);
    setAnyway(false);
  }, [kind, iv]);

  React.useEffect(() => {
    if (kind !== "reschedule" || !date || !start) return;
    services.interviews.conflicts(iv.panel.map((p) => p.interviewerId), iv.candidateId, harare(date, start), iv.durationMin, iv.id).then(setConflicts);
  }, [kind, date, start, iv]);

  if (!kind) return null;
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (kind === "reschedule") {
        const r = await services.interviews.reschedule(iv.id, harare(date, start), reason, anyway);
        toast.success("Interview moved", `${dayLong(r.startsAt)}, ${time(r.startsAt)}. The candidate and panel have been told.`);
      } else if (kind === "cancel") {
        await services.interviews.cancel(iv.id, reason);
        toast.success("Interview cancelled", "The candidate and panel have been told.");
      } else {
        await services.interviews.markNoShow(iv.id, reason);
        toast.success("Marked as no-show");
      }
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not saved.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()}>
      <ModalContent
        size="sm"
        title={kind === "reschedule" ? "Reschedule the interview" : kind === "cancel" ? "Cancel the interview?" : "Mark as no-show"}
        description={kind === "no_show" ? "Record what you tried. You can reschedule from the candidate's profile." : "The candidate and panel get an updated invitation with your reason."}
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Back</Button>
            </ModalClose>
            <Button variant={kind === "cancel" ? "danger" : "primary"} loading={busy} onClick={submit}>
              {kind === "reschedule" ? "Move interview" : kind === "cancel" ? "Cancel interview" : "Mark as no-show"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && (
            <Alert tone="danger" title="Not saved">
              {error}
            </Alert>
          )}
          {kind === "reschedule" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" required>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Start" required>
                <Input type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
            </div>
          )}
          {kind === "reschedule" && conflicts.length > 0 && (
            <div className="rounded-md bg-warning-50 px-3 py-2 text-xs text-warning-700">
              <p className="font-semibold">Clashes: {conflicts.map((c) => `${c.who} (${c.what})`).join("; ")}</p>
              <label className="mt-1.5 flex items-center gap-2 font-medium">
                <Checkbox checked={anyway} onCheckedChange={(v) => setAnyway(v === true)} />
                Move it anyway
              </label>
            </div>
          )}
          <Field label={kind === "no_show" ? "What happened" : "Reason"} required={kind !== "no_show"}>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={kind === "no_show" ? "e.g. No answer on two calls; voicemail left" : kind === "cancel" ? "e.g. Candidate withdrew" : "e.g. Candidate asked for an afternoon slot"} />
          </Field>
        </div>
      </ModalContent>
    </Modal>
  );
}

