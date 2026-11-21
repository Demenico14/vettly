import "server-only";
/**
 * Analytics service (Module 13). Aggregates the generated history in src/mocks/analytics.ts.
 * Equal-opportunity figures are only ever reported for groups of 20 or more, never per person.
 */
import type { ApplicationSource } from "@/types";
import type {
  AnalyticsApplication,
  AnalyticsFilters,
  AnalyticsReport,
  AnalyticsTestSession,
  FunnelRow,
  FunnelStage,
  ImpactRow,
  KpiFigure,
  RecruiterRow,
  SourceRow,
  TestRow,
  TrendBucket,
  VacancyRow,
} from "@/types/analytics";
import type { AnalyticsVacancy, FunnelStage as Stage } from "@/types/analytics";
import { tests as catalogue, scoreResult } from "@/mocks/psychometrics";
import { profileSnapshot } from "./candidates";
import { vacancySnapshot } from "./vacancies";
import { invitationStore, testIdsFor } from "./assessments";
import { offerStore } from "./offers";

/** Spend on paid job boards isn't recorded yet, so source costs show as unknown. */
const SOURCE_COSTS = { linkedInMonthly: 0, vacancyMailPerListing: 0, referralBonusPerHire: 0 };
const DAY = 86400000;
let NOW = Date.now();
let analyticsVacancies: AnalyticsVacancy[] = [];
let analyticsApplications: AnalyticsApplication[] = [];
let analyticsSessions: AnalyticsTestSession[] = [];

const FUNNEL_STAGES: Stage[] = ["applied", "screening", "shortlisted", "assessment", "interview", "offer", "hired"];

/** Builds the analytics view of the organisation's records. Runs synchronously at the start of each report. */
function buildData() {
  NOW = Date.now();
  analyticsVacancies = vacancySnapshot()
    .filter((v) => v.status !== "draft")
    .map((v) => ({
      id: v.id,
      title: v.title,
      department: v.department || "Other",
      location: v.location,
      recruiter: v.history[0]?.by ?? "",
      hiringManager: v.hiringManager,
      openedAt: v.openedAt,
      closedAt: [...v.history].reverse().find((h) => h.status === "closed" || h.status === "filled")?.at ?? null,
      status: v.status as AnalyticsVacancy["status"],
      openings: v.openings,
      battery: testIdsFor({ batteryId: v.assessment.battery ?? "", extraTests: [] }),
    }));
  const declined = new Set(offerStore.filter((o) => o.status === "declined").map((o) => o.applicationId));
  analyticsApplications = profileSnapshot().flatMap((c) =>
    c.applications.map((a) => {
      const stages: AnalyticsApplication["stages"] = [{ stage: "applied", at: a.appliedAt }];
      for (const h of a.history) {
        const i = FUNNEL_STAGES.indexOf(h.stage as Stage);
        if (i <= 0) continue;
        // Count every stage passed on the way, so jumps (e.g. applied to interview) fill the funnel.
        for (const st of FUNNEL_STAGES.slice(1, i + 1)) if (!stages.some((x) => x.stage === st)) stages.push({ stage: st, at: h.at });
      }
      return {
        id: a.id,
        vacancyId: a.vacancyId,
        source: a.source,
        appliedAt: a.appliedAt,
        stages,
        outcome: a.stage === "hired" ? "hired" : declined.has(a.id) ? "offer_declined" : a.stage === "rejected" ? "rejected" : a.stage === "withdrawn" ? "withdrawn" : "active",
        gender: null,
        ageBand: null,
      } satisfies AnalyticsApplication;
    }),
  );
  const appByCandidateVacancy = new Map(profileSnapshot().flatMap((c) => c.applications.map((a) => [`${c.id}:${a.vacancyId}`, a.id] as const)));
  analyticsSessions = invitationStore.flatMap((r) =>
    testIdsFor(r).map((testId) => {
      const res = r.results.find((x) => x.testId === testId);
      const at = r.attempts.filter((x) => x.testId === testId).at(-1);
      const scored = res ? scoreResult(res)[0] : undefined;
      const open = ["sent", "opened", "in_progress"].includes(r.status);
      return {
        id: `${r.id}:${testId}`,
        applicationId: appByCandidateVacancy.get(`${r.candidateId}:${r.vacancyId}`) ?? r.id,
        testId,
        sentAt: r.sentAt,
        startedAt: at?.startedAt ?? null,
        completedAt: res ? (at?.completedAt ?? null) : null,
        status: res ? "completed" : at ? (open ? "in_progress" : "abandoned") : open ? "not_started" : "expired",
        minutes: res && at?.completedAt ? Math.max(1, Math.round((new Date(at.completedAt).getTime() - new Date(at.startedAt).getTime()) / 60000)) : null,
        sten: scored?.sten ?? null,
        percentile: scored?.percentile ?? null,
      } satisfies AnalyticsTestSession;
    }),
  );
}
const STAGES: FunnelStage[] = ["applied", "screening", "shortlisted", "assessment", "interview", "offer", "hired"];
const DAYS = { "30d": 30, "90d": 90, "12m": 365 } as const;
const LABEL = { "30d": "Last 30 days", "90d": "Last 90 days", "12m": "Last 12 months" } as const;
const PREVIOUS = { "30d": "previous 30 days", "90d": "previous 90 days", "12m": null } as const;
import { IMPACT_THRESHOLD, MIN_GROUP } from "@/lib/workflow";
import { groupsOf, verdict } from "@/lib/fairness";
export { IMPACT_THRESHOLD, MIN_GROUP };

