/**
 * MOCK DATA — test invitations and results for candidates who already appear elsewhere in the app.
 * Raw scores are generated from target bands against the norm tables, so the standard scores derived with
 * src/lib/psychometrics.ts land where each candidate's story needs them. Dates match application histories.
 */
import type { Attempt, InvitationRecord, ScaleScore, TestResult } from "../../types/psychometrics";
import { normTables, tests } from "./catalogue";
import { batteries } from "./batteries";

/** Inverse normal CDF (Acklam), for generating raw scores at a target percentile. */
function probit(p: number) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858589208251, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q = p < 0.5 ? p : 1 - p;
  if (q < 0.02425) {
    const r = Math.sqrt(-2 * Math.log(q));
    const x = (((((c[0]! * r + c[1]!) * r + c[2]!) * r + c[3]!) * r + c[4]!) * r + c[5]!) / ((((d[0]! * r + d[1]!) * r + d[2]!) * r + d[3]!) * r + 1);
    return p < 0.5 ? x : -x;
  }
  const r = q - 0.5;
  const s = r * r;
  const x = ((((((a[0]! * s + a[1]!) * s + a[2]!) * s + a[3]!) * s + a[4]!) * s + a[5]!) * r) / (((((b[0]! * s + b[1]!) * s + b[2]!) * s + b[3]!) * s + b[4]!) * s + 1);
  return p < 0.5 ? x : -x;
}

function norm(testId: string, normCode: string, scale?: string) {
  const n = normTables.find((t) => t.testId === testId && t.normCode === normCode && (scale ? t.scale === scale : !t.scale));
  if (!n) throw new Error(`No norm for ${testId} / ${normCode} / ${scale ?? "total"}`);
  return n;
}

/** Raw (or theta) score that sits at the target percentile. Theta keeps 2 dp; raw scores 1 dp. */
function atPercentile(testId: string, normCode: string, pct: number, scale?: string): ScaleScore {
  const t = tests.find((x) => x.id === testId)!;
  const n = norm(testId, normCode, scale);
  const raw = n.mean + probit(pct / 100) * n.sd;
  const dp = t.scoringModel === "irt_theta" || t.scoringModel === "thurstonian_irt" ? 100 : 10;
  return { scale: scale ?? t.scales[0]!.code, raw: Math.round(raw * dp) / dp, normCode };
}

/** Raw score for a target sten (the middle of that sten's band). */
const atSten = (testId: string, normCode: string, scale: string, st: number) => {
  const n = norm(testId, normCode, scale);
  const t = tests.find((x) => x.id === testId)!;
  const dp = t.scoringModel === "thurstonian_irt" ? 100 : 10;
  return { scale, raw: Math.round((n.mean + ((st - 5.5) / 2) * n.sd) * dp) / dp, normCode };
};

/** A full work-styles profile from a scale → sten map (unlisted scales sit in the middle). */
function workStyles(normCode: string, stens: Record<string, number>): TestResult {
  const t = tests.find((x) => x.id === "tst_work_styles")!;
  return { testId: t.id, scores: t.scales.map((sc) => atSten(t.id, normCode, sc.code, stens[sc.code] ?? 5 + ((sc.code.length * 7) % 3))), flags: [] };
}

const result = (testId: string, scores: ScaleScore[], flags: string[] = []): TestResult => ({ testId, scores, flags });

const attempt = (testId: string, startedAt: string, minutes: number | null, extra: Partial<Attempt> = {}): Attempt => ({
  testId,
  startedAt,
  completedAt: minutes === null ? null : new Date(new Date(startedAt).getTime() + minutes * 60000).toISOString(),
  formId: `${testId.replace("tst_", "f_")}_${(startedAt.charCodeAt(9) % 4) + 1}`,
  disconnects: 0,
  timerPausedSec: 0,
  focusLossEvents: 0,
  fastResponseFlags: 0,
  supervised: false,
  device: "desktop",
  ...extra,
});

const consent = (at: string, language: InvitationRecord["language"] = "en") => ({
  noticeVersion: "2026-11-v1",
  language,
  assessment: true,
  automatedScoring: true,
  crossBorder: false,
  researchReuse: false,
  at,
});

