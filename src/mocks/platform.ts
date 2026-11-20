/**
 * MOCK DATA — Vettly platform administration (Module 15). Tenants, staff and incidents are fictional.
 * Msasa Financial and Matobo Logistics match the organisations used everywhere else in the app.
 * Model ids are real Claude model names; costs are illustrative, not price quotes.
 */
import type { AiTaskConfig, AssessmentProvider, Incident, PlatformAuditEvent, PlatformSnapshot, PlatformUser, ServiceHealth, ServiceStatus, Tenant } from "@/types/platform";

const t = (id: string, name: string, industry: string, country: string, plan: Tenant["plan"], status: Tenant["status"], arrUsd: number, seats: [number, number], tests: [number, number], cv30d: number, apps30d: number, createdAt: string, renewsAt: string, lastActiveAt: string, admin: [string, string], extra: Partial<Tenant> = {}): Tenant => ({
  id,
  name,
  industry,
  country,
  plan,
  billing: plan === "starter" ? "monthly" : "annual",
  status,
  arrUsd,
  seatsUsed: seats[0],
  seatsTotal: seats[1],
  testCreditsUsed: tests[0],
  testCreditsTotal: tests[1],
  cvProcessed30d: cv30d,
  applications30d: apps30d,
  createdAt,
  renewsAt,
  lastActiveAt,
  adminName: admin[0],
  adminEmail: admin[1],
  supportAccessUntil: null,
  assessmentProvider: "Vettly Assessments",
  notes: [],
  ...extra,
});

export const tenants: Tenant[] = [
  t("org_msasa", "Msasa Financial Group", "Financial services", "Zimbabwe", "growth", "active", 4800, [14, 20], [312, 500], 296, 312, "2025-03-01", "2027-03-01", "2026-11-18T09:28:00+02:00", ["Chenai Mutizwa", "chenai.mutizwa@msasafinancial.example"], {
    supportAccessUntil: "2026-11-20T17:00:00+02:00",
    notes: ["Granted support access for the CV batch correction issue (ticket 4471)."],
  }),
  t("org_matobo", "Matobo Logistics", "Transport & logistics", "Zimbabwe", "starter", "active", 1200, [4, 5], [61, 100], 48, 57, "2026-02-14", "2026-12-14", "2026-11-17T14:02:00+02:00", ["Thulani Ncube", "thulani.ncube@matobologistics.example"]),
  t("org_kalahari", "Kalahari Mining Services", "Mining", "Botswana", "enterprise", "active", 21600, [64, 80], [1890, 3000], 1120, 1304, "2024-09-01", "2027-09-01", "2026-11-18T08:40:00+02:00", ["Neo Mothibi", "neo.mothibi@kalaharimining.example"], {
    assessmentProvider: "Baobab Psychometrics",
    notes: ["Uses Baobab's mechanical reasoning tests for artisan roles."],
  }),
  t("org_zambezi", "Zambezi Agro Holdings", "Agriculture", "Zambia", "growth", "active", 4800, [11, 20], [204, 500], 188, 221, "2025-07-10", "2026-12-10", "2026-11-16T11:15:00+02:00", ["Mutale Chanda", "mutale.chanda@zambeziagro.example"], { notes: ["Renewal in 22 days. Account manager to call."] }),
  t("org_ubuntu", "Ubuntu Health Network", "Healthcare", "South Africa", "enterprise", "active", 18000, [52, 60], [940, 2000], 760, 812, "2025-01-20", "2027-01-20", "2026-11-18T07:55:00+02:00", ["Lerato Khumalo", "lerato.khumalo@ubuntuhealth.example"]),
  t("org_mopane", "Mopane Retail", "Retail", "South Africa", "growth", "past_due", 4800, [18, 20], [470, 500], 402, 488, "2025-05-02", "2026-11-02", "2026-11-17T16:30:00+02:00", ["Sizwe Mahlangu", "sizwe.mahlangu@mopaneretail.example"], {
    notes: ["Renewal invoice INV-2026-1102 unpaid, 16 days overdue. Reminder sent 12 Nov.", "Test credits at 94%. Suggest a top-up."],
  }),
  t("org_chimanimani", "Chimanimani Insurance", "Insurance", "Zimbabwe", "growth", "trial", 0, [6, 20], [38, 50], 64, 71, "2026-11-04", "2026-12-04", "2026-11-18T09:10:00+02:00", ["Rufaro Mlambo", "rufaro.mlambo@chimanimani.example"], { billing: "monthly", notes: ["Trial ends 4 Dec. Strong usage: 71 applications in 2 weeks."] }),
  t("org_victoria", "Victoria Falls Hospitality", "Hospitality", "Zimbabwe", "starter", "active", 1200, [3, 5], [22, 100], 31, 40, "2026-04-18", "2026-12-18", "2026-11-12T10:00:00+02:00", ["Tsitsi Nyathi", "tsitsi.nyathi@vfhospitality.example"]),
  t("org_copperbelt", "Copperbelt Energy Partners", "Energy", "Zambia", "enterprise", "active", 15600, [41, 50], [610, 1500], 505, 560, "2025-10-01", "2026-10-01", "2026-11-18T06:45:00+02:00", ["Bwalya Musonda", "bwalya.musonda@copperbeltenergy.example"], {
    renewsAt: "2027-10-01",
    assessmentProvider: "Kopje Talent Measures",
    notes: ["Testing Kopje's integrity questionnaire on two vacancies before switching fully."],
  }),
  t("org_limpopo", "Limpopo Freight", "Transport & logistics", "South Africa", "starter", "suspended", 1200, [5, 5], [100, 100], 0, 0, "2025-08-11", "2026-09-11", "2026-09-30T12:00:00+02:00", ["Johan Pretorius", "johan.pretorius@limpopofreight.example"], {
    notes: ["Suspended 15 Oct after two unpaid renewals. Data kept until 15 Jan 2027, then deleted unless the account is restored."],
  }),
  t("org_okavango", "Okavango Wildlife Trust", "NGO", "Botswana", "starter", "active", 0, [2, 5], [9, 100], 12, 19, "2026-06-01", "2027-06-01", "2026-11-09T15:20:00+02:00", ["Kagiso Sebego", "kagiso.sebego@okavangotrust.example"], { notes: ["Non-profit programme: free Starter plan."] }),
  t("org_harare_city", "Harare Water & Sanitation Trust", "Public sector", "Zimbabwe", "growth", "active", 4320, [17, 20], [288, 500], 341, 402, "2025-11-15", "2026-11-15", "2026-11-18T08:05:00+02:00", ["Farai Chigumba", "farai.chigumba@hwst.example"], { renewsAt: "2027-11-15", notes: ["Renewed 15 Nov with 10% public-sector discount."] }),
];

