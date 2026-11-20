#!/usr/bin/env node
/**
 * Validates the mock psychometric database (src/mocks/psychometrics).
 * Compiles it on its own with tsc (it uses only relative imports), then checks referential integrity,
 * answer keys, score consistency, the sten distribution and naming rules. Run: node scripts/check-psychometrics.mjs
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "node_modules/.cache/psychometrics-check");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
execFileSync(
  path.join(root, "node_modules/.bin/tsc"),
  ["src/mocks/psychometrics/index.ts", "--outDir", out, "--rootDir", "src", "--module", "commonjs", "--moduleResolution", "node", "--target", "es2022", "--skipLibCheck", "--strict", "--noUncheckedIndexedAccess"],
  { cwd: root, stdio: "inherit" },
);
writeFileSync(path.join(out, "package.json"), JSON.stringify({ type: "commonjs" }));
const require = createRequire(import.meta.url);
const db = require(path.join(out, "mocks/psychometrics/index.js"));
const lib = require(path.join(out, "lib/psychometrics.js"));

const problems = [];
const fail = (msg) => problems.push(msg);
const ok = (cond, msg) => cond || fail(msg);

const testIds = new Set();
const normCodes = new Set(db.normGroups.map((n) => n.code));
const publisherIds = new Set(db.publishers.map((p) => p.id));
const familyCodes = new Set(db.families.map((f) => f.code));

/* Vendor product and scale names that must not appear (research report, licensing section). */
const BLOCKLIST = [/\bOPQ/i, /\bVerify\b/, /\bSwift\b/, /\bWave\b/, /\bElements\b/, /\bDimensions\b/, /\bAspects\b/, /\bHPI\b/, /\bHDS\b/, /\bMVPI\b/, /ADEPT/i, /\bCCAT\b/, /\bUCAT\b/, /16PF/i, /\bMBTI\b/i, /NEO-?PI/i, /\bDiSC\b/i, /Raven/i, /Watson.?Glaser/i, /Wonderlic/i, /\bPAPI\b/, /Logiks/i, /Caliper/i, /Predictive Index/i, /Talent Basics/i, /Prospect Screener/i, /\bIWPR\b/, /HEXACO-PI/i, /\bICAR\b/];
const named = (label, text) => BLOCKLIST.forEach((re) => re.test(text) && fail(`${label}: uses blocked name ${re} in "${text}"`));

for (const t of db.tests) {
  ok(!testIds.has(t.id), `Duplicate test id ${t.id}`);
  testIds.add(t.id);
  ok(familyCodes.has(t.family), `${t.id}: unknown family ${t.family}`);
  ok(publisherIds.has(t.publisherId), `${t.id}: unknown publisher ${t.publisherId}`);
  ok(t.isMock === true, `${t.id}: missing isMock`);
  ok(t.normGroups.includes(t.defaultNorm), `${t.id}: default norm not in its norm list`);
  ok(t.items <= t.itemBankSize, `${t.id}: more items than the bank holds`);
  if (t.timeLimitMin !== null) ok(t.medianCompletionMin <= t.timeLimitMin, `${t.id}: median time above the limit`);
  else ok(t.timing === "untimed", `${t.id}: no time limit but timing is ${t.timing}`);
  if (t.scoringModel === "thurstonian_irt" || t.scoringModel === "classical_ipsative") ok(t.itemFormat === "forced_choice_triad", `${t.id}: forced-choice scoring on a non-forced-choice format`);
  if (t.publisherId === "pub_vettly_ipip") ok(t.family === "personality", `${t.id}: IPIP publisher on a non-personality test`);
  if (t.hpcsaClassified) ok(t.practitionerRequired, `${t.id}: classified test must require a practitioner`);
  ok(t.scales.length > 0, `${t.id}: no scales`);
  ok(new Set(t.scales.map((s) => s.code)).size === t.scales.length, `${t.id}: duplicate scale codes`);
  ok(t.reliability.every((r) => r.value > 0 && r.value < 1), `${t.id}: reliability outside 0–1`);
  ok(t.reliability.length > 0 && t.validity.length > 0, `${t.id}: missing reliability or validity evidence (EEA s.8)`);
  named(t.id, `${t.name} ${t.shortName} ${t.summary} ${t.scales.map((s) => s.name).join(" ")}`);
  for (const code of t.normGroups) {
    ok(normCodes.has(code), `${t.id}: unknown norm ${code}`);
    const rows = db.normTables.filter((n) => n.testId === t.id && n.normCode === code);
    const scaleLevel = rows.some((r) => r.scale);
    if (scaleLevel) for (const s of t.scales) ok(rows.some((r) => r.scale === s.code), `${t.id}/${code}: no norm for scale ${s.code}`);
    else ok(rows.length === 1, `${t.id}/${code}: expected one total-score norm, found ${rows.length}`);
    rows.forEach((r) => ok(r.sd > 0 && r.n >= 300 || t.family === "work_sample", `${t.id}/${code}: norm n ${r.n} below 300 or sd ≤ 0`));
  }
}
for (const n of db.normTables) ok(testIds.has(n.testId), `Norm table for unknown test ${n.testId}`);

