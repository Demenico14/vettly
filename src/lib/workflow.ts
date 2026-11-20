/**
 * Pure workflow helpers shared by the browser and the server: pipeline stages, vacancy drafts and moves,
 * Harare time helpers and fairness thresholds.
 */
import type { ApplicationStage, Vacancy, VacancyDraft, VacancyStatus } from "@/types";
import { DEFAULT_WEIGHTS } from "./catalog";

export const PIPELINE_STAGES: ApplicationStage[] = ["applied", "screening", "shortlisted", "assessment", "interview", "offer", "hired"];
export const CLOSED_STAGES: ApplicationStage[] = ["rejected", "withdrawn"];

/** Allowed vacancy status moves. Anything else is refused. */
export const STATUS_MOVES: Record<VacancyStatus, VacancyStatus[]> = {
  draft: ["open"],
  open: ["paused", "closed"],
  paused: ["open", "closed"],
  closed: ["open", "filled"],
  filled: [],
};

export function emptyDraft(): VacancyDraft {
  return {
    title: "",
    department: "",
    location: "",
    workMode: "On-site",
    employmentType: "Full-time",
    openings: 1,
    currency: "USD",
    salaryMin: null,
    salaryMax: null,
    salaryVisible: false,
    closesAt: null,
    hiringManager: "",
    summary: "",
    responsibilities: [],
    benefits: [],
    requirements: [],
    weights: { ...DEFAULT_WEIGHTS },
    assessment: { battery: "professional", autoSendOnShortlist: true, deadlineDays: 5 },
    channels: ["careers"],
  };
}

export function toDraft(v: Vacancy): VacancyDraft {
  const { title, department, location, workMode, employmentType, openings, currency, salaryMin, salaryMax, salaryVisible, closesAt, hiringManager, summary, responsibilities, benefits, requirements, weights, assessment, channels } = structuredClone(v);
  return { title, department, location, workMode, employmentType, openings, currency, salaryMin, salaryMax, salaryVisible, closesAt, hiringManager, summary, responsibilities, benefits, requirements, weights, assessment, channels };
}

/** An ISO time from a Harare date (YYYY-MM-DD) and time (HH:MM). */
export const harare = (date: string, time: string) => `${date}T${time}:00+02:00`;

/** Date (YYYY-MM-DD) and time (HH:MM) of an ISO timestamp, in Harare. */
export function partsOf(iso: string) {
  const d = new Date(new Date(iso).getTime() + 2 * 3600000);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16), weekday: d.getUTCDay() };
}

/** 17:00 local time, `days` from now. */
export const deadlineIn = (days: number) => {
  const d = new Date(Date.now() + days * 86400000);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
};

/** Smallest group the fairness report will show. */
export const MIN_GROUP = 20;
/** Impact ratios below this are flagged (the four-fifths rule of thumb). */
export const IMPACT_THRESHOLD = 0.8;
