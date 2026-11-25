/**
 * Spreadsheet skills: 55 questions plus two practice, each with a small sheet (column letters and row
 * numbers). The candidate says what a formula returns, picks the formula for a job, or cleans text. Results
 * are computed from the sheet shown. Scales: formulas, analysis, data cleaning. Generated from a fixed seed.
 */
import type { Figure } from "../../types/psychometrics";
import { type BankItem, n0, n1, pad, rng, withAnswer } from "./util";

const ITEMS = ["Bolts", "Cable ties", "Gloves", "Hard hats", "Hinges", "Paint", "Rope", "Tape", "Valves", "Washers"];
const BRANCHES = ["Harare", "Bulawayo", "Mutare"];

type Made = { prompt: string; correct: string; wrong: string[]; explanation: string; difficulty: 1 | 2 | 3; scale: string; figure: Figure };

function stock(r: ReturnType<typeof rng>) {
  const names = r.shuffle(ITEMS).slice(0, 5);
  const rows = names.map((n) => [n, r.pick(BRANCHES), r.int(4, 60), r.int(2, 45)] as [string, string, number, number]);
  const figure: Figure = { kind: "sheet", cols: ["Item", "Branch", "Units", "Price (USD)"], rows };
  return { rows, figure };
}
const units = (rows: [string, string, number, number][]) => rows.map((x) => x[2]);
const prices = (rows: [string, string, number, number][]) => rows.map((x) => x[3]);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

