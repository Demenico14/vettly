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
  | "email_unverified"
  | "unavailable"
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
  /** The stored logo, uploaded during setup. */
  logoFileId?: string | null;
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
  status: "ready" | "in_progress" | "completed" | "expired" | "cancelled";
  candidateName: string;
  candidateEmailMasked: string;
  organisationName: string;
  organisationColour: string;
  /** The organisation's logo, when it has one and shows it on the test pages. */
  organisationLogoUrl: string | null;
  vacancyTitle: string;
  deadline: string;
  tests: {
    name: string;
    type: PsychometricTestType;
    minutes: number;
    timed: boolean;
    /** Present for links backed by the assessments store (Module 9). */
    id?: string;
    done?: boolean;
    /** Questions answered so far on an untimed test that was saved part-way. */
    saved?: number;
    /** Questions in the candidate's set. */
    questions?: number;
    /** The test's family, for its card. */
    kind?: string;
  }[];
  extraTimePercent: number;
  /** Consent was already given on an earlier visit. */
  consented: boolean;
  /** When the organisation records candidates: how, and what the candidate chose. */
  recording: { mode: "photos" | "video"; audio: boolean; keepDays: number; choice: "agreed" | "declined" | null; waived: boolean } | null;
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
  /** Where the event can be followed up. */
  href?: string;
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
  /** Scores for finished tests: percentile for ability and judgement tests, 0 for questionnaires (a profile). */
  results?: { test: string; percentile: number; band: string }[];
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

/* ---------- Vacancy management (Module 4) ---------- */

export type WorkMode = "On-site" | "Hybrid" | "Remote";
export type EmploymentType = "Full-time" | "Part-time" | "Contract" | "Internship";
export type RequirementKind = "skill" | "experience" | "education" | "certification" | "language";
export type RequirementPriority = "essential" | "desirable";

export interface Requirement {
  id: string;
  kind: RequirementKind;
  text: string;
  /** Minimum years, for experience requirements. */
  years?: number;
  priority: RequirementPriority;
}

/** Share of the overall match score per evidence category. Always sums to 100. */
export interface ScreeningWeights {
  skills: number;
  experience: number;
  education: number;
  certifications: number;
  assessments: number;
}

export type PublishChannel = "careers" | "linkedin" | "indeed" | "internal" | "vacancymail";

export interface StatusChange {
  status: VacancyStatus;
  at: string;
  by: string;
  reason?: string;
}

export interface Vacancy extends VacancySummary {
  reference: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  openings: number;
  currency: "USD" | "ZiG" | "ZAR" | "BWP" | "ZMW";
  salaryMin: number | null;
  salaryMax: number | null;
  salaryVisible: boolean;
  summary: string;
  responsibilities: string[];
  benefits: string[];
  requirements: Requirement[];
  weights: ScreeningWeights;
  assessment: { battery: string | null; autoSendOnShortlist: boolean; deadlineDays: number };
  channels: PublishChannel[];
  createdAt: string;
  updatedAt: string;
  history: StatusChange[];
}

/** Everything the editor edits; ids, counts and history are managed by the service. */
export type VacancyDraft = Pick<
  Vacancy,
  | "title"
  | "department"
  | "location"
  | "workMode"
  | "employmentType"
  | "openings"
  | "currency"
  | "salaryMin"
  | "salaryMax"
  | "salaryVisible"
  | "closesAt"
  | "hiringManager"
  | "summary"
  | "responsibilities"
  | "benefits"
  | "requirements"
  | "weights"
  | "assessment"
  | "channels"
>;

/* ---------- Candidate management (Module 5) ---------- */

export type SkillLevel = "Expert" | "Advanced" | "Intermediate" | "Basic";
export type Availability = "Immediately" | "2 weeks' notice" | "1 month's notice" | "3 months' notice";
export type ApplicationSource = "Vettly careers page" | "LinkedIn" | "Email (CV upload)" | "Referral" | "Indeed" | "VacancyMail" | "Talent pool";

export interface WorkExperience {
  id: string;
  title: string;
  company: string;
  location: string;
  /** YYYY-MM */
  start: string;
  end: string | null;
  bullets: string[];
}

export interface Education {
  id: string;
  institution: string;
  qualification: string;
  field: string;
  start: number;
  end: number | null;
  grade?: string;
}

export interface CandidateSkill {
  name: string;
  level: SkillLevel;
  years?: number;
}

export interface Certification {
  name: string;
  issuer: string;
  year: number;
  credentialId?: string;
}

export interface Project {
  name: string;
  description: string;
  year: number;
  link?: string;
}

export interface CandidateDocument {
  id: string;
  /** The stored file, when the document was uploaded (download at /api/files/<fileId>). */
  fileId?: string;
  name: string;
  kind: "CV" | "Cover letter" | "Certificate" | "Transcript" | "Other";
  sizeKb: number;
  pages: number;
  uploadedAt: string;
}

export interface ApplicationEvent {
  stage: ApplicationStage;
  at: string;
  by: string;
  note?: string;
}

export interface CandidateApplication {
  id: string;
  vacancyId: string;
  vacancyTitle: string;
  appliedAt: string;
  source: ApplicationSource;
  stage: ApplicationStage;
  matchScore: number;
  provenance: AssessmentProvenance;
  history: ApplicationEvent[];
}

export interface CandidateNote {
  id: string;
  author: string;
  body: string;
  at: string;
}

