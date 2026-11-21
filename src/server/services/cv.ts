/**
 * CV processing service. Uploaded files are stored, their text is read (PDF and Word), and the rule-based
 * reader turns it into a profile for HR to check. Processing runs after the upload request returns; the
 * screen polls for progress.
 */
import "server-only";
import type { CvBatch, CvExtraction, CvFile } from "@/types";
import { formatOf } from "@/lib/cv";
import { actorName, afterCommit, newId, now, orgId } from "../context";
import { collection, withOrg } from "../store";
import { extractText, fileFor } from "../files";
import { parseCv } from "../engine/cv-parser";
import { candidateProfileService, profileSnapshot } from "./candidates";
import { logAudit } from "./settings";
import { vacancySnapshot } from "./vacancies";

export interface UploadInput {
  name: string;
  sizeKb: number;
  /** The stored file from POST /api/files. */
  fileId: string;
}

export interface CvProcessingService {
  listBatches(): Promise<CvBatch[]>;
  getFile(id: string): Promise<{ file: CvFile; batch: Omit<CvBatch, "files">; nextToReview: string | null }>;
  upload(vacancyId: string, vacancyTitle: string, files: UploadInput[]): Promise<CvBatch>;
  /** Called with the latest batches whenever any file's status or progress changes. Returns an unsubscribe function. */
  subscribe(listener: (batches: CvBatch[]) => void): () => void;
  retry(fileId: string): Promise<void>;
  remove(fileId: string): Promise<void>;
  saveDraft(fileId: string, extraction: CvExtraction): Promise<CvFile>;
  /** Creates the candidate, or adds the CV to an existing one when `attachTo` is set. Returns the candidate id. */
  confirm(fileId: string, extraction: CvExtraction, attachTo?: string): Promise<string>;
  /** Adds every file in the batch that Vettly read with confidence. Returns how many were added. */
  confirmReady(batchId: string): Promise<number>;
  discard(fileId: string, reason: string): Promise<void>;
}

type StoredCvFile = CvFile & { fileId?: string };
type StoredBatch = Omit<CvBatch, "files"> & { files: StoredCvFile[] };

/** A plain copy, so callers never hold the stored objects (store arrays are proxies, which structuredClone refuses). */
const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
/** The organisation's CV batches. */
export const batchStore = collection<StoredBatch>("cv_batch");

const sorted = () => clone([...batchStore].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))) as CvBatch[];

function locate(fileId: string) {
  for (const batch of batchStore) {
    const file = batch.files.find((f) => f.id === fileId);
    if (file) return { batch, file };
  }
  throw new Error("This CV is no longer in the queue. It may have been removed.");
}

/** Reads one file's text and parses it. Runs outside any request; results are saved through withOrg. */
async function processFile(organisationId: string, cvId: string) {
  const fileId = await withOrg(organisationId, null, () => {
    const { file } = locate(cvId);
    file.status = "extracting";
    file.progress = 30;
    file.updatedAt = now();
    return file.fileId ?? null;
  }).catch(() => null);
  if (!fileId) return;
  const row = await fileFor(organisationId, fileId);
  const text = row ? await extractText(row) : ({ ok: false, failure: "unreadable" } as const);
  await withOrg(organisationId, null, () => {
    let found: ReturnType<typeof locate>;
    try {
      found = locate(cvId);
    } catch {
      return; // removed while processing
    }
    const { file } = found;
    file.progress = 100;
    file.updatedAt = now();
    if (!text.ok) {
      file.status = "failed";
      file.failure = text.failure;
      return;
    }
    const people = profileSnapshot();
    const known = [...new Set(people.flatMap((p) => p.skills.map((s) => s.name)))];
    const parsed = parseCv(text.text, text.pages, known);
    if (!parsed.looksLikeCv) {
      file.status = "failed";
      file.failure = "not_a_cv";
      return;
    }
    const x = parsed.extraction;
    const email = x.email.value.toLowerCase();
    const digits = x.phone.value.replace(/\D/g, "").slice(-9);
    const dup = people.find((p) => (email && p.email.toLowerCase() === email) || (digits.length === 9 && p.phone.replace(/\D/g, "").endsWith(digits)));
    file.extraction = x;
    if (dup) file.duplicateOf = { id: dup.id, name: dup.name };
    file.status = parsed.confident && !dup ? "ready" : "needs_review";
  });
}