export const platformUsers: PlatformUser[] = [
  { id: "pu_grace", name: "Grace Nyathi", email: "grace@vettly.example", kind: "staff", role: "Super administrator", tenant: null, status: "active", twoFactor: true, lastSignInAt: "2026-11-18T08:02:00+02:00" },
  { id: "pu_tawanda", name: "Tawanda Mhike", email: "tawanda@vettly.example", kind: "staff", role: "Support lead", tenant: null, status: "active", twoFactor: true, lastSignInAt: "2026-11-18T07:41:00+02:00" },
  { id: "pu_ama", name: "Ama Boateng", email: "ama@vettly.example", kind: "staff", role: "Engineer on call", tenant: null, status: "active", twoFactor: true, lastSignInAt: "2026-11-18T06:12:00+02:00" },
  { id: "pu_dumi", name: "Dumisani Zulu", email: "dumisani@vettly.example", kind: "staff", role: "Finance", tenant: null, status: "active", twoFactor: true, lastSignInAt: "2026-11-17T15:30:00+02:00" },
  { id: "pu_nyasha", name: "Nyasha Chari", email: "nyasha@vettly.example", kind: "staff", role: "Psychometrician", tenant: null, status: "invited", twoFactor: false, lastSignInAt: null },
  ...tenants.map<PlatformUser>((x, i) => ({
    id: `pu_${x.id}`,
    name: x.adminName,
    email: x.adminEmail,
    kind: "tenant_admin",
    role: "Organisation admin",
    tenant: x.name,
    status: x.id === "org_mopane" ? "locked" : "active",
    twoFactor: i % 4 !== 3,
    lastSignInAt: x.lastActiveAt,
  })),
];

