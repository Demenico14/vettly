/**
 * MOCK DATA — analytics history for the fictional Msasa Financial Group, 19 Nov 2025 to 18 Nov 2026.
 * Generated deterministically so every reload shows the same numbers. Built to agree with the rest of
 * the app: the last 30 days hold exactly the dashboard's 312 applications (and its funnel per vacancy),
 * the last 90 days hold 846, and hires accepted in the last 90 days have a median of 23 days.
 */
import type { ApplicationSource } from "@/types";
import type { AgeBand, AnalyticsApplication, AnalyticsTestSession, AnalyticsVacancy, FunnelStage, Gender } from "@/types/analytics";
import { tests as catalogue } from "./psychometrics";

/** Fixed so the generated history is identical on every load. */
const SEED = 124;
const STAGES: FunnelStage[] = ["applied", "screening", "shortlisted", "assessment", "interview", "offer", "hired"];
const DAY = 86400000;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);

const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const gauss = () => {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
};
function pick<T>(weights: [T, number][]): T {
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of weights) if ((r -= w) <= 0) return v;
  return weights.at(-1)![0];
}
const iso = (ms: number) => new Date(ms).toISOString();
const at = (d: string) => new Date(`${d}T09:00:00+02:00`).getTime();
const NOW = new Date("2026-11-18T09:30:00+02:00").getTime();

const BATTERY: Record<string, string[]> = {
  Finance: ["tst_num_prof", "tst_verb_prof", "tst_sjt_prof"],
  "Information Technology": ["tst_inductive", "tst_num_prof"],
  Marketing: ["tst_verb_prof", "tst_sjt_prof"],
  Operations: ["tst_num_prof", "tst_sjt_service"],
  "Human Resources": ["tst_verb_prof", "tst_sjt_prof"],
  Graduate: ["tst_num_grad", "tst_verb_grad", "tst_inductive"],
};

interface Plan {
  v: Omit<AnalyticsVacancy, "battery">;
  /** Applications received, and their window. */
  apps: number;
  window: [string, string];
  /** Applications reaching screening, shortlisted, assessment, interview, offer, hired. */
  reach: [number, number, number, number, number, number];
  /** Days from application to offer accepted, one per hire. */
  tth: number[];
  /** Offers turned down. */
  declined?: number;
  /** Batch name for the battery, if not the department. */
  battery?: string;
}

/** Age mix of applicants: senior roles draw more experienced people, the graduate scheme almost none. */
const SENIOR = new Set(["vac_fin", "vac_ops", "vac_h_branch", "vac_h_risk", "vac_h_audit", "vac_h_credit", "vac_h_proc"]);
function ageWeights(id: string): [AgeBand, number][] {
  if (id === "vac_h_grad") return [["Under 30", 92], ["30–39", 8], ["40 and over", 0]];
  if (SENIOR.has(id)) return [["Under 30", 18], ["30–39", 42], ["40 and over", 40]];
  return [["Under 30", 42], ["30–39", 37], ["40 and over", 21]];
}

const v = (id: string, title: string, department: string, location: string, recruiter: string, hiringManager: string, openedAt: string, closedAt: string | null, status: AnalyticsVacancy["status"], openings = 1) => ({
  id,
  title,
  department,
  location,
  recruiter,
  hiringManager,
  openedAt: iso(at(openedAt)),
  closedAt: closedAt ? iso(at(closedAt)) : null,
  status,
  openings,
});

const T = "Tendai Moyo";
const K = "Kudzai Chirwa";

