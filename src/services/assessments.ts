/**
 * Psychometric assessments service (Module 9). Phase 1: an in-memory store seeded from the mock database in
 * src/mocks/psychometrics, shared by the assessments screens, the pipeline, candidate profiles and the
 * candidate's own test link. Every send, reminder, extension, cancellation and review is written to the
 * invitation's audit log. Test results inform decisions; nothing here rejects a candidate.
 */
import type { ApplicationStage, TestInvitationSummary } from "@/types";
import type {
  Battery,
  BatteryComponent,
  Channel,
  InvitationRecord,
  LanguageCode,
  NormGroup,
  SampleItem,
  Test,
  TestResult,
} from "@/types/psychometrics";
import {
  batteries as seedBatteries,
  candidateFlow,
  families,
  invitationRecords,
  normGroups,
  normTables,
  rawAtPercentile,
  rawAtSten,
  sampleItems,
  scoreResult,
  tests,
  toSummary,
} from "@/mocks/psychometrics";
import { MOCK_NOW, users } from "@/mocks/data";
import { hashString } from "@/lib/utils";
import { profileSnapshot } from "./candidates";
import { vacancySnapshot } from "./vacancies";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => structuredClone(v);
const me = users[0]!.name;
const NOW = new Date(MOCK_NOW).getTime();

/** Shared invitation store. Read synchronously by the pipeline and candidate services. */
export const invitationStore: InvitationRecord[] = clone(invitationRecords);
const batteryStore: (Battery & { custom?: boolean; createdBy?: string })[] = clone(seedBatteries);
let seq = 0;

const OPEN: InvitationRecord["status"][] = ["sent", "opened", "in_progress"];

export function batteryById(id: string | null | undefined) {
  return batteryStore.find((b) => b.id === id);
}

/** Tests a candidate receives: required battery components plus any extras. */
export function testIdsFor(r: Pick<InvitationRecord, "batteryId" | "extraTests">) {
  const b = batteryById(r.batteryId);
  return [...new Set([...(b?.components.filter((c) => !c.optional).map((c) => c.testId) ?? []), ...r.extraTests])];
}

export function summaryOf(r: InvitationRecord): TestInvitationSummary {
  const b = batteryById(r.batteryId);
  const extras = r.extraTests.map((id) => tests.find((t) => t.id === id)?.shortName.toLowerCase()).filter(Boolean);
  return {
    ...toSummary(r),
    battery: b ? (extras.length ? `${b.label} + ${extras.join(", ")}` : b.label) : extras.length ? `Custom: ${extras.join(", ")}` : "Custom tests",
    total: testIdsFor(r).length,
  };
}

/** Latest invitation for a candidate and vacancy. */
export function latestFor(candidateId: string, vacancyId: string) {
  return invitationStore.filter((r) => r.candidateId === candidateId && r.vacancyId === vacancyId).sort((a, b) => a.sentAt.localeCompare(b.sentAt)).at(-1) ?? null;
}

/* ---------- Views ---------- */

export interface InvitationView {
  record: InvitationRecord;
  summary: TestInvitationSummary;
  testIds: string[];
  batteryLabel: string;
  stage: ApplicationStage | null;
  email: string | null;
  phone: string | null;
  /** Minutes from first start to last completion. */
  timeTakenMin: number | null;
  /** Hours until the deadline (negative once passed). */
  hoursLeft: number;
}

function view(r: InvitationRecord): InvitationView {
  const c = profileSnapshot().find((p) => p.id === r.candidateId);
  const app = c?.applications.find((a) => a.vacancyId === r.vacancyId);
  const starts = r.attempts.map((a) => new Date(a.startedAt).getTime());
  const ends = r.attempts.filter((a) => a.completedAt).map((a) => new Date(a.completedAt!).getTime());
  const taken = r.attempts.filter((a) => a.completedAt).reduce((s, a) => s + (new Date(a.completedAt!).getTime() - new Date(a.startedAt).getTime()) / 60000, 0);
  return {
    record: r,
    summary: summaryOf(r),
    testIds: testIdsFor(r),
    batteryLabel: batteryById(r.batteryId)?.label ?? summaryOf(r).battery,
    stage: app?.stage ?? null,
    email: c?.email ?? null,
    phone: c?.phone ?? null,
    timeTakenMin: ends.length && starts.length ? Math.round(taken) : null,
    hoursLeft: Math.round((new Date(r.deadline).getTime() - NOW) / 3600000),
  };
}

