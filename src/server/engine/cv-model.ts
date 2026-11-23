import "server-only";
/**
 * CV reading with the local extraction model (NuExtract, see src/server/ai/local.ts), combined with the
 * rule-based reader. The model is better at structure (who, which jobs, which qualifications) on messy or
 * unusual layouts; the rules stay in charge of email and phone, which a pattern reads reliably. Anything the
 * model says it copied from the CV but that isn't there word for word is flagged for HR to check.
 */
import type { CvExtraction, ExtractedCertification, ExtractedEducation, ExtractedExperience, ExtractedValue } from "@/types";
import { extractWithTemplate } from "../ai/local";
import type { ParsedCv } from "./cv-parser";

/** What the model is asked to fill in (NuExtract's template language). */
const TEMPLATE = {
  name: "verbatim-string",
  email: "verbatim-string",
  phone: "verbatim-string",
  location: "verbatim-string",
  headline: "verbatim-string",
  availability: "string",
  summary: "verbatim-string",
  experience: [{ title: "verbatim-string", employer: "verbatim-string", location: "verbatim-string", start: "date-time", end: "date-time", current: ["yes", "no"], duties: ["verbatim-string"] }],
  education: [{ qualification: "verbatim-string", field: "verbatim-string", institution: "verbatim-string", year: "integer" }],
  certifications: [{ name: "verbatim-string", issuer: "verbatim-string", year: "integer" }],
  skills: ["verbatim-string"],
};

type S = string | null | undefined;
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

/** Asks the model to read the CV. Null when the model isn't running or its answer can't be used. */
export async function readCvWithModel(text: string): Promise<ModelCv | null> {
  // NuExtract's window is 8k tokens with the template; very long CVs are cut to their first ~5,000 words.
  const clipped = text.length > 30_000 ? text.slice(0, 30_000) : text;
  return extractWithTemplate<ModelCv>(TEMPLATE, clipped);
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

const NOT_ON_CV = "Not found word for word on the CV. Check it.";

/**
 * Combines the model's reading with the rule-based one. The rule-based result is the starting point, so a
 * field the model leaves out keeps what the rules found.
 */
export function combine(rules: ParsedCv, model: ModelCv, cvText: string): ParsedCv & { model: true } {
  const onCv = (s: string) => !!s && squash(cvText).includes(squash(s));
  const r = rules.extraction;
  const value = (modelValue: S, ruleValue: ExtractedValue, opts: { verbatim?: boolean; prefer?: "rules" } = {}): ExtractedValue => {
    const v = str(modelValue);
    if (!v) return ruleValue;
    if (opts.prefer === "rules" && ruleValue.value && !ruleValue.flag) return ruleValue;
    if (opts.verbatim && !onCv(v)) return ruleValue.value ? ruleValue : { value: v.slice(0, 120), flag: NOT_ON_CV };
    return { value: v.slice(0, 120) };
  };

  const experience: ExtractedExperience[] = (model.experience ?? [])
    .map((e, i): ExtractedExperience | null => {
      const title = str(e.title);
      const company = str(e.employer);
      if (!title && !company) return null;
      const start = ym(e.start, 1);
      const current = str(e.current) === "yes" || !str(e.end);
      const bullets = (e.duties ?? []).map(str).filter((b) => b.length > 2).slice(0, 12).map((b) => b.slice(0, 300));
      const unsure = !title || !company || !start || (!onCv(title) && !onCv(company));
      return {
        id: `x${i + 1}`,
        title: title || "Role",
        company,
        location: str(e.location),
        start: start ?? "",
        end: current ? null : ym(e.end, 12),
        ...(bullets.length ? { bullets } : {}),
        ...(unsure ? { flag: !start ? "Check the dates" : "Check the job title and employer" } : {}),
      };
    })
    .filter((e): e is ExtractedExperience => !!e)
    .sort((a, b) => (b.end ?? "9999").localeCompare(a.end ?? "9999") || b.start.localeCompare(a.start));

  const education: ExtractedEducation[] = (model.education ?? [])
    .map((e, i): ExtractedEducation | null => {
      const qualification = str(e.qualification);
      if (!qualification) return null;
      const institution = str(e.institution);
      const year = typeof e.year === "number" && e.year > 1950 && e.year < 2100 ? e.year : null;
      return { id: `e${i + 1}`, qualification: qualification.slice(0, 120), field: str(e.field).slice(0, 80), institution: institution.slice(0, 120), end: year, ...(!institution ? { flag: "Institution not found" } : !onCv(qualification) ? { flag: NOT_ON_CV } : {}) };
    })
    .filter((e): e is ExtractedEducation => !!e);

  const certifications: ExtractedCertification[] = (model.certifications ?? [])
    .map((c, i): ExtractedCertification | null => {
      const name = str(c.name);
      if (!name) return null;
      const issuer = str(c.issuer);
      const year = typeof c.year === "number" && c.year > 1950 && c.year < 2100 ? c.year : null;
      return { id: `c${i + 1}`, name: name.slice(0, 120), issuer: issuer.slice(0, 80), year, ...(!onCv(name) ? { flag: NOT_ON_CV } : !issuer ? { flag: "Issuing body not found" } : {}) };
    })
    .filter((c): c is ExtractedCertification => !!c)
    // NuExtract sometimes lists an award and its body as two entries ("ACCA", "Association of …"): keep one.
    .filter((c, i, all) => !all.some((o, j) => j < i && (squash(o.issuer) === squash(c.name) || squash(o.name).includes(squash(c.name)))));

  // Skills: the model's, then any the rules found that it didn't, without near-duplicates.
  const skills: string[] = [];
  for (const s of [...(model.skills ?? []).map(str), ...r.skills]) {
    if (!s || s.length > 60 || !onCv(s)) continue;
    if (!skills.some((x) => squash(x) === squash(s))) skills.push(s);
  }

  const useExp = experience.length > 0 ? experience : r.experience;
  const current = useExp.find((e) => e.end === null);
  const name = value(model.name ? tidyName(str(model.name)) : null, r.name, { verbatim: true });
  const email = value(model.email, r.email, { verbatim: true, prefer: "rules" });
  const phone = value(model.phone, r.phone, { verbatim: true, prefer: "rules" });
  const extraction: CvExtraction = {
    ...r,
    name,
    email,
    phone,
    location: value(model.location, r.location, { verbatim: true }),
    headline: value(model.headline, r.headline, { verbatim: true }),
    currentEmployer: current?.company ? { value: current.company } : r.currentEmployer,
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
