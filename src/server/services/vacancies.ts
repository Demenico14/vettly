/**
 * Vacancy service: the organisation's vacancies, with applicant counts worked out from real applications.
 */
import "server-only";
import type { CandidateSummary, Vacancy } from "@/types";
import type { VacancyService } from "@/services/contracts";
import { actorName, newId, now } from "../context";
import { collection, single } from "../store";
import { profileSnapshot } from "./candidates";
import { referencePrefix } from "./settings";

/** A plain copy, so callers never hold the stored objects (store arrays are proxies, which structuredClone refuses). */
const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const store = collection<Vacancy>("vacancy");
const counter = single<{ year: number; n: number }>("vacancy_counter", () => ({ year: new Date().getFullYear(), n: 0 }));

/** The organisation's vacancies as stored, for other services. */
export function vacancySnapshot(): Vacancy[] {
  return store;
}

import { STATUS_MOVES } from "@/lib/workflow";

function nextReference() {
  const c = counter.get();
  const year = new Date().getFullYear();
  const n = c.year === year ? c.n + 1 : 1;
  counter.set({ year, n });
  return `${referencePrefix()}-${year}-${String(n).padStart(3, "0")}`;
}

/** Applicant numbers come from the applications themselves. */
function withCounts(v: Vacancy): Vacancy {
  const apps = profileSnapshot().flatMap((c) => c.applications.filter((a) => a.vacancyId === v.id));
  const weekAgo = Date.now() - 7 * 86_400_000;
  return {
    ...clone(v),
    applicants: apps.length,
    newApplicants: apps.filter((a) => new Date(a.appliedAt).getTime() > weekAgo && a.stage === "applied").length,
    shortlisted: apps.filter((a) => ["shortlisted", "assessment", "interview", "offer", "hired"].includes(a.stage)).length,
    interviewing: apps.filter((a) => a.stage === "interview").length,
  };
}

function find(id: string) {
  const v = store.find((x) => x.id === id);
  if (!v) throw new Error("This vacancy no longer exists. It may have been deleted.");
  return v;
}

export const vacancyService: VacancyService = {
  async list() {
    return store.map(withCounts).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async get(id) {
    return withCounts(find(id));
  },
  async candidatesFor(id) {
    const v = find(id);
    return profileSnapshot()
      .flatMap((c): CandidateSummary[] => {
        const a = c.applications.find((x) => x.vacancyId === v.id);
        return a
          ? [{ id: c.id, name: c.name, headline: c.headline, location: c.location, appliedFor: v.title, stage: a.stage, matchScore: a.matchScore, provenance: a.provenance, appliedAt: a.appliedAt, topSkills: c.skills.slice(0, 3).map((s) => s.name) }]
          : [];
      })
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  },
  async create(draft, publish) {
    if (!draft.title.trim()) throw new Error("Give the vacancy a title.");
    if (publish && draft.channels.length === 0) throw new Error("Choose at least one place to publish.");
    const at = now();
    const by = actorName();
    const v: Vacancy = {
      ...clone(draft),
      id: newId("vac"),
      reference: nextReference(),
      status: publish ? "open" : "draft",
      openedAt: at,
      applicants: 0,
      newApplicants: 0,
      shortlisted: 0,
      interviewing: 0,
      createdAt: at,
      updatedAt: at,
      history: publish ? [{ status: "draft", at, by }, { status: "open", at, by }] : [{ status: "draft", at, by }],
    };
    store.unshift(v);
    return withCounts(v);
  },
  async update(id, draft) {
    const v = find(id);
    if (v.status === "filled") throw new Error("A filled vacancy can't be edited.");
    Object.assign(v, clone(draft), { updatedAt: now() });
    return withCounts(v);
  },
  async setStatus(id, status, reason) {
    const v = find(id);
    if (!STATUS_MOVES[v.status].includes(status)) throw new Error(`A ${v.status} vacancy can't be moved to ${status}.`);
    if (status === "open" && v.channels.length === 0) throw new Error("Choose at least one place to publish before opening this vacancy.");
    const at = now();
    v.status = status;
    v.updatedAt = at;
    if (status === "open" && v.history.every((h) => h.status !== "open")) v.openedAt = at;
    v.history.push({ status, at, by: actorName(), ...(reason ? { reason } : {}) });
    return withCounts(v);
  },
  async duplicate(id) {
    const src = find(id);
    const at = now();
    const copy: Vacancy = {
      ...clone(src),
      id: newId("vac"),
      reference: nextReference(),
      title: `${src.title} (copy)`,
      status: "draft",
      createdAt: at,
      updatedAt: at,
      openedAt: at,
      history: [{ status: "draft", at, by: actorName() }],
    };
    store.unshift(copy);
    return withCounts(copy);
  },
  async remove(id) {
    const v = find(id);
    if (v.status !== "draft") throw new Error("Only drafts can be deleted. Close the vacancy instead to keep its history.");
    store.splice(store.indexOf(v), 1);
  },
  // Runs in the browser (see src/services/index.ts); never called on the server.
  async *assist() {
    yield "";
  },
};