/** Deterministic history: mostly operational, with the incidents below marked on their days. */
function history(marks: Record<number, ServiceStatus>): ServiceStatus[] {
  return Array.from({ length: 30 }, (_, i) => marks[i] ?? "operational");
}

export const services: ServiceHealth[] = [
  { id: "web", name: "Web app", description: "app.vettly.example", status: "operational", uptime30d: 99.98, metric: "p95 310 ms", days: history({}) },
  { id: "api", name: "API", description: "Public and internal API", status: "operational", uptime30d: 99.95, metric: "p95 180 ms", days: history({ 11: "degraded" }) },
  { id: "cv", name: "CV extraction", description: "Reading and structuring uploaded CVs", status: "operational", uptime30d: 99.9, metric: "queue 4 · 38 s per CV", days: history({ 22: "degraded" }) },
  { id: "matching", name: "AI matching", description: "Requirement-by-requirement assessments", status: "operational", uptime30d: 99.93, metric: "p95 14 s", days: history({}) },
  { id: "tests", name: "Test delivery", description: "Candidate test pages and scoring", status: "operational", uptime30d: 100, metric: "1,284 sessions today", days: history({}) },
  { id: "email", name: "Email", description: "Invitations, reminders and notifications", status: "operational", uptime30d: 99.99, metric: "98.7% delivered", days: history({}) },
  { id: "sms", name: "SMS", description: "Test invitations and reminders by SMS", status: "degraded", uptime30d: 98.6, metric: "Zimbabwe delays up to 20 min", days: history({ 27: "degraded", 28: "degraded", 29: "degraded" }) },
  { id: "storage", name: "Document storage", description: "CVs, letters and reports", status: "operational", uptime30d: 100, metric: "2.4 TB", days: history({ 6: "maintenance" }) },
];

export const incidents: Incident[] = [
  {
    id: "inc_sms",
    title: "SMS delays to Zimbabwean numbers",
    service: "SMS",
    severity: "minor",
    status: "monitoring",
    startedAt: "2026-11-16T07:20:00+02:00",
    resolvedAt: null,
    updates: [
      { at: "2026-11-18T08:00:00+02:00", text: "Messages now arriving within 20 minutes. Email invitations are unaffected; reminders also go by email." },
      { at: "2026-11-16T09:05:00+02:00", text: "Our SMS gateway confirmed a routing problem with one Zimbabwean network. Switched to the secondary route." },
      { at: "2026-11-16T07:20:00+02:00", text: "Investigating reports of test invitations by SMS arriving late." },
    ],
  },
  {
    id: "inc_cv",
    title: "Slow CV processing for scanned PDFs",
    service: "CV extraction",
    severity: "minor",
    status: "resolved",
    startedAt: "2026-11-11T13:10:00+02:00",
    resolvedAt: "2026-11-11T16:45:00+02:00",
    updates: [{ at: "2026-11-11T16:45:00+02:00", text: "Resolved. A burst of large scanned files filled the text-recognition queue; we added capacity and now split files over 20 pages." }],
  },
  {
    id: "inc_api",
    title: "Elevated API errors",
    service: "API",
    severity: "major",
    status: "resolved",
    startedAt: "2026-10-30T10:02:00+02:00",
    resolvedAt: "2026-10-30T10:41:00+02:00",
    updates: [{ at: "2026-10-30T10:41:00+02:00", text: "Resolved. A database failover took longer than expected. 39 minutes of intermittent errors; no data was lost." }],
  },
];

export const aiModels = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", note: "Most capable. Slower and costs more." },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "Strong reasoning at moderate cost." },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", note: "Fastest and cheapest. Good for extraction." },
  { id: "claude-fable-5-2", label: "Claude Fable 5.2", note: "Writing-focused." },
];

