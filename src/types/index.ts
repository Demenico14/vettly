/**
 * Domain types shared by mock data, services and UI.
 * These mirror the shapes the real API will return; keep them stable across the backend swap.
 */

export type Role = "super_admin" | "org_admin" | "hr_manager" | "recruiter" | "hiring_manager";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  avatarUrl?: string;
}

export type PlanTier = "starter" | "growth" | "enterprise";

export interface Organisation {
  id: string;
  name: string;
  shortName: string;
  industry: string;
  city: string;
  country: string;
  plan: PlanTier;
  seatsUsed: number;
  seatsTotal: number;
}

export type NotificationKind = "application" | "assessment" | "interview" | "offer" | "processing" | "mention" | "system";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

export type VacancyStatus = "draft" | "open" | "paused" | "closed" | "filled";

export type ApplicationStage =
  | "applied"
  | "screening"
  | "shortlisted"
  | "assessment"
  | "interview"
  | "offer"
  | "hired"
  | "rejected"
  | "withdrawn";

/** Psychometric test categories offered in the test library (Module 9). */
export type PsychometricTestType = "personality" | "cognitive" | "numerical" | "verbal" | "situational_judgement" | "integrity";

/** Lifecycle of a psychometric test sent to a candidate. */
export type TestInvitationStatus = "not_sent" | "sent" | "opened" | "in_progress" | "completed" | "expired" | "cancelled";

/** Who produced an assessment. AI output is illustrative until a person confirms it. */
export type AssessmentProvenance = "ai_illustrative" | "hr_confirmed" | "hr_overridden";

export interface CandidateSummary {
  id: string;
  name: string;
  headline: string;
  location: string;
  appliedFor: string;
  stage: ApplicationStage;
  matchScore: number;
  provenance: AssessmentProvenance;
  appliedAt: string;
  topSkills: string[];
}

/* ---------- Authentication & onboarding (Module 2) ---------- */

export interface Session {
  user: User;
  organisationId: string | null;
  /** True until the first organisation's setup wizard is finished. */
  needsOnboarding: boolean;
}

export type AuthErrorCode =
  | "invalid_credentials"
  | "account_locked"
  | "email_taken"
  | "invalid_code"
  | "code_expired"
  | "token_invalid"
  | "token_expired"
  | "network";

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export interface TeamInvitation {
  token: string;
  organisationName: string;
  organisationCity: string;
  invitedBy: string;
  invitedByTitle: string;
  email: string;
  role: Role;
  expiresAt: string;
  status: "pending" | "accepted" | "expired" | "revoked";
}

export type OrganisationSize = "1-50" | "51-200" | "201-1000" | "1000+";

export interface OrganisationDraft {
  name: string;
  industry: string;
  size: OrganisationSize;
  country: string;
  city: string;
  slug: string;
}

export interface OrganisationSetup {
  brandColour: string;
  logoFileName: string | null;
  currency: "USD" | "ZiG" | "ZAR" | "BWP" | "ZMW";
  timezone: string;
  stages: string[];
  defaultTestDeadlineDays: number;
  sendTestsOnShortlist: boolean;
  defaultBattery: string | null;
  invites: { email: string; role: Role }[];
}

/** What a candidate sees when opening a psychometric test link (Module 9 builds the test itself). */
export interface CandidateTestAccess {
  token: string;
  status: "ready" | "in_progress" | "completed" | "expired";
  candidateName: string;
  candidateEmailMasked: string;
  organisationName: string;
  organisationColour: string;
  vacancyTitle: string;
  deadline: string;
  tests: { name: string; type: PsychometricTestType; minutes: number; timed: boolean }[];
  extraTimePercent: number;
}

/* ---------- HR dashboard (Module 3) ---------- */

export type DashboardPeriod = "7d" | "30d" | "90d";

export interface Kpi {
  id: string;
  label: string;
  value: number;
  unit?: string;
  /** Change versus the previous period of the same length. */
  delta: number;
  deltaUnit?: "%" | "";
  /** Which direction is good for this measure ("none" = neutral). */
  better: "up" | "down" | "none";
  /** Eight equal buckets ending now, oldest first. */
  history: number[];
  historyLabel: string;
  href: string;
}

export interface VacancySummary {
  id: string;
  title: string;
  department: string;
  location: string;
  status: VacancyStatus;
  openedAt: string;
  closesAt: string | null;
  applicants: number;
  newApplicants: number;
  shortlisted: number;
  interviewing: number;
  hiringManager: string;
}

export interface FunnelStep {
  stage: ApplicationStage;
  count: number;
}

export type AttentionKind = "ai_review" | "test_results" | "offer_pending" | "cv_failed" | "closing_soon";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  title: string;
  detail: string;
  count: number;
  href: string;
}

export interface InterviewSlot {
  id: string;
  candidateName: string;
  candidateHeadline: string;
  vacancyTitle: string;
  startsAt: string;
  durationMin: number;
  format: "In person" | "Video" | "Phone";
  location: string;
  panel: string[];
  round: string;
}

export type ActivityKind = "stage" | "application" | "assessment" | "interview" | "offer" | "vacancy" | "ai";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  actor: string;
  /** Sentence after the actor, e.g. "moved Rutendo Chikwanha to Interview". */
  text: string;
  context: string;
  at: string;
}

export interface TestInvitationSummary {
  id: string;
  candidateName: string;
  vacancyTitle: string;
  battery: string;
  status: TestInvitationStatus;
  sentAt: string;
  deadline: string;
  completed: number;
  total: number;
}

export interface RecentApplication extends CandidateSummary {
  source: "Vettly careers page" | "LinkedIn" | "Email (CV upload)" | "Referral" | "Indeed";
}

export interface DashboardSnapshot {
  period: DashboardPeriod;
  kpis: Kpi[];
  attention: AttentionItem[];
  vacancies: VacancySummary[];
  interviews: InterviewSlot[];
  tests: TestInvitationSummary[];
  applications: RecentApplication[];
  activity: ActivityEvent[];
}