const time = (s: string) => new Date(s).getTime();
const reached = (a: AnalyticsApplication, s: FunnelStage) => a.stages.find((x) => x.stage === s);
const days = (a: string, b: string) => (time(b) - time(a)) / DAY;
const r1 = (n: number) => Math.round(n * 10) / 10;

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function scope(f: AnalyticsFilters) {
  const vacs = analyticsVacancies.filter((v) => (f.department === "all" || v.department === f.department) && (f.vacancyId === "all" || v.id === f.vacancyId));
  const ids = new Set(vacs.map((v) => v.id));
  const apps = analyticsApplications.filter((a) => ids.has(a.vacancyId));
  const appIds = new Set(apps.map((a) => a.id));
  const sessions = analyticsSessions.filter((s) => appIds.has(s.applicationId));
  return { vacs, apps, sessions };
}

const inRange = (iso: string | undefined, from: number, to: number) => !!iso && time(iso) > from && time(iso) <= to;

function windowFigures(apps: AnalyticsApplication[], sessions: AnalyticsTestSession[], from: number, to: number) {
  const cohort = apps.filter((a) => inRange(a.appliedAt, from, to));
  const hires = apps.filter((a) => a.outcome === "hired" && inRange(reached(a, "hired")?.at, from, to));
  const decided = apps.filter((a) => (a.outcome === "hired" || a.outcome === "offer_declined") && inRange(reached(a, a.outcome === "hired" ? "hired" : "offer")?.at, from, to));
  const sent = sessions.filter((s) => inRange(s.sentAt, from, to) && s.status !== "in_progress" && s.status !== "not_started");
  return {
    applications: cohort.length,
    hires: hires.length,
    tth: median(hires.map((a) => Math.round(days(a.appliedAt, reached(a, "hired")!.at)))),
    acceptance: decided.length ? Math.round((100 * decided.filter((a) => a.outcome === "hired").length) / decided.length) : null,
    completion: sent.length ? Math.round((100 * sent.filter((s) => s.status === "completed").length) / sent.length) : null,
  };
}

function kpis(apps: AnalyticsApplication[], sessions: AnalyticsTestSession[], f: AnalyticsFilters, from: number, to: number): KpiFigure[] {
  const now = windowFigures(apps, sessions, from, to);
  const span = to - from;
  const prev = f.period === "12m" ? null : windowFigures(apps, sessions, from - span, from);
  const diff = (a: number | null, b: number | null | undefined) => (a === null || b === null || b === undefined ? null : a - b);
  return [
    {
      id: "applications",
      label: "Applications",
      value: now.applications,
      delta: prev && prev.applications ? Math.round((100 * (now.applications - prev.applications)) / prev.applications) : null,
      deltaUnit: "%",
      better: "up",
      hint: "Applications received in the period.",
    },
    { id: "hires", label: "Hires", value: now.hires, delta: diff(now.hires, prev?.hires), better: "up", hint: "Offers accepted in the period." },
    {
      id: "tth",
      label: "Median time to hire",
      value: now.tth,
      unit: "days",
      delta: diff(now.tth, prev?.tth),
      deltaUnit: "days",
      better: "down",
      hint: "Days from application to offer accepted, for hires in the period. The median, so one slow hire doesn't skew it.",
    },
    { id: "acceptance", label: "Offer acceptance", value: now.acceptance, unit: "%", delta: diff(now.acceptance, prev?.acceptance), deltaUnit: "pts", better: "up", hint: "Offers accepted out of offers answered in the period." },
    { id: "completion", label: "Test completion", value: now.completion, unit: "%", delta: diff(now.completion, prev?.completion), deltaUnit: "pts", better: "up", hint: "Tests completed out of tests sent whose deadline has passed." },
  ];
}

