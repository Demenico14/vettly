import "server-only";
/**
 * CV reading with the local extraction model (NuExtract, see src/server/ai/local.ts), combined with the
 * rule-based reader. The model is better at structure (who, which jobs, which qualifications) on messy or
 * unusual layouts; the rules stay in charge of email and phone, which a pattern reads reliably.
 *
 * A small model mixes sections up when asked for a whole CV at once, so it's asked three smaller questions:
 * the person, their jobs, and their qualifications. Its answers are then checked against the CV text:
 * anything it says it copied but that isn't there is flagged, an "employer" that reads like a sentence of
 * duties is replaced by the line the CV actually gives, and so on. Scored with tests/models/cv-eval.test.ts.
 */
import type { CvExtraction, ExtractedCertification, ExtractedEducation, ExtractedExperience, ExtractedValue } from "@/types";
import { extractWithTemplate } from "../ai/local";
import { cvSections, dateRangeIn, type ParsedCv, type SectionKind } from "./cv-parser";
import { onlyLinks } from "@/lib/links";

// NuExtract's template language: field names steer it, so they say exactly what's wanted.
const PERSON = {
  name: "verbatim-string",
  email: "verbatim-string",
  phone: "verbatim-string",
  city_or_town: "verbatim-string",
  current_or_latest_job_title: "verbatim-string",
  notice_period_or_availability: "string",
  profile_summary: "verbatim-string",
  skills: ["verbatim-string"],
};
const JOBS = {
  // Duties are most of the model's writing time, but without them it splits one job's duties into several jobs.
  work_experience: [{ job_title: "verbatim-string", employer_name: "verbatim-string", location: "verbatim-string", start_date: "date-time", end_date: "date-time", current_job: ["yes", "no"], duties: ["verbatim-string"] }],
};
const QUALIFICATIONS = {
  education: [{ degree_diploma_or_school_qualification: "verbatim-string", subject_or_field: "verbatim-string", school_college_or_university: "verbatim-string", year_completed: "integer" }],
  certificates_licences_courses_and_tests: [{ name: "verbatim-string", issued_by: "verbatim-string", year: "integer" }],
};

type S = string | null | undefined;
type Person = { name?: S; email?: S; phone?: S; city_or_town?: S; current_or_latest_job_title?: S; notice_period_or_availability?: S; profile_summary?: S; skills?: S[] | null };
type Jobs = { work_experience?: { job_title?: S; employer_name?: S; location?: S; start_date?: S; end_date?: S; current_job?: S; duties?: S[] | null }[] | null };
type Quals = {
  education?: { degree_diploma_or_school_qualification?: S; subject_or_field?: S; school_college_or_university?: S; year_completed?: number | null }[] | null;
  certificates_licences_courses_and_tests?: { name?: S; issued_by?: S; year?: number | null }[] | null;
};

/** The model's reading, in Vettly's terms. */
export interface ModelCv {
  name?: S;
  email?: S;
  phone?: S;
  location?: S;
  headline?: S;
  availability?: S;
  summary?: S;
  experience?: { title?: S; employer?: S; location?: S; start?: S; end?: S; current?: S; duties?: S[] | null }[] | null;
  education?: { qualification?: S; field?: S; institution?: S; year?: number | null }[] | null;
  certifications?: { name?: S; issuer?: S; year?: number | null }[] | null;
  skills?: S[] | null;
}

/** Short CVs go to each question whole; longer ones send each question only the sections it needs. */
const WHOLE = 6_000;
/** The model's window is 8k tokens with the template: about 20,000 characters of CV at most. */
const LIMIT = 18_000;

/** The text each question reads: the whole CV, or for a long one just the relevant sections. */
export function partsFor(text: string) {
  if (text.length <= WHOLE) return { person: text, jobs: text, quals: text };
  const { top, sections } = cvSections(text);
  const of = (...kinds: SectionKind[]) => sections.filter((s) => s.kinds.some((k) => kinds.includes(k))).map((s) => s.text).join("\n\n");
  const clip = (t: string) => (t.length > LIMIT ? t.slice(0, LIMIT) : t);
  const jobs = of("experience");
  const quals = of("education", "certifications");
  return {
    person: clip([top, of("profile", "skills")].filter(Boolean).join("\n\n") || text.slice(0, WHOLE)),
    // When the headings weren't recognised, fall back to the whole CV (clipped).
    jobs: clip(jobs || text),
    quals: clip(quals || text),
  };
}

