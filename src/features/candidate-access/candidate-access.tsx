"use client";

import * as React from "react";
import { CircleAlert, CircleCheck, Clock, DeviceMobile, Lock, Timer } from "@/components/icons";
import { Alert, Button, CheckboxField, Skeleton, toast } from "@/components/ui";
import { OtpInput, isCompleteCode } from "@/components/ui/otp-input";
import { LogoMark } from "@/components/brand/logo";
import { services } from "@/services";
import { AuthError, type CandidateTestAccess } from "@/types";
import { cn } from "@/lib/utils";
import { useCountdown } from "@/features/auth/verify-email";
import { TestRunner } from "./test-runner";
import { TestFigure } from "@/features/assessments/figures";
import type { Figure, Glyph } from "@/types/psychometrics";
import { consentNotice } from "@/mocks/psychometrics";

type Phase = "welcome" | "verify" | "consent" | "ready" | "run" | "done";
type Load = { kind: "loading" } | { kind: "error"; error: AuthError } | { kind: "ok"; access: CandidateTestAccess };

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

/**
 * Candidate-facing entry to psychometric tests: invitation → identity check → consent → ready.
  * Mobile-first: most candidates open the link on a phone.
 */
export function CandidateAccess({ token }: { token: string }) {
  const [load, setLoad] = React.useState<Load>({ kind: "loading" });
  const [phase, setPhase] = React.useState<Phase>("welcome");
  const [running, setRunning] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    services.candidateAccess
      .open(token)
      .then((access) => alive && setLoad({ kind: "ok", access }))
      .catch((e: AuthError) => alive && setLoad({ kind: "error", error: e }));
    return () => {
      alive = false;
    };
  }, [token]);

  const access = load.kind === "ok" ? load.access : null;

  React.useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [phase]);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface" style={{ borderTop: `4px solid ${access?.organisationColour ?? "var(--color-primary-600)"}` }}>
        <div className={cn("mx-auto flex h-14 items-center justify-between px-5", phase === "run" || phase === "ready" ? "max-w-5xl" : "max-w-2xl")}>
          {access ? (
            <span className="flex min-w-0 items-center gap-2.5">
              {access.organisationLogoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- the organisation's logo
                <img src={access.organisationLogoUrl} alt="" className="h-7 w-auto max-w-28 object-contain" />
              )}
              <span className="truncate text-sm font-semibold text-fg">{access.organisationName}</span>
            </span>
          ) : (
            <Skeleton className="h-4 w-40" />
          )}
          <span className="flex items-center gap-1.5 text-2xs text-fg-subtle">
            Assessments by
            <LogoMark className="h-3.5" />
            <span className="font-semibold text-fg-muted">Vettly</span>
          </span>
        </div>
      </header>
      <main id="main" className={cn("mx-auto w-full flex-1 px-5 py-8 sm:py-12", phase === "run" || phase === "ready" ? "max-w-5xl" : "max-w-2xl")}>
        {load.kind === "loading" && <LoadingCard />}
        {load.kind === "error" && (
          <StatusCard
            tone="danger"
            icon={<CircleAlert />}
            title="This test link isn't valid"
            body="The link may be incomplete. Open it again from the email or SMS, or reply to the recruiter who sent it."
          />
        )}
        {access?.status === "expired" && (
          <StatusCard
            tone="danger"
            icon={<Clock />}
            title="This test link has expired"
            body={`The deadline for ${access.vacancyTitle} at ${access.organisationName} was ${dateTime(access.deadline)}. If you need more time, reply to the invitation email and the recruiter can send a new link.`}
          />
        )}
        {access?.status === "completed" && (
          <StatusCard
            tone="success"
            icon={<CircleCheck />}
            title="You've already completed these tests"
            body={`Thank you, ${access.candidateName.split(" ")[0]}. ${access.organisationName} has your responses for ${access.vacancyTitle} and will contact you about next steps.`}
          />
        )}
        {access?.status === "cancelled" && (
          <StatusCard
            tone="danger"
            icon={<Lock />}
            title="These tests were withdrawn"
            body={`${access.organisationName} has withdrawn this invitation, so there's nothing to complete. If you weren't expecting this, reply to the original email.`}
          />
        )}
        {access && (access.status === "ready" || access.status === "in_progress") && (
          <>
            {PHASES.some((p) => p.id === phase) && <Progress phase={phase} />}
            {phase === "welcome" && <Welcome access={access} onNext={() => setPhase("verify")} />}
            {phase === "verify" && <Verify access={access} onNext={() => setPhase(access.consented ? "ready" : "consent")} />}
            {phase === "consent" && (
              <Consent
                access={access}
                onNext={async () => {
                  setLoad({ kind: "ok", access: await services.candidateAccess.open(access.token) });
                  setPhase("ready");
                }}
              />
            )}
            {phase === "ready" && (
              <Ready
                access={access}
                onChanged={async () => setLoad({ kind: "ok", access: await services.candidateAccess.open(access.token) })}
                onStart={(id) => {
                  setRunning(id);
                  setPhase("run");
                }}
              />
            )}
            {phase === "run" && running && (
              <TestRunner
                token={access.token}
                testId={running}
                onExit={async () => {
                  setLoad({ kind: "ok", access: await services.candidateAccess.open(access.token) });
                  setPhase("ready");
                }}
                onFinished={async (allDone) => {
                  // After the last test, stay on this screen's thank-you rather than the "already completed" state.
                  if (allDone) return setPhase("done");
                  setLoad({ kind: "ok", access: await services.candidateAccess.open(access.token) });
                  setPhase("ready");
                }}
              />
            )}
            {phase === "done" && (
              <StatusCard
                tone="success"
                icon={<CircleCheck />}
                title="All done. Thank you"
                body={`Your answers have been sent to ${access.organisationName}. The recruitment team will be in touch about ${access.vacancyTitle}. You can close this page.`}
              />
            )}
          </>
        )}
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-2xl flex-wrap justify-between gap-2 px-5 py-4 text-xs text-fg-subtle">
          <span>Need help? Reply to your invitation email.</span>
          <a href="#privacy" className="hover:text-fg hover:underline">
            How your data is used
          </a>
        </div>
      </footer>
    </div>
  );
}

