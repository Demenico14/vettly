/**
 * Numerical reasoning: 60 questions on charts and tables of regional business data, plus two practice
 * questions. Every answer is computed from the data shown; wrong options come from common slips (dividing by
 * the wrong year, absolute instead of percentage change, forgetting a step). Generated from a fixed seed.
 */
import type { Figure } from "../../types/psychometrics";
import { type BankItem, n0, n1, pad, rng, withAnswer } from "./util";

const CONTEXTS = [
  { title: "Quarterly revenue by branch", unit: "USD thousands", cats: ["Harare", "Bulawayo", "Mutare", "Gweru"], series: ["Q1", "Q2"], lo: 140, hi: 480 },
  { title: "Diesel used by depot", unit: "thousand litres", cats: ["Beitbridge", "Chirundu", "Plumtree", "Forbes"], series: ["2025", "2026"], lo: 60, hi: 220 },
  { title: "Staff by department", unit: "people", cats: ["Finance", "Operations", "Sales", "Support"], series: ["2025", "2026"], lo: 18, hi: 96 },
  { title: "Bags of cement sold", unit: "bags", cats: ["Masvingo", "Kwekwe", "Chinhoyi", "Kadoma"], series: ["March", "April"], lo: 320, hi: 980 },
  { title: "Customer calls handled", unit: "calls", cats: ["Monday", "Tuesday", "Wednesday", "Thursday"], series: ["Team A", "Team B"], lo: 90, hi: 260 },
  { title: "Loans approved by region", unit: "USD thousands", cats: ["North", "South", "East", "West"], series: ["H1", "H2"], lo: 200, hi: 640 },
] as const;

type Data = { ctx: (typeof CONTEXTS)[number]; v: number[][] };

function figureOf(d: Data, asTable: boolean): Figure {
  const { ctx, v } = d;
  if (asTable) return { kind: "table", title: `${ctx.title} (${ctx.unit})`, head: ["", ...ctx.series], rows: ctx.cats.map((c, i) => [c, ...ctx.series.map((_, s) => v[s]![i]!)]) };
  return { kind: "bars", title: ctx.title, unit: ctx.unit, categories: [...ctx.cats], series: ctx.series.map((name, s) => ({ name, values: v[s]! })) };
}

const pct = (x: number) => `${x}%`;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

type Made = { prompt: string; correct: string; wrong: string[]; explanation: string; difficulty: 1 | 2 | 3 };

