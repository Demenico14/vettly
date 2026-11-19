/**
 * Matching service. Phase 1: assessments come from the deterministic mock assessor in src/mocks/matching.ts,
 * and HR reviews (agree, change, confirm) are kept in memory. Phase 2 calls the assessment API instead.
 * AI suggests; HR decides. Every change is recorded with who made it and why.
 */
import type { CandidateAssessment, RequirementOutcome, RequirementReview, Vacancy } from "@/types";
import { SEEDED_CHANGES, assess, score } from "@/mocks/matching";
import { MOCK_NOW, users } from "@/mocks/data";
import { profileSnapshot, recordMatch } from "./candidates";
import { vacancySnapshot } from "./vacancies";

export interface VacancyMatchSummary {
  vacancy: Vacancy;
  assessed: number;
  confirmed: number;
  toReview: number;
  top: { name: string; score: number } | null;
}

export interface MatchingService {
  /** Vacancies with at least one assessed candidate. */
  vacancies(): Promise<VacancyMatchSummary[]>;
  /** Candidates for a vacancy, highest score first. */
  rank(vacancyId: string): Promise<{ vacancy: Vacancy; assessments: CandidateAssessment[] }>;
  get(vacancyId: string, candidateId: string): Promise<{ vacancy: Vacancy; assessment: CandidateAssessment; rank: number; total: number; prev: string | null; next: string | null }>;
  /** Agree with Vettly's outcome for one requirement. */
  agree(vacancyId: string, candidateId: string, requirementId: string): Promise<CandidateAssessment>;
  /** Replace Vettly's outcome for one requirement. A reason is required. */
  change(vacancyId: string, candidateId: string, requirementId: string, outcome: RequirementOutcome, reason: string): Promise<CandidateAssessment>;
  /** Removes HR's review of one requirement, returning it to Vettly's suggestion. */
  undo(vacancyId: string, candidateId: string, requirementId: string): Promise<CandidateAssessment>;
  /** Signs off the whole assessment. Requirements not yet reviewed are recorded as agreed. */
  confirm(vacancyId: string, candidateId: string): Promise<CandidateAssessment>;
  /** Takes the sign-off back, so the assessment can be reviewed again. */
  reopen(vacancyId: string, candidateId: string): Promise<CandidateAssessment>;
}

