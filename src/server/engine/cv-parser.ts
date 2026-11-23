import "server-only";
/**
 * Rule-based CV reader. Turns a CV's text into a structured profile, and flags every field it isn't sure of
 * so HR checks it before the candidate is created. No AI model is called; an AI extractor can replace
 * `parseCv` later with the same output.
 */
import type { CvExtraction, ExtractedCertification, ExtractedEducation, ExtractedExperience } from "@/types";
import { linksIn, onlyLinks } from "@/lib/links";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(?:\+|00)?\d[\d\s().-]{7,16}\d/;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const CITIES = [
  "Harare", "Bulawayo", "Mutare", "Gweru", "Masvingo", "Kwekwe", "Kadoma", "Chinhoyi", "Victoria Falls", "Marondera", "Bindura", "Chitungwiza",
  "Johannesburg", "Pretoria", "Cape Town", "Durban", "Gaborone", "Francistown", "Lusaka", "Ndola", "Kitwe", "Maputo", "Windhoek", "Lilongwe", "Blantyre", "Nairobi",
];
const SKILLS = [
  "Excel", "Microsoft Office", "Word", "PowerPoint", "IFRS", "IAS", "Financial reporting", "Management accounts", "Budgeting", "Forecasting", "Audit", "Internal audit", "Tax", "Payroll",
  "Sage", "Sage Evolution", "Pastel", "QuickBooks", "SAP", "Oracle", "Xero", "Group consolidations", "Consolidations", "Reconciliations", "Treasury", "Cash-flow management", "Credit analysis",
  "Financial modelling", "Risk management", "Compliance", "Anti-money laundering", "Customer service", "Complaints handling", "CRM", "Salesforce", "Sales", "Negotiation", "Marketing",
  "Digital marketing", "Social media", "SEO", "Content writing", "Copywriting", "Google Ads", "Campaign planning", "Brand management", "Public relations", "Event management",
  "Project management", "Agile", "Scrum", "Stakeholder management", "Team leadership", "People management", "Coaching", "Recruitment", "Employee relations", "Labour Act",
  "Performance management", "Training", "HR analytics", "Procurement", "Supply chain", "Logistics", "Fleet management", "Inventory control", "Operations management", "Health and safety",
  "SQL", "PostgreSQL", "MySQL", "Python", "R", "Power BI", "Tableau", "Data analysis", "Data modelling", "Statistics", "Machine learning", "JavaScript", "TypeScript", "React", "Node.js",
  "Java", "C#", ".NET", "PHP", "Laravel", "Django", "AWS", "Azure", "Docker", "Kubernetes", "Linux", "Networking", "Cybersecurity", "Git", "REST APIs", "Mobile money",
];
const DEGREE = /\b(PhD|Doctor|Master|MSc|MBA|MA|MCom|BSc|BCom|BAcc|BA|BEng|BTech|LLB|Bachelor|Honours|Hons|Diploma|Certificate|Degree|HND|ND|ACCA|CIMA|CA\(Z\)|CA\(SA\)|CIPS|IPMZ)\b/;
const INSTITUTION = /\b(University|College|Polytechnic|Institute|School|Academy|UNISA|UZ|NUST|MSU|HIT|CUT)\b/;
const NOT_NAME = /(curriculum|vitae|resume|résumé|profile|cv\b|page \d|personal (details|information|data)|contact (details|information))/i;
/** Bodies that award or register professional qualifications in the region and beyond, matched case-sensitively. */
const ISSUERS = /\b(ICAZ|SAICA|SAIPA|ACCA|CIMA|CIPS|IPMZ|SABPP|ICSA|CISA|ISACA|PMI|AXELOS|PRINCE2|CFA Institute|IIA|ECSA|ZIE|HPCSA|Microsoft|AWS|Amazon Web Services|Google|Cisco|CompTIA|Oracle|SAP|Scrum Alliance|Scrum\.org)\b/;
/** Headings that start a certifications section. */
const CERT_HEADING = /^(certifications?|certificates|professional (qualifications|certifications|memberships|registrations?)|licen[cs]es( and certifications)?|memberships|accreditations)\s*:?$/i;

const SECTION = /^(profile|summary|professional summary|about me|objective|career objective|experience|work experience|employment history|professional experience|education|qualifications|skills|key skills|competencies|references|referees|certifications|achievements|languages|interests)\s*:?$/i;

const pad = (n: number) => String(n).padStart(2, "0");

