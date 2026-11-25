/**
 * Psychometric assessment data model (Module 9). Shapes follow the research report
 * docs/reports/Workplace psychometric assessment database.md, section "Recommended mock data model".
 * Every seeded record is fictional and carries `isMock: true`.
 */

export type CountryCode = "ZA" | "ZW" | "ZM" | "BW";

export type AssessmentCategory =
  | "ability"
  | "personality"
  | "sjt"
  | "integrity"
  | "emotional_intelligence"
  | "motivation"
  | "job_knowledge"
  | "work_sample"
  | "typing"
  | "language";

/**
 * How the law treats the instrument. In South Africa, HPCSA classification decides who may use a test;
 * EEA s.8 evidence (validity, reliability, fairness, no bias) decides whether it may be used at all.
 */
export type RegulatoryClass = "psychological_hpcsa_classified" | "other_similar_assessment" | "skills_knowledge";

export type TestLevel = "operational" | "supervisory" | "graduate" | "professional" | "manager" | "any";
export type Delivery = "fixed" | "randomised_parallel" | "adaptive";
export type Timing = "section" | "per_item" | "untimed";
export type TestMode = "speed" | "power" | "hybrid" | "untimed";
export type ItemFormat =
  | "mcq"
  | "true_false_cannot_say"
  | "likert_5"
  | "likert_7"
  | "forced_choice_triad"
  | "sjt_most_least"
  | "sjt_rate_effectiveness"
  | "same_different"
  | "simulation_task"
  | "copy_typing"
  | "mcq_and_writing";
/** Forced-choice blocks scored classically are ipsative: only the IRT variant may rank candidates. */
export type ScoringModel = "number_correct" | "irt_theta" | "keyed_sum" | "likert_sum" | "classical_ipsative" | "thurstonian_irt" | "rubric" | "wpm" | "cefr";
export type ScoreType = "percentile" | "sten" | "stanine" | "t" | "wpm" | "cefr" | "percent";
export type LanguageCode = "en" | "af" | "zu" | "xh" | "st" | "tn" | "sn" | "nd" | "ny" | "bem";

export interface Publisher {
  id: string;
  name: string;
  country: CountryCode | "INT";
  isMock: true;
  /** Never "icar" or "hexaco_pi_r": both are restricted to academic use. */
  licenceSource: "original" | "ipip_public_domain";
  note: string;
}

export interface AssessmentFamily {
  code: AssessmentCategory;
  label: string;
  description: string;
  regulatoryClass: RegulatoryClass;
}

export interface Scale {
  code: string;
  name: string;
  /** Group the scale belongs to, e.g. a personality domain or an SJT competency. */
  domain?: string;
  description: string;
  /** What a high score looks like, and what a low score looks like (both are neutral, not good or bad). */
  high?: string;
  low?: string;
  itemCount: number;
  scoreType: ScoreType;
}

export interface ReliabilityEvidence {
  type: "alpha" | "marginal_irt" | "split_half" | "retest" | "parallel_forms" | "inter_rater";
  value: number;
  n: number;
  /** For retest reliability. */
  intervalDays?: number;
  /** Applies to one scale; omitted for the whole test. */
  scale?: string;
  basis: "mock_study" | "benchmark";
}

export interface ValidityEvidence {
  criterion: string;
  /** Observed correlation in a (fictional) local study. */
  observedR?: number;
  /** Operational validity used as a benchmark (Sackett et al. 2022 Table 3). */
  benchmarkRho?: number;
  source: "sackett_2022_benchmark" | "schmidt_hunter_1998_historical" | "mock_local_study";
  n?: number;
  note?: string;
}

export interface BiasEvidence {
  country: CountryCode;
  groupsCompared: string;
  /** Standardised mean difference between groups. */
  d: number;
  difItemsFlagged: number;
  /** Selection-rate ratio at the default cut score (four-fifths rule reference). */
  adverseImpactRatio: number;
  n: number;
  isMock: true;
}

