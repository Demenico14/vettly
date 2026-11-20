/** Platform administration (Module 15). Vettly staff only; no tenant candidate data is shown here. */

export type TenantStatus = "active" | "trial" | "past_due" | "suspended";
export type PlanId = "starter" | "growth" | "enterprise";

export interface Tenant {
  id: string;
  name: string;
  industry: string;
  country: string;
  plan: PlanId;
  billing: "monthly" | "annual";
  status: TenantStatus;
  /** Annual contract value in USD. */
  arrUsd: number;
  seatsUsed: number;
  seatsTotal: number;
  testCreditsUsed: number;
  testCreditsTotal: number;
  cvProcessed30d: number;
  applications30d: number;
  createdAt: string;
  renewsAt: string;
  lastActiveAt: string;
  adminName: string;
  adminEmail: string;
  /** Time-limited support access the tenant granted; null when none. */
  supportAccessUntil: string | null;
  /** Assessment provider used for tests. */
  assessmentProvider: string;
  notes: string[];
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  kind: "staff" | "tenant_admin";
  role: string;
  tenant: string | null;
  status: "active" | "locked" | "invited";
  twoFactor: boolean;
  lastSignInAt: string | null;
}

export type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";
export interface ServiceHealth {
  id: string;
  name: string;
  description: string;
  status: ServiceStatus;
  uptime30d: number;
  /** Shown as the service's key number, e.g. "p95 280 ms" or "queue 12". */
  metric: string;
  /** Status for each of the last 30 days, oldest first. */
  days: ServiceStatus[];
}

export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: "minor" | "major";
  status: "investigating" | "monitoring" | "resolved";
  startedAt: string;
  resolvedAt: string | null;
  updates: { at: string; text: string }[];
}

export type AiTask = "cv_extraction" | "matching" | "job_description" | "interview_questions";
export interface AiTaskConfig {
  task: AiTask;
  label: string;
  description: string;
  model: string;
  fallback: string;
  maxOutputTokens: number;
  /** Share of outputs HR accepted without changes, from human review. */
  agreement: number | null;
  calls30d: number;
  /** Illustrative cost in USD. */
  cost30d: number;
  p95Seconds: number;
}

export interface AiPolicy {
  provider: string;
  zeroRetention: boolean;
  redactContactDetails: boolean;
  humanReviewRequired: boolean;
  monthlyBudgetUsd: number;
  spentThisMonthUsd: number;
}

export interface AssessmentProvider {
  id: string;
  name: string;
  kind: "in_house" | "partner";
  status: "active" | "testing" | "off";
  tests: number;
  tenants: number;
  /** Seconds from completion until results reach Vettly. */
  resultLatency: string;
  note: string;
}

export interface PlatformAuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

export interface PlatformSnapshot {
  tenants: Tenant[];
  users: PlatformUser[];
  services: ServiceHealth[];
  incidents: Incident[];
  ai: { policy: AiPolicy; tasks: AiTaskConfig[]; models: { id: string; label: string; note: string }[] };
  providers: AssessmentProvider[];
  /** Tests switched off platform-wide. */
  disabledTests: string[];
  audit: PlatformAuditEvent[];
}
