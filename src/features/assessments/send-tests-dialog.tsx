"use client";

import * as React from "react";
import { ArrowLeft, ChatText, Check, Mail, Send } from "@/components/icons";
import { Alert, Avatar, Button, Checkbox, Field, Input, Modal, ModalContent, Select, Skeleton, Textarea, toast } from "@/components/ui";
import { services, MOCK_NOW, deadlineIn, type SendResult } from "@/services";
import type { CandidateProfile } from "@/types";
import type { Battery, Channel, LanguageCode, Test } from "@/types/psychometrics";
import { cn } from "@/lib/utils";
import { FAMILY_SHORT, day } from "./meta";

export interface SendTarget {
  candidateId: string;
  vacancyId: string;
  name: string;
  vacancyTitle: string;
}

type Step = "who" | "tests" | "delivery" | "preview";
const LANGS: { value: LanguageCode; label: string }[] = [
  { value: "en", label: "English" },
  { value: "sn", label: "Shona (instructions)" },
  { value: "nd", label: "Ndebele (instructions)" },
  { value: "zu", label: "isiZulu (instructions)" },
  { value: "af", label: "Afrikaans (instructions)" },
  { value: "tn", label: "Setswana (instructions)" },
  { value: "bem", label: "Bemba (instructions)" },
];
const toDate = (iso: string) => iso.slice(0, 10);
const NOW = new Date(MOCK_NOW);

