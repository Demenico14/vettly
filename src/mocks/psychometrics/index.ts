/**
 * MOCK DATA — the psychometric assessment database (Module 9). Research basis:
 * docs/reports/Workplace psychometric assessment database.md. Validate with `node scripts/check-psychometrics.mjs`.
 */
import type { Battery, InvitationRecord, Test, TestResult } from "../../types/psychometrics";
import type { TestInvitationSummary } from "../../types";
import { standardise } from "../../lib/psychometrics";
import { normTables, tests } from "./catalogue";
import { batteries, batterySummary } from "./batteries";
import { invitationRecords } from "./invitations";

export { publishers, families, tests, normTables, familyOf } from "./catalogue";
export { normGroups } from "./norms";
export { sampleItems } from "./items";
export { batteries, batterySummary } from "./batteries";
export { invitationRecords, atPercentile as rawAtPercentile, atSten as rawAtSten } from "./invitations";
export { validityBenchmarks, reportTemplates, consentNotice, countryProfiles, candidateFlow } from "./reference";

export const getTest = (id: string): Test | undefined => tests.find((t) => t.id === id);
export const getBattery = (id: string | null | undefined): Battery | undefined => batteries.find((b) => b.id === id);

/** Tests a candidate receives for an invitation: required battery components plus any extras. */
export function testsForInvitation(r: Pick<InvitationRecord, "batteryId" | "extraTests">) {
  const b = getBattery(r.batteryId);
  const ids = [...(b?.components.filter((c) => !c.optional).map((c) => c.testId) ?? []), ...r.extraTests];
  return [...new Set(ids)];
}

/** Standard scores for every scale in a result, against the norm recorded with each score. */
export function scoreResult(r: TestResult) {
  return r.scores.map((sc) => {
    const n = normTables.find((t) => t.testId === r.testId && t.normCode === sc.normCode && (t.scale ? t.scale === sc.scale : true));
    if (!n) throw new Error(`No norm for ${r.testId} ${sc.scale} ${sc.normCode}`);
    return { ...sc, ...standardise(sc.raw, n.mean, n.sd), normN: n.n };
  });
}

/** The dashboard and pipeline's compact view of an invitation. */
export function toSummary(r: InvitationRecord): TestInvitationSummary {
  const b = getBattery(r.batteryId);
  return {
    id: r.id,
    candidateName: r.candidateName,
    vacancyTitle: r.vacancyTitle,
    battery: b ? (r.extraTests.length ? `${b.label} + ${r.extraTests.map((t) => getTest(t)!.shortName.toLowerCase()).join(", ")}` : b.label) : "Custom tests",
    status: r.status === "abandoned" ? "expired" : r.status,
    sentAt: r.sentAt,
    deadline: r.deadline,
    completed: r.results.length,
    total: testsForInvitation(r).length,
  };
}

/** Percentile per completed ability/SJT test; questionnaires report a profile instead (percentile 0). */
export function resultsByCandidate() {
  const out: Record<string, { test: string; percentile: number; band: string }[]> = {};
  for (const r of invitationRecords) {
    for (const res of r.results) {
      const t = getTest(res.testId)!;
      const scored = scoreResult(res);
      const profile = t.family === "personality" || t.family === "motivation" || t.family === "emotional_intelligence";
      const first = scored[0]!;
      (out[r.candidateName] ??= []).push({
        test: t.shortName === "Numerical" ? "Numerical reasoning" : t.shortName === "Verbal" ? "Verbal reasoning" : t.name.replace(/ ·.*$/, ""),
        percentile: profile ? 0 : first.percentile,
        band: profile ? "Profile report" : BAND_TEXT[first.band],
      });
    }
  }
  return out;
}

const BAND_TEXT = { A: "Well above average", B: "Above average", C: "Average", D: "Below average", E: "Well below average" } as const;

/** Options for battery pickers (vacancy editor, setup wizard). */
export const batteryOptions = batteries.map((b) => ({ value: b.id, label: b.label, description: `${batterySummary(b)} · about ${b.totalMinutes} min` }));
