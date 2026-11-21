import "server-only";
/**
 * Rule-based evidence matcher. It searches a candidate's CV record for evidence of each vacancy requirement
 * and quotes the lines it relied on. No AI model is called; its output is marked unreviewed until HR confirms
 * it. An AI assessor can replace `assess` later with the same output shape.
 */
import type {
  CandidateAssessment,
  CandidateProfile,
  CategoryScore,
  Evidence,
  Requirement,
  RequirementAssessment,
  RequirementOutcome,
  ScoreCategory,
  Vacancy,
} from "@/types";

/**
 * How each requirement is recognised. Every group must be evidenced for "met"; some groups give "partial".
 * `roles` marks experience requirements: role titles that count towards the years.
 */
type Rule = { groups: string[][]; roles?: string[]; leadership?: number; partialOnly?: string[] };

const RULES: Record<string, Rule> = {
  // Finance Manager
  "Chartered Accountant, registered with ICAZ (or SAICA / ACCA equivalent)": { groups: [["chartered accountant", "icaz", "saica", "acca"]], partialOnly: ["cima", "finalist", "part-qualified"] },
  "Finance experience, including 3 years managing a team": { groups: [], roles: ["account", "finance", "audit", "treasury", "controller", "analyst"], leadership: 3 },
  "IFRS group and consolidated reporting": { groups: [["ifrs"], ["group", "consolidat"]] },
  "Bachelor's degree in Accounting or Finance": { groups: [["accounting", "accountancy", "finance"]] },
  "Sage Evolution or a comparable ERP": { groups: [["sage", "erp", "sap", "pastel", "oracle", "intacct", "quickbooks"]] },
  "IFRS 17 (insurance contracts)": { groups: [["ifrs 17", "insurance contract"]] },
  "Treasury and cash-flow management in a multi-currency (USD / ZiG) environment": { groups: [["treasury", "cash-flow", "cash flow"], ["usd", "zig", "multi-currency", "currency", "kwacha", "forex"]] },
  // Software Developer
  "TypeScript and React": { groups: [["typescript"], ["react"]] },
  "Node.js and REST API design": { groups: [["node"], ["api"]] },
  "Professional software development": { groups: [], roles: ["developer", "engineer", "programmer"] },
  "Relational databases (PostgreSQL or MySQL)": { groups: [["postgres", "mysql", "sql server", "relational"]] },
  "Cloud deployment (AWS, Azure or GCP) and Docker": { groups: [["aws", "azure", "gcp", "cloud"], ["docker", "container", "kubernetes"]] },
  "Payment or fintech integrations": { groups: [["payment", "fintech", "ecocash", "zipit", "wallet", "mobile money", "settlement"]] },
  "Degree in Computer Science or related field": { groups: [["computer science", "software engineering", "information technology", "informatics", "computer engineering"]] },
  // Data Analyst
  "SQL for analysis and data cleaning": { groups: [["sql"]] },
  "Power BI or Tableau": { groups: [["power bi", "tableau"]] },
  "Data or business analysis": { groups: [], roles: ["analyst", "data", "intelligence"] },
  "Python (pandas) for analysis": { groups: [["python", "pandas"]] },
  "Degree in Statistics, Economics or Computer Science": { groups: [["statistics", "economics", "computer science", "mathematics"]] },
  "Microsoft PL-300 Power BI Data Analyst": { groups: [["pl-300", "power bi data analyst"]] },
  // Marketing Executive
  "Running paid social and search campaigns": { groups: [["campaign"], ["paid", "social", "search", "google ads", "meta"]] },
  "Copywriting in English": { groups: [["copywriting", "copy", "content"]] },
  "Marketing or communications": { groups: [], roles: ["marketing", "communications", "brand", "digital"] },
  "Fluent Shona or Ndebele": { groups: [["shona", "ndebele"]] },
  "Diploma or degree in Marketing (e.g. CIM, MSU, NUST)": { groups: [["marketing", "cim"]] },
  // Operations Manager
  "Operations management": { groups: [], roles: ["operations", "logistics", "supply", "depot", "plant"] },
  "Fleet and facilities management": { groups: [["fleet"], ["facilit"]] },
  "Lean Six Sigma Green Belt": { groups: [["six sigma", "lean"]] },
  "SAP or a comparable ERP": { groups: [["sap", "erp", "oracle", "sage", "dynamics"]] },
  // Human Resources Officer
  "Degree in Human Resource Management": { groups: [["human resource"]] },
  "Generalist HR": { groups: [], roles: ["hr", "human resource", "people"] },
  "Zimbabwe Labour Act and employee relations": { groups: [["labour act", "employee relations", "industrial relations", "disciplinary"]] },
  "IPMZ membership": { groups: [["ipmz"]] },
  // Payroll Administrator
  "Payroll administration": { groups: [], roles: ["payroll"] },
  "Belina or VIP payroll": { groups: [["belina", "vip"]] },
};

