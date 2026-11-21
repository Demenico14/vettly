import { describe, expect, it } from "vitest";
import { groupsOf, significant, verdict } from "@/lib/fairness";
import { MIN_GROUP } from "@/lib/workflow";

type Row = { g: string; sel: boolean };
const rows = (g: string, n: number, selected: number): Row[] => Array.from({ length: n }, (_, i) => ({ g, sel: i < selected }));
const groups = (...r: Row[][]) => groupsOf(r.flat(), (x) => x.g, (x) => x.sel, ["A", "B"]);

describe("fairness: selection rates and the four-fifths guide", () => {
  it("computes rates as percentages and ratios against the best group", () => {
    const [a, b] = groups(rows("A", 50, 25), rows("B", 50, 15));
    expect(a!.rate).toBe(50);
    expect(b!.rate).toBe(30);
    expect(a!.ratio).toBe(1);
    expect(b!.ratio).toBe(0.6);
  });

  it(`suppresses groups smaller than ${MIN_GROUP} people`, () => {
    const [, b] = groups(rows("A", 50, 25), rows("B", MIN_GROUP - 1, 1));
    expect(b!.suppressed).toBe(true);
    expect(b!.rate).toBeNull();
    expect(b!.ratio).toBeNull();
  });

  it("passes when every group is at or above four-fifths of the best rate", () => {
    expect(verdict(groups(rows("A", 100, 50), rows("B", 100, 42))).status).toBe("ok");
  });

  it("flags for review when a group is below four-fifths and the gap is significant", () => {
    const v = verdict(groups(rows("A", 200, 100), rows("B", 200, 50)));
    expect(v).toEqual({ status: "review", flagged: true });
  });

  it("only watches, without flagging, when the gap could be chance", () => {
    const v = verdict(groups(rows("A", 25, 10), rows("B", 25, 7)));
    expect(v).toEqual({ status: "watch", flagged: false });
  });

  it("can't compare when fewer than two groups are large enough", () => {
    expect(verdict(groups(rows("A", 100, 50), rows("B", 3, 0))).status).toBe("insufficient");
  });
});

describe("fairness: significance test", () => {
  const g = (n: number, selected: number) => ({ group: "x", n, selected, rate: null, ratio: null, suppressed: false });
  it("finds large gaps in large groups significant", () => expect(significant(g(500, 100), g(500, 250))).toBe(true));
  it("doesn't find small gaps in small groups significant", () => expect(significant(g(20, 8), g(20, 10))).toBe(false));
  it("handles nobody being selected", () => expect(significant(g(30, 0), g(30, 0))).toBe(false));
});
