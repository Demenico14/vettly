/** Small builders for engine tests. Only the fields the code under test reads are meaningful. */
import type { CandidateProfile, Requirement, Vacancy, WorkExperience } from "@/types";

let n = 0;
const id = (p: string) => `${p}_${++n}`;

export function requirement(text: string, kind: Requirement["kind"], priority: Requirement["priority"] = "essential", years?: number): Requirement {
  return { id: id("req"), kind, text, priority, ...(years !== undefined ? { years } : {}) };
}

export function vacancy(requirements: Requirement[], weights: Partial<Vacancy["weights"]> = {}): Vacancy {
  return {
    id: "vac_test",
    title: "Fleet Controller",
    department: "Operations",
    requirements,
    weights: { skills: 35, experience: 30, education: 10, certifications: 10, assessments: 15, ...weights },
  } as unknown as Vacancy;
}

/** A month `years` ago, as YYYY-MM. */
export function yearsAgo(years: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - Math.round(years * 12));
  return d.toISOString().slice(0, 7);
}

export function job(title: string, start: string, end: string | null, bullets: string[] = [], company = "Acme Freight"): WorkExperience {
  return { id: id("exp"), title, company, location: "Harare", start, end, bullets };
}

export function candidate(p: Partial<CandidateProfile> = {}): CandidateProfile {
  return {
    id: "cnd_test",
    name: "Jane Doe",
    headline: "",
    location: "Harare",
    summary: "",
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    applications: [{ id: "app_test", vacancyId: "vac_test", vacancyTitle: "Fleet Controller", appliedAt: new Date().toISOString(), source: "Upload", stage: "applied", matchScore: 0, provenance: "ai_illustrative", history: [] }],
    ...p,
  } as unknown as CandidateProfile;
}