/** The question templates. Each returns null when the random data doesn't suit it, and another is tried. */
const TEMPLATES: ((d: Data, r: ReturnType<typeof rng>) => Made | null)[] = [
  // Percentage change for one category.
  (d, r) => {
    const i = r.int(0, 3);
    const [a, b] = [d.v[0]![i]!, d.v[1]![i]!];
    if (a === b) return null;
    const p = Math.round(((b - a) / a) * 100);
    const wrongBase = Math.round(((b - a) / b) * 100);
    if (Math.abs(p) < 2 || Math.abs(p) > 80 || p === wrongBase) return null;
    return {
      prompt: `By what percentage did ${d.ctx.cats[i]} change from ${d.ctx.series[0]} to ${d.ctx.series[1]}, to the nearest whole percent?`,
      correct: pct(p),
      wrong: [pct(wrongBase), pct(p + (p > 0 ? 3 : -3)), pct(-p), pct(p + (p > 0 ? -2 : 2))],
      explanation: `(${b} − ${a}) ÷ ${a} = ${((b - a) / a).toFixed(3)}, which is ${p}%.`,
      difficulty: 2,
    };
  },
  // Largest increase.
  (d) => {
    const diffs = d.ctx.cats.map((_, i) => d.v[1]![i]! - d.v[0]![i]!);
    const max = Math.max(...diffs);
    if (diffs.filter((x) => x === max).length > 1 || max <= 0) return null;
    const i = diffs.indexOf(max);
    return {
      prompt: `Which ${d.ctx.cats.length === 4 && d.ctx.cats[0] === "Monday" ? "day" : "of these"} had the largest increase from ${d.ctx.series[0]} to ${d.ctx.series[1]}?`,
      correct: d.ctx.cats[i]!,
      wrong: d.ctx.cats.filter((_, j) => j !== i),
      explanation: `${d.ctx.cats[i]} rose by ${max}, more than any other.`,
      difficulty: 1,
    };
  },
  // Share of total.
  (d, r) => {
    const s = r.int(0, 1);
    const i = r.int(0, 3);
    const total = sum(d.v[s]!);
    const p = Math.round((d.v[s]![i]! / total) * 100);
    const slip = Math.round((d.v[s]![i]! / (total - d.v[s]![i]!)) * 100);
    if (p === slip) return null;
    return {
      prompt: `In ${d.ctx.series[s]}, what share of the total came from ${d.ctx.cats[i]}, to the nearest whole percent?`,
      correct: pct(p),
      wrong: [pct(slip), pct(p + 2), pct(p - 2), pct(p + 5)],
      explanation: `Total ${d.ctx.series[s]} = ${n0(total)}. ${d.v[s]![i]} ÷ ${n0(total)} = ${p}%.`,
      difficulty: 2,
    };
  },
  // Total for a period.
  (d, r) => {
    const s = r.int(0, 1);
    const t = sum(d.v[s]!);
    return {
      prompt: `What was the total for ${d.ctx.series[s]}, in ${d.ctx.unit}?`,
      correct: n0(t),
      wrong: [n0(sum(d.v[1 - s]!)), n0(t + 10), n0(t - 20), n0(t + 100)],
      explanation: `${d.v[s]!.join(" + ")} = ${n0(t)}.`,
      difficulty: 1,
    };
  },
  // Average.
  (d, r) => {
    const s = r.int(0, 1);
    const avg = sum(d.v[s]!) / 4;
    return {
      prompt: `What was the average per ${d.ctx.cats[0] === "Monday" ? "day" : "category"} in ${d.ctx.series[s]}, to one decimal place?`,
      correct: n1(avg),
      wrong: [n1(sum(d.v[s]!) / 3), n1(avg + 2.5), n1(sum(d.v[1 - s]!) / 4), n1(avg - 1.5)],
      explanation: `${n0(sum(d.v[s]!))} ÷ 4 = ${n1(avg)}.`,
      difficulty: 1,
    };
  },
  // Range.
  (d, r) => {
    const s = r.int(0, 1);
    const xs = d.v[s]!;
    const range = Math.max(...xs) - Math.min(...xs);
    const sorted = [...xs].sort((a, b) => a - b);
    return {
      prompt: `In ${d.ctx.series[s]}, what was the difference between the highest and the lowest figure?`,
      correct: n0(range),
      wrong: [n0(sorted[3]! - sorted[1]!), n0(sorted[2]! - sorted[0]!), n0(range + 10), n0(Math.max(...d.v[1 - s]!) - Math.min(...d.v[1 - s]!))],
      explanation: `${Math.max(...xs)} − ${Math.min(...xs)} = ${range}.`,
      difficulty: 1,
    };
  },
  // Projection.
  (d, r) => {
    const i = r.int(0, 3);
    const g = r.pick([5, 8, 10, 12, 15, 20]);
    const base = d.v[1]![i]!;
    const next = Math.round(base * (1 + g / 100));
    return {
      prompt: `If ${d.ctx.cats[i]} grows by ${g}% from its ${d.ctx.series[1]} figure, what will the next figure be, to the nearest whole number?`,
      correct: n0(next),
      wrong: [n0(base + g), n0(Math.round(d.v[0]![i]! * (1 + g / 100))), n0(Math.round(base * (1 + (g + 5) / 100))), n0(Math.round(base * g / 100))],
      explanation: `${base} × ${(1 + g / 100).toFixed(2)} = ${n0(next)}.`,
      difficulty: 2,
    };
  },
  // How many times larger.
  (d, r) => {
    const s = r.int(0, 1);
    const xs = d.v[s]!;
    const hi = xs.indexOf(Math.max(...xs));
    const lo = xs.indexOf(Math.min(...xs));
    const ratio = xs[hi]! / xs[lo]!;
    if (ratio < 1.2) return null;
    return {
      prompt: `In ${d.ctx.series[s]}, how many times larger was ${d.ctx.cats[hi]} than ${d.ctx.cats[lo]}, to one decimal place?`,
      correct: n1(ratio),
      wrong: [n1(xs[lo]! / xs[hi]!), n1(ratio + 0.3), n1(ratio - 0.2), n1((xs[hi]! - xs[lo]!) / 100)],
      explanation: `${xs[hi]} ÷ ${xs[lo]} = ${n1(ratio)}.`,
      difficulty: 2,
    };
  },
  // Change in the total, as a percentage.
  (d) => {
    const a = sum(d.v[0]!);
    const b = sum(d.v[1]!);
    if (a === b) return null;
    const p = Math.round(((b - a) / a) * 1000) / 10;
    const slip = Math.round(((b - a) / b) * 1000) / 10;
    if (p === slip) return null;
    return {
      prompt: `By what percentage did the overall total change from ${d.ctx.series[0]} to ${d.ctx.series[1]}, to one decimal place?`,
      correct: `${n1(p)}%`,
      wrong: [`${n1(slip)}%`, `${n1(p + 1.5)}%`, `${n1(-p)}%`, `${n1(p - 1.1)}%`],
      explanation: `Totals: ${n0(a)} and ${n0(b)}. (${n0(b)} − ${n0(a)}) ÷ ${n0(a)} = ${n1(p)}%.`,
      difficulty: 3,
    };
  },
  // Two-step scenario.
  (d, r) => {
    const i = r.int(0, 3);
    const up = r.pick([10, 15, 20]);
    const down = r.pick([5, 10]);
    const others = sum(d.v[1]!) - d.v[1]![i]!;
    const total = Math.round(others * (1 + up / 100) + d.v[1]![i]! * (1 - down / 100));
    const slip = Math.round(sum(d.v[1]!) * (1 + (up - down) / 100));
    if (total === slip) return null;
    return {
      prompt: `Next period, every ${d.ctx.cats[0] === "Monday" ? "day" : "category"} rises ${up}% on its ${d.ctx.series[1]} figure except ${d.ctx.cats[i]}, which falls ${down}%. What is the new total, to the nearest whole number?`,
      correct: n0(total),
      wrong: [n0(slip), n0(Math.round(sum(d.v[1]!) * (1 + up / 100))), n0(total + 12), n0(Math.round(others * (1 + up / 100)))],
      explanation: `Others: ${n0(others)} × ${(1 + up / 100).toFixed(2)}; ${d.ctx.cats[i]}: ${d.v[1]![i]} × ${(1 - down / 100).toFixed(2)}. Together ${n0(total)}.`,
      difficulty: 3,
    };
  },
];

