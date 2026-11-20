/**
 * Candidate service: the organisation's candidate profiles, applications, notes and documents.
 */
import "server-only";
import { fileFor } from "../files";
import type { ApplicationSource, ApplicationStage, SkillLevel, Availability, CandidateDocument, CandidateNote, CandidateProfile, CvExtraction, TestInvitationSummary } from "@/types";
import { assess } from "../engine/matcher";
import { actorName, newId, now, orgId } from "../context";
import { collection } from "../store";
import { vacancySnapshot } from "./vacancies";

export interface CandidateProfileService {
  list(): Promise<CandidateProfile[]>;
  get(id: string): Promise<CandidateProfile>;
  tests(name: string): Promise<TestInvitationSummary[]>;
  moveStage(id: string, applicationId: string, stage: ApplicationStage, note?: string): Promise<CandidateProfile>;
  addNote(id: string, body: string): Promise<CandidateProfile>;
  removeNote(id: string, noteId: string): Promise<CandidateProfile>;
  uploadDocument(id: string, file: { name: string; sizeKb: number; kind: CandidateDocument["kind"]; fileId?: string; pages?: number }): Promise<CandidateProfile>;
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
  /** The stored CV file. */
  fileId?: string;
  /** Defaults to an emailed CV. */
  source?: ApplicationSource;
  /** Known skill levels, e.g. from a talent record; otherwise every skill starts at Intermediate. */
  skillLevels?: { name: string; level: SkillLevel; years?: number }[];
  tags?: string[];
}

/** A plain copy, so callers never hold the stored objects (store arrays are proxies, which structuredClone refuses). */
const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const store = collection<CandidateProfile>("candidate");

function find(id: string) {
  const c = store.find((x) => x.id === id);
  if (!c) throw new Error("This candidate could not be found. They may have been removed.");
  return c;
}

function cvDocument(input: CvCandidateInput): CandidateDocument {
  return { id: newId("doc"), ...(input.fileId ? { fileId: input.fileId } : {}), name: input.fileName, kind: "CV", sizeKb: input.sizeKb, pages: input.extraction.pages, uploadedAt: now() };
}

function application(input: CvCandidateInput) {
  const at = now();
  return {
    id: newId("app"),
    vacancyId: input.vacancyId,
    vacancyTitle: input.vacancyTitle,
    appliedAt: at,
    source: input.source ?? ("Email (CV upload)" as ApplicationSource),
    stage: "applied" as const,
    matchScore: 0,
    provenance: "ai_illustrative" as const,
    history: [{ stage: "applied" as const, at, by: actorName(), note: input.source === "Talent pool" ? "Added from the talent pool" : `Added from ${input.fileName}` }],
  };
}

/** Assesses a new application against its vacancy straight away, so it appears in Matching. */
function scoreNew(c: CandidateProfile, vacancyId: string) {
  const vacancy = vacancySnapshot().find((v) => v.id === vacancyId);
  const app = c.applications.find((a) => a.vacancyId === vacancyId);
  if (!vacancy || !app || vacancy.requirements.length === 0) return;
  recordMatch(c.id, app.id, assess(c, vacancy).score, "ai_illustrative");
}

/** The organisation's candidates as stored, for other services. */
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

export const candidateProfileService: CandidateProfileService = {
  async list() {
    return clone(store);
  },
  async get(id) {
    return clone(find(id));
  },
  async tests(name) {
    const { invitationStore, summaryOf } = await import("./assessments");
    return clone(invitationStore.filter((t) => t.candidateName === name).map(summaryOf));
  },
  async moveStage(id, applicationId, stage, note) {
    const c = find(id);
    const app = c.applications.find((a) => a.id === applicationId);
    if (!app) throw new Error("That application no longer exists.");
    if (app.stage === stage) throw new Error(`Already at ${stage}.`);
    if (stage === "rejected" && !note?.trim()) throw new Error("Give a reason for the rejection. It's kept on the record.");
    app.stage = stage;
    app.history.push({ stage, at: now(), by: actorName(), ...(note ? { note } : {}) });
    if (applicationId === c.applications[0]!.id) c.stage = stage;
    return clone(c);
  },
  async addNote(id, body) {
    if (!body.trim()) throw new Error("Write something first.");
    const c = find(id);
    const note: CandidateNote = { id: newId("note"), author: actorName(), body: body.trim(), at: now() };
    c.notes = [note, ...c.notes];
    return clone(c);
  },
  async removeNote(id, noteId) {
    const c = find(id);
    c.notes = c.notes.filter((n) => n.id !== noteId);
    return clone(c);
  },
  async uploadDocument(id, file) {
    const c = find(id);
    const stored = file.fileId ? await fileFor(orgId(), file.fileId) : null;
    if (!stored) throw new Error(`${file.name} didn't finish uploading. Try again.`);
    c.documents.push({ id: newId("doc"), fileId: stored.id, name: stored.name, kind: file.kind, sizeKb: Math.round(stored.sizeBytes / 1024), pages: stored.pages ?? Math.max(1, Math.round(stored.sizeBytes / 1024 / 120)), uploadedAt: now() });
    return clone(c);
  },
  async removeDocument(id, docId) {
    const c = find(id);
    const doc = c.documents.find((d) => d.id === docId);
    if (doc?.kind === "CV" && c.documents.filter((d) => d.kind === "CV").length === 1) throw new Error("Keep at least one CV. Upload a newer CV first, then remove this one.");
    c.documents = c.documents.filter((d) => d.id !== docId);
    return clone(c);
  },
  async setTalentPool(id, value) {
    const c = find(id);
    c.inTalentPool = value;
    return clone(c);
  },
  async setTags(id, tags) {
    const c = find(id);
    c.tags = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
    return clone(c);
  },
  async createFromCv(input) {
    const x = input.extraction;
    if (!x.name.value.trim()) throw new Error("The candidate needs a name.");
    const email = x.email.value.trim().toLowerCase();
    const clash = email && store.find((c) => c.email.toLowerCase() === email);
    if (clash) throw new Error(`${clash.name} already uses ${x.email.value}. Add this CV to their record instead.`);
    const app = application(input);
    const c: CandidateProfile = {
      id: newId("cnd"),
      name: x.name.value.trim(),
      headline: x.headline.value.trim(),
      location: x.location.value.trim(),
      appliedFor: input.vacancyTitle,
      stage: "applied",
      matchScore: 0,
      provenance: "ai_illustrative",
      appliedAt: app.appliedAt,
      topSkills: x.skills.slice(0, 3),
      email: x.email.value.trim(),
      phone: x.phone.value.trim(),
      linkedin: null,
      availability: (x.availability.value || "1 month's notice") as Availability,
      currentEmployer: x.currentEmployer.value.trim() || null,
      expectedSalary: null,
      summary: x.summary,
      experience: x.experience.map((e) => ({ id: e.id, title: e.title, company: e.company, location: e.location, start: e.start, end: e.end, bullets: [] })),
      education: x.education.map((e) => ({ id: e.id, institution: e.institution, qualification: e.qualification, field: e.field, start: e.end ? e.end - 3 : new Date().getFullYear(), end: e.end })),
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
    const c = find(id);
    c.documents = [cvDocument(input), ...c.documents];
    if (!c.applications.some((a) => a.vacancyId === input.vacancyId)) {
      const app = application(input);
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
