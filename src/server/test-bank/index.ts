/**
 * The psychometric question banks: one bank of 50 to 60 questions per kind of test, plus practice questions.
 * Every test draws its questions from its kind's bank; each candidate gets a random set (20 to 30 questions,
 * fewer for long scenarios), fixed once drawn and kept on the invitation, so a reload shows the same set and
 * two candidates rarely see the same one. Operational tests draw easier questions, manager tests harder ones;
 * questionnaires draw evenly across their scales.
 *
 * Server only: banks hold the answer keys. Nothing here may be imported by a browser component.
 */
import type { SampleItem, Test } from "../../types/psychometrics";
import { accountingBank } from "./accounting";
import { checkingBank } from "./checking";
import { criticalBank } from "./critical";
import { eiBank } from "./ei";
import { englishBank } from "./english";
import { integrityBank } from "./integrity";
import { logicalBank } from "./logical";
import { mechanicalBank } from "./mechanical";
import { motivationBank } from "./motivation";
import { numericalBank } from "./numerical";
import { patternBank } from "./abstract";
import { personalityBank } from "./personality";
import { sjtBank, sjtPractice } from "./sjt";
import { spatialBank } from "./spatial";
import { spreadsheetBank } from "./spreadsheet";
import { type BankItem, rng, seedOf } from "./util";
import { verbalBank } from "./verbal";

export type BankKind =
  | "numerical"
  | "verbal"
  | "pattern"
  | "logical"
  | "critical"
  | "mechanical"
  | "spatial"
  | "checking"
  | "spreadsheet"
  | "personality"
  | "sjt"
  | "integrity"
  | "ei"
  | "motivation"
  | "english"
  | "accounting";

export const BANKS: Record<BankKind, { label: string; items: BankItem[]; pictures: boolean }> = {
  numerical: { label: "Numerical reasoning", items: numericalBank, pictures: true },
  verbal: { label: "Verbal reasoning", items: verbalBank, pictures: false },
  pattern: { label: "Pattern reasoning", items: patternBank, pictures: true },
  logical: { label: "Logical reasoning", items: logicalBank, pictures: false },
  critical: { label: "Critical thinking", items: criticalBank, pictures: false },
  mechanical: { label: "Mechanical reasoning", items: mechanicalBank, pictures: true },
  spatial: { label: "Spatial reasoning", items: spatialBank, pictures: true },
  checking: { label: "Data checking", items: checkingBank, pictures: true },
  spreadsheet: { label: "Spreadsheet skills", items: spreadsheetBank, pictures: true },
  personality: { label: "Personality", items: personalityBank, pictures: false },
  sjt: { label: "Situational judgement", items: [...sjtBank, sjtPractice], pictures: false },
  integrity: { label: "Integrity", items: integrityBank, pictures: false },
  ei: { label: "Emotional intelligence", items: eiBank, pictures: false },
  motivation: { label: "Motivation", items: motivationBank, pictures: false },
  english: { label: "Business English", items: englishBank, pictures: false },
  accounting: { label: "Accounting", items: accountingBank, pictures: false },
};

/** Which bank each test draws from; tests not listed (coding, typing) need their own players. */
const TEST_BANK: Record<string, BankKind> = {
  tst_num_grad: "numerical",
  tst_num_prof: "numerical",
  tst_num_mgr: "numerical",
  tst_num_ops: "numerical",
  tst_verb_grad: "verbal",
  tst_verb_prof: "verbal",
  tst_verb_mgr: "verbal",
  tst_verb_ops: "english",
  tst_inductive: "pattern",
  tst_deductive: "logical",
  tst_critical: "critical",
  tst_mechanical: "mechanical",
  tst_spatial: "spatial",
  tst_checking: "checking",
  tst_excel: "spreadsheet",
  tst_work_styles: "personality",
  tst_six_factor: "personality",
  tst_big_five: "personality",
  tst_sjt_prof: "sjt",
  tst_sjt_service: "sjt",
  tst_sjt_lead: "sjt",
  tst_sjt_sales: "sjt",
  tst_integrity: "integrity",
  tst_ei: "ei",
  tst_motivation: "motivation",
  tst_english: "english",
  tst_accounting: "accounting",
};

/** Themes each judgement test draws, best fit first. */
const SJT_THEMES: Record<string, string[]> = {
  tst_sjt_prof: ["prioritise", "team", "client", "ethics"],
  tst_sjt_service: ["service", "client", "team", "ethics"],
  tst_sjt_lead: ["people", "change", "team", "prioritise"],
  tst_sjt_sales: ["sales", "client", "ethics", "prioritise"],
};