/** Currency and unit questions without a chart. */
function textOnly(r: ReturnType<typeof rng>, k: number): Made {
  const kinds = [
    () => {
      const rate = r.pick([25.8, 26.4, 27.2, 13.6]);
      const usd = r.int(12, 95) * 10;
      const zig = Math.round(usd * rate);
      return {
        prompt: `An invoice is for USD ${n0(usd)}. At USD 1 = ZiG ${rate}, how much is that in ZiG, to the nearest whole number?`,
        correct: `ZiG ${n0(zig)}`,
        wrong: [`ZiG ${n0(Math.round(usd / rate))}`, `ZiG ${n0(zig + 100)}`, `ZiG ${n0(Math.round(usd * (rate - 1)))}`, `ZiG ${n0(zig - 50)}`],
        explanation: `${n0(usd)} × ${rate} = ${n0(zig)}.`,
        difficulty: 1 as const,
      };
    },
    () => {
      const zar = r.int(40, 180) * 100;
      const rate = r.pick([18.5, 17.9, 18.2]);
      const usd = Math.round(zar / rate);
      return {
        prompt: `A supplier quotes ZAR ${n0(zar)}. At USD 1 = ZAR ${rate}, what is the price in US dollars, to the nearest dollar?`,
        correct: `USD ${n0(usd)}`,
        wrong: [`USD ${n0(Math.round(zar * rate))}`, `USD ${n0(usd + 25)}`, `USD ${n0(Math.round(zar / (rate + 1)))}`, `USD ${n0(usd - 40)}`],
        explanation: `${n0(zar)} ÷ ${rate} = ${n0(usd)}.`,
        difficulty: 1 as const,
      };
    },
    () => {
      const price = r.int(8, 40) * 5;
      const vat = 15;
      const gross = Math.round(price * 1.15 * 100) / 100;
      return {
        prompt: `A part costs USD ${price} before VAT. With VAT at ${vat}%, what does it cost?`,
        correct: `USD ${gross.toFixed(2)}`,
        wrong: [`USD ${(price + vat).toFixed(2)}`, `USD ${(price * 0.85).toFixed(2)}`, `USD ${(price * 1.5).toFixed(2)}`, `USD ${(gross + 1).toFixed(2)}`],
        explanation: `${price} × 1.15 = ${gross.toFixed(2)}.`,
        difficulty: 1 as const,
      };
    },
    () => {
      const trucks = r.int(6, 14);
      const loads = r.int(3, 6);
      const tonnes = r.pick([12, 15, 18, 20]);
      const total = trucks * loads * tonnes;
      return {
        prompt: `${trucks} trucks each make ${loads} trips a day, carrying ${tonnes} tonnes a trip. How many tonnes are moved in a five-day week?`,
        correct: n0(total * 5),
        wrong: [n0(total), n0(total * 7), n0(trucks * tonnes * 5), n0(total * 5 + tonnes)],
        explanation: `${trucks} × ${loads} × ${tonnes} = ${n0(total)} a day; × 5 = ${n0(total * 5)}.`,
        difficulty: 2 as const,
      };
    },
    () => {
      const budget = r.int(30, 90) * 1000;
      const spent = Math.round(budget * r.pick([0.62, 0.71, 0.48, 0.83]));
      const left = budget - spent;
      const months = r.pick([3, 4, 5]);
      const per = Math.round(left / months);
      return {
        prompt: `A department has spent USD ${n0(spent)} of a USD ${n0(budget)} budget. If the rest is spread evenly over the remaining ${months} months, how much can it spend a month?`,
        correct: `USD ${n0(per)}`,
        wrong: [`USD ${n0(Math.round(spent / months))}`, `USD ${n0(Math.round(budget / months))}`, `USD ${n0(left)}`, `USD ${n0(per + 500)}`],
        explanation: `${n0(budget)} − ${n0(spent)} = ${n0(left)}; ÷ ${months} = ${n0(per)}.`,
        difficulty: 2 as const,
      };
    },
  ];
  return kinds[k % kinds.length]!();
}

