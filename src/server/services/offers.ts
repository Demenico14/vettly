import "server-only";
import { orgEmail } from "../org-mail";
/**
 * Offers service. Offers are stored per organisation (see store.ts) and move through
 * approval (hiring manager, HR, and the CFO above the salary band), are sent with a deadline, and record the
 * candidate's response. Sending moves the application to Offer; hiring needs the pre-hire checks and moves it
 * to Hired. Every step is written to the offer's history.
 */
import type { ApplicationStage, Vacancy } from "@/types";
import type { CandidateResponse, Offer, OfferTerms } from "@/types/offers";
import { approvalChain, checklistFor, offerLetter, type Approvers } from "@/lib/offers";
import { fillLetter, letterText, mergeValues, unknownFields } from "@/lib/letter";
import { letterheadOf, type Letterhead } from "@/lib/letterhead";
import { cleanLetter, wordToLetter } from "../letter-html";
import { letterPdf, standardLetterHtml } from "../letter-pdf";
import { logoImage } from "../branding";
import { fileFor } from "../files";
import { actor, actorName, newId, now, orgId } from "../context";
import { collection } from "../store";
import { profileSnapshot } from "./candidates";
import { vacancyService, vacancySnapshot } from "./vacancies";
import { STATUS_MOVES } from "@/lib/workflow";
import { pipelineService } from "./pipeline";
import { activeMembers, orgSettings } from "./settings";

/** A plain copy, so callers never hold the stored objects (store arrays are proxies, which structuredClone refuses). */
const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const me = () => actorName();
const nowMs = () => Date.now();
const store = collection<Offer>("offer");
/** The organisation's offers, for the dashboard. */
export const offerStore = store;

/** Who approves offers here: worked out from the organisation's members and its recruitment settings. */
async function approvers(): Promise<Approvers> {
  const members = (await activeMembers()).sort((a, b) => a.name.localeCompare(b.name));
  const s = orgSettings().recruitment;
  const hrPeople = [...members.filter((m) => m.role === "hr_manager"), ...members.filter((m) => m.role === "org_admin"), ...members.filter((m) => m.role === "recruiter")];
  const hr = hrPeople[0]?.name ?? null;
  const finance = members.find((m) => /chief financial|\bcfo\b|finance director|financial controller/i.test(m.title));
  return { hr, hrSecond: hrPeople.find((m) => m.name !== hr)?.name ?? null, finance: finance ? { name: finance.name, title: finance.title } : null, hrApprovesAll: s.hrApprovesAll, financeAboveBand: s.cfoAboveBand };
}

function letterFor(o: Pick<Offer, "candidateName" | "vacancyTitle" | "terms" | "expiresAt">) {
  const p = orgSettings().profile;
  const a = actor();
  return offerLetter(o, p.tradingName || p.legalName, { name: a?.name ?? "", title: a?.title ?? "" });
}

/** HR's own letter with its merge fields filled in, or null when the offer uses the standard letter. */
function customLetterFor(o: Pick<Offer, "candidateName" | "terms" | "expiresAt">) {
  if (!o.terms.letterHtml) return null;
  const p = orgSettings().profile;
  const a = actor();
  return fillLetter(o.terms.letterHtml, mergeValues(o, p.tradingName || p.legalName, { name: a?.name ?? "", title: a?.title ?? "" }));
}

/**
 * Everything needed to print an offer's letter as PDF: the letter (HR's own or the standard one) as HTML, and the
 * letterhead. Runs in the organisation's context; the logo bytes are read separately.
 */
export function letterDocument(id: string) {
  const o = find(id);
  const html = customLetterFor(o) ?? standardLetterHtml(letterFor(o));
  return { title: `Offer letter: ${o.candidateName}, ${o.terms.jobTitle}`, fileName: `Offer letter - ${o.candidateName}.pdf`, html, head: letterheadOf(orgId(), orgSettings()) };
}

/** The letter as PDF bytes, with the organisation's logo when it has one. */
export async function letterPdfFor(doc: ReturnType<typeof letterDocument>) {
  return letterPdf({ title: doc.title, html: doc.html, head: doc.head, logo: await logoImage(doc.head) });
}

