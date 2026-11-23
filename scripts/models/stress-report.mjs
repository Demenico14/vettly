/**
 * Summarises a CV-reader stress run (tests/models/cv-stress.test.ts), or compares two on the CVs both read.
 * Usage: node scripts/models/stress-report.mjs models/stress/results.jsonl [models/stress/before.jsonl]
 */
import { readFileSync } from "node:fs";

const load = (f) => readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.rules);
const [afterFile, beforeFile] = process.argv.slice(2);
const after = load(afterFile ?? "models/stress/results.jsonl");
const before = beforeFile ? load(beforeFile) : null;
const paths = before ? new Set(before.map((r) => r.path)) : null;
const common = (rows) => (paths ? rows.filter((r) => paths.has(r.path) && after.some((a) => a.path === r.path)) : rows);

function summary(rows, who) {
  const R = rows.map((r) => r[who]).filter(Boolean);
  const sum = (f) => R.reduce((n, x) => n + f(x), 0);
  const jobs = sum((x) => x.jobs);
  return {
    CVs: R.length,
    "job count exactly right": `${sum((x) => (x.jobsRight ? 1 : 0))}/${R.length}`,
    "jobs found / expected": `${jobs}/${sum((x) => x.expectedJobs)}`,
    "jobs with dates": `${sum((x) => x.withDates)}/${jobs}`,
    "education missed": `${sum((x) => (x.hasEducation && x.education === 0 ? 1 : 0))}/${sum((x) => (x.hasEducation ? 1 : 0))}`,
    "sentence-like job titles": sum((x) => x.sentenceTitles),
    "junk certificates": sum((x) => x.junkCerts),
  };
}

const table = (cols) => {
  const keys = Object.keys(Object.values(cols)[0]);
  const names = Object.keys(cols);
  console.log(["".padEnd(26), ...names.map((n) => n.padEnd(16))].join(" "));
  for (const k of keys) console.log([k.padEnd(26), ...names.map((n) => String(cols[n][k]).padEnd(16))].join(" "));
};

const a = common(after);
const cols = { rules: summary(a, "rules"), model: summary(a, "model") };
if (before) cols["model before"] = summary(common(before), "model");
table(cols);
const secs = a.map((r) => r.secs);
console.log(`\nseconds per CV: median ${secs.sort((x, y) => x - y)[Math.floor(secs.length / 2)]}, max ${Math.max(...secs)}; failures to read: ${after.filter((r) => !r.rules).length}`);
