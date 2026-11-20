/**
 * Interviews service (Module 10). Phase 1: an in-memory store seeded from src/mocks/interviews.ts. Scheduling
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
import { interviewRecords, interviewers, questionSets } from "@/mocks/interviews";
import { tests as catalogue } from "@/mocks/psychometrics";
import { MOCK_NOW } from "@/mocks/data";
import { BAND_LABEL } from "@/lib/psychometrics";
import { profileSnapshot } from "./candidates";
import { invitationStore, scoreOf } from "./assessments";
import { mockPipeline } from "./pipeline";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => structuredClone(v);
const NOW = new Date(MOCK_NOW).getTime();
/** The signed-in user (Tendai Moyo) as an interviewer. */
export const ME = "ivr_tendai";

const store: Interview[] = clone(interviewRecords);
const setStore: QuestionSet[] = clone(questionSets);
let seq = 0;

export const harare = (date: string, time: string) => `${date}T${time}:00+02:00`;
/** Date (YYYY-MM-DD) and time (HH:MM) of an ISO timestamp, in Harare. */
export function partsOf(iso: string) {
  const d = new Date(new Date(iso).getTime() + 2 * 3600000);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16), weekday: d.getUTCDay() };
}
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
  const mine = iv.panel.find((p) => p.interviewerId === ME);
  const myCard = iv.scorecards.find((s) => s.interviewerId === ME);
  return {
    interview: iv,
    panelNames: iv.panel.map((p) => nameOf(p.interviewerId)),
    myRole: mine?.role ?? null,
    myScorecardDue: iv.status === "completed" && !!mine && mine.role !== "observer" && myCard?.status !== "submitted",
    submitted: iv.scorecards.filter((s) => s.status === "submitted").length,
    expected: scoring.length,
  };
}

export const nameOf = (id: string) => interviewers.find((i) => i.id === id)?.name ?? id;

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
  const day = new Date(NOW + 86400000);
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
const log = (iv: Interview, text: string, by = nameOf(ME)) => iv.history.push({ at: MOCK_NOW, by, text });

