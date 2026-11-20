/** Analytics & reporting (Module 13). Every figure is generated from fictional records. */
import type { ApplicationSource, ApplicationStage } from "./index";

export type AnalyticsPeriod = "30d" | "90d" | "12m";
export type FunnelStage = Extract<ApplicationStage, "applied" | "screening" | "shortlisted" | "assessment" | "interview" | "offer" | "hired">;
export type Gender = "Woman" | "Man";
export type AgeBand = "Under 30" | "30–39" | "40 and over";

export interface AnalyticsVacancy {
  id: string;
  title: string;
  department: string;
  location: string;
  recruiter: string;
  hiringManager: string;
  openedAt: string;
  /** When applications closed; null while open. */
  closedAt: string | null;
  status: "open" | "paused" | "closed" | "filled";
  openings: number;
  /** Tests sent at the assessment stage. */
  battery: string[];
}

export interface AnalyticsApplication {
  id: string;
  vacancyId: string;
  source: ApplicationSource;
  appliedAt: string;
  /** Date each stage was reached, in order. The last entry is the furthest stage. */
  stages: { stage: FunnelStage; at: string }[];
  outcome: "active" | "hired" | "rejected" | "withdrawn" | "offer_declined";
  /** Voluntary, self-declared equal-opportunity data. Never shown per person. */
  gender: Gender | null;
  ageBand: AgeBand | null;
}

export interface AnalyticsTestSession {
  id: string;
  applicationId: string;
  testId: string;
  sentAt: string;
  startedAt: string | null;
  completedAt: string | null;
  status: "completed" | "in_progress" | "not_started" | "abandoned" | "expired";
  minutes: number | null;
  sten: number | null;
  percentile: number | null;
}

export interface AnalyticsFilters {
  period: AnalyticsPeriod;
  department: string | "all";
  vacancyId: string | "all";
}

export interface KpiFigure {
  id: "applications" | "hires" | "tth" | "acceptance" | "completion";
  label: string;
  value: number | null;
  unit?: string;
  /** Change against the previous period of the same length; null when there's nothing to compare. */
  delta: number | null;
  deltaUnit?: "%" | "pts" | "days";
  better: "up" | "down";
  hint: string;
}

export interface FunnelRow {
  stage: FunnelStage;
  count: number;
  /** Share of the previous stage that reached this one. */
  conversion: number | null;
  /** Median days spent reaching this stage from the previous one. */
  medianDays: number | null;
}

export interface TrendBucket {
  label: string;
  /** Long form for tooltips and tables, e.g. "Week of 2 Nov". */
  detail: string;
  start: string;
  applications: number;
}

export interface VacancyRow {
  id: string;
  title: string;
  department: string;
  recruiter: string;
  status: AnalyticsVacancy["status"];
  daysOpen: number;
  applications: number;
  shortlisted: number;
  interviews: number;
  offers: number;
  hires: number;
  openings: number;
  /** Days from opening to the last offer accepted. */
  timeToFill: number | null;
}

export interface SourceRow {
  source: ApplicationSource;
  applications: number;
  shortlistRate: number;
  interviews: number;
  hires: number;
  spendUsd: number;
  costPerHire: number | null;
}

export interface RecruiterRow {
  name: string;
  vacancies: number;
  applications: number;
  /** Median days from application to first screening decision. */
  medianDaysToReview: number | null;
  interviews: number;
  offers: number;
  accepted: number;
  hires: number;
  medianTimeToHire: number | null;
}

export interface HireRow {
  vacancyTitle: string;
  appliedAt: string;
  acceptedAt: string;
  days: number;
  source: ApplicationSource;
}

export interface TestRow {
  testId: string;
  name: string;
  sent: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  abandoned: number;
  completionRate: number | null;
  medianMinutes: number | null;
  timeLimit: number;
  /** Median days from invitation to completion. */
  medianDaysToComplete: number | null;
  /** Share of completed sessions in each sten, 1 to 10 (percent). */
  stens: number[];
  meanSten: number | null;
}

export interface ImpactGroup {
  group: string;
  n: number;
  selected: number;
  rate: number | null;
  /** Rate divided by the highest group rate; below 0.8 is flagged for review. */
  ratio: number | null;
  /** Too few people to compare. */
  suppressed: boolean;
}

export interface ImpactRow {
  id: string;
  /** e.g. "Shortlisted from applications" or "Numerical Reasoning: sten 5 or above". */
  decision: string;
  kind: "stage" | "test";
  dimension: "Gender" | "Age";
  groups: ImpactGroup[];
  /**
   * review: a group is below the four-fifths guide and the gap is statistically significant (p < 0.05).
   * watch: below the guide, but the numbers are too small to rule out chance.
   * insufficient: fewer than two groups are large enough to compare.
   */
  status: "ok" | "review" | "watch" | "insufficient";
  flagged: boolean;
}

export interface AnalyticsReport {
  filters: AnalyticsFilters;
  range: { from: string; to: string; label: string; previousLabel: string | null };
  kpis: KpiFigure[];
  trend: TrendBucket[];
  funnel: FunnelRow[];
  outcomes: { rejected: number; withdrawn: number; declined: number; active: number };
  vacancies: VacancyRow[];
  sources: SourceRow[];
  recruiters: RecruiterRow[];
  hires: HireRow[];
  tests: TestRow[];
  impact: ImpactRow[];
  /** Share of applicants who chose to give gender and age. */
  disclosure: { gender: number; age: number };
  departments: string[];
  vacancyOptions: { id: string; title: string; department: string }[];
}