/** Asks the model to read the CV, in three parts. Null when the model isn't running or gave nothing usable. */
export async function readCvWithModel(text: string): Promise<ModelCv | null> {
  const part = partsFor(text);
  const person = await extractWithTemplate<Person>(PERSON, part.person);
  if (!person) return null; // not running: don't wait for the other two
  const jobs = await extractWithTemplate<Jobs>(JOBS, part.jobs);
  const quals = await extractWithTemplate<Quals>(QUALIFICATIONS, part.quals);
  return {
    name: person.name,
    email: person.email,
    phone: person.phone,
    location: person.city_or_town,
    headline: person.current_or_latest_job_title,
    availability: person.notice_period_or_availability,
    summary: person.profile_summary,
    skills: person.skills,
    experience: (jobs?.work_experience ?? []).map((j) => ({ title: j.job_title, employer: j.employer_name, location: j.location, start: j.start_date, end: j.end_date, current: j.current_job, duties: j.duties })),
    education: (quals?.education ?? []).map((e) => ({ qualification: e.degree_diploma_or_school_qualification, field: e.subject_or_field, institution: e.school_college_or_university, year: e.year_completed })),
    certifications: (quals?.certificates_licences_courses_and_tests ?? []).map((c) => ({ name: c.name, issuer: c.issued_by, year: c.year })),
  };
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9@+]+/g, "");
const str = (s: S) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

/** Names typed in capitals ("RUDO CHIKOWERO") read as "Rudo Chikowero"; mixed case is left alone. */
export function tidyName(s: string) {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase());
}

/** "2020-03-01" or "2020" → "2020-03" / "2020-01"; null when there's no year. */
function ym(s: S, fallbackMonth: number): string | null {
  const t = str(s);
  const m = t.match(/((?:19|20)\d{2})(?:-(\d{2}))?/);
  if (!m) return null;
  return `${m[1]}-${m[2] ?? String(fallbackMonth).padStart(2, "0")}`;
}

/** A sentence of duties, not a name: long, or ends like a sentence. */
const sentenceLike = (s: string) => s.split(/\s+/).length > 7 || /[.;:]$/.test(s);

const COUNTRIES = /^(zimbabwe|south africa|botswana|zambia|mozambique|namibia|malawi|kenya|uk|united kingdom|usa|united states)$/i;
/** "13 Some Close, Suburb, Harare" → "Harare": the last part that isn't a country or a street. */
function cityOf(s: string, ruleCity: string) {
  if (ruleCity && squash(s).includes(squash(ruleCity))) return ruleCity;
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  const city = [...parts].reverse().find((p) => !COUNTRIES.test(p) && !/\d/.test(p));
  return city ?? s;
}

const DEGREE_LIKE = /\b(bsc|ba|bcom|bacc|beng|btech|llb|bachelor|master|msc|mba|ma|phd|doctor|diploma|degree|honours|hons|a[- ]?levels?|o[- ]?levels?|igcse|national certificate|higher national|hnd|matric)\b/i;
const CERT_LIKE = /\b(test|certified|certificate|essentials|licen[cs]e|course|hsk|toefl|ielts|cisco|coursera|udemy|microsoft|google|aws|acca|cima|pmp|prince2)\b/i;

/** The CV lines, for finding what's next to a job title. */
function linesOf(text: string) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

/**
 * Many modern CVs put the employer and dates on one line and the job title on the next (or the other way
 * round). When the model's employer or dates are unusable, read them from the lines around the title.
 */
function around(lines: string[], title: string) {
  const t = squash(title);
  const i = lines.findIndex((l) => squash(l) === t || (squash(l).includes(t) && l.length < title.length + 80));
  if (i < 0) return null;
  for (const j of [i - 1, i, i + 1]) {
    const line = lines[j];
    if (!line) continue;
    const r = dateRangeIn(line);
    if (r) return { start: r.start, end: r.end, employer: r.rest && squash(r.rest) !== squash(title) && !sentenceLike(r.rest) ? r.rest : "" };
  }
  return null;
}

const NOT_ON_CV = "Not found word for word on the CV. Check it.";

/**
 * Duties for jobs the model gave none for: the sentences between the title and the next job's. Lines
 * that are only dates, an employer or a place are skipped.
 */
