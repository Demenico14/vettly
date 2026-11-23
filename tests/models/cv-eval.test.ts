/**
 * Scores Vettly's CV reader against CVs with known answers: the rule-based reader alone, and the local model
 * combined with it (the path the app uses). Needs the extraction model running:
 *   docker compose --profile ai up -d ai-extract && pnpm test:models
 * Real CVs can be added locally in models/samples/private-cvs.json (same shape as CvCase; never committed).
 */
import { existsSync, readFileSync } from "node:fs";
import { it } from "vitest";
import type { CvExtraction } from "@/types";
import { cleanCvText, parseCv } from "@/server/engine/cv-parser";
import { combine, readCvWithModel } from "@/server/engine/cv-model";
import { CV_CASES, type CvCase } from "./cv-cases";

process.env.AI_EXTRACT_URL ??= "http://localhost:8091";

const PRIVATE = "models/samples/private-cvs.json";
const cases: CvCase[] = [...CV_CASES, ...(existsSync(PRIVATE) ? (JSON.parse(readFileSync(PRIVATE, "utf8")) as CvCase[]) : [])];
const only = process.env.CV_CASE;

const squash = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9@+]+/g, "");
const has = (got: string | null | undefined, want: string) => !!squash(want) && squash(got).includes(squash(want));

/** Points for one reading, and what it got wrong. */
function score(x: CvExtraction, a: CvCase["answer"]) {
  const misses: string[] = [];
  let points = 0;
  let total = 0;
  const check = (ok: boolean, label: string) => {
    total++;
    if (ok) points++;
    else misses.push(label);
  };
  check(has(x.name.value, a.name) && !x.name.flag, `name (got "${x.name.value}")`);
  check(squash(x.email.value) === squash(a.email), "email");
  check(squash(x.phone.value).replace(/\D/g, "").endsWith(squash(a.phone).replace(/\D/g, "").slice(-9)), "phone");
  check(has(x.location.value, a.location) && x.location.value.length <= a.location.length + 20, `location (got "${x.location.value}")`);
  check(x.experience.length === a.jobs.length, `${a.jobs.length} jobs (got ${x.experience.length})`);
  for (const j of a.jobs) {
    const got = x.experience.find((e) => has(e.company, j.company) || has(j.company, e.company)) ?? x.experience.find((e) => has(e.title, j.title));
    const label = `${j.title} @ ${j.company}`;
    check(!!got && has(got.title, j.title), `${label}: title (got "${got?.title ?? "-"}")`);
    check(!!got && (has(got.company, j.company) || has(j.company, got.company)) && !!got.company, `${label}: company (got "${got?.company ?? "-"}")`);
    check(!!got && got.start.startsWith(j.start), `${label}: start (got ${got?.start || "-"})`);
    check(!!got && (j.end === null ? got.end === null : (got.end ?? "").startsWith(j.end)), `${label}: end (got ${got ? (got.end ?? "current") : "-"})`);
  }
  for (const q of a.education) check(x.education.some((e) => has(`${e.qualification} ${e.field}`, q)), `education: ${q}`);
  check(x.education.length <= a.education.length + 1, `no extra education entries (got ${x.education.length})`);
  const certs = x.certifications ?? [];
  for (const c of a.certifications) check(certs.some((e) => has(e.name, c)), `certification: ${c}`);
  check(certs.length <= a.certifications.length + 1, `no junk certifications (got ${certs.map((c) => c.name).join("; ")})`);
  for (const s of a.skills) check(x.skills.some((k) => has(k, s)), `skill: ${s}`);
  return { points, total, misses };
}

it("scores the CV reader", async () => {
  const rows: string[] = [];
  let rTotal = 0;
  let mTotal = 0;
  let all = 0;
  for (const c of cases.filter((c) => !only || c.id === only)) {
    const text = cleanCvText(c.text);
    const rules = parseCv(text, 1);
    const r = score(rules.extraction, c.answer);
    const t0 = performance.now();
    const model = await readCvWithModel(text);
    const secs = ((performance.now() - t0) / 1000).toFixed(0);
    const m = model ? score(combine(rules, model, text).extraction, c.answer) : null;
    rTotal += r.points;
    mTotal += m?.points ?? 0;
    all += r.total;
    rows.push(`\n[${c.id}] rules ${r.points}/${r.total} · model ${m ? `${m.points}/${m.total}` : "didn't answer"} (${secs}s)`);
    if (m) for (const miss of m.misses) rows.push(`   model ✗ ${miss}`);
    for (const miss of r.misses) rows.push(`   rules ✗ ${miss}`);
  }
  console.log(rows.join("\n"));
  console.log(`\nTOTAL rules ${rTotal}/${all} (${Math.round((100 * rTotal) / all)}%) · model ${mTotal}/${all} (${Math.round((100 * mTotal) / all)}%)`);
});