export const mockInterviews: InterviewsService = {
  async list() {
    await wait(400);
    return clone([...store].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map(listItem));
  },
  async get(id) {
    await wait(350);
    const iv = find(id);
    const mine = iv.scorecards.find((s) => s.interviewerId === ME);
    const lead = iv.panel.find((p) => p.role === "lead")?.interviewerId === ME;
    const allIn = iv.scorecards.every((s) => s.status === "submitted");
    // Independence: panellists see others' scores only after submitting their own (the lead and HR see them once all are in).
    const scorecardsVisible = !mine || mine.status === "submitted" || (lead && allIn) || !!iv.decision;
    const set = setStore.find((s) => s.id === iv.questionSetId)!;
    return clone({
      item: listItem(iv),
      interviewers: iv.panel.map((p) => interviewers.find((i) => i.id === p.interviewerId)!).filter(Boolean),
      questionSet: set,
      context: contextFor(iv),
      scorecardsVisible,
    });
  },
  async interviewers() {
    await wait(200);
    return clone(interviewers);
  },
  async questionSets() {
    await wait(200);
    return clone(setStore);
  },
  async conflicts(panelIds, candidateId, startsAt, durationMin, ignore) {
    await wait(150);
    return conflictsFor(panelIds, candidateId, startsAt, durationMin, ignore);
  },
  async suggestSlots(panelIds, candidateId, durationMin) {
    await wait(300);
    return suggest(panelIds, candidateId, durationMin);
  },
  async schedule(input) {
    await wait(600);
    if (!input.panel.length) throw new Error("Add at least one interviewer.");
    if (!input.panel.some((p) => p.role === "lead")) throw new Error("Choose who leads the interview.");
    if (new Date(input.startsAt).getTime() <= NOW) throw new Error("Choose a time in the future.");
    if (!input.location.trim()) throw new Error("Add a location, meeting link or phone number.");
    const clash = conflictsFor(input.panel.map((p) => p.interviewerId), input.candidateId, input.startsAt, input.durationMin);
    if (clash.length && !input.acknowledgeConflicts) throw new Error(`${clash.length} clash${clash.length > 1 ? "es" : ""}: ${clash.map((c) => `${c.who} (${c.what})`).join("; ")}`);
    const c = profileSnapshot().find((p) => p.id === input.candidateId)!;
    const app = c.applications.find((a) => a.vacancyId === input.vacancyId)!;
    const iv: Interview = {
      id: `iv_new_${++seq}`,
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
      meetingLink: input.format === "Video" ? `https://teams.example/meet/msasa-${c.id.slice(4)}-${seq}` : null,
      panel: input.panel.map((p) => ({ ...p, response: p.interviewerId === ME ? "accepted" : "pending" })),
      candidateResponse: "pending",
      questionSetId: input.questionSetId,
      extraQuestions: [],
      status: "scheduled",
      scorecards: input.panel.filter((p) => p.role !== "observer").map((p) => ({ interviewerId: p.interviewerId, status: "not_started", ratings: [], recommendation: null, summary: "", submittedAt: null }) as Scorecard),
      decision: null,
      createdBy: nameOf(ME),
      history: [],
      isMock: true,
    };
    log(iv, clash.length ? `Scheduled despite ${clash.length} clash${clash.length > 1 ? "es" : ""}` : "Scheduled");
    if (input.message.trim()) log(iv, `Note to candidate: ${input.message.trim()}`);
    store.push(iv);
    return clone(iv);
  },
  async reschedule(id, startsAt, reason, acknowledgeConflicts) {
    await wait(500);
    const iv = find(id);
    if (iv.status !== "scheduled") throw new Error("Only scheduled interviews can be moved.");
    if (!reason.trim()) throw new Error("Say why it's moving. The candidate and panel see the reason.");
    if (new Date(startsAt).getTime() <= NOW) throw new Error("Choose a time in the future.");
    const clash = conflictsFor(iv.panel.map((p) => p.interviewerId), iv.candidateId, startsAt, iv.durationMin, id);
    if (clash.length && !acknowledgeConflicts) throw new Error(`${clash.length} clash${clash.length > 1 ? "es" : ""}: ${clash.map((c) => `${c.who} (${c.what})`).join("; ")}`);
    const before = iv.startsAt;
    iv.startsAt = startsAt;
    iv.candidateResponse = "pending";
    iv.panel = iv.panel.map((p) => ({ ...p, response: p.interviewerId === ME ? "accepted" : "pending" }));
    delete iv.statusNote;
    log(iv, `Moved from ${before.slice(0, 16).replace("T", " ")}: ${reason.trim()}`);
    return clone(iv);
  },
  async cancel(id, reason) {
    await wait(400);
    const iv = find(id);
    if (iv.status !== "scheduled") throw new Error("Only scheduled interviews can be cancelled.");
    if (!reason.trim()) throw new Error("Give a reason. It's kept on the record.");
    iv.status = "cancelled";
    iv.statusNote = reason.trim();
    log(iv, `Cancelled: ${reason.trim()}`);
    return clone(iv);
  },
  async markNoShow(id, note) {
    await wait(350);
    const iv = find(id);
    if (new Date(iv.startsAt).getTime() > NOW) throw new Error("The interview hasn't started yet.");
    iv.status = "no_show";
    iv.statusNote = note.trim() || "Candidate did not attend.";
    log(iv, "Marked as no-show");
    return clone(iv);
  },
  async markCompleted(id) {
    await wait(300);
    const iv = find(id);
    if (new Date(iv.startsAt).getTime() > NOW) throw new Error("The interview hasn't happened yet.");
    iv.status = "completed";
    log(iv, "Marked as completed. Scorecards are now open.");
    return clone(iv);
  },
  async addQuestion(id, qn) {
    await wait(250);
    const iv = find(id);
    if (iv.extraQuestions.some((x) => x.id === qn.id)) return clone(iv);
    iv.extraQuestions.push(qn);
    log(iv, `Question added: ${qn.text.slice(0, 60)}…`);
    return clone(iv);
  },
  async removeQuestion(id, questionId) {
    await wait(200);
    const iv = find(id);
    iv.extraQuestions = iv.extraQuestions.filter((x) => x.id !== questionId);
    return clone(iv);
  },
  async saveScorecard(id, draft, submit) {
    await wait(submit ? 600 : 300);
    const iv = find(id);
    const card = iv.scorecards.find((s) => s.interviewerId === ME);
    if (!card) throw new Error("You're not scoring this interview.");
    if (card.status === "submitted") throw new Error("Your scorecard is already submitted.");
    if (submit) {
      const set = setStore.find((s) => s.id === iv.questionSetId)!;
      const missing = set.competencies.filter((c) => !draft.ratings.some((r) => r.competencyId === c.id && r.rating >= 1));
      if (missing.length) throw new Error(`Rate every competency first: ${missing.map((m) => m.name).join(", ")}.`);
      const thin = draft.ratings.filter((r) => r.evidence.trim().length < 15);
      if (thin.length) throw new Error("Add evidence for each rating: what the candidate said or did.");
      if (!draft.recommendation) throw new Error("Choose an overall recommendation.");
    }
    Object.assign(card, draft, { status: submit ? "submitted" : "draft", submittedAt: submit ? MOCK_NOW : null });
    if (submit) log(iv, "Scorecard submitted");
    return clone(iv);
  },
  async decide(id, outcome, rationale, moveTo) {
    await wait(600);
    const iv = find(id);
    if (iv.status !== "completed") throw new Error("Record the decision after the interview has taken place.");
    if (!rationale.trim()) throw new Error("Explain the decision. It's part of the candidate's decision record.");
    const pending = iv.scorecards.filter((s) => s.status !== "submitted");
    if (pending.length) throw new Error(`Waiting for ${pending.length} scorecard${pending.length > 1 ? "s" : ""}: ${pending.map((s) => nameOf(s.interviewerId)).join(", ")}.`);
    iv.decision = { outcome, rationale: rationale.trim(), by: nameOf(ME), at: MOCK_NOW };
    log(iv, `Panel decision: ${outcome}`);
    if (moveTo) {
      const app = profileSnapshot().find((p) => p.id === iv.candidateId)?.applications.find((a) => a.vacancyId === iv.vacancyId);
      if (app && app.stage !== moveTo) {
        const r = await mockPipeline.move([{ candidateId: iv.candidateId, applicationId: app.id }], moveTo, `${iv.round}: ${rationale.trim()}`);
        if (r.moved) log(iv, `Candidate moved to ${moveTo}`);
        else if (r.skipped[0]) log(iv, `Not moved: ${r.skipped[0].reason}`);
      }
    }
    return clone(iv);
  },
};

/** Upcoming interviews in the next week, for the dashboard. */
export function upcomingSlots(days = 7) {
  const until = NOW + days * 86400000;
  return store
    .filter((iv) => iv.status === "scheduled" && new Date(iv.startsAt).getTime() >= NOW - 3600000 && new Date(iv.startsAt).getTime() <= until)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