type Review = RequirementReview & { outcome?: RequirementOutcome };
type State = { reviews: Record<string, Review>; confirmedBy?: string; confirmedAt?: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const me = users[0]!.name;
const states = new Map<string, State>();
const key = (v: string, c: string) => `${v}:${c}`;

function vacancyOf(id: string) {
  const v = vacancySnapshot().find((x) => x.id === id);
  if (!v) throw new Error("This vacancy could not be found.");
  return v;
}

function profileOf(id: string) {
  const c = profileSnapshot().find((x) => x.id === id);
  if (!c) throw new Error("This candidate could not be found.");
  return c;
}

/** Seed state from what the rest of the app already says about each application. */
function stateFor(vacancy: Vacancy, candidateId: string): State {
  const k = key(vacancy.id, candidateId);
  const existing = states.get(k);
  if (existing) return existing;
  const c = profileOf(candidateId);
  const app = c.applications.find((a) => a.vacancyId === vacancy.id);
  const s: State = { reviews: {} };
  if (app && app.provenance !== "ai_illustrative") {
    const at = app.history.find((h) => h.stage !== "applied")?.at ?? app.appliedAt;
    s.confirmedBy = "Tendai Moyo";
    s.confirmedAt = at;
    for (const ch of SEEDED_CHANGES[candidateId] ?? []) {
      const req = vacancy.requirements.find((r) => r.text === ch.requirement);
      if (req) s.reviews[req.id] = { by: "Tendai Moyo", at, action: "changed", outcome: ch.outcome, reason: ch.reason };
    }
    for (const r of vacancy.requirements) s.reviews[r.id] ??= { by: "Tendai Moyo", at, action: "agreed" };
  }
  states.set(k, s);
  return s;
}

function build(vacancy: Vacancy, candidateId: string): CandidateAssessment {
  const a = assess(profileOf(candidateId), vacancy);
  const s = stateFor(vacancy, candidateId);
  a.requirements = a.requirements.map((r) => {
    const rv = s.reviews[r.requirement.id];
    if (!rv) return r;
    const { outcome, ...review } = rv;
    return { ...r, outcome: review.action === "changed" && outcome ? outcome : r.outcome, review };
  });
  const cv = score(vacancy, a.requirements, a.testScore, false);
  a.score = cv.value;
  a.breakdown = cv.breakdown;
  a.scoreWithTests = a.testScore !== null ? score(vacancy, a.requirements, a.testScore, true).value : null;
  const changed = a.requirements.some((r) => r.review?.action === "changed");
  if (s.confirmedBy) {
    a.provenance = changed ? "hr_overridden" : "hr_confirmed";
    a.confirmedBy = s.confirmedBy;
    a.confirmedAt = s.confirmedAt;
  }
  return a;
}

function candidatesFor(vacancyId: string) {
  return profileSnapshot().filter((c) => c.applications.some((a) => a.vacancyId === vacancyId && a.stage !== "withdrawn"));
}

function ranked(vacancy: Vacancy) {
  return candidatesFor(vacancy.id)
    .map((c) => build(vacancy, c.id))
    .sort((a, b) => b.score - a.score || a.candidateName.localeCompare(b.candidateName));
}

/** Keeps the candidate directory and profile in step with the assessment. */
function sync(a: CandidateAssessment) {
  recordMatch(a.candidateId, a.applicationId, a.score, a.provenance);
  return a;
}

function edit(vacancyId: string, candidateId: string, fn: (s: State) => void) {
  const vacancy = vacancyOf(vacancyId);
  const s = stateFor(vacancy, candidateId);
  fn(s);
  return structuredClone(sync(build(vacancy, candidateId)));
}

export const mockMatching: MatchingService = {
  async vacancies() {
    await wait(350);
    return vacancySnapshot()
      .filter((v) => v.status !== "draft")
      .map((vacancy) => {
        const list = ranked(vacancy);
        return {
          vacancy: structuredClone(vacancy),
          assessed: list.length,
          confirmed: list.filter((a) => a.provenance !== "ai_illustrative").length,
          toReview: list.filter((a) => a.provenance === "ai_illustrative").length,
          top: list[0] ? { name: list[0].candidateName, score: list[0].score } : null,
        };
      })
      .filter((x) => x.assessed > 0);
  },
  async rank(vacancyId) {
    await wait(450);
    const vacancy = vacancyOf(vacancyId);
    return structuredClone({ vacancy, assessments: ranked(vacancy) });
  },
  async get(vacancyId, candidateId) {
    await wait(350);
    const vacancy = vacancyOf(vacancyId);
    const list = ranked(vacancy);
    const i = list.findIndex((a) => a.candidateId === candidateId);
    if (i < 0) throw new Error("This candidate hasn't applied for this vacancy.");
    return structuredClone({
      vacancy,
      assessment: list[i]!,
      rank: i + 1,
      total: list.length,
      prev: list[i - 1]?.candidateId ?? null,
      next: list[i + 1]?.candidateId ?? null,
    });
  },
  async agree(vacancyId, candidateId, requirementId) {
    await wait(200);
    return edit(vacancyId, candidateId, (s) => {
      s.reviews[requirementId] = { by: me, at: MOCK_NOW, action: "agreed" };
    });
  },
  async change(vacancyId, candidateId, requirementId, outcome, reason) {
    await wait(300);
    if (!reason.trim()) throw new Error("Give a reason, so the change can be explained later.");
    return edit(vacancyId, candidateId, (s) => {
      s.reviews[requirementId] = { by: me, at: MOCK_NOW, action: "changed", outcome, reason: reason.trim() };
    });
  },
  async undo(vacancyId, candidateId, requirementId) {
    await wait(200);
    return edit(vacancyId, candidateId, (s) => {
      if (s.confirmedBy) throw new Error("Reopen the assessment before changing it.");
      delete s.reviews[requirementId];
    });
  },
  async confirm(vacancyId, candidateId) {
    await wait(450);
    const vacancy = vacancyOf(vacancyId);
    return edit(vacancyId, candidateId, (s) => {
      for (const r of vacancy.requirements) s.reviews[r.id] ??= { by: me, at: MOCK_NOW, action: "agreed" };
      s.confirmedBy = me;
      s.confirmedAt = MOCK_NOW;
    });
  },
  async reopen(vacancyId, candidateId) {
    await wait(250);
    return edit(vacancyId, candidateId, (s) => {
      delete s.confirmedBy;
      delete s.confirmedAt;
    });
  },
};
