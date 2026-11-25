"use client";

import * as React from "react";
import { ArrowLeft, Check, Clock, Info, Timer, X } from "@/components/icons";
import { Alert, Button, Skeleton, toast } from "@/components/ui";
import { services } from "@/services";
import type { CandidateTest } from "@/services";
import type { SampleItem } from "@/types/psychometrics";
import { cn } from "@/lib/utils";
import { Stimulus } from "@/features/assessments/meta";
import { TestFigure } from "@/features/assessments/figures";
import { FAST_ANSWER_MS, useTestGuard } from "./test-guard";
import { useTestRecorder } from "./test-recorder";

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
  // Integrity: blocks copy, paste and inspect shortcuts and notes window switches while scored questions are open.
  const readIntegrity = useTestGuard(phase === "questions");
  const shownAt = React.useRef(0);
  // Recording, when the candidate agreed to it: camera check before starting, capture while scored questions are open.
  const recorder = useTestRecorder(token, testId, test?.recording ?? null);
  const { begin: beginRecording } = recorder;
  React.useEffect(() => {
    if (phase === "questions") beginRecording();
  }, [phase, beginRecording]);
  const fast = React.useRef<Set<string>>(new Set());

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
        await recorder.stop();
        const allDone = await services.candidateAccess.submit(token, test.id, answers, minutes, { ...readIntegrity(), cameraOff: recorder.cameraOffCount() }, fast.current.size);
        if (timedOut) toast.info("Time's up", "Your answers so far have been saved.");
        onFinished(allDone);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Your answers couldn't be sent. Check your connection and try again.");
        setPhase("questions");
      }
    },
    [test, token, answers, startedAt, onFinished, readIntegrity, recorder],
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
    shownAt.current = Date.now();
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
          <li className="flex gap-3">
            <Info className="mt-0.5 size-4 shrink-0 text-primary-700" />
            While the questions are open, copy, paste and some keyboard shortcuts are turned off, and leaving this window is noted. The recruitment team sees what was
            noted, as something to talk about with you, not as a verdict.
          </li>
          {questionnaire && (
            <li className="flex gap-3">
              <Info className="mt-0.5 size-4 shrink-0 text-primary-700" />
              There are no right or wrong answers. Describe how you usually are, not how you&apos;d like to be.
            </li>
          )}
        </ul>
        {test.recording && (
          <CameraCheck status={recorder.status} prepare={recorder.prepare} attachPreview={recorder.attachPreview} mode={test.recording.mode} token={token} onDecline={onExit} />
        )}
        <Button
          size="lg"
          className="mt-6 w-full sm:w-auto"
          disabled={!!test.recording && recorder.status !== "live"}
          onClick={() => (test.practice.length ? (setPhase("practice"), setIndex(0), setPracticeChecked(false)) : start())}
        >
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
        <p className="mt-2 text-sm text-fg-muted">This test needs its own player (a spreadsheet, code editor or typing box), which isn&apos;t available online yet. Continue, and the recruitment team will arrange it with you.</p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => submit()}>Continue</Button>
          <Button variant="secondary" onClick={onExit}>
            Back
          </Button>
        </div>
      </Panel>
    );

  const isPractice = phase === "practice";
  const last = index === items.length - 1;
  const correct = isPractice && practiceChecked ? item.answer === undefined || answers[item.id] === item.answer : null;

  const format = test.itemFormat;
  const wide = !!(item.figure || item.stimulus) && !format.startsWith("likert");
  const onChange = (k: string, v: number) => {
    // On timed tests, an answer within two seconds of the question appearing is counted as implausibly fast.
    if (!isPractice && !questionnaire && Date.now() - shownAt.current < FAST_ANSWER_MS) fast.current.add(item.id);
    setAnswers((a) => ({ ...a, [k]: v }));
  };

  return (
    <Panel locked={!isPractice}>
      {/* Top bar: where you are, and the clock. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">{test.name}</p>
          <p className="text-xs text-fg-subtle tabular">{isPractice ? "Practice question · not scored" : `Question ${index + 1} of ${items.length} · ${answered} answered`}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isPractice && test.recording && <RecordingBadge status={recorder.status} attachPreview={recorder.attachPreview} />}
          {!isPractice && secondsLeft !== null && (
            <p
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tabular",
                secondsLeft <= 60 ? "bg-danger-50 text-danger-700" : secondsLeft <= 300 ? "bg-warning-50 text-warning-700" : "bg-ink-100 text-ink-900",
              )}
            >
              <Timer className="size-4" aria-hidden />
              <span aria-hidden>
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </span>
              <span className="sr-only">Time left: {Math.ceil(secondsLeft / 60)} minutes</span>
            </p>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="assertive">
        {announce}
      </p>

      {/* Question map: answered, current, and a way to jump back. */}
      {!isPractice && (
        <nav aria-label="Questions" className="mt-4 flex flex-wrap gap-1.5">
          {items.map((q, i) => {
            const done = isAnswered(q, answers, format);
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index ? "step" : undefined}
                aria-label={`Question ${i + 1}${done ? ", answered" : ""}`}
                className={cn(
                  "grid size-7 place-items-center rounded-md text-2xs font-semibold tabular transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-500",
                  i === index ? "bg-ink-900 text-white" : done ? "bg-primary-100 text-primary-800 hover:bg-primary-200" : "bg-ink-100 text-fg-muted hover:bg-ink-200",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </nav>
      )}

      <div className={cn("mt-6", wide && "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8")}>
        {(item.figure || item.stimulus) && (
          <div className={cn("flex flex-col gap-3", wide && "lg:sticky lg:top-6 lg:self-start")}>
            {item.stimulus && <Stimulus text={item.stimulus} />}
            {item.figure && <TestFigure figure={item.figure} alt={item.figureAlt} className={item.figure.kind === "shape" ? "max-w-[11rem]" : undefined} />}
          </div>
        )}
        <div>
          <h1 ref={heading} tabIndex={-1} className={cn("font-semibold text-ink-900 outline-none", format.startsWith("likert") ? "text-xl tracking-[-0.01em]" : "text-lg")}>
            {item.prompt}
          </h1>
          <Answer item={item} format={format} answers={answers} onChange={onChange} disabled={isPractice && practiceChecked} />

          {isPractice && practiceChecked && (
            <div className={cn("mt-4 flex items-start gap-2 rounded-md px-3 py-2.5 text-sm", correct ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700")} role="status">
              {correct ? <Check className="mt-0.5 size-4 shrink-0" /> : <X className="mt-0.5 size-4 shrink-0" />}
              <span>
                {correct ? "That's right." : `Not quite. The answer is ${item.optionFigures ? `option ${item.options?.[item.answer ?? 0]}` : `"${item.options?.[item.answer ?? 0]}"`}.`} {item.explanation}
              </span>
            </div>
          )}
          {error && (
            <Alert tone="danger" title="Not sent" className="mt-4">
              {error}
            </Alert>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
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
            <Button disabled={!isAnswered(item, answers, format)} onClick={() => setPracticeChecked(true)}>
              Check answer
            </Button>
          )
        ) : last ? (
          <Button onClick={() => submit()} disabled={!isAnswered(item, answers, format) && questionnaire}>
            Finish test{!questionnaire && answered < items.length ? ` (${items.length - answered} unanswered)` : ""}
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => i + 1)} disabled={questionnaire && !isAnswered(item, answers, format)}>
            Next
          </Button>
        )}
      </div>
      {!isPractice && !questionnaire && <p className="mt-3 text-xs text-fg-subtle">Skip a question and come back to it with the numbers above, any time before you finish.</p>}
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
  if (item.optionFigures) {
    return (
      <fieldset className={cn("mt-5 grid gap-3", item.optionFigures.length > 4 ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4")} disabled={disabled}>
        <legend className="sr-only">{item.prompt}</legend>
        {item.optionFigures.map((f, i) => (
          <label
            key={i}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 bg-surface p-2.5 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-primary-500/30",
              answers[item.id] === i ? "border-primary-600 bg-primary-50" : "border-line hover:border-ink-400",
            )}
          >
            <input type="radio" name={name} className="sr-only" checked={answers[item.id] === i} onChange={() => onChange(item.id, i)} aria-label={`Option ${options[i]}`} />
            <TestFigure figure={f} compact className="w-full max-w-[7rem]" />
            <span className={cn("grid size-6 place-items-center rounded-full text-xs font-bold", answers[item.id] === i ? "bg-primary-600 text-white" : "bg-ink-100 text-ink-700")}>{options[i]}</span>
          </label>
        ))}
      </fieldset>
    );
  }
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
          <input type="radio" name={name} className={cn("size-4 shrink-0 accent-(--color-primary-600)", !scale && "sr-only")} checked={answers[item.id] === i} onChange={() => onChange(item.id, i)} />
          {!scale && (
            <span aria-hidden className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold", answers[item.id] === i ? "bg-primary-600 text-white" : "bg-ink-100 text-ink-700")}>
              {String.fromCharCode(65 + i)}
            </span>
          )}
          {o}
        </label>
      ))}
    </fieldset>
  );
}

