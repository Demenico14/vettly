/**
 * Scores a candidate's set of bank questions. Ability and knowledge tests: the share answered correctly sets
 * the percentile against the test's default norm. Judgement tests: agreement with the expert key. Question-
 * naires: the mean keyed answer on each scale sets that scale's sten. The three personality tests share the
 * IPIP markers, so their scales are mapped to the five traits; scales with no matching trait sit in the middle.
 * Indicative only: the bank is unvalidated, and reports say so.
 */
import type { Test, TestResult } from "../../types/psychometrics";
import { atPercentile, atSten } from "../../mocks/psychometrics/scoring";
import type { BankItem } from "./util";

const QUESTIONNAIRE = new Set(["personality", "integrity", "emotional_intelligence", "motivation"]);

/** Which trait a personality scale draws on, and whether high trait means low scale. */
function traitFor(code: string): { scale: string; reverse?: boolean } | null {
  const bf = code.match(/^bf_(es|ag|co|ex|op)\d$/);
  if (bf) return { scale: bf[1]! };
  const sf = code.match(/^sf_(hh|em|ex|ag|co|op)\d$/);
  if (sf) return sf[1] === "hh" ? null : sf[1] === "em" ? { scale: "es", reverse: true } : { scale: sf[1]! };
  const ws: Record<string, string> = {
    ws_influence: "ex",
    ws_lead: "ex",
    ws_sociable: "ex",
    ws_consult: "ag",
    ws_care: "ag",
    ws_analysis: "op",
    ws_evidence: "op",
    ws_ideas: "op",
    ws_strategy: "op",
    ws_learning: "op",
    ws_planning: "co",
    ws_detail: "co",
    ws_process: "co",
    ws_drive: "co",
    ws_decisive: "co",
    ws_persist: "co",
    ws_calm: "es",
    ws_optimism: "es",
    ws_feedback: "es",
  };
  if (code.startsWith("ws_")) return ws[code] ? { scale: ws[code]! } : null;
  return { scale: code };
}

const pctFrom = (share: number) => Math.max(3, Math.min(97, Math.round(10 + share * 80)));

/** Agreement with the expert key for one judgement scenario, 0 to 1. */
function sjtAgreement(i: BankItem, answers: Record<string, number>, format: string) {
  const eff = i.effectiveness ?? [];
  if (format === "sjt_most_least") {
    const most = answers[i.id];
    const least = answers[`${i.id}:least`];
    const hit = (k: number | undefined, target: number) => (k !== undefined && k >= 0 && eff[k] === target ? 1 : 0);
    return (hit(most, Math.max(...eff)) + hit(least, Math.min(...eff))) / 2;
  }
  return eff.reduce((s, key, k) => {
    const given = answers[`${i.id}:${k}`];
    return s + (given === undefined ? 0 : 1 - Math.abs(given - key) / 3);
  }, 0) / Math.max(1, eff.length);
}

export function scoreForm(t: Test, form: BankItem[], answers: Record<string, number>): TestResult {
  const norm = t.defaultNorm;
  if (QUESTIONNAIRE.has(t.family)) {
    const max = t.itemFormat === "likert_7" ? 6 : 4;
    const mean = (scale: string) => {
      const vals = form.filter((i) => i.scale === scale && answers[i.id] !== undefined).map((i) => (i.keyed === "-" ? max - answers[i.id]! : answers[i.id]!));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length / max : null;
    };
    return {
      testId: t.id,
      scores: t.scales.map((sc) => {
        const trait = traitFor(sc.code);
        const m = trait ? mean(trait.scale) : null;
        const p = m === null ? 0.5 : trait!.reverse ? 1 - m : m;
        return atSten(t.id, norm, sc.code, Math.max(1, Math.min(10, Math.round(1 + p * 9))));
      }),
      flags: [],
    };
  }
  if (t.family === "sjt") {
    const share = form.reduce((s, i) => s + sjtAgreement(i, answers, t.itemFormat), 0) / Math.max(1, form.length);
    return { testId: t.id, scores: [atPercentile(t.id, norm, pctFrom(share))], flags: [] };
  }
  const right = form.filter((i) => i.answer !== undefined && answers[i.id] === i.answer).length;
  return { testId: t.id, scores: [atPercentile(t.id, norm, pctFrom(right / Math.max(1, form.length)))], flags: [] };
}
