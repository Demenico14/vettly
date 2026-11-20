/** Talent intelligence (Module 12). Seeded records are fictional. */
import type { Availability, SkillLevel } from "./index";
import type { CountryCode } from "./psychometrics";

export type TalentSource = "Past applicant" | "Referral" | "Sourced on LinkedIn" | "Careers fair" | "Speculative CV" | "Alumni";

export interface TalentSkill {
  name: string;
  level: SkillLevel;
  years: number;
}

export interface TalentTestResult {
  testId: string;
  /** Short label, e.g. "Numerical reasoning". */
  label: string;
  percentile: number;
  takenAt: string;
}

/** Someone the organisation may approach, who isn't an active applicant. */
export interface TalentRecord {
  id: string;
  name: string;
  headline: string;
  currentTitle: string;
  currentEmployer: string | null;
  location: string;
  country: CountryCode;
  yearsExperience: number;
  skills: TalentSkill[];
  education: string;
  availability: Availability;
  /** Monthly expectation in USD, where known. */
  expectedSalaryUsd: number | null;
  openToRelocation: boolean;
  workPreference: "On-site" | "Hybrid" | "Remote" | "Any";
  languages: string[];
  source: TalentSource;
  /** e.g. "Runner-up, Finance Manager (2025): final interview". */
  history: string | null;
  tests: TalentTestResult[];
  tags: string[];
  email: string;
  phone: string;
  lastContact: string;
  /** Consent to keep their details expires; after that they must be asked again or deleted (POPIA, CDPA). */
  consentUntil: string;
  isMock: true;
}

export interface TalentFilters {
  query: string;
  skills: string[];
  minLevel: SkillLevel | null;
  minYears: number;
  countries: CountryCode[];
  availability: Availability[];
  sources: string[];
  /** e.g. { test: "numerical", min: 70 }. */
  test: { family: TestFilterFamily; min: number } | null;
  relocation: boolean;
  /** Hide people whose consent to keep their details has lapsed. */
  consentValidOnly: boolean;
  includeApplicants: boolean;
}

export type TestFilterFamily = "numerical" | "verbal" | "inductive" | "sjt" | "any_ability";

export interface SavedSearch {
  id: string;
  name: string;
  filters: TalentFilters;
  alert: "off" | "daily" | "weekly";
  owner: string;
  createdAt: string;
  lastRunAt: string;
  /** People matching now who didn't the last time it ran. */
  newSinceLastRun: number;
  isMock: true;
}

export interface CollectionMember {
  /** A talent record id or a candidate id. */
  personId: string;
  kind: "talent" | "candidate";
  addedBy: string;
  addedAt: string;
  note: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  owner: string;
  sharedWith: string[];
  members: CollectionMember[];
  updatedAt: string;
  isMock: true;
}

/** One row in search results, either a talent record or an active candidate. */
export interface TalentHit {
  id: string;
  kind: "talent" | "candidate";
  name: string;
  headline: string;
  location: string;
  country: CountryCode;
  yearsExperience: number;
  skills: TalentSkill[];
  availability: Availability;
  source: string;
  history: string | null;
  tests: TalentTestResult[];
  consentUntil: string | null;
  openToRelocation: boolean;
  workPreference: TalentRecord["workPreference"] | null;
  /** 0–100: how well the person fits the search. */
  relevance: number;
  matchedSkills: string[];
  collections: string[];
  /** For candidates: their current application. */
  application?: { vacancyTitle: string; stage: string };
}