function invite(r: Omit<InvitationRecord, "isMock">): InvitationRecord {
  if (!batteries.some((b) => b.id === r.batteryId)) throw new Error(`Unknown battery ${r.batteryId}`);
  return { ...r, isMock: true };
}

export const invitationRecords: InvitationRecord[] = [
  invite({
    id: "tst_tafadzwa",
    candidateId: "cnd_tafadzwa",
    candidateName: "Tafadzwa Ncube",
    vacancyId: "vac_fin",
    vacancyTitle: "Finance Manager",
    batteryId: "professional",
    extraTests: ["tst_work_styles"],
    status: "completed",
    channels: ["email", "sms"],
    language: "en",
    sentBy: "Tendai Moyo",
    sentAt: "2026-11-16T09:00:00+02:00",
    openedAt: "2026-11-16T19:42:00+02:00",
    deadline: "2026-11-24T17:00:00+02:00",
    remindersSent: [],
    extensions: [],
    consent: consent("2026-11-17T20:05:00+02:00"),
    accommodations: [],
    attempts: [
      attempt("tst_num_prof", "2026-11-17T20:08:00+02:00", 16),
      attempt("tst_sjt_prof", "2026-11-17T20:31:00+02:00", 22),
      attempt("tst_work_styles", "2026-11-18T05:28:00+02:00", 27, { device: "mobile" }),
    ],
    results: [
      result("tst_num_prof", [atPercentile("tst_num_prof", "FS-ZA", 78)]),
      result("tst_sjt_prof", [atPercentile("tst_sjt_prof", "FS-ZA", 64)]),
      workStyles("PROF-ZA", { ws_planning: 9, ws_detail: 9, ws_process: 8, ws_analysis: 8, ws_evidence: 8, ws_calm: 7, ws_lead: 7, ws_ideas: 4, ws_sociable: 4, ws_adapt: 5, ws_candour: 6 }),
    ],
  }),
  invite({
    id: "tst_chipo",
    candidateId: "cnd_chipo",
    candidateName: "Chipo Makoni",
    vacancyId: "vac_fin",
    vacancyTitle: "Finance Manager",
    batteryId: "professional",
    extraTests: [],
    status: "completed",
    channels: ["email"],
    language: "en",
    sentBy: "Tendai Moyo",
    sentAt: "2026-11-15T09:00:00+02:00",
    openedAt: "2026-11-15T09:47:00+02:00",
    deadline: "2026-11-20T17:00:00+02:00",
    remindersSent: [],
    extensions: [],
    consent: consent("2026-11-15T12:10:00+02:00"),
    accommodations: [],
    attempts: [attempt("tst_num_prof", "2026-11-15T12:12:00+02:00", 17), attempt("tst_sjt_prof", "2026-11-15T12:34:00+02:00", 25)],
    results: [result("tst_num_prof", [atPercentile("tst_num_prof", "FS-ZA", 71)]), result("tst_sjt_prof", [atPercentile("tst_sjt_prof", "FS-ZA", 82)])],
  }),
  invite({
    id: "tst_nyasha",
    candidateId: "cnd_nyasha",
    candidateName: "Nyasha Dube",
    vacancyId: "vac_data",
    vacancyTitle: "Data Analyst",
    batteryId: "professional",
    extraTests: [],
    status: "in_progress",
    channels: ["email", "whatsapp"],
    language: "en",
    sentBy: "Kudzai Chirwa",
    sentAt: "2026-11-16T09:00:00+02:00",
    openedAt: "2026-11-16T11:20:00+02:00",
    deadline: "2026-11-26T17:00:00+02:00",
    remindersSent: [],
    extensions: [
      {
        by: "Kudzai Chirwa",
        at: "2026-11-18T08:15:00+02:00",
        newDeadline: "2026-11-26T17:00:00+02:00",
        reason: "Candidate travelling to Masvingo for a family funeral. Extended by five days.",
      },
    ],
    consent: consent("2026-11-17T18:02:00+02:00"),
    accommodations: [],
    attempts: [attempt("tst_num_prof", "2026-11-17T18:05:00+02:00", 18, { device: "mobile", disconnects: 1, timerPausedSec: 46 })],
    results: [result("tst_num_prof", [atPercentile("tst_num_prof", "PROF-ZA", 81)], ["Connection dropped once; timer paused for 46 seconds."])],
  }),
  invite({
    id: "tst_ruvimbo",
    candidateId: "cnd_ruvimbo",
    candidateName: "Ruvimbo Gumbo",
    vacancyId: "vac_data",
    vacancyTitle: "Data Analyst",
    batteryId: "professional",
    extraTests: [],
    status: "opened",
    channels: ["email", "sms"],
    language: "en",
    sentBy: "Kudzai Chirwa",
    sentAt: "2026-11-17T15:00:00+02:00",
    openedAt: "2026-11-17T21:14:00+02:00",
    deadline: "2026-11-22T17:00:00+02:00",
    remindersSent: [],
    extensions: [],
    consent: consent("2026-11-17T21:18:00+02:00"),
    accommodations: [
      { type: "extra_time", extraTimePercent: 25, approvedBy: "Kudzai Chirwa", nonNormed: false, note: "Dyslexia assessment on file. Standard 25% extra time on timed tests." },
    ],
    attempts: [],
    results: [],
  }),
  invite({
    id: "tst_tinashe",
    candidateId: "cnd_tinashe",
    candidateName: "Tinashe Mhlanga",
    vacancyId: "vac_swdev",
    vacancyTitle: "Software Developer",
    batteryId: "professional",
    extraTests: [],
    status: "completed",
    channels: ["email"],
    language: "en",
    sentBy: "Tendai Moyo",
    sentAt: "2026-11-08T09:00:00+02:00",
    openedAt: "2026-11-08T10:05:00+02:00",
    deadline: "2026-11-13T17:00:00+02:00",
    remindersSent: ["2026-11-11T17:00:00+02:00"],
    extensions: [],
    consent: consent("2026-11-11T19:30:00+02:00"),
    accommodations: [],
    attempts: [attempt("tst_num_prof", "2026-11-11T19:32:00+02:00", 15), attempt("tst_sjt_prof", "2026-11-11T19:51:00+02:00", 21)],
    results: [result("tst_num_prof", [atPercentile("tst_num_prof", "PROF-ZA", 69)]), result("tst_sjt_prof", [atPercentile("tst_sjt_prof", "PROF-ZA", 74)])],
  }),
  invite({
    id: "tst_simba",
    candidateId: "cnd_simba",
    candidateName: "Simba Chari",
    vacancyId: "vac_fin",
    vacancyTitle: "Finance Manager",
    batteryId: "professional",
    extraTests: [],
    status: "sent",
    channels: ["email", "sms"],
    language: "en",
    sentBy: "Tendai Moyo",
    sentAt: "2026-11-17T09:00:00+02:00",
    openedAt: null,
    deadline: "2026-11-22T17:00:00+02:00",
    remindersSent: [],
    extensions: [],
    consent: null,
    accommodations: [],
    attempts: [],
    results: [],
  }),
  invite({
    id: "tst_farai",
    candidateId: "cnd_farai",
    candidateName: "Farai Mutasa",
    vacancyId: "vac_hro",
    vacancyTitle: "Human Resources Officer",
    batteryId: "graduate",
    extraTests: [],
    status: "completed",
    channels: ["email", "sms"],
    language: "en",
    sentBy: "Tendai Moyo",
    sentAt: "2026-10-20T09:00:00+02:00",
    openedAt: "2026-10-20T09:31:00+02:00",
    deadline: "2026-10-25T17:00:00+02:00",
    remindersSent: [],
    extensions: [],
    consent: consent("2026-10-21T18:40:00+02:00", "sn"),
    accommodations: [],
    attempts: [
      attempt("tst_num_grad", "2026-10-21T18:44:00+02:00", 14),
      attempt("tst_verb_grad", "2026-10-21T19:02:00+02:00", 15),
      attempt("tst_work_styles", "2026-10-22T07:10:00+02:00", 24, { device: "mobile" }),
    ],
    results: [
      result("tst_num_grad", [atPercentile("tst_num_grad", "GRAD-ZA", 66)]),
      result("tst_verb_grad", [atPercentile("tst_verb_grad", "GRAD-ZA", 88)]),
      workStyles("GRAD-ZA", { ws_care: 9, ws_consult: 8, ws_sociable: 8, ws_feedback: 8, ws_process: 7, ws_candour: 7, ws_drive: 6, ws_analysis: 5, ws_decisive: 4 }),
    ],
  }),
];
