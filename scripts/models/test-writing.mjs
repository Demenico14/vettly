/**
 * Tests a local writing model (Gemma 4 via llama.cpp) on Vettly's writing tasks: a job description from a
 * vacancy's details, and interview questions as JSON. Usage: node scripts/models/test-writing.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? process.env.AI_WRITE_URL ?? "http://localhost:8095";

const VACANCY = {
  title: "Finance Manager",
  organisation: "Highveld Logistics",
  location: "Harare",
  department: "Finance",
  requirements: ["ACCA or CA qualification", "5+ years in financial reporting", "Month-end close and consolidation", "IFRS", "Team leadership"],
};

async function chat(content, maxTokens, json = false) {
  const t0 = performance.now();
  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "local",
      temperature: 0.3,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      // Gemma 4 thinks before answering by default; these short tasks don't need it.
      chat_template_kwargs: { enable_thinking: false },
      messages: [{ role: "user", content }],
    }),
    signal: AbortSignal.timeout(900_000),
  });
  const body = await res.json();
  return { text: body.choices?.[0]?.message?.content ?? JSON.stringify(body).slice(0, 300), ms: performance.now() - t0, usage: body.usage };
}

const show = (r) => `${(r.ms / 1000).toFixed(1)}s, ${r.usage?.completion_tokens ?? "?"} tokens out (${((r.usage?.completion_tokens ?? 0) / (r.ms / 1000)).toFixed(1)}/s)`;

// 1. Job description.
const jd = await chat(
  `Write a job description for the vacancy below, for a careers page. Plain, direct British English. Sections: About the role, What you'll do, What you'll bring. Use only the facts given; don't invent salary, benefits or company history. Under 300 words.\n\n${JSON.stringify(VACANCY, null, 2)}`,
  700,
);
const words = jd.text.split(/\s+/).filter(Boolean).length;
const jdChecks = {
  "mentions every requirement": ["ACCA", "IFRS", "month-end", "lead"].every((k) => jd.text.toLowerCase().includes(k.toLowerCase())),
  "no placeholders": !/\[[^\]]+\]|\{\{|lorem/i.test(jd.text),
  "has the three sections": ["About the role", "What you'll do", "What you'll bring"].every((h) => jd.text.toLowerCase().replace(/’/g, "'").includes(h.toLowerCase())),
  "under 320 words": words <= 320,
  "no invented salary": !/\$|US\$|salary of|per (annum|month)/i.test(jd.text),
};
console.log(`\nJOB DESCRIPTION: ${show(jd)}, ${words} words`);
for (const [k, v] of Object.entries(jdChecks)) console.log(`   ${v ? "✓" : "✗"} ${k}`);
console.log("---\n" + jd.text.slice(0, 1600) + "\n---");

// 2. Interview questions as JSON.
const iq = await chat(
  `Write 5 structured interview questions for this vacancy, one per requirement, each asking for a specific past example. Keep each question under 40 words and lookFor under 25 words. Reply with JSON only: {"questions":[{"requirement":string,"question":string,"lookFor":string}]}\n\n${JSON.stringify(VACANCY, null, 2)}`,
  1600,
  true,
);
let parsed = null;
try {
  parsed = JSON.parse(iq.text.slice(iq.text.indexOf("{"), iq.text.lastIndexOf("}") + 1));
} catch {
  /* reported */
}
const qs = parsed?.questions ?? [];
const iqChecks = {
  "valid JSON": !!parsed,
  "5 questions": qs.length === 5,
  "each has question and what to look for": qs.length > 0 && qs.every((q) => q.question?.length > 20 && q.lookFor?.length > 10),
  "asks for past examples": qs.filter((q) => /tell (me|us) about|describe a|give an example|walk (me|us) through|example of|when you|provide an instance|detail a/i.test(q.question ?? "")).length >= 4,
};
console.log(`\nINTERVIEW QUESTIONS: ${show(iq)}`);
for (const [k, v] of Object.entries(iqChecks)) console.log(`   ${v ? "✓" : "✗"} ${k}`);
for (const q of qs) console.log(`   • [${q.requirement}] ${q.question}`);
if (!parsed) console.log(iq.text.slice(0, 600));

const all = { ...jdChecks, ...iqChecks };
console.log(`\nTOTAL ${Object.values(all).filter(Boolean).length}/${Object.keys(all).length} checks`);