export type ScoredResult = TestResult & { scored: ReturnType<typeof scoreResult> };

/* ---------- Inputs ---------- */

export interface SendTarget {
  candidateId: string;
  vacancyId: string;
}

export interface SendInput {
  targets: SendTarget[];
  batteryId: string | null;
  /** Individual tests, used when no battery is chosen, or added to one. */
  testIds: string[];
  deadline: string;
  channels: Channel[];
  language: LanguageCode;
  message: string;
}

export interface BatteryDraft {
  id?: string;
  label: string;
  roleFamily: string;
  description: string;
  components: BatteryComponent[];
  deadlineDays: number;
}

export interface Undo {
  label: string;
  snapshot: InvitationRecord[];
}

export interface SendResult {
  sent: InvitationRecord[];
  skipped: { name: string; reason: string }[];
}

export interface AssessmentsService {
  library(): Promise<{ tests: Test[]; families: typeof families; normGroups: NormGroup[] }>;
  test(id: string): Promise<{ test: Test; norms: (NormGroup & { n: number; mean: number; sd: number })[]; items: SampleItem[]; usedIn: Battery[] }>;
  batteries(): Promise<(Battery & { custom?: boolean })[]>;
  saveBattery(draft: BatteryDraft): Promise<Battery>;
  deleteBattery(id: string): Promise<void>;
  invitations(): Promise<InvitationView[]>;
  invitation(id: string): Promise<{ view: InvitationView; results: ScoredResult[] }>;
  /** Sends tests. Candidates with open invitations for the same vacancy are skipped. */
  send(input: SendInput): Promise<SendResult>;
  remind(ids: string[]): Promise<{ reminded: number; skipped: { name: string; reason: string }[] }>;
  extend(ids: string[], deadline: string, reason: string): Promise<Undo>;
  cancel(ids: string[], reason: string): Promise<Undo>;
  /** New link and deadline for an expired or cancelled invitation. */
  resend(id: string, deadline: string): Promise<InvitationRecord>;
  /** Puts invitations back exactly as they were before a reversible action. */
  restore(undo: Undo): Promise<void>;
  setReviewed(id: string, reviewed: boolean): Promise<InvitationRecord>;
  addNote(id: string, body: string): Promise<InvitationRecord>;
  setConcern(id: string, concern: string | null): Promise<InvitationRecord>;
}

function find(id: string) {
  const r = invitationStore.find((x) => x.id === id);
  if (!r) throw new Error("This invitation could not be found.");
  return r;
}

function audit(r: InvitationRecord, action: InvitationRecord["audit"][number]["action"], detail?: string, by = me) {
  r.audit.push({ at: MOCK_NOW, by, action, ...(detail ? { detail } : {}) });
}

/** Creates an invitation record. Used by this service and the pipeline. */
export function createInvitation(input: { candidateId: string; vacancyId: string; batteryId: string | null; extraTests: string[]; deadline: string; channels: Channel[]; language: LanguageCode; by?: string }) {
  const c = profileSnapshot().find((p) => p.id === input.candidateId)!;
  const v = vacancySnapshot().find((x) => x.id === input.vacancyId)!;
  const id = `inv_new_${++seq}`;
  const r: InvitationRecord = {
    id,
    token: `${c.name.split(" ")[0]!.toLowerCase()}-${id.slice(-4).replace(/_/g, "")}${hashString(id) % 97}`,
    candidateId: c.id,
    candidateName: c.name,
    vacancyId: v.id,
    vacancyTitle: v.title,
    batteryId: input.batteryId ?? "custom",
    extraTests: input.extraTests,
    status: "sent",
    channels: input.channels,
    language: input.language,
    sentBy: input.by ?? me,
    sentAt: MOCK_NOW,
    openedAt: null,
    deadline: input.deadline,
    remindersSent: [],
    extensions: [],
    consent: null,
    accommodations: [],
    attempts: [],
    results: [],
    deliveryIssues: [],
    review: { reviewed: false, notes: [] },
    audit: [],
    isMock: true,
  };
  audit(r, "sent", `${input.channels.join(" and ")} · due ${input.deadline.slice(0, 10)}`, r.sentBy);
  // Simulated delivery: an obviously invalid phone number bounces the SMS.
  if (input.channels.includes("sms") && !c.phone.replace(/\D/g, "").match(/^\d{9,13}$/)) {
    r.deliveryIssues.push({ channel: "sms", at: MOCK_NOW, reason: "Number not recognised by the network." });
    audit(r, "delivery_failed", "SMS not delivered", "Vettly");
  }
  invitationStore.push(r);
  return r;
}

