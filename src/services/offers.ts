/**
 * Offers service (Module 11). Phase 1: an in-memory store seeded from src/mocks/offers.ts. Offers move through
 * approval (hiring manager, HR, and the CFO above the salary band), are sent with a deadline, and record the
 * candidate's response. Sending moves the application to Offer; hiring needs the pre-hire checks and moves it
 * to Hired. Every step is written to the offer's history.
 */
import type { ApplicationStage, Vacancy } from "@/types";
import type { CandidateResponse, Offer, OfferTerms } from "@/types/offers";
import { approvalChain, checklistFor, offerLetter, offerRecords } from "@/mocks/offers";
import { interviewers } from "@/mocks/interviews";
import { MOCK_NOW, users } from "@/mocks/data";
import { profileSnapshot } from "./candidates";
import { vacancySnapshot } from "./vacancies";
import { mockPipeline } from "./pipeline";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => structuredClone(v);
const me = users[0]!.name;
const NOW = new Date(MOCK_NOW).getTime();
const store: Offer[] = clone(offerRecords);
let seq = 0;

const OPEN: Offer["status"][] = ["draft", "pending_approval", "approved", "sent", "viewed", "countered"];

function vacancyOf(id: string) {
  const v = vacancySnapshot().find((x) => x.id === id);
  if (!v) throw new Error("This vacancy could not be found.");
  return v;
}

function find(id: string) {
  const o = store.find((x) => x.id === id);
  if (!o) throw new Error("This offer could not be found.");
  if ((o.status === "sent" || o.status === "viewed") && o.expiresAt && new Date(o.expiresAt).getTime() < NOW) {
    o.status = "expired";
    o.history.push({ at: o.expiresAt, by: "Vettly", text: "Expired without a response" });
  }
  return o;
}
const log = (o: Offer, text: string, by = me) => o.history.push({ at: MOCK_NOW, by, text });

const deadline = (days: number) => {
  const d = new Date(NOW + days * 86400000);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
};

/** First working day on or after the candidate's notice period ends. */
function firstStart(noticeMonths: number) {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() + noticeMonths);
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  // Avoid starting on New Year's Day.
  if (d.getMonth() === 0 && d.getDate() === 1) d.setDate(4);
  return d.toISOString().slice(0, 10);
}

/* ---------- Views ---------- */

export interface Band {
  min: number | null;
  max: number | null;
  currency: string;
  /** Base pay against the band midpoint, as a percentage (100 = midpoint). */
  compaRatio: number | null;
  position: "below" | "within" | "above" | "unknown";
}

export function bandOf(v: Vacancy, terms: Pick<OfferTerms, "baseSalary" | "currency">): Band {
  if (v.salaryMin === null || v.salaryMax === null || terms.currency !== v.currency) return { min: v.salaryMin, max: v.salaryMax, currency: v.currency, compaRatio: null, position: "unknown" };
  const mid = (v.salaryMin + v.salaryMax) / 2;
  return {
    min: v.salaryMin,
    max: v.salaryMax,
    currency: v.currency,
    compaRatio: Math.round((terms.baseSalary / mid) * 100),
    position: terms.baseSalary < v.salaryMin ? "below" : terms.baseSalary > v.salaryMax ? "above" : "within",
  };
}

export interface OfferView {
  offer: Offer;
  band: Band;
  stage: ApplicationStage | null;
  openings: number;
  vacancyStatus: Vacancy["status"];
  /** The approval step waiting on the signed-in user, if any. */
  myApprovalStep: number | null;
  expectedSalary: string | null;
  currentEmployer: string | null;
  availability: string | null;
}

function view(o: Offer): OfferView {
  const v = vacancyOf(o.vacancyId);
  const c = profileSnapshot().find((p) => p.id === o.candidateId);
  const app = c?.applications.find((a) => a.vacancyId === o.vacancyId);
  const pending = o.approvals.find((a) => a.status === "pending");
  return {
    offer: o,
    band: bandOf(v, o.terms),
    stage: app?.stage ?? null,
    openings: v.openings,
    vacancyStatus: v.status,
    myApprovalStep: o.status === "pending_approval" && pending?.approverName === me ? pending.step : null,
    expectedSalary: c?.expectedSalary ?? null,
    currentEmployer: c?.currentEmployer ?? null,
    availability: c?.availability ?? null,
  };
}