export interface CandidateProfile extends CandidateSummary {
  email: string;
  phone: string;
  linkedin: string | null;
  github?: string | null;
  website?: string | null;
  availability: Availability;
  currentEmployer: string | null;
  expectedSalary: string | null;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: CandidateSkill[];
  certifications: Certification[];
  projects: Project[];
  documents: CandidateDocument[];
  applications: CandidateApplication[];
  notes: CandidateNote[];
  tags: string[];
  inTalentPool: boolean;
}

/* ---------- CV upload & processing (Module 6) ---------- */

export type CvFileStatus = "queued" | "uploading" | "extracting" | "ready" | "needs_review" | "failed" | "added" | "discarded";
export type CvFailure = "password_protected" | "unreadable" | "not_a_cv";
export type CvFormat = "PDF" | "Word" | "Image";

/** A value Vettly read from the CV. `flag` says why Vettly is unsure; it is cleared once HR confirms or edits it. */
export interface ExtractedValue {
  value: string;
  flag?: string;
}

export interface ExtractedExperience {
  id: string;
  title: string;
  company: string;
  location: string;
  /** YYYY-MM */
  start: string;
  end: string | null;
  /** What the CV says about the role: duties and achievements, one per line. */
  bullets?: string[];
  flag?: string;
}

export interface ExtractedEducation {
  id: string;
  institution: string;
  qualification: string;
  field: string;
  end: number | null;
  flag?: string;
}

export interface ExtractedCertification {
  id: string;
  /** e.g. "Chartered Accountant CA(Z)". */
  name: string;
  /** The awarding or registering body, e.g. "ICAZ". */
  issuer: string;
  year: number | null;
  flag?: string;
}

export interface CvExtraction {
  name: ExtractedValue;
  email: ExtractedValue;
  phone: ExtractedValue;
  location: ExtractedValue;
  headline: ExtractedValue;
  currentEmployer: ExtractedValue;
  availability: ExtractedValue;
  summary: string;
  experience: ExtractedExperience[];
  education: ExtractedEducation[];
  /** Professional certifications, registrations and licences. Older extractions may not have them. */
  certifications?: ExtractedCertification[];
  skills: string[];
  pages: number;
  /** Read from a scan or photo, so characters may be misread. */
  ocr: boolean;
  /** Who read it: Vettly's local AI model (with the rules as a check), or the rule-based reader alone. */
  readBy?: "model" | "rules";
  /** LinkedIn, GitHub and personal website addresses on the CV, as absolute links. */
  links?: { linkedin: string | null; github: string | null; website: string | null };
}

export interface CvFile {
  id: string;
  batchId: string;
  /** The stored upload (view at /api/files/<fileId>). */
  fileId?: string;
  name: string;
  sizeKb: number;
  format: CvFormat;
  status: CvFileStatus;
  /** 0–100 within the current status (uploading or extracting). */
  progress: number;
  failure?: CvFailure;
  extraction?: CvExtraction;
  /** Set once the CV becomes (or joins) a candidate record. */
  candidateId?: string;
  /** Existing candidate with the same email or phone number. */
  duplicateOf?: { id: string; name: string };
  discardReason?: string;
  reviewedBy?: string;
  updatedAt: string;
}

export interface CvBatch {
  id: string;
  vacancyId: string;
  vacancyTitle: string;
  uploadedBy: string;
  uploadedAt: string;
  files: CvFile[];
}

/* ---------- AI recruitment intelligence (Module 7) ---------- */

/** "missing" means Vettly found no evidence either way; "not_met" means the CV shows it falls short. */
export type RequirementOutcome = "met" | "partial" | "not_met" | "missing";
export type EvidenceSource = "Experience" | "Skills" | "Education" | "Certifications" | "Summary" | "Projects";
export type ScoreCategory = keyof ScreeningWeights;

export interface Evidence {
  source: EvidenceSource;
  /** Where on the CV, e.g. "Senior Accountant, KPMG Zimbabwe · 2017–2021". */
  where: string;
  quote: string;
}

export interface RequirementReview {
  by: string;
  at: string;
  action: "agreed" | "changed";
  reason?: string;
}

export interface RequirementAssessment {
  requirement: Requirement;
  /** Current outcome: Vettly's, unless HR changed it. */
  outcome: RequirementOutcome;
  aiOutcome: RequirementOutcome;
  confidence: "high" | "medium" | "low";
  rationale: string;
  evidence: Evidence[];
  /** Suggested interview question when evidence is partial or missing. */
  question?: string;
  review?: RequirementReview;
}

export interface CategoryScore {
  category: ScoreCategory;
  weight: number;
  /** 0–100, or null when the vacancy has no requirement in this category (or no test results yet). */
  score: number | null;
}

export interface CandidateAssessment {
  candidateId: string;
  candidateName: string;
  headline: string;
  location: string;
  applicationId: string;
  vacancyId: string;
  vacancyTitle: string;
  stage: ApplicationStage;
  /** Score from CV evidence only, using the vacancy's weights. */
  score: number;
  /** Score Vettly first suggested, before any HR change. */
  aiScore: number;
  /** Psychometric average percentile, when tests are complete. A separate input from CV evidence. */
  testScore: number | null;
  /** Score including the assessments weight, when test results exist. */
  scoreWithTests: number | null;
  breakdown: CategoryScore[];
  explanation: string;
  strengths: string[];
  gaps: string[];
  skills: { matched: string[]; partial: string[]; missing: string[]; extra: string[] };
  requirements: RequirementAssessment[];
  provenance: AssessmentProvenance;
  confirmedBy?: string;
  confirmedAt?: string;
}