const PLANS: Plan[] = [
  // Live vacancies: counts match the dashboard funnel for the last 30 days.
  { v: v("vac_swdev", "Software Developer", "Information Technology", "Harare", K, "Tatenda Mutasa", "2026-10-20", null, "open"), apps: 124, window: ["2026-10-20", "2026-11-18"], reach: [71, 14, 6, 5, 1, 0], tth: [] },
  { v: v("vac_fin", "Finance Manager", "Finance", "Bulawayo", T, "Sipho Ndlovu", "2026-10-27", null, "open"), apps: 86, window: ["2026-10-27", "2026-11-18"], reach: [52, 11, 8, 4, 1, 0], tth: [] },
  { v: v("vac_data", "Data Analyst", "Information Technology", "Harare", T, "Lovemore Sithole", "2026-11-02", null, "open"), apps: 52, window: ["2026-11-02", "2026-11-18"], reach: [34, 8, 5, 3, 0, 0], tth: [] },
  { v: v("vac_mkt", "Marketing Executive", "Marketing", "Harare", K, "Ruth Chinamasa", "2026-11-09", null, "open"), apps: 31, window: ["2026-11-09", "2026-11-18"], reach: [18, 5, 3, 1, 0, 0], tth: [] },
  { v: v("vac_ops", "Operations Manager", "Operations", "Gweru", T, "Farai Gumbo", "2026-10-13", null, "paused"), apps: 19, window: ["2026-10-20", "2026-11-13"], reach: [11, 3, 2, 2, 0, 0], tth: [] },
  { v: v("vac_hro", "Human Resources Officer", "Human Resources", "Harare", T, "Tendai Moyo", "2026-09-21", "2026-10-16", "filled"), apps: 64, window: ["2026-09-21", "2026-10-16"], reach: [38, 9, 6, 4, 1, 1], tth: [32] },
  // Closed and filled vacancies from the past year.
  { v: v("vac_h_rm", "Relationship Manager, SME", "Marketing", "Harare", K, "Ruth Chinamasa", "2026-09-07", "2026-10-02", "closed"), apps: 323, window: ["2026-09-07", "2026-10-02"], reach: [176, 34, 22, 9, 1, 0], tth: [], declined: 1 },
  { v: v("vac_h_payroll", "Payroll Officer", "Human Resources", "Harare", K, "Tendai Moyo", "2026-08-24", "2026-09-11", "filled"), apps: 147, window: ["2026-08-24", "2026-09-11"], reach: [84, 17, 11, 5, 1, 1], tth: [19] },
  { v: v("vac_h_proc", "Procurement Officer", "Operations", "Harare", T, "Farai Gumbo", "2026-08-03", "2026-08-19", "filled"), apps: 131, window: ["2026-08-03", "2026-08-19"], reach: [77, 15, 10, 5, 1, 1], tth: [21] },
  { v: v("vac_h_sales", "Sales Executive", "Marketing", "Bulawayo", K, "Ruth Chinamasa", "2026-07-20", "2026-08-10", "filled", 2), apps: 205, window: ["2026-07-20", "2026-08-10"], reach: [117, 26, 16, 8, 2, 2], tth: [23, 28] },
  { v: v("vac_h_risk", "Risk Analyst", "Finance", "Harare", T, "Sipho Ndlovu", "2026-06-01", "2026-06-22", "filled"), apps: 118, window: ["2026-06-01", "2026-06-22"], reach: [66, 14, 10, 6, 2, 1], tth: [33], declined: 1 },
  { v: v("vac_h_it", "IT Support Technician", "Information Technology", "Harare", K, "Tatenda Mutasa", "2026-05-04", "2026-05-22", "filled"), apps: 188, window: ["2026-05-04", "2026-05-22"], reach: [109, 21, 14, 6, 1, 1], tth: [22] },
  { v: v("vac_h_branch", "Branch Manager, Gweru", "Operations", "Gweru", T, "Farai Gumbo", "2026-04-06", "2026-04-30", "filled"), apps: 71, window: ["2026-04-06", "2026-04-30"], reach: [41, 10, 7, 5, 2, 1], tth: [41], declined: 1 },
  { v: v("vac_h_cso", "Customer Service Officer", "Operations", "Harare", K, "Farai Gumbo", "2026-03-02", "2026-03-20", "filled", 3), apps: 274, window: ["2026-03-02", "2026-03-20"], reach: [158, 30, 21, 10, 3, 3], tth: [18, 20, 25] },
  { v: v("vac_h_audit", "Internal Auditor", "Finance", "Harare", T, "Sipho Ndlovu", "2026-02-02", "2026-02-20", "filled"), apps: 96, window: ["2026-02-02", "2026-02-20"], reach: [55, 12, 8, 4, 1, 1], tth: [29] },
  { v: v("vac_h_grad", "Graduate Trainee", "Human Resources", "Harare", K, "Tendai Moyo", "2026-01-12", "2026-02-06", "filled", 4), apps: 389, window: ["2026-01-12", "2026-02-06"], reach: [212, 46, 34, 14, 4, 4], tth: [31, 34, 35, 38], battery: "Graduate" },
  { v: v("vac_h_credit", "Credit Analyst", "Finance", "Harare", K, "Sipho Ndlovu", "2025-12-01", "2025-12-19", "filled"), apps: 142, window: ["2025-12-01", "2025-12-19"], reach: [82, 16, 11, 5, 1, 1], tth: [27] },
];