const OPEN: Offer["status"][] = ["draft", "pending_approval", "approved", "sent", "viewed", "countered"];

function vacancyOf(id: string) {
  const v = vacancySnapshot().find((x) => x.id === id);
  if (!v) throw new Error("This vacancy could not be found.");
  return v;
}

function find(id: string) {
  const o = store.find((x) => x.id === id);
  if (!o) throw new Error("This offer could not be found.");
  if ((o.status === "sent" || o.status === "viewed") && o.expiresAt && new Date(o.expiresAt).getTime() < nowMs()) {
    o.status = "expired";
    o.history.push({ at: o.expiresAt, by: "Vettly", text: "Expired without a response" });
  }
  return o;
}
const log = (o: Offer, text: string, by = me()) => o.history.push({ at: now(), by, text });

const deadline = (days: number) => {
  const d = new Date(nowMs() + days * 86400000);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
};

/** First working day on or after the candidate's notice period ends. */
function firstStart(noticeMonths: number) {
  const d = new Date(nowMs());
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
    myApprovalStep: o.status === "pending_approval" && pending?.approverName === me() ? pending.step : null,
    expectedSalary: c?.expectedSalary ?? null,
    currentEmployer: c?.currentEmployer ?? null,
    availability: c?.availability ?? null,
  };
}

