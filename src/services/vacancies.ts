/**
 * Vacancy service. Phase 1: an in-memory store seeded from mock records, so creates, edits and status
 * changes persist while the app is open. The writing assistant is simulated: it returns pre-written,
 * clearly labelled text and never calls an AI model. Phase 2 replaces both with API calls.
 */
import type { CandidateSummary, Vacancy, VacancyDraft, VacancyStatus } from "@/types";
import { vacancyRecords, DEFAULT_WEIGHTS } from "@/mocks/vacancies";
import { candidates, MOCK_NOW } from "@/mocks/data";

export type AssistAction = "draft" | "inclusive" | "concise" | "formal";

export interface VacancyService {
  list(): Promise<Vacancy[]>;
  get(id: string): Promise<Vacancy>;
  candidatesFor(id: string): Promise<CandidateSummary[]>;
  create(draft: VacancyDraft, publish: boolean): Promise<Vacancy>;
  update(id: string, draft: VacancyDraft): Promise<Vacancy>;
  setStatus(id: string, status: VacancyStatus, reason?: string): Promise<Vacancy>;
  duplicate(id: string): Promise<Vacancy>;
  remove(id: string): Promise<void>;
  /** Simulated AI writing assistant. Streams words so the interface can show progress. */
  assist(action: AssistAction, input: { title: string; department: string; summary: string; responsibilities: string[] }): AsyncGenerator<string>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

let store: Vacancy[] = clone(vacancyRecords);
let seq = 40;

/** Synchronous read of the live store, for other mock services (matching reads current requirements and weights). */
export function vacancySnapshot(): Vacancy[] {
  return store;
}

/** Allowed status moves. Anything else is refused. */
export const STATUS_MOVES: Record<VacancyStatus, VacancyStatus[]> = {
  draft: ["open"],
  open: ["paused", "closed"],
  paused: ["open", "closed"],
  closed: ["open", "filled"],
  filled: [],
};

export function emptyDraft(): VacancyDraft {
  return {
    title: "",
    department: "",
    location: "",
    workMode: "On-site",
    employmentType: "Full-time",
    openings: 1,
    currency: "USD",
    salaryMin: null,
    salaryMax: null,
    salaryVisible: false,
    closesAt: null,
    hiringManager: "",
    summary: "",
    responsibilities: [],
    benefits: [],
    requirements: [],
    weights: { ...DEFAULT_WEIGHTS },
    assessment: { battery: "professional", autoSendOnShortlist: true, deadlineDays: 5 },
    channels: ["careers"],
  };
}

export function toDraft(v: Vacancy): VacancyDraft {
  const { title, department, location, workMode, employmentType, openings, currency, salaryMin, salaryMax, salaryVisible, closesAt, hiringManager, summary, responsibilities, benefits, requirements, weights, assessment, channels } = clone(v);
  return { title, department, location, workMode, employmentType, openings, currency, salaryMin, salaryMax, salaryVisible, closesAt, hiringManager, summary, responsibilities, benefits, requirements, weights, assessment, channels };
}

function find(id: string) {
  const v = store.find((x) => x.id === id);
  if (!v) throw new Error("This vacancy no longer exists. It may have been deleted.");
  return v;
}

/* ---------- Simulated writing assistant ---------- */

function draftText(title: string, department: string) {
  const role = title || "this role";
  return {
    summary: `As our ${role}, you will join the ${department || "wider"} team at Msasa Financial Group and help us serve customers across Zimbabwe with reliable, well-run services. You will own clear outcomes, work closely with colleagues in other teams, and have room to grow.`,
    responsibilities: [
      `Deliver the day-to-day work of the ${role} role to agreed quality and deadlines`,
      "Work with colleagues across branches and head office to solve problems early",
      "Keep accurate records and report progress clearly to your manager",
      "Identify ways to improve how we work, and help put them in place",
    ],
  };
}

async function* streamWords(text: string) {
  for (const w of text.split(/(\s+)/)) {
    await wait(w.trim() ? 18 : 0);
    yield w;
  }
}

/* ---------- Mock implementation ---------- */

export const mockVacancies: VacancyService = {
  async list() {
    await wait(450);
    return clone(store);
  },
  async get(id) {
    await wait(300);
    return clone(find(id));
  },
  async candidatesFor(id) {
    await wait(350);
    const v = find(id);
    return clone(candidates.filter((c) => c.appliedFor === v.title));
  },
  async create(draft, publish) {
    await wait(800);
    const now = MOCK_NOW;
    const v: Vacancy = {
      ...clone(draft),
      id: `vac_new_${++seq}`,
      reference: `MFG-2026-0${seq}`,
      status: publish ? "open" : "draft",
      openedAt: now,
      applicants: 0,
      newApplicants: 0,
      shortlisted: 0,
      interviewing: 0,
      createdAt: now,
      updatedAt: now,
      history: publish
        ? [
            { status: "draft", at: now, by: "Tendai Moyo" },
            { status: "open", at: now, by: "Tendai Moyo" },
          ]
        : [{ status: "draft", at: now, by: "Tendai Moyo" }],
    };
    store = [v, ...store];
    return clone(v);
  },
  async update(id, draft) {
    await wait(700);
    const v = find(id);
    Object.assign(v, clone(draft), { updatedAt: MOCK_NOW });
    return clone(v);
  },
  async setStatus(id, status, reason) {
    await wait(600);
    const v = find(id);
    if (!STATUS_MOVES[v.status].includes(status)) throw new Error(`A ${v.status} vacancy can't be moved to ${status}.`);
    if (status === "open" && v.channels.length === 0) throw new Error("Choose at least one place to publish before opening this vacancy.");
    v.status = status;
    v.updatedAt = MOCK_NOW;
    if (status === "open" && v.history.every((h) => h.status !== "open")) v.openedAt = MOCK_NOW;
    v.history.push({ status, at: MOCK_NOW, by: "Tendai Moyo", ...(reason ? { reason } : {}) });
    return clone(v);
  },
  async duplicate(id) {
    await wait(500);
    const src = find(id);
    const copy: Vacancy = {
      ...clone(src),
      id: `vac_new_${++seq}`,
      reference: `MFG-2026-0${seq}`,
      title: `${src.title} (copy)`,
      status: "draft",
      applicants: 0,
      newApplicants: 0,
      shortlisted: 0,
      interviewing: 0,
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
      openedAt: MOCK_NOW,
      history: [{ status: "draft", at: MOCK_NOW, by: "Tendai Moyo" }],
    };
    store = [copy, ...store];
    return clone(copy);
  },
  async remove(id) {
    await wait(500);
    const v = find(id);
    if (v.status !== "draft") throw new Error("Only drafts can be deleted. Close the vacancy instead to keep its history.");
    store = store.filter((x) => x.id !== id);
  },
  async *assist(action, input) {
    await wait(600);
    if (action === "draft") {
      const d = draftText(input.title, input.department);
      yield* streamWords(JSON.stringify(d));
      return;
    }
    const summary = input.summary.trim();
    let out = summary;
    if (action === "concise") {
      out = summary.split(/(?<=\.)\s+/).slice(0, 2).join(" ").replace(/\b(very|really|highly|extremely)\s+/gi, "");
    } else if (action === "inclusive") {
      out = summary
        .replace(/\b(rockstar|ninja|guru)\b/gi, "specialist")
        .replace(/\b(he|she)\b/gi, "they")
        .replace(/\bmanpower\b/gi, "staffing")
        .replace(/\byoung and dynamic\b/gi, "motivated")
        .concat(summary.endsWith(".") ? " We welcome applications from people of all backgrounds, including people with disabilities." : ". We welcome applications from people of all backgrounds, including people with disabilities.");
    } else if (action === "formal") {
      out = summary.replace(/\byou'll\b/gi, "you will").replace(/\bwe're\b/gi, "we are").replace(/\bdon't\b/gi, "do not").replace(/!/g, ".");
    }
    yield* streamWords(JSON.stringify({ summary: out }));
  },
};