export function cancelOpen(r: InvitationRecord, reason: string, by = me) {
  if (!OPEN.includes(r.status)) return false;
  r.status = "cancelled";
  r.outcomeNote = reason;
  audit(r, "cancelled", reason, by);
  return true;
}

export const deadlineIn = (days: number) => {
  const d = new Date(NOW + days * 86400000);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
};

const replaceAll = (snapshot: InvitationRecord[]) => {
  for (const s of snapshot) {
    const i = invitationStore.findIndex((r) => r.id === s.id);
    if (i >= 0) invitationStore[i] = clone(s);
  }
};

export const mockAssessments: AssessmentsService = {
  async library() {
    await wait(350);
    return clone({ tests, families, normGroups });
  },
  async test(id) {
    await wait(300);
    const test = tests.find((t) => t.id === id);
    if (!test) throw new Error("This test could not be found.");
    const norms = test.normGroups.map((code) => {
      const g = normGroups.find((n) => n.code === code)!;
      const rows = normTables.filter((n) => n.testId === id && n.normCode === code);
      const total = rows.find((r) => !r.scale) ?? rows[0]!;
      return { ...g, n: total.n, mean: total.mean, sd: total.sd };
    });
    return clone({ test, norms, items: sampleItems.filter((i) => i.testId === id), usedIn: batteryStore.filter((b) => b.components.some((c) => c.testId === id)) });
  },
  async batteries() {
    await wait(300);
    return clone(batteryStore);
  },
  async saveBattery(draft) {
    await wait(450);
    if (!draft.label.trim()) throw new Error("Give the battery a name.");
    if (draft.components.length === 0) throw new Error("Add at least one test.");
    const minutes = draft.components.filter((c) => !c.optional).reduce((s, c) => s + (tests.find((t) => t.id === c.testId)?.medianCompletionMin ?? 0), 0);
    const existing = draft.id ? batteryStore.find((b) => b.id === draft.id) : undefined;
    if (existing && !existing.custom) throw new Error("Built-in batteries can't be edited. Duplicate it instead.");
    const next = {
      id: existing?.id ?? `bat_custom_${++seq}`,
      label: draft.label.trim(),
      roleFamily: draft.roleFamily.trim() || "Custom",
      level: "any" as const,
      description: draft.description.trim(),
      components: draft.components,
      totalMinutes: Math.round(minutes / 5) * 5,
      weights: { interview: 0.375, ability: 0.275, workSampleOrKnowledge: 0.175, personalityOrSjt: 0.175 },
      recommendedFor: [],
      deadlineDays: draft.deadlineDays,
      isMock: true as const,
      custom: true,
      createdBy: me,
    };
    if (existing) Object.assign(existing, next);
    else batteryStore.push(next);
    return clone(next);
  },
  async deleteBattery(id) {
    await wait(300);
    const b = batteryStore.find((x) => x.id === id);
    if (!b) return;
    if (!b.custom) throw new Error("Built-in batteries can't be deleted.");
    const using = vacancySnapshot().filter((v) => v.assessment.battery === id);
    if (using.length) throw new Error(`Used by ${using.map((v) => v.title).join(", ")}. Choose another battery for ${using.length === 1 ? "that vacancy" : "those vacancies"} first.`);
    batteryStore.splice(batteryStore.indexOf(b), 1);
  },
  async invitations() {
    await wait(450);
    return clone([...invitationStore].sort((a, b) => b.sentAt.localeCompare(a.sentAt)).map(view));
  },
  async invitation(id) {
    await wait(350);
    const r = find(id);
    return clone({ view: view(r), results: r.results.map((res) => ({ ...res, scored: scoreResult(res) })) });
  },
  async send(input) {
    await wait(700);
    if (input.targets.length === 0) throw new Error("Choose at least one candidate.");
    if (!input.batteryId && input.testIds.length === 0) throw new Error("Choose a battery or at least one test.");
    if (new Date(input.deadline).getTime() <= NOW + 24 * 3600000) throw new Error("Give candidates at least 24 hours.");
    if (input.channels.length === 0) throw new Error("Choose how to send the invitation.");
    const result: SendResult = { sent: [], skipped: [] };
    for (const t of input.targets) {
      const c = profileSnapshot().find((p) => p.id === t.candidateId);
      if (!c) continue;
      const open = latestFor(t.candidateId, t.vacancyId);
      if (open && OPEN.includes(open.status)) {
        result.skipped.push({ name: c.name, reason: "already has tests open for this vacancy" });
        continue;
      }
      if (open?.status === "completed") {
        result.skipped.push({ name: c.name, reason: "already completed tests for this vacancy" });
        continue;
      }
      const extra = input.batteryId ? input.testIds.filter((id) => !testIdsFor({ batteryId: input.batteryId!, extraTests: [] }).includes(id)) : input.testIds;
      result.sent.push(createInvitation({ ...t, batteryId: input.batteryId, extraTests: extra, deadline: input.deadline, channels: input.channels, language: input.language }));
    }
    return clone(result);
  },
  async remind(ids) {
    await wait(400);
    let reminded = 0;
    const skipped: { name: string; reason: string }[] = [];
    for (const id of ids) {
      const r = find(id);
      if (!OPEN.includes(r.status)) {
        skipped.push({ name: r.candidateName, reason: r.status === "completed" ? "already finished" : `invitation is ${r.status}` });
        continue;
      }
      if (r.remindersSent.some((at) => NOW - new Date(at).getTime() < 12 * 3600000)) {
        skipped.push({ name: r.candidateName, reason: "reminded in the last 12 hours" });
        continue;
      }
      r.remindersSent.push(MOCK_NOW);
      audit(r, "reminded", r.channels.join(" and "));
      reminded++;
    }
    return { reminded, skipped };
  },
  async extend(ids, deadline, reason) {
    await wait(400);
    if (!reason.trim()) throw new Error("Say why the deadline is changing. It's kept in the audit log.");
    if (new Date(deadline).getTime() <= NOW) throw new Error("The new deadline must be in the future.");
    const snapshot = ids.map((id) => clone(find(id)));
    for (const id of ids) {
      const r = find(id);
      if (r.status === "completed" || r.status === "cancelled") continue;
      if (new Date(deadline) <= new Date(r.deadline) && r.status !== "expired") continue;
      r.extensions.push({ by: me, at: MOCK_NOW, newDeadline: deadline, reason: reason.trim() });
      r.deadline = deadline;
      if (r.status === "expired") r.status = r.openedAt ? "opened" : "sent";
      audit(r, "extended", `To ${deadline.slice(0, 10)}: ${reason.trim()}`);
    }
    return { label: "Deadline changed", snapshot };
  },
  async cancel(ids, reason) {
    await wait(400);
    if (!reason.trim()) throw new Error("Say why. The candidate is told the tests were withdrawn, and the reason is kept in the audit log.");
    const snapshot = ids.map((id) => clone(find(id)));
    for (const id of ids) cancelOpen(find(id), reason.trim());
    return { label: "Invitation cancelled", snapshot };
  },
  async resend(id, deadline) {
    await wait(500);
    const r = find(id);
    if (r.status !== "expired" && r.status !== "cancelled") throw new Error("Only expired or cancelled invitations can be sent again.");
    const next = createInvitation({ candidateId: r.candidateId, vacancyId: r.vacancyId, batteryId: r.batteryId, extraTests: r.extraTests, deadline, channels: r.channels, language: r.language });
    next.accommodations = clone(r.accommodations);
    audit(r, "resent", `New invitation ${next.id}`);
    return clone(next);
  },
  async restore(undo) {
    await wait(250);
    replaceAll(undo.snapshot);
    for (const s of undo.snapshot) audit(find(s.id), "restored", undo.label);
  },
  async setReviewed(id, reviewed) {
    await wait(250);
    const r = find(id);
    r.review.reviewed = reviewed;
    if (reviewed) {
      r.review.reviewedBy = me;
      r.review.reviewedAt = MOCK_NOW;
    }
    audit(r, "reviewed", reviewed ? "Marked as reviewed" : "Review reopened");
    return clone(r);
  },
  async addNote(id, body) {
    await wait(250);
    if (!body.trim()) throw new Error("Write a note first.");
    const r = find(id);
    r.review.notes.push({ by: me, at: MOCK_NOW, body: body.trim() });
    audit(r, "note");
    return clone(r);
  },
  async setConcern(id, concern) {
    await wait(250);
    const r = find(id);
    if (concern) r.review.concern = concern.trim();
    else delete r.review.concern;
    audit(r, "flagged", concern ? `Concern: ${concern.trim()}` : "Concern cleared");
    return clone(r);
  },
};

