/**
 * Tests local OCR (PaddleOCR-VL via llama.cpp) on a fake scanned CV, then hands the text to the extraction
 * model, the way Vettly would handle a scan. Usage: node scripts/models/test-ocr.mjs <image> [ocrUrl] [extractUrl]
 */
import { readFileSync } from "node:fs";
import { CV_SAMPLES } from "./cv-samples.mjs";

const IMAGE = process.argv[2] ?? "models/samples/scan-tidy.jpg";
const OCR = process.argv[3] ?? process.env.AI_OCR_URL ?? "http://localhost:8094";
const EXTRACT = process.argv[4] ?? process.env.AI_EXTRACT_URL ?? "http://localhost:8091";

// The words printed on the scan (see make-scan.py): the "tidy" sample without its profile and availability lines.
const PRINTED = `Tatenda Moyo Senior Accountant tatenda.moyo@example.com | +263 77 123 4567 | Harare, Zimbabwe WORK EXPERIENCE
Senior Accountant, Delta Beverages March 2020 - Present Led month-end close for three business units and cut the reporting
cycle from ten days to six. Audit Senior, Ernst & Young Zimbabwe January 2016 - February 2020 EDUCATION
Bachelor of Accountancy (Honours), University of Zimbabwe, 2015 CERTIFICATIONS ACCA, Association of Chartered Certified Accountants, 2018
SKILLS IFRS, Sage Evolution, Excel, Power BI, team leadership`;

const words = (s) => s.toLowerCase().replace(/[^a-z0-9@.+]+/g, " ").trim().split(/\s+/);

const t0 = performance.now();
const img = readFileSync(IMAGE).toString("base64");
const res = await fetch(`${OCR}/v1/chat/completions`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    model: "local",
    temperature: 0,
    max_tokens: 2000,
    messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${img}` } }, { type: "text", text: "OCR:" }] }],
  }),
});
const body = await res.json();
const text = body.choices?.[0]?.message?.content ?? JSON.stringify(body).slice(0, 400);
const ocrMs = performance.now() - t0;

const want = words(PRINTED);
const got = new Set(words(text));
const found = want.filter((w) => got.has(w));
console.log(`OCR: ${(ocrMs / 1000).toFixed(1)}s, ${found.length}/${want.length} printed words recovered (${Math.round((100 * found.length) / want.length)}%)`);
const missing = [...new Set(want.filter((w) => !got.has(w)))];
if (missing.length) console.log(`   missing: ${missing.join(" ")}`);
console.log("---\n" + text.slice(0, 1200) + "\n---");

// Hand the OCR text to the extraction model and check the key fields.
const e = CV_SAMPLES.find((s) => s.id === "tidy").expected;
const template = { name: "verbatim-string", email: "verbatim-string", phone: "verbatim-string", location: "verbatim-string", currentEmployer: "verbatim-string", certifications: [{ name: "verbatim-string" }], skills: ["verbatim-string"] };
const t1 = performance.now();
const ex = await fetch(`${EXTRACT}/v1/chat/completions`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ model: "local", temperature: 0, max_tokens: 800, messages: [{ role: "user", content: `# Template:\n${JSON.stringify(template, null, 4)}\n${text}` }] }),
}).then((r) => r.json());
const raw = ex.choices?.[0]?.message?.content ?? "";
const p = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9+@.]/g, "");
const checks = {
  name: norm(p.name).includes(norm(e.name)),
  email: norm(p.email) === norm(e.email),
  phone: norm(p.phone).includes(norm(e.phone)),
  location: norm(p.location).includes(norm(e.location)),
  "current employer": norm(p.currentEmployer).includes(norm(e.currentEmployer)),
  certification: JSON.stringify(p.certifications ?? []).includes(e.certification),
  skills: e.skills.every((k) => (p.skills ?? []).some((x) => norm(x).includes(norm(k)))),
};
const ok = Object.values(checks).filter(Boolean).length;
console.log(`Extraction from the scan: ${((performance.now() - t1) / 1000).toFixed(1)}s, ${ok}/${Object.keys(checks).length} fields right`);
for (const [k, v] of Object.entries(checks)) if (!v) console.log(`   ✗ ${k}: got ${JSON.stringify(p[k === "current employer" ? "currentEmployer" : k])}`);