function build(): BankItem[] {
  const r = rng(20261125);
  const out: BankItem[] = [];
  let guard = 0;
  while (out.length < 62 && guard++ < 2000) {
    const k = out.length;
    const useText = k % 6 === 5;
    let made: Made | null;
    let figure: Figure | undefined;
    if (useText) made = textOnly(r, Math.floor(k / 6));
    else {
      const ctx = CONTEXTS[k % CONTEXTS.length]!;
      const d: Data = { ctx, v: [0, 1].map(() => ctx.cats.map(() => r.int(ctx.lo, ctx.hi))) };
      made = TEMPLATES[(k * 7 + guard) % TEMPLATES.length]!(d, r);
      figure = figureOf(d, k % 2 === 1);
    }
    if (!made) continue;
    let opts;
    try {
      opts = withAnswer(r, made.correct, made.wrong, 4);
    } catch {
      continue;
    }
    const practice = out.length >= 60;
    out.push({
      id: practice ? `num_p${out.length - 59}` : `num_${pad(out.length + 1)}`,
      testId: "numerical",
      practice,
      prompt: made.prompt,
      options: opts.options,
      answer: opts.answer,
      explanation: made.explanation,
      difficulty: made.difficulty,
      source: "original",
      ...(figure ? { figure, figureAlt: figure.kind === "table" ? `Table: ${figure.title}` : `Bar chart: ${(figure as { title: string }).title}` } : {}),
    });
  }
  return out;
}

export const numericalBank = build();
