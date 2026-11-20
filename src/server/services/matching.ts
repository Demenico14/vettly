/**
 * Matching service. Assessments come from the rule-based evidence matcher (src/server/engine/matcher.ts);
 * HR's reviews (agree, change, confirm) are stored per organisation. The machine suggests; HR decides, and
 * every change is recorded with who made it and why.
 */
import "server-only";
import type { CandidateAssessment, RequirementOutcome, RequirementReview, Vacancy } from "@/types";
import { assess, score } from "../engine/matcher";
import { actorName, now } from "../context";
import { collection } from "../store";
import { profileSnapshot, recordMatch } from "./candidates";
import { testScoreFor } from "./assessments";
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
type State = { id: string; reviews: Record<string, Review>; confirmedBy?: string; confirmedAt?: string };

const states = collection<State>("match_review");
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

/** HR's review of one application, created empty the first time it's needed. */
function stateFor(vacancy: Vacancy, candidateId: string): State {
  const k = key(vacancy.id, candidateId);
  return states.find((s) => s.id === k) ?? { id: k, reviews: {} };
}

function saveState(s: State) {
  const i = states.findIndex((x) => x.id === s.id);
  if (i >= 0) states[i] = s;
  else states.push(s);
}

function build(vacancy: Vacancy, candidateId: string): CandidateAssessment {
  const a = assess(profileOf(candidateId), vacancy, testScoreFor(candidateId, vacancy.id));
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

/** Every applicant's assessment, best first. Scores are saved back so the directory and profiles stay current. */
function ranked(vacancy: Vacancy) {
  return candidatesFor(vacancy.id)
    .map((c) => sync(build(vacancy, c.id)))
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
  saveState(s);
  return structuredClone(sync(build(vacancy, candidateId)));
}

export const matchingService: MatchingService = {
  async vacancies() {
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
    const vacancy = vacancyOf(vacancyId);
    return structuredClone({ vacancy, assessments: ranked(vacancy) });
  },
  async get(vacancyId, candidateId) {
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
    return edit(vacancyId, candidateId, (s) => {
      s.reviews[requirementId] = { by: actorName(), at: now(), action: "agreed" };
    });
  },
  async change(vacancyId, candidateId, requirementId, outcome, reason) {
    if (!reason.trim()) throw new Error("Give a reason, so the change can be explained later.");
    return edit(vacancyId, candidateId, (s) => {
      s.reviews[requirementId] = { by: actorName(), at: now(), action: "changed", outcome, reason: reason.trim() };
    });
  },
  async undo(vacancyId, candidateId, requirementId) {
    return edit(vacancyId, candidateId, (s) => {
      if (s.confirmedBy) throw new Error("Reopen the assessment before changing it.");
      delete s.reviews[requirementId];
    });
  },
  async confirm(vacancyId, candidateId) {
    const vacancy = vacancyOf(vacancyId);
    return edit(vacancyId, candidateId, (s) => {
      for (const r of vacancy.requirements) s.reviews[r.id] ??= { by: actorName(), at: now(), action: "agreed" };
      s.confirmedBy = actorName();
      s.confirmedAt = now();
    });
  },
  async reopen(vacancyId, candidateId) {
    return edit(vacancyId, candidateId, (s) => {
      delete s.confirmedBy;
      delete s.confirmedAt;
    });
  },
};