const STOP = new Set(["and", "or", "the", "with", "for", "in", "of", "a", "an", "e.g", "including", "years", "experience"]);
function ruleFor(r: Requirement): Rule {
  const known = RULES[r.text];
  if (known) return known;
  // Fallback for requirements HR typed in themselves: any meaningful word counts as partial evidence.
  const words = r.text
    .toLowerCase()
    .split(/[^a-z0-9+#.-]+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
  if (r.kind !== "experience") return { groups: [words] };
  // Experience: role titles that count, widened with common titles for each field.
  const roles = [...new Set(words.flatMap((w) => [w, ...(FIELD_TITLES[w] ?? [])]))];
  return { groups: [], roles: roles.length ? roles : [""] };
}

/** Job-title words that count as experience in a field. */
const FIELD_TITLES: Record<string, string[]> = {
  finance: ["accountant", "accounting", "finance", "financial", "audit", "controller", "treasury", "cfo", "credit", "payroll"],
  financial: ["accountant", "finance", "financial", "controller", "audit"],
  accounting: ["accountant", "accounting", "finance", "audit"],
  software: ["developer", "engineer", "programmer", "software"],
  development: ["developer", "engineer", "programmer"],
  data: ["data", "analyst", "analytics", "scientist", "bi "],
  marketing: ["marketing", "brand", "digital", "communications", "content"],
  sales: ["sales", "business development", "account manager", "relationship"],
  operations: ["operations", "logistics", "supply", "depot", "plant", "production", "fleet", "transport", "warehouse", "distribution"],
  human: ["hr", "human resources", "people", "talent", "recruit"],
  resources: ["hr", "human resources", "people", "talent"],
  management: ["manager", "head", "lead", "director", "supervisor"],
  customer: ["customer", "client", "service", "contact centre", "call centre"],
};

type Line = Evidence & { haystack: string; strong: boolean; role?: boolean };

const yr = (ym: string | null) => (ym ? ym.slice(0, 4) : "present");

function corpus(c: CandidateProfile): Line[] {
  const lines: Line[] = [];
  for (const e of c.experience) {
    const where = `${e.title}, ${e.company} · ${yr(e.start)}–${yr(e.end)}`;
    const span = Math.round(months(e.start, e.end) / 12);
    lines.push({
      source: "Experience",
      where: `${yr(e.start)}–${yr(e.end)} · about ${span || "<1"} ${span === 1 ? "year" : "years"}`,
      quote: `${e.title}, ${e.company}`,
      haystack: `${e.title} ${e.company}`.toLowerCase(),
      strong: true,
      role: true,
    });
    for (const b of e.bullets) lines.push({ source: "Experience", where, quote: b, haystack: b.toLowerCase(), strong: true });
  }
  for (const s of c.skills) {
    const quote = `${s.name} · ${s.level}${s.years ? `, ${s.years} yrs` : ""}`;
    lines.push({ source: "Skills", where: "Skills list", quote, haystack: s.name.toLowerCase(), strong: s.level === "Expert" || s.level === "Advanced" });
  }
  for (const x of c.certifications) {
    lines.push({ source: "Certifications", where: `${x.issuer} · ${x.year}`, quote: x.name, haystack: `${x.name} ${x.issuer}`.toLowerCase(), strong: true });
  }
  for (const e of c.education) {
    lines.push({
      source: "Education",
      where: `${e.institution} · ${e.end ?? "current"}`,
      quote: `${e.qualification} ${e.field}${e.grade ? `, ${e.grade}` : ""}`,
      haystack: `${e.qualification} ${e.field}`.toLowerCase(),
      strong: true,
    });
  }
  for (const p of c.projects) lines.push({ source: "Projects", where: `${p.name} · ${p.year}`, quote: p.description, haystack: `${p.name} ${p.description}`.toLowerCase(), strong: false });
  lines.push({ source: "Summary", where: "Profile summary", quote: c.summary, haystack: c.summary.toLowerCase(), strong: false });
  return lines;
}

const strip = (l: Line): Evidence => ({ source: l.source, where: l.where, quote: l.quote });

function months(start: string, end: string | null) {
  const s = new Date(`${start}-01`);
  // A current role counts up to today.
  const e = end ? new Date(`${end}-01`) : new Date();
  return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth() + 1);
}

const LEAD = /\b(lead|led|leads|manag|supervis|head of|team of)/i;

function question(r: Requirement) {
  const t = r.text.charAt(0).toLowerCase() + r.text.slice(1);
  switch (r.kind) {
    case "skill":
      return `Ask for a recent, specific example of ${t}.`;
    case "certification":
      return `Ask for proof of ${t}, such as a membership or credential number.`;
    case "experience":
      return `Ask how many years of ${t} they have, and in which roles.`;
    case "education":
      return `Ask to see the certificate for their degree, and confirm the field of study.`;
    case "language":
      return `Confirm ${t} at interview.`;
  }
}

type Judgement = Pick<RequirementAssessment, "outcome" | "confidence" | "rationale" | "evidence" | "question">;

function assessExperience(r: Requirement, rule: Rule, c: CandidateProfile, lines: Line[]): Judgement {
  const need = r.years ?? 1;
  const roles = c.experience.filter((e) => rule.roles!.some((k) => e.title.toLowerCase().includes(k)));
  const years = Math.round((roles.reduce((s, e) => s + months(e.start, e.end), 0) / 12) * 10) / 10;
  const evidence = roles.slice(0, 3).map((e) => strip(lines.find((l) => l.role && l.quote === `${e.title}, ${e.company}`)!));
  const fmt = (n: number) => {
    const v = n >= 2 ? Math.round(n) : Math.round(n * 10) / 10;
    return `${v} ${v === 1 ? "year" : "years"}`;
  };
  if (roles.length === 0) return { outcome: "missing", confidence: "medium", rationale: "No roles on the CV match this requirement.", evidence: [], question: question(r) };

  let lead = 0;
  if (rule.leadership) {
    const leading = c.experience.filter((e) => LEAD.test(e.title) || e.bullets.some((b) => LEAD.test(b)));
    lead = Math.round((leading.reduce((s, e) => s + months(e.start, e.end), 0) / 12) * 10) / 10;
    const proof = lines.find((l) => l.source === "Experience" && !l.role && LEAD.test(l.quote));
    if (proof) evidence.push(strip(proof));
  }
  const yearsOk = years >= need;
  const leadOk = !rule.leadership || lead >= rule.leadership;
  if (yearsOk && leadOk)
    return {
      outcome: "met",
      confidence: "high",
      rationale: rule.leadership
        ? `${fmt(years)} in relevant roles (needs ${need}), with about ${fmt(lead)} leading people (needs ${rule.leadership}).`
        : `${fmt(years)} in relevant roles, against ${need} required.`,
      evidence,
    };
  return {
    outcome: years < need * 0.5 ? "not_met" : "partial",
    confidence: "medium",
    rationale: !yearsOk
      ? `${fmt(years)} in relevant roles, short of the ${need} required.${rule.leadership && !leadOk ? " Little evidence of managing a team." : ""}`
      : `${fmt(years)} in relevant roles, but only about ${fmt(lead)} leading people (needs ${rule.leadership}).`,
    evidence,
    question: question(r),
  };
}

function assessOne(r: Requirement, c: CandidateProfile, lines: Line[]): RequirementAssessment {
  const rule = ruleFor(r);
  if (rule.roles) {
    const j = assessExperience(r, rule, c, lines);
    return { requirement: r, aiOutcome: j.outcome, ...j };
  }

  const hits = rule.groups.map((g) => lines.filter((l) => g.some((k) => l.haystack.includes(k))));
  const matched = hits.filter((h) => h.length > 0).length;
  const all = [...new Set(hits.flat())];
  const strong = all.some((l) => l.strong);
  const evidence = all
    .sort((a, b) => Number(b.strong) - Number(a.strong) || (a.source === "Summary" ? 1 : 0) - (b.source === "Summary" ? 1 : 0))
    .slice(0, 3)
    .map(strip);
  const partialHit = rule.partialOnly && lines.find((l) => rule.partialOnly!.some((k) => l.haystack.includes(k)));

  let outcome: RequirementOutcome;
  let rationale: string;
  let confidence: RequirementAssessment["confidence"] = "medium";
  if (matched === rule.groups.length && matched > 0 && strong) {
    outcome = "met";
    confidence = all.some((l) => l.source === "Experience" || l.source === "Certifications") ? "high" : "medium";
    rationale =
      r.kind === "certification"
        ? `Listed under certifications.`
        : r.kind === "education"
          ? `The CV lists a matching qualification.`
          : evidence.some((e) => e.source === "Experience")
            ? `Shown in work history, not only listed as a skill.`
            : `Listed as an advanced skill, but not described in work history.`;
  } else if (matched > 0) {
    outcome = "partial";
    rationale =
      matched < rule.groups.length
        ? `Evidence covers part of this requirement only.`
        : `Mentioned, but only at a basic or intermediate level, or in the summary.`;
  } else if (partialHit) {
    outcome = "partial";
    evidence.push(strip(partialHit));
    rationale = `Holds a related qualification, not the one asked for.`;
  } else if (r.kind === "education" && c.education.length > 0) {
    outcome = "not_met";
    confidence = "high";
    const e = c.education[0]!;
    evidence.push(strip(lines.find((l) => l.source === "Education")!));
    rationale = `Their degree is in ${e.field}, not a field this requirement names.`;
  } else {
    outcome = "missing";
    rationale = `Nothing on the CV shows this. It may still be true, so ask.`;
  }
  return {
    requirement: r,
    outcome,
    aiOutcome: outcome,
    confidence,
    rationale,
    evidence,
    ...(outcome === "met" ? {} : { question: question(r) }),
  };
}

const KIND_CATEGORY: Record<Requirement["kind"], ScoreCategory> = {
  skill: "skills",
  language: "skills",
  experience: "experience",
  education: "education",
  certification: "certifications",
};
/** Credit per outcome. A met requirement earns more with strong evidence (work history, certificates). */
function credit(r: RequirementAssessment) {
  if (r.outcome === "met") return r.review?.action === "changed" || r.confidence === "high" ? 0.95 : 0.85;
  return r.outcome === "partial" ? 0.5 : 0;
}

/** Weighted score from requirement outcomes. Essentials count twice as much as desirables. */
export function score(vacancy: Vacancy, reqs: RequirementAssessment[], testScore: number | null, withTests: boolean) {
  const cats = (["skills", "experience", "education", "certifications", "assessments"] as const).map((category): CategoryScore => {
    const weight = vacancy.weights[category];
    if (category === "assessments") return { category, weight, score: testScore };
    const inCat = reqs.filter((r) => KIND_CATEGORY[r.requirement.kind] === category);
    if (!inCat.length) return { category, weight, score: null };
    const w = (r: RequirementAssessment) => (r.requirement.priority === "essential" ? 2 : 1);
    const total = inCat.reduce((s, r) => s + w(r), 0);
    const got = inCat.reduce((s, r) => s + w(r) * credit(r), 0);
    return { category, weight, score: Math.round((got / total) * 100) };
  });
  const used = cats.filter((c) => c.score !== null && c.weight > 0 && (withTests || c.category !== "assessments"));
  const denom = used.reduce((s, c) => s + c.weight, 0);
  const value = denom ? Math.round(used.reduce((s, c) => s + c.weight * c.score!, 0) / denom) : 0;
  return { breakdown: cats, value };
}

const KIND_NOUN: Record<Requirement["kind"], [string, string]> = {
  skill: ["a skill", "skills"],
  experience: ["the experience requirement", "experience requirements"],
  education: ["the qualification", "qualifications"],
  certification: ["the certification", "certifications"],
  language: ["a language", "languages"],
};

/** "the certification and 2 skills" */
function describe(items: RequirementAssessment[]) {
  const byKind = new Map<Requirement["kind"], number>();
  for (const r of items) byKind.set(r.requirement.kind, (byKind.get(r.requirement.kind) ?? 0) + 1);
  const parts = [...byKind].map(([k, n]) => (n === 1 ? KIND_NOUN[k][0] : `${n} ${KIND_NOUN[k][1]}`));
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0]!;
}

