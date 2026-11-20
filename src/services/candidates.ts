/**
 * Candidate service. Phase 1: in-memory profiles seeded from mock data, so stage moves, notes, uploads and
 * talent-pool changes persist while the app is open. Phase 2 replaces this with API calls of the same shape.
 */
import type { ApplicationSource, ApplicationStage, SkillLevel, Availability, CandidateDocument, CandidateNote, CandidateProfile, CvExtraction, TestInvitationSummary } from "@/types";
import { assess } from "@/mocks/matching";
import { vacancySnapshot } from "./vacancies";
import { candidateProfiles } from "@/mocks/candidates";
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
  /** New candidate from a reviewed CV, applying for the CV batch's vacancy. */
  createFromCv(input: CvCandidateInput): Promise<CandidateProfile>;
  /** Adds a newer CV to an existing candidate, and an application if they haven't applied for this vacancy. */
  attachCv(id: string, input: CvCandidateInput): Promise<CandidateProfile>;
}

export interface CvCandidateInput {
  extraction: CvExtraction;
  vacancyId: string;
  vacancyTitle: string;
  fileName: string;
  sizeKb: number;
  /** Defaults to an emailed CV. */
  source?: ApplicationSource;
  /** Known skill levels, e.g. from a talent record; otherwise every skill starts at Intermediate. */
  skillLevels?: { name: string; level: SkillLevel; years?: number }[];
  tags?: string[];
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

function cvDocument(input: CvCandidateInput): CandidateDocument {
  return { id: `doc_new_${++seq}`, name: input.fileName, kind: "CV", sizeKb: input.sizeKb, pages: input.extraction.pages, uploadedAt: MOCK_NOW };
}

function application(input: CvCandidateInput, idSuffix: string) {
  // Replaced by the real assessment once the candidate exists (see scoreNew below).
  const matchScore = 0;
  return {
    id: `app_cv_${idSuffix}`,
    vacancyId: input.vacancyId,
    vacancyTitle: input.vacancyTitle,
    appliedAt: MOCK_NOW,
    source: input.source ?? ("Email (CV upload)" as ApplicationSource),
    stage: "applied" as const,
    matchScore,
    provenance: "ai_illustrative" as const,
    history: [{ stage: "applied" as const, at: MOCK_NOW, by: me, note: input.source === "Talent pool" ? "Added from the talent pool" : `Added from ${input.fileName}` }],
  };
}

/** Assesses a CV-created application against its vacancy, as Module 7 does for everyone else. */
function scoreNew(c: CandidateProfile, vacancyId: string) {
  const vacancy = vacancySnapshot().find((v) => v.id === vacancyId);
  const app = c.applications.find((a) => a.vacancyId === vacancyId);
  if (!vacancy || !app) return;
  recordMatch(c.id, app.id, assess(c, vacancy).score, "ai_illustrative");
}

/** Synchronous read of the live store, for other mock services in this layer (not part of the API). */
export function profileSnapshot(): CandidateProfile[] {
  return store;
}

/** Writes an assessment result back to the application, so lists and profiles show the same score. */
export function recordMatch(id: string, applicationId: string, matchScore: number, provenance: CandidateProfile["provenance"]) {
  const c = store.find((x) => x.id === id);
  const app = c?.applications.find((a) => a.id === applicationId);
  if (!c || !app) return;
  app.matchScore = matchScore;
  app.provenance = provenance;
  if (c.applications[0]!.id === applicationId) {
    c.matchScore = matchScore;
    c.provenance = provenance;
  }
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
    // Shared with the pipeline, so tests sent from the board show here too.
    const { invitationStore, summaryOf } = await import("./assessments");
    return clone(invitationStore.filter((t) => t.candidateName === name).map(summaryOf));
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
  async createFromCv(input) {
    await wait(700);
    const x = input.extraction;
    const email = x.email.value.trim().toLowerCase();
    const clash = email && store.find((c) => c.email.toLowerCase() === email);
    if (clash) throw new Error(`${clash.name} already uses ${x.email.value}. Add this CV to their record instead.`);
    const id = `cnd_cv_${++seq}`;
    const app = application(input, String(seq));
    const c: CandidateProfile = {
      id,
      name: x.name.value.trim(),
      headline: x.headline.value.trim(),
      location: x.location.value.trim(),
      appliedFor: input.vacancyTitle,
      stage: "applied",
      matchScore: app.matchScore,
      provenance: "ai_illustrative",
      appliedAt: MOCK_NOW,
      topSkills: x.skills.slice(0, 3),
      email: x.email.value.trim(),
      phone: x.phone.value.trim(),
      linkedin: null,
      availability: x.availability.value as Availability,
      currentEmployer: x.currentEmployer.value.trim() || null,
      expectedSalary: null,
      summary: x.summary,
      experience: x.experience.map((e) => ({ id: e.id, title: e.title, company: e.company, location: e.location, start: e.start, end: e.end, bullets: [] })),
      education: x.education.map((e) => ({ id: e.id, institution: e.institution, qualification: e.qualification, field: e.field, start: e.end ? e.end - 3 : 2020, end: e.end })),
      skills: input.skillLevels ?? x.skills.map((name) => ({ name, level: "Intermediate" as const })),
      certifications: [],
      projects: [],
      documents: [cvDocument(input)],
      applications: [app],
      notes: [],
      tags: input.tags ?? [],
      inTalentPool: false,
    };
    store.unshift(c);
    scoreNew(c, input.vacancyId);
    return clone(c);
  },
  async attachCv(id, input) {
    await wait(600);
    const c = find(id);
    c.documents = [cvDocument(input), ...c.documents];
    if (!c.applications.some((a) => a.vacancyId === input.vacancyId)) {
      const app = application(input, String(++seq));
      c.applications = [app, ...c.applications];
      c.appliedFor = app.vacancyTitle;
      c.stage = app.stage;
      c.matchScore = app.matchScore;
      c.appliedAt = app.appliedAt;
      scoreNew(c, input.vacancyId);
    }
    return clone(c);
  },
};
