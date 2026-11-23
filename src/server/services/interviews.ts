import "server-only";
import { refreshWrittenQuestions, writtenQuestions } from "./interview-questions";
import { orgEmail } from "../org-mail";
import { ROLE_LABEL } from "@/lib/settings-defaults";
/**
 * Interviews service. Interviews are stored per organisation (see store.ts). Scheduling
 * checks interviewers' recurring commitments and other interviews; scorecards stay hidden from other
 * panellists until each person has submitted their own; the panel decision is recorded with a rationale and
 * can move the candidate in the pipeline. Times are Harare time (UTC+2).
 */
import type { ApplicationStage, AssessmentProvenance } from "@/types";
import type {
  DecisionOutcome,
  Interview,
  InterviewFormat,
  InterviewKind,
  Interviewer,
  PanelMember,
  Question,
  QuestionSet,
  Rating,
  Recommendation,
  Scorecard,
} from "@/types/interviews";
import { tests as catalogue } from "@/mocks/psychometrics";
import { BAND_LABEL } from "@/lib/psychometrics";
import { actor, actorName, context, newId, now, type RequestContext } from "../context";
import { collection } from "../store";
import { SCREENING_SET, vacancySet } from "../engine/question-sets";
import { profileSnapshot } from "./candidates";
import { vacancySnapshot } from "./vacancies";
import { invitationStore, scoreOf } from "./assessments";
import { pipelineService } from "./pipeline";
import { activeMembers } from "./settings";

/** A plain copy, so callers never hold the stored objects (store arrays are proxies, which structuredClone refuses). */
const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const nowMs = () => Date.now();
/** The signed-in person, as an interviewer (interviewer ids are user ids). */
const me = () => actor()?.userId ?? "";

const store = collection<Interview>("interview");
/** Interviewer details people have set: weekly commitments and structured-interview training. */
const interviewerProfiles = collection<{ id: string; busy: Interviewer["busy"]; trained: boolean }>("interviewer");

/** The organisation's active members as interviewers, loaded once per request. */
const roster = new WeakMap<RequestContext, Interviewer[]>();
async function loadInterviewers() {
  const members = await activeMembers();
  roster.set(
    context(),
    members.map((m) => {
      const p = interviewerProfiles.find((x) => x.id === m.id);
      return { id: m.id, name: m.name, title: m.title || ROLE_LABEL[m.role as keyof typeof ROLE_LABEL] || m.role, department: m.department, email: m.email, busy: p?.busy ?? [], trained: p?.trained ?? false };
    }),
  );
}
const interviewers = { find: (f: (i: Interviewer) => boolean) => (roster.get(context()) ?? []).find(f), all: () => roster.get(context()) ?? [] };

function questionSetsFor(): QuestionSet[] {
  const vacancies = vacancySnapshot().filter((v) => v.status !== "draft" && v.requirements.length);
  for (const v of vacancies) refreshWrittenQuestions(v);
  return [SCREENING_SET, ...vacancies.map((v) => vacancySet(v, writtenQuestions(v)))];
}
const setById = (id: string) => questionSetsFor().find((s) => s.id === id) ?? SCREENING_SET;

import { harare, partsOf } from "@/lib/workflow";
export { harare, partsOf };
const minutesOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/* ---------- Views ---------- */

export interface InterviewListItem {
  interview: Interview;
  panelNames: string[];
  myRole: PanelMember["role"] | null;
  /** The signed-in user owes a scorecard. */
  myScorecardDue: boolean;
  submitted: number;
  expected: number;
}

function listItem(iv: Interview): InterviewListItem {
  const scoring = iv.panel.filter((p) => p.role !== "observer");
  const mine = iv.panel.find((p) => p.interviewerId === me());
  const myCard = iv.scorecards.find((s) => s.interviewerId === me());
  return {
    interview: iv,
    panelNames: iv.panel.map((p) => nameOf(p.interviewerId)),
    myRole: mine?.role ?? null,
    myScorecardDue: iv.status === "completed" && !!mine && mine.role !== "observer" && myCard?.status !== "submitted",
    submitted: iv.scorecards.filter((s) => s.status === "submitted").length,
    expected: scoring.length,
  };
}

export const nameOf = (id: string) => interviewers.find((i) => i.id === id)?.name ?? "Former member";

export interface CandidateContext {
  headline: string;
  location: string;
  stage: ApplicationStage | null;
  applicationId: string | null;
  matchScore: number | null;
  provenance: AssessmentProvenance | null;
  email: string;
  phone: string;
  tests: { name: string; result: string }[];
  testsStatus: string | null;
  /** Probing questions suggested by extreme personality results (Module 9 interview guide). */
  probes: Question[];
}

