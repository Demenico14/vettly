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
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
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
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">
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
            {phase === "consent" && <Consent access={access} onNext={() => setPhase("ready")} />}
            {phase === "ready" && (
              <Ready
                access={access}
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

function Consent({ access, onNext }: { access: CandidateTestAccess; onNext: () => void }) {
  const [checks, setChecks] = React.useState({ data: false, own: false });
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
        {error && (
          <p className="text-xs font-medium text-danger-700" role="alert">
            Tick both boxes to continue. If you have questions, reply to your invitation email.
          </p>
        )}
      </div>
      <Button
        size="lg"
        className="mt-7 w-full sm:w-auto"
        loading={busy}
        onClick={async () => {
          if (!checks.data || !checks.own) {
            setError(true);
            return;
          }
          setBusy(true);
          await services.candidateAccess.recordConsent(access.token);
          onNext();
        }}
      >
        Agree and continue
      </Button>
    </Panel>
  );
}

function Ready({ access, onStart }: { access: CandidateTestAccess; onStart: (testId: string) => void }) {
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
      <ul className="mt-6 flex flex-col divide-y divide-line rounded-md border border-line">
        {access.tests.map((t) => (
          <li key={t.id ?? t.name} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">{t.name}</p>
              <p className="text-xs text-fg-subtle">
                {t.done ? "Finished" : t.saved ? `Saved part-way · ${t.saved} answered` : t.timed ? `${mins(t)} min, timed` : `About ${t.minutes} min, no time limit`}
              </p>
            </div>
            {t.done ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success-700">
                <CircleCheck className="size-4" aria-hidden />
                Done
              </span>
            ) : (
              <Button size="sm" variant={t === next ? "primary" : "secondary"} onClick={() => t.id && onStart(t.id)}>
                {t.saved ? "Continue" : "Start"}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Panel>
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