/** The date range on a line ("Nov 2024 – Nov 2025", "2021 to date"), as YYYY-MM; end null means current. */
export function dateRangeIn(line: string): { start: string; end: string | null; rest: string } | null {
  const m = line.match(RANGE);
  if (!m) return null;
  const start = toYm(m[1]!, 1);
  const end = toYm(m[2]!, 12);
  if (!start) return null;
  return { start, end: end ?? null, rest: line.replace(m[0], "").replace(/[\s|•·,–—-]+$/, "").replace(/^[\s|•·,–—-]+/, "").trim() };
}
function toYm(token: string, fallbackMonth: number) {
  const t = token.trim().toLowerCase();
  if (/present|current|now|date/.test(t)) return null;
  const mY = t.match(/([a-z]{3})[a-z]*\.?\s+(\d{4})/);
  if (mY && MONTHS.includes(mY[1]!)) return `${mY[2]}-${pad(MONTHS.indexOf(mY[1]!) + 1)}`;
  const num = t.match(/(\d{1,2})[/.-](\d{4})/);
  if (num) return `${num[2]}-${pad(Math.min(12, Math.max(1, Number(num[1]))))}`;
  const y = t.match(/(\d{4})/);
  return y ? `${y[1]}-${pad(fallbackMonth)}` : undefined;
}

