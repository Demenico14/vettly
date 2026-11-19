/**
 * MOCK DATA — Phase 1 only. Illustrative dashboard figures for the fictional Msasa Financial Group.
 * Every number here is invented. People, vacancies and stages match src/mocks/data.ts so the same
 * candidate shows the same details everywhere.
 */
import type {
  ActivityEvent,
  AttentionItem,
  DashboardPeriod,
  DashboardSnapshot,
  FunnelStep,
  InterviewSlot,
  Kpi,
  RecentApplication,
  TestInvitationSummary,
  VacancySummary,
} from "@/types";
import { candidates } from "./data";
import { vacancyRecords } from "./vacancies";

export const PERIOD_LABEL: Record<DashboardPeriod, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

const PREVIOUS_LABEL: Record<DashboardPeriod, string> = {
  "7d": "previous 7 days",
  "30d": "previous 30 days",
  "90d": "previous 90 days",
};

const HISTORY_LABEL: Record<DashboardPeriod, string> = {
  "7d": "Last 8 days",
  "30d": "Last 8 weeks",
  "90d": "Last 8 months",
};

/** Summaries come from the vacancy records so both screens always agree. */
export const vacancySummaries: VacancySummary[] = vacancyRecords.map((v) => ({
  id: v.id,
  title: v.title,
  department: v.department,
  location: v.location,
  status: v.status,
  openedAt: v.openedAt,
  closesAt: v.closesAt,
  applicants: v.applicants,
  newApplicants: v.newApplicants,
  shortlisted: v.shortlisted,
  interviewing: v.interviewing,
  hiringManager: v.hiringManager,
}));

const STAGES = ["applied", "screening", "shortlisted", "assessment", "interview", "offer", "hired"] as const;

/** Applications reaching each stage in the last 30 days, per vacancy. */
const FUNNEL_30D: Record<string, number[]> = {
  vac_swdev: [124, 71, 14, 6, 5, 1, 0],
  vac_fin: [86, 52, 11, 8, 4, 1, 0],
  vac_data: [52, 34, 8, 5, 3, 0, 0],
  vac_mkt: [31, 18, 5, 3, 1, 0, 0],
  vac_ops: [19, 11, 3, 2, 2, 0, 0],
  vac_hro: [0, 0, 0, 0, 0, 2, 1],
};

const PERIOD_FACTOR: Record<DashboardPeriod, number> = { "7d": 0.26, "30d": 1, "90d": 2.7 };

export function funnelFor(period: DashboardPeriod, vacancyId: string | "all"): FunnelStep[] {
  const ids = vacancyId === "all" ? Object.keys(FUNNEL_30D) : [vacancyId];
  const f = PERIOD_FACTOR[period];
  return STAGES.map((stage, i) => ({
    stage,
    count: ids.reduce((sum, id) => sum + Math.round((FUNNEL_30D[id]?.[i] ?? 0) * f), 0),
  }));
}

const KPIS: Record<DashboardPeriod, Kpi[]> = {
  "7d": [
    { id: "open", label: "Open vacancies", value: 4, delta: 0, better: "none", history: [4, 4, 4, 5, 5, 4, 4, 4], historyLabel: "Last 8 days", href: "/vacancies" },
    { id: "applications", label: "Applications", value: 78, delta: 12, deltaUnit: "%", better: "up", history: [9, 7, 12, 8, 11, 14, 10, 16], historyLabel: "Last 8 days", href: "/candidates" },
    { id: "shortlisted", label: "Shortlisted", value: 11, delta: 3, better: "up", history: [1, 0, 2, 1, 2, 3, 1, 2], historyLabel: "Last 8 days", href: "/pipeline" },
    { id: "tests", label: "Tests awaiting completion", value: 12, delta: -3, better: "down", history: [15, 15, 14, 16, 15, 13, 12, 12], historyLabel: "Last 8 days", href: "/assessments" },
    { id: "interviews", label: "Interviews next 7 days", value: 9, delta: 2, better: "none", history: [5, 6, 6, 7, 7, 8, 9, 9], historyLabel: "Last 8 days", href: "/interviews" },
    { id: "tth", label: "Median time to hire", value: 23, unit: "days", delta: -1, better: "down", history: [25, 25, 24, 24, 24, 24, 23, 23], historyLabel: "Last 8 days", href: "/analytics" },
  ],
  "30d": [
    { id: "open", label: "Open vacancies", value: 4, delta: 1, better: "none", history: [3, 3, 4, 4, 5, 5, 4, 4], historyLabel: "Last 8 weeks", href: "/vacancies" },
    { id: "applications", label: "Applications", value: 312, delta: 18, deltaUnit: "%", better: "up", history: [41, 52, 48, 61, 70, 66, 82, 94], historyLabel: "Last 8 weeks", href: "/candidates" },
    { id: "shortlisted", label: "Shortlisted", value: 41, delta: 6, better: "up", history: [6, 8, 7, 9, 10, 9, 11, 12], historyLabel: "Last 8 weeks", href: "/pipeline" },
    { id: "tests", label: "Tests awaiting completion", value: 12, delta: -3, better: "down", history: [4, 6, 9, 11, 14, 17, 15, 12], historyLabel: "Last 8 weeks", href: "/assessments" },
    { id: "interviews", label: "Interviews next 7 days", value: 9, delta: 2, better: "none", history: [3, 5, 4, 6, 7, 6, 7, 9], historyLabel: "Last 8 weeks", href: "/interviews" },
    { id: "tth", label: "Median time to hire", value: 23, unit: "days", delta: -4, better: "down", history: [31, 30, 29, 28, 27, 26, 24, 23], historyLabel: "Last 8 weeks", href: "/analytics" },
  ],
  "90d": [
    { id: "open", label: "Open vacancies", value: 4, delta: 2, better: "none", history: [2, 2, 3, 3, 3, 4, 5, 4], historyLabel: "Last 8 months", href: "/vacancies" },
    { id: "applications", label: "Applications", value: 846, delta: 9, deltaUnit: "%", better: "up", history: [212, 240, 198, 256, 274, 231, 268, 312], historyLabel: "Last 8 months", href: "/candidates" },
    { id: "shortlisted", label: "Shortlisted", value: 102, delta: 14, better: "up", history: [24, 28, 22, 31, 33, 29, 35, 41], historyLabel: "Last 8 months", href: "/pipeline" },
    { id: "tests", label: "Tests awaiting completion", value: 12, delta: 7, better: "down", history: [0, 0, 0, 0, 2, 5, 9, 12], historyLabel: "Last 8 months", href: "/assessments" },
    { id: "interviews", label: "Interviews next 7 days", value: 9, delta: 2, better: "none", history: [4, 6, 5, 7, 6, 8, 7, 9], historyLabel: "Last 8 months", href: "/interviews" },
    { id: "tth", label: "Median time to hire", value: 23, unit: "days", delta: -6, better: "down", history: [34, 33, 31, 30, 28, 27, 25, 23], historyLabel: "Last 8 months", href: "/analytics" },
  ],
};

