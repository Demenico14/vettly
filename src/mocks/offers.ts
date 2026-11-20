/**
 * MOCK DATA — offers for Msasa Financial Group (Module 11), plus the rules that build approval chains,
 * hiring checklists and offer letters. Seeds match the dashboard: Tinashe's offer is out with him, and
 * Farai accepted the HR Officer offer on 15 Nov (start date 5 Jan 2027).
 */
import type { Vacancy } from "@/types";
import type { Approval, ChecklistItem, Offer, OfferTerms } from "@/types/offers";

/** Above this share of the band maximum, the CFO must approve. */
export const CFO_THRESHOLD = 1;

export function approvalChain(vacancy: Pick<Vacancy, "hiringManager" | "salaryMax" | "currency" | "title">, terms: Pick<OfferTerms, "baseSalary" | "allowances" | "currency">): Approval[] {
  const chain: Approval[] = [
    { step: 1, approverName: vacancy.hiringManager, role: "Hiring manager", reason: `Owns the ${vacancy.title} vacancy`, status: "waiting" },
    { step: 2, approverName: "Tendai Moyo", role: "HR Manager", reason: "Checks terms against policy and the salary band", status: "waiting" },
  ];
  if (vacancy.hiringManager === "Tendai Moyo") chain.splice(0, 1, { step: 1, approverName: "Kudzai Chirwa", role: "Talent Acquisition", reason: "Second check: the hiring manager is also the HR approver", status: "waiting" });
  const max = vacancy.salaryMax ?? Infinity;
  if (terms.currency === vacancy.currency && terms.baseSalary > max * CFO_THRESHOLD) {
    chain.push({ step: 3, approverName: "Ruth Chinamasa", role: "Chief Financial Officer", reason: `Base pay is above the band maximum (${vacancy.currency} ${max.toLocaleString("en-ZA").replace(/ /g, " ")})`, status: "waiting" });
  }
  chain[0]!.status = "pending";
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
export function offerLetter(o: Pick<Offer, "candidateName" | "vacancyTitle" | "terms" | "expiresAt">, organisation = "Msasa Financial Group") {
  const t = o.terms;
  const money = (n: number) => `${t.currency} ${n.toLocaleString("en-ZA").replace(/ /g, " ")}`;
  const first = o.candidateName.split(" ")[0];
  const start = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${t.startDate}T12:00:00+02:00`));
  const allowances = t.allowances.filter((a) => a.amount > 0);
  const total = t.baseSalary + allowances.reduce((s, a) => s + a.amount, 0);
  const respond = o.expiresAt ? new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date(o.expiresAt)) : `within ${t.validDays} days of receiving this letter`;
  return [
    { heading: null, body: `Dear ${first},` },
    { heading: null, body: `Following your interviews, we are delighted to offer you the position of ${t.jobTitle} in our ${t.department} team, reporting to the ${t.reportsTo}.` },
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
    { heading: null, body: `We look forward to welcoming you to ${organisation}.\n\nTendai Moyo\nHR Manager` },
  ];
}

const done = (c: ChecklistItem[], ids: string[], by: string, at: string) => c.map((i) => (ids.includes(i.id) ? { ...i, done: true, doneBy: by, doneAt: at } : i));

const swdevBenefits = ["Medical aid for you and your dependants", "Pension fund with employer contribution", "Annual performance bonus", "Laptop and monthly data allowance"];
const hrBenefits = ["Medical aid for you and your dependants", "Pension fund with employer contribution", "Annual performance bonus", "Funded professional development and exam leave"];

export const offerRecords: Offer[] = [
  {
    id: "off_tinashe",
    version: 1,
    candidateId: "cnd_tinashe",
    candidateName: "Tinashe Mhlanga",
    applicationId: "cnd_tinashe_app_0",
    vacancyId: "vac_swdev",
    vacancyTitle: "Software Developer",
    status: "viewed",
    terms: {
      jobTitle: "Software Developer",
      department: "Information Technology",
      location: "Harare",
      workMode: "Hybrid",
      reportsTo: "Head of Engineering",
      contractType: "Permanent",
      startDate: "2027-01-04",
      probationMonths: 3,
      noticePeriodMonths: 1,
      currency: "USD",
      baseSalary: 2400,
      payPeriod: "month",
      allowances: [
        { name: "Transport allowance", amount: 100 },
        { name: "Data allowance", amount: 40 },
      ],
      benefits: swdevBenefits,
      validDays: 7,
      personalNote: "The whole panel enjoyed your design discussion. We think you'll grow quickly here.",
    },
    approvals: [
      { step: 1, approverName: "Tatenda Mutasa", role: "Hiring manager", reason: "Owns the Software Developer vacancy", status: "approved", at: "2026-11-13T10:05:00+02:00" },
      { step: 2, approverName: "Tendai Moyo", role: "HR Manager", reason: "Checks terms against policy and the salary band", status: "approved", at: "2026-11-13T15:40:00+02:00", note: "Within band; matches his expectation." },
    ],
    sentAt: "2026-11-14T11:30:00+02:00",
    viewedAt: "2026-11-15T08:10:00+02:00",
    expiresAt: "2026-11-21T17:00:00+02:00",
    response: null,
    checklist: checklistFor({ department: "Information Technology", title: "Software Developer" }),
    hiredAt: null,
    previous: [],
    createdBy: "Tendai Moyo",
    createdAt: "2026-11-12T16:00:00+02:00",
    history: [
      { at: "2026-11-12T16:00:00+02:00", by: "Tendai Moyo", text: "Offer drafted" },
      { at: "2026-11-12T16:05:00+02:00", by: "Tendai Moyo", text: "Submitted for approval" },
      { at: "2026-11-13T10:05:00+02:00", by: "Tatenda Mutasa", text: "Approved" },
      { at: "2026-11-13T15:40:00+02:00", by: "Tendai Moyo", text: "Approved" },
      { at: "2026-11-14T11:30:00+02:00", by: "Tendai Moyo", text: "Sent to the candidate by email" },
      { at: "2026-11-15T08:10:00+02:00", by: "Tinashe Mhlanga", text: "Opened the offer" },
    ],
    isMock: true,
  },
  {
    id: "off_farai",
    version: 1,
    candidateId: "cnd_farai",
    candidateName: "Farai Mutasa",
    applicationId: "cnd_farai_app_0",
    vacancyId: "vac_hro",
    vacancyTitle: "Human Resources Officer",
    status: "accepted",
    terms: {
      jobTitle: "Human Resources Officer",
      department: "Human Resources",
      location: "Harare",
      workMode: "On-site",
      reportsTo: "HR Manager",
      contractType: "Permanent",
      startDate: "2027-01-05",
      probationMonths: 3,
      noticePeriodMonths: 1,
      currency: "USD",
      baseSalary: 1450,
      payPeriod: "month",
      allowances: [{ name: "Transport allowance", amount: 80 }],
      benefits: hrBenefits,
      validDays: 7,
      personalNote: "",
    },
    approvals: [
      { step: 1, approverName: "Kudzai Chirwa", role: "Talent Acquisition", reason: "Second check: the hiring manager is also the HR approver", status: "approved", at: "2026-10-30T09:20:00+02:00" },
      { step: 2, approverName: "Tendai Moyo", role: "HR Manager", reason: "Checks terms against policy and the salary band", status: "approved", at: "2026-10-30T11:00:00+02:00" },
    ],
    sentAt: "2026-11-09T09:00:00+02:00",
    viewedAt: "2026-11-09T12:40:00+02:00",
    expiresAt: "2026-11-16T17:00:00+02:00",
    response: { outcome: "accepted", at: "2026-11-15T13:40:00+02:00", note: "Accepted by email; signed letter attached. Can start on 5 January after the holiday." },
    checklist: done(checklistFor({ department: "Human Resources", title: "Human Resources Officer" }), ["signed", "refs", "id", "quals", "bank"], "Kudzai Chirwa", "2026-11-15T13:55:00+02:00"),
    hiredAt: "2026-11-15T14:02:00+02:00",
    hiredBy: "Tendai Moyo",
    previous: [],
    createdBy: "Tendai Moyo",
    createdAt: "2026-10-29T15:00:00+02:00",
    history: [
      { at: "2026-10-29T15:00:00+02:00", by: "Tendai Moyo", text: "Offer drafted" },
      { at: "2026-10-30T11:00:00+02:00", by: "Tendai Moyo", text: "Approved" },
      { at: "2026-11-09T09:00:00+02:00", by: "Tendai Moyo", text: "Sent to the candidate by email, after references came back" },
      { at: "2026-11-15T13:40:00+02:00", by: "Tendai Moyo", text: "Response recorded: accepted" },
      { at: "2026-11-15T14:02:00+02:00", by: "Tendai Moyo", text: "Marked as hired. Vacancy filled." },
    ],
    isMock: true,
  },
];
