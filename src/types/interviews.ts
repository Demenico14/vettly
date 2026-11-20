/** Interview management (Module 10). All seeded records are fictional. */

export type InterviewFormat = "In person" | "Video" | "Phone";
export type InterviewKind = "screening_call" | "first_interview" | "technical" | "case_study" | "panel" | "final";
export type InterviewStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type PanelRole = "lead" | "member" | "observer";
export type Response = "accepted" | "pending" | "declined";
export type Recommendation = "strong_yes" | "yes" | "no" | "strong_no";
export type DecisionOutcome = "advance" | "hold" | "reject";

export interface Interviewer {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  /** Recurring weekly commitments, in Harare time. day: 1 = Monday. */
  busy: { day: number; from: string; to: string; label: string }[];
  /** Trained in structured interviewing and scorecard calibration. */
  trained: boolean;
}

export interface Question {
  id: string;
  text: string;
  followUps: string[];
  /** What good evidence sounds like. */
  lookFor: string[];
  redFlags: string[];
}

export interface Competency {
  id: string;
  name: string;
  description: string;
  /** Requirement this competency evidences, when it comes from the vacancy. */
  requirement?: string;
  questions: Question[];
}

export interface QuestionSet {
  id: string;
  name: string;
  kind: InterviewKind;
  vacancyId: string | null;
  description: string;
  competencies: Competency[];
}

export interface PanelMember {
  interviewerId: string;
  role: PanelRole;
  response: Response;
}

export interface Rating {
  competencyId: string;
  /** 1–5, anchored (see RATING_ANCHORS). */
  rating: number;
  evidence: string;
}

export interface Scorecard {
  interviewerId: string;
  status: "not_started" | "draft" | "submitted";
  ratings: Rating[];
  recommendation: Recommendation | null;
  summary: string;
  submittedAt: string | null;
}

export interface PanelDecision {
  outcome: DecisionOutcome;
  rationale: string;
  by: string;
  at: string;
}

export interface InterviewEvent {
  at: string;
  by: string;
  text: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  vacancyId: string;
  vacancyTitle: string;
  round: string;
  kind: InterviewKind;
  startsAt: string;
  durationMin: number;
  format: InterviewFormat;
  location: string;
  meetingLink: string | null;
  panel: PanelMember[];
  candidateResponse: Response | "reschedule_requested";
  questionSetId: string;
  /** Questions added for this interview only, e.g. probes from psychometric results. */
  extraQuestions: Question[];
  status: InterviewStatus;
  statusNote?: string;
  scorecards: Scorecard[];
  decision: PanelDecision | null;
  createdBy: string;
  history: InterviewEvent[];
  isMock: true;
}