const makers: ((r: ReturnType<typeof rng>) => Made)[] = [
  (r) => {
    const { rows, figure } = stock(r);
    const t = sum(units(rows));
    return { prompt: "What does =SUM(C2:C6) return?", correct: n0(t), wrong: [n0(sum(prices(rows))), n0(t - rows[4]![2]), n0(t + rows[0]![2]), n0(Math.max(...units(rows)))], explanation: `It adds the Units column: ${units(rows).join(" + ")} = ${t}.`, difficulty: 1, scale: "xl_formulas", figure };
  },
  (r) => {
    const { rows, figure } = stock(r);
    const a = sum(prices(rows).slice(0, 4)) / 4;
    return { prompt: "What does =AVERAGE(D2:D5) return, to one decimal place?", correct: n1(a), wrong: [n1(sum(prices(rows)) / 5), n1(sum(prices(rows).slice(0, 4)) / 5), n1(sum(units(rows).slice(0, 4)) / 4), n1(a + 1)], explanation: `D2 to D5 is four cells: ${prices(rows).slice(0, 4).join(" + ")} = ${sum(prices(rows).slice(0, 4))}, ÷ 4 = ${n1(a)}.`, difficulty: 1, scale: "xl_formulas", figure };
  },
  (r) => {
    const { rows, figure } = stock(r);
    const limit = r.pick([15, 20, 25, 30]);
    const c = units(rows).filter((u) => u > limit).length;
    const ge = units(rows).filter((u) => u >= limit).length;
    return { prompt: `What does =COUNTIF(C2:C6,">${limit}") return?`, correct: String(c), wrong: [String(5 - c), String(ge === c ? c + 1 : ge), String(sum(units(rows).filter((u) => u > limit))), String(Math.max(0, c - 1) === c ? c + 2 : Math.max(0, c - 1))], explanation: `It counts Units above ${limit}: ${c}.`, difficulty: 2, scale: "xl_formulas", figure };
  },
  (r) => {
    const { rows, figure } = stock(r);
    const i = r.int(0, 4);
    const v = rows[i]![2];
    const t = r.pick([10, 20, 30]);
    const res = v < t ? "Reorder" : "OK";
    return { prompt: `What does =IF(C${i + 2}<${t},"Reorder","OK") return?`, correct: res, wrong: [res === "OK" ? "Reorder" : "OK", "TRUE", "#VALUE!"], explanation: `C${i + 2} is ${v}, which is ${v < t ? "" : "not "}below ${t}.`, difficulty: 1, scale: "xl_formulas", figure };
  },
  (r) => {
    const { rows, figure } = stock(r);
    const i = r.int(0, 4);
    const name = rows[i]![0];
    return { prompt: `What does =VLOOKUP("${name}",A2:D6,4,FALSE) return?`, correct: String(rows[i]![3]), wrong: [String(rows[i]![2]), String(rows[(i + 1) % 5]![3]), rows[i]![1], "#N/A"], explanation: `It finds "${name}" in column A and returns the 4th column of that row: ${rows[i]![3]}.`, difficulty: 2, scale: "xl_formulas", figure };
  },
  (r) => {
    const { rows, figure } = stock(r);
    const b = r.pick(BRANCHES.filter((x) => rows.some((row) => row[1] === x)));
    const t = sum(rows.filter((x) => x[1] === b).map((x) => x[2]));
    return { prompt: `What does =SUMIF(B2:B6,"${b}",C2:C6) return?`, correct: n0(t), wrong: [n0(sum(units(rows)) - t), n0(rows.filter((x) => x[1] === b).length), n0(sum(rows.filter((x) => x[1] === b).map((x) => x[3]))), n0(t + 5)], explanation: `It adds Units only where Branch is ${b}: ${t}.`, difficulty: 2, scale: "xl_analysis", figure };
  },
  (r) => {
    const { rows, figure } = stock(r);
    const i = r.int(0, 4);
    const v = rows[i]![2] * rows[i]![3];
    return { prompt: `Cell E${i + 2} holds =C${i + 2}*D${i + 2}. What does it show?`, correct: n0(v), wrong: [n0(rows[i]![2] + rows[i]![3]), n0(rows[(i + 1) % 5]![2] * rows[(i + 1) % 5]![3]), n0(v + rows[i]![3]), n0(rows[i]![2] * rows[i]![2])], explanation: `${rows[i]![2]} × ${rows[i]![3]} = ${v}.`, difficulty: 1, scale: "xl_formulas", figure };
  },
  (r) => {
    const { rows, figure } = stock(r);
    const v = Math.round(sum(units(rows)) / 5);
    return { prompt: "What does =ROUND(AVERAGE(C2:C6),0) return?", correct: String(v), wrong: [n1(sum(units(rows)) / 5), String(v + 1), String(Math.round(sum(prices(rows)) / 5)), String(Math.floor(sum(units(rows)) / 5) === v ? v - 1 : Math.floor(sum(units(rows)) / 5))], explanation: `The average is ${n1(sum(units(rows)) / 5)}, which rounds to ${v}.`, difficulty: 2, scale: "xl_formulas", figure };
  },
  (r) => {
    const { figure } = stock(r);
    const b = r.pick(BRANCHES);
    return {
      prompt: `Which formula gives the total Units held in ${b}?`,
      correct: `=SUMIF(B2:B6,"${b}",C2:C6)`,
      wrong: [`=COUNTIF(B2:B6,"${b}")`, `=SUMIF(C2:C6,"${b}",B2:B6)`, `=SUM(C2:C6)`, `=VLOOKUP("${b}",B2:C6,2,FALSE)`],
      explanation: "SUMIF checks the Branch column and adds the matching Units. VLOOKUP would only return the first match.",
      difficulty: 3,
      scale: "xl_analysis",
      figure,
    };
  },
  (r) => {
    const { figure } = stock(r);
    return {
      prompt: "You need the stock value (Units × Price) of every row added up in one cell. Which formula does it?",
      correct: "=SUMPRODUCT(C2:C6,D2:D6)",
      wrong: ["=SUM(C2:C6)*SUM(D2:D6)", "=PRODUCT(C2:D6)", "=SUM(C2:C6,D2:D6)", "=C2*D2+C6*D6"],
      explanation: "SUMPRODUCT multiplies row by row and adds the results. Multiplying the two totals gives a much larger, wrong number.",
      difficulty: 3,
      scale: "xl_analysis",
      figure,
    };
  },
  (r) => {
    const towns = ["  bulawayo depot ", "HARARE  north", " mutare  BRANCH", "gweru   yard "];
    const raw = r.pick(towns);
    const trimmed = raw.trim().replace(/\s+/g, " ");
    const proper = trimmed.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
    const figure: Figure = { kind: "sheet", cols: ["Site"], rows: [[`"${raw}"`]] };
    return {
      prompt: "A2 holds the text shown, spaces included. What does =PROPER(TRIM(A2)) return?",
      correct: proper,
      wrong: [trimmed, proper.toUpperCase(), raw.trim(), trimmed.toLowerCase()].map((x) => (x === proper ? `${proper} ` : x)),
      explanation: "TRIM removes spaces at the ends and doubled spaces inside; PROPER capitalises each word.",
      difficulty: 2,
      scale: "xl_cleaning",
      figure,
    };
  },
  (r) => {
    const codes = ["ZW-HRE-0042", "ZW-BYO-1187", "ZW-MUT-0305", "ZW-GWE-2210"];
    const c = r.pick(codes);
    const fn = r.pick(["LEFT", "RIGHT", "MID", "LEN"] as const);
    const res = fn === "LEFT" ? c.slice(0, 2) : fn === "RIGHT" ? c.slice(-4) : fn === "MID" ? c.slice(3, 6) : String(c.length);
    const formula = fn === "LEFT" ? "=LEFT(A2,2)" : fn === "RIGHT" ? "=RIGHT(A2,4)" : fn === "MID" ? "=MID(A2,4,3)" : "=LEN(A2)";
    const figure: Figure = { kind: "sheet", cols: ["Code"], rows: [[c]] };
    return {
      prompt: `A2 holds ${c}. What does ${formula} return?`,
      correct: res,
      wrong: [c.slice(0, 3), c.slice(-3), c.slice(2, 5), String(c.length - 1), c.slice(4, 7)].filter((x) => x !== res),
      explanation: fn === "LEN" ? "LEN counts every character, dashes included." : `${fn} takes characters from the ${fn === "LEFT" ? "start" : fn === "RIGHT" ? "end" : "middle, starting at position 4"}.`,
      difficulty: fn === "MID" ? 3 : 2,
      scale: "xl_cleaning",
      figure,
    };
  },
];

function build(): BankItem[] {
  const r = rng(6060);
  const out: BankItem[] = [];
  let k = 0;
  let guard = 0;
  while (out.length < 57 && guard++ < 2000) {
    const made = makers[k++ % makers.length]!(r);
    let opts;
    try {
      opts = withAnswer(r, made.correct, made.wrong, 4);
    } catch {
      continue;
    }
    if (out.some((o) => o.prompt === made.prompt && JSON.stringify(o.figure) === JSON.stringify(made.figure))) continue;
    const practice = out.length >= 55;
    out.push({
      id: practice ? `xl_p${out.length - 54}` : `xl_${pad(out.length + 1)}`,
      testId: "spreadsheet",
      practice,
      scale: made.scale,
      prompt: made.prompt,
      figure: made.figure,
      figureAlt: "A spreadsheet extract with column letters and row numbers.",
      options: opts.options,
      answer: opts.answer,
      explanation: made.explanation,
      difficulty: made.difficulty,
      source: "original",
    });
  }
  return out;
}

export const spreadsheetBank = build();