export interface Test {
  id: string;
  family: AssessmentCategory;
  name: string;
  shortName: string;
  version: string;
  level: TestLevel;
  summary: string;
  /** What the candidate is told, in plain language. */
  candidateDescription: string;
  delivery: Delivery;
  timing: Timing;
  mode: TestMode;
  itemFormat: ItemFormat;
  scoringModel: ScoringModel;
  /** Items each candidate sees (maximum, for adaptive tests). */
  items: number;
  /** null when untimed. */
  timeLimitMin: number | null;
  /** Quoted to candidates instead of the limit (HireVue 2025: overstating length drives dropout). */
  medianCompletionMin: number;
  practiceItems: number;
  itemBankSize: number;
  calculatorAllowed: boolean;
  /** Languages the items are validated in. Instructions may be available in more. */
  itemLanguages: LanguageCode[];
  instructionLanguages: LanguageCode[];
  mobileSupported: boolean;
  /** Works offline between items and survives a dropped connection. */
  lowBandwidth: boolean;
  regulatoryClass: RegulatoryClass;
  hpcsaClassified: boolean;
  hpcsaRef: string | null;
  /** A registered practitioner must release reports (SA, for classified tests). */
  practitionerRequired: boolean;
  scales: Scale[];
  normGroups: string[];
  defaultNorm: string;
  reliability: ReliabilityEvidence[];
  validity: ValidityEvidence[];
  bias: BiasEvidence[];
  reports: ReportType[];
  retestLockoutMonths: number;
  publisherId: string;
  sourceNote: string;
  isMock: true;
}

export interface NormGroup {
  code: string;
  name: string;
  description: string;
  region: string;
  countries: CountryCode[];
  level: TestLevel;
  industry: string | null;
  collectedFrom: string;
  collectedTo: string;
  reviewDue: string;
  isPooled: boolean;
  /** Composition of the sample. EEA demographics are reported for South African norms. */
  demographics: {
    women: number;
    homeLanguageEnglish: number;
    degreeOrHigher: number;
    designatedGroups?: number;
  };
  isMock: true;
}

/** Mean and SD of a test's raw (or theta) score within one norm group. */
export interface NormTable {
  testId: string;
  normCode: string;
  n: number;
  mean: number;
  sd: number;
  /** For scale-level norms on questionnaires; omitted for single-score tests. */
  scale?: string;
}

export type BatteryUse = "sift" | "inform_interview" | "weighted";

export interface BatteryComponent {
  testId: string;
  use: BatteryUse;
  /** Percentile below which the sift flags a candidate for human review. Never an automatic rejection. */
  reviewBelowPercentile?: number;
  optional?: boolean;
}

export interface Battery {
  id: string;
  label: string;
  roleFamily: string;
  level: TestLevel;
  description: string;
  components: BatteryComponent[];
  totalMinutes: number;
  /** Suggested weighting of the overall decision (sums to 1). The structured interview leads. */
  weights: { interview: number; ability: number; workSampleOrKnowledge: number; personalityOrSjt: number };
  recommendedFor: string[];
  deadlineDays: number;
  isMock: true;
}

export type ReportType = "hr" | "candidate_feedback" | "interview_guide" | "development" | "team";

export interface ReportTemplate {
  type: ReportType;
  label: string;
  audience: string;
  sections: string[];
  /** In South Africa, classified-test reports reach HR only through a registered practitioner. */
  releasedViaPractitioner: boolean;
}

export interface SampleItem {
  id: string;
  testId: string;
  scale?: string;
  /** Practice items are shown untimed before the test. */
  practice: boolean;
  stimulus?: string;
  prompt: string;
  options?: string[];
  /** Index into options, or a keyed direction for questionnaires. */
  answer?: number;
  keyed?: "+" | "-";
  /** Effectiveness key for SJT options, 1 (very ineffective) to 4 (very effective). */
  effectiveness?: number[];
  explanation?: string;
  source: "original" | "ipip";
}

export interface ComplianceRequirement {
  topic: string;
  rule: string;
  productBehaviour: string;
  citation: string;
  status: "cited" | "unverified" | "assumption";
}

export interface CountryProfile {
  country: CountryCode;
  name: string;
  dataProtectionLaw: string;
  regulator: string;
  employmentLaw: string;
  practitionerBody: string;
  requirements: ComplianceRequirement[];
  /** Registration the employer must hold before tests can be sent. */
  employerRegistration: { label: string; required: boolean } | null;
  breachNotice: string;
  defaultRetentionMonths: number;
  biometricProctoringAllowed: boolean;
  dataResidency: string;
}

export type InvitationStatus = "not_sent" | "sent" | "opened" | "in_progress" | "completed" | "expired" | "cancelled" | "abandoned";
export type Channel = "email" | "sms" | "whatsapp";

export interface Consent {
  noticeVersion: string;
  language: LanguageCode;
  assessment: boolean;
  automatedScoring: boolean;
  crossBorder: boolean;
  researchReuse: boolean;
  at: string;
}

export interface Accommodation {
  type: "extra_time" | "screen_reader" | "colour_safe" | "breaks" | "deadline_extension" | "alternative_assessment";
  extraTimePercent?: number;
  approvedBy: string;
  /** Untimed or heavily modified administration: scores are not compared with the norm. */
  nonNormed: boolean;
  note: string;
}

