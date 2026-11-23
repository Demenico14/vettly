import "server-only";
/**
 * Talent service (Module 12). Searches the talent pool and active candidates together, ranks by fit, and keeps
 * saved searches and collections per organisation. Retention rules: people whose consent to keep their details has
 * lapsed are hidden by default and can't be approached until consent is renewed or the record is deleted.
 */
import type { Availability, CandidateProfile } from "@/types";
import type { CountryCode } from "@/types/psychometrics";
import type { Collection, SavedSearch, TalentFilters, TalentHit, TalentRecord, TalentTestResult } from "@/types/talent";
import { EMPTY_FILTERS, RELATED_SKILLS, consentValid } from "@/lib/talent";
import { tests as catalogue } from "@/mocks/psychometrics";
import { actorName, newId, now } from "../context";
import { collection } from "../store";
import { profileSnapshot, candidateProfileService } from "./candidates";
import { invitationStore, scoreOf } from "./assessments";
import { vacancySnapshot } from "./vacancies";

/** A plain copy, so callers never hold the stored objects (store arrays are proxies, which structuredClone refuses). */
const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const me = () => actorName();
const nowMs = () => Date.now();

const records = collection<TalentRecord & { convertedTo?: string }>("talent");
const searches = collection<SavedSearch>("saved_search");
const cols = collection<Collection>("collection");

const LEVEL_RANK = { Basic: 1, Intermediate: 2, Advanced: 3, Expert: 4 } as const;
const CITY_COUNTRY: Record<string, CountryCode> = { Harare: "ZW", Bulawayo: "ZW", Gweru: "ZW", Mutare: "ZW", Masvingo: "ZW", Lusaka: "ZM", Johannesburg: "ZA", "Cape Town": "ZA", Gaborone: "BW" };

export { consentValid };

function candidateTests(c: CandidateProfile): TalentTestResult[] {
  const out: TalentTestResult[] = [];
  for (const r of invitationStore.filter((x) => x.candidateId === c.id)) {
    for (const res of r.results) {
      const t = catalogue.find((x) => x.id === res.testId);
      if (!t || t.family !== "ability" && t.family !== "sjt") continue;
      out.push({ testId: t.id, label: t.name.replace(/ · .*$/, ""), percentile: scoreOf(res)[0]!.percentile, takenAt: r.attempts.at(-1)?.completedAt ?? r.sentAt });
    }
  }
  return out;
}

