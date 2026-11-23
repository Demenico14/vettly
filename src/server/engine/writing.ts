import "server-only";
/**
 * Writing help with the local writing model (Gemma, see src/server/ai/local.ts): job description drafts and
 * rewrites in the vacancy editor, and interview questions for a vacancy's requirements. Every answer is
 * checked before HR sees it; anything that fails a check is dropped, and the caller falls back to Vettly's
 * templates. Tested with scripts/models/test-writing.mjs.
 */
import { jsonIn, write } from "../ai/local";

export type WriteAction = "draft" | "inclusive" | "concise" | "formal";
export interface WriteInput {
  title: string;
  department: string;
  summary: string;
  responsibilities: string[];
}
export interface WriteResult {
  summary: string;
  responsibilities?: string[];
}

const STYLE = "Plain, direct British English, written to the candidate as \"you\". No buzzwords (rockstar, ninja, guru, synergy), no exclamation marks.";
const RULES = "Use only the facts given. Don't invent a salary, benefits, location, company history or requirements.";

/** Text that gives away a template or an invention: placeholders, money, or the model talking about itself. */
const BAD = /\[[^\]]*\]|\{\{|lorem ipsum|\bxx+\b|\$|US\$|\bsalary\b|per (annum|month)|as an ai\b|i cannot|here is|here's/i;

const clean = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

function prompt(action: WriteAction, input: WriteInput) {
  const facts = JSON.stringify({ title: input.title, department: input.department || undefined, responsibilities: input.responsibilities.filter(Boolean).length ? input.responsibilities.filter(Boolean) : undefined }, null, 2);
  if (action === "draft")
    return `Write the opening of a job description for a careers page, for the vacancy below. ${STYLE} ${RULES}
Reply with JSON only: {"summary": "2 to 3 sentences on what the role is for and who it works with", "responsibilities": ["4 to 6 specific responsibilities, each one line, starting with a verb"]}

${facts}`;
  const how =
    action === "concise"
      ? "Make it shorter and tighter: at most two sentences, keeping every fact."
      : action === "inclusive"
        ? "Make it inclusive: gender-neutral, no jargon or age-coded words (young, dynamic, digital native), and end with one sentence welcoming applicants of all backgrounds, including people with disabilities."
        : "Make it formal: no contractions, measured tone, keeping every fact.";
  return `Rewrite this job description summary. ${how} ${STYLE} ${RULES}
Reply with JSON only: {"summary": "the rewritten summary"}

Summary to rewrite:
${input.summary}`;
}

/** Gemma's draft or rewrite, checked. Null when the model isn't running or its answer didn't pass. */
export async function writeWithModel(action: WriteAction, input: WriteInput): Promise<WriteResult | null> {
  if (action === "draft" ? !input.title.trim() : !input.summary.trim()) return null;
  const reply = await write(prompt(action, input), { json: true, maxTokens: 700, temperature: 0.4 });
  const out = jsonIn<{ summary?: unknown; responsibilities?: unknown }>(reply ?? undefined);
  if (!out) return null;
  const summary = clean(out.summary);
  if (summary.length < 40 || summary.length > 900 || BAD.test(summary)) return null;
  if (action === "inclusive" && !/\bwelcome\b|all backgrounds/i.test(summary))
    return { summary: `${summary.replace(/[.\s]*$/, ".")} We welcome applications from people of all backgrounds, including people with disabilities.` };
  if (action !== "draft") return { summary };
  const responsibilities = (Array.isArray(out.responsibilities) ? out.responsibilities : []).map(clean).filter((r) => r.length >= 15 && r.length <= 200 && !BAD.test(r));
  if (responsibilities.length < 3) return null;
  return { summary, responsibilities: responsibilities.slice(0, 6) };
}

export interface WrittenQuestion {
  requirement: string;
  question: string;
  lookFor: string[];
}

/** One structured interview question per requirement, asking for a past example. Null when unavailable. */
export async function questionsWithModel(title: string, requirements: string[]): Promise<WrittenQuestion[] | null> {
  if (!requirements.length) return null;
  const reply = await write(
    `Write one structured interview question for each requirement of this ${title} vacancy. Each question asks for a specific past example (for example "Tell us about a time…"), is under 40 words, and is fair: nothing about age, family, religion, health or origin. For each, list 2 or 3 short things a strong answer shows. ${STYLE}
Reply with JSON only: {"questions":[{"requirement": "copied exactly from the list", "question": "…", "lookFor": ["…", "…"]}]}

Requirements:
${requirements.map((r) => `- ${r}`).join("\n")}`,
    { json: true, maxTokens: 1600, temperature: 0.3, timeoutMs: 240_000 },
  );
  const out = jsonIn<{ questions?: { requirement?: unknown; question?: unknown; lookFor?: unknown }[] }>(reply ?? undefined);
  if (!out?.questions?.length) return null;
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const PROTECTED = /\b(age|how old|married|children|pregnan|religio|church|health|disab|nationality|where are you from|tribe|ethnic)/i;
  const result: WrittenQuestion[] = [];
  for (const req of requirements) {
    const q = out.questions.find((x) => squash(clean(x.requirement)) === squash(req)) ?? out.questions[requirements.indexOf(req)];
    const question = clean(q?.question);
    const lookFor = (Array.isArray(q?.lookFor) ? q!.lookFor : []).map(clean).filter((l) => l.length >= 4 && l.length <= 120).slice(0, 3);
    if (question.length < 20 || question.length > 320 || BAD.test(question) || PROTECTED.test(question) || !lookFor.length) continue;
    result.push({ requirement: req, question, lookFor });
  }
  return result.length ? result : null;
}