export const aiTasks: AiTaskConfig[] = [
  { task: "cv_extraction", label: "CV extraction", description: "Turns uploaded CVs into structured profiles for HR to check.", model: "claude-haiku-5-5", fallback: "claude-sonnet-5-5", maxOutputTokens: 4000, agreement: 93, calls30d: 6840, cost30d: 412, p95Seconds: 9 },
  { task: "matching", label: "Requirement matching", description: "Assesses each candidate against each vacancy requirement, with evidence. Always reviewed by HR.", model: "claude-sonnet-5-5", fallback: "claude-opus-5-5", maxOutputTokens: 6000, agreement: 81, calls30d: 5210, cost30d: 1186, p95Seconds: 14 },
  { task: "job_description", label: "Job description assist", description: "Drafts job descriptions and requirements from a short brief.", model: "claude-sonnet-5-5", fallback: "claude-haiku-5-5", maxOutputTokens: 3000, agreement: null, calls30d: 412, cost30d: 38, p95Seconds: 11 },
  { task: "interview_questions", label: "Interview questions", description: "Suggests questions tied to a vacancy's requirements.", model: "claude-haiku-5-5", fallback: "claude-sonnet-5-5", maxOutputTokens: 2000, agreement: null, calls30d: 655, cost30d: 21, p95Seconds: 6 },
];

export const providers: AssessmentProvider[] = [
  { id: "prov_vettly", name: "Vettly Assessments", kind: "in_house", status: "active", tests: 29, tenants: 10, resultLatency: "Instant", note: "Our own tests and norms. Every tenant has access." },
  { id: "prov_baobab", name: "Baobab Psychometrics", kind: "partner", status: "active", tests: 14, tenants: 1, resultLatency: "About 2 min", note: "Mechanical and technical reasoning for mining and engineering roles. Results arrive by webhook." },
  { id: "prov_kopje", name: "Kopje Talent Measures", kind: "partner", status: "testing", tests: 6, tenants: 1, resultLatency: "About 5 min", note: "Integrity and work-style questionnaires. In a pilot with one tenant before general release." },
];

export const platformAudit: PlatformAuditEvent[] = [
  { id: "pa_9", at: "2026-11-18T08:10:00+02:00", actor: "Tawanda Mhike", action: "Used support access", target: "Msasa Financial Group", detail: "Viewed CV batch settings for ticket 4471. No candidate records opened." },
  { id: "pa_8", at: "2026-11-17T09:00:00+02:00", actor: "Ama Boateng", action: "Changed fallback model", target: "Requirement matching", detail: "claude-sonnet-5-5 → claude-opus-5-5 after a timeout spike" },
  { id: "pa_7", at: "2026-11-16T09:05:00+02:00", actor: "Ama Boateng", action: "Switched SMS route", target: "SMS", detail: "Zimbabwe traffic to the secondary gateway" },
  { id: "pa_6", at: "2026-11-15T10:20:00+02:00", actor: "Dumisani Zulu", action: "Renewed subscription", target: "Harare Water & Sanitation Trust", detail: "Growth, annual, 10% public-sector discount" },
  { id: "pa_5", at: "2026-11-12T08:30:00+02:00", actor: "Dumisani Zulu", action: "Sent payment reminder", target: "Mopane Retail", detail: "INV-2026-1102, US$4,800" },
  { id: "pa_4", at: "2026-11-04T11:00:00+02:00", actor: "Grace Nyathi", action: "Started trial", target: "Chimanimani Insurance", detail: "Growth trial, 30 days, 50 test credits" },
  { id: "pa_3", at: "2026-10-15T09:00:00+02:00", actor: "Grace Nyathi", action: "Suspended organisation", target: "Limpopo Freight", detail: "Two unpaid renewals. Data kept for 90 days." },
  { id: "pa_2", at: "2026-10-01T12:00:00+02:00", actor: "Nyasha Chari", action: "Approved norm group", target: "PROF-ZA", detail: "Refreshed with 2025–26 data, n = 3,120" },
  { id: "pa_1", at: "2026-09-20T14:00:00+02:00", actor: "Grace Nyathi", action: "Enabled partner provider", target: "Kopje Talent Measures", detail: "Pilot with Copperbelt Energy Partners" },
];

export const platformSeed: Omit<PlatformSnapshot, "ai"> & { aiPolicy: PlatformSnapshot["ai"]["policy"] } = {
  tenants,
  users: platformUsers,
  services,
  incidents,
  providers,
  disabledTests: ["tst_typing"],
  audit: platformAudit,
  aiPolicy: { provider: "Anthropic", zeroRetention: true, redactContactDetails: true, humanReviewRequired: true, monthlyBudgetUsd: 2500, spentThisMonthUsd: 1657 },
};