function years(c: CandidateProfile) {
  const months = c.experience.reduce((s, e) => {
    const a = new Date(`${e.start}-01`);
    const b = e.end ? new Date(`${e.end}-01`) : new Date(nowMs());
    return s + (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
  }, 0);
  return Math.round(months / 12);
}

function asHit(p: TalentRecord | CandidateProfile, kind: "talent" | "candidate"): Omit<TalentHit, "relevance" | "matchedSkills"> {
  const inCols = cols.filter((c) => c.members.some((m) => m.personId === p.id)).map((c) => c.name);
  if (kind === "talent") {
    const t = p as TalentRecord;
    return { id: t.id, kind, name: t.name, headline: t.headline, location: t.location, country: t.country, yearsExperience: t.yearsExperience, skills: t.skills, availability: t.availability, source: t.source, history: t.history, tests: t.tests, consentUntil: t.consentUntil, openToRelocation: t.openToRelocation, workPreference: t.workPreference, collections: inCols };
  }
  const c = p as CandidateProfile;
  const app = c.applications[0]!;
  return {
    id: c.id,
    kind,
    name: c.name,
    headline: c.headline,
    location: c.location,
    country: CITY_COUNTRY[c.location] ?? "ZW",
    yearsExperience: Number(/(\d+) yrs?\b/.exec(c.headline)?.[1] ?? years(c)),
    skills: c.skills.map((s) => ({ name: s.name, level: s.level, years: s.years ?? 0 })),
    availability: c.availability,
    source: "Active applicant",
    history: null,
    tests: candidateTests(c),
    consentUntil: null,
    openToRelocation: false,
    workPreference: null,
    collections: inCols,
    application: { vacancyTitle: app.vacancyTitle, stage: app.stage },
  };
}

const FAMILY_TEST: Record<NonNullable<TalentFilters["test"]>["family"], (id: string) => boolean> = {
  numerical: (id) => id.includes("num"),
  verbal: (id) => id.includes("verb"),
  inductive: (id) => id.includes("inductive"),
  sjt: (id) => id.includes("sjt"),
  any_ability: () => true,
};

const has = (hay: string, needle: string) => hay.toLowerCase().includes(needle.toLowerCase());

function score(h: Omit<TalentHit, "relevance" | "matchedSkills">, f: TalentFilters, extraText: string): { pass: boolean; relevance: number; matched: string[] } {
  const skillNames = h.skills.map((s) => s.name);
  const matched = f.skills.filter((want) => h.skills.some((s) => has(s.name, want) && (!f.minLevel || LEVEL_RANK[s.level] >= LEVEL_RANK[f.minLevel])));
  if (f.skills.length && matched.length < f.skills.length) return { pass: false, relevance: 0, matched };
  const words = f.query.trim().split(/\s+/).filter(Boolean);
  const text = `${h.name} ${h.headline} ${h.location} ${skillNames.join(" ")} ${extraText}`;
  if (words.some((w) => !has(text, w))) return { pass: false, relevance: 0, matched };
  if (h.yearsExperience < f.minYears) return { pass: false, relevance: 0, matched };
  if (f.countries.length && !f.countries.includes(h.country)) return { pass: false, relevance: 0, matched };
  if (f.availability.length && !f.availability.includes(h.availability)) return { pass: false, relevance: 0, matched };
  if (f.sources.length && !f.sources.includes(h.source)) return { pass: false, relevance: 0, matched };
  if (f.test && !h.tests.some((t) => FAMILY_TEST[f.test!.family](t.testId) && t.percentile >= f.test!.min)) return { pass: false, relevance: 0, matched };
  if (f.relocation && !h.openToRelocation) return { pass: false, relevance: 0, matched };
  if (f.consentValidOnly && !consentValid(h.consentUntil)) return { pass: false, relevance: 0, matched };
  if (!f.includeApplicants && h.kind === "candidate") return { pass: false, relevance: 0, matched };

  // Relevance: depth in the searched skills, experience, recent tests and quick availability.
  let rel = 40;
  for (const want of f.skills) {
    const s = h.skills.find((x) => has(x.name, want))!;
    rel += (LEVEL_RANK[s.level] * 6 + Math.min(s.years, 10)) / Math.max(1, f.skills.length);
  }
  if (!f.skills.length) rel += Math.min(h.skills.length, 6) * 2;
  rel += Math.min(h.yearsExperience, 12) * 0.8;
  if (h.availability === "Immediately" || h.availability === "2 weeks' notice") rel += 4;
  const best = Math.max(0, ...h.tests.map((t) => t.percentile));
  rel += best / 20;
  return { pass: true, relevance: Math.min(99, Math.round(rel)), matched };
}

export interface TalentSearchResult {
  hits: TalentHit[];
  related: string[];
  facets: { skills: { name: string; count: number }[]; countries: { code: CountryCode; count: number }[]; lapsedHidden: number };
}

function run(f: TalentFilters): TalentSearchResult {
  const people: [TalentRecord | CandidateProfile, "talent" | "candidate"][] = [
    ...records.filter((r) => !r.convertedTo).map((r) => [r, "talent"] as [TalentRecord, "talent"]),
    ...profileSnapshot().map((c) => [c, "candidate"] as [CandidateProfile, "candidate"]),
  ];
  const hits: TalentHit[] = [];
  let lapsedHidden = 0;
  for (const [p, kind] of people) {
    const h = asHit(p, kind);
    const extra = kind === "talent" ? `${(p as TalentRecord).currentEmployer ?? ""} ${(p as TalentRecord).education} ${(p as TalentRecord).tags.join(" ")}` : `${(p as CandidateProfile).currentEmployer ?? ""}`;
    const s = score(h, f, extra);
    if (s.pass) hits.push({ ...h, relevance: s.relevance, matchedSkills: s.matched });
    else if (f.consentValidOnly && !consentValid(h.consentUntil) && score(h, { ...f, consentValidOnly: false }, extra).pass) lapsedHidden++;
  }
  hits.sort((a, b) => b.relevance - a.relevance || a.name.localeCompare(b.name));
  const counts = new Map<string, number>();
  hits.forEach((h) => h.skills.forEach((s) => counts.set(s.name, (counts.get(s.name) ?? 0) + 1)));
  const related = [...new Set(f.skills.flatMap((s) => RELATED_SKILLS[Object.keys(RELATED_SKILLS).find((k) => has(k, s)) ?? ""] ?? []))].filter((s) => !f.skills.some((x) => has(s, x)));
  const countries = new Map<CountryCode, number>();
  hits.forEach((h) => countries.set(h.country, (countries.get(h.country) ?? 0) + 1));
  return {
    hits,
    related,
    facets: {
      skills: [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 12),
      countries: [...countries].map(([code, count]) => ({ code, count })),
      lapsedHidden,
    },
  };
}

/** Filters that would find people for a vacancy, from its skill requirements. */
function filtersForVacancy(vacancyId: string): TalentFilters {
  const v = vacancySnapshot().find((x) => x.id === vacancyId);
  if (!v) return EMPTY_FILTERS;
  const known = [...new Set([...records.flatMap((r) => r.skills.map((s) => s.name)), ...profileSnapshot().flatMap((c) => c.skills.map((s) => s.name))])];
  const skills = v.requirements
    .filter((r) => r.kind === "skill" && r.priority === "essential")
    .map((r) => known.find((k) => r.text.toLowerCase().includes(k.toLowerCase())))
    .filter((x): x is string => !!x)
    .slice(0, 3);
  const exp = v.requirements.find((r) => r.kind === "experience" && r.priority === "essential")?.years ?? 0;
  return { ...EMPTY_FILTERS, skills: [...new Set(skills)], minYears: Math.max(0, exp - 2) };
}

export interface TalentService {
  search(filters: TalentFilters): Promise<TalentSearchResult>;
  forVacancy(vacancyId: string): Promise<TalentFilters>;
  record(id: string): Promise<{ record: TalentRecord; collections: Collection[]; convertedTo: string | null }>;
  savedSearches(): Promise<SavedSearch[]>;
  saveSearch(name: string, filters: TalentFilters, alert: SavedSearch["alert"]): Promise<SavedSearch>;
  setAlert(id: string, alert: SavedSearch["alert"]): Promise<SavedSearch>;
  deleteSearch(id: string): Promise<void>;
  markRun(id: string): Promise<void>;
  collections(): Promise<Collection[]>;
  collection(id: string): Promise<{ collection: Collection; hits: (TalentHit & { note: string; addedBy: string; addedAt: string })[] }>;
  createCollection(name: string, description: string): Promise<Collection>;
  addToCollection(collectionId: string, people: { id: string; kind: "talent" | "candidate" }[]): Promise<{ added: number; already: number }>;
  removeFromCollection(collectionId: string, personId: string): Promise<void>;
  setNote(collectionId: string, personId: string, note: string): Promise<void>;
  deleteCollection(id: string): Promise<void>;
  requestConsent(id: string): Promise<TalentRecord>;
  recordConsent(id: string): Promise<TalentRecord>;
  deleteRecord(id: string): Promise<void>;
  /** Adds a talent record to a vacancy as a new candidate. Returns the candidate id. */
  addToVacancy(id: string, vacancyId: string): Promise<string>;
  /** Every skill name in the pool and among applicants, for the skill picker. */
  skills(): Promise<string[]>;
}

export const talentService: TalentService = {
  async skills() {
    return talentSkillVocabulary();
  },
  async search(filters) {
    return clone(run({ ...EMPTY_FILTERS, ...filters }));
  },
  async forVacancy(vacancyId) {
    return clone(filtersForVacancy(vacancyId));
  },
  async record(id) {
    const r = records.find((x) => x.id === id);
    if (!r) throw new Error("This person is no longer in the talent pool.");
    return clone({ record: r, collections: cols.filter((c) => c.members.some((m) => m.personId === id)), convertedTo: r.convertedTo ?? null });
  },
  async savedSearches() {
    return clone(searches.map((s) => ({ ...s, newSinceLastRun: s.newSinceLastRun })));
  },
  async saveSearch(name, filters, alert) {
    if (!name.trim()) throw new Error("Name the search so you can find it again.");
    const s: SavedSearch = { id: newId("ss"), name: name.trim(), filters: clone(filters), alert, owner: me(), createdAt: now(), lastRunAt: now(), newSinceLastRun: 0, isMock: true };
    searches.unshift(s);
    return clone(s);
  },
  async setAlert(id, alert) {
    const s = searches.find((x) => x.id === id)!;
    s.alert = alert;
    return clone(s);
  },
  async deleteSearch(id) {
    searches.splice(searches.findIndex((x) => x.id === id), 1);
  },
  async markRun(id) {
    const s = searches.find((x) => x.id === id);
    if (s) {
      s.lastRunAt = now();
      s.newSinceLastRun = 0;
    }
  },
  async collections() {
    return clone(cols);
  },
  async collection(id) {
    const c = cols.find((x) => x.id === id);
    if (!c) throw new Error("This collection could not be found.");
    const hits = c.members
      .map((m) => {
        const p = m.kind === "talent" ? records.find((r) => r.id === m.personId) : profileSnapshot().find((x) => x.id === m.personId);
        if (!p) return null;
        return { ...asHit(p, m.kind), relevance: 0, matchedSkills: [], note: m.note, addedBy: m.addedBy, addedAt: m.addedAt };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    return clone({ collection: c, hits });
  },
  async createCollection(name, description) {
    if (!name.trim()) throw new Error("Name the collection.");
    if (cols.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) throw new Error("A collection with that name already exists.");
    const c: Collection = { id: newId("col"), name: name.trim(), description: description.trim(), owner: me(), sharedWith: [], members: [], updatedAt: now(), isMock: true };
    cols.unshift(c);
    return clone(c);
  },
  async addToCollection(collectionId, people) {
    const c = cols.find((x) => x.id === collectionId);
    if (!c) throw new Error("This collection could not be found.");
    let added = 0;
    let already = 0;
    for (const p of people) {
      if (c.members.some((m) => m.personId === p.id)) already++;
      else {
        c.members.push({ personId: p.id, kind: p.kind, addedBy: me(), addedAt: now(), note: "" });
        added++;
      }
    }
    c.updatedAt = now();
    return { added, already };
  },
  async removeFromCollection(collectionId, personId) {
    const c = cols.find((x) => x.id === collectionId)!;
    c.members = c.members.filter((m) => m.personId !== personId);
    c.updatedAt = now();
  },
  async setNote(collectionId, personId, note) {
    const m = cols.find((x) => x.id === collectionId)?.members.find((x) => x.personId === personId);
    if (m) m.note = note.trim();
  },
  async deleteCollection(id) {
    cols.splice(cols.findIndex((x) => x.id === id), 1);
  },
  async requestConsent(id) {
    const r = records.find((x) => x.id === id)!;
    r.tags = [...new Set([...r.tags, "Consent requested"])];
    return clone(r);
  },
  async recordConsent(id) {
    const r = records.find((x) => x.id === id)!;
    const d = new Date(nowMs());
    d.setFullYear(d.getFullYear() + 1);
    r.consentUntil = d.toISOString().slice(0, 10);
    r.lastContact = now().slice(0, 10);
    r.tags = r.tags.filter((t) => t !== "Consent requested");
    return clone(r);
  },
  async deleteRecord(id) {
    const i = records.findIndex((x) => x.id === id);
    if (i >= 0) records.splice(i, 1);
    cols.forEach((c) => (c.members = c.members.filter((m) => m.personId !== id)));
  },
  async addToVacancy(id, vacancyId) {
    const r = records.find((x) => x.id === id);
    if (!r) throw new Error("This person is no longer in the talent pool.");
    if (!consentValid(r.consentUntil)) throw new Error("Their consent to keep their details has lapsed. Renew it before approaching them.");
    const v = vacancySnapshot().find((x) => x.id === vacancyId);
    if (!v) throw new Error("Choose a vacancy.");
    if (v.status !== "open") throw new Error(`${v.title} isn't open.`);
    const avail: Availability = r.availability;
    const c = await candidateProfileService.createFromCv({
      extraction: {
        name: { value: r.name },
        email: { value: r.email },
        phone: { value: r.phone },
        location: { value: r.location },
        headline: { value: r.headline },
        currentEmployer: { value: r.currentEmployer ?? "" },
        availability: { value: avail },
        summary: `${r.currentTitle}${r.currentEmployer ? ` at ${r.currentEmployer}` : ""}. Added from the talent pool (${r.source.toLowerCase()}).${r.history ? ` ${r.history}` : ""}`,
        experience: [{ id: "x1", title: r.currentTitle, company: r.currentEmployer ?? "Self-employed", location: r.location, start: `${2026 - Math.min(r.yearsExperience, 4)}-01`, end: null }],
        education: [{ id: "e1", institution: r.education.split(",").slice(1).join(",").trim() || r.education, qualification: r.education.split(",")[0]!, field: "", end: null }],
        skills: r.skills.map((s) => s.name),
        pages: 2,
        ocr: false,
      },
      vacancyId: v.id,
      vacancyTitle: v.title,
      fileName: `${r.name.replace(/\s+/g, "_")}_talent_pool.pdf`,
      sizeKb: 140,
      source: "Talent pool",
      skillLevels: r.skills,
      tags: r.tags.filter((t) => t !== "Consent requested"),
    });
    r.convertedTo = c.id;
    cols.forEach((col) => col.members.forEach((m) => m.personId === r.id && ((m.personId = c.id), (m.kind = "candidate"))));
    return c.id;
  },
};

export { EMPTY_FILTERS };

/** Every skill name in the pool and among applicants, for the skill picker. */
export function talentSkillVocabulary(): string[] {
  return [...new Set([...records.flatMap((r) => r.skills.map((s) => s.name)), ...profileSnapshot().flatMap((c) => c.skills.map((s) => s.name))])].sort((a, b) => a.localeCompare(b));
}