function trend(apps: AnalyticsApplication[], f: AnalyticsFilters, from: number, to: number): TrendBucket[] {
  const fmt = (ms: number, o: Intl.DateTimeFormatOptions) => new Date(ms).toLocaleDateString("en-GB", { timeZone: "Africa/Harare", ...o });
  const buckets: TrendBucket[] = [];
  if (f.period === "12m") {
    const d = new Date(to);
    for (let i = 11; i >= 0; i--) {
      const start = new Date(d.getFullYear(), d.getMonth() - i, 1).getTime();
      const end = new Date(d.getFullYear(), d.getMonth() - i + 1, 1).getTime();
      const partial = i === 0;
      buckets.push({
        label: fmt(start, { month: "short" }),
        detail: `${fmt(start, { month: "long", year: "numeric" })}${partial ? ` (to ${fmt(to, { day: "numeric", month: "short" })})` : ""}`,
        start: new Date(start).toISOString(),
        applications: apps.filter((a) => time(a.appliedAt) >= Math.max(start, from) && time(a.appliedAt) < end && time(a.appliedAt) <= to).length,
      });
    }
    return buckets;
  }
  const step = f.period === "30d" ? DAY : 7 * DAY;
  const n = f.period === "30d" ? 30 : 13;
  for (let i = n - 1; i >= 0; i--) {
    const end = to - i * step;
    const start = end - step;
    buckets.push({
      label: fmt(start + (f.period === "30d" ? step : 0), f.period === "30d" ? { day: "numeric" } : { day: "numeric", month: "short" }),
      detail: f.period === "30d" ? fmt(start + step, { weekday: "short", day: "numeric", month: "short" }) : `Week of ${fmt(start + DAY, { day: "numeric", month: "short" })}`,
      start: new Date(start).toISOString(),
      applications: apps.filter((a) => time(a.appliedAt) > start && time(a.appliedAt) <= end).length,
    });
  }
  return buckets;
}

function funnel(cohort: AnalyticsApplication[]): FunnelRow[] {
  return STAGES.map((stage, i) => {
    const these = cohort.filter((a) => reached(a, stage));
    const prev = i ? cohort.filter((a) => reached(a, STAGES[i - 1]!)).length : null;
    return {
      stage,
      count: these.length,
      conversion: prev ? Math.round((1000 * these.length) / prev) / 10 : null,
      medianDays: i ? (median(these.map((a) => days(reached(a, STAGES[i - 1]!)!.at, reached(a, stage)!.at))) ?? null) : null,
    };
  }).map((r) => ({ ...r, medianDays: r.medianDays === null ? null : r1(r.medianDays) }));
}

function vacancyRows(vacs: typeof analyticsVacancies, apps: AnalyticsApplication[], from: number, to: number): VacancyRow[] {
  return vacs
    .filter((v) => time(v.openedAt) <= to && (!v.closedAt || time(v.closedAt) > from || apps.some((a) => a.vacancyId === v.id && a.outcome === "hired" && inRange(reached(a, "hired")?.at, from, to))))
    .map((v) => {
      const mine = apps.filter((a) => a.vacancyId === v.id);
      const hires = mine.filter((a) => a.outcome === "hired");
      const lastHire = hires.map((a) => reached(a, "hired")!.at).sort().at(-1);
      return {
        id: v.id,
        title: v.title,
        department: v.department,
        recruiter: v.recruiter,
        status: v.status,
        daysOpen: Math.round(((v.closedAt ? time(v.closedAt) : NOW) - time(v.openedAt)) / DAY),
        applications: mine.length,
        shortlisted: mine.filter((a) => reached(a, "shortlisted")).length,
        interviews: mine.filter((a) => reached(a, "interview")).length,
        offers: mine.filter((a) => reached(a, "offer")).length,
        hires: hires.length,
        openings: v.openings,
        timeToFill: lastHire && hires.length >= v.openings ? Math.round(days(v.openedAt, lastHire)) : null,
      };
    })
    .sort((a, b) => b.applications - a.applications);
}