function contextFor(iv: Interview): CandidateContext {
  const c = profileSnapshot().find((p) => p.id === iv.candidateId);
  const app = c?.applications.find((a) => a.vacancyId === iv.vacancyId) ?? null;
  const inv = invitationStore.filter((r) => r.candidateId === iv.candidateId && r.vacancyId === iv.vacancyId).at(-1);
  const tests: CandidateContext["tests"] = [];
  const probes: Question[] = [];
  for (const res of inv?.results ?? []) {
    const t = catalogue.find((x) => x.id === res.testId);
    if (!t) continue;
    const scored = scoreOf(res);
    const profile = ["personality", "integrity", "emotional_intelligence", "motivation"].includes(t.family);
    if (!profile) {
      tests.push({ name: t.name.replace(/ · .*$/, ""), result: `${scored[0]!.percentile}th percentile · ${BAND_LABEL[scored[0]!.band]}` });
      continue;
    }
    const high = scored.filter((s) => s.sten >= 8);
    const low = scored.filter((s) => s.sten <= 3);
    tests.push({ name: t.name, result: high.length || low.length ? `${high.length} high, ${low.length} low scales` : "Balanced profile" });
    for (const s of [...high, ...low].slice(0, 4)) {
      const sc = t.scales.find((x) => x.code === s.scale)!;
      const isHigh = s.sten >= 8;
      probes.push({
        id: `probe_${s.scale}`,
        text: isHigh ? `You describe yourself as strong on ${sc.name.toLowerCase()}. Tell us about a time that approach worked against you.` : `Tell us about a time the work needed you to be ${sc.high?.toLowerCase().replace(/\.$/, "") ?? sc.name.toLowerCase()}. How did you handle it?`,
        followUps: ["What did you learn, and what would you do differently?"],
        lookFor: [isHigh ? "Self-awareness about when the strength is overplayed" : "Practical ways of compensating"],
        redFlags: ["Can't give a real example"],
      });
    }
  }
  return {
    headline: c?.headline ?? "",
    location: c?.location ?? "",
    stage: app?.stage ?? null,
    applicationId: app?.id ?? null,
    matchScore: app?.matchScore ?? null,
    provenance: app?.provenance ?? null,
    email: c?.email ?? "",
    phone: c?.phone ?? "",
    tests,
    testsStatus: inv ? (inv.status === "completed" ? null : `Tests ${inv.status.replace("_", " ")}`) : "No tests sent",
    probes,
  };
}

/* ---------- Availability ---------- */

export interface Conflict {
  who: string;
  what: string;
}

function conflictsFor(panelIds: string[], candidateId: string, startsAt: string, durationMin: number, ignore?: string): Conflict[] {
  const start = new Date(startsAt).getTime();
  const end = start + durationMin * 60000;
  const { weekday, time } = partsOf(startsAt);
  const from = minutesOf(time);
  const to = from + durationMin;
  const out: Conflict[] = [];
  for (const id of panelIds) {
    const ivr = interviewers.find((i) => i.id === id);
    for (const b of ivr?.busy ?? []) {
      if (b.day === weekday && minutesOf(b.from) < to && minutesOf(b.to) > from) out.push({ who: ivr!.name, what: `${b.label}, ${b.from}–${b.to}` });
    }
  }
  for (const iv of store) {
    if (iv.id === ignore || iv.status !== "scheduled") continue;
    const s = new Date(iv.startsAt).getTime();
    const e = s + iv.durationMin * 60000;
    if (s >= end || e <= start) continue;
    for (const p of iv.panel) if (panelIds.includes(p.interviewerId)) out.push({ who: nameOf(p.interviewerId), what: `${iv.round} with ${iv.candidateName}` });
    if (iv.candidateId === candidateId) out.push({ who: iv.candidateName, what: `already has ${iv.round.toLowerCase()} at this time` });
  }
  return out;
}

