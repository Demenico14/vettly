/**
 * Score conversions used across the psychometric module. Conventions follow the research report
 * (docs/reports/Workplace psychometric assessment database.md): z, T = 50 + 10z, sten = 2z + 5.5,
 * stanine = 2z + 5, and Vettly's A–E band convention (a design assumption, not a standard).
 * Only relative imports, so the validation script can compile this file on its own.
 */

/** Standard normal cumulative distribution (Abramowitz & Stegun 7.1.26, error < 1.5e-7). */
export function normalCdf(z: number) {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const zScore = (raw: number, mean: number, sd: number) => (raw - mean) / sd;
/** Reported as 1–99: extreme scores are never shown as 0 or 100. */
export const percentile = (z: number) => clamp(Math.round(normalCdf(z) * 100), 1, 99);
export const tScore = (z: number) => clamp(Math.round(50 + 10 * z), 20, 80);
export const sten = (z: number) => clamp(Math.round(2 * z + 5.5), 1, 10);
export const stanine = (z: number) => clamp(Math.round(2 * z + 5), 1, 9);

export type Band = "A" | "B" | "C" | "D" | "E";
export const BAND_LABEL: Record<Band, string> = {
  A: "Well above average",
  B: "Above average",
  C: "Average",
  D: "Below average",
  E: "Well below average",
};

/** E ≤ 10th, D 11–30th, C 31–69th, B 70–89th, A ≥ 90th percentile. */
export function band(p: number): Band {
  if (p >= 90) return "A";
  if (p >= 70) return "B";
  if (p >= 31) return "C";
  if (p >= 11) return "D";
  return "E";
}

/** Expected share of a norm group in each sten, 1 to 10. Used to check mock score distributions. */
export const STEN_DISTRIBUTION = [2.28, 4.41, 9.18, 14.99, 19.15, 19.15, 14.99, 9.18, 4.41, 2.28];

export function standardise(raw: number, mean: number, sd: number) {
  const z = zScore(raw, mean, sd);
  const p = percentile(z);
  return { z: Math.round(z * 100) / 100, percentile: p, t: tScore(z), sten: sten(z), stanine: stanine(z), band: band(p) };
}

/** Words per minute on a 5-character word, minus one word per uncorrected error per minute. */
export function netWpm(characters: number, errors: number, minutes: number) {
  return Math.max(0, Math.round((characters / 5 - errors) / minutes));
}
