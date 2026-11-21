/**
 * Custom offer letters: HR's own wording (uploaded from Word or written in Vettly's editor) with merge fields
 * such as {{first_name}} that are filled in from the offer's terms. The HTML is limited to a small set of tags
 * (see src/server/letter-html.ts, which cleans it on the server); everything here is plain string work, so it
 * runs in the browser for previews and on the server for sending.
 */
import type { Offer } from "@/types/offers";

export const MERGE_FIELDS = [
  { key: "first_name", label: "First name" },
  { key: "candidate_name", label: "Candidate's full name" },
  { key: "job_title", label: "Job title" },
  { key: "department", label: "Department" },
  { key: "reports_to", label: "Reports to" },
  { key: "location", label: "Location" },
  { key: "start_date", label: "Start date" },
  { key: "basic_salary", label: "Basic salary" },
  { key: "total_pay", label: "Total guaranteed pay" },
  { key: "pay_period", label: "Pay period" },
  { key: "contract_type", label: "Contract type" },
  { key: "probation", label: "Probation" },
  { key: "notice_period", label: "Notice period" },
  { key: "respond_by", label: "Respond by" },
  { key: "organisation", label: "Organisation" },
  { key: "signer_name", label: "Your name" },
  { key: "signer_title", label: "Your title" },
] as const;

export type MergeKey = (typeof MERGE_FIELDS)[number]["key"];

/** The value of every merge field for this offer. */
export function mergeValues(o: Pick<Offer, "candidateName" | "terms" | "expiresAt">, organisation: string, signer: { name: string; title: string }): Record<MergeKey, string> {
  const t = o.terms;
  const money = (n: number) => `${t.currency} ${n.toLocaleString("en-ZA")}`;
  const total = t.baseSalary + t.allowances.filter((a) => a.amount > 0).reduce((s, a) => s + a.amount, 0);
  const date = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", opts).format(new Date(iso));
  return {
    first_name: o.candidateName.split(" ")[0] ?? o.candidateName,
    candidate_name: o.candidateName,
    job_title: t.jobTitle,
    department: t.department,
    reports_to: t.reportsTo,
    location: t.location,
    start_date: t.startDate ? date(`${t.startDate}T12:00:00+02:00`, { day: "numeric", month: "long", year: "numeric" }) : "",
    basic_salary: money(t.baseSalary),
    total_pay: money(total),
    pay_period: t.payPeriod,
    contract_type: t.contractType,
    probation: t.probationMonths ? `${t.probationMonths} months` : "none",
    notice_period: `${t.noticePeriodMonths} ${t.noticePeriodMonths === 1 ? "month" : "months"}`,
    // Until the offer is sent, the date it would be if sent today; once sent, the real deadline.
    respond_by: date(o.expiresAt ?? new Date(Date.now() + t.validDays * 86_400_000).toISOString(), { weekday: "long", day: "numeric", month: "long" }),
    organisation,
    signer_name: signer.name,
    signer_title: signer.title,
  };
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Replaces {{field}} with its value. Unknown fields are left as they are, so HR can spot typos. */
export function fillLetter(html: string, values: Record<string, string>) {
  return html.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k: string) => (k in values ? escape(values[k]!) : m));
}

/** Merge fields in a letter that Vettly doesn't recognise, e.g. a typo such as {{fist_name}}. */
export function unknownFields(html: string) {
  const known = new Set<string>(MERGE_FIELDS.map((f) => f.key));
  return [...new Set([...html.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]!))].filter((k) => !known.has(k));
}

/** Vettly's standard letter as an editable template, so HR can start from it instead of a blank page. */
export const STANDARD_TEMPLATE = [
  "<p>Dear {{first_name}},</p>",
  "<p>Following your interviews, we are delighted to offer you the position of {{job_title}} in our {{department}} team, reporting to the {{reports_to}}.</p>",
  "<h2>Your package</h2>",
  "<p>Basic salary: {{basic_salary}} per {{pay_period}}, before tax.<br>Total guaranteed pay: {{total_pay}} per {{pay_period}}.</p>",
  "<h2>Terms</h2>",
  "<ul><li>Contract: {{contract_type}}, in {{location}}.</li><li>Start date: {{start_date}}.</li><li>Probation: {{probation}}.</li><li>Notice period after probation: {{notice_period}}.</li></ul>",
  "<h2>Conditions</h2>",
  "<p>This offer depends on satisfactory references, verification of your identity and qualifications, and any role-specific checks we have discussed with you.</p>",
  "<p>Please let us know your decision by {{respond_by}}. If you have questions about any part of this offer, reply to this letter or call us.</p>",
  "<p>We look forward to welcoming you to {{organisation}}.</p>",
  "<p>{{signer_name}}<br>{{signer_title}}</p>",
].join("");

/** Plain text of a letter, for the email body. */
export function letterText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(li|tr)>/gi, "\n")
    .replace(/<\/(p|h[1-6]|blockquote|ul|ol)>/gi, "\n\n")
    .replace(/<hr[^>]*>/gi, "\n—\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