export interface OffersService {
  list(): Promise<OfferView[]>;
  /** `letterHtml` is HR's own letter, filled in, when the offer uses one; otherwise `letter` is the standard letter. */
  get(id: string): Promise<{ view: OfferView; letter: ReturnType<typeof offerLetter>; letterHtml: string | null; letterhead: Letterhead; vacancy: Vacancy }>;
  /** Sensible starting terms for a new offer, with the approval chain they would need. */
  defaults(candidateId: string, vacancyId: string): Promise<{ terms: OfferTerms; vacancy: Vacancy; candidateName: string; expectedSalary: string | null; existing: Offer | null }>;
  preview(vacancyId: string, candidateName: string, terms: OfferTerms): Promise<{ letter: ReturnType<typeof offerLetter>; letterHtml: string | null; letterhead: Letterhead; approvals: Offer["approvals"]; band: Band }>;
  /** Turns an uploaded Word document (from POST /api/files) into an editable letter. */
  importLetter(fileId: string): Promise<{ html: string; name: string }>;
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

/** Cleans a custom letter and checks its merge fields. Never trusts HTML from the browser. */
function prepareLetter(terms: OfferTerms): OfferTerms {
  if (!terms.letterHtml?.trim()) return { ...terms, letterHtml: null, letterSource: null };
  const html = cleanLetter(terms.letterHtml);
  if (!html.replace(/<[^>]+>/g, "").trim()) throw new Error("The letter is empty. Write it, or switch back to the standard letter.");
  const unknown = unknownFields(html);
  if (unknown.length) throw new Error(`The letter uses ${unknown.map((k) => `{{${k}}}`).join(", ")}, which Vettly doesn't recognise. Insert fields from the list instead.`);
  return { ...terms, letterHtml: html, letterSource: terms.letterSource?.slice(0, 200) ?? null };
}

function validate(terms: OfferTerms) {
  if (!terms.jobTitle.trim()) throw new Error("Add the job title.");
  if (!(terms.baseSalary > 0)) throw new Error("Enter the basic salary.");
  if (!terms.startDate || new Date(`${terms.startDate}T12:00:00+02:00`).getTime() <= nowMs()) throw new Error("Choose a start date in the future.");
  if (terms.allowances.some((a) => !a.name.trim() || a.amount < 0)) throw new Error("Give each allowance a name and an amount, or remove it.");
  if (terms.validDays < 2 || terms.validDays > 21) throw new Error("Give the candidate between 2 and 21 days to respond.");
}

export const offersService: OffersService = {
  async list() {
    return clone([...store].sort((a, b) => (b.sentAt ?? b.createdAt).localeCompare(a.sentAt ?? a.createdAt)).map((o) => view(find(o.id))));
  },
  async get(id) {
    const o = find(id);
    return clone({ view: view(o), letter: letterFor(o), letterHtml: customLetterFor(o), letterhead: letterheadOf(orgId(), orgSettings()), vacancy: vacancyOf(o.vacancyId) });
  },
  async defaults(candidateId, vacancyId) {
    const v = vacancyOf(vacancyId);
    const c = profileSnapshot().find((p) => p.id === candidateId);
    if (!c) throw new Error("This candidate could not be found.");
    const existing = store.find((o) => o.candidateId === candidateId && o.vacancyId === vacancyId && (OPEN.includes(o.status) || o.status === "accepted")) ?? null;
    const expected = Number((c.expectedSalary ?? "").replace(/[^\d]/g, "")) || null;
    const mid = v.salaryMin !== null && v.salaryMax !== null ? Math.round((v.salaryMin + v.salaryMax) / 2 / 50) * 50 : 0;
    const base = expected && v.salaryMin !== null && v.salaryMax !== null ? Math.min(v.salaryMax, Math.max(v.salaryMin, expected)) : mid;
    const notice = c.availability.startsWith("3") ? 3 : c.availability.startsWith("1") ? 1 : 0;
    const hm = (await activeMembers()).find((m) => m.name === v.hiringManager);
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
        allowances: [],
        benefits: [...v.benefits],
        validDays: orgSettings().recruitment.offerValidityDays,
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
    const draft = { candidateName, vacancyTitle: v.title, terms: { ...terms, letterHtml: terms.letterHtml ? cleanLetter(terms.letterHtml) : null }, expiresAt: null };
    return clone({ letter: letterFor(draft), letterHtml: customLetterFor(draft), letterhead: letterheadOf(orgId(), orgSettings()), approvals: approvalChain(v, terms, await approvers()), band: bandOf(v, terms) });
  },
  async importLetter(fileId) {
    const file = await fileFor(orgId(), fileId);
    if (!file) throw new Error("That document didn't finish uploading. Try again.");
    return { html: await wordToLetter(file), name: file.name };
  },
  async create(candidateId, vacancyId, input, submit) {
    validate(input);
    const terms = prepareLetter(input);
    const v = vacancyOf(vacancyId);
    const c = profileSnapshot().find((p) => p.id === candidateId)!;
    const app = c.applications.find((a) => a.vacancyId === vacancyId);
    if (!app) throw new Error(`${c.name} hasn't applied for ${v.title}.`);
    if (store.some((o) => o.candidateId === candidateId && o.vacancyId === vacancyId && (OPEN.includes(o.status) || o.status === "accepted"))) throw new Error(`${c.name} already has an open offer for this vacancy. Revise that one instead.`);
    const o: Offer = {
      id: newId("off"),
      version: 1,
      candidateId,
      candidateName: c.name,
      applicationId: app.id,
      vacancyId,
      vacancyTitle: v.title,
      status: submit ? "pending_approval" : "draft",
      terms: clone(terms),
      approvals: approvalChain(v, terms, await approvers()),
      sentAt: null,
      viewedAt: null,
      expiresAt: null,
      response: null,
      checklist: checklistFor(v),
      hiredAt: null,
      previous: [],
      createdBy: me(),
      createdAt: now(),
      history: [],
      isMock: true,
    };
    log(o, "Offer drafted");
    if (submit) log(o, "Submitted for approval");
    store.push(o);
    return clone(o);
  },
  async update(id, input, submit) {
    validate(input);
    const terms = prepareLetter(input);
    const o = find(id);
    if (o.status === "countered") {
      o.previous.push({ version: o.version, baseSalary: o.terms.baseSalary, startDate: o.terms.startDate, status: o.status, at: now() });
      o.version++;
      o.response = null;
      o.sentAt = null;
      o.viewedAt = null;
      o.expiresAt = null;
      log(o, `Revised to version ${o.version}`);
    } else if (o.status !== "draft") throw new Error("Only drafts and countered offers can be changed.");
    o.terms = clone(terms);
    o.approvals = approvalChain(vacancyOf(o.vacancyId), terms, await approvers());
    o.status = submit ? "pending_approval" : "draft";
    log(o, submit ? "Submitted for approval" : "Draft saved");
    return clone(o);
  },
  async approve(id, step, note) {
    const o = find(id);
    const a = o.approvals.find((x) => x.step === step);
    if (o.status !== "pending_approval" || a?.status !== "pending") throw new Error("This approval isn't waiting.");
    a.status = "approved";
    a.at = now();
    if (note.trim()) a.note = note.trim();
    log(o, a.approverName === me() ? "Approved" : `Approved by ${a.approverName}`, a.approverName === me() ? me() : `${me()} for ${a.approverName}`);
    const next = o.approvals.find((x) => x.status === "waiting");
    if (next) next.status = "pending";
    else {
      o.status = "approved";
      log(o, "Fully approved. Ready to send.", "Vettly");
    }
    return clone(o);
  },
  async reject(id, step, note) {
    if (!note.trim()) throw new Error("Say what needs to change.");
    const o = find(id);
    const a = o.approvals.find((x) => x.step === step);
    if (o.status !== "pending_approval" || a?.status !== "pending") throw new Error("This approval isn't waiting.");
    a.status = "rejected";
    a.at = now();
    a.note = note.trim();
    o.status = "draft";
    log(o, `Sent back by ${a.approverName}: ${note.trim()}`);
    return clone(o);
  },
  async send(id) {
    const o = find(id);
    if (o.status !== "approved") throw new Error("The offer needs every approval before it can be sent.");
    o.status = "sent";
    o.sentAt = now();
    // The deadline first, so the letter can name the date.
    o.expiresAt = deadline(o.terms.validDays);
    const cand = profileSnapshot().find((p) => p.id === o.candidateId);
    if (cand?.email) {
      // The letter in the email body, on the letterhead, with the same letter attached as a PDF.
      const doc = letterDocument(o.id);
      const intro = `Your offer letter for the ${o.terms.jobTitle} role is below and attached as a PDF to keep.`;
      orgEmail(async () => ({
        to: cand.email,
        subject: `Your offer: ${o.terms.jobTitle}`,
        text: `${intro}\n\n${letterText(doc.html)}`,
        html: `<p style="margin:0 0 18px;color:#6b6f68;font-size:13px">${intro}</p>${doc.html}`,
        attachments: [{ filename: doc.fileName, content: await letterPdfFor(doc), contentType: "application/pdf" }],
      }));
    }
    log(o, `Sent to the candidate by email. Respond by ${o.expiresAt.slice(0, 10)}.`);
    const c = profileSnapshot().find((p) => p.id === o.candidateId);
    const app = c?.applications.find((a) => a.id === o.applicationId);
    if (app && app.stage !== "offer") {
      const r = await pipelineService.move([{ candidateId: o.candidateId, applicationId: o.applicationId }], "offer", `Offer sent: ${o.terms.currency} ${o.terms.baseSalary} per ${o.terms.payPeriod}`);
      if (r.moved) log(o, "Candidate moved to Offer", "Vettly");
    }
    return clone(o);
  },
  async markViewed(id) {
    const o = find(id);
    if (o.status === "sent") {
      o.status = "viewed";
      o.viewedAt = now();
      // Offers go by email, so Vettly can't see them opened; HR records it when the candidate confirms.
      log(o, `Recorded that ${o.candidateName} has read the offer`);
    }
    return clone(o);
  },
  async respond(id, response, moveDeclinedToWithdrawn) {
    const o = find(id);
    if (o.status !== "sent" && o.status !== "viewed") throw new Error("Record a response once the offer has been sent.");
    if (!response.note.trim()) throw new Error("Note what the candidate said, and how (email, call, signed letter).");
    if (response.outcome === "countered" && !response.requestedSalary && !response.requestedStartDate) throw new Error("Record what the candidate asked for: pay, start date or both.");
    o.response = { ...response, note: response.note.trim(), at: now() };
    o.status = response.outcome;
    log(o, `Response recorded: ${response.outcome}`);
    if (response.outcome === "declined" && moveDeclinedToWithdrawn) {
      const r = await pipelineService.move([{ candidateId: o.candidateId, applicationId: o.applicationId }], "withdrawn", `Declined the offer${response.declineReason ? `: ${response.declineReason}` : ""}`);
      if (r.moved) log(o, "Candidate moved to Withdrawn", "Vettly");
    }
    return clone(o);
  },
  async withdraw(id, reason) {
    if (!reason.trim()) throw new Error("Give a reason. It's kept on the record and the candidate is told.");
    const o = find(id);
    if (!OPEN.includes(o.status)) throw new Error("This offer can't be withdrawn.");
    o.status = "withdrawn";
    o.withdrawnReason = reason.trim();
    log(o, `Withdrawn: ${reason.trim()}`);
    return clone(o);
  },
  async extend(id, days) {
    const o = find(id);
    if (!["sent", "viewed", "expired"].includes(o.status)) throw new Error("Only sent or expired offers can be extended.");
    o.expiresAt = deadline(days);
    if (o.status === "expired") o.status = o.viewedAt ? "viewed" : "sent";
    log(o, `Deadline extended to ${o.expiresAt.slice(0, 10)}`);
    return clone(o);
  },
  async setChecklist(id, itemId, isDone) {
    const o = find(id);
    const it = o.checklist.find((x) => x.id === itemId);
    if (!it) throw new Error("Unknown checklist item.");
    it.done = isDone;
    if (isDone) {
      it.doneBy = me();
      it.doneAt = now();
    } else {
      delete it.doneBy;
      delete it.doneAt;
    }
    return clone(o);
  },
  async hire(id) {
    const o = find(id);
    if (o.status !== "accepted") throw new Error("Hire once the candidate has accepted.");
    if (o.hiredAt) throw new Error("Already marked as hired.");
    const missing = o.checklist.filter((i) => i.phase === "before_hire" && i.required && !i.done);
    if (missing.length) throw new Error(`Finish the pre-hire checks first: ${missing.map((m) => m.label.toLowerCase()).join("; ")}.`);
    const r = await pipelineService.move([{ candidateId: o.candidateId, applicationId: o.applicationId }], "hired", `Accepted the offer. Starts ${o.terms.startDate}.`);
    if (!r.moved && r.skipped[0]) throw new Error(`Couldn't move to Hired: ${r.skipped[0].reason}.`);
    o.hiredAt = now();
    o.hiredBy = me();
    log(o, "Marked as hired");
    const v = vacancyOf(o.vacancyId);
    const hires = store.filter((x) => x.vacancyId === o.vacancyId && x.hiredAt).length;
    const others = profileSnapshot()
      .flatMap((c) => c.applications.filter((a) => a.vacancyId === o.vacancyId && c.id !== o.candidateId && !["hired", "rejected", "withdrawn"].includes(a.stage)).map((a) => ({ candidateId: c.id, name: c.name, stage: a.stage })));
    const filled = hires >= v.openings;
    // Every opening is filled: close the vacancy so it stops taking applications.
    if (filled && v.status !== "filled") {
      const reason = `${o.candidateName} accepted the offer.`;
      if (STATUS_MOVES[v.status].includes("closed")) await vacancyService.setStatus(v.id, "closed", reason);
      await vacancyService.setStatus(v.id, "filled", reason);
    }
    return clone({ offer: o, others, filled });
  },
  async notifyOthers(vacancyId, candidateIds, message) {
    if (!message.trim()) throw new Error("Write the message candidates will receive.");
    let n = 0;
    for (const cid of candidateIds) {
      const app = profileSnapshot().find((p) => p.id === cid)?.applications.find((a) => a.vacancyId === vacancyId);
      if (!app) continue;
      const r = await pipelineService.move([{ candidateId: cid, applicationId: app.id }], "rejected", "Position filled. Candidate notified with the standard message.");
      n += r.moved;
      const email = profileSnapshot().find((p) => p.id === cid)?.email;
      if (r.moved && email) orgEmail({ to: email, subject: `Your application: ${app.vacancyTitle}`, text: message.trim() });
    }
    return n;
  },
};