/** Next free slots for the whole panel on working days, 08:00–17:00, in half-hour steps. */
function suggest(panelIds: string[], candidateId: string, durationMin: number, count = 3) {
  const slots: string[] = [];
  const day = new Date(nowMs() + 86400000);
  for (let d = 0; d < 14 && slots.length < count; d++) {
    const date = new Date(day.getTime() + d * 86400000);
    const iso = new Date(date.getTime() + 2 * 3600000).toISOString().slice(0, 10);
    const wd = new Date(`${iso}T12:00:00+02:00`).getUTCDay();
    if (wd === 0 || wd === 6) continue;
    for (let m = 8 * 60; m + durationMin <= 17 * 60 && slots.length < count; m += 30) {
      if (m >= 12 * 60 + 30 && m < 13 * 60 + 30) continue; // lunch
      const startsAt = harare(iso, `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
      if (conflictsFor(panelIds, candidateId, startsAt, durationMin).length === 0) {
        slots.push(startsAt);
        m += 120; // spread suggestions across the day
      }
    }
  }
  return slots;
}

/* ---------- Service ---------- */

export interface ScheduleInput {
  candidateId: string;
  vacancyId: string;
  round: string;
  kind: InterviewKind;
  startsAt: string;
  durationMin: number;
  format: InterviewFormat;
  location: string;
  panel: { interviewerId: string; role: PanelMember["role"] }[];
  questionSetId: string;
  message: string;
  /** Schedule even though someone has a clash. */
  acknowledgeConflicts: boolean;
}

export interface InterviewsService {
  list(): Promise<InterviewListItem[]>;
  get(id: string): Promise<{ item: InterviewListItem; interviewers: Interviewer[]; questionSet: QuestionSet; context: CandidateContext; scorecardsVisible: boolean }>;
  interviewers(): Promise<Interviewer[]>;
  questionSets(): Promise<QuestionSet[]>;
  conflicts(panelIds: string[], candidateId: string, startsAt: string, durationMin: number, ignore?: string): Promise<Conflict[]>;
  suggestSlots(panelIds: string[], candidateId: string, durationMin: number): Promise<string[]>;
  schedule(input: ScheduleInput): Promise<Interview>;
  reschedule(id: string, startsAt: string, reason: string, acknowledgeConflicts: boolean): Promise<Interview>;
  cancel(id: string, reason: string): Promise<Interview>;
  markNoShow(id: string, note: string): Promise<Interview>;
  markCompleted(id: string): Promise<Interview>;
  addQuestion(id: string, q: Question): Promise<Interview>;
  removeQuestion(id: string, questionId: string): Promise<Interview>;
  saveScorecard(id: string, draft: { ratings: Rating[]; recommendation: Recommendation | null; summary: string }, submit: boolean): Promise<Interview>;
  decide(id: string, outcome: DecisionOutcome, rationale: string, moveTo: ApplicationStage | null): Promise<Interview>;
}

function find(id: string) {
  const iv = store.find((x) => x.id === id);
  if (!iv) throw new Error("This interview could not be found.");
  return iv;
}
const log = (iv: Interview, text: string, by = actorName()) => iv.history.push({ at: now(), by, text });

export const interviewsService: InterviewsService = {
  async list() {
    await loadInterviewers();
    return clone([...store].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map(listItem));
  },
  async get(id) {
    await loadInterviewers();
    const iv = find(id);
    const mine = iv.scorecards.find((s) => s.interviewerId === me());
    const lead = iv.panel.find((p) => p.role === "lead")?.interviewerId === me();
    const allIn = iv.scorecards.every((s) => s.status === "submitted");
    // Independence: panellists see others' scores only after submitting their own (the lead and HR see them once all are in).
    const scorecardsVisible = !mine || mine.status === "submitted" || (lead && allIn) || !!iv.decision;
    const set = setById(iv.questionSetId);
    return clone({
      item: listItem(iv),
      interviewers: iv.panel.map((p) => interviewers.find((i) => i.id === p.interviewerId)!).filter(Boolean),
      questionSet: set,
      context: contextFor(iv),
      scorecardsVisible,
    });
  },
  async interviewers() {
    await loadInterviewers();
    return clone(interviewers.all());
  },
  async questionSets() {
    return clone(questionSetsFor());
  },
  async conflicts(panelIds, candidateId, startsAt, durationMin, ignore) {
    await loadInterviewers();
    return conflictsFor(panelIds, candidateId, startsAt, durationMin, ignore);
  },
  async suggestSlots(panelIds, candidateId, durationMin) {
    await loadInterviewers();
    return suggest(panelIds, candidateId, durationMin);
  },
  async schedule(input) {
    await loadInterviewers();
    if (!input.panel.length) throw new Error("Add at least one interviewer.");
    if (!input.panel.some((p) => p.role === "lead")) throw new Error("Choose who leads the interview.");
    if (new Date(input.startsAt).getTime() <= nowMs()) throw new Error("Choose a time in the future.");
    if (!input.location.trim()) throw new Error("Add a location, meeting link or phone number.");
    const clash = conflictsFor(input.panel.map((p) => p.interviewerId), input.candidateId, input.startsAt, input.durationMin);
    if (clash.length && !input.acknowledgeConflicts) throw new Error(`${clash.length} clash${clash.length > 1 ? "es" : ""}: ${clash.map((c) => `${c.who} (${c.what})`).join("; ")}`);
    const c = profileSnapshot().find((p) => p.id === input.candidateId);
    const app = c?.applications.find((a) => a.vacancyId === input.vacancyId);
    if (!c || !app) throw new Error("That candidate hasn't applied for this vacancy.");
    const iv: Interview = {
      id: newId("iv"),
      candidateId: c.id,
      candidateName: c.name,
      vacancyId: input.vacancyId,
      vacancyTitle: app.vacancyTitle,
      round: input.round.trim() || "Interview",
      kind: input.kind,
      startsAt: input.startsAt,
      durationMin: input.durationMin,
      format: input.format,
      location: input.location.trim(),
      meetingLink: input.format === "Video" && /^https?:\/\//.test(input.location.trim()) ? input.location.trim() : null,
      panel: input.panel.map((p) => ({ ...p, response: p.interviewerId === me() ? "accepted" : "pending" })),
      candidateResponse: "pending",
      questionSetId: input.questionSetId,
      extraQuestions: [],
      status: "scheduled",
      scorecards: input.panel.filter((p) => p.role !== "observer").map((p) => ({ interviewerId: p.interviewerId, status: "not_started", ratings: [], recommendation: null, summary: "", submittedAt: null }) as Scorecard),
      decision: null,
      createdBy: actorName(),
      history: [],
      isMock: true,
    };
    log(iv, clash.length ? `Scheduled despite ${clash.length} clash${clash.length > 1 ? "es" : ""}` : "Scheduled");
    if (input.message.trim()) log(iv, `Note to candidate: ${input.message.trim()}`);
    store.push(iv);
    const when = new Date(iv.startsAt).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Harare" });
    const panelNames = iv.panel.map((p) => nameOf(p.interviewerId)).join(", ");
    if (c.email) orgEmail({ to: c.email, subject: `Interview for ${iv.vacancyTitle}: ${when}`, text: `Dear ${c.name.split(" ")[0]},\n\nWe'd like to invite you to a ${iv.durationMin}-minute ${iv.round.toLowerCase()} for the ${iv.vacancyTitle} role.\n\nWhen: ${when} (Harare time)\nWhere: ${iv.location}\nWith: ${panelNames}\n${input.message.trim() ? `\n${input.message.trim()}\n` : ""}\nPlease reply to confirm, or to ask for another time.` });
    for (const p of iv.panel) {
      const who = interviewers.find((i) => i.id === p.interviewerId);
      if (who?.email && who.id !== me()) orgEmail({ to: who.email, subject: `Interview panel: ${c.name}, ${when}`, text: `${actorName()} added you to the panel for ${c.name}'s ${iv.round.toLowerCase()} (${iv.vacancyTitle}).\n\nWhen: ${when} (Harare time)\nWhere: ${iv.location}\nYour role: ${p.role}` });
    }
    return clone(iv);
  },
  async reschedule(id, startsAt, reason, acknowledgeConflicts) {
    await loadInterviewers();
    const iv = find(id);
    if (iv.status !== "scheduled") throw new Error("Only scheduled interviews can be moved.");
    if (!reason.trim()) throw new Error("Say why it's moving. The candidate and panel see the reason.");
    if (new Date(startsAt).getTime() <= nowMs()) throw new Error("Choose a time in the future.");
    const clash = conflictsFor(iv.panel.map((p) => p.interviewerId), iv.candidateId, startsAt, iv.durationMin, id);
    if (clash.length && !acknowledgeConflicts) throw new Error(`${clash.length} clash${clash.length > 1 ? "es" : ""}: ${clash.map((c) => `${c.who} (${c.what})`).join("; ")}`);
    const before = iv.startsAt;
    iv.startsAt = startsAt;
    iv.candidateResponse = "pending";
    iv.panel = iv.panel.map((p) => ({ ...p, response: p.interviewerId === me() ? "accepted" : "pending" }));
    delete iv.statusNote;
    log(iv, `Moved from ${before.slice(0, 16).replace("T", " ")}: ${reason.trim()}`);
    return clone(iv);
  },
  async cancel(id, reason) {
    const iv = find(id);
    if (iv.status !== "scheduled") throw new Error("Only scheduled interviews can be cancelled.");
    if (!reason.trim()) throw new Error("Give a reason. It's kept on the record.");
    iv.status = "cancelled";
    iv.statusNote = reason.trim();
    log(iv, `Cancelled: ${reason.trim()}`);
    return clone(iv);
  },
  async markNoShow(id, note) {
    const iv = find(id);
    if (new Date(iv.startsAt).getTime() > nowMs()) throw new Error("The interview hasn't started yet.");
    iv.status = "no_show";
    iv.statusNote = note.trim() || "Candidate did not attend.";
    log(iv, "Marked as no-show");
    return clone(iv);
  },
  async markCompleted(id) {
    const iv = find(id);
    if (new Date(iv.startsAt).getTime() > nowMs()) throw new Error("The interview hasn't happened yet.");
    iv.status = "completed";
    log(iv, "Marked as completed. Scorecards are now open.");
    return clone(iv);
  },
  async addQuestion(id, qn) {
    const iv = find(id);
    if (iv.extraQuestions.some((x) => x.id === qn.id)) return clone(iv);
    iv.extraQuestions.push(qn);
    log(iv, `Question added: ${qn.text.slice(0, 60)}…`);
    return clone(iv);
  },
  async removeQuestion(id, questionId) {
    const iv = find(id);
    iv.extraQuestions = iv.extraQuestions.filter((x) => x.id !== questionId);
    return clone(iv);
  },
  async saveScorecard(id, draft, submit) {
    const iv = find(id);
    const card = iv.scorecards.find((s) => s.interviewerId === me());
    if (!card) throw new Error("You're not scoring this interview.");
    if (card.status === "submitted") throw new Error("Your scorecard is already submitted.");
    if (submit) {
      if (iv.status === "cancelled") throw new Error("This interview was cancelled.");
      if (new Date(iv.startsAt).getTime() > nowMs()) throw new Error("Submit your scorecard after the interview. You can save a draft now.");
      const set = setById(iv.questionSetId);
      const missing = set.competencies.filter((c) => !draft.ratings.some((r) => r.competencyId === c.id && r.rating >= 1));
      if (missing.length) throw new Error(`Rate every competency first: ${missing.map((m) => m.name).join(", ")}.`);
      const thin = draft.ratings.filter((r) => r.evidence.trim().length < 15);
      if (thin.length) throw new Error("Add evidence for each rating: what the candidate said or did.");
      if (!draft.recommendation) throw new Error("Choose an overall recommendation.");
    }
    Object.assign(card, draft, { status: submit ? "submitted" : "draft", submittedAt: submit ? now() : null });
    if (submit) log(iv, "Scorecard submitted");
    return clone(iv);
  },
  async decide(id, outcome, rationale, moveTo) {
    await loadInterviewers();
    const iv = find(id);
    if (iv.status !== "completed") throw new Error("Record the decision after the interview has taken place.");
    if (!rationale.trim()) throw new Error("Explain the decision. It's part of the candidate's decision record.");
    const pending = iv.scorecards.filter((s) => s.status !== "submitted");
    if (pending.length) throw new Error(`Waiting for ${pending.length} scorecard${pending.length > 1 ? "s" : ""}: ${pending.map((s) => nameOf(s.interviewerId)).join(", ")}.`);
    iv.decision = { outcome, rationale: rationale.trim(), by: actorName(), at: now() };
    log(iv, `Panel decision: ${outcome}`);
    if (moveTo) {
      const app = profileSnapshot().find((p) => p.id === iv.candidateId)?.applications.find((a) => a.vacancyId === iv.vacancyId);
      if (app && app.stage !== moveTo) {
        const r = await pipelineService.move([{ candidateId: iv.candidateId, applicationId: app.id }], moveTo, `${iv.round}: ${rationale.trim()}`);
        if (r.moved) log(iv, `Candidate moved to ${moveTo}`);
        else if (r.skipped[0]) log(iv, `Not moved: ${r.skipped[0].reason}`);
      }
    }
    return clone(iv);
  },
};

/** Loads interviewer names for the dashboard's interview panel. */
export async function loadInterviewersForDashboard() {
  await loadInterviewers();
}

/** Upcoming interviews in the next week, for the dashboard. */
export function upcomingSlots(days = 7) {
  const until = nowMs() + days * 86400000;
  return store
    .filter((iv) => iv.status === "scheduled" && new Date(iv.startsAt).getTime() >= nowMs() - 3600000 && new Date(iv.startsAt).getTime() <= until)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