const SOURCE_WEIGHTS: [ApplicationSource, number][] = [
  ["Vettly careers page", 30],
  ["LinkedIn", 24],
  ["VacancyMail", 18],
  ["Indeed", 10],
  ["Referral", 8],
  ["Email (CV upload)", 7],
  ["Talent pool", 3],
];
/** How much more likely each source is to be shortlisted. Referrals and the talent pool convert best. */
const SOURCE_MERIT: Record<ApplicationSource, number> = {
  "Vettly careers page": 1,
  LinkedIn: 1.15,
  VacancyMail: 0.8,
  Indeed: 0.7,
  Referral: 1.9,
  "Email (CV upload)": 0.9,
  "Talent pool": 2.1,
};
/** Days to reach each stage from the one before: screening is quicker for Tendai's vacancies. */
const STEP_DAYS: Record<string, [number, number][]> = {
  [T]: [[0.5, 3.5], [2, 6], [1, 3], [4, 9], [3, 7]],
  [K]: [[1, 5], [2, 7], [1, 3], [4, 10], [3, 7]],
};

export const analyticsVacancies: AnalyticsVacancy[] = PLANS.map((p) => ({ ...p.v, battery: BATTERY[p.battery ?? p.v.department]! }));
export const analyticsApplications: AnalyticsApplication[] = [];
export const analyticsSessions: AnalyticsTestSession[] = [];