function sourceRows(vacs: typeof analyticsVacancies, cohort: AnalyticsApplication[], from: number, to: number): SourceRow[] {
  const all = [...new Set(cohort.map((a) => a.source))];
  const months = (to - from) / DAY / 30.4;
  const listings = vacs.filter((v) => time(v.openedAt) > from && time(v.openedAt) <= to).length;
  return all
    .map((source) => {
      const mine = cohort.filter((a) => a.source === source);
      const hires = mine.filter((a) => a.outcome === "hired").length;
      const spend =
        source === "LinkedIn" ? Math.round(SOURCE_COSTS.linkedInMonthly * months) : source === "VacancyMail" ? SOURCE_COSTS.vacancyMailPerListing * listings : source === "Referral" ? SOURCE_COSTS.referralBonusPerHire * hires : 0;
      return {
        source,
        applications: mine.length,
        shortlistRate: mine.length ? Math.round((1000 * mine.filter((a) => reached(a, "shortlisted")).length) / mine.length) / 10 : 0,
        interviews: mine.filter((a) => reached(a, "interview")).length,
        hires,
        spendUsd: spend,
        costPerHire: hires && spend ? Math.round(spend / hires) : null,
      };
    })
    .sort((a, b) => b.applications - a.applications);
}

function recruiterRows(vacs: typeof analyticsVacancies, cohort: AnalyticsApplication[], apps: AnalyticsApplication[], from: number, to: number): RecruiterRow[] {
  const names = [...new Set(vacs.map((v) => v.recruiter))].sort();
  return names.map((name) => {
    const ids = new Set(vacs.filter((v) => v.recruiter === name).map((v) => v.id));
    const mine = cohort.filter((a) => ids.has(a.vacancyId));
    const hires = apps.filter((a) => ids.has(a.vacancyId) && a.outcome === "hired" && inRange(reached(a, "hired")?.at, from, to));
    const declined = apps.filter((a) => ids.has(a.vacancyId) && a.outcome === "offer_declined" && inRange(reached(a, "offer")?.at, from, to)).length;
    const review = median(mine.filter((a) => reached(a, "screening")).map((a) => days(a.appliedAt, reached(a, "screening")!.at)));
    return {
      name,
      vacancies: new Set(mine.map((a) => a.vacancyId)).size,
      applications: mine.length,
      medianDaysToReview: review === null ? null : r1(review),
      interviews: mine.filter((a) => reached(a, "interview")).length,
      offers: hires.length + declined,
      accepted: hires.length,
      hires: hires.length,
      medianTimeToHire: median(hires.map((a) => Math.round(days(a.appliedAt, reached(a, "hired")!.at)))),
    };
  });
}

function testRows(sessions: AnalyticsTestSession[], from: number, to: number): TestRow[] {
  const sent = sessions.filter((s) => inRange(s.sentAt, from, to));
  return [...new Set(sent.map((s) => s.testId))]
    .map((testId) => {
      const t = catalogue.find((x) => x.id === testId)!;
      const mine = sent.filter((s) => s.testId === testId);
      const done = mine.filter((s) => s.status === "completed");
      const closed = mine.filter((s) => s.status !== "in_progress" && s.status !== "not_started");
      const stens = Array.from({ length: 10 }, (_, i) => (done.length ? Math.round((1000 * done.filter((s) => s.sten === i + 1).length) / done.length) / 10 : 0));
      const mean = done.length ? r1(done.reduce((s, x) => s + x.sten!, 0) / done.length) : null;
      const dtc = median(done.map((s) => days(s.sentAt, s.completedAt!)));
      return {
        testId,
        name: t.name,
        sent: mine.length,
        completed: done.length,
        inProgress: mine.filter((s) => s.status === "in_progress").length,
        notStarted: mine.filter((s) => s.status === "not_started" || s.status === "expired").length,
        abandoned: mine.filter((s) => s.status === "abandoned").length,
        completionRate: closed.length ? Math.round((1000 * closed.filter((s) => s.status === "completed").length) / closed.length) / 10 : null,
        medianMinutes: median(done.map((s) => s.minutes!)),
        timeLimit: t.timeLimitMin ?? t.medianCompletionMin,
        medianDaysToComplete: dtc === null ? null : r1(dtc),
        stens,
        meanSten: mean,
      };
    })
    .sort((a, b) => b.sent - a.sent);
}