/**
 * What the candidate's browser noticed during an unsupervised online test. These are prompts to discuss at
 * interview, never proof of cheating and never a reason to reject on their own.
 */
export interface TestIntegrity {
  /** Times the candidate switched tab, app or window. */
  leftWindow: number;
  /** Total seconds spent away from the test. */
  awaySeconds: number;
  /** Paste, copy and cut attempts that were blocked. */
  pasteBlocked: number;
  copyBlocked: number;
  /** Developer-tools, view-source, save, print and select-all shortcuts that were blocked. */
  shortcutsBlocked: number;
  /** Right-click menu attempts that were blocked. */
  contextMenuBlocked: number;
  /** Times the camera stopped during a recorded test. */
  cameraOff?: number;
}

/** One stored piece of a recording: a photo, or a 10-second stretch of video. */
export interface RecordingPiece {
  testId: string;
  seq: number;
  mime: string;
  bytes: number;
  at: string;
}

/**
 * Recording for one invitation. The candidate makes a separate written choice; declining never counts against
 * them, and HR can let them take the tests unrecorded. Pieces are deleted when the retention period ends.
 */
export interface TestRecording {
  mode: "photos" | "video";
  audio: boolean;
  /** Days kept after the application closes, fixed when the invitation started recording. */
  keepDays: number;
  choice: "agreed" | "declined" | null;
  choiceAt?: string;
  /** HR let a candidate who declined take the tests without recording. */
  waived?: { by: string; at: string; reason: string };
  pieces: RecordingPiece[];
  /** HR is looking into a concern, so deletion waits until this date (at most 90 days ahead). */
  hold?: { by: string; at: string; until: string; reason: string };
  /** When the pieces were deleted, and why. */
  deleted?: { at: string; why: string; pieces: number };
}

export interface Attempt {
  testId: string;
  startedAt: string;
  completedAt: string | null;
  formId: string;
  disconnects: number;
  timerPausedSec: number;
  focusLossEvents: number;
  fastResponseFlags: number;
  supervised: boolean;
  device: "mobile" | "desktop" | "tablet";
  /** Present for tests taken since integrity checks were added. */
  integrity?: TestIntegrity;
}

export interface ScaleScore {
  scale: string;
  raw: number;
  normCode: string;
}

export interface TestResult {
  testId: string;
  /** Raw or theta scores per scale; standard scores are derived with src/lib/psychometrics.ts. */
  scores: ScaleScore[];
  flags: string[];
}

export interface DeliveryIssue {
  channel: Channel;
  at: string;
  reason: string;
}

export interface HrReview {
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  /** A concern for the panel to explore. Never an automatic rejection. */
  concern?: string;
  notes: { by: string; at: string; body: string }[];
}

export type AuditAction = "sent" | "delivered" | "delivery_failed" | "opened" | "consented" | "started" | "completed" | "reminded" | "extended" | "cancelled" | "resent" | "restored" | "reviewed" | "note" | "flagged" | "expired" | "noticed" | "recording";

export interface AuditEntry {
  at: string;
  by: string;
  action: AuditAction;
  detail?: string;
}

export interface InvitationRecord {
  id: string;
  /** The candidate's link: /t/{token}. */
  token: string;
  candidateId: string;
  candidateName: string;
  vacancyId: string;
  vacancyTitle: string;
  batteryId: string;
  /** Tests added on top of the battery for this vacancy. */
  extraTests: string[];
  status: InvitationStatus;
  channels: Channel[];
  language: LanguageCode;
  sentBy: string;
  sentAt: string;
  openedAt: string | null;
  deadline: string;
  remindersSent: string[];
  extensions: { by: string; at: string; newDeadline: string; reason: string }[];
  consent: Consent | null;
  accommodations: Accommodation[];
  attempts: Attempt[];
  results: TestResult[];
  /** Why an invitation ended without results, where known. */
  outcomeNote?: string;
  deliveryIssues: DeliveryIssue[];
  review: HrReview;
  audit: AuditEntry[];
  /** Untimed questionnaires can be saved part-way; answers so far per test. */
  progress?: Record<string, number>;
  /** Present when the organisation records candidates during tests. */
  recording?: TestRecording;
  isMock: true;
}

export interface ValidityBenchmark {
  predictor: string;
  schmidtHunter1998: number | null;
  sackett2022: number;
  lowerCredibility80: number | null;
  blackWhiteD: number | null;
}
