import { describe, expect, it } from "vitest";
import { BANKS, type BankKind, bankKindOf, drawForm, formSize, forCandidate, poolFor, timeLimitFor } from "@/server/test-bank";
import { tests } from "@/mocks/psychometrics";

const kinds = Object.keys(BANKS) as BankKind[];
const QUESTIONNAIRES: BankKind[] = ["personality", "integrity", "ei", "motivation"];

describe("question banks", () => {
  it.each(kinds)("%s has 50 to 60 scored questions and at least one practice question", (kind) => {
    const scored = BANKS[kind].items.filter((i) => !i.practice);
    expect(scored.length).toBeGreaterThanOrEqual(50);
    expect(scored.length).toBeLessThanOrEqual(60);
    expect(BANKS[kind].items.some((i) => i.practice)).toBe(true);
  });

  it("gives every question its own id", () => {
    const ids = kinds.flatMap((k) => BANKS[k].items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(kinds.filter((k) => !QUESTIONNAIRES.includes(k) && k !== "sjt"))("%s: every answer points at one of several different options", (kind) => {
    for (const i of BANKS[kind].items) {
      expect(i.options?.length, i.id).toBeGreaterThanOrEqual(2);
      expect(new Set(i.options).size, `${i.id} repeats an option`).toBe(i.options!.length);
      expect(i.answer, i.id).toBeGreaterThanOrEqual(0);
      expect(i.answer, i.id).toBeLessThan(i.options!.length);
      if (i.optionFigures) {
        expect(i.optionFigures.length, i.id).toBe(i.options!.length);
        expect(new Set(i.optionFigures.map((f) => JSON.stringify(f))).size, `${i.id} repeats a picture option`).toBe(i.options!.length);
      }
    }
  });

  it.each(QUESTIONNAIRES)("%s: every statement has a scale and a scoring direction", (kind) => {
    for (const i of BANKS[kind].items.filter((x) => !x.practice)) {
      expect(i.scale, i.id).toBeTruthy();
      expect(["+", "-"]).toContain(i.keyed);
    }
  });

  it("rates every judgement response, with one clear most effective response", () => {
    for (const i of BANKS.sjt.items) {
      expect(i.effectiveness?.length, i.id).toBe(i.options?.length);
      expect(i.effectiveness!.every((e) => e >= 1 && e <= 4), i.id).toBe(true);
      const best = Math.max(...i.effectiveness!);
      expect(i.effectiveness!.filter((e) => e === best).length, `${i.id} has two best responses`).toBe(1);
    }
  });

  it("never shows a broken value in a question", () => {
    for (const k of kinds)
      for (const i of BANKS[k].items) {
        const text = JSON.stringify([i.stimulus, i.prompt, i.options, i.figure]);
        expect(text, i.id).not.toMatch(/undefined|NaN|Infinity|\[object/);
      }
  });

  it("keeps personality to the 50 public-domain IPIP markers, ten per trait", () => {
    const items = BANKS.personality.items.filter((i) => !i.practice);
    expect(items.every((i) => i.source === "ipip")).toBe(true);
    for (const t of ["es", "ag", "co", "ex", "op"]) expect(items.filter((i) => i.scale === t)).toHaveLength(10);
  });
});

describe("drawing a candidate's set", () => {
  const banked = tests.filter((t) => bankKindOf(t.id));

  it("covers every test except the coding and typing work samples", () => {
    expect(tests.filter((t) => !bankKindOf(t.id)).map((t) => t.id).sort()).toEqual(["tst_coding", "tst_typing"]);
  });

  it.each(banked.map((t) => [t.id, t] as const))("%s has enough questions for its set", (_, t) => {
    expect(poolFor(t).length).toBeGreaterThanOrEqual(formSize(t));
  });

  it.each(banked.map((t) => [t.id, t] as const))("%s draws the same set for the same invitation, with no repeats", (_, t) => {
    const a = drawForm(t, "inv_abc");
    expect(a).toEqual(drawForm(t, "inv_abc"));
    expect(new Set(a).size).toBe(a.length);
    expect(a.length).toBe(formSize(t));
  });

  it("gives different candidates different sets", () => {
    const t = tests.find((x) => x.id === "tst_num_prof")!;
    expect(drawForm(t, "inv_1")).not.toEqual(drawForm(t, "inv_2"));
  });

  it("spreads questionnaire sets evenly across scales", () => {
    const t = tests.find((x) => x.id === "tst_big_five")!;
    const ids = drawForm(t, "inv_x");
    const counts = ["es", "ag", "co", "ex", "op"].map((s) => ids.filter((id) => BANKS.personality.items.find((i) => i.id === id)?.scale === s).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("keeps operational tests to easier questions and manager tests to harder ones", () => {
    const ops = tests.find((x) => x.id === "tst_num_ops")!;
    const mgr = tests.find((x) => x.id === "tst_num_mgr")!;
    expect(poolFor(ops).every((i) => i.difficulty <= 2)).toBe(true);
    expect(poolFor(mgr).every((i) => i.difficulty >= 2)).toBe(true);
  });

  it("scales the time limit to the set", () => {
    expect(timeLimitFor({ timeLimitMin: 18, items: 16 }, 24)).toBe(27);
    expect(timeLimitFor({ timeLimitMin: 8, items: 60 }, 30)).toBe(5);
    expect(timeLimitFor({ timeLimitMin: null, items: 50 }, 30)).toBeNull();
  });

  it("strips answers, explanations and keys before anything reaches a candidate", () => {
    for (const k of kinds)
      for (const i of BANKS[k].items) {
        const c = forCandidate(i);
        expect(c).not.toHaveProperty("answer");
        expect(c).not.toHaveProperty("explanation");
        expect(c).not.toHaveProperty("keyed");
        expect(c).not.toHaveProperty("effectiveness");
      }
  });
});

describe("scoring a drawn set", () => {
  const raw = (res: { scores: { raw: number }[] }, i = 0) => res.scores[i]!.raw;
  const items = (t: (typeof tests)[number]) => drawForm(t, "inv_score").map((id) => Object.values(BANKS).flatMap((b) => b.items).find((i) => i.id === id)!);

  it("rewards right answers on ability tests", async () => {
    const { scoreForm } = await import("@/server/test-bank/score");
    const t = tests.find((x) => x.id === "tst_inductive")!;
    const form = items(t);
    const right = Object.fromEntries(form.map((i) => [i.id, i.answer!]));
    const wrong = Object.fromEntries(form.map((i) => [i.id, (i.answer! + 1) % i.options!.length]));
    expect(raw(scoreForm(t, form, right))).toBeGreaterThan(raw(scoreForm(t, form, wrong)));
  });

  it("raises a questionnaire scale when the candidate agrees with its positive statements, respecting reverse keys", async () => {
    const { scoreForm } = await import("@/server/test-bank/score");
    const t = tests.find((x) => x.id === "tst_integrity")!;
    const form = items(t);
    const high = Object.fromEntries(form.map((i) => [i.id, i.keyed === "+" ? 4 : 0]));
    const low = Object.fromEntries(form.map((i) => [i.id, i.keyed === "+" ? 0 : 4]));
    const a = scoreForm(t, form, high);
    const b = scoreForm(t, form, low);
    a.scores.forEach((s, k) => expect(s.raw).toBeGreaterThan(b.scores[k]!.raw));
  });

  it("maps emotional sensitivity opposite to emotional stability", async () => {
    const { scoreForm } = await import("@/server/test-bank/score");
    const t = tests.find((x) => x.id === "tst_six_factor")!;
    const form = items(t);
    // Very calm answers: high stability.
    const calm = Object.fromEntries(form.map((i) => [i.id, i.scale === "es" ? (i.keyed === "+" ? 4 : 0) : 2]));
    const tense = Object.fromEntries(form.map((i) => [i.id, i.scale === "es" ? (i.keyed === "+" ? 0 : 4) : 2]));
    const worry = t.scales.findIndex((s) => s.code === "sf_em1");
    expect(raw(scoreForm(t, form, calm), worry)).toBeLessThan(raw(scoreForm(t, form, tense), worry));
  });

  it("scores judgement against the expert key, for both answer formats", async () => {
    const { scoreForm } = await import("@/server/test-bank/score");
    const rate = tests.find((x) => x.id === "tst_sjt_prof")!;
    const form = items(rate);
    const agree = Object.fromEntries(form.flatMap((i) => i.effectiveness!.map((e, k) => [`${i.id}:${k}`, e])));
    const oppose = Object.fromEntries(form.flatMap((i) => i.effectiveness!.map((e, k) => [`${i.id}:${k}`, 5 - e])));
    expect(raw(scoreForm(rate, form, agree))).toBeGreaterThan(raw(scoreForm(rate, form, oppose)));
    const ml = tests.find((x) => x.id === "tst_sjt_service")!;
    const f2 = items(ml);
    const best = Object.fromEntries(f2.flatMap((i) => [[i.id, i.effectiveness!.indexOf(Math.max(...i.effectiveness!))], [`${i.id}:least`, i.effectiveness!.indexOf(Math.min(...i.effectiveness!))]]));
    const worst = Object.fromEntries(f2.flatMap((i) => [[i.id, i.effectiveness!.indexOf(Math.min(...i.effectiveness!))], [`${i.id}:least`, i.effectiveness!.indexOf(Math.max(...i.effectiveness!))]]));
    expect(raw(scoreForm(ml, f2, best))).toBeGreaterThan(raw(scoreForm(ml, f2, worst)));
  });
});