function explain(c: CandidateProfile, reqs: RequirementAssessment[]) {
  const first = c.name.split(" ")[0];
  const ess = reqs.filter((r) => r.requirement.priority === "essential");
  const metEss = ess.filter((r) => r.outcome === "met").length;
  const des = reqs.filter((r) => r.requirement.priority === "desirable");
  const metDes = des.filter((r) => r.outcome === "met").length;
  const parts = [`${first} meets ${metEss} of ${ess.length} essential requirements${des.length ? ` and ${metDes} of ${des.length} desirable ones` : ""}.`];
  const weak = (o: RequirementOutcome) => ess.filter((r) => r.outcome === o);
  if (metEss === ess.length) parts.push("Every essential requirement is backed by evidence on the CV.");
  if (weak("partial").length) parts.push(`For ${describe(weak("partial"))}, the evidence only goes part of the way.`);
  if (weak("not_met").length) parts.push(`The CV shows ${describe(weak("not_met"))} falling short.`);
  if (weak("missing").length) parts.push(`There's no evidence either way for ${describe(weak("missing"))}.`);
  const missing = reqs.filter((r) => r.outcome === "missing").length;
  if (missing) parts.push(`Use the suggested questions at screening to fill the ${missing === 1 ? "gap" : `${missing} gaps`}.`);
  return parts.join(" ");
}

