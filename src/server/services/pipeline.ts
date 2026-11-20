import "server-only";
/**
 * Pipeline service. Phase 1: reads and moves applications in the shared in-memory candidate store, so the
 * board, candidate profiles and directory always agree. Every move is written to the application history
 * (the decision record) with who made it, when and why. Test invitations live in a small shared store that
 * Module 9 (psychometric assessments) extends.
 */
import type { ApplicationEvent, ApplicationSource, ApplicationStage, AssessmentProvenance, TestInvitationSummary, Vacancy } from "@/types";
import { batterySummary } from "@/mocks/psychometrics";
import { batteryById, cancelOpen, createInvitation, deadlineIn, latestFor, summaryOf, testIdsFor } from "./assessments";
import { actorName, now } from "../context";
import { profileSnapshot } from "./candidates";
import { vacancySnapshot } from "./vacancies";

import { PIPELINE_STAGES, CLOSED_STAGES } from "@/lib/workflow";
export { PIPELINE_STAGES, CLOSED_STAGES };

export interface PipelineCard {
  candidateId: string;
  applicationId: string;
  name: string;
  headline: string;
  location: string;
  stage: ApplicationStage;
  matchScore: number;
  provenance: AssessmentProvenance;
  source: ApplicationSource;
  appliedAt: string;
  /** When the application entered its current stage. */
  stageSince: string;
  tests: TestInvitationSummary | null;
  history: ApplicationEvent[];
}

export interface MoveTarget {
  candidateId: string;
  applicationId: string;
}

export interface MoveResult {
  moved: number;
  skipped: { name: string; reason: string }[];
  testsSent: number;
  /** Unfinished tests cancelled because the candidate was rejected. */
  testsCancelled: number;
}

export interface PipelineService {
  board(vacancyId: string): Promise<{ vacancy: Vacancy; cards: PipelineCard[] }>;
  /** Moves one or more applications. Rejections and moves back a stage need a note. */
  move(targets: MoveTarget[], stage: ApplicationStage, note: string, opts?: { sendTests?: boolean }): Promise<MoveResult>;
  /** Sends the vacancy's test battery. Candidates who already have open or finished tests are skipped. */
  sendTests(targets: MoveTarget[]): Promise<MoveResult>;
}


export function battery(vacancy: Vacancy) {
  const b = batteryById(vacancy.assessment.battery);
  if (!b) return null;
  return { label: b.label, tests: testIdsFor({ batteryId: b.id, extraTests: [] }).length, description: batterySummary(b) };
}

function testsFor(candidateId: string, vacancyId: string) {
  const r = latestFor(candidateId, vacancyId);
  return r ? summaryOf(r) : null;
}

function locate(t: MoveTarget) {
  const c = profileSnapshot().find((x) => x.id === t.candidateId);
  const app = c?.applications.find((a) => a.id === t.applicationId);
  if (!c || !app) throw new Error("This application no longer exists.");
  return { c, app };
}

/** Sends the vacancy's battery unless the candidate already has tests open or finished for it. */
function issueTests(candidateId: string, vacancy: Vacancy) {
  const b = batteryById(vacancy.assessment.battery);
  if (!b) return false;
  const existing = latestFor(candidateId, vacancy.id);
  if (existing && !["expired", "cancelled"].includes(existing.status)) return false;
  createInvitation({ candidateId, vacancyId: vacancy.id, batteryId: b.id, extraTests: [], deadline: deadlineIn(vacancy.assessment.deadlineDays), channels: ["email"], language: "en" });
  return true;
}

const order = (s: ApplicationStage) => PIPELINE_STAGES.indexOf(s);

export const pipelineService: PipelineService = {
  async board(vacancyId) {
    const vacancy = vacancySnapshot().find((v) => v.id === vacancyId);
    if (!vacancy) throw new Error("This vacancy could not be found.");
    const cards: PipelineCard[] = [];
    for (const c of profileSnapshot()) {
      for (const a of c.applications.filter((x) => x.vacancyId === vacancyId)) {
        cards.push({
          candidateId: c.id,
          applicationId: a.id,
          name: c.name,
          headline: c.headline,
          location: c.location,
          stage: a.stage,
          matchScore: a.matchScore,
          provenance: a.provenance,
          source: a.source,
          appliedAt: a.appliedAt,
          stageSince: a.history.at(-1)?.at ?? a.appliedAt,
          tests: testsFor(c.id, vacancy.id),
          history: a.history,
        });
      }
    }
    cards.sort((x, y) => y.matchScore - x.matchScore || x.name.localeCompare(y.name));
    return structuredClone({ vacancy, cards });
  },

  async move(targets, stage, note, opts) {
    const result: MoveResult = { moved: 0, skipped: [], testsSent: 0, testsCancelled: 0 };
    for (const t of targets) {
      const { c, app } = locate(t);
      const vacancy = vacancySnapshot().find((v) => v.id === app.vacancyId)!;
      const back = order(stage) >= 0 && order(app.stage) >= 0 && order(stage) < order(app.stage);
      if (app.stage === stage) {
        result.skipped.push({ name: c.name, reason: "already in this stage" });
        continue;
      }
      if ((stage === "rejected" || back) && !note.trim()) throw new Error(stage === "rejected" ? "Add the reason. Rejections must be explained for the audit record." : "Say why the candidate is moving back a stage.");
      if (stage === "hired" && app.stage !== "offer") {
        result.skipped.push({ name: c.name, reason: "needs an accepted offer first" });
        continue;
      }
      if (app.stage === "hired" || app.stage === "withdrawn") {
        result.skipped.push({ name: c.name, reason: app.stage === "hired" ? "already hired" : "withdrew their application" });
        continue;
      }
      app.stage = stage;
      app.history.push({ stage, at: now(), by: actorName(), ...(note.trim() ? { note: note.trim() } : {}) });
      if (c.applications[0]!.id === app.id) c.stage = stage;
      result.moved++;
      const autoOnShortlist = stage === "shortlisted" && vacancy.assessment.autoSendOnShortlist && opts?.sendTests !== false;
      if (((stage === "assessment" && opts?.sendTests) || autoOnShortlist) && issueTests(c.id, vacancy)) result.testsSent++;
      if (stage === "rejected") {
        // Don't leave a rejected candidate with live test invitations.
        const open = latestFor(c.id, vacancy.id);
        if (open && cancelOpen(open, "Candidate not progressing for this vacancy")) result.testsCancelled++;
      }
    }
    return result;
  },

  async sendTests(targets) {
    const result: MoveResult = { moved: 0, skipped: [], testsSent: 0, testsCancelled: 0 };
    for (const t of targets) {
      const { c, app } = locate(t);
      const vacancy = vacancySnapshot().find((v) => v.id === app.vacancyId)!;
      if (!battery(vacancy)) {
        result.skipped.push({ name: c.name, reason: "this vacancy has no test battery" });
        continue;
      }
      if (issueTests(c.id, vacancy)) result.testsSent++;
      else result.skipped.push({ name: c.name, reason: "already has tests open or finished" });
    }
    return result;
  },
};