export const bankKindOf = (testId: string): BankKind | null => TEST_BANK[testId] ?? null;

const allItems = new Map<string, BankItem>(Object.values(BANKS).flatMap((b) => b.items.map((i) => [i.id, i] as const)));
export const bankItem = (id: string) => allItems.get(id);

/** Questions a test may use: its bank, narrowed by level for ability tests and by theme for judgement tests. */
export function poolFor(test: Pick<Test, "id" | "level">): BankItem[] {
  const kind = bankKindOf(test.id);
  if (!kind) return [];
  const scored = BANKS[kind].items.filter((i) => !i.practice);
  if (kind === "sjt") {
    const themes = SJT_THEMES[test.id] ?? [];
    return themes.flatMap((t) => scored.filter((i) => i.tags?.includes(t)));
  }
  if (test.level === "operational") return scored.filter((i) => i.difficulty <= 2);
  if (test.level === "manager") return scored.filter((i) => i.difficulty >= 2);
  return scored;
}

export const practiceFor = (testId: string): BankItem[] => {
  const kind = bankKindOf(testId);
  return kind ? BANKS[kind].items.filter((i) => i.practice) : [];
};

const QUESTIONNAIRES: BankKind[] = ["personality", "integrity", "ei", "motivation"];

/** How many questions a candidate gets: 20 to 30, judgement tests 12 to 16, questionnaires 30 (motivation 36). */
export function formSize(test: Pick<Test, "id" | "items">): number {
  const kind = bankKindOf(test.id);
  if (!kind) return 0;
  if (kind === "sjt") return Math.max(12, Math.min(16, test.items));
  if (kind === "motivation") return 36;
  if (QUESTIONNAIRES.includes(kind)) return 30;
  return Math.max(20, Math.min(30, test.items));
}

/** The time limit for a drawn set: the published limit scaled by questions, never under five minutes. */
export function timeLimitFor(test: Pick<Test, "timeLimitMin" | "items">, questions: number): number | null {
  if (test.timeLimitMin === null) return null;
  return Math.max(5, Math.round((test.timeLimitMin * questions) / Math.max(1, test.items)));
}

/**
 * Draws a candidate's set for a test. Seeded by invitation and test, so drawing again gives the same set.
 * Questionnaires take questions evenly from each scale; others take a spread of difficulty; passages keep
 * their statements together so a candidate doesn't reread the same text for one question.
 */
export function drawForm(test: Pick<Test, "id" | "level" | "items">, seed: string): string[] {
  const kind = bankKindOf(test.id);
  if (!kind) return [];
  const r = rng(seedOf(`${seed}:${test.id}`));
  const pool = poolFor(test);
  const n = Math.min(formSize(test), pool.length);
  let chosen: BankItem[];
  if (QUESTIONNAIRES.includes(kind) || kind === "sjt") {
    const scales = [...new Set(pool.map((i) => i.scale ?? ""))];
    const byScale = scales.map((s) => r.shuffle(pool.filter((i) => (i.scale ?? "") === s)));
    chosen = [];
    for (let k = 0; chosen.length < n; k++) for (const list of byScale) if (chosen.length < n && list[k]) chosen.push(list[k]!);
  } else if (kind === "verbal" || pool.some((i) => i.tags?.some((t) => t.startsWith("text_")))) {
    // Whole passages first, then single questions to make up the number.
    const groups = new Map<string, BankItem[]>();
    for (const i of pool) {
      const g = i.tags?.find((t) => t.startsWith("passage_") || t.startsWith("text_")) ?? i.id;
      groups.set(g, [...(groups.get(g) ?? []), i]);
    }
    chosen = [];
    for (const g of r.shuffle([...groups.values()])) {
      if (chosen.length >= n) break;
      chosen.push(...g.slice(0, n - chosen.length));
    }
  } else {
    chosen = r.shuffle(pool).slice(0, n);
    chosen.sort((a, b) => a.difficulty - b.difficulty);
  }
  return chosen.map((i) => i.id);
}

/** What a candidate may see: never the answer, the explanation, the scoring key or the expert ratings. */
export function forCandidate(i: SampleItem): SampleItem {
  const { answer: _a, explanation: _e, keyed: _k, effectiveness: _f, ...rest } = i;
  void _a;
  void _e;
  void _k;
  void _f;
  return rest;
}

/** Bank sizes, for the HR library and checks. */
export function bankStats() {
  return (Object.keys(BANKS) as BankKind[]).map((k) => ({ kind: k, label: BANKS[k].label, questions: BANKS[k].items.filter((i) => !i.practice).length, practice: BANKS[k].items.filter((i) => i.practice).length, pictures: BANKS[k].pictures }));
}