export interface OffersService {
  list(): Promise<OfferView[]>;
  get(id: string): Promise<{ view: OfferView; letter: ReturnType<typeof offerLetter>; vacancy: Vacancy }>;
  /** Sensible starting terms for a new offer, with the approval chain they would need. */
  defaults(candidateId: string, vacancyId: string): Promise<{ terms: OfferTerms; vacancy: Vacancy; candidateName: string; expectedSalary: string | null; existing: Offer | null }>;
  preview(vacancyId: string, candidateName: string, terms: OfferTerms): Promise<{ letter: ReturnType<typeof offerLetter>; approvals: Offer["approvals"]; band: Band }>;
  create(candidateId: string, vacancyId: string, terms: OfferTerms, submit: boolean): Promise<Offer>;
  update(id: string, terms: OfferTerms, submit: boolean): Promise<Offer>;
  approve(id: string, step: number, note: string): Promise<Offer>;
  reject(id: string, step: number, note: string): Promise<Offer>;
  send(id: string): Promise<Offer>;
  markViewed(id: string): Promise<Offer>;
  respond(id: string, response: Omit<CandidateResponse, "at">, moveDeclinedToWithdrawn: boolean): Promise<Offer>;
  withdraw(id: string, reason: string): Promise<Offer>;
  extend(id: string, days: number): Promise<Offer>;
  setChecklist(id: string, itemId: string, done: boolean): Promise<Offer>;
  hire(id: string): Promise<{ offer: Offer; others: { candidateId: string; name: string; stage: ApplicationStage }[]; filled: boolean }>;
  notifyOthers(vacancyId: string, candidateIds: string[], message: string): Promise<number>;
}

function validate(terms: OfferTerms) {
  if (!terms.jobTitle.trim()) throw new Error("Add the job title.");
  if (!(terms.baseSalary > 0)) throw new Error("Enter the basic salary.");
  if (!terms.startDate || new Date(`${terms.startDate}T12:00:00+02:00`).getTime() <= NOW) throw new Error("Choose a start date in the future.");
  if (terms.allowances.some((a) => !a.name.trim() || a.amount < 0)) throw new Error("Give each allowance a name and an amount, or remove it.");
  if (terms.validDays < 2 || terms.validDays > 21) throw new Error("Give the candidate between 2 and 21 days to respond.");
}

