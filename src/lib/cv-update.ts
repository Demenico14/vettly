/**
 * Updating an existing candidate from a newer CV. Shared by the CV review screen (to show HR exactly what
 * would change before they choose) and the server (to apply it), so the two always agree.
 *
 * What a CV says replaces what an older CV said: headline, location, summary, current employer, work
 * history, education, certificates and skills. What HR built up is kept: notes, tags, stage, applications,
 * documents, talent-pool membership, and the skill levels HR set for skills the new CV still lists. Links and
 * availability are only filled in where the profile has none.
 */
import type { CandidateProfile, CvExtraction } from "@/types";

type ProfileFields = Pick<
  CandidateProfile,
  "headline" | "location" | "summary" | "currentEmployer" | "experience" | "education" | "certifications" | "skills" | "topSkills" | "linkedin" | "github" | "website"
>;

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** The profile fields a newer CV would set. Fields the CV leaves empty keep their current value. */
export function fieldsFromCv(c: CandidateProfile, x: CvExtraction): ProfileFields {
  const levels = new Map(c.skills.map((s) => [squash(s.name), s]));
  const skills = x.skills.length ? x.skills.map((name) => levels.get(squash(name)) ?? { name, level: "Intermediate" as const }) : c.skills;
  const experience = x.experience.filter((e) => e.title.trim() || e.company.trim());
  const education = x.education.filter((e) => e.qualification.trim() || e.institution.trim());
  const certifications = (x.certifications ?? []).filter((k) => k.name.trim());
  return {
    headline: x.headline.value.trim() || c.headline,
    location: x.location.value.trim() || c.location,
    summary: x.summary.trim() || c.summary,
    currentEmployer: experience.length ? x.currentEmployer.value.trim() || null : c.currentEmployer,
    experience: experience.length
      ? experience.map((e) => ({ id: e.id, title: e.title.trim(), company: e.company.trim(), location: e.location, start: e.start, end: e.end, bullets: (e.bullets ?? []).map((b) => b.trim()).filter(Boolean) }))
      : c.experience,
    education: education.length
      ? education.map((e) => ({ id: e.id, institution: e.institution.trim(), qualification: e.qualification.trim(), field: e.field, start: e.end ? e.end - 3 : new Date().getFullYear(), end: e.end }))
      : c.education,
    certifications: certifications.length ? certifications.map((k) => ({ name: k.name.trim(), issuer: k.issuer.trim(), year: k.year ?? 0 })) : c.certifications,
    skills,
    topSkills: skills.slice(0, 3).map((s) => s.name),
    linkedin: c.linkedin || x.links?.linkedin || null,
    github: c.github || x.links?.github || null,
    website: c.website || x.links?.website || null,
  };
}

/** What changes, in words HR can check at a glance. Empty when the newer CV says the same as the profile. */
export function changesFromCv(c: CandidateProfile, x: CvExtraction): string[] {
  const next = fieldsFromCv(c, x);
  const out: string[] = [];
  const text = (label: string, from: string | null | undefined, to: string | null | undefined) => {
    if (squash(from ?? "") !== squash(to ?? "")) out.push(`${label}: ${from?.trim() || "none"} → ${to?.trim() || "none"}`);
  };
  /** "Jobs: 2 → 1, adds Software Engineering Intern at Strategic Information Systems, removes …" */
  const list = <T,>(label: string, before: T[], after: T[], key: (t: T) => string, show: (t: T) => string) => {
    const had = new Set(before.map(key));
    const has = new Set(after.map(key));
    const added = after.filter((t) => !had.has(key(t)));
    const removed = before.filter((t) => !has.has(key(t)));
    if (!added.length && !removed.length) return;
    const names = (ts: T[]) => (ts.length > 2 ? `${ts.slice(0, 2).map(show).join(", ")} and ${ts.length - 2} more` : ts.map(show).join(", "));
    const parts = [added.length ? `adds ${names(added)}` : "", removed.length ? `removes ${names(removed)}` : ""].filter(Boolean);
    out.push(`${label}: ${before.length} → ${after.length}${parts.length ? `, ${parts.join("; ")}` : ""}`);
  };
  text("Headline", c.headline, next.headline);
  text("Location", c.location, next.location);
  list("Jobs", c.experience, next.experience, (e) => squash(`${e.title}${e.company}${e.start}`), (e) => `${e.title} at ${e.company}`);
  list("Education", c.education, next.education, (e) => squash(`${e.qualification}${e.institution}`), (e) => e.qualification);
  list("Certificates", c.certifications, next.certifications, (k) => squash(k.name), (k) => k.name);
  list("Skills", c.skills, next.skills, (s) => squash(s.name), (s) => s.name);
  if (squash(c.summary) !== squash(next.summary)) out.push("Summary: replaced with the one on this CV");
  for (const [label, key] of [["LinkedIn", "linkedin"], ["GitHub", "github"], ["Website", "website"]] as const) if (!c[key] && next[key]) out.push(`${label}: added`);
  return out;
}