/* ---------- Candidate side ---------- */

export interface CandidateRun {
  record: InvitationRecord;
  tests: Test[];
  items: Record<string, SampleItem[]>;
  organisationName: string;
  organisationColour: string;
  feedbackReports: boolean;
}

export function runFor(token: string): CandidateRun | null {
  const r = invitationStore.find((x) => x.token === token);
  if (!r) return null;
  if (OPEN.includes(r.status) && new Date(r.deadline).getTime() < NOW) {
    r.status = "expired";
    audit(r, "expired", "Deadline passed", "Vettly");
  }
  const ids = testIdsFor(r);
  return {
    record: r,
    tests: ids.map((id) => tests.find((t) => t.id === id)!).filter(Boolean),
    items: Object.fromEntries(ids.map((id) => [id, sampleItems.filter((i) => i.testId === id)])),
    organisationName: "Msasa Financial Group",
    organisationColour: "#16624F",
    feedbackReports: true,
  };
}

export function recordOpen(r: InvitationRecord) {
  if (!r.openedAt) {
    r.openedAt = MOCK_NOW;
    if (r.status === "sent") r.status = "opened";
    audit(r, "opened", undefined, r.candidateName);
  }
}

export function recordConsent(r: InvitationRecord) {
  r.consent = { noticeVersion: "2026-11-v1", language: r.language, assessment: true, automatedScoring: true, crossBorder: false, researchReuse: false, at: MOCK_NOW };
  audit(r, "consented", "Notice 2026-11-v1", r.candidateName);
}