function impact(cohort: AnalyticsApplication[], sessions: AnalyticsTestSession[], from: number, to: number): ImpactRow[] {
  const dims = [
    { dimension: "Gender" as const, of: (a: AnalyticsApplication) => a.gender, order: ["Woman", "Man"] },
    { dimension: "Age" as const, of: (a: AnalyticsApplication) => a.ageBand, order: ["Under 30", "30–39", "40 and over"] },
  ];
  const rows: ImpactRow[] = [];
  const decisions: { id: string; decision: string; pool: AnalyticsApplication[]; sel: (a: AnalyticsApplication) => boolean }[] = [
    { id: "short", decision: "Shortlisted, of everyone who applied", pool: cohort.filter((a) => a.outcome !== "active" || reached(a, "shortlisted")), sel: (a) => !!reached(a, "shortlisted") },
    { id: "interview", decision: "Invited to interview, of those shortlisted", pool: cohort.filter((a) => reached(a, "shortlisted") && (a.outcome !== "active" || reached(a, "interview"))), sel: (a) => !!reached(a, "interview") },
  ];
  for (const d of decisions)
    for (const dim of dims) {
      const groups = groupsOf(d.pool, dim.of, d.sel, dim.order);
      rows.push({ id: `${d.id}_${dim.dimension}`, decision: d.decision, kind: "stage", dimension: dim.dimension, groups, ...verdict(groups) });
    }
  const byId = new Map(analyticsApplications.map((a) => [a.id, a]));
  const done = sessions.filter((s) => s.status === "completed" && inRange(s.sentAt, from, to));
  for (const testId of [...new Set(done.map((s) => s.testId))]) {
    const t = catalogue.find((x) => x.id === testId)!;
    const mine = done.filter((s) => s.testId === testId);
    for (const dim of dims) {
      const groups = groupsOf(mine, (s) => dim.of(byId.get(s.applicationId)!), (s) => s.sten! >= 5, dim.order);
      const v = verdict(groups);
      if (v.status === "insufficient") continue;
      rows.push({ id: `${testId}_${dim.dimension}`, decision: `${t.name}: sten 5 or above`, kind: "test", dimension: dim.dimension, groups, ...v });
    }
  }
  return rows;
}

export interface AnalyticsService {
  report(filters: AnalyticsFilters): Promise<AnalyticsReport>;
}

export const analyticsService: AnalyticsService = {
  async report(input) {
    const f: AnalyticsFilters = { period: "90d", department: "all", vacancyId: "all", ...(input as Partial<AnalyticsFilters>) };
    if (!(f.period in DAYS)) f.period = "90d";
    buildData();
    const to = NOW;
    const from = to - DAYS[f.period] * DAY;
    const { vacs, apps, sessions } = scope(f);
    const cohort = apps.filter((a) => inRange(a.appliedAt, from, to));
    const hires = apps.filter((a) => a.outcome === "hired" && inRange(reached(a, "hired")?.at, from, to));
    const disclosed = (k: "gender" | "ageBand") => (cohort.length ? Math.round((100 * cohort.filter((a) => a[k]).length) / cohort.length) : 0);
    return {
      filters: f,
      range: { from: new Date(from).toISOString(), to: new Date(to).toISOString(), label: LABEL[f.period], previousLabel: PREVIOUS[f.period] },
      kpis: kpis(apps, sessions, f, from, to),
      trend: trend(apps, f, from, to),
      funnel: funnel(cohort),
      outcomes: {
        rejected: cohort.filter((a) => a.outcome === "rejected").length,
        withdrawn: cohort.filter((a) => a.outcome === "withdrawn").length,
        declined: cohort.filter((a) => a.outcome === "offer_declined").length,
        active: cohort.filter((a) => a.outcome === "active").length,
      },
      vacancies: vacancyRows(vacs, apps, from, to),
      sources: sourceRows(vacs, cohort, from, to),
      recruiters: recruiterRows(vacs, cohort, apps, from, to),
      hires: hires
        .map((a) => ({ vacancyTitle: analyticsVacancies.find((v) => v.id === a.vacancyId)!.title, appliedAt: a.appliedAt, acceptedAt: reached(a, "hired")!.at, days: Math.round(days(a.appliedAt, reached(a, "hired")!.at)), source: a.source as ApplicationSource }))
        .sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt)),
      tests: testRows(sessions, from, to),
      impact: impact(cohort, sessions, from, to),
      disclosure: { gender: disclosed("gender"), age: disclosed("ageBand") },
      departments: [...new Set(analyticsVacancies.map((v) => v.department))].sort(),
      vacancyOptions: analyticsVacancies.filter((v) => f.department === "all" || v.department === f.department).map((v) => ({ id: v.id, title: v.title, department: v.department })),
    };
  },
};
