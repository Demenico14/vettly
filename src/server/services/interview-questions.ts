import "server-only";
/**
 * Interview questions written by the local writing model for a vacancy's requirements, saved per vacancy.
 * They're written after the request that first needs them; until then, and when the model isn't running,
 * the structured interview uses Vettly's template questions (engine/question-sets.ts).
 */
import type { Vacancy } from "@/types";
import { modelUrl } from "../ai/local";
import { afterCommit, orgId } from "../context";
import { collection, withOrg } from "../store";
import { questionsWithModel, type WrittenQuestion } from "../engine/writing";

type Row = { id: string; fingerprint: string; questions: WrittenQuestion[] };
const store = collection<Row>("interview_questions");
const inflight = new Set<string>();

/** Changes whenever the title or any requirement does, so edited vacancies get new questions. */
const fingerprint = (v: Vacancy) => JSON.stringify([v.title, ...v.requirements.map((r) => r.text)]);

/** The saved questions for this vacancy, if they still match its requirements. */
export function writtenQuestions(v: Vacancy): WrittenQuestion[] | undefined {
  const row = store.find((r) => r.id === v.id);
  return row && row.fingerprint === fingerprint(v) ? row.questions : undefined;
}

/** Schedules writing questions for a vacancy that has none (or out-of-date ones). Call inside a request. */
export function refreshWrittenQuestions(v: Vacancy) {
  if (!modelUrl("write") || !v.requirements.length || writtenQuestions(v)) return;
  const org = orgId();
  const flight = `${org}:${v.id}`;
  if (inflight.has(flight)) return;
  inflight.add(flight);
  const fp = fingerprint(v);
  const reqs = [...v.requirements].sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "essential" ? -1 : 1)).slice(0, 8).map((r) => r.text);
  afterCommit(async () => {
    try {
      const questions = await questionsWithModel(v.title, reqs);
      if (!questions) return;
      await withOrg(org, null, () => {
        const row = store.find((r) => r.id === v.id);
        if (row) Object.assign(row, { fingerprint: fp, questions });
        else store.push({ id: v.id, fingerprint: fp, questions });
      });
    } finally {
      inflight.delete(flight);
    }
  });
}
