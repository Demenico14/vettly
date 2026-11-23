import "server-only";
/**
 * Reranker scores for matching (see engine/matcher.ts), worked out after the request and saved per vacancy
 * and candidate. Until they're ready, or when the model isn't running, the matcher uses its word rules.
 */
import type { CandidateProfile, Vacancy } from "@/types";
import { modelUrl, rerank } from "../ai/local";
import { afterCommit, orgId } from "../context";
import { collection, withOrg } from "../store";
import { modelQueries, type ModelScores } from "../engine/matcher";

type Row = { id: string; reqs: ModelScores };
const store = collection<Row>("match_model");
const key = (vacancyId: string, candidateId: string) => `${vacancyId}:${candidateId}`;
const inflight = new Set<string>();

export const modelScoresFor = (vacancyId: string, candidateId: string): ModelScores | undefined => store.find((r) => r.id === key(vacancyId, candidateId))?.reqs;

/** Schedules scoring for any requirement whose saved scores are missing or out of date. Call inside a request. */
export function refreshModelScores(c: CandidateProfile, vacancy: Vacancy) {
  if (!modelUrl("rerank")) return;
  const id = key(vacancy.id, c.id);
  const saved = modelScoresFor(vacancy.id, c.id) ?? {};
  const need = modelQueries(c, vacancy).filter((q) => saved[q.id]?.fingerprint !== q.fingerprint);
  const org = orgId();
  const flight = `${org}:${id}`;
  if (!need.length || inflight.has(flight)) return;
  inflight.add(flight);
  afterCommit(async () => {
    try {
      const results: ModelScores = {};
      for (const q of need) {
        const scores = await rerank(q.query, q.documents);
        if (!scores) return;
        results[q.id] = { fingerprint: q.fingerprint, scores };
      }
      await withOrg(org, null, () => {
        const row = store.find((r) => r.id === id);
        if (row) row.reqs = { ...row.reqs, ...results };
        else store.push({ id, reqs: results });
      });
    } finally {
      inflight.delete(flight);
    }
  });
}
