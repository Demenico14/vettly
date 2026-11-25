/**
 * Pattern (abstract) reasoning: 55 picture questions, 3×3 grids with the last cell missing and sequences of
 * five, plus two practice questions. The rules are counts, fills (empty, half, solid), rotation and shape;
 * easy questions use one rule, hard ones three. Each wrong option breaks exactly one rule, so a candidate who
 * has found every rule has one answer. Generated from a fixed seed.
 */
import type { Glyph } from "../../types/psychometrics";
import { type BankItem, pad, rng, withAnswer } from "./util";

const SHAPES: Glyph["shape"][] = ["circle", "square", "triangle", "diamond", "pentagon", "hexagon", "star", "cross"];
const FILLS: Glyph["fill"][] = ["none", "half", "solid"];
const LETTERS = ["A", "B", "C", "D", "E"];
const key = (g: Glyph[]) => JSON.stringify(g.map((x) => [x.shape, x.fill, ((x.rot ?? 0) + 360) % 360, x.count ?? 1]));

/** Changes one thing about a glyph, for wrong options. */
function variants(g: Glyph, r: ReturnType<typeof rng>, pool: Glyph["shape"][]): Glyph[] {
  const out: Glyph[] = [];
  const c = g.count ?? 1;
  out.push({ ...g, count: c === 1 ? 2 : c - 1 });
  out.push({ ...g, count: c >= 4 ? 3 : c + 1 });
  for (const f of FILLS) if (f !== g.fill) out.push({ ...g, fill: f });
  for (const s of pool) if (s !== g.shape) out.push({ ...g, shape: s });
  if (g.shape === "arrow" || g.shape === "triangle") out.push({ ...g, rot: ((g.rot ?? 0) + 90) % 360 }, { ...g, rot: ((g.rot ?? 0) + 180) % 360 });
  return r.shuffle(out);
}

function matrix(r: ReturnType<typeof rng>, difficulty: 1 | 2 | 3): { cells: Glyph[][]; answer: Glyph; explanation: string; pool: Glyph["shape"][] } {
  const pool = r.shuffle(SHAPES.filter((s) => s !== "arrow")).slice(0, 3);
  const cells: Glyph[][] = [];
  let explanation = "";
  const variant = r.int(0, 1);
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++) {
      let g: Glyph;
      if (difficulty === 1) {
        g = variant === 0 ? { shape: pool[row]!, fill: "solid", count: col + 1 } : { shape: pool[row]!, fill: FILLS[col]!, count: 1 };
        explanation = variant === 0 ? "Each row keeps its shape, and the number of shapes goes up by one from left to right." : "Each row keeps its shape, and the fill goes empty, half, solid from left to right.";
      } else if (difficulty === 2) {
        g = variant === 0 ? { shape: pool[row]!, fill: FILLS[(row + col) % 3]!, count: col + 1 } : { shape: pool[(row + col) % 3]!, fill: FILLS[row]!, count: col + 1 };
        explanation =
          variant === 0
            ? "The shape stays the same along each row; the count goes up by one; each fill appears once in every row and column."
            : "Each shape appears once in every row and column; the fill stays the same along a row; the count goes up by one.";
      } else {
        g = { shape: pool[(row + col) % 3]!, fill: FILLS[(row + 2 * col) % 3]!, count: ((row + col * 2) % 3) + 1 };
        explanation = "Shape, fill and count each appear once in every row and column, each following its own diagonal pattern.";
      }
      cells.push([g]);
    }
  return { cells, answer: cells[8]![0]!, explanation, pool };
}

function series(r: ReturnType<typeof rng>, difficulty: 1 | 2 | 3): { cells: Glyph[][]; answer: Glyph; explanation: string; pool: Glyph["shape"][] } {
  const step = r.pick([45, 90]);
  const start = r.pick([0, 90, 180, 270]);
  const pool = r.shuffle(SHAPES.filter((s) => s !== "arrow" && s !== "circle")).slice(0, 3);
  const seq: Glyph[] = [];
  let explanation = "";
  const kind = r.int(0, 1);
  for (let i = 0; i < 5; i++) {
    if (difficulty === 1) {
      seq.push(kind === 0 ? { shape: "arrow", fill: "solid", rot: (start + step * i) % 360 } : { shape: pool[0]!, fill: "solid", count: (i % 4) + 1 });
      explanation = kind === 0 ? `The arrow turns ${step}° clockwise each step.` : "The count goes 1, 2, 3, 4, then starts again at 1.";
    } else if (difficulty === 2) {
      seq.push({ shape: "arrow", fill: i % 2 ? "none" : "solid", rot: (start + step * i) % 360 });
      explanation = `The arrow turns ${step}° clockwise each step, and the fill alternates solid and empty.`;
    } else {
      seq.push({ shape: kind === 0 ? "triangle" : "arrow", fill: FILLS[i % 3]!, rot: (start + 90 * i) % 360, count: (i % 2) + 1 });
      explanation = "Each step turns the shape 90° clockwise, the fill goes empty, half, solid, and the count alternates one and two.";
    }
  }
  return { cells: seq.slice(0, 4).map((g) => [g]), answer: seq[4]!, explanation, pool: kind === 0 ? ["triangle", "arrow", ...pool] : ["arrow", ...pool] };
}

function build(): BankItem[] {
  const r = rng(77101);
  const out: BankItem[] = [];
  const plan: { kind: "matrix" | "series"; d: 1 | 2 | 3 }[] = [];
  // The last two are practice questions, kept easy.
  for (let i = 0; i < 57; i++) plan.push({ kind: i % 2 === 0 ? "matrix" : "series", d: (i < 18 || i >= 55 ? 1 : i < 39 ? 2 : 3) as 1 | 2 | 3 });
  for (const [i, p] of plan.entries()) {
    const made = p.kind === "matrix" ? matrix(r, p.d) : series(r, p.d);
    const wrong = variants(made.answer, r, made.pool).map((g) => [g]);
    const count = p.d === 1 ? 4 : 5;
    const { options, answer } = withAnswer(r, [made.answer], wrong, count, key);
    const practice = i >= 55;
    out.push({
      id: practice ? `pat_p${i - 54}` : `pat_${pad(i + 1)}`,
      testId: "pattern",
      practice,
      prompt: p.kind === "matrix" ? "Which option completes the grid?" : "Which option comes next in the sequence?",
      figure: p.kind === "matrix" ? { kind: "matrix", cells: [...made.cells.slice(0, 8), null] } : { kind: "series", cells: [...made.cells, null] },
      figureAlt:
        p.kind === "matrix"
          ? "A three by three grid of symbols with the bottom-right cell missing."
          : "A row of four symbols followed by a question mark.",
      options: options.map((_, k) => LETTERS[k]!),
      optionFigures: options.map((g) => ({ kind: "glyphs" as const, glyphs: g })),
      answer,
      explanation: made.explanation,
      difficulty: p.d,
      source: "original",
    });
  }
  return out;
}

export const patternBank = build();