/* Batteries */
// Default batteries used by new organisations and new vacancies must exist.
const defaults = readFileSync(path.join(root, "src/lib/settings-defaults.ts"), "utf8") + readFileSync(path.join(root, "src/lib/workflow.ts"), "utf8");
for (const id of [...defaults.matchAll(/(?:battery: |": )"([a-z_]+)"/g)].map((m) => m[1]).filter((id) => db.batteries.some((b) => b.id === id) || /^(finance|software|sales|operations|professional|leadership|graduate|customer_service|technical|administrative)$/.test(id))) ok(db.getBattery(id), `A default uses unknown battery "${id}"`);
for (const b of db.batteries) {
  for (const c of b.components) ok(testIds.has(c.testId), `${b.id}: unknown test ${c.testId}`);
  const w = Object.values(b.weights).reduce((s, v) => s + v, 0);
  ok(Math.abs(w - 1) < 0.001, `${b.id}: weights sum to ${w}`);
  ok(b.totalMinutes >= 15 && b.totalMinutes <= 120, `${b.id}: implausible duration ${b.totalMinutes}`);
  named(b.id, b.label);
}

/* Sample items */
for (const it of db.sampleItems) {
  ok(testIds.has(it.testId), `${it.id}: unknown test`);
  if (it.scale) ok(db.getTest(it.testId).scales.some((s) => s.code === it.scale), `${it.id}: unknown scale ${it.scale}`);
  if (it.answer !== undefined) ok(it.options && it.answer >= 0 && it.answer < it.options.length, `${it.id}: answer out of range`);
  if (it.effectiveness) ok(it.options && it.effectiveness.length === it.options.length, `${it.id}: effectiveness key length`);
}
const key = (id) => db.sampleItems.find((i) => i.id === id);
const answer = (id) => key(id).options[key(id).answer];
ok(answer("itm_num_1") === `${Math.round((462 / 420 - 1) * 100)}%`, "itm_num_1 key");
ok(answer("itm_num_4") === `${Math.round((168 / (462 + 279 + 168)) * 100)}%`, "itm_num_4 key");
ok(answer("itm_num_3") === `USD ${(18500 / 18.5).toLocaleString("en-ZA").replace(/ /g, " ")}`, "itm_num_3 key");
ok(answer("itm_num_5") === String(24 * 12 - 37), "itm_num_5 key");
ok(answer("itm_ind_1") === "42", "itm_ind_1 key");
ok(answer("itm_ind_2") === String.fromCharCode("L".charCodeAt(0) + 3), "itm_ind_2 key");

/* Scoring */
ok(Math.abs(lib.normalCdf(1.96) - 0.975) < 0.0005, "normalCdf(1.96) ≠ .975");
ok(lib.sten(0) === 6 && lib.sten(-0.01) === 5, "sten mid-point");
ok(lib.stanine(0) === 5 && lib.tScore(1) === 60, "stanine / T");
// mulberry32: small, well-distributed PRNG so the check is deterministic.
let seed = 42;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const counts = Array(10).fill(0);
const N = 200000;
for (let i = 0; i < N; i++) {
  const z = Math.sqrt(-2 * Math.log(rand() || 1e-12)) * Math.cos(2 * Math.PI * rand());
  counts[lib.sten(z) - 1]++;
}
counts.forEach((c, i) => ok(Math.abs((c / N) * 100 - lib.STEN_DISTRIBUTION[i]) < 0.4, `sten ${i + 1}: ${(c / N * 100).toFixed(2)}% vs expected ${lib.STEN_DISTRIBUTION[i]}%`));

/* Report */
console.log(`Tests ${db.tests.length} · families ${db.families.length} · norm groups ${db.normGroups.length} · norm rows ${db.normTables.length} · batteries ${db.batteries.length} · sample items ${db.sampleItems.length}`);
for (const b of db.batteries) console.log(`  ${b.label.padEnd(28)} ${String(b.totalMinutes).padStart(3)} min  ${db.batterySummary(b)}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAll psychometric data checks passed.");