let appSeq = 0;
let sesSeq = 0;
for (const p of PLANS) {
  const [from, to] = [at(p.window[0]), Math.min(at(p.window[1]) + 8 * 3600000, NOW - 3600000)];
  const people = Array.from({ length: p.apps }, () => {
    const source = pick(SOURCE_WEIGHTS);
    const gender: Gender | null = rand() < 0.86 ? (rand() < 0.47 ? "Woman" : "Man") : null;
    const ageBand: AgeBand | null = rand() < 0.84 ? pick(ageWeights(p.v.id)) : null;
    return { source, gender, ageBand, appliedAt: between(from, to), merit: rand() * SOURCE_MERIT[source] };
  });
  // The furthest stage each person reached follows merit, so better sources go further.
  const order = [...people].sort((a, b) => b.merit - a.merit);
  const hiresByMerit = order.slice(0, p.reach[5]);
  const hireDays = [...p.tth];
  for (const person of order) {
    const rank = order.indexOf(person);
    let furthest = 0;
    p.reach.forEach((n, i) => rank < n && (furthest = i + 1));
    const live = p.v.closedAt === null || p.v.status === "paused";
    const stages: AnalyticsApplication["stages"] = [{ stage: "applied", at: iso(person.appliedAt) }];
    let t = person.appliedAt;
    let outcome: AnalyticsApplication["outcome"];
    if (hiresByMerit.includes(person)) {
      const total = hireDays.shift()! * DAY;
      // Hires applied in the busy last third of the window, a day apart.
      person.appliedAt = to - 0.3 * (to - from) - hiresByMerit.indexOf(person) * DAY;
      stages[0]!.at = iso(person.appliedAt);
      t = person.appliedAt;
      // Spread the hire's time across the stages so the stage medians stay believable.
      const shares = [0.07, 0.15, 0.1, 0.28, 0.3];
      for (let i = 1; i <= 5; i++) stages.push({ stage: STAGES[i]!, at: iso((t += total * shares[i - 1]!)) });
      stages.push({ stage: "hired", at: iso(person.appliedAt + total) });
      outcome = "hired";
    } else {
      for (let i = 1; i <= furthest && i <= 5; i++) {
        const [lo, hi] = STEP_DAYS[p.v.recruiter]![i - 1]!;
        t = Math.min(t + between(lo, hi) * DAY, NOW - 1800000);
        stages.push({ stage: STAGES[i]!, at: iso(t) });
      }
      if (furthest === 5) outcome = live ? "active" : "offer_declined";
      else if (live && (furthest >= 2 || rand() < 0.35)) outcome = "active";
      else outcome = rand() < 0.1 ? "withdrawn" : "rejected";
    }
    const app: AnalyticsApplication = { id: `an_${++appSeq}`, vacancyId: p.v.id, source: person.source, appliedAt: iso(person.appliedAt), stages, outcome, gender: person.gender, ageBand: person.ageBand };
    analyticsApplications.push(app);

    // Everyone who reached the assessment stage was sent the vacancy's battery.
    const sent = stages.find((s) => s.stage === "assessment");
    if (!sent) continue;
    const advanced = furthest >= 4 || outcome === "hired";
    for (const testId of BATTERY[p.battery ?? p.v.department]!) {
      const test = catalogue.find((x) => x.id === testId)!;
      const sentAt = new Date(sent.at).getTime();
      const roll = rand();
      const recent = NOW - sentAt < 5 * DAY;
      const status: AnalyticsTestSession["status"] = advanced ? "completed" : roll < 0.74 ? "completed" : roll < 0.86 ? (recent ? "not_started" : "expired") : roll < 0.93 ? "abandoned" : recent ? "in_progress" : "expired";
      const startedAt = status === "completed" || status === "abandoned" || status === "in_progress" ? Math.min(sentAt + between(0.1, 3.2) * DAY, NOW - 600000) : null;
      const minutes = status === "completed" ? Math.max(4, Math.min(test.timeLimitMin ?? 40, Math.round(test.medianCompletionMin * (1 + gauss() * 0.18)))) : null;
      // Scores: candidates who advanced score higher. The timed numerical test is harder for over-40s,
      // which the fairness report should pick up.
      let z = gauss() * 0.9 + (advanced ? 0.75 : -0.15);
      if (testId === "tst_num_prof" && person.ageBand === "40 and over") z -= 0.62;
      const sten = status === "completed" ? Math.min(10, Math.max(1, Math.round(2 * z + 5.5))) : null;
      analyticsSessions.push({
        id: `as_${++sesSeq}`,
        applicationId: app.id,
        testId,
        sentAt: iso(sentAt),
        startedAt: startedAt ? iso(startedAt) : null,
        completedAt: status === "completed" && startedAt ? iso(startedAt + (minutes ?? 0) * 60000) : null,
        status,
        minutes,
        sten,
        percentile: sten === null ? null : Math.round(100 * [0.0228, 0.0668, 0.1587, 0.3085, 0.5, 0.6915, 0.8413, 0.9332, 0.9772, 0.99][sten - 1]! - 1),
      });
    }
  }
}

/** Monthly spend on paid sources, in USD. VacancyMail charges per listing; referral bonuses are paid per hire. */
export const SOURCE_COSTS = { linkedInMonthly: 350, vacancyMailPerListing: 45, referralBonusPerHire: 250 };