async function processQueue(organisationId: string, ids: string[]) {
  for (const id of ids) await processFile(organisationId, id).catch((e) => console.error("[cv]", e));
}

export const cvService: CvProcessingService = {
  async listBatches() {
    return sorted();
  },
  async getFile(id) {
    const { batch, file } = locate(id);
    const { files, ...meta } = batch;
    const order = files.filter((f) => f.status === "needs_review" || f.status === "ready");
    const next = order.find((f) => f.id !== id && f.status === "needs_review") ?? order.find((f) => f.id !== id) ?? null;
    return { file: clone(file), batch: clone(meta), nextToReview: next?.id ?? null };
  },
  async upload(vacancyId, vacancyTitle, files) {
    if (!files.length) throw new Error("Choose at least one CV.");
    const vacancy = vacancySnapshot().find((v) => v.id === vacancyId);
    if (!vacancy) throw new Error("Choose a vacancy for these CVs.");
    vacancyTitle = vacancy.title;
    const org = orgId();
    for (const f of files) if (!(await fileFor(org, f.fileId))) throw new Error(`${f.name} didn't finish uploading. Try again.`);
    const id = newId("batch");
    const at = now();
    const batch: StoredBatch = {
      id,
      vacancyId,
      vacancyTitle,
      uploadedBy: actorName(),
      uploadedAt: at,
      files: files.map((f) => ({ id: newId("cv"), batchId: id, fileId: f.fileId, name: f.name, sizeKb: f.sizeKb, format: formatOf(f.name), status: "queued", progress: 0, updatedAt: at })),
    };
    batchStore.unshift(batch);
    logAudit("candidates", "Uploaded CVs", `${files.length} for ${vacancyTitle}`);
    const ids = batch.files.map((f) => f.id);
    afterCommit(() => processQueue(org, ids));
    return clone(batch) as CvBatch;
  },
  // Polled by the browser (see src/services/index.ts); never called on the server.
  subscribe() {
    return () => undefined;
  },
  async retry(fileId) {
    const { file } = locate(fileId);
    file.status = "queued";
    file.progress = 0;
    delete file.failure;
    const org = orgId();
    afterCommit(() => processQueue(org, [fileId]));
  },
  async remove(fileId) {
    const { batch, file } = locate(fileId);
    if (file.status === "added") throw new Error("This CV is already on a candidate record. Remove it from their Documents tab instead.");
    batch.files = batch.files.filter((f) => f.id !== fileId);
    if (batch.files.length === 0) batchStore.splice(batchStore.indexOf(batch), 1);
  },
  async saveDraft(fileId, extraction) {
    const { file } = locate(fileId);
    file.extraction = clone(extraction);
    file.updatedAt = now();
    return clone(file);
  },
  async confirm(fileId, extraction, attachTo) {
    const { batch, file } = locate(fileId);
    if (file.status === "added") throw new Error("This CV has already been added.");
    const input = { extraction, vacancyId: batch.vacancyId, vacancyTitle: batch.vacancyTitle, fileName: file.name, sizeKb: file.sizeKb, fileId: file.fileId };
    const c = attachTo ? await candidateProfileService.attachCv(attachTo, input) : await candidateProfileService.createFromCv(input);
    file.status = "added";
    file.candidateId = c.id;
    file.extraction = clone(extraction);
    file.reviewedBy = actorName();
    file.updatedAt = now();
    delete file.failure;
    return c.id;
  },
  async confirmReady(batchId) {
    const batch = batchStore.find((b) => b.id === batchId);
    if (!batch) throw new Error("That batch no longer exists.");
    let added = 0;
    for (const f of batch.files.filter((x) => x.status === "ready" && !x.duplicateOf && x.extraction)) {
      await cvService.confirm(f.id, f.extraction!);
      added++;
    }
    return added;
  },
  async discard(fileId, reason) {
    const { file } = locate(fileId);
    file.status = "discarded";
    file.discardReason = reason;
    file.reviewedBy = actorName();
    file.updatedAt = now();
  },
};
