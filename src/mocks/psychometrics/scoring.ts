/**
 * Converts a target percentile or sten into the raw score that produces it against a norm group.
 * Used when scoring the short-form tests candidates take. Only relative imports (see scripts/check-psychometrics.mjs).
 */
import type { ScaleScore } from "../../types/psychometrics";
import { normTables, tests } from "./catalogue";

function probit(p: number) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858589208251, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q = p < 0.5 ? p : 1 - p;
  if (q < 0.02425) {
    const r = Math.sqrt(-2 * Math.log(q));
    const x = (((((c[0]! * r + c[1]!) * r + c[2]!) * r + c[3]!) * r + c[4]!) * r + c[5]!) / ((((d[0]! * r + d[1]!) * r + d[2]!) * r + d[3]!) * r + 1);
    return p < 0.5 ? x : -x;
  }
  const r = q - 0.5;
  const s = r * r;
  const x = ((((((a[0]! * s + a[1]!) * s + a[2]!) * s + a[3]!) * s + a[4]!) * s + a[5]!) * r) / (((((b[0]! * s + b[1]!) * s + b[2]!) * s + b[3]!) * s + b[4]!) * s + 1);
  return p < 0.5 ? x : -x;
}

function norm(testId: string, normCode: string, scale?: string) {
  const n = normTables.find((t) => t.testId === testId && t.normCode === normCode && (scale ? t.scale === scale : !t.scale));
  if (!n) throw new Error(`No norm for ${testId} / ${normCode} / ${scale ?? "total"}`);
  return n;
}

/** Raw (or theta) score that sits at the target percentile. Theta keeps 2 dp; raw scores 1 dp. */
export function atPercentile(testId: string, normCode: string, pct: number, scale?: string): ScaleScore {
  const t = tests.find((x) => x.id === testId)!;
  const n = norm(testId, normCode, scale);
  const raw = n.mean + probit(pct / 100) * n.sd;
  const dp = t.scoringModel === "irt_theta" || t.scoringModel === "thurstonian_irt" ? 100 : 10;
  return { scale: scale ?? t.scales[0]!.code, raw: Math.round(raw * dp) / dp, normCode };
}

/** Raw score for a target sten (the middle of that sten's band). */
export const atSten = (testId: string, normCode: string, scale: string, st: number) => {
  const n = norm(testId, normCode, scale);
  const t = tests.find((x) => x.id === testId)!;
  const dp = t.scoringModel === "thurstonian_irt" ? 100 : 10;
  return { scale, raw: Math.round((n.mean + ((st - 5.5) / 2) * n.sd) * dp) / dp, normCode };
};

/** A full work-styles profile from a scale → sten map (unlisted scales sit in the middle). */
