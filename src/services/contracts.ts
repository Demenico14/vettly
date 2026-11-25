/**
 * Service contracts: what the screens can ask the backend for. Type-only, so the browser bundle never
 * includes server code. Implementations live in src/server/services and are reached through /api/rpc.
 */
import type { AppNotification, CandidateSummary, CandidateTestAccess, Organisation, OrganisationDraft, OrganisationSetup, Session, TeamInvitation, User, Vacancy, VacancyDraft, VacancyStatus } from "@/types";

export type { CandidateProfileService, CvCandidateInput } from "@/server/services/candidates";
export type { CvProcessingService, UploadInput } from "@/server/services/cv";
export type { MatchingService, VacancyMatchSummary } from "@/server/services/matching";
export type { PipelineService, PipelineCard, MoveTarget, MoveResult } from "@/server/services/pipeline";
export type { AssessmentsService, InvitationView, ScoredResult, SendInput, SendResult, BatteryDraft, Undo } from "@/server/services/assessments";
export type { InterviewsService, InterviewListItem, CandidateContext, Conflict, ScheduleInput } from "@/server/services/interviews";
export type { OffersService, OfferView, Band } from "@/server/services/offers";
export type { TalentService, TalentSearchResult } from "@/server/services/talent";
export type { AnalyticsService } from "@/server/services/analytics";
export type { SettingsService } from "@/server/services/settings";
export type { PlatformService } from "@/server/services/platform";
export type { DashboardService } from "@/server/services/dashboard";

export type AssistAction = "draft" | "inclusive" | "concise" | "formal";

export interface VacancyService {
  list(): Promise<Vacancy[]>;
  get(id: string): Promise<Vacancy>;
  candidatesFor(id: string): Promise<CandidateSummary[]>;
  create(draft: VacancyDraft, publish: boolean): Promise<Vacancy>;
  update(id: string, draft: VacancyDraft): Promise<Vacancy>;
  setStatus(id: string, status: VacancyStatus, reason?: string): Promise<Vacancy>;
  duplicate(id: string): Promise<Vacancy>;
  remove(id: string): Promise<void>;
  /** Writing help in the editor: Vettly's local writing model, or fixed rules when it isn't running. Streams words for progress. */
  assist(action: AssistAction, input: { title: string; department: string; summary: string; responsibilities: string[] }): AsyncGenerator<string>;
  /** The local writing model's draft or rewrite, checked on the server. Null when the model isn't available. */
  write(action: AssistAction, input: { title: string; department: string; summary: string; responsibilities: string[] }): Promise<{ summary: string; responsibilities?: string[] } | null>;
}

export interface AuthService {
  signIn(email: string, password: string, remember: boolean): Promise<Session>;
  signInWithProvider(provider: "google" | "microsoft"): Promise<Session>;
  register(input: { name: string; email: string; password: string }): Promise<{ email: string }>;
  verifyEmail(email: string, code: string): Promise<void>;
  resendCode(email: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  checkResetToken(token: string): Promise<{ email: string }>;
  resetPassword(token: string, password: string): Promise<void>;
  getInvitation(token: string): Promise<TeamInvitation>;
  acceptInvitation(token: string, input: { name: string; password: string }): Promise<Session>;
  checkSlug(slug: string): Promise<boolean>;
  createOrganisation(draft: OrganisationDraft): Promise<{ id: string }>;
  completeSetup(orgId: string, setup: OrganisationSetup): Promise<void>;
}

export interface CandidateTest {
  id: string;
  name: string;
  family: string;
  instructions: string;
  timeLimitMin: number | null;
  extraTimePercent: number;
  calculatorAllowed: boolean;
  itemFormat: string;
  practice: import("@/types/psychometrics").SampleItem[];
  questions: import("@/types/psychometrics").SampleItem[];
  /** Full length of the published test, for the "short form" note. */
  fullLength: number;
  /** Set when this test is recorded: how. */
  recording: { mode: "photos" | "video"; audio: boolean } | null;
}

/** HR's view of a recording: what was kept, when it goes, and any hold or decision. */
export interface RecordingSummary {
  mode: "photos" | "video";
  audio: boolean;
  keepDays: number;
  choice: "agreed" | "declined" | null;
  choiceAt?: string;
  waived?: { by: string; at: string; reason: string };
  tests: { testId: string; pieces: number; bytes: number; firstAt: string; lastAt: string }[];
  /** Null while there's nothing stored. */
  deletesOn: string | null;
  hold?: { by: string; at: string; until: string; reason: string };
  deleted?: { at: string; why: string; pieces: number };
}

/** Recording candidates during tests (HR side). Viewing is logged; holding and deleting need a reason. */
export interface RecordingsService {
  summary(invitationId: string): Promise<RecordingSummary | null>;
  /** The pieces of one test's recording, in order. Logs that the viewer opened it. */
  playback(invitationId: string, testId: string): Promise<{ mime: string; pieces: { seq: number; at: string; url: string }[] }>;
  /** Keeps the recording past its deletion date while a concern is looked into (1 to 90 days from today). */
  hold(invitationId: string, days: number, reason: string): Promise<RecordingSummary>;
  releaseHold(invitationId: string): Promise<RecordingSummary>;
  /** Lets a candidate who declined recording take the tests without it. */
  waive(invitationId: string, reason: string): Promise<RecordingSummary>;
  /** Deletes the recording now, for example on the candidate's request. */
  remove(invitationId: string, reason: string): Promise<RecordingSummary>;
}

export interface CandidateAccessService {
  open(token: string): Promise<CandidateTestAccess>;
  sendCode(token: string): Promise<void>;
  verify(token: string, code: string): Promise<void>;
  recordConsent(token: string): Promise<void>;
  loadTest(token: string, testId: string): Promise<CandidateTest>;
  saveProgress(token: string, testId: string, answered: number): Promise<void>;
  /** The candidate's separate written choice about being recorded. Declining is always accepted. */
  recordingChoice(token: string, agree: boolean): Promise<void>;
  /** One piece of the recording (a photo, or about 10 seconds of video), base64-encoded. */
  uploadRecording(token: string, testId: string, seq: number, mime: string, data: string): Promise<void>;
  /**
   * Submits answers. Returns true when every test in the invitation is finished. `integrity` is what the browser
   * noticed (window switches, blocked paste and shortcuts); `fastAnswers` counts answers given implausibly fast.
   */
  submit(token: string, testId: string, answers: Record<string, number>, minutes: number, integrity?: import("@/types/psychometrics").TestIntegrity, fastAnswers?: number): Promise<boolean>;
}

export interface SessionService {
  getCurrentUser(): Promise<User>;
  getOrganisations(): Promise<Organisation[]>;
  getActiveOrganisation(): Promise<Organisation>;
  switchOrganisation(id: string): Promise<Organisation>;
  signOut(): Promise<void>;
}

export interface NotificationService {
  list(): Promise<AppNotification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface SearchResult {
  id: string;
  type: "candidate" | "vacancy";
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchService {
  search(query: string): Promise<SearchResult[]>;
}

export interface CandidateService {
  listSummaries(): Promise<CandidateSummary[]>;
}