export { PREVIOUS_LABEL, HISTORY_LABEL };

const attention: AttentionItem[] = [
  { id: "att_ai", kind: "ai_review", title: "AI assessments awaiting your review", detail: "Data Analyst (4) and Finance Manager (3)", count: 7, href: "/matching" },
  { id: "att_tests", kind: "test_results", title: "Test results ready", detail: "Tafadzwa Ncube and Chipo Makoni, Finance Manager", count: 2, href: "/assessments" },
  { id: "att_closing", kind: "closing_soon", title: "Finance Manager closes in 2 days", detail: "Fri 20 Nov, 17:00 · 86 applicants, 11 shortlisted", count: 1, href: "/vacancies" },
  { id: "att_cv", kind: "cv_failed", title: "CVs need manual correction", detail: "Scanned PDFs, Finance Manager batch", count: 2, href: "/cv-processing" },
  { id: "att_offer", kind: "offer_pending", title: "Offer awaiting candidate response", detail: "Tinashe Mhlanga, Software Developer · sent 4 days ago", count: 1, href: "/offers" },
];

const interviews: InterviewSlot[] = [
  {
    id: "int_chipo",
    candidateName: "Chipo Makoni",
    candidateHeadline: "Group accountant · 7 yrs",
    vacancyTitle: "Finance Manager",
    startsAt: "2026-11-18T14:00:00+02:00",
    durationMin: 60,
    format: "Video",
    location: "Microsoft Teams",
    panel: ["Tendai Moyo", "Sipho Ndlovu", "Grace Nyathi"],
    round: "Panel interview",
  },
  {
    id: "int_rutendo",
    candidateName: "Rutendo Chikwanha",
    candidateHeadline: "Full-stack developer · 6 yrs",
    vacancyTitle: "Software Developer",
    startsAt: "2026-11-20T10:00:00+02:00",
    durationMin: 90,
    format: "In person",
    location: "Msasa House, 4th floor boardroom, Harare",
    panel: ["Tatenda Mutasa", "Kudzai Chirwa"],
    round: "Technical panel",
  },
  {
    id: "int_ruvimbo",
    candidateName: "Ruvimbo Gumbo",
    candidateHeadline: "Data engineer · 3 yrs",
    vacancyTitle: "Data Analyst",
    startsAt: "2026-11-21T09:00:00+02:00",
    durationMin: 30,
    format: "Phone",
    location: "+263 77 ••• 4120",
    panel: ["Kudzai Chirwa"],
    round: "Screening call",
  },
  {
    id: "int_nyasha",
    candidateName: "Nyasha Dube",
    candidateHeadline: "Data analyst · 4 yrs",
    vacancyTitle: "Data Analyst",
    startsAt: "2026-11-24T11:00:00+02:00",
    durationMin: 60,
    format: "Video",
    location: "Google Meet",
    panel: ["Tatenda Mutasa", "Tendai Moyo"],
    round: "Case study review",
  },
];

