/**
 * Tests a local extraction model (NuExtract, served by llama.cpp) on the sample CVs: accuracy against the
 * known answers, and time per CV. Usage: node scripts/models/test-cv-extract.mjs [baseUrl] [promptStyle]
 *   promptStyle "v2" (NuExtract 2.0: "# Template:" then the text) or "v3" (NuExtract3, same layout).
 */
import { CV_SAMPLES } from "./cv-samples.mjs";

const BASE = process.argv[2] ?? "http://localhost:8091";

// Mirrors CvExtraction in src/types/index.ts, in NuExtract's template language.
const TEMPLATE = {
  name: "verbatim-string",
  email: "verbatim-string",
  phone: "verbatim-string",
  location: "verbatim-string",
  headline: "string",
  currentEmployer: "verbatim-string",
  availability: "string",
  summary: "string",
  experience: [{ title: "verbatim-string", employer: "verbatim-string", start: "string", end: "string", description: "string" }],
  education: [{ qualification: "verbatim-string", institution: "verbatim-string", year: "integer" }],
  certifications: [{ name: "verbatim-string", issuer: "verbatim-string", year: "integer" }],
  skills: ["verbatim-string"],
};

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9+@.]/g, "");
const has = (got, want) => norm(got).includes(norm(want));

async function extract(text) {
  const t0 = performance.now();
  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "local",
      temperature: 0,
      max_tokens: 1500,
      messages: [{ role: "user", content: `# Template:\n${JSON.stringify(TEMPLATE, null, 4)}\n${text}` }],
    }),
  });
  const body = await res.json();
  const ms = performance.now() - t0;
  const raw = body.choices?.[0]?.message?.content ?? "";
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  let parsed = null;
  try {
    parsed = JSON.parse(json);
  } catch {
    /* reported below */
  }
  return { ms, raw, parsed, tokens: body.usage };
}

let passed = 0;
let total = 0;
for (const s of CV_SAMPLES) {
  const { ms, parsed, raw, tokens } = await extract(s.text);
  const e = s.expected;
  const checks = parsed
    ? {
        "valid JSON": true,
        name: has(parsed.name, e.name),
        email: norm(parsed.email) === norm(e.email),
        phone: has(parsed.phone, e.phone),
        location: has(parsed.location, e.location),
        "current employer": has(parsed.currentEmployer, e.currentEmployer),
        [`${e.experienceCount} jobs`]: (parsed.experience ?? []).length === e.experienceCount,
        [`${e.educationCount} qualification`]: (parsed.education ?? []).length === e.educationCount,
        certification: JSON.stringify(parsed.certifications ?? []).toLowerCase().includes(e.certification.toLowerCase()) || JSON.stringify(parsed.education ?? []).toLowerCase().includes(e.certification.toLowerCase()),
        skills: e.skills.every((k) => (parsed.skills ?? []).some((x) => has(x, k))),
      }
    : { "valid JSON": false };
  const ok = Object.values(checks).filter(Boolean).length;
  passed += ok;
  total += Object.keys(checks).length;
  console.log(`\n[${s.id}] ${(ms / 1000).toFixed(1)}s, ${tokens?.prompt_tokens ?? "?"} in / ${tokens?.completion_tokens ?? "?"} out, ${ok}/${Object.keys(checks).length} checks`);
  for (const [k, v] of Object.entries(checks)) if (!v) console.log(`   ✗ ${k}`);
  if (!parsed) console.log(raw.slice(0, 400));
  else console.log(`   → ${parsed.name} | ${parsed.currentEmployer} | ${(parsed.experience ?? []).map((x) => `${x.title} @ ${x.employer}`).join("; ")}`);
}
console.log(`\nTOTAL ${passed}/${total} checks`);