export function SendTestsDialog({
  open,
  onOpenChange,
  targets: given,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Pre-selected candidates. When empty, the first step asks who to send to. */
  targets?: SendTarget[];
  onSent?: (r: SendResult) => void;
}) {
  const [step, setStep] = React.useState<Step>("tests");
  const [people, setPeople] = React.useState<CandidateProfile[] | null>(null);
  const [batteries, setBatteries] = React.useState<Battery[]>([]);
  const [vacancyBattery, setVacancyBattery] = React.useState<Record<string, { battery: string | null; deadlineDays: number }>>({});
  const [library, setLibrary] = React.useState<Test[]>([]);
  const [targets, setTargets] = React.useState<SendTarget[]>([]);
  const [mode, setMode] = React.useState<"battery" | "tests">("battery");
  const [batteryId, setBatteryId] = React.useState("");
  const [testIds, setTestIds] = React.useState<string[]>([]);
  const [deadline, setDeadline] = React.useState(toDate(deadlineIn(5)));
  const [channels, setChannels] = React.useState<Channel[]>(["email", "sms"]);
  const [language, setLanguage] = React.useState<LanguageCode>("en");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset for each opening
    setTargets(given ?? []);
    setStep(given?.length ? "tests" : "who");
    setError(null);
    setMessage("");
    setTestIds([]);
    setMode("battery");
    setChannels(["email", "sms"]);
    setLanguage("en");
    Promise.all([services.assessments.batteries(), services.assessments.library(), services.vacancies.list()]).then(([b, lib, vacs]) => {
      setBatteries(b);
      setLibrary(lib.tests);
      setVacancyBattery(Object.fromEntries(vacs.map((v) => [v.id, v.assessment])));
      const vacancyBattery = given?.length ? vacs.find((v) => v.id === given[0]!.vacancyId)?.assessment : null;
      setBatteryId(vacancyBattery?.battery ?? b[0]?.id ?? "");
      setDeadline(toDate(deadlineIn(vacancyBattery?.deadlineDays ?? 5)));
    });
    if (!given?.length) services.profiles.list().then(setPeople);
    // Read `given` only when the dialog opens, so callers can pass a fresh array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const battery = batteries.find((b) => b.id === batteryId);
  const chosen = mode === "battery" ? (battery?.components.filter((c) => !c.optional).map((c) => c.testId) ?? []) : testIds;
  const chosenTests = chosen.map((id) => library.find((t) => t.id === id)).filter((t): t is Test => !!t);
  const minutes = chosenTests.reduce((s, t) => s + t.medianCompletionMin, 0);
  const vacancyTitles = [...new Set(targets.map((t) => t.vacancyTitle))];

  const next = () => {
    setError(null);
    if (step === "who") {
      if (!targets.length) return setError("Choose at least one candidate.");
      // Default to the first candidate's vacancy battery and deadline.
      const a = vacancyBattery[targets[0]!.vacancyId];
      if (a?.battery) setBatteryId(a.battery);
      if (a) setDeadline(toDate(deadlineIn(a.deadlineDays)));
      return setStep("tests");
    }
    if (step === "tests") {
      if (!chosen.length) return setError(mode === "battery" ? "Choose a battery." : "Choose at least one test.");
      return setStep("delivery");
    }
    if (step === "delivery") {
      const d = new Date(`${deadline}T17:00:00+02:00`);
      if (Number.isNaN(d.getTime())) return setError("Choose a deadline.");
      if (d.getTime() - NOW.getTime() < 24 * 3600000) return setError("Give candidates at least 24 hours. Most need 3 to 7 days.");
      if (d.getTime() - NOW.getTime() > 30 * 86400000) return setError("Keep the deadline within 30 days, so results are still current.");
      if (!channels.length) return setError("Choose email, SMS or both.");
      return setStep("preview");
    }
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await services.assessments.send({
        targets: targets.map((t) => ({ candidateId: t.candidateId, vacancyId: t.vacancyId })),
        batteryId: mode === "battery" ? batteryId : null,
        testIds: mode === "battery" ? [] : testIds,
        deadline: new Date(`${deadline}T17:00:00+02:00`).toISOString(),
        channels,
        language,
        message,
      });
      if (r.sent.length) {
        toast.success(
          `Tests sent to ${r.sent.length} ${r.sent.length === 1 ? "candidate" : "candidates"}`,
          r.skipped.length ? `${r.skipped.length} skipped: ${r.skipped.map((s) => `${s.name.split(" ")[0]} ${s.reason}`).join("; ")}` : `Due ${day(`${deadline}T17:00:00+02:00`)}`,
        );
      } else toast.warning("No tests sent", r.skipped.map((s) => `${s.name}: ${s.reason}`).join("; "));
      onSent?.(r);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The tests could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  const STEPS: Step[] = given?.length ? ["tests", "delivery", "preview"] : ["who", "tests", "delivery", "preview"];
  const index = STEPS.indexOf(step);
  const first = targets[0];

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="lg"
        title="Send psychometric tests"
        description={
          targets.length
            ? `${targets.length === 1 ? first!.name : `${targets.length} candidates`} · ${vacancyTitles.join(", ")}`
            : "Choose candidates, tests and a deadline. You'll see the invitation before it goes."
        }
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-xs text-fg-subtle tabular">
              Step {index + 1} of {STEPS.length}
            </span>
            <div className="flex gap-2">
              {index > 0 && (
                <Button variant="ghost" onClick={() => setStep(STEPS[index - 1]!)}>
                  <ArrowLeft />
                  Back
                </Button>
              )}
              {step === "preview" ? (
                <Button onClick={send} loading={busy}>
                  <Send />
                  Send to {targets.length} {targets.length === 1 ? "candidate" : "candidates"}
                </Button>
              ) : (
                <Button onClick={next}>Continue</Button>
              )}
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {error && (
            <Alert tone="danger" title="Check this step">
              {error}
            </Alert>
          )}

          {step === "who" && <WhoStep people={people} targets={targets} onChange={setTargets} />}

          {step === "tests" && (
            <div className="flex flex-col gap-4">
              <div role="radiogroup" aria-label="What to send" className="inline-flex self-start rounded-md bg-ink-100 p-0.5">
                {(["battery", "tests"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => setMode(m)}
                    className={cn("h-7 rounded-sm px-3 text-xs font-semibold", mode === m ? "bg-surface text-fg shadow-sm" : "text-fg-muted")}
                  >
                    {m === "battery" ? "A battery" : "Individual tests"}
                  </button>
                ))}
              </div>
              {batteries.length === 0 ? (
                <Skeleton className="h-48 rounded-md" />
              ) : mode === "battery" ? (
                <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1" role="radiogroup" aria-label="Battery">
                  {batteries.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={batteryId === b.id}
                        onClick={() => setBatteryId(b.id)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-md border px-3.5 py-3 text-left transition-colors",
                          batteryId === b.id ? "border-primary-500 bg-primary-50/50 ring-3 ring-primary-500/15" : "border-line hover:border-ink-400",
                        )}
                      >
                        <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border", batteryId === b.id ? "border-primary-600" : "border-ink-400")}>
                          {batteryId === b.id && <span className="size-2 rounded-full bg-primary-600" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <span className="text-sm font-semibold text-fg">{b.label}</span>
                            <span className="text-xs text-fg-subtle tabular">about {b.totalMinutes} min</span>
                          </span>
                          <span className="block text-xs text-fg-muted">{b.description}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="flex max-h-80 flex-col overflow-y-auto rounded-md border border-line">
                  {library.map((t) => (
                    <li key={t.id} className="border-b border-line last:border-b-0">
                      <label className="flex cursor-pointer items-start gap-3 px-3.5 py-2.5 hover:bg-surface-muted">
                        <Checkbox
                          checked={testIds.includes(t.id)}
                          onCheckedChange={(v) => setTestIds((ids) => (v === true ? [...ids, t.id] : ids.filter((x) => x !== t.id)))}
                          className="mt-0.5"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-fg">{t.name}</span>
                          <span className="block text-xs text-fg-subtle">
                            {FAMILY_SHORT[t.family]} · {t.timeLimitMin ? `${t.timeLimitMin} min timed` : `untimed, ~${t.medianCompletionMin} min`}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {chosenTests.length > 0 && (
                <p className="text-xs text-fg-muted">
                  {chosenTests.length} {chosenTests.length === 1 ? "test" : "tests"}, about {minutes} minutes in total. Candidates can take them in one sitting or separately.
                </p>
              )}
            </div>
          )}

          {step === "delivery" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Deadline" required hint="Closes at 17:00 on this day. 3 to 7 days works best.">
                <Input type="date" value={deadline} min={toDate(deadlineIn(1))} onChange={(e) => setDeadline(e.target.value)} />
              </Field>
              <Field label="Instructions language" hint="Test items stay in the language they were validated in.">
                <Select value={language} onValueChange={(v) => setLanguage(v as LanguageCode)} options={LANGS} />
              </Field>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <p className="text-sm font-semibold text-fg">Send by</p>
                <div className="flex flex-wrap gap-4">
                  {(
                    [
                      ["email", "Email"],
                      ["sms", "SMS"],
                      ["whatsapp", "WhatsApp (if opted in)"],
                    ] as const
                  ).map(([c, label]) => (
                    <label key={c} className="flex items-center gap-2 text-sm text-fg">
                      <Checkbox checked={channels.includes(c)} onCheckedChange={(v) => setChannels((s) => (v === true ? [...s, c] : s.filter((x) => x !== c)))} />
                      {label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-fg-subtle">Reminders go out automatically 48 and 24 hours before the deadline.</p>
              </div>
              <Field label="Personal note" optional className="sm:col-span-2" hint="Added to the email under the standard instructions.">
                <Textarea rows={2} maxLength={400} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Thanks for your interest in the role. These tests help us prepare for your interview." />
              </Field>
            </div>
          )}

          {step === "preview" && first && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              {channels.includes("email") && (
                <section aria-label="Email preview" className="rounded-md border border-line">
                  <p className="flex items-center gap-1.5 border-b border-line px-4 py-2 text-xs font-semibold text-fg-subtle">
                    <Mail className="size-3.5" aria-hidden />
                    Email to {first.name}
                    {targets.length > 1 && ` and ${targets.length - 1} more`}
                  </p>
                  <div className="px-4 py-4 text-sm leading-relaxed text-fg">
                    <p className="font-semibold">Your assessments for {first.vacancyTitle} at Msasa Financial Group</p>
                    <p className="mt-3">Dear {first.name.split(" ")[0]},</p>
                    <p className="mt-2 text-fg-muted">
                      As the next step in your application, please complete {chosenTests.length === 1 ? "a short online test" : `${chosenTests.length} short online tests`} by{" "}
                      <span className="font-semibold text-fg">{day(`${deadline}T17:00:00+02:00`)} at 17:00</span>. They take about {minutes} minutes in total, and you can do {chosenTests.every((t) => t.mobileSupported) ? "them on a phone or computer" : "most on a phone, but you'll need a computer for some"}.
                    </p>
                    {message.trim() && <p className="mt-2 text-fg-muted">{message.trim()}</p>}
                    <ul className="mt-2 list-disc pl-5 text-fg-muted">
                      {chosenTests.map((t) => (
                        <li key={t.id}>
                          {t.name.replace(/ · .*$/, "")} ({t.timeLimitMin ? `${t.medianCompletionMin} min` : "untimed"})
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3">
                      <span className="inline-flex h-9 items-center rounded-md bg-primary-600 px-4 text-sm font-semibold text-white">Start your assessments</span>
                    </p>
                    <p className="mt-3 text-xs text-fg-subtle">
                      Need extra time or another adjustment? Reply before you start. Your results are used with your CV and interviews, never on their own.
                    </p>
                  </div>
                </section>
              )}
              <div className="flex flex-col gap-4">
                {(channels.includes("sms") || channels.includes("whatsapp")) && (
                  <section aria-label="SMS preview" className="rounded-md border border-line">
                    <p className="flex items-center gap-1.5 border-b border-line px-4 py-2 text-xs font-semibold text-fg-subtle">
                      <ChatText className="size-3.5" aria-hidden />
                      {channels.includes("sms") ? "SMS" : "WhatsApp"} · {146 + first.name.split(" ")[0]!.length} characters
                    </p>
                    <p className="px-4 py-3 text-sm text-fg-muted">
                      Msasa Financial: Hi {first.name.split(" ")[0]}, please complete your {first.vacancyTitle} assessments (~{minutes} min) by {day(`${deadline}T17:00:00+02:00`)} 17:00: vettly.app/t/•••••
                    </p>
                  </section>
                )}
                <section className="rounded-md bg-ink-50 px-4 py-3 text-xs text-fg-muted">
                  <p className="font-semibold text-fg">Before you send</p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {["Candidates see a consent and data-use notice first.", "Accommodations such as extra time can be requested before starting.", "Results inform decisions. Nobody is rejected on test scores alone.", "This send is recorded in each invitation's audit log."].map((x) => (
                      <li key={x} className="flex gap-1.5">
                        <Check className="mt-0.5 size-3 shrink-0 text-success-600" aria-hidden />
                        {x}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}

function WhoStep({ people, targets, onChange }: { people: CandidateProfile[] | null; targets: SendTarget[]; onChange: (t: SendTarget[]) => void }) {
  const [query, setQuery] = React.useState("");
  if (!people) return <Skeleton className="h-64 rounded-md" />;
  const rows = people
    .flatMap((c) => c.applications.filter((a) => !["rejected", "withdrawn", "hired"].includes(a.stage)).map((a) => ({ c, a })))
    .filter(({ c, a }) => !query || `${c.name} ${a.vacancyTitle}`.toLowerCase().includes(query.toLowerCase()));
  const has = (cid: string, vid: string) => targets.some((t) => t.candidateId === cid && t.vacancyId === vid);
  return (
    <div className="flex flex-col gap-3">
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search candidates or vacancies" aria-label="Search candidates" />
      <ul className="flex max-h-80 flex-col overflow-y-auto rounded-md border border-line">
        {rows.map(({ c, a }) => (
          <li key={a.id} className="border-b border-line last:border-b-0">
            <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-surface-muted">
              <Checkbox
                checked={has(c.id, a.vacancyId)}
                onCheckedChange={(v) =>
                  onChange(v === true ? [...targets, { candidateId: c.id, vacancyId: a.vacancyId, name: c.name, vacancyTitle: a.vacancyTitle }] : targets.filter((t) => !(t.candidateId === c.id && t.vacancyId === a.vacancyId)))
                }
              />
              <Avatar name={c.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{c.name}</span>
                <span className="block truncate text-xs text-fg-subtle">{a.vacancyTitle}</span>
              </span>
            </label>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-fg-subtle">No candidates match.</li>}
      </ul>
      {targets.length > 0 && <p className="text-xs text-fg-muted">{targets.length} selected</p>}
    </div>
  );
}
