/**
 * Spatial reasoning: 55 picture questions plus two practice. Each uses an irregular shape of five to seven
 * squares that isn't symmetrical, so its mirror image can't be reached by turning it. Questions ask for the
 * turned copy among flipped ones, the flipped copy among turned ones, or the odd one out. Generated from a
 * fixed seed; every shape is checked to be lopsided before use.
 */
import { type BankItem, pad, rng, withAnswer } from "./util";

type Cells = [number, number][];
const LETTERS = ["A", "B", "C", "D"];

const normalise = (c: Cells): Cells => {
  const mx = Math.min(...c.map((p) => p[0]));
  const my = Math.min(...c.map((p) => p[1]));
  return c.map(([x, y]) => [x - mx, y - my] as [number, number]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
};
const key = (c: Cells) => JSON.stringify(normalise(c));
const turn = (c: Cells): Cells => normalise(c.map(([x, y]) => [-y, x] as [number, number]));
const flip = (c: Cells): Cells => normalise(c.map(([x, y]) => [-x, y] as [number, number]));
const turns = (c: Cells) => {
  const out = [normalise(c)];
  for (let i = 0; i < 3; i++) out.push(turn(out[out.length - 1]!));
  return out;
};

/** A random shape of n squares with no symmetry: four different turns, and its mirror is none of them. */
function shape(r: ReturnType<typeof rng>, n: number): Cells {
  for (;;) {
    const cells: Cells = [[0, 0]];
    while (cells.length < n) {
      const [x, y] = r.pick(cells);
      const [dx, dy] = r.pick([
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const);
      const next: [number, number] = [x + dx, y + dy];
      if (!cells.some((c) => c[0] === next[0] && c[1] === next[1])) cells.push(next);
    }
    const ts = turns(cells).map(key);
    const mirror = turns(flip(cells)).map(key);
    if (new Set(ts).size === 4 && !mirror.some((m) => ts.includes(m))) return normalise(cells);
  }
}

function build(): BankItem[] {
  const r = rng(31337);
  const out: BankItem[] = [];
  for (let i = 0; i < 57; i++) {
    // The last two are practice questions, kept easy.
    const size = i < 19 || i >= 55 ? 5 : i < 38 ? 6 : 7;
    const difficulty = (size - 4) as 1 | 2 | 3;
    const target = shape(r, size);
    const rotated = turns(target).slice(1);
    const mirrored = turns(flip(target));
    const kind = i % 3;
    let correct: Cells;
    let wrong: Cells[];
    let prompt: string;
    let explanation: string;
    if (kind === 0) {
      correct = r.pick(rotated);
      wrong = r.shuffle(mirrored);
      prompt = "Which option is the shape turned, without being flipped over?";
      explanation = "The other options are mirror images: no amount of turning makes them match.";
    } else if (kind === 1) {
      correct = r.pick(mirrored);
      wrong = r.shuffle([normalise(target), ...rotated]);
      prompt = "Which option is the shape flipped over (a mirror image)?";
      explanation = "The other options are the same shape, only turned.";
    } else {
      correct = r.pick(mirrored);
      wrong = r.shuffle(rotated);
      prompt = "Three options are the same shape turned. Which one is different?";
      explanation = "That option is a mirror image, so it can't be turned to match the others.";
    }
    const { options, answer } = withAnswer(r, correct, wrong, 4, key);
    const practice = i >= 55;
    out.push({
      id: practice ? `spa_p${i - 54}` : `spa_${pad(i + 1)}`,
      testId: "spatial",
      practice,
      prompt,
      ...(kind === 2 ? {} : { figure: { kind: "shape" as const, cells: target, label: "Shape" }, figureAlt: `A shape made of ${size} squares.` }),
      options: options.map((_, k) => LETTERS[k]!),
      optionFigures: options.map((c) => ({ kind: "shape" as const, cells: c })),
      answer,
      explanation,
      difficulty,
      source: "original",
    });
  }
  return out;
}

export const spatialBank = build();