const PHASES: { id: Phase; label: string }[] = [
  { id: "welcome", label: "Invitation" },
  { id: "verify", label: "Confirm it's you" },
  { id: "consent", label: "Consent" },
  { id: "ready", label: "Your tests" },
];

function Progress({ phase }: { phase: Phase }) {
  const idx = PHASES.findIndex((p) => p.id === phase);
  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-semibold text-fg-subtle">
        Step {idx + 1} of {PHASES.length} · <span className="text-fg">{PHASES[idx]!.label}</span>
      </p>
      <div className="flex gap-1.5" aria-hidden>
        {PHASES.map((p, i) => (
          <span key={p.id} className={cn("h-1 flex-1 rounded-full", i <= idx ? "bg-primary-600" : "bg-ink-200")} />
        ))}
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="rounded-lg border border-line bg-surface p-5 sm:p-7">{children}</section>;
}

function Welcome({ access, onNext }: { access: CandidateTestAccess; onNext: () => void }) {
  const total = access.tests.reduce((s, t) => s + t.minutes, 0);
  const timedMinutes = access.tests.filter((t) => t.timed).reduce((s, t) => s + t.minutes, 0);
  const extra = Math.round((timedMinutes * access.extraTimePercent) / 100);
  return (
    <Panel>
      <h1 className="text-xl font-bold text-fg sm:text-2xl">Hello {access.candidateName.split(" ")[0]},</h1>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        {access.organisationName} has invited you to complete {access.tests.length === 1 ? "an assessment" : `${access.tests.length} short assessments`} as part of your
        application for <span className="font-semibold text-fg">{access.vacancyTitle}</span>. There are no trick questions; answer
        as you would at work.
      </p>
      <ul className="mt-6 divide-y divide-line rounded-md border border-line">
        {access.tests.map((t) => (
          <li key={t.name} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-fg">{t.name}</p>
              <p className="text-xs text-fg-subtle">{t.timed ? "Timed · finish in one sitting" : "Untimed · you can pause and resume"}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-sm text-fg-muted tabular">
              {t.timed ? <Timer className="size-4" /> : <Clock className="size-4" />}
              {t.minutes} min
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-fg-subtle">Total time</dt>
          <dd className="font-semibold text-fg tabular">
            About {total + extra} minutes{extra > 0 && <span className="font-normal text-fg-muted"> (includes {access.extraTimePercent}% extra time)</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Complete by</dt>
          <dd className="font-semibold text-fg">{dateTime(access.deadline)}</dd>
        </div>
      </dl>
      {access.extraTimePercent > 0 && (
        <Alert tone="info" title="Extra time is applied" className="mt-5">
          Your timed tests include {access.extraTimePercent}% extra time, as agreed with the recruiter.
        </Alert>
      )}
      <Button size="lg" className="mt-7 w-full sm:w-auto" onClick={onNext}>
        Continue
      </Button>
    </Panel>
  );
}

function Verify({ access, onNext }: { access: CandidateTestAccess; onNext: () => void }) {
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [left, restart] = useCountdown(0);

  const send = async () => {
    setSending(true);
    await services.candidateAccess.sendCode(access.token);
    setSending(false);
    setSent(true);
    restart();
    toast.info("Code sent", access.candidateEmailMasked);
  };

  const submit = async (value = code) => {
    if (!isCompleteCode(value)) {
      setError("Enter all 6 digits.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await services.candidateAccess.verify(access.token, value);
      onNext();
    } catch (e) {
      setError(e instanceof AuthError ? `${e.message} Check the latest email and try again.` : "Verification failed.");
      setCode("");
      setBusy(false);
    }
  };

  return (
    <Panel>
      <div className="mb-4 grid size-10 place-items-center rounded-md border border-line bg-surface-muted text-primary-700">
        <Lock className="size-5" />
      </div>
      <h1 className="text-xl font-bold text-fg">Confirm it&apos;s you</h1>
      <p className="mt-2 text-sm text-fg-muted">
        So that only you can take these tests, we&apos;ll email a 6-digit code to{" "}
        <span className="font-semibold text-fg">{access.candidateEmailMasked}</span>.
      </p>
      {!sent ? (
        <Button size="lg" className="mt-6 w-full sm:w-auto" loading={sending} onClick={send}>
          Email me a code
        </Button>
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-6 flex flex-col gap-4"
        >
          <OtpInput value={code} onChange={setCode} invalid={!!error} disabled={busy} autoFocus onComplete={submit} />
          {error && (
            <p className="text-xs font-medium text-danger-700" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" loading={busy}>
              Confirm
            </Button>
            <button
              type="button"
              disabled={sending}
              onClick={send}
              className="text-sm font-semibold text-primary-700 hover:underline disabled:opacity-50"
            >
              {left > 0 ? `Resend in ${left}s` : "Send a new code"}
            </button>
          </div>
        </form>
      )}
    </Panel>
  );
}

function Consent({ access, onNext }: { access: CandidateTestAccess; onNext: () => void | Promise<void> }) {
  const [checks, setChecks] = React.useState({ data: false, own: false });
  const asks = !!access.recording && access.recording.choice === null && !access.recording.waived;
  const [rec, setRec] = React.useState<"agree" | "decline" | null>(null);
  const [error, setError] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  return (
    <Panel>
      <h1 className="text-xl font-bold text-fg">Before you start</h1>
      <div className="mt-4 rounded-md bg-surface-muted p-4 text-sm leading-relaxed text-fg-muted">
        <p>
          <span className="font-semibold text-fg">{access.organisationName}</span> will see your answers and scores for this
          application. Results help the recruitment team decide on next steps alongside your CV and interviews; they are not
          used on their own to reject you.
        </p>
        <p className="mt-2">
          Your results are kept for 12 months, then deleted. You can ask {access.organisationName} for a copy or for deletion
          at any time.
        </p>
      </div>
      <details className="mt-3 rounded-md border border-line text-sm">
        <summary className="cursor-pointer px-4 py-2.5 font-semibold text-primary-700 select-none">Read the full data-use notice</summary>
        <ul className="flex list-disc flex-col gap-1.5 border-t border-line py-3 pr-4 pl-8 text-fg-muted">
          {consentNotice.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <p className="border-t border-line px-4 py-2 text-2xs text-fg-subtle">Notice version {consentNotice.version}</p>
      </details>
      <div className="mt-5 flex flex-col gap-4">
        <CheckboxField
          checked={checks.data}
          onCheckedChange={(c) => {
            setChecks((s) => ({ ...s, data: c === true }));
            setError(false);
          }}
          label="I agree to my test responses being used for this application"
        />
        <CheckboxField
          checked={checks.own}
          onCheckedChange={(c) => {
            setChecks((s) => ({ ...s, own: c === true }));
            setError(false);
          }}
          label="I will complete the tests myself, without help"
        />
        {asks && <RecordingChoice access={access} value={rec} onChange={(v) => (setRec(v), setError(false))} />}
        {error && (
          <p className="text-xs font-medium text-danger-700" role="alert">
            {asks && !rec && checks.data && checks.own
              ? "Choose whether you agree to be recorded. Either answer is fine."
              : "Tick both boxes to continue. If you have questions, reply to your invitation email."}
          </p>
        )}
      </div>
      <Button
        size="lg"
        className="mt-7 w-full sm:w-auto"
        loading={busy}
        onClick={async () => {
          if (!checks.data || !checks.own || (asks && !rec)) {
            setError(true);
            return;
          }
          setBusy(true);
          await services.candidateAccess.recordConsent(access.token);
          if (asks) await services.candidateAccess.recordingChoice(access.token, rec === "agree");
          await onNext();
        }}
      >
        Agree and continue
      </Button>
    </Panel>
  );
}

function Ready({ access, onStart, onChanged }: { access: CandidateTestAccess; onStart: (testId: string) => void; onChanged: () => Promise<void> }) {
  const rec = access.recording;
  const waiting = !!rec && !rec.waived && rec.choice !== "agreed";
  const [choice, setChoice] = React.useState<"agree" | "decline" | null>(null);
  const [busy, setBusy] = React.useState(false);
  const choose = async (agree: boolean) => {
    setBusy(true);
    try {
      await services.candidateAccess.recordingChoice(access.token, agree);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };
  const next = access.tests.find((t) => !t.done);
  const doneCount = access.tests.filter((t) => t.done).length;
  const mins = (t: CandidateTestAccess["tests"][number]) => (t.timed ? Math.round(t.minutes * (1 + access.extraTimePercent / 100)) : t.minutes);
  return (
    <Panel>
      <h1 className="text-xl font-bold text-fg">{doneCount ? "Welcome back" : "You're ready"}</h1>
      <p className="mt-2 text-sm text-fg-muted">
        {doneCount ? `${doneCount} of ${access.tests.length} done. ` : ""}Take the tests in any order, in one sitting or separately, before {dateTime(access.deadline)}.
      </p>
      <ul className="mt-4 flex flex-col gap-3 text-sm text-fg-muted">
        <li className="flex gap-3">
          <Clock className="mt-0.5 size-4 shrink-0 text-primary-700" />
          Find a quiet place for each timed test. Once a timed test starts, the clock keeps running.
        </li>
        <li className="flex gap-3">
          <DeviceMobile className="mt-0.5 size-4 shrink-0 text-primary-700" />
          A phone works, but a laptop is easier for numerical tests. If your connection drops, reopen the link to continue.
        </li>
        {access.extraTimePercent > 0 && (
          <li className="flex gap-3">
            <Timer className="mt-0.5 size-4 shrink-0 text-primary-700" />
            Your {access.extraTimePercent}% extra time is already included in the times below.
          </li>
        )}
      </ul>
      {rec && !rec.waived && rec.choice === null && (
        <div className="mt-6 flex flex-col gap-4">
          <RecordingChoice access={access} value={choice} onChange={setChoice} />
          <Button className="self-start" disabled={!choice} loading={busy} onClick={() => choose(choice === "agree")}>
            Save my choice
          </Button>
        </div>
      )}
      {rec && !rec.waived && rec.choice === "declined" && (
        <Alert tone="info" title="You chose not to be recorded" className="mt-6">
          That&apos;s fine, and it won&apos;t count against you. {access.organisationName} will be in touch about another way to take the tests.{" "}
          <button type="button" disabled={busy} onClick={() => choose(true)} className="font-semibold underline">
            Agree to be recorded instead
          </button>
        </Alert>
      )}
      <h2 className="mt-8 text-sm font-semibold text-ink-900">Choose a test to start</h2>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {access.tests.map((t) => (
          <li
            key={t.id ?? t.name}
            className={cn(
              "flex flex-col overflow-hidden rounded-xl border bg-surface transition-shadow",
              t.done ? "border-line opacity-80" : t === next ? "border-primary-500 shadow-platter" : "border-line hover:shadow-platter",
            )}
          >
            <div className="flex h-28 items-center justify-center bg-ink-50 px-4" aria-hidden>
              <TestPreview id={t.id ?? ""} />
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="font-semibold text-ink-900">{t.name}</p>
              <p className="mt-1 text-xs text-fg-subtle tabular">
                {t.questions ? `${t.questions} questions · ` : ""}
                {t.timed ? `${mins(t)} min, timed` : `about ${t.minutes} min, no time limit`}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2">
                {t.done ? (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-success-700">
                    <CircleCheck className="size-4" aria-hidden />
                    Done
                  </span>
                ) : (
                  <>
                    <span className="text-xs text-fg-muted">{t.saved ? `Saved · ${t.saved} answered` : t === next ? "Suggested next" : ""}</span>
                    <Button size="sm" variant={t === next ? "primary" : "secondary"} disabled={waiting} onClick={() => t.id && onStart(t.id)}>
                      {t.saved ? "Continue" : "Start"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** A small, decorative picture of what a test's questions look like, for its card. */
function TestPreview({ id }: { id: string }) {
  const g = (shape: Glyph["shape"], fill: Glyph["fill"], extra: Partial<Glyph> = {}): Glyph[] => [{ shape, fill, ...extra }];
  const figure: Figure | null = id.startsWith("tst_num")
    ? { kind: "bars", title: "", unit: "", categories: ["", "", "", ""], series: [{ name: "", values: [40, 65, 52, 80] }] }
    : id === "tst_inductive"
      ? { kind: "series", cells: [g("arrow", "solid"), g("arrow", "solid", { rot: 90 }), g("arrow", "solid", { rot: 180 }), null] }
      : id === "tst_mechanical"
        ? { kind: "gears", teeth: [20, 12, 16], driver: "cw" }
        : id === "tst_spatial"
          ? { kind: "shape", cells: [[0, 0], [1, 0], [1, 1], [2, 1], [1, 2]] }
          : id === "tst_checking"
            ? { kind: "pair", left: "ZW-4471-BQ", right: "ZW-4471-B0" }
            : null;
  if (figure?.kind === "bars")
    return (
      <span className="flex h-16 items-end gap-2">
        {[40, 65, 52, 80].map((v, i) => (
          <span key={i} className={cn("w-5 rounded-t-sm", i === 3 ? "bg-primary-600" : "bg-primary-300")} style={{ height: `${v}%` }} />
        ))}
      </span>
    );
  if (figure?.kind === "pair") return <span className="font-mono text-sm leading-6 text-ink-700">ZW-4471-BQ<br />ZW-4471-B0</span>;
  if (figure) return <TestFigure figure={figure} compact className={figure.kind === "shape" ? "h-20 w-auto" : "h-20 w-auto max-w-full"} />;
  if (/sjt/.test(id))
    return (
      <span className="flex w-full max-w-[12rem] flex-col gap-1.5">
        <span className="h-2 w-4/5 rounded-full bg-ink-300" />
        {[3, 1, 4, 2].map((e, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="h-1.5 flex-1 rounded-full bg-ink-200" />
            {[1, 2, 3, 4].map((k) => (
              <span key={k} className={cn("size-2 rounded-full", k === e ? "bg-primary-600" : "bg-ink-200")} />
            ))}
          </span>
        ))}
      </span>
    );
  if (/big_five|six_factor|work_styles|integrity|ei|motivation/.test(id))
    return (
      <span className="flex items-center gap-2">
        {[0, 1, 2, 3, 4].map((k) => (
          <span key={k} className={cn("rounded-full", k === 3 ? "size-5 bg-primary-600" : "size-4 bg-ink-200")} />
        ))}
      </span>
    );
  if (id === "tst_excel")
    return (
      <span className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line bg-line">
        {Array.from({ length: 9 }, (_, k) => (
          <span key={k} className={cn("h-4 w-10", k < 3 ? "bg-ink-100" : k === 7 ? "bg-primary-100" : "bg-surface")} />
        ))}
      </span>
    );
  return (
    <span className="flex w-full max-w-[12rem] flex-col gap-1.5">
      <span className="h-2 w-full rounded-full bg-ink-300" />
      <span className="h-2 w-11/12 rounded-full bg-ink-200" />
      <span className="h-2 w-4/5 rounded-full bg-ink-200" />
      <span className="mt-1 flex gap-1.5">
        {["True", "False", "?"].map((x, k) => (
          <span key={x} className={cn("h-4 flex-1 rounded-sm", k === 0 ? "bg-primary-600" : "bg-ink-200")} />
        ))}
      </span>
    </span>
  );
}

/** What recording means for this candidate, and their yes or no. Either answer is fine. */
function RecordingChoice({ access, value, onChange }: { access: CandidateTestAccess; value: "agree" | "decline" | null; onChange: (v: "agree" | "decline") => void }) {
  const rec = access.recording!;
  const what = rec.mode === "photos" ? "a photo of you every 20 seconds" : rec.audio ? "video and sound of you" : "video of you, without sound";
  const org = access.organisationName;
  return (
    <fieldset className="rounded-md border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-fg">Recording during your tests</legend>
      <div className="text-sm leading-relaxed text-fg-muted">
        <p>
          {org} records {what} through your camera while the scored questions are open, not during practice. It helps them check that the work is your own.
        </p>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
          <li>Only people at {org} who can see your test results can watch it. Each viewing is logged, and it can&apos;t be downloaded.</li>
          <li>
            It&apos;s deleted {rec.keepDays} days after your application closes, and at the latest six months after your tests. You can ask {org} to delete it
            sooner.
          </li>
          <li>You can say no. {org} will arrange another way for you to take the tests, and saying no won&apos;t count against you.</li>
        </ul>
      </div>
      <div role="radiogroup" aria-label="Recording during your tests" className="mt-4 flex flex-col gap-2 sm:flex-row">
        {(
          [
            ["agree", "I agree to be recorded"],
            ["decline", "I'd rather not be recorded"],
          ] as const
        ).map(([v, label]) => (
          <label
            key={v}
            className={cn(
              "flex flex-1 cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm font-medium",
              value === v ? "border-primary-500 bg-primary-50 text-fg" : "border-line text-fg-muted hover:bg-ink-50",
            )}
          >
            <input type="radio" name="recording-choice" checked={value === v} onChange={() => onChange(v)} className="accent-primary-600" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function StatusCard({ tone, icon, title, body }: { tone: "danger" | "success"; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Panel>
      <div
        className={cn(
          "mb-4 grid size-10 place-items-center rounded-md border [&_svg]:size-5",
          tone === "danger" ? "border-danger-100 bg-danger-50 text-danger-700" : "border-success-100 bg-success-50 text-success-700",
        )}
      >
        {icon}
      </div>
      <h1 className="text-xl font-bold text-fg">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
    </Panel>
  );
}

function LoadingCard() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-7" aria-busy="true" aria-label="Loading your invitation">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="mt-4 h-28 w-full" />
    </div>
  );
}

