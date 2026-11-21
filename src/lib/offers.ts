/**
 * Offer rules: approval chains, hiring checklists and offer letters.
 */
import type { Vacancy } from "@/types";
import type { Approval, ChecklistItem, Offer, OfferTerms } from "@/types/offers";

/** Above this share of the band maximum, the finance approver must approve. */
export const CFO_THRESHOLD = 1;

const money = (currency: string, n: number) => `${currency} ${n.toLocaleString("en-GB")}`;

/** Who approves offers in this organisation, worked out from its members and settings. */
export interface Approvers {
  /** HR approver: an HR manager, or else an organisation admin. */
  hr: string | null;
  /** A second HR person, used when the hiring manager is also the HR approver. */
  hrSecond: string | null;
  /** Finance approver for pay above the band. */
  finance: { name: string; title: string } | null;
  hrApprovesAll: boolean;
  financeAboveBand: boolean;
}

export function approvalChain(vacancy: Pick<Vacancy, "hiringManager" | "salaryMax" | "currency" | "title">, terms: Pick<OfferTerms, "baseSalary" | "allowances" | "currency">, who: Approvers): Approval[] {
  const chain: Approval[] = [];
  const hm = vacancy.hiringManager?.trim();
  if (hm && !(who.hrApprovesAll && who.hr === hm)) chain.push({ step: 0, approverName: hm, role: "Hiring manager", reason: `Owns the ${vacancy.title} vacancy`, status: "waiting" });
  if (who.hrApprovesAll && who.hr) {
    if (hm === who.hr && who.hrSecond) chain.push({ step: 0, approverName: who.hrSecond, role: "HR", reason: "Second check: the hiring manager is also the HR approver", status: "waiting" });
    chain.push({ step: 0, approverName: who.hr, role: "HR", reason: "Checks terms against policy and the salary band", status: "waiting" });
  }
  const max = vacancy.salaryMax ?? Infinity;
  if (who.financeAboveBand && who.finance && terms.currency === vacancy.currency && terms.baseSalary > max * CFO_THRESHOLD) {
    chain.push({ step: 0, approverName: who.finance.name, role: who.finance.title || "Finance", reason: `Base pay is above the band maximum (${money(vacancy.currency, max)})`, status: "waiting" });
  }
  chain.forEach((a, i) => (a.step = i + 1));
  if (chain[0]) chain[0].status = "pending";
  return chain;
}

const item = (id: string, label: string, phase: ChecklistItem["phase"], required = true): ChecklistItem => ({ id, label, phase, required, done: false });

export function checklistFor(vacancy: Pick<Vacancy, "department" | "title">): ChecklistItem[] {
  const list: ChecklistItem[] = [
    item("signed", "Signed offer letter received", "before_hire"),
    item("refs", "Two references checked", "before_hire"),
    item("id", "ID and right to work verified", "before_hire"),
    item("quals", "Qualifications verified with the institution", "before_hire"),
    item("bank", "Bank and tax details captured for payroll", "before_start"),
    item("it", "Laptop, email and system access requested", "before_start"),
    item("buddy", "Onboarding buddy assigned", "before_start", false),
    item("welcome", "Welcome pack and first-week plan sent", "before_start", false),
  ];
  if (vacancy.department === "Finance") list.splice(4, 0, item("credit", "Credit and criminal record check (finance roles)", "before_hire"), item("prof", "Professional body membership confirmed (ICAZ / ACCA / CIMA)", "before_hire", false));
  if (vacancy.department === "Information Technology") list.splice(4, 0, item("access", "Production access approved by the security officer", "before_start"));
  return list;
}

/** Paragraphs of the offer letter. Kept plain, so the same text works on screen, in email and as a PDF. */
export function offerLetter(o: Pick<Offer, "candidateName" | "vacancyTitle" | "terms" | "expiresAt">, organisation = "our organisation", signer: { name: string; title: string } = { name: "", title: "" }) {
  const t = o.terms;
  const money = (n: number) => `${t.currency} ${n.toLocaleString("en-ZA").replace(/ /g, " ")}`;
  const first = o.candidateName.split(" ")[0];
  const start = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${t.startDate}T12:00:00+02:00`));
  const allowances = t.allowances.filter((a) => a.amount > 0);
  const total = t.baseSalary + allowances.reduce((s, a) => s + a.amount, 0);
  // Until the offer is sent, the date it would be if sent today; once sent, the real deadline.
  const respond = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date(o.expiresAt ?? Date.now() + t.validDays * 86_400_000));
  return [
    { heading: null, body: `Dear ${first},` },
    { heading: null, body: `Following your interviews, we are delighted to offer you the position of ${t.jobTitle} in our ${t.department} team${t.reportsTo.trim() ? `, reporting to the ${t.reportsTo.trim()}` : ""}.` },
    {
      heading: "Your package",
      body: [
        `Basic salary: ${money(t.baseSalary)} per ${t.payPeriod}, before tax.`,
        ...allowances.map((a) => `${a.name}: ${money(a.amount)} per ${t.payPeriod}.`),
        allowances.length ? `Total guaranteed pay: ${money(total)} per ${t.payPeriod}.` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    },
    { heading: "Benefits", body: t.benefits.length ? t.benefits.map((b) => `• ${b}`).join("\n") : "As set out in the staff handbook." },
    {
      heading: "Terms",
      body: [
        `Contract: ${t.contractType}, ${t.workMode.toLowerCase()} in ${t.location}.`,
        `Start date: ${start}.`,
        `Probation: ${t.probationMonths} months.`,
        `Notice period after probation: ${t.noticePeriodMonths} ${t.noticePeriodMonths === 1 ? "month" : "months"}.`,
      ].join("\n"),
    },
    { heading: "Conditions", body: "This offer depends on satisfactory references, verification of your identity and qualifications, and any role-specific checks we have discussed with you." },
    ...(t.personalNote.trim() ? [{ heading: null, body: t.personalNote.trim() }] : []),
    { heading: null, body: `Please let us know your decision by ${respond}. If you have questions about any part of this offer, reply to this letter or call us.` },
    { heading: null, body: `We look forward to welcoming you to ${organisation}.${signer.name ? `\n\n${signer.name}${signer.title ? `\n${signer.title}` : ""}` : ""}` },
  ];
}

