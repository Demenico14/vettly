/**
 * Adverse-impact checks used by Analytics → Fairness: selection rates by group, the four-fifths impact
 * ratio, and a two-proportion z-test so small gaps in small groups aren't flagged as findings.
 */
import type { ImpactGroup, ImpactRow } from "@/types/analytics";
import { IMPACT_THRESHOLD, MIN_GROUP } from "./workflow";

/** Selection rate per group (as a percentage) and each group's ratio to the best rate. Groups under MIN_GROUP are suppressed. */
export function groupsOf<T>(rows: T[], groupOf: (r: T) => string | null, selected: (r: T) => boolean, order: string[]): ImpactGroup[] {
  const raw = order.map((g) => {
    const mine = rows.filter((r) => groupOf(r) === g);
    const sel = mine.filter(selected).length;
    return { group: g, n: mine.length, selected: sel, rate: mine.length ? sel / mine.length : null, suppressed: mine.length < MIN_GROUP };
  });
  const best = Math.max(0, ...raw.filter((g) => !g.suppressed && g.rate !== null).map((g) => g.rate!));
  return raw.map((g) => ({
    ...g,
    rate: g.suppressed || g.rate === null ? null : Math.round(g.rate * 1000) / 10,
    ratio: g.suppressed || g.rate === null || !best ? null : Math.round((g.rate / best) * 100) / 100,
  }));
}

/** Two-proportion z-test between a group and the most-selected group. */
export function significant(a: ImpactGroup, b: ImpactGroup) {
  const p = (a.selected + b.selected) / (a.n + b.n);
  const se = Math.sqrt(p * (1 - p) * (1 / a.n + 1 / b.n));
  return se > 0 && Math.abs(a.selected / a.n - b.selected / b.n) / se >= 1.96;
}

export function verdict(groups: ImpactGroup[]): Pick<ImpactRow, "status" | "flagged"> {
  const live = groups.filter((g) => !g.suppressed && g.ratio !== null);
  if (live.length < 2) return { status: "insufficient", flagged: false };
  const best = live.find((g) => g.ratio === 1)!;
  const low = live.filter((g) => g.ratio! < IMPACT_THRESHOLD);
  if (!low.length) return { status: "ok", flagged: false };
  return low.some((g) => significant(g, best)) ? { status: "review", flagged: true } : { status: "watch", flagged: false };
}
