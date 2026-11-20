"use client";

import * as React from "react";
import { Phone, Sparkles, TriangleAlert, UsersRound, Video } from "@/components/icons";
import { Alert, Button, Checkbox, Combobox, Field, Input, Modal, ModalClose, ModalContent, Select, Skeleton, Textarea, toast } from "@/components/ui";
import { services, MY_INTERVIEWER_ID, harare, partsOf, type Conflict } from "@/services";
import type { CandidateProfile } from "@/types";
import type { InterviewFormat, InterviewKind, Interviewer, PanelMember, QuestionSet } from "@/types/interviews";
import { cn } from "@/lib/utils";
import { KIND, dayShort, time } from "./meta";

export interface SchedulePreset {
  candidateId: string;
  vacancyId: string;
}

const DEFAULT_LOCATION: Record<InterviewFormat, string> = {
  "In person": "Msasa House, 2nd floor meeting room, Harare",
  Video: "Microsoft Teams (link created when you schedule)",
  Phone: "",
};

const STAGE_GROUP: Record<string, string> = { offer: "At offer", interview: "Interviewing", assessment: "Testing", shortlisted: "Shortlisted", screening: "Screening", applied: "Applied" };

export function ScheduleDialog({
  open,
  onOpenChange,
  preset,
  onScheduled,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  preset?: SchedulePreset;
  onScheduled?: (id: string) => void;
}) {
  const [people, setPeople] = React.useState<CandidateProfile[] | null>(null);
  const [ivrs, setIvrs] = React.useState<Interviewer[]>([]);
  const [sets, setSets] = React.useState<QuestionSet[]>([]);
  const [app, setApp] = React.useState("");
  const [kind, setKind] = React.useState<InterviewKind>("first_interview");
  const [round, setRound] = React.useState("First interview");
  const [setId, setSetId] = React.useState("");
  const [panel, setPanel] = React.useState<{ interviewerId: string; role: PanelMember["role"] }[]>([]);
  const [duration, setDuration] = React.useState(60);
  const [date, setDate] = React.useState("");
  const [start, setStart] = React.useState("10:00");
  const [format, setFormat] = React.useState<InterviewFormat>("Video");
  const [location, setLocation] = React.useState(DEFAULT_LOCATION.Video);
  const [message, setMessage] = React.useState("");
  const [slots, setSlots] = React.useState<string[]>([]);
  const [conflicts, setConflicts] = React.useState<Conflict[]>([]);
  const [anyway, setAnyway] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset each time the dialog opens
    setError(null);
    setAnyway(false);
    setMessage("");
    setPanel([{ interviewerId: MY_INTERVIEWER_ID, role: "lead" }]);
    setDate("");
    Promise.all([services.profiles.list(), services.interviews.interviewers(), services.interviews.questionSets()]).then(([p, i, q]) => {
      setPeople(p);
      setIvrs(i);
      setSets(q);
      const first = preset ? `${preset.candidateId}|${preset.vacancyId}` : "";
      setApp(first);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read preset only on open
  }, [open]);

  const [candidateId, vacancyId] = app.split("|");
  const candidate = people?.find((p) => p.id === candidateId);

  // Sensible defaults when the application or kind changes.
  React.useEffect(() => {
    if (!vacancyId || !sets.length) return;
    const match = sets.find((s) => s.vacancyId === vacancyId && s.kind === kind) ?? sets.find((s) => s.vacancyId === vacancyId) ?? sets.find((s) => s.kind === kind) ?? sets[0]!;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived default the user can still change
    setSetId(match.id);
  }, [vacancyId, kind, sets]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- default location follows the chosen format
    setLocation(format === "Phone" ? (candidate?.phone ?? "") : DEFAULT_LOCATION[format]);
  }, [format, candidate?.phone]);

  React.useEffect(() => {
    let alive = true;
    if (!candidateId || !panel.length) {
      Promise.resolve().then(() => alive && setSlots([]));
      return () => {
        alive = false;
      };
    }
    services.interviews.suggestSlots(panel.map((p) => p.interviewerId), candidateId, duration).then((s) => alive && setSlots(s));
    return () => {
      alive = false;
    };
  }, [candidateId, panel, duration]);

  const startsAt = date && start ? harare(date, start) : null;
  React.useEffect(() => {
    let alive = true;
    if (!startsAt || !candidateId) {
      Promise.resolve().then(() => alive && setConflicts([]));
      return () => {
        alive = false;
      };
    }
    services.interviews.conflicts(panel.map((p) => p.interviewerId), candidateId, startsAt, duration).then((c) => {
      if (!alive) return;
      setConflicts(c);
      setAnyway(false);
    });
    return () => {
      alive = false;
    };
  }, [startsAt, candidateId, panel, duration]);

  const toggle = (id: string) =>
    setPanel((p) => (p.some((x) => x.interviewerId === id) ? p.filter((x) => x.interviewerId !== id) : [...p, { interviewerId: id, role: p.some((x) => x.role === "lead") ? "member" : "lead" }]));

  const submit = async () => {
    setError(null);
    if (!candidateId) return setError("Choose the candidate and vacancy.");
    if (!panel.length) return setError("Add at least one interviewer.");
    if (!panel.some((p) => p.role === "lead")) return setError("Choose who leads the interview.");
    if (!startsAt) return setError("Choose a date and time.");
    if (conflicts.length && !anyway) return setError("Resolve the clashes, or confirm you want to schedule anyway.");
    setBusy(true);
    try {
      const iv = await services.interviews.schedule({
        candidateId,
        vacancyId: vacancyId!,
        round,
        kind,
        startsAt,
        durationMin: duration,
        format,
        location,
        panel,
        questionSetId: setId,
        message,
        acknowledgeConflicts: anyway,
      });
      toast.success("Interview scheduled", `${iv.candidateName} · ${dayShort(iv.startsAt)} ${time(iv.startsAt)}. Invitations sent to the candidate and panel.`);
      onScheduled?.(iv.id);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not scheduled.");
    } finally {
      setBusy(false);
    }
  };

  const ORDER = ["interview", "assessment", "shortlisted", "offer", "screening", "applied"];
  const options = (people ?? [])
    .flatMap((p) =>
      p.applications
        .filter((a) => ORDER.includes(a.stage))
        .map((a) => ({ value: `${p.id}|${a.vacancyId}`, label: p.name, description: a.vacancyTitle, group: STAGE_GROUP[a.stage], rank: ORDER.indexOf(a.stage) })),
    )
    .sort((x, y) => x.rank - y.rank || x.label.localeCompare(y.label));

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="lg"
        title="Schedule an interview"
        description="The candidate and panel get a calendar invitation. The candidate can accept or ask for another time."
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button onClick={submit} loading={busy}>
              Schedule and send invitations
            </Button>
          </>
        }
      >
        {!people ? (
          <Skeleton className="h-96 rounded-md" />
        ) : (
          <div className="flex flex-col gap-5">
            {error && (
              <Alert tone="danger" title="Not scheduled">
                {error}
              </Alert>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Candidate" required className="sm:col-span-2">
                <Combobox value={app} onValueChange={setApp} placeholder="Choose candidate and vacancy" searchPlaceholder="Search by name or vacancy" options={options} disabled={!!preset} />
              </Field>
              <Field label="Type">
                <Select
                  value={kind}
                  onValueChange={(v) => {
                    setKind(v as InterviewKind);
                    setRound(KIND[v as InterviewKind]);
                    setDuration(v === "screening_call" ? 30 : v === "technical" ? 90 : 60);
                  }}
                  options={Object.entries(KIND).map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Title" hint="What the candidate sees.">
                <Input value={round} onChange={(e) => setRound(e.target.value)} maxLength={60} />
              </Field>
              <Field label="Question set" className="sm:col-span-2" hint="You can add questions for this interview afterwards.">
                <Select value={setId} onValueChange={setSetId} options={sets.map((s) => ({ value: s.id, label: s.name, description: `${s.competencies.length} competencies${s.vacancyId ? "" : " · any vacancy"}` }))} />
              </Field>
            </div>

            <div>
              <p className="text-sm font-semibold text-fg">Panel</p>
              <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {ivrs.map((i) => {
                  const on = panel.find((p) => p.interviewerId === i.id);
                  return (
                    <li key={i.id} className={cn("flex items-center gap-3 rounded-md border px-3 py-2", on ? "border-primary-500/50 bg-primary-50/40" : "border-line")}>
                      <Checkbox checked={!!on} onCheckedChange={() => toggle(i.id)} aria-label={`Add ${i.name}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">
                          {i.name}
                          {i.id === MY_INTERVIEWER_ID && <span className="text-fg-subtle"> (you)</span>}
                        </span>
                        <span className="block truncate text-xs text-fg-subtle">
                          {i.title}
                          {!i.trained && " · not yet trained"}
                        </span>
                      </span>
                      {on && (
                        <select
                          aria-label={`${i.name}'s role`}
                          value={on.role}
                          onChange={(e) => setPanel((p) => p.map((x) => (x.interviewerId === i.id ? { ...x, role: e.target.value as PanelMember["role"] } : e.target.value === "lead" && x.role === "lead" ? { ...x, role: "member" } : x)))}
                          className="h-7 rounded-sm border border-line-strong bg-surface px-1.5 text-xs text-fg"
                        >
                          <option value="lead">Lead</option>
                          <option value="member">Member</option>
                          <option value="observer">Observer</option>
                        </select>
                      )}
                    </li>
                  );
                })}
              </ul>
              {panel.some((p) => !ivrs.find((i) => i.id === p.interviewerId)?.trained) && (
                <p className="mt-2 text-xs text-fg-muted">An untrained interviewer is on the panel. Pair them with a trained lead.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_8rem]">
              <Field label="Date" required className="col-span-2 sm:col-span-1">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Start" required>
                <Input type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="Length">
                <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))} options={[30, 45, 60, 90, 120].map((n) => ({ value: String(n), label: `${n} min` }))} />
              </Field>
            </div>
            {slots.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-fg-subtle">
                  <Sparkles className="size-3.5" aria-hidden />
                  Free for everyone on the panel
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {slots.map((s) => {
                    const p = partsOf(s);
                    const on = p.date === date && p.time === start;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setDate(p.date);
                          setStart(p.time);
                        }}
                        className={cn("pressable rounded-full border px-3 py-1 text-xs font-medium", on ? "border-primary-600 bg-primary-600 text-white" : "border-line-strong text-fg-muted hover:border-ink-400 hover:text-fg")}
                      >
                        {dayShort(s)}, {time(s)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {conflicts.length > 0 && (
              <div className="rounded-md border border-warning-100 bg-warning-50 px-4 py-3 text-sm text-warning-700">
                <p className="flex items-center gap-1.5 font-semibold">
                  <TriangleAlert className="size-4" aria-hidden />
                  {conflicts.length} clash{conflicts.length > 1 ? "es" : ""} at this time
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {conflicts.map((c, i) => (
                    <li key={i}>
                      {c.who}: {c.what}
                    </li>
                  ))}
                </ul>
                <label className="mt-2 flex items-center gap-2 font-medium">
                  <Checkbox checked={anyway} onCheckedChange={(v) => setAnyway(v === true)} />
                  Schedule anyway
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
              <div>
                <p className="mb-1.5 text-sm font-semibold text-fg">Format</p>
                <div role="radiogroup" aria-label="Format" className="inline-flex rounded-md bg-ink-100 p-0.5">
                  {(
                    [
                      ["In person", UsersRound],
                      ["Video", Video],
                      ["Phone", Phone],
                    ] as const
                  ).map(([f, Icon]) => (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={format === f}
                      onClick={() => setFormat(f)}
                      className={cn("inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-xs font-semibold", format === f ? "bg-surface text-fg shadow-sm" : "text-fg-muted")}
                    >
                      <Icon className="size-3.5" aria-hidden />
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <Field label={format === "Phone" ? "Number to call" : format === "Video" ? "Meeting" : "Place"} required>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </Field>
            </div>
            <Field label="Note to the candidate" optional hint="Added to the invitation, e.g. what to bring or prepare.">
              <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Please bring your ID. Reception will bring you up to the 2nd floor." />
            </Field>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