/** Before a recorded test: turn the camera on and see yourself, or say you can't. */
type Recorder = ReturnType<typeof useTestRecorder>;

function CameraCheck({
  status: s,
  prepare,
  attachPreview,
  mode,
  token,
  onDecline,
}: {
  status: Recorder["status"];
  prepare: Recorder["prepare"];
  attachPreview: Recorder["attachPreview"];
  mode: "photos" | "video";
  token: string;
  onDecline: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="mt-6 flex flex-col gap-4 rounded-md border border-line p-4 sm:flex-row sm:items-center">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md bg-ink-900 sm:w-44">
        <video ref={attachPreview} autoPlay muted playsInline className={cn("size-full -scale-x-100 object-cover", s !== "live" && "opacity-0")} />
        {s !== "live" && <span className="absolute inset-0 grid place-items-center text-xs text-white/70">Camera off</span>}
      </div>
      <div className="text-sm text-fg-muted">
        <p className="font-semibold text-fg">{mode === "photos" ? "Photos are taken every 20 seconds" : "This test is recorded"}</p>
        <p className="mt-1">
          {s === "live"
            ? "You're set. Recording starts with the first scored question and stops when you finish."
            : s === "blocked"
              ? "Your browser blocked the camera. Allow it from the camera icon in the address bar, then try again."
              : s === "unavailable"
                ? "We couldn't find a camera on this device. Try another device, or tell us you can't use one."
                : "Turn on your camera to start. You'll see yourself here first."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {s !== "live" && (
            <Button size="sm" loading={s === "starting"} onClick={() => prepare()}>
              {s === "idle" || s === "starting" ? "Turn on my camera" : "Try again"}
            </Button>
          )}
          {(s === "blocked" || s === "unavailable") && (
            <Button
              size="sm"
              variant="secondary"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                await services.candidateAccess.recordingChoice(token, false).catch(() => {});
                onDecline();
              }}
            >
              I can&apos;t use a camera
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** While scored questions are open: a small live preview and a clear "Recording" label. */
function RecordingBadge({ status, attachPreview }: { status: Recorder["status"]; attachPreview: Recorder["attachPreview"] }) {
  const live = status === "live";
  return (
    <p className="ml-auto inline-flex items-center gap-2 rounded-full bg-ink-900 py-1 pr-3 pl-1 text-xs font-semibold text-white" role="status">
      <span className="relative h-6 w-8 overflow-hidden rounded-full bg-ink-700">
        <video ref={attachPreview} autoPlay muted playsInline className="size-full -scale-x-100 object-cover" />
      </span>
      <span aria-hidden className={cn("size-1.5 rounded-full", live ? "bg-white motion-safe:animate-pulse" : "bg-white/40")} />
      {live ? "Recording" : "Camera off: this is noted"}
    </p>
  );
}

function Panel({ children, locked = false }: { children: React.ReactNode; locked?: boolean }) {
  return <div className={cn("rounded-lg border border-line bg-surface p-6 sm:p-8", locked && "select-none")}>{children}</div>;
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
      <ArrowLeft className="size-4" />
      Your tests
    </button>
  );
}
