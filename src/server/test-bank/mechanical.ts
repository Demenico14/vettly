/**
 * Mechanical reasoning: 55 questions plus two practice, most with a drawing: gear trains (direction and
 * speed), levers (balance and effort), pulleys, belt drives and springs. Answers come from the physics: each
 * mesh reverses direction, speed ratio follows the tooth counts, moments balance about the fulcrum, the effort
 * on a pulley is the load shared by the supporting ropes. Generated from a fixed seed.
 */
import type { Figure } from "../../types/psychometrics";
import { type BankItem, pad, rng, withAnswer } from "./util";

type Made = { prompt: string; correct: string; wrong: string[]; explanation: string; difficulty: 1 | 2 | 3; figure?: Figure; alt?: string };
const CW = "Clockwise";
const ACW = "Anticlockwise";
const opp = (d: "cw" | "ccw") => (d === "cw" ? "ccw" : "cw");
const word = (d: "cw" | "ccw") => (d === "cw" ? CW : ACW);

const makers: ((r: ReturnType<typeof rng>) => Made)[] = [
  // Gear train direction.
  (r) => {
    const n = r.int(2, 5);
    const teeth = Array.from({ length: n }, () => r.pick([12, 16, 20, 24, 30]));
    const driver = r.pick(["cw", "ccw"] as const);
    const last = (n - 1) % 2 === 0 ? driver : opp(driver);
    return {
      prompt: `Gear 1 turns ${word(driver).toLowerCase()}. Which way does gear ${n} turn?`,
      correct: word(last),
      wrong: [word(opp(last)), "It can't turn", "It depends on the gear sizes"],
      explanation: `Each meshing gear turns the opposite way to the one driving it. Gear ${n} is ${n - 1} mesh${n - 1 === 1 ? "" : "es"} from gear 1, so it turns ${word(last).toLowerCase()}.`,
      difficulty: n <= 2 ? 1 : 2,
      figure: { kind: "gears", teeth, driver },
      alt: `A row of ${n} meshing gears, numbered from the left. Gear 1 turns ${word(driver).toLowerCase()}.`,
    };
  },
  // Gear speed.
  (r) => {
    const [t1, t2] = r.pick([
      [20, 40],
      [12, 36],
      [30, 15],
      [16, 48],
      [24, 12],
      [18, 54],
    ] as const);
    const rpm = r.pick([30, 60, 90, 120]);
    const out = (rpm * t1) / t2;
    if (!Number.isInteger(out)) return makers[0]!(r);
    const driver = r.pick(["cw", "ccw"] as const);
    const d = word(opp(driver));
    return {
      prompt: `Gear 1 has ${t1} teeth and turns ${word(driver).toLowerCase()} at ${rpm} rpm. It drives gear 2, which has ${t2} teeth. How does gear 2 turn?`,
      correct: `${d} at ${out} rpm`,
      wrong: [`${word(driver)} at ${out} rpm`, `${d} at ${(rpm * t2) / t1} rpm`, `${d} at ${rpm} rpm`, `${word(driver)} at ${(rpm * t2) / t1} rpm`],
      explanation: `Meshing gears turn opposite ways. Speed scales by teeth: ${rpm} × ${t1} ÷ ${t2} = ${out} rpm.`,
      difficulty: 2,
      figure: { kind: "gears", teeth: [t1, t2], driver, rpm },
      alt: `Two meshing gears: gear 1 with ${t1} teeth, gear 2 with ${t2} teeth.`,
    };
  },
  // Idler gear.
  (r) => {
    const t1 = r.pick([20, 30, 40]);
    const t2 = r.pick([12, 16, 24]);
    const t3 = r.pick([10, 20, 40]);
    const rpm = r.pick([40, 60, 80]);
    const out = (rpm * t1) / t3;
    if (!Number.isInteger(out)) return makers[0]!(r);
    return {
      prompt: `Gear 1 (${t1} teeth) turns at ${rpm} rpm and drives gear 2 (${t2} teeth), which drives gear 3 (${t3} teeth). How fast does gear 3 turn?`,
      correct: `${out} rpm`,
      wrong: [`${(rpm * t1) / t2} rpm`, `${rpm} rpm`, `${Math.round((rpm * t2) / t3)} rpm`, `${(rpm * t3) / t1} rpm`],
      explanation: `The middle gear only passes the motion on. Overall: ${rpm} × ${t1} ÷ ${t3} = ${out} rpm.`,
      difficulty: 3,
      figure: { kind: "gears", teeth: [t1, t2, t3], driver: "cw", rpm },
      alt: `Three meshing gears with ${t1}, ${t2} and ${t3} teeth.`,
    };
  },
  // Lever effort.
  (r) => {
    const load = r.pick([60, 80, 90, 120, 150, 200]);
    const a = r.pick([1, 2]);
    const b = r.pick([3, 4, 5, 6]);
    const effort = (load * a) / b;
    if (!Number.isInteger(effort)) return makers[4]!(r);
    return {
      prompt: `A ${load} kg load sits ${a} m from the pivot. How much weight, ${b} m from the pivot on the other side, balances it?`,
      correct: `${effort} kg`,
      wrong: [`${load} kg`, `${(load * b) / a} kg`, `${load - effort} kg`, `${effort + 10} kg`],
      explanation: `Moments balance: ${load} × ${a} = weight × ${b}, so the weight is ${effort} kg.`,
      difficulty: 2,
      figure: { kind: "lever", length: a + b, fulcrum: a, loads: [{ at: 0, label: `${load} kg` }, { at: a + b, label: "?" }] },
      alt: `A beam on a pivot. ${load} kg sits ${a} m to the left of the pivot; an unknown weight sits ${b} m to the right.`,
    };
  },
  // Lever balance.
  (r) => {
    const w1 = r.pick([20, 30, 40, 50]);
    const w2 = r.pick([20, 30, 40, 50]);
    const d1 = r.int(1, 4);
    const d2 = r.int(1, 4);
    const m1 = w1 * d1;
    const m2 = w2 * d2;
    const correct = m1 === m2 ? "It stays level" : m1 > m2 ? "The left side goes down" : "The right side goes down";
    return {
      prompt: `${w1} kg sits ${d1} m left of the pivot and ${w2} kg sits ${d2} m right of it. What happens?`,
      correct,
      wrong: ["The left side goes down", "The right side goes down", "It stays level"].filter((x) => x !== correct),
      explanation: `Left: ${w1} × ${d1} = ${m1}. Right: ${w2} × ${d2} = ${m2}. ${m1 === m2 ? "They're equal." : `The ${m1 > m2 ? "left" : "right"} is larger.`}`,
      difficulty: m1 === m2 || Math.abs(m1 - m2) <= 20 ? 2 : 1,
      figure: { kind: "lever", length: 8, fulcrum: 4, loads: [{ at: 4 - d1, label: `${w1} kg` }, { at: 4 + d2, label: `${w2} kg` }] },
      alt: `A beam on a central pivot with ${w1} kg ${d1} m to the left and ${w2} kg ${d2} m to the right.`,
    };
  },
  // Pulley.
  (r) => {
    const ropes = r.int(1, 4);
    const load = r.pick([120, 240, 360, 480]);
    const effort = load / ropes;
    return {
      prompt: `The load is ${load} kg and ${ropes === 1 ? "one rope supports" : `${ropes} rope sections support`} the moving block. Ignoring friction, how much effort lifts it?`,
      correct: `${effort} kg`,
      wrong: [`${load} kg`, `${load * 2} kg`, `${load / (ropes + 1)} kg`, `${ropes === 1 ? load / 2 : load / (ropes - 1)} kg`],
      explanation: `The load is shared by the supporting rope sections: ${load} ÷ ${ropes} = ${effort} kg.`,
      difficulty: ropes <= 2 ? 1 : 2,
      figure: { kind: "pulley", ropes, load: `${load} kg` },
      alt: `A pulley system with ${ropes} rope section${ropes === 1 ? "" : "s"} supporting a ${load} kg load.`,
    };
  },
  // Belt drive.
  (r) => {
    const crossed = r.next() < 0.5;
    const driver = r.pick(["cw", "ccw"] as const);
    const out = crossed ? opp(driver) : driver;
    return {
      prompt: `The left wheel turns ${word(driver).toLowerCase()}. Which way does the right wheel turn?`,
      correct: word(out),
      wrong: [word(opp(out)), "It doesn't turn", "It turns back and forth"],
      explanation: crossed ? "A crossed belt makes the wheels turn opposite ways." : "An open belt makes both wheels turn the same way.",
      difficulty: 1,
      figure: { kind: "belt", crossed, driver },
      alt: `Two wheels joined by a ${crossed ? "crossed" : "straight"} belt.`,
    };
  },
  // Springs.
  (r) => {
    const x = r.pick([2, 3, 4, 6]);
    const kg = r.pick([5, 10, 20]);
    const series = r.next() < 0.5;
    const stretch = series ? x * 2 : x / 2;
    return {
      prompt: `A ${kg} kg weight stretches one spring by ${x} cm. Two identical springs are joined ${series ? "end to end (one below the other)" : "side by side, sharing the weight"}. How far do they stretch under the same ${kg} kg?`,
      correct: `${stretch} cm`,
      wrong: [`${x} cm`, `${series ? x / 2 : x * 2} cm`, `${x * 4} cm`],
      explanation: series ? "End to end, each spring carries the full weight, so the total stretch doubles." : "Side by side, each spring carries half the weight, so the stretch halves.",
      difficulty: 2,
    };
  },
];

function build(): BankItem[] {
  const r = rng(9090);
  const plan = [0, 1, 3, 4, 5, 0, 6, 1, 3, 7, 0, 4, 2, 5, 0, 3, 1, 6, 4, 7];
  const out: BankItem[] = [];
  let i = 0;
  let guard = 0;
  while (out.length < 57 && guard++ < 2000) {
    const made = makers[plan[i++ % plan.length]!]!(r);
    let opts;
    try {
      opts = withAnswer(r, made.correct, made.wrong, Math.min(4, made.wrong.length + 1));
    } catch {
      continue;
    }
    if (out.some((o) => o.prompt === made.prompt && JSON.stringify(o.figure) === JSON.stringify(made.figure))) continue;
    const practice = out.length >= 55;
    out.push({
      id: practice ? `mech_p${out.length - 54}` : `mech_${pad(out.length + 1)}`,
      testId: "mechanical",
      practice,
      prompt: made.prompt,
      options: opts.options,
      answer: opts.answer,
      explanation: made.explanation,
      difficulty: made.difficulty,
      source: "original",
      ...(made.figure ? { figure: made.figure, figureAlt: made.alt } : {}),
    });
  }
  return out;
}

export const mechanicalBank = build();
