/**
 * Candidate service. Phase 1: in-memory profiles seeded from mock data, so stage moves, notes, uploads and
 * talent-pool changes persist while the app is open. Phase 2 replaces this with API calls of the same shape.
 */
import type { ApplicationStage, CandidateDocument, CandidateNote, CandidateProfile, TestInvitationSummary } from "@/types";
import { candidateProfiles } from "@/mocks/candidates";
import { testInvitations } from "@/mocks/dashboard";
import { MOCK_NOW, users } from "@/mocks/data";

export interface CandidateProfileService {
  list(): Promise<CandidateProfile[]>;
  get(id: string): Promise<CandidateProfile>;
  tests(name: string): Promise<TestInvitationSummary[]>;
  moveStage(id: string, applicationId: string, stage: ApplicationStage, note?: string): Promise<CandidateProfile>;
  addNote(id: string, body: string): Promise<CandidateProfile>;
  removeNote(id: string, noteId: string): Promise<CandidateProfile>;
  uploadDocument(id: string, file: { name: string; sizeKb: number; kind: CandidateDocument["kind"] }): Promise<CandidateProfile>;
  removeDocument(id: string, docId: string): Promise<CandidateProfile>;
  setTalentPool(id: string, value: boolean): Promise<CandidateProfile>;
  setTags(id: string, tags: string[]): Promise<CandidateProfile>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const store: CandidateProfile[] = clone(candidateProfiles);
let seq = 0;
const me = users[0]!.name;

function find(id: string) {
  const c = store.find((x) => x.id === id);
  if (!c) throw new Error("This candidate could not be found. They may have been removed.");
  return c;
}

export const mockCandidateProfiles: CandidateProfileService = {
  async list() {
    await wait(500);
    return clone(store);
  },
  async get(id) {
    await wait(350);
    return clone(find(id));
  },
  async tests(name) {
    await wait(300);
    return clone(testInvitations.filter((t) => t.candidateName === name));
  },
  async moveStage(id, applicationId, stage, note) {
    await wait(600);
    const c = find(id);
    const app = c.applications.find((a) => a.id === applicationId);
    if (!app) throw new Error("That application no longer exists.");
    if (app.stage === stage) throw new Error(`Already at ${stage}.`);
    app.stage = stage;
    app.history.push({ stage, at: MOCK_NOW, by: me, ...(note ? { note } : {}) });
    if (applicationId === c.applications[0]!.id) c.stage = stage;
    return clone(c);
  },
  async addNote(id, body) {
    await wait(400);
    const c = find(id);
    const note: CandidateNote = { id: `note_new_${++seq}`, author: me, body, at: MOCK_NOW };
    c.notes = [note, ...c.notes];
    return clone(c);
  },
  async removeNote(id, noteId) {
    await wait(300);
    const c = find(id);
    c.notes = c.notes.filter((n) => n.id !== noteId);
    return clone(c);
  },
  async uploadDocument(id, file) {
    await wait(1200);
    const c = find(id);
    c.documents.push({ id: `doc_new_${++seq}`, name: file.name, kind: file.kind, sizeKb: file.sizeKb, pages: Math.max(1, Math.round(file.sizeKb / 120)), uploadedAt: MOCK_NOW });
    return clone(c);
  },
  async removeDocument(id, docId) {
    await wait(400);
    const c = find(id);
    const doc = c.documents.find((d) => d.id === docId);
    if (doc?.kind === "CV" && c.documents.filter((d) => d.kind === "CV").length === 1) throw new Error("Keep at least one CV. Upload a newer CV first, then remove this one.");
    c.documents = c.documents.filter((d) => d.id !== docId);
    return clone(c);
  },
  async setTalentPool(id, value) {
    await wait(300);
    const c = find(id);
    c.inTalentPool = value;
    return clone(c);
  },
  async setTags(id, tags) {
    await wait(250);
    const c = find(id);
    c.tags = tags;
    return clone(c);
  },
};