export const mockOffers: OffersService = {
  async list() {
    await wait(400);
    return clone([...store].sort((a, b) => (b.sentAt ?? b.createdAt).localeCompare(a.sentAt ?? a.createdAt)).map((o) => view(find(o.id))));
  },
  async get(id) {
    await wait(350);
    const o = find(id);
    return clone({ view: view(o), letter: offerLetter(o), vacancy: vacancyOf(o.vacancyId) });
  },
  async defaults(candidateId, vacancyId) {
    await wait(300);
    const v = vacancyOf(vacancyId);
    const c = profileSnapshot().find((p) => p.id === candidateId);
    if (!c) throw new Error("This candidate could not be found.");
    const existing = store.find((o) => o.candidateId === candidateId && o.vacancyId === vacancyId && (OPEN.includes(o.status) || o.status === "accepted")) ?? null;
    const expected = Number((c.expectedSalary ?? "").replace(/[^\d]/g, "")) || null;
    const mid = v.salaryMin !== null && v.salaryMax !== null ? Math.round((v.salaryMin + v.salaryMax) / 2 / 50) * 50 : 0;
    const base = expected && v.salaryMin !== null && v.salaryMax !== null ? Math.min(v.salaryMax, Math.max(v.salaryMin, expected)) : mid;
    const notice = c.availability.startsWith("3") ? 3 : c.availability.startsWith("1") ? 1 : 0;
    const hm = interviewers.find((i) => i.name === v.hiringManager);
    return clone({
      terms: {
        jobTitle: v.title,
        department: v.department,
        location: v.location,
        workMode: v.workMode,
        reportsTo: hm?.title ?? "Hiring manager",
        contractType: "Permanent",
        startDate: firstStart(notice),
        probationMonths: 3,
        noticePeriodMonths: v.title.includes("Manager") ? 3 : 1,
        currency: v.currency,
        baseSalary: base,
        payPeriod: "month",
        allowances: [{ name: "Transport allowance", amount: v.title.includes("Manager") ? 200 : 100 }],
        benefits: [...v.benefits],
        validDays: 7,
        personalNote: "",
      } satisfies OfferTerms,
      vacancy: v,
      candidateName: c.name,
      expectedSalary: c.expectedSalary,
      existing,
    });
  },
  async preview(vacancyId, candidateName, terms) {
    const v = vacancyOf(vacancyId);
    return clone({ letter: offerLetter({ candidateName, vacancyTitle: v.title, terms, expiresAt: null }), approvals: approvalChain(v, terms), band: bandOf(v, terms) });
  },
  async create(candidateId, vacancyId, terms, submit) {
    await wait(600);
    validate(terms);
    const v = vacancyOf(vacancyId);
    const c = profileSnapshot().find((p) => p.id === candidateId)!;
    const app = c.applications.find((a) => a.vacancyId === vacancyId);
    if (!app) throw new Error(`${c.name} hasn't applied for ${v.title}.`);
    if (store.some((o) => o.candidateId === candidateId && o.vacancyId === vacancyId && (OPEN.includes(o.status) || o.status === "accepted"))) throw new Error(`${c.name} already has an open offer for this vacancy. Revise that one instead.`);
    const o: Offer = {
      id: `off_new_${++seq}`,
      version: 1,
      candidateId,
      candidateName: c.name,
      applicationId: app.id,
      vacancyId,
      vacancyTitle: v.title,
      status: submit ? "pending_approval" : "draft",
      terms: clone(terms),
      approvals: approvalChain(v, terms),
      sentAt: null,
      viewedAt: null,
      expiresAt: null,
      response: null,
      checklist: checklistFor(v),
      hiredAt: null,
      previous: [],
      createdBy: me,
      createdAt: MOCK_NOW,
      history: [],
      isMock: true,
    };
    log(o, "Offer drafted");
    if (submit) log(o, "Submitted for approval");
    store.push(o);
    return clone(o);
  },
  async update(id, terms, submit) {
    await wait(500);
    validate(terms);
    const o = find(id);
    if (o.status === "countered") {
      o.previous.push({ version: o.version, baseSalary: o.terms.baseSalary, startDate: o.terms.startDate, status: o.status, at: MOCK_NOW });
      o.version++;
      o.response = null;
      o.sentAt = null;
      o.viewedAt = null;
      o.expiresAt = null;
      log(o, `Revised to version ${o.version}`);
    } else if (o.status !== "draft") throw new Error("Only drafts and countered offers can be changed.");
    o.terms = clone(terms);
    o.approvals = approvalChain(vacancyOf(o.vacancyId), terms);
    o.status = submit ? "pending_approval" : "draft";
    log(o, submit ? "Submitted for approval" : "Draft saved");
    return clone(o);
  },
  async approve(id, step, note) {
    await wait(400);
    const o = find(id);
    const a = o.approvals.find((x) => x.step === step);
    if (o.status !== "pending_approval" || a?.status !== "pending") throw new Error("This approval isn't waiting.");
    a.status = "approved";
    a.at = MOCK_NOW;
    if (note.trim()) a.note = note.trim();
    log(o, a.approverName === me ? "Approved" : `Approved by ${a.approverName}`, a.approverName === me ? me : `${me} for ${a.approverName}`);
    const next = o.approvals.find((x) => x.status === "waiting");
    if (next) next.status = "pending";
    else {
      o.status = "approved";
      log(o, "Fully approved. Ready to send.", "Vettly");
    }
    return clone(o);
  },
  async reject(id, step, note) {
    await wait(400);
    if (!note.trim()) throw new Error("Say what needs to change.");
    const o = find(id);
    const a = o.approvals.find((x) => x.step === step);
    if (o.status !== "pending_approval" || a?.status !== "pending") throw new Error("This approval isn't waiting.");
    a.status = "rejected";
    a.at = MOCK_NOW;
    a.note = note.trim();
    o.status = "draft";
    log(o, `Sent back by ${a.approverName}: ${note.trim()}`);
    return clone(o);
  },
  async send(id) {
    await wait(600);
    const o = find(id);
    if (o.status !== "approved") throw new Error("The offer needs every approval before it can be sent.");
    o.status = "sent";
    o.sentAt = MOCK_NOW;
    o.expiresAt = deadline(o.terms.validDays);
    log(o, `Sent to the candidate by email. Respond by ${o.expiresAt.slice(0, 10)}.`);
    const c = profileSnapshot().find((p) => p.id === o.candidateId);
    const app = c?.applications.find((a) => a.id === o.applicationId);
    if (app && app.stage !== "offer") {
      const r = await mockPipeline.move([{ candidateId: o.candidateId, applicationId: o.applicationId }], "offer", `Offer sent: ${o.terms.currency} ${o.terms.baseSalary} per ${o.terms.payPeriod}`);
      if (r.moved) log(o, "Candidate moved to Offer", "Vettly");
    }
    return clone(o);
  },
  async markViewed(id) {
    await wait(200);
    const o = find(id);
    if (o.status === "sent") {
      o.status = "viewed";
      o.viewedAt = MOCK_NOW;
      log(o, "Opened the offer", o.candidateName);
    }
    return clone(o);
  },
  async respond(id, response, moveDeclinedToWithdrawn) {
    await wait(500);
    const o = find(id);
    if (o.status !== "sent" && o.status !== "viewed") throw new Error("Record a response once the offer has been sent.");
    if (!response.note.trim()) throw new Error("Note what the candidate said, and how (email, call, signed letter).");
    if (response.outcome === "countered" && !response.requestedSalary && !response.requestedStartDate) throw new Error("Record what the candidate asked for: pay, start date or both.");
    o.response = { ...response, note: response.note.trim(), at: MOCK_NOW };
    o.status = response.outcome;
    log(o, `Response recorded: ${response.outcome}`);
    if (response.outcome === "declined" && moveDeclinedToWithdrawn) {
      const r = await mockPipeline.move([{ candidateId: o.candidateId, applicationId: o.applicationId }], "withdrawn", `Declined the offer${response.declineReason ? `: ${response.declineReason}` : ""}`);
      if (r.moved) log(o, "Candidate moved to Withdrawn", "Vettly");
    }
    return clone(o);
  },
  async withdraw(id, reason) {
    await wait(400);
    if (!reason.trim()) throw new Error("Give a reason. It's kept on the record and the candidate is told.");
    const o = find(id);
    if (!OPEN.includes(o.status)) throw new Error("This offer can't be withdrawn.");
    o.status = "withdrawn";
    o.withdrawnReason = reason.trim();
    log(o, `Withdrawn: ${reason.trim()}`);
    return clone(o);
  },
  async extend(id, days) {
    await wait(300);
    const o = find(id);
    if (!["sent", "viewed", "expired"].includes(o.status)) throw new Error("Only sent or expired offers can be extended.");
    o.expiresAt = deadline(days);
    if (o.status === "expired") o.status = o.viewedAt ? "viewed" : "sent";
    log(o, `Deadline extended to ${o.expiresAt.slice(0, 10)}`);
    return clone(o);
  },
  async setChecklist(id, itemId, isDone) {
    await wait(200);
    const o = find(id);
    const it = o.checklist.find((x) => x.id === itemId);
    if (!it) throw new Error("Unknown checklist item.");
    it.done = isDone;
    if (isDone) {
      it.doneBy = me;
      it.doneAt = MOCK_NOW;
    } else {
      delete it.doneBy;
      delete it.doneAt;
    }
    return clone(o);
  },
  async hire(id) {
    await wait(700);
    const o = find(id);
    if (o.status !== "accepted") throw new Error("Hire once the candidate has accepted.");
    if (o.hiredAt) throw new Error("Already marked as hired.");
    const missing = o.checklist.filter((i) => i.phase === "before_hire" && i.required && !i.done);
    if (missing.length) throw new Error(`Finish the pre-hire checks first: ${missing.map((m) => m.label.toLowerCase()).join("; ")}.`);
    const r = await mockPipeline.move([{ candidateId: o.candidateId, applicationId: o.applicationId }], "hired", `Accepted the offer. Starts ${o.terms.startDate}.`);
    if (!r.moved && r.skipped[0]) throw new Error(`Couldn't move to Hired: ${r.skipped[0].reason}.`);
    o.hiredAt = MOCK_NOW;
    o.hiredBy = me;
    log(o, "Marked as hired");
    const v = vacancyOf(o.vacancyId);
    const hires = store.filter((x) => x.vacancyId === o.vacancyId && x.hiredAt).length;
    const others = profileSnapshot()
      .flatMap((c) => c.applications.filter((a) => a.vacancyId === o.vacancyId && c.id !== o.candidateId && !["hired", "rejected", "withdrawn"].includes(a.stage)).map((a) => ({ candidateId: c.id, name: c.name, stage: a.stage })));
    return clone({ offer: o, others, filled: hires >= v.openings });
  },
  async notifyOthers(vacancyId, candidateIds, message) {
    await wait(600);
    if (!message.trim()) throw new Error("Write the message candidates will receive.");
    let n = 0;
    for (const cid of candidateIds) {
      const app = profileSnapshot().find((p) => p.id === cid)?.applications.find((a) => a.vacancyId === vacancyId);
      if (!app) continue;
      const r = await mockPipeline.move([{ candidateId: cid, applicationId: app.id }], "rejected", "Position filled. Candidate notified with the standard message.");
      n += r.moved;
    }
    return n;
  },
};
