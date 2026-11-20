"use client";

import * as React from "react";
import { ArrowLeft, Check, Clock, Info, Timer, X } from "@/components/icons";
import { Alert, Button, Skeleton, toast } from "@/components/ui";
import { services } from "@/services";
import type { CandidateTest } from "@/services/auth";
import type { SampleItem } from "@/types/psychometrics";
import { cn } from "@/lib/utils";
import { Stimulus } from "@/features/assessments/meta";

type Phase = "intro" | "practice" | "questions" | "submitting";
const LIKERT_5 = ["Very inaccurate", "Moderately inaccurate", "Neither", "Moderately accurate", "Very accurate"];
const LIKERT_7 = ["Never", "Rarely", "Sometimes not", "Neutral", "Sometimes", "Often", "Always"];
const EFFECTIVE = ["Very ineffective", "Ineffective", "Effective", "Very effective"];

/**
 * Takes one test. Timed tests count down from the limit plus any extra time; untimed questionnaires can be saved
 * part-way. Keyboard: every answer is a native radio, so arrow keys and Tab work, and screen readers announce
 * the timer at five minutes and one minute left.
 */
export function TestRunner({ token, testId, onExit, onFinished }: { token: string; testId: string; onExit: () => void; onFinished: (allDone: boolean) => void }) {
  const [test, setTest] = React.useState<CandidateTest | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<Phase>("intro");
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [practiceChecked, setPracticeChecked] = React.useState(false);
  const [startedAt, setStartedAt] = React.useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = React.useState<number | null>(null);
  const [announce, setAnnounce] = React.useState("");
  const heading = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    services.candidateAccess
      .loadTest(token, testId)
      .then(setTest)
      .catch((e: Error) => setError(e.message));
  }, [token, testId]);

  const limitSec = test?.timeLimitMin ? Math.round(test.timeLimitMin * 60 * (1 + test.extraTimePercent / 100)) : null;

  const submit = React.useCallback(
    async (timedOut = false) => {
      if (!test) return;
      setPhase("submitting");
      try {
        const minutes = Math.max(1, Math.round(((startedAt ? Date.now() - startedAt : 60000) / 60000) * 10) / 10);
        const allDone = await services.candidateAccess.submit(token, test.id, answers, minutes);
        if (timedOut) toast.info("Time's up", "Your answers so far have been saved.");
        onFinished(allDone);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Your answers couldn't be sent. Check your connection and try again.");
        setPhase("questions");
      }
    },
    [test, token, answers, startedAt, onFinished],
  );

  // Countdown for timed tests. Pauses are server-side in production; here it simply runs.
  React.useEffect(() => {
    if (phase !== "questions" || limitSec === null || startedAt === null) return;
    const tick = () => {
      const left = Math.max(0, limitSec - Math.floor((Date.now() - startedAt) / 1000));
      setSecondsLeft(left);
      if (left === 300) setAnnounce("Five minutes left.");
      if (left === 60) setAnnounce("One minute left.");
      if (left === 0) void submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [phase, limitSec, startedAt, submit]);

  React.useEffect(() => {
    heading.current?.focus();
  }, [phase, index]);

  if (error && !test)
    return (
      <Alert tone="danger" title="This test didn't open">
        {error}
      </Alert>
    );
  if (!test) return <Skeleton className="h-80 rounded-lg" />;

  const questionnaire = !test.timeLimitMin;
  const items = phase === "practice" ? test.practice : test.questions;
  const item = items[index];
  const answered = test.questions.filter((q) => isAnswered(q, answers, test.itemFormat)).length;
  const start = () => {
    setPhase("questions");
    setIndex(0);
    setStartedAt(Date.now());
  };

  if (phase === "intro") {
    const minutes = limitSec ? Math.round(limitSec / 60) : null;
    return (
      <Panel>
        <BackButton onClick={onExit} />
        <h1 ref={heading} tabIndex={-1} className="mt-3 text-xl font-bold text-fg outline-none">
          {test.name}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{test.instructions}</p>
        <ul className="mt-5 flex flex-col gap-3 text-sm text-fg-muted">
          <li className="flex gap-3">
            {minutes ? <Timer className="mt-0.5 size-4 shrink-0 text-primary-700" /> : <Clock className="mt-0.5 size-4 shrink-0 text-primary-700" />}
            {minutes
              ? `You'll have ${minutes} minutes${test.extraTimePercent ? `, including your ${test.extraTimePercent}% extra time` : ""}. The timer starts after the practice question${test.practice.length > 1 ? "s" : ""}.`
              : "There's no time limit. You can save and come back before the deadline."}
          </li>
          {test.calculatorAllowed && (
            <li className="flex gap-3">
              <Info className="mt-0.5 size-4 shrink-0 text-primary-700" />A calculator, pen and paper are allowed.
            </li>
          )}
          {questionnaire && (
            <li className="flex gap-3">
              <Info className="mt-0.5 size-4 shrink-0 text-primary-700" />
              There are no right or wrong answers. Describe how you usually are, not how you&apos;d like to be.
            </li>
          )}
        </ul>
        {test.questions.length < test.fullLength && (
          <p className="mt-5 rounded-md border border-dashed border-line-strong px-3 py-2 text-xs text-fg-subtle">
            Prototype: shortened to {test.questions.length} {test.questions.length === 1 ? "question" : "questions"} (the real test has {test.fullLength}).
          </p>
        )}
        <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={() => (test.practice.length ? (setPhase("practice"), setIndex(0), setPracticeChecked(false)) : start())}>
          {test.practice.length ? "Try a practice question" : "Start"}
        </Button>
      </Panel>
    );
  }

  if (phase === "submitting")
    return (
      <Panel>
        <p className="text-sm text-fg-muted" role="status">
          Saving your answers…
        </p>
      </Panel>
    );

  if (!item)
    return (
      <Panel>
        <h1 ref={heading} tabIndex={-1} className="text-xl font-bold text-fg outline-none">
          {test.name}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">This test opens in its own player (a spreadsheet, code editor or typing box). In this prototype, record a completion instead.</p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => submit()}>Simulate finishing</Button>
          <Button variant="secondary" onClick={onExit}>
            Back
          </Button>
        </div>
      </Panel>
    );

  const isPractice = phase === "practice";
  const last = index === items.length - 1;
  const correct = isPractice && practiceChecked ? item.answer === undefined || answers[item.id] === item.answer : null;

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-fg-subtle">
          {isPractice ? "Practice · not scored" : `${test.name} · question ${index + 1} of ${items.length}`}
        </p>
        {!isPractice && secondsLeft !== null && (
          <p className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular", secondsLeft <= 60 ? "bg-danger-50 text-danger-700" : secondsLeft <= 300 ? "bg-warning-50 text-warning-700" : "bg-ink-100 text-fg-muted")}>
            <Timer className="size-3.5" aria-hidden />
            <span aria-hidden>
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </span>
            <span className="sr-only">Time left: {Math.ceil(secondsLeft / 60)} minutes</span>
          </p>
        )}
      </div>
      <p className="sr-only" aria-live="assertive">
        {announce}
      </p>
      {!isPractice && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-label="Progress" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={items.length}>
          <div className="h-full rounded-full bg-primary-500 transition-[width] duration-300" style={{ width: `${(answered / items.length) * 100}%` }} />
        </div>
      )}

      {item.stimulus && <Stimulus text={item.stimulus} className="mt-5" />}
      <h1 ref={heading} tabIndex={-1} className="mt-5 text-base font-semibold text-fg outline-none">
        {item.prompt}
      </h1>

      <Answer item={item} format={test.itemFormat} answers={answers} onChange={(k, v) => setAnswers((a) => ({ ...a, [k]: v }))} disabled={isPractice && practiceChecked} />

      {isPractice && practiceChecked && (
        <div className={cn("mt-4 flex items-start gap-2 rounded-md px-3 py-2.5 text-sm", correct ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700")} role="status">
          {correct ? <Check className="mt-0.5 size-4 shrink-0" /> : <X className="mt-0.5 size-4 shrink-0" />}
          <span>
            {correct ? "That's right." : `Not quite. The answer is "${item.options?.[item.answer ?? 0]}".`} {item.explanation}
          </span>
        </div>
      )}
      {error && (
        <Alert tone="danger" title="Not sent" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {index > 0 && !isPractice && (
            <Button variant="ghost" onClick={() => setIndex((i) => i - 1)}>
              <ArrowLeft />
              Previous
            </Button>
          )}
          {questionnaire && !isPractice && (
            <Button
              variant="ghost"
              onClick={async () => {
                await services.candidateAccess.saveProgress(token, test.id, answered);
                toast.success("Progress saved", "Open your link again before the deadline to finish.");
                onExit();
              }}
            >
              Save and finish later
            </Button>
          )}
        </div>
        {isPractice ? (
          practiceChecked ? (
            <Button onClick={() => (last ? start() : (setIndex((i) => i + 1), setPracticeChecked(false)))}>{last ? "Start the test" : "Next practice question"}</Button>
          ) : (
            <Button disabled={!isAnswered(item, answers, test.itemFormat)} onClick={() => setPracticeChecked(true)}>
              Check answer
            </Button>
          )
        ) : last ? (
          <Button onClick={() => submit()} disabled={!isAnswered(item, answers, test.itemFormat) && questionnaire}>
            Finish test
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => i + 1)} disabled={questionnaire && !isAnswered(item, answers, test.itemFormat)}>
            Next
          </Button>
        )}
      </div>
      {!isPractice && !questionnaire && <p className="mt-3 text-xs text-fg-subtle">You can skip a question and come back to it before you finish.</p>}
    </Panel>
  );
}

function isAnswered(item: SampleItem, a: Record<string, number>, format: string) {
  if (format === "forced_choice_triad" || format === "sjt_most_least") return a[item.id] !== undefined && (a[`${item.id}:least`] ?? -1) >= 0;
  if (format === "sjt_rate_effectiveness") return (item.options ?? []).every((_, i) => a[`${item.id}:${i}`] !== undefined);
  return a[item.id] !== undefined;
}

function Answer({ item, format, answers, onChange, disabled }: { item: SampleItem; format: string; answers: Record<string, number>; onChange: (key: string, v: number) => void; disabled: boolean }) {
  const name = `q-${item.id}`;
  if (format === "forced_choice_triad" || format === "sjt_most_least") {
    const most = format === "forced_choice_triad" ? "Most like me" : "Most effective";
    const least = format === "forced_choice_triad" ? "Least like me" : "Least effective";
    return (
      <fieldset className="mt-4" disabled={disabled}>
        <legend className="sr-only">Choose one {most.toLowerCase()} and one {least.toLowerCase()}</legend>
        <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-y-1 text-sm">
          <span />
          <span className="text-center text-2xs font-semibold text-fg-subtle">{most}</span>
          <span className="text-center text-2xs font-semibold text-fg-subtle">{least}</span>
          {(item.options ?? []).map((o, i) => (
            <React.Fragment key={o}>
              <span className="rounded-md bg-ink-50 px-3 py-2.5 text-fg">{o}</span>
              <label className="grid place-items-center">
                <input
                  type="radio"
                  name={`${name}-most`}
                  className="size-5 accent-(--color-primary-600)"
                  checked={answers[item.id] === i}
                  onChange={() => {
                    onChange(item.id, i);
                    if (answers[`${item.id}:least`] === i) onChange(`${item.id}:least`, -1);
                  }}
                  aria-label={`${most}: ${o}`}
                />
              </label>
              <label className="grid place-items-center">
                <input
                  type="radio"
                  name={`${name}-least`}
                  className="size-5 accent-(--color-primary-600)"
                  checked={answers[`${item.id}:least`] === i}
                  disabled={answers[item.id] === i}
                  onChange={() => onChange(`${item.id}:least`, i)}
                  aria-label={`${least}: ${o}`}
                />
              </label>
            </React.Fragment>
          ))}
        </div>
      </fieldset>
    );
  }
  if (format === "sjt_rate_effectiveness") {
    return (
      <div className="mt-4 flex flex-col gap-3">
        {(item.options ?? []).map((o, i) => (
          <fieldset key={o} className="rounded-md border border-line px-3 py-3" disabled={disabled}>
            <legend className="px-1 text-sm text-fg">{o}</legend>
            <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {EFFECTIVE.map((e, r) => (
                <label key={e} className={cn("flex min-h-11 cursor-pointer items-center justify-center rounded-sm border px-2 py-1.5 text-center text-sm has-focus-visible:ring-3 has-focus-visible:ring-primary-500/30 sm:text-xs", answers[`${item.id}:${i}`] === r + 1 ? "border-primary-500 bg-primary-50 font-semibold text-primary-800" : "border-line-strong text-fg-muted")}>
                  <input type="radio" name={`${name}-${i}`} className="sr-only" checked={answers[`${item.id}:${i}`] === r + 1} onChange={() => onChange(`${item.id}:${i}`, r + 1)} />
                  {e}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    );
  }
  const options = item.options ?? (format === "likert_7" ? LIKERT_7 : LIKERT_5);
  const scale = !item.options;
  return (
    <fieldset className={cn("mt-4", scale ? "grid grid-cols-1 gap-2 sm:grid-cols-5" : "flex flex-col gap-2")} disabled={disabled}>
      <legend className="sr-only">{item.prompt}</legend>
      {options.map((o, i) => (
        <label
          key={o}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-3 text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-primary-500/30",
            scale && "sm:flex-col sm:justify-center sm:gap-1.5 sm:px-2 sm:text-center sm:text-xs",
            answers[item.id] === i ? "border-primary-500 bg-primary-50 font-medium text-primary-900" : "border-line-strong text-fg hover:border-ink-400",
          )}
        >
          <input type="radio" name={name} className="size-4 shrink-0 accent-(--color-primary-600)" checked={answers[item.id] === i} onChange={() => onChange(item.id, i)} />
          {o}
        </label>
      ))}
    </fieldset>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">{children}</div>;
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
      <ArrowLeft className="size-4" />
      Your tests
    </button>
  );
}
