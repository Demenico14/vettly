/**
 * CV processing service. Phase 1: an in-memory queue that simulates upload and extraction with timers, so
 * progress, failures and review behave like the real thing while the app is open. Phase 2 swaps in document
 * storage, a processing queue and real extraction behind the same interface.
 */
import type { CvBatch, CvExtraction, CvFile } from "@/types";
import { cvBatches, formatOf, simulateExtraction } from "@/mocks/cv";
import { MOCK_NOW, users } from "@/mocks/data";
import { mockCandidateProfiles } from "./candidates";

export interface UploadInput {
  name: string;
  sizeKb: number;
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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => structuredClone(v);
const me = users[0]!.name;
const batches: CvBatch[] = clone(cvBatches);
const listeners = new Set<(batches: CvBatch[]) => void>();
let seq = 0;
let timer: ReturnType<typeof setInterval> | null = null;

const sorted = () => clone([...batches].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)));
const emit = () => {
  const snapshot = sorted();
  listeners.forEach((l) => l(snapshot));
};

function locate(fileId: string) {
  for (const batch of batches) {
    const file = batch.files.find((f) => f.id === fileId);
    if (file) return { batch, file };
  }
  throw new Error("This CV is no longer in the queue. It may have been removed.");
}

/** At most three files move at once, like a real upload queue. */
const CONCURRENT = 3;

async function finishExtraction(file: CvFile) {
  const people = await mockCandidateProfiles.list();
  const batch = batches.find((b) => b.id === file.batchId);
  const outcome = simulateExtraction(file.name, file.sizeKb, people, batch?.vacancyTitle);
  file.progress = 100;
  file.updatedAt = MOCK_NOW;
  if (outcome.status === "failed") {
    file.status = "failed";
    file.failure = outcome.failure;
  } else {
    file.status = outcome.status;
    file.extraction = outcome.extraction;
    if (outcome.duplicateOf) file.duplicateOf = outcome.duplicateOf;
  }
}

function tick() {
  const active = batches.flatMap((b) => b.files).filter((f) => f.status === "uploading" || f.status === "extracting");
  const queued = batches.flatMap((b) => b.files).filter((f) => f.status === "queued");
  for (const f of queued.slice(0, Math.max(0, CONCURRENT - active.length))) {
    f.status = "uploading";
    f.progress = 0;
  }
  for (const f of batches.flatMap((b) => b.files)) {
    if (f.status === "uploading") {
      // Bigger files upload more slowly.
      f.progress = Math.min(100, f.progress + Math.max(8, 40 - f.sizeKb / 60) + Math.random() * 10);
      if (f.progress >= 100) {
        f.status = "extracting";
        f.progress = 0;
      }
    } else if (f.status === "extracting" && f.progress < 100) {
      f.progress = Math.min(99, f.progress + 9 + Math.random() * 12);
      if (f.progress >= 99) {
        f.progress = 100;
        void finishExtraction(f).then(emit);
      }
    }
  }
  emit();
  const busy = batches.some((b) => b.files.some((f) => ["queued", "uploading", "extracting"].includes(f.status) && f.progress < 100));
  if (!busy && timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startQueue() {
  if (!timer) timer = setInterval(tick, 450);
}

export const mockCvProcessing: CvProcessingService = {
  async listBatches() {
    await wait(400);
    return sorted();
  },
  async getFile(id) {
    await wait(300);
    const { batch, file } = locate(id);
    const { files, ...meta } = batch;
    const order = files.filter((f) => f.status === "needs_review" || f.status === "ready");
    const next = order.find((f) => f.id !== id && f.status === "needs_review") ?? order.find((f) => f.id !== id) ?? null;
    return { file: clone(file), batch: clone(meta), nextToReview: next?.id ?? null };
  },
  async upload(vacancyId, vacancyTitle, files) {
    await wait(200);
    const id = `bat_new${++seq}`;
    const batch: CvBatch = {
      id,
      vacancyId,
      vacancyTitle,
      uploadedBy: me,
      uploadedAt: new Date(new Date(MOCK_NOW).getTime() + seq * 1000).toISOString(),
      files: files.map((f, i) => ({
        id: `cv_new${seq}_${i + 1}`,
        batchId: id,
        name: f.name,
        sizeKb: f.sizeKb,
        format: formatOf(f.name),
        status: "queued",
        progress: 0,
        updatedAt: MOCK_NOW,
      })),
    };
    batches.unshift(batch);
    startQueue();
    emit();
    return clone(batch);
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  async retry(fileId) {
    await wait(150);
    const { file } = locate(fileId);
    file.status = "queued";
    file.progress = 0;
    delete file.failure;
    startQueue();
    emit();
  },
  async remove(fileId) {
    await wait(200);
    const { batch, file } = locate(fileId);
    if (file.status === "added") throw new Error("This CV is already on a candidate record. Remove it from their Documents tab instead.");
    batch.files = batch.files.filter((f) => f.id !== fileId);
    if (batch.files.length === 0) batches.splice(batches.indexOf(batch), 1);
    emit();
  },
  async saveDraft(fileId, extraction) {
    await wait(350);
    const { file } = locate(fileId);
    file.extraction = clone(extraction);
    file.updatedAt = MOCK_NOW;
    emit();
    return clone(file);
  },
  async confirm(fileId, extraction, attachTo) {
    const { batch, file } = locate(fileId);
    if (file.status === "added") throw new Error("This CV has already been added.");
    const input = { extraction, vacancyId: batch.vacancyId, vacancyTitle: batch.vacancyTitle, fileName: file.name, sizeKb: file.sizeKb };
    const c = attachTo ? await mockCandidateProfiles.attachCv(attachTo, input) : await mockCandidateProfiles.createFromCv(input);
    file.status = "added";
    file.candidateId = c.id;
    file.extraction = clone(extraction);
    file.reviewedBy = me;
    file.updatedAt = MOCK_NOW;
    delete file.failure;
    emit();
    return c.id;
  },
  async confirmReady(batchId) {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) throw new Error("That batch no longer exists.");
    let added = 0;
    for (const f of batch.files.filter((x) => x.status === "ready" && !x.duplicateOf && x.extraction)) {
      await this.confirm(f.id, f.extraction!);
      added++;
    }
    return added;
  },
  async discard(fileId, reason) {
    await wait(300);
    const { file } = locate(fileId);
    file.status = "discarded";
    file.discardReason = reason;
    file.reviewedBy = me;
    file.updatedAt = MOCK_NOW;
    emit();
  },
};
