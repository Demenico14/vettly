/**
 * Tests local matching models: Qwen3-Embedding (similarity) and Qwen3-Reranker (scoring). For each requirement,
 * the right CV passage should come out on top. Usage: node scripts/models/test-matching.mjs
 */
const EMBED = process.env.AI_EMBED_URL ?? "http://localhost:8092";
const RERANK = process.env.AI_RERANK_URL ?? "http://localhost:8093";

// Passages from the sample CVs (scripts/models/cv-samples.mjs), plus a few near misses.
const PASSAGES = [
  "Senior Accountant, Delta Beverages, March 2020 - Present. Led month-end close for three business units and cut the reporting cycle from ten days to six.",
  "Audit Senior, Ernst & Young Zimbabwe, 2016 - 2020. Ran external audits for clients in mining and retail.",
  "ACCA, Association of Chartered Certified Accountants, 2018",
  "Skills: IFRS, Sage Evolution, Excel, Power BI, team leadership",
  "Fleet Supervisor, Swift Transport (Pvt) Ltd, 2021 to date. Managed 40 trucks, fuel and tracking (Cartrack).",
  "Class 2 drivers licence",
  "Data Engineer, Econet Wireless (Jun 2022 – present): built the billing data pipeline on Airflow and dbt.",
  "BSc Computer Science, National University of Science and Technology (NUST), 2019",
];

// Each requirement and the index of the passage that best answers it. Wording deliberately differs from the CV.
const REQUIREMENTS = [
  { text: "Holds a professional accounting qualification such as ACCA or CA", best: 2 },
  { text: "Experience closing the books at month end", best: 0 },
  { text: "Has worked in external audit", best: 1 },
  { text: "Can prepare financial statements under international reporting standards", best: 3 },
  { text: "Has managed a fleet of heavy vehicles", best: 4 },
];

const TASK = "Given a job requirement, retrieve the CV passage that shows the candidate meets it";

async function embed(texts) {
  const res = await fetch(`${EMBED}/v1/embeddings`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: "local", input: texts }) });
  const body = await res.json();
  if (!body.data) throw new Error(JSON.stringify(body).slice(0, 300));
  return body.data.map((d) => d.embedding);
}
const cos = (a, b) => {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    na += a[i] ** 2;
    nb += b[i] ** 2;
  }
  return d / Math.sqrt(na * nb);
};

let t0 = performance.now();
const passageVecs = await embed(PASSAGES);
const reqVecs = await embed(REQUIREMENTS.map((r) => `Instruct: ${TASK}\nQuery: ${r.text}`));
const embedMs = performance.now() - t0;

let embedHits = 0;
let rerankHits = 0;
t0 = performance.now();
for (const [i, r] of REQUIREMENTS.entries()) {
  const sims = passageVecs.map((p) => cos(reqVecs[i], p));
  const eTop = sims.indexOf(Math.max(...sims));
  if (eTop === r.best) embedHits++;

  const res = await fetch(`${RERANK}/v1/rerank`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: "local", query: r.text, documents: PASSAGES, top_n: 3 }) });
  const body = await res.json();
  if (!body.results) throw new Error(JSON.stringify(body).slice(0, 300));
  const rTop = body.results[0].index;
  if (rTop === r.best) rerankHits++;
  const fmt = (x) => x.toFixed(2);
  console.log(`\n"${r.text}"`);
  console.log(`   embedding top: #${eTop} (${fmt(sims[eTop])}) ${eTop === r.best ? "✓" : `✗ wanted #${r.best} (${fmt(sims[r.best])})`}`);
  console.log(`   reranker  top: #${rTop} (${fmt(body.results[0].relevance_score)}) ${rTop === r.best ? "✓" : `✗ wanted #${r.best}`}, next #${body.results[1].index} (${fmt(body.results[1].relevance_score)})`);
}
const rerankMs = performance.now() - t0;

// Requirements no passage meets: every score should stay low, so Vettly can say "no evidence on the CV".
for (const text of ["Speaks fluent Portuguese", "Registered nurse with a practising certificate"]) {
  const res = await fetch(`${RERANK}/v1/rerank`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: "local", query: text, documents: PASSAGES, top_n: 1 }) });
  const top = (await res.json()).results[0];
  console.log(`\nNo evidence expected for "${text}": best score ${top.relevance_score.toFixed(2)} (#${top.index}) ${top.relevance_score < 0.3 ? "✓" : "✗ too high"}`);
}
console.log(`\nEMBEDDING ${embedHits}/${REQUIREMENTS.length} right (${(embedMs / 1000).toFixed(1)}s for ${PASSAGES.length + REQUIREMENTS.length} texts)`);
console.log(`RERANKER  ${rerankHits}/${REQUIREMENTS.length} right (${(rerankMs / 1000).toFixed(1)}s for ${REQUIREMENTS.length} × ${PASSAGES.length} pairs)`);
