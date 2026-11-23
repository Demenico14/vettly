/**
 * Stress test for the CV reader on a folder of real (anonymised) CV PDFs, such as the Kaggle "Resume Dataset"
 * (one folder per job category). There's no answer key, so it checks what the dataset's fixed layout makes
 * checkable: every job in it names its employer "Company Name", so that count is the number of jobs.
 *
 *   STRESS_DIR=~/Downloads/archive/data/data STRESS_COUNT=200 pnpm test:models cv-stress
 *
 * Results are appended to models/stress/results.jsonl after each CV, so a stopped run carries on where it left off.
 * Nothing from the CVs is committed: models/ is ignored by git.
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "vitest";
import type { CvExtraction } from "@/types";
import { textFromBytes } from "@/server/files";
import { cleanCvText, parseCv } from "@/server/engine/cv-parser";
import { combine, readCvWithModel } from "@/server/engine/cv-model";

process.env.AI_EXTRACT_URL ??= "http://localhost:8091";
const DIR = process.env.STRESS_DIR?.replace(/^~/, process.env.HOME ?? "~");
const COUNT = Number(process.env.STRESS_COUNT ?? 200);
const OUT = "models/stress/results.jsonl";

/** An even spread across categories: the first files (by name) of each, in turn. */
function pick(dir: string, count: number) {
  const cats = readdirSync(dir).filter((c) => !c.startsWith(".")).sort();
  const files = cats.map((c) => readdirSync(join(dir, c)).filter((f) => f.endsWith(".pdf")).sort().map((f) => ({ cat: c, path: join(dir, c, f) })));
  const out: { cat: string; path: string }[] = [];
  for (let i = 0; out.length < count && files.some((f) => f[i]); i++) for (const f of files) if (f[i] && out.length < count) out.push(f[i]!);
  return out;
}

/** The part of the text between a heading and the next of the given headings. */
function section(text: string, head: RegExp, next: RegExp) {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => head.test(l.trim()));
  if (i < 0) return "";
  const rest = lines.slice(i + 1);
  const j = rest.findIndex((l) => next.test(l.trim()));
  return rest.slice(0, j < 0 ? undefined : j).join("\n");
}

const sentenceLike = (s: string) => s.split(/\s+/).length > 9 || /[.;]$/.test(s);
const NEXT = /^(education|education and training|skills|certifications|accomplishments|additional information|interests|languages|affiliations|highlights|summary)$/i;

/** What can be checked without an answer key. */
function check(x: CvExtraction, text: string) {
  const exp = section(text, /^(experience|work experience|professional experience|work history|employment history)$/i, NEXT);
  const expectedJobs = (exp.match(/Company Name/g) ?? []).length;
  const hasEducation = /^(education|education and training)$/im.test(text);
  const jobs = x.experience;
  return {
    expectedJobs,
    jobs: jobs.length,
    jobsRight: jobs.length === expectedJobs,
    withDates: jobs.filter((j) => /^\d{4}-\d{2}$/.test(j.start)).length,
    withTitle: jobs.filter((j) => j.title && j.title !== "Role").length,
    employerRight: jobs.filter((j) => /company name/i.test(j.company)).length,
    sentenceTitles: jobs.filter((j) => sentenceLike(j.title)).length,
    hasEducation,
    education: x.education.length,
    junkCerts: (x.certifications ?? []).filter((c) => sentenceLike(c.name)).length,
    skills: x.skills.length,
    flags: [x.name, x.location, x.headline].filter((v) => v.flag).length + jobs.filter((j) => j.flag).length,
  };
}

describe.skipIf(!DIR)("CV reader stress test", () => {
  it("reads every sampled CV", async () => {
    mkdirSync("models/stress", { recursive: true });
    const done = new Set(existsSync(OUT) ? readFileSync(OUT, "utf8").trim().split("\n").filter(Boolean).map((l) => (JSON.parse(l) as { path: string }).path) : []);
    const todo = pick(DIR!, COUNT).filter((f) => !done.has(f.path));
    console.log(`${done.size} already done, ${todo.length} to go`);
    for (const [n, f] of todo.entries()) {
      const t = await textFromBytes(new Uint8Array(readFileSync(f.path)), "application/pdf");
      if (!t.ok) {
        appendFileSync(OUT, JSON.stringify({ path: f.path, cat: f.cat, failure: t.failure }) + "\n");
        continue;
      }
      const text = cleanCvText(t.text);
      const rules = parseCv(text, t.pages);
      const t0 = performance.now();
      // A stopped or busy model gets three tries, a minute apart, before the CV is recorded without it.
      let model = await readCvWithModel(text);
      for (let k = 0; !model && k < 2; k++) {
        await new Promise((r) => setTimeout(r, 61_000));
        model = await readCvWithModel(text);
      }
      const secs = Math.round((performance.now() - t0) / 1000);
      const row = {
        path: f.path,
        cat: f.cat,
        chars: text.length,
        pages: t.pages,
        secs,
        looksLikeCv: { rules: rules.looksLikeCv, model: model ? combine(rules, model, text).looksLikeCv : null },
        rules: check(rules.extraction, text),
        model: model ? check(combine(rules, model, text).extraction, text) : null,
      };
      appendFileSync(OUT, JSON.stringify(row) + "\n");
      console.log(`${done.size + n + 1}/${done.size + todo.length} ${f.cat} ${secs}s jobs ${row.rules.expectedJobs} → rules ${row.rules.jobs}, model ${row.model?.jobs ?? "—"}`);
    }
  });
});
