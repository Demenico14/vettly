import { describe, expect, it, vi } from "vitest";
import { assess, score } from "@/server/engine/matcher";
import { candidate, job, requirement, vacancy, yearsAgo } from "../support/fixtures";

describe("matcher: skills and qualifications", () => {
  it("meets a skill shown in work history, with high confidence and a quote", () => {
    const v = vacancy([requirement("Fleet management", "skill")]);
    const c = candidate({ experience: [job("Transport Officer", yearsAgo(3), null, ["Ran fleet management for 40 trucks"])] });
    const [r] = assess(c, v).requirements;
    expect(r!.outcome).toBe("met");
    expect(r!.confidence).toBe("high");
    expect(r!.evidence[0]!.quote).toContain("fleet management");
  });

  it("gives only partial credit when a skill appears only in the summary", () => {
    const v = vacancy([requirement("Fleet management", "skill")]);
    const c = candidate({ summary: "Interested in fleet work." });
    expect(assess(c, v).requirements[0]!.outcome).toBe("partial");
  });

  it("reports missing evidence, with a question to ask, rather than a failure", () => {
    const v = vacancy([requirement("Customs clearance", "skill")]);
    const r = assess(candidate(), v).requirements[0]!;
    expect(r.outcome).toBe("missing");
    expect(r.question).toBeTruthy();
  });

  it("marks a degree in another field as not met", () => {
    const v = vacancy([requirement("Bachelor's degree in Accounting or Finance", "education")]);
    const c = candidate({ education: [{ id: "e1", institution: "NUST", qualification: "BSc", field: "Geography", start: 2010, end: 2014 }] });
    expect(assess(c, v).requirements[0]!.outcome).toBe("not_met");
  });

  it("meets a certification listed under certifications, with high confidence", () => {
    const v = vacancy([requirement("Chartered Accountant, registered with ICAZ (or SAICA / ACCA equivalent)", "certification")]);
    const c = candidate({ certifications: [{ name: "Chartered Accountant CA(Z)", issuer: "ICAZ", year: 2019 }] });
    const r = assess(c, v).requirements[0]!;
    expect(r.outcome).toBe("met");
    expect(r.confidence).toBe("high");
    expect(r.evidence[0]).toMatchObject({ source: "Certifications", where: "ICAZ · 2019" });
  });

  it("gives partial credit for a related professional qualification", () => {
    const v = vacancy([requirement("Chartered Accountant, registered with ICAZ (or SAICA / ACCA equivalent)", "certification")]);
    const c = candidate({ certifications: [{ name: "CIMA finalist", issuer: "CIMA", year: 2022 }] });
    expect(assess(c, v).requirements[0]!.outcome).toBe("partial");
  });
});

describe("matcher: experience", () => {
  const finance = requirement("Finance experience", "experience", "essential", 3);

  it("counts roles whose titles belong to the field, not just ones repeating the words", () => {
    const c = candidate({ experience: [job("Group Accountant", yearsAgo(5), null)] });
    expect(assess(c, vacancy([finance])).requirements[0]!.outcome).toBe("met");
  });

  it("counts a current role up to today", () => {
    vi.useFakeTimers({ now: new Date("2031-06-15T12:00:00Z") });
    try {
      const c = candidate({ experience: [job("Accountant", "2027-01", null)] });
      expect(assess(c, vacancy([finance])).requirements[0]!.rationale).toMatch(/^(4|5) years/);
    } finally {
      vi.useRealTimers();
    }
  });

  it("is partial when somewhat short of the years needed, and not met when far short", () => {
    const partial = candidate({ experience: [job("Accountant", yearsAgo(2), null)] });
    const short = candidate({ experience: [job("Accountant", yearsAgo(1), null)] });
    expect(assess(partial, vacancy([finance])).requirements[0]!.outcome).toBe("partial");
    expect(assess(short, vacancy([finance])).requirements[0]!.outcome).toBe("not_met");
  });

  it("counts fleet and transport roles as operations experience", () => {
    const c = candidate({ experience: [job("Fleet Controller", yearsAgo(4), null), job("Transport Officer", yearsAgo(8), yearsAgo(4))] });
    expect(assess(c, vacancy([requirement("Operations experience", "experience", "essential", 5)])).requirements[0]!.outcome).toBe("met");
  });

  it("is missing when no role matches", () => {
    const c = candidate({ experience: [job("Chef", yearsAgo(6), null)] });
    expect(assess(c, vacancy([finance])).requirements[0]!.outcome).toBe("missing");
  });
});

describe("matcher: score", () => {
  const reqs = [requirement("Fleet management", "skill"), requirement("Customs clearance", "skill", "desirable")];

  it("is 0 to 100, and higher with more evidence", () => {
    const strong = candidate({ experience: [job("Fleet Controller", yearsAgo(4), null, ["Fleet management and customs clearance at Beitbridge"])] });
    const weak = candidate();
    const a = assess(strong, vacancy(reqs)).score;
    const b = assess(weak, vacancy(reqs)).score;
    expect(a).toBeGreaterThan(b);
    for (const s of [a, b]) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it("weights essential requirements twice as much as desirable ones", () => {
    const essentialOnly = candidate({ experience: [job("Fleet Controller", yearsAgo(4), null, ["Fleet management"])] });
    const desirableOnly = candidate({ experience: [job("Clerk", yearsAgo(4), null, ["Customs clearance"])] });
    expect(assess(essentialOnly, vacancy(reqs)).score).toBeGreaterThan(assess(desirableOnly, vacancy(reqs)).score);
  });

  it("leaves test results out of the CV score and includes them only in the combined score", () => {
    const c = candidate({ experience: [job("Fleet Controller", yearsAgo(4), null, ["Fleet management"])] });
    const without = assess(c, vacancy(reqs));
    const withTests = assess(c, vacancy(reqs), 20);
    expect(withTests.score).toBe(without.score);
    expect(withTests.scoreWithTests).not.toBeNull();
    expect(withTests.scoreWithTests!).toBeLessThan(withTests.score);
    expect(without.scoreWithTests).toBeNull();
  });

  it("ignores categories with zero weight or no requirements", () => {
    const v = vacancy([requirement("Fleet management", "skill")], { skills: 100, experience: 0, education: 0, certifications: 0, assessments: 0 });
    const r = assess(candidate(), v).requirements;
    expect(score(v, r, 90, true).value).toBe(0);
  });

  it("starts unreviewed, so HR has to confirm it", () => {
    expect(assess(candidate(), vacancy(reqs)).provenance).toBe("ai_illustrative");
  });
});