function addDuties(jobs: ExtractedExperience[], cvText: string) {
  if (jobs.every((j) => j.bullets?.length)) return;
  const exp = cvSections(cvText).sections.filter((s) => s.kinds.includes("experience")).map((s) => s.text).join("\n");
  const lines = linesOf(exp || cvText);
  const at = jobs.map((j) => {
    const t = squash(j.title);
    return t ? lines.findIndex((l) => squash(l) === t || (squash(l).includes(t) && l.length < j.title.length + 80)) : -1;
  });
  const starts = at.filter((i) => i >= 0).sort((a, b) => a - b);
  jobs.forEach((j, k) => {
    const i = at[k]!;
    if (i < 0 || j.bullets?.length) return;
    const next = starts.find((x) => x > i) ?? lines.length;
    const bullets = lines
      .slice(i + 1, next)
      .filter((l) => !dateRangeIn(l) && l.split(/\s+/).length >= 4 && !(j.company && squash(l).includes(squash(j.company)) && l.length < j.company.length + 40))
      .map((l) => l.replace(/^[•·*▪◦-]\s*/, "").slice(0, 300))
      .slice(0, 12);
    if (bullets.length) j.bullets = bullets;
  });
}

/**
 * Combines the model's reading with the rule-based one. The rule-based result is the starting point, so a
 * field the model leaves out keeps what the rules found.
 */
