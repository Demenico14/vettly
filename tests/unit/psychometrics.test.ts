import { describe, expect, it } from "vitest";
import { band, netWpm, normalCdf, percentile, standardise, sten, tScore } from "@/lib/psychometrics";
import { atPercentile, atSten } from "@/mocks/psychometrics/scoring";
import { scoreResult, tests } from "@/mocks/psychometrics";

describe("score conversions", () => {
  it("matches the standard normal distribution", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1)).toBeCloseTo(0.1587, 3);
  });

  it("uses T = 50 + 10z and sten = 2z + 5.5, clamped to their ranges", () => {
    expect(tScore(0)).toBe(50);
    expect(tScore(1)).toBe(60);
    expect(tScore(9)).toBe(80);
    expect(sten(0)).toBe(6);
    expect(sten(-0.26)).toBe(5);
    expect(sten(-9)).toBe(1);
    expect(sten(9)).toBe(10);
  });

  it("never reports a percentile of 0 or 100", () => {
    expect(percentile(-10)).toBe(1);
    expect(percentile(10)).toBe(99);
  });

  it("bands percentiles A to E at 90, 70, 31 and 11", () => {
    expect([95, 90, 89, 70, 69, 31, 30, 11, 10].map(band)).toEqual(["A", "A", "B", "B", "C", "C", "D", "D", "E"]);
  });

  it("standardises a raw score against a norm", () => {
    expect(standardise(60, 50, 10)).toMatchObject({ z: 1, t: 60, percentile: 84, band: "B" });
  });

  it("works out net typing speed", () => {
    expect(netWpm(1500, 5, 5)).toBe(59);
    expect(netWpm(10, 50, 1)).toBe(0);
  });
});

describe("norm round trip", () => {
  const ability = tests.filter((t) => t.scales.length === 1 && t.family !== "personality").slice(0, 5);

  it("a raw score set at a percentile scores back to about that percentile", () => {
    for (const t of ability)
      for (const p of [10, 50, 85]) {
        const [s] = scoreResult({ testId: t.id, scores: [atPercentile(t.id, t.defaultNorm, p)], flags: [] });
        expect(Math.abs(s!.percentile - p)).toBeLessThanOrEqual(2);
      }
  });

  it("a raw score set at a sten scores back to that sten", () => {
    const t = tests.find((x) => x.family === "personality")!;
    const scale = t.scales[0]!.code;
    for (const st of [2, 5, 9]) {
      const [s] = scoreResult({ testId: t.id, scores: [atSten(t.id, t.defaultNorm, scale, st)], flags: [] });
      expect(s!.sten).toBe(st);
    }
  });
});
