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

export type NotificationKind = "application" | "interview" | "offer" | "processing" | "mention" | "system";

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
  | "interview"
  | "offer"
  | "hired"
  | "rejected"
  | "withdrawn";

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