export function combine(rules: ParsedCv, model: ModelCv, cvText: string): ParsedCv & { model: true } {
  const onCv = (s: string) => !!s && squash(cvText).includes(squash(s));
  const lines = linesOf(cvText);
  const r = rules.extraction;
  const value = (modelValue: S, ruleValue: ExtractedValue, opts: { verbatim?: boolean; prefer?: "rules" } = {}): ExtractedValue => {
    const v = str(modelValue);
    if (!v) return ruleValue;
    if (opts.prefer === "rules" && ruleValue.value && !ruleValue.flag) return ruleValue;
    if (opts.verbatim && !onCv(v)) return ruleValue.value ? ruleValue : { value: v.slice(0, 120), flag: NOT_ON_CV };
    return { value: v.slice(0, 120) };
  };

  // Skills first: certificates the model picked out of the skills list are dropped below.
  const skills: string[] = [];
  for (const s of [...(model.skills ?? []).map(str), ...r.skills]) {
    if (!s || s.length > 60 || !onCv(s)) continue;
    if (!skills.some((x) => squash(x) === squash(s))) skills.push(s);
  }
  const isSkill = (s: string) => skills.some((k) => squash(k) === squash(s));

  const experience: ExtractedExperience[] = (model.experience ?? [])
    .map((e, i): ExtractedExperience | null => {
      const title = str(e.title);
      let company = str(e.employer);
      if (!title && !company) return null;
      let start = ym(e.start, 1);
      let end: string | null = str(e.current) === "yes" || !str(e.end) ? null : ym(e.end, 12);
      const near = title ? around(lines, title) : null;
      if (company && sentenceLike(company)) company = "";
      if (!company && near?.employer) company = near.employer;
      if (!start && near) {
        start = near.start;
        end = near.end;
      }
      const bullets = (e.duties ?? []).map(str).filter((b) => b.length > 2 && onCv(b)).slice(0, 12).map((b) => b.slice(0, 300));
      const unsure = !title || !company || !start || (!onCv(title) && !onCv(company));
      return {
        id: `x${i + 1}`,
        title: title || "Role",
        company,
        location: str(e.location),
        start: start ?? "",
        end,
        ...(bullets.length ? { bullets } : {}),
        ...(unsure ? { flag: !start ? "Check the dates" : "Check the job title and employer" } : {}),
      };
    })
    .filter((e): e is ExtractedExperience => !!e)
    // The same job listed twice (title and employer swapped, say) counts once.
    .filter((e, i, all) => !all.some((o, j) => j < i && squash(`${o.title}${o.company}`) === squash(`${e.title}${e.company}`)))
    // A sentence of duties returned as a job, with no dates: not a job.
    .filter((e) => !(sentenceLike(e.title) && !e.start))
    .sort((a, b) => (b.end ?? "9999").localeCompare(a.end ?? "9999") || b.start.localeCompare(a.start));
  // Jobs the rules found with dates and no doubts, which the model missed (it sometimes stops early on long
  // histories), are added. Matched on start month and on title or employer.
  for (const rj of r.experience) {
    if (rj.flag || !/^\d{4}-\d{2}$/.test(rj.start) || sentenceLike(rj.title)) continue;
    const same = experience.some((e) => e.start === rj.start || (squash(e.title) === squash(rj.title) && !!e.title) || (!!rj.company && squash(e.company) === squash(rj.company) && e.start.slice(0, 4) === rj.start.slice(0, 4)));
    if (!same) experience.push({ ...rj, id: `x${experience.length + 1}` });
  }
  experience.sort((a, b) => (b.end ?? "9999").localeCompare(a.end ?? "9999") || b.start.localeCompare(a.start));
  addDuties(experience, cvText);

  const education: ExtractedEducation[] = [];
  const certifications: ExtractedCertification[] = [];
  const addCert = (name: string, rawIssuer: string, year: number | null) => {
    // A web address isn't an issuing body (it's usually a project's site): treated as no issuer.
    const issuer = /^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(rawIssuer) ? "" : rawIssuer;
    if (!name || sentenceLike(name)) return;
    // With no issuing body or year, only names that read like a credential count (not skills or project names).
    if (!issuer && !year && (isSkill(name) || !CERT_LIKE.test(name))) return;
    if (certifications.some((c) => squash(c.name) === squash(name) || squash(issuer) === squash(name))) return;
    certifications.push({ id: `c${certifications.length + 1}`, name: name.slice(0, 120), issuer: issuer.slice(0, 80), year, ...(!onCv(name) ? { flag: NOT_ON_CV } : !issuer ? { flag: "Issuing body not found" } : {}) });
  };
  const yearOf = (y: number | null | undefined) => (typeof y === "number" && y > 1950 && y < 2100 ? y : null);
  for (const e of model.education ?? []) {
    const qualification = str(e.qualification);
    if (!qualification) continue;
    const institution = str(e.institution);
    // "BSc … Aug 2022 – Aug 2026": the year it ends (or ended), not the year it started.
    const line = lines.find((l) => squash(l).includes(squash(qualification)));
    const range = line ? dateRangeIn(line) : null;
    const year = range ? (range.end ? Number(range.end.slice(0, 4)) : yearOf(e.year)) : yearOf(e.year);
    // Certificates and tests filed under education (common when a CV has one "Education & Certifications" section).
    if (!DEGREE_LIKE.test(qualification) && CERT_LIKE.test(`${qualification} ${institution}`)) {
      addCert(qualification, institution, year);
      continue;
    }
    if (education.some((x) => squash(x.qualification) === squash(qualification))) continue;
    education.push({ id: `e${education.length + 1}`, qualification: qualification.slice(0, 120), field: str(e.field).slice(0, 80), institution: institution.slice(0, 120), end: year, ...(!institution ? { flag: "Institution not found" } : !onCv(qualification) ? { flag: NOT_ON_CV } : {}) });
  }
  for (const c of model.certifications ?? []) {
    const name = str(c.name);
    // A degree the model filed as a certificate goes back to education.
    if (DEGREE_LIKE.test(name) && !CERT_LIKE.test(name)) {
      if (!education.some((x) => squash(x.qualification) === squash(name))) education.push({ id: `e${education.length + 1}`, qualification: name.slice(0, 120), field: "", institution: str(c.issuer).slice(0, 120), end: yearOf(c.year) });
      continue;
    }
    addCert(name, str(c.issuer), yearOf(c.year));
  }

  const useExp = experience.length > 0 ? experience : r.experience;
  const current = useExp.find((e) => e.end === null);
  const name = value(model.name ? tidyName(str(model.name)) : null, r.name, { verbatim: true });
  const email = value(model.email, r.email, { verbatim: true, prefer: "rules" });
  const phone = value(model.phone, r.phone, { verbatim: true, prefer: "rules" });
  const location = value(model.location ? cityOf(str(model.location), r.location.value) : null, r.location, { verbatim: true });
  const headline = str(model.headline);
  const extraction: CvExtraction = {
    ...r,
    name,
    email,
    phone,
    location,
    // A job title, not the opening sentence of the profile.
    headline: headline && !sentenceLike(headline) && !onlyLinks(headline) ? value(headline, r.headline, { verbatim: true }) : useExp[0] ? { value: useExp[0].title, flag: "Suggested from the latest role. Check it." } : r.headline,
    currentEmployer: current?.company ? { value: current.company } : { value: "", flag: "No current role found." },
    availability: value(model.availability, r.availability),
    // The CV's own summary paragraph; the model's only when the rules found none.
    summary: (r.summary || (onCv(str(model.summary)) ? str(model.summary) : "")).slice(0, 900),
    experience: useExp,
    education: education.length ? education : r.education,
    certifications: certifications.length ? certifications : (r.certifications ?? []),
    skills: skills.slice(0, 30),
    readBy: "model",
  };
  const hasContact = !!(email.value || phone.value);
  return {
    model: true,
    looksLikeCv: rules.looksLikeCv || (hasContact && useExp.length > 0),
    confident: !!name.value && !name.flag && hasContact && (useExp.length > 0 || extraction.skills.length >= 3),
    extraction,
  };
}