export const testInvitations: TestInvitationSummary[] = [
  { id: "tst_tafadzwa", candidateName: "Tafadzwa Ncube", vacancyTitle: "Finance Manager", battery: "Professional battery", status: "completed", sentAt: "2026-11-16T09:00:00+02:00", deadline: "2026-11-24T17:00:00+02:00", completed: 3, total: 3 },
  { id: "tst_chipo", candidateName: "Chipo Makoni", vacancyTitle: "Finance Manager", battery: "Professional battery", status: "completed", sentAt: "2026-11-15T09:00:00+02:00", deadline: "2026-11-20T17:00:00+02:00", completed: 2, total: 2 },
  { id: "tst_nyasha", candidateName: "Nyasha Dube", vacancyTitle: "Data Analyst", battery: "Professional battery", status: "in_progress", sentAt: "2026-11-16T09:00:00+02:00", deadline: "2026-11-26T17:00:00+02:00", completed: 1, total: 2 },
  { id: "tst_ruvimbo", candidateName: "Ruvimbo Gumbo", vacancyTitle: "Data Analyst", battery: "Professional battery", status: "opened", sentAt: "2026-11-17T15:00:00+02:00", deadline: "2026-11-22T17:00:00+02:00", completed: 0, total: 2 },
  { id: "tst_tinashe", candidateName: "Tinashe Mhlanga", vacancyTitle: "Software Developer", battery: "Professional battery", status: "completed", sentAt: "2026-11-08T09:00:00+02:00", deadline: "2026-11-13T17:00:00+02:00", completed: 2, total: 2 },
  { id: "tst_simba", candidateName: "Simba Chari", vacancyTitle: "Finance Manager", battery: "Professional battery", status: "expired", sentAt: "2026-11-07T09:00:00+02:00", deadline: "2026-11-12T17:00:00+02:00", completed: 0, total: 1 },
];

const SOURCES: Record<string, RecentApplication["source"]> = {
  cnd_kudakwashe: "Vettly careers page",
  cnd_ruvimbo: "LinkedIn",
  cnd_thandiwe: "LinkedIn",
  cnd_simba: "Email (CV upload)",
  cnd_nyasha: "Referral",
  cnd_lindiwe: "Indeed",
};

const applications: RecentApplication[] = candidates
  .filter((c) => c.id in SOURCES)
  .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
  .map((c) => ({ ...c, source: SOURCES[c.id]! }));

const activity: ActivityEvent[] = [
  { id: "act_1", kind: "application", actor: "Kudakwashe Sibanda", text: "applied for Software Developer", context: "Vettly careers page", at: "2026-11-18T06:45:00+02:00" },
  { id: "act_2", kind: "ai", actor: "Vettly", text: "suggested assessments for 14 new Software Developer applications", context: "Awaiting HR review", at: "2026-11-18T07:10:00+02:00" },
  { id: "act_3", kind: "assessment", actor: "Tafadzwa Ncube", text: "completed the Professional battery", context: "Finance Manager · 3 of 3 tests", at: "2026-11-18T05:55:00+02:00" },
  { id: "act_4", kind: "stage", actor: "Kudzai Chirwa", text: "moved Ruvimbo Gumbo to Shortlisted", context: "Data Analyst · “Strong SQL evidence, CV p.1”", at: "2026-11-17T16:20:00+02:00" },
  { id: "act_5", kind: "interview", actor: "Rutendo Chikwanha", text: "accepted the technical panel interview", context: "Thu 20 Nov, 10:00", at: "2026-11-17T16:12:00+02:00" },
  { id: "act_6", kind: "assessment", actor: "Kudzai Chirwa", text: "sent the Professional battery to Ruvimbo Gumbo", context: "Data Analyst · due Sat 22 Nov", at: "2026-11-17T15:00:00+02:00" },
  { id: "act_7", kind: "offer", actor: "Tendai Moyo", text: "sent an offer to Tinashe Mhlanga", context: "Software Developer · USD 2 400 / month", at: "2026-11-14T11:30:00+02:00" },
  { id: "act_8", kind: "vacancy", actor: "Tendai Moyo", text: "paused Operations Manager", context: "“Budget review until December”", at: "2026-11-13T09:15:00+02:00" },
];

export function snapshotFor(period: DashboardPeriod): DashboardSnapshot {
  return {
    period,
    kpis: KPIS[period],
    attention,
    vacancies: vacancySummaries,
    interviews,
    tests: testInvitations,
    applications,
    activity: [...activity].sort((a, b) => b.at.localeCompare(a.at)),
  };
}

/** An empty workspace: what a new organisation sees before any activity. */
export function emptySnapshot(period: DashboardPeriod): DashboardSnapshot {
  return {
    period,
    kpis: KPIS[period].map((k) => ({ ...k, value: 0, delta: 0, history: k.history.map(() => 0) })),
    attention: [],
    vacancies: [],
    interviews: [],
    tests: [],
    applications: [],
    activity: [],
  };
}
