/**
 * Shared helpers for the question banks. Generated banks use a seeded generator, so the same question ids
 * always hold the same content and answers: a candidate's saved set of questions must mean the same thing after
 * a restart. Only relative imports, so the banks can be checked outside Next.
 */
import type { SampleItem } from "../../types/psychometrics";

/** Mulberry32: small, fast, good enough for laying out questions. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)]!,
    shuffle: <T>(xs: readonly T[]) => {
      const out = [...xs];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
  };
}
export type Rng = ReturnType<typeof rng>;

/** A string hashed to a seed. */
export function seedOf(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Shuffles a correct answer in among distractors, dropping repeats, and returns the options with the answer's
 * new position. Throws if there aren't enough different options, so a broken generator can't ship.
 */
export function withAnswer<T>(r: Rng, correct: T, distractors: T[], count = 4, key: (x: T) => string = String) {
  const seen = new Set([key(correct)]);
  const picked: T[] = [];
  for (const d of distractors) {
    if (picked.length === count - 1) break;
    if (seen.has(key(d))) continue;
    seen.add(key(d));
    picked.push(d);
  }
  if (picked.length < count - 1) throw new Error(`Not enough distinct options for ${key(correct)}`);
  const all = r.shuffle([correct, ...picked]);
  return { options: all, answer: all.findIndex((x) => key(x) === key(correct)) };
}

export const pad = (n: number) => String(n).padStart(2, "0");

/** Numbers as people write them in the region: thin-space thousands are hard to type, so commas. */
export const n0 = (x: number) => Math.round(x).toLocaleString("en-GB");
export const n1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** A finished bank item. `testId` is the bank's kind; delivery attaches the real test. */
export type BankItem = SampleItem & { difficulty: 1 | 2 | 3 };

/** Builds an authored multiple-choice item, putting the correct option first in the source and shuffling it. */
export function authored(
  r: Rng,
  id: string,
  kind: string,
  difficulty: 1 | 2 | 3,
  prompt: string,
  correct: string,
  wrong: string[],
  extra: Partial<SampleItem> = {},
): BankItem {
  const { options, answer } = withAnswer(r, correct, wrong, wrong.length + 1);
  return { id, testId: kind, practice: false, prompt, options, answer, difficulty, source: "original", ...extra };
}