export function assess(c: CandidateProfile, vacancy: Vacancy, testScore: number | null = null): CandidateAssessment {
  const app = c.applications.find((a) => a.vacancyId === vacancy.id) ?? c.applications[0]!;
  const lines = corpus(c);
  const requirements = vacancy.requirements.map((r) => assessOne(r, c, lines));
  const cv = score(vacancy, requirements, testScore, false);
  const withTests = testScore !== null ? score(vacancy, requirements, testScore, true).value : null;

  const skillReqs = requirements.filter((r) => r.requirement.kind === "skill");
  const used = new Set(requirements.flatMap((r) => r.evidence.filter((e) => e.source === "Skills").map((e) => e.quote.split(" · ")[0]!)));
  return {
    candidateId: c.id,
    candidateName: c.name,
    headline: c.headline,
    location: c.location,
    applicationId: app.id,
    vacancyId: vacancy.id,
    vacancyTitle: vacancy.title,
    stage: app.stage,
    score: cv.value,
    aiScore: cv.value,
    testScore,
    scoreWithTests: withTests,
    breakdown: cv.breakdown,
    explanation: explain(c, requirements),
    strengths: requirements.filter((r) => r.outcome === "met" && r.confidence === "high").map((r) => r.requirement.text),
    gaps: requirements.filter((r) => r.outcome === "missing" || r.outcome === "not_met").map((r) => r.requirement.text),
    skills: {
      matched: skillReqs.filter((r) => r.outcome === "met").map((r) => r.requirement.text),
      partial: skillReqs.filter((r) => r.outcome === "partial").map((r) => r.requirement.text),
      missing: skillReqs.filter((r) => r.outcome === "missing" || r.outcome === "not_met").map((r) => r.requirement.text),
      extra: c.skills.map((s) => s.name).filter((n) => !used.has(n)),
    },
    requirements,
    provenance: "ai_illustrative",
  };
}