const DATE = "(?:[A-Za-z]{3,9}\\.?\\s+\\d{4}|\\d{1,2}[/.-]\\d{4}|\\d{4})";
const RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|until)\\s*(${DATE}|present|current|now|to date|date)`, "i");

function titleCase(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export interface ParsedCv {
  extraction: CvExtraction;
  /** True when the text looks like a CV at all. */
  looksLikeCv: boolean;
  /** True when name and a contact detail were found, and there's work history or skills. */
  confident: boolean;
}

export function parseCv(text: string, pages: number, knownSkills: string[] = []): ParsedCv {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const flat = lines.join("\n");

  const email = flat.match(EMAIL)?.[0] ?? "";
  const phoneRaw = lines.map((l) => (EMAIL.test(l) ? l.replace(EMAIL, "") : l)).join("\n").match(PHONE)?.[0] ?? "";
  const phone = phoneRaw.replace(/[^\d+]/g, "").length >= 9 ? phoneRaw.trim() : "";

  // "Full Name: Tinashe Dube" (a personal-details block) beats guessing from the first lines.
  const labelled = lines.slice(0, 15).map((l) => l.match(/^(?:full\s+)?name\s*:\s*([A-Za-z][A-Za-z'’ .-]{2,60})$/i)?.[1]?.trim()).find(Boolean);
  const nameLine = labelled ?? lines.slice(0, 8).find((l) => /^[A-Za-z][A-Za-z'’ .-]{2,60}$/.test(l) && l.split(" ").length >= 2 && l.split(" ").length <= 5 && !NOT_NAME.test(l) && !SECTION.test(l));
  const name = nameLine ? titleCase(nameLine.replace(/\b([A-Z])([A-Z]+)\b/g, (_, a: string, b: string) => a + b.toLowerCase())) : "";

  const nameIdx = nameLine ? lines.indexOf(nameLine) : -1;
  const headlineLine = nameIdx >= 0 ? lines.slice(nameIdx + 1, nameIdx + 4).find((l) => !EMAIL.test(l) && !PHONE.test(l) && !SECTION.test(l) && !onlyLinks(l) && l.length <= 80 && /[A-Za-z]/.test(l)) : undefined;

  const city = CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(lines.slice(0, 15).join(" "))) ?? CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(flat)) ?? "";

  // Summary: the paragraph under a profile heading, or the first long line.
  const sumHead = lines.findIndex((l) => /^(profile|summary|professional summary|about me|objective|career objective)\s*:?$/i.test(l));
  let summary = "";
  if (sumHead >= 0) {
    const parts: string[] = [];
    for (const l of lines.slice(sumHead + 1)) {
      if (SECTION.test(l)) break;
      parts.push(l);
      if (parts.join(" ").length > 600) break;
    }
    summary = parts.join(" ");
  } else summary = lines.find((l) => l.length > 120) ?? "";

  // Work history: lines with a date range; title and company from that line or the one above.
  const experience: ExtractedExperience[] = [];
  // Where each role's heading starts and ends, so the lines between roles become its description.
  const spans: { first: number; last: number }[] = [];
  lines.forEach((l, i) => {
    const m = l.match(RANGE);
    if (!m) return;
    if (DEGREE.test(l) || INSTITUTION.test(l) || INSTITUTION.test(lines[i - 1] ?? "")) return;
    const start = toYm(m[1]!, 1);
    const end = toYm(m[2]!, 12);
    if (!start) return;
    const rest = l.replace(m[0], "").replace(/[|•·,–—-]+\s*$/, "").replace(/^\s*[|•·,–—-]+/, "").trim();
    const context = rest.length > 3 ? rest : (lines[i - 1] ?? "");
    const [title, company] = context.split(/\s+(?:at|@)\s+|\s*[|,–—]\s*|\s+-\s+/).map((x) => x?.trim() ?? "");
    const companyBelow = !company && rest.length <= 3 && !!lines[i + 1] && !RANGE.test(lines[i + 1]!);
    spans.push({ first: rest.length > 3 ? i : i - 1, last: companyBelow ? i + 1 : i });
    experience.push({
      id: `x${experience.length + 1}`,
      title: title || "Role",
      company: company || (rest.length > 3 ? lines[i - 1] ?? "" : lines[i + 1] && !RANGE.test(lines[i + 1]!) ? lines[i + 1]! : ""),
      location: CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(`${l} ${lines[i - 1] ?? ""} ${lines[i + 1] ?? ""}`)) ?? "",
      start,
      end: end === undefined ? null : end,
      ...(!title || !company ? { flag: "Check the job title and employer" } : {}),
    });
  });
  experience.forEach((e, k) => {
    const until = spans[k + 1]?.first ?? lines.length;
    const bullets: string[] = [];
    for (const l of lines.slice(spans[k]!.last + 1, until)) {
      if (SECTION.test(l)) break;
      const b = l.replace(/^[•·*▪◦-]\s*/, "").trim();
      if (b.length > 2) bullets.push(b.slice(0, 300));
    }
    if (bullets.length) e.bullets = bullets.slice(0, 12);
  });
  experience.sort((a, b) => (b.end ?? "9999").localeCompare(a.end ?? "9999") || b.start.localeCompare(a.start));

  // Education: lines naming a qualification or an institution.
  const education: ExtractedEducation[] = [];
  lines.forEach((l, i) => {
    if (!DEGREE.test(l)) return;
    const near = `${l} ${lines[i + 1] ?? ""}`;
    const parts = l.replace(RANGE, "").split(/\s*[,|–—]\s*|\s+-\s+/).map((x) => x.trim()).filter((x) => x && !/^(19|20)\d{2}$/.test(x));
    const instPart = parts.find((x) => INSTITUTION.test(x) && !DEGREE.test(x)) ?? (INSTITUTION.test(lines[i + 1] ?? "") ? lines[i + 1]!.split(/\s*[,|]\s*/)[0]! : "");
    const qual = parts.filter((x) => x !== instPart).join(", ").replace(/\b(19|20)\d{2}\b/g, "").trim();
    const inst = instPart.replace(/\b(19|20)\d{2}\b/g, "").trim();
    const years = [...near.matchAll(/\b(19[6-9]\d|20[0-4]\d)\b/g)].map((x) => Number(x[1]));
    if (!qual || education.some((e) => e.qualification === qual)) return;
    education.push({
      id: `e${education.length + 1}`,
      institution: inst,
      qualification: qual.slice(0, 120),
      field: "",
      end: years.length ? Math.max(...years) : null,
      ...(!inst ? { flag: "Institution not found" } : {}),
    });
  });

  // Skills: known vocabulary found in the text, longest names first so "Sage Evolution" beats "Sage".
  // Certifications: each line under a certifications heading, split into the award, its issuing body and year.
  const certifications: ExtractedCertification[] = [];
  const certHead = lines.findIndex((l) => CERT_HEADING.test(l));
  if (certHead >= 0) {
    for (const raw of lines.slice(certHead + 1)) {
      if (SECTION.test(raw) || CERT_HEADING.test(raw)) break;
      const l = raw.replace(/^[•·*▪◦-]\s*/, "").trim();
      if (l.length < 3) continue;
      const year = l.match(/\b(19[6-9]\d|20[0-4]\d)\b/)?.[1];
      const parts = l.replace(/\(?\b(19[6-9]\d|20[0-4]\d)\b\)?/g, "").split(/\s*[,|–—]\s*|\s+-\s+/).map((x) => x.trim()).filter(Boolean);
      const issuerPart = parts.slice(1).find((x) => ISSUERS.test(x)) ?? parts[1] ?? "";
      const issuer = issuerPart || l.match(ISSUERS)?.[1] || "";
      const name = (parts[0] ?? l).slice(0, 120);
      if (certifications.some((c) => c.name === name)) continue;
      certifications.push({ id: `c${certifications.length + 1}`, name, issuer: issuer.slice(0, 80), year: year ? Number(year) : null, ...(!issuer ? { flag: "Issuing body not found" } : {}) });
      if (certifications.length >= 12) break;
    }
  }

  const vocab = [...new Set([...knownSkills, ...SKILLS])].sort((a, b) => b.length - a.length);
  const lower = ` ${flat.toLowerCase()} `;
  const skills: string[] = [];
  for (const s of vocab) {
    const re = new RegExp(`[^a-z0-9]${s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^a-z0-9]`);
    if (re.test(lower) && !skills.some((x) => x.toLowerCase().includes(s.toLowerCase()))) skills.push(s);
  }

  const notice = flat.match(/(\d+|one|two|three)\s*(?:month|months|weeks?)['’]?\s*notice|notice period[:\s]+([^\n.]{3,30})|available immediately|immediately available/i);
  let availability = "";
  if (notice) {
    const t = notice[0].toLowerCase();
    availability = /immediate/.test(t) ? "Immediately" : /3|three/.test(t) ? "3 months' notice" : /2 weeks|two weeks/.test(t) ? "2 weeks' notice" : /1|one/.test(t) ? "1 month's notice" : "";
  }

  const current = experience.find((e) => e.end === null);
  // Short CVs count when they have contact details and some history; longer documents need only one sign.
  const history = experience.length > 0 || education.length > 0;
  const looksLikeCv = ((!!email || !!phone) && history) || (flat.length > 200 && (!!email || !!phone || history));
  const confident = !!name && (!!email || !!phone) && (experience.length > 0 || skills.length >= 3);
  const missing = "Not found on the CV. Check and fill in.";

  return {
    looksLikeCv,
    confident,
    extraction: {
      name: name ? { value: name } : { value: "", flag: missing },
      email: email ? { value: email } : { value: "", flag: missing },
      phone: phone ? { value: phone } : { value: "", flag: missing },
      location: city ? { value: city } : { value: "", flag: missing },
      headline: headlineLine ? { value: headlineLine.slice(0, 80) } : { value: current?.title ?? "", flag: "Suggested from the latest role. Check it." },
      currentEmployer: current ? { value: current.company } : { value: "", flag: "No current role found." },
      availability: availability ? { value: availability } : { value: "", flag: "Notice period not stated." },
      summary: summary.slice(0, 900),
      experience,
      education,
      certifications,
      skills: skills.slice(0, 20),
      pages,
      ocr: false,
      links: linksIn(flat),
    },
  };
}

/** Words that make up section headings, for splitting letter-spaced headings back into words. */
const HEADING_WORDS = [
  "professional", "experience", "work", "employment", "history", "career", "education", "educational", "background", "academic",
  "qualifications", "certifications", "certificates", "certification", "licences", "licenses", "training", "courses", "key", "projects",
  "skills", "technical", "core", "competencies", "profile", "personal", "summary", "about", "me", "objective", "references", "referees",
  "achievements", "awards", "languages", "interests", "hobbies", "volunteering", "publications", "contact", "details", "and", "&",
];

/** "PROFESSIONALEXPERIENCE" → "Professional Experience", when it splits cleanly into heading words. */
function splitHeading(joined: string): string | null {
  const s = joined.toLowerCase();
  const best: (string[] | null)[] = new Array(s.length + 1).fill(null);
  best[0] = [];
  for (let i = 0; i < s.length; i++) {
    if (!best[i]) continue;
    for (const w of HEADING_WORDS) if (s.startsWith(w, i) && (!best[i + w.length] || best[i + w.length]!.length > best[i]!.length + 1)) best[i + w.length] = [...best[i]!, w];
  }
  const words = best[s.length];
  return words ? words.map((w) => (w === "and" || w === "&" ? w : w[0]!.toUpperCase() + w.slice(1))).join(" ") : null;
}

/**
 * Tidies text read from a PDF or Word file before either reader sees it: letter-spaced headings
 * ("P R O F E S S I O N A L  E X P E R I E N C E") become words, words broken across lines with a hyphen are
 * rejoined, and odd spaces are evened out.
 */
export function cleanCvText(text: string): string {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, " ")
    .replace(/\u00ad/g, "")
    // A full-width colon read with the wrong encoding ("ï¼") between an employer and its place.
    .replace(/\s*ï¼\s?/g, ", ")
    .split("\n")
    .map((line) => {
      const tokens = line.trim().split(/\s+/);
      // Mostly one- or two-letter capitals: a letter-spaced heading ("E D U C AT I O N").
      const short = tokens.filter((t) => /^[A-Z&]{1,2}$/.test(t)).length;
      if (tokens.length >= 4 && short / tokens.length >= 0.8 && tokens.every((t) => /^[A-Z&]{1,3}$/.test(t))) {
        const joined = tokens.join("");
        return splitHeading(joined.replace(/&/g, "&")) ?? joined;
      }
      return line.replace(/[ \t]+/g, " ").trimEnd();
    });
  // Date ranges split over lines ("Nov 2013" / "to" / "Current") are joined, so both readers see one range.
  const dateOnly = /^(?:[A-Za-z]{3,9}\.?\s+)?\d{4}$|^(?:present|current|now|to date)$/i;
  for (let i = 0; i < lines.length - 2; i++) {
    if (dateOnly.test(lines[i]!.trim()) && /^(?:to|-|–|—|until)$/i.test(lines[i + 1]!.trim()) && dateOnly.test(lines[i + 2]!.trim())) {
      lines.splice(i, 3, `${lines[i]!.trim()} to ${lines[i + 2]!.trim()}`);
    }
  }
  // "implement-" + "ing …" → "implementing …"
  for (let i = 0; i < lines.length - 1; i++) {
    const m = lines[i]!.match(/([A-Za-z]{2,})-$/);
    const next = lines[i + 1]!.match(/^([a-z]{2,})(.*)$/);
    if (m && next) {
      lines[i] = lines[i]!.slice(0, -1) + next[1];
      lines[i + 1] = next[2]!.trimStart();
    }
  }
  return lines.filter((l, i) => l.trim() || (i > 0 && lines[i - 1]!.trim())).join("\n").trim();
}

/** What a CV section is about, from its heading. */
export type SectionKind = "profile" | "skills" | "experience" | "education" | "certifications" | "other";
const SECTION_KINDS: [SectionKind, RegExp][] = [
  ["experience", /^(work |professional |employment |career |relevant )?(experience|history|employment|work history|employment history|career history)$/i],
  ["education", /^(education|educational background|academic (background|qualifications)|qualifications|education and training|education & training)$/i],
  ["certifications", /^(certifications?|certificates|licen[cs]es|licen[cs]es and certifications|professional (qualifications|certifications|memberships|registrations?)|memberships|accreditations|training|courses|trade test)$/i],
  ["skills", /^(skills|key skills|core skills|technical skills|competencies|core competencies|highlights|skill highlights|computer skills|languages)$/i],
  ["profile", /^(profile|summary|professional summary|executive summary|about me|objective|career objective|personal (details|information))$/i],
  ["other", /^(references|referees|interests|hobbies|accomplishments|achievements|awards|projects|key projects|publications|volunteering|additional information|affiliations)$/i],
];

/**
 * Splits a CV into its sections by their headings. "Education & Certifications" counts as both. Returns the
 * text above the first heading as `top`.
 */
export function cvSections(text: string): { top: string; sections: { kinds: SectionKind[]; text: string }[] } {
  const lines = text.split("\n");
  const sections: { kinds: SectionKind[]; text: string }[] = [];
  let top: string[] = [];
  let current: { kinds: SectionKind[]; lines: string[] } | null = null;
  for (const line of lines) {
    const t = line.trim().replace(/:$/, "");
    const parts = t.length <= 50 ? t.split(/\s+(?:&|and)\s+/i) : [];
    const kinds = parts.map((p) => SECTION_KINDS.find(([, re]) => re.test(p))?.[0]).filter((k): k is SectionKind => !!k);
    if (parts.length && kinds.length === parts.length) {
      if (current) sections.push({ kinds: current.kinds, text: current.lines.join("\n") });
      current = { kinds: [...new Set(kinds)], lines: [] };
    } else if (current) current.lines.push(line);
    else top.push(line);
  }
  if (current) sections.push({ kinds: current.kinds, text: current.lines.join("\n") });
  if (!sections.length) top = lines;
  return { top: top.join("\n"), sections };
}