/**
 * Simulates scoring a submitted test. Ability: the share answered correctly moves the percentile.
 * Questionnaires: answers nudge the relevant scales; the rest sit near the middle. Illustrative only.
 */
export function submitTest(r: InvitationRecord, testId: string, answers: Record<string, number>, minutes: number, device: "mobile" | "desktop") {
  const t = tests.find((x) => x.id === testId)!;
  // Items the candidate actually answered (the prototype borrows some from sibling tests).
  const items = sampleItems.filter((i) => i.testId === testId || Object.keys(answers).some((k) => k === i.id || k.startsWith(`${i.id}:`)));
  const started = new Date(NOW - minutes * 60000).toISOString();
  r.attempts.push({ testId, startedAt: started, completedAt: MOCK_NOW, formId: `${testId.replace("tst_", "f_")}_1`, disconnects: 0, timerPausedSec: 0, focusLossEvents: 0, fastResponseFlags: 0, supervised: false, device });
  audit(r, "started", testId, r.candidateName);
  const norm = t.defaultNorm;
  const seed = hashString(r.candidateId + testId);
  let result: TestResult;
  if (t.family === "personality" || t.family === "integrity" || t.family === "emotional_intelligence" || t.family === "motivation") {
    result = {
      testId,
      scores: t.scales.map((sc, i) => {
        const item = items.find((it) => it.scale === sc.code && it.keyed);
        const a = item ? answers[item.id] : undefined;
        const nudge = a === undefined ? 0 : (item!.keyed === "+" ? a - 2 : 2 - a) * 1.5;
        const st = Math.max(1, Math.min(10, Math.round(5.5 + (((seed >> i) % 5) - 2) * 0.8 + nudge)));
        return rawAtSten(testId, norm, sc.code, st);
      }),
      flags: [],
    };
  } else {
    const keyed = items.filter((i) => i.answer !== undefined);
    const right = keyed.filter((i) => answers[i.id] === i.answer).length;
    const share = keyed.length ? right / keyed.length : 0.6;
    const pct = Math.max(3, Math.min(97, Math.round(20 + share * 60 + ((seed % 15) - 7))));
    result = { testId, scores: [rawAtPercentile(testId, norm, pct)], flags: [] };
  }
  r.results = r.results.filter((x) => x.testId !== testId).concat(result);
  audit(r, "completed", testId, r.candidateName);
  const done = testIdsFor(r).every((id) => r.results.some((x) => x.testId === id));
  r.status = done ? "completed" : "in_progress";
  if (r.progress) delete r.progress[testId];
  return done;
}

export function saveProgress(r: InvitationRecord, testId: string, answered: number) {
  r.progress = { ...(r.progress ?? {}), [testId]: answered };
  if (r.status === "opened" || r.status === "sent") r.status = "in_progress";
}

export const CANDIDATE_FLOW = candidateFlow;
