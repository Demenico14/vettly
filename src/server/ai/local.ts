import "server-only";
/**
 * Vettly's local AI models: open models from Hugging Face served by llama.cpp in Docker (`docker compose
 * --profile ai`, see scripts/models). Nothing leaves the server. Each model is optional and set by its own
 * address; when one isn't set or doesn't answer, callers get `null` and Vettly falls back to its rule-based
 * reader, matcher or templates.
 *
 *   AI_EXTRACT_URL  NuExtract 2.0 2B: CV text → structured profile
 *   AI_RERANK_URL   Qwen3-Reranker 0.6B: how well a CV line answers a requirement
 *   AI_WRITE_URL    Gemma 4 E2B: job description drafts, interview questions
 */

export type LocalModel = "extract" | "rerank" | "write";

const ENV: Record<LocalModel, string> = { extract: "AI_EXTRACT_URL", rerank: "AI_RERANK_URL", write: "AI_WRITE_URL" };

export const modelUrl = (m: LocalModel) => process.env[ENV[m]]?.replace(/\/+$/, "") || null;

/** Models that failed recently are skipped for a minute, so a stopped container doesn't slow every request. */
const downUntil = new Map<LocalModel, number>();
const warned = new Set<LocalModel>();

async function post<T>(m: LocalModel, path: string, body: unknown, timeoutMs: number): Promise<T | null> {
  const base = modelUrl(m);
  if (!base || (downUntil.get(m) ?? 0) > Date.now()) return null;
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    warned.delete(m);
    return (await res.json()) as T;
  } catch (e) {
    downUntil.set(m, Date.now() + 60_000);
    if (!warned.has(m)) {
      warned.add(m);
      console.warn(`[ai] ${m} model at ${base} didn't answer (${e instanceof Error ? e.message : e}); using the rule-based fallback for now.`);
    }
    return null;
  }
}

type Chat = { choices?: { message?: { content?: string } }[] };

/** The first JSON object in a reply, or null. */
export function jsonIn<T>(text: string | undefined): T | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** NuExtract: fills a JSON template from a document. Temperature 0, as its makers recommend. */
export async function extractWithTemplate<T>(template: unknown, text: string, timeoutMs = 120_000): Promise<T | null> {
  const r = await post<Chat>("extract", "/v1/chat/completions", { model: "local", temperature: 0, max_tokens: 2000, messages: [{ role: "user", content: `# Template:\n${JSON.stringify(template, null, 4)}\n${text}` }] }, timeoutMs);
  return jsonIn<T>(r?.choices?.[0]?.message?.content);
}

/** Qwen3-Reranker: a 0–1 relevance score for each document against the query, in the documents' order. */
export async function rerank(query: string, documents: string[], timeoutMs = 60_000): Promise<number[] | null> {
  if (!documents.length) return [];
  const r = await post<{ results?: { index: number; relevance_score: number }[] }>("rerank", "/v1/rerank", { model: "local", query, documents, top_n: documents.length }, timeoutMs);
  if (!r?.results) return null;
  const scores = new Array<number>(documents.length).fill(0);
  for (const x of r.results) scores[x.index] = x.relevance_score;
  return scores;
}

/** Gemma: a reply to one prompt. `json` asks for a JSON object. Thinking is off; these are short tasks. */
export async function write(prompt: string, opts: { maxTokens?: number; json?: boolean; temperature?: number; timeoutMs?: number } = {}): Promise<string | null> {
  const r = await post<Chat>(
    "write",
    "/v1/chat/completions",
    {
      model: "local",
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 1200,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      chat_template_kwargs: { enable_thinking: false },
      messages: [{ role: "user", content: prompt }],
    },
    opts.timeoutMs ?? 120_000,
  );
  return r?.choices?.[0]?.message?.content?.trim() || null;
}
