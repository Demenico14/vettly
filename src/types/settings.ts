/** Organisation settings (Module 14). */
import type { Role } from "./index";

export interface OrgProfile {
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  industry: string;
  size: string;
  website: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  timezone: string;
  dateFormat: "DD/MM/YYYY" | "D MMM YYYY" | "YYYY-MM-DD";
}

export interface Branding {
  colour: string;
  logoFileName: string | null;
  /** The stored logo (PNG or JPG), shown on letters, emails and the test pages. */
  logoFileId?: string | null;
  /** Show the organisation's name beside its logo (turn off when the logo already spells it out). */
  letterName?: boolean;
  /** Put the organisation's address, phone and website under the logo on letters and emails. */
  letterContact?: boolean;
  /** Footer on letters and candidate emails, e.g. registered name, company number and address. */
  letterFooter?: string;
  careersHeadline: string;
  careersIntro: string;
  emailSignOff: string;
  showLogoOnTests: boolean;
}

export type MemberStatus = "active" | "invited" | "deactivated";
export interface Member {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  role: Exclude<Role, "super_admin">;
  status: MemberStatus;
  lastActiveAt: string | null;
  invitedAt: string | null;
  twoFactor: boolean;
}

export type Permission =
  | "view_candidates"
  | "manage_vacancies"
  | "move_candidates"
  | "interview"
  | "make_offers"
  | "approve_offers"
  | "send_tests"
  | "view_test_reports"
  | "view_analytics"
  | "view_fairness"
  | "export_data"
  | "manage_users"
  | "manage_settings"
  | "manage_billing";

export type OrgRole = Exclude<Role, "super_admin">;
export type RolePermissions = Record<OrgRole, Permission[]>;

export interface RecruitmentSettings {
  referencePrefix: string;
  defaultClosingDays: number;
  rejectionReasons: string[];
  /** Offers above the top of the band need the CFO. */
  cfoAboveBand: boolean;
  /** HR approves every offer, after the hiring manager. */
  hrApprovesAll: boolean;
  /** Days an offer stays open before it expires. */
  offerValidityDays: number;
  /** Scorecards hidden from panel members until they submit their own. */
  independentScorecards: boolean;
  /** Notify candidates who weren't selected when a vacancy is filled. */
  notifyUnsuccessful: boolean;
  defaultWeights: { skills: number; experience: number; education: number; tests: number };
}

/** Recording candidates during tests. Off unless the organisation turns it on. */
export type RecordingMode = "off" | "photos" | "video";
export interface RecordingSettings {
  mode: RecordingMode;
  /** Sound with video. Off by default: more intrusive, and rarely needed. */
  audio: boolean;
  /** Days a recording is kept after the candidate's application closes (7 to 30). */
  keepDays: number;
}

export interface AssessmentSettings {
  /** Department → battery id. */
  batteries: Record<string, string>;
  sendOnShortlist: boolean;
  deadlineDays: number;
  /** Hours before the deadline. */
  reminders: number[];
  inviteEmailSubject: string;
  inviteEmailBody: string;
  inviteSms: string;
  consentWording: string;
  retentionMonths: number;
  candidateFeedback: boolean;
  adjustmentsContact: string;
  /** Absent on organisations set up before recording existed: read with recordingSettings(). */
  recording?: RecordingSettings;
}

export type NotificationEvent = "new_application" | "cv_processed" | "test_completed" | "interview_scheduled" | "scorecard_due" | "offer_approval" | "offer_response" | "mention" | "weekly_digest";
export interface NotificationSettings {
  /** Per event: in app, email. */
  personal: Record<NotificationEvent, { app: boolean; email: boolean }>;
  digestDay: "Monday" | "Friday";
  quietHours: boolean;
}

export interface PrivacySettings {
  /** Months to keep unsuccessful applicants before deleting them. */
  unsuccessfulMonths: number;
  /** Months a talent-pool consent lasts. */
  talentConsentMonths: number;
  collectEqualOpportunity: boolean;
  equalOpportunityWording: string;
  privacyNoticeUrl: string;
  dpoName: string;
  dpoEmail: string;
  /** Jurisdictions whose rules are applied. */
  frameworks: string[];
}

export interface DataRequest {
  id: string;
  person: string;
  kind: "access" | "deletion" | "correction";
  receivedAt: string;
  dueAt: string;
  status: "open" | "completed";
}

export interface Subscription {
  plan: "starter" | "growth" | "enterprise";
  billing: "monthly" | "annual";
  priceUsd: number;
  renewsAt: string;
  seatsUsed: number;
  seatsTotal: number;
  testCreditsUsed: number;
  testCreditsTotal: number;
  cvCreditsUsed: number;
  cvCreditsTotal: number;
  invoices: { id: string; date: string; amountUsd: number; status: "paid" | "due" }[];
  paymentMethod: string;
  /** On the free trial (renewsAt is when it ends). */
  trial: boolean;
  /** Names of the organisation's admins, who can change the plan. */
  admins: string[];
}

export type AuditCategory = "settings" | "users" | "candidates" | "offers" | "assessments" | "security" | "data";
export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  category: AuditCategory;
  action: string;
  detail: string;
  ip: string;
}

export interface OrgSettings {
  profile: OrgProfile;
  branding: Branding;
  recruitment: RecruitmentSettings;
  assessments: AssessmentSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}
