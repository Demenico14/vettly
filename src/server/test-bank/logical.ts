/**
 * Logical (deductive) reasoning: 55 questions plus two practice. Three kinds: syllogisms with workplace terms
 * (including the classic traps, such as "all A are B, X is B" proving nothing), if-then rules, and ordering
 * puzzles whose clues are added until exactly one arrangement fits, checked by trying every arrangement.
 * Generated from a fixed seed.
 */
import { type BankItem, pad, rng, withAnswer } from "./util";

const NONE = "None of these must be true";
const PEOPLE = ["Chipo", "Tendai", "Farai", "Rudo", "Nyasha", "Tafadzwa", "Kuda", "Rumbi"];
/** [group, all of them…, one person…, one person not…, some of them not…] */
const GROUPS = [
  ["branch managers", "have completed the compliance course", "has completed the compliance course", "has not completed the compliance course", "have not completed the compliance course"],
  ["forklift operators", "hold a valid operator card", "holds a valid operator card", "does not hold a valid operator card", "do not hold a valid operator card"],
  ["auditors", "have signed the independence statement", "has signed the independence statement", "has not signed the independence statement", "have not signed the independence statement"],
  ["night-shift drivers", "carry a two-way radio", "carries a two-way radio", "does not carry a two-way radio", "do not carry a two-way radio"],
  ["senior engineers", "are registered with ECZ", "is registered with ECZ", "is not registered with ECZ", "are not registered with ECZ"],
  ["finance officers", "can approve payments under USD 500", "can approve payments under USD 500", "cannot approve payments under USD 500", "cannot approve payments under USD 500"],
] as const;

type Made = { prompt: string; correct: string; wrong: string[]; explanation: string; difficulty: 1 | 2 | 3; stimulus?: string };

function syllogism(r: ReturnType<typeof rng>, k: number): Made {
  const [group, plural, has, hasNot, someNot] = r.pick(GROUPS);
  const x = r.pick(PEOPLE);
  const singular = group.replace(/s$/, "").replace(/ies$/, "y");
  const forms = [
    (): Made => ({
      stimulus: `All ${group} ${plural}. ${x} is one of the ${group}.`,
      prompt: "Which statement must be true?",
      correct: `${x} ${has}`,
      wrong: [`${x} ${hasNot}`, `Only ${group} ${plural}`, NONE],
      explanation: `Everything true of all ${group} is true of ${x}.`,
      difficulty: 1,
    }),
    (): Made => ({
      stimulus: `All ${group} ${plural}. ${x} ${hasNot}.`,
      prompt: "Which statement must be true?",
      correct: `${x} is not one of the ${group}`,
      wrong: [`${x} will become one of the ${group}`, `Some ${group} ${someNot}`, NONE],
      explanation: `If ${x} were one of the ${group}, ${x} would have to meet the rule. ${x} doesn't, so ${x} isn't one of them.`,
      difficulty: 2,
    }),
    (): Made => ({
      stimulus: `All ${group} ${plural}. ${x} ${has}.`,
      prompt: "Which statement must be true?",
      correct: NONE,
      wrong: [`${x} is one of the ${group}`, `${x} is not one of the ${group}`, `Everyone who ${has} is one of the ${group}`],
      explanation: `Other people can meet the rule too, so ${x} meeting it says nothing about whether ${x} is one of the ${group}.`,
      difficulty: 2,
    }),
    (): Made => ({
      stimulus: `No ${group} work on Sundays. ${x} works on Sundays.`,
      prompt: "Which statement must be true?",
      correct: `${x} is not one of the ${group}`,
      wrong: [`${x} is one of the ${group}`, `Some ${group} work on Sundays`, NONE],
      explanation: `No ${singular} works on Sundays, and ${x} does, so ${x} can't be one.`,
      difficulty: 1,
    }),
    (): Made => ({
      stimulus: `Some ${group} work in Bulawayo. ${x} is one of the ${group}.`,
      prompt: "Which statement must be true?",
      correct: NONE,
      wrong: [`${x} works in Bulawayo`, `${x} does not work in Bulawayo`, `All ${group} work in Bulawayo`],
      explanation: `"Some" doesn't say which ones, so nothing follows about ${x}.`,
      difficulty: 2,
    }),
    (): Made => ({
      stimulus: `All ${group} ${plural}. Some of the people on the training course are ${group}.`,
      prompt: "Which statement must be true?",
      correct: `Some people on the training course ${plural}`,
      wrong: [`Everyone on the training course ${has}`, `All ${group} are on the training course`, NONE],
      explanation: `The ${group} on the course meet the rule, so at least some people on the course do.`,
      difficulty: 3,
    }),
  ];
  return forms[k % forms.length]!();
}

function conditional(r: ReturnType<typeof rng>, k: number): Made {
  const rules = [
    ["a delivery is late", "the client is phoned", "the delivery was late", "the client was phoned"],
    ["an expense is over USD 200", "a manager approves it", "the expense was over USD 200", "a manager approved it"],
    ["a machine is serviced", "a tag is attached", "the machine was serviced", "a tag was attached"],
    ["a vacancy is advertised externally", "it is posted for five working days", "the vacancy was advertised externally", "it was posted for five working days"],
  ] as const;
  const [p, q, pPast, qPast] = rules[Math.floor(k / 3) % rules.length]!;
  const not = (s: string) =>
    s
      .replace(/^the client was phoned$/, "the client was not phoned")
      .replace(/^a manager approved it$/, "a manager did not approve it")
      .replace(/^a tag was attached$/, "no tag was attached")
      .replace(/^it was posted for five working days$/, "it was not posted for five working days")
      .replace(/^the delivery was late$/, "the delivery was not late")
      .replace(/^the expense was over USD 200$/, "the expense was not over USD 200")
      .replace(/^the machine was serviced$/, "the machine was not serviced")
      .replace(/^the vacancy was advertised externally$/, "the vacancy was not advertised externally");
  const forms = [
    (): Made => ({
      stimulus: `Rule: if ${p}, ${q}. Today, ${not(qPast)}.`,
      prompt: "Which statement must be true?",
      correct: cap(not(pPast)),
      wrong: [cap(pPast), cap(qPast), NONE],
      explanation: `If ${pPast.replace(/^the /, "")} had happened, ${qPast} would follow. It didn't, so ${not(pPast)}.`,
      difficulty: 2,
    }),
    (): Made => ({
      stimulus: `Rule: if ${p}, ${q}. Today, ${qPast}.`,
      prompt: "Which statement must be true?",
      correct: NONE,
      wrong: [cap(pPast), cap(not(pPast)), `The rule was broken`],
      explanation: `${cap(qPast)} can happen for other reasons, so it proves nothing about whether ${pPast}.`,
      difficulty: 3,
    }),
    (): Made => ({
      stimulus: `Rule: if ${p}, ${q}. Today, ${pPast}.`,
      prompt: "Which statement must be true?",
      correct: cap(qPast),
      wrong: [cap(not(qPast)), `The rule does not apply today`, NONE],
      explanation: `The rule applies, so ${qPast}.`,
      difficulty: 1,
    }),
  ];
  return forms[k % forms.length]!();
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

/** Four people in four slots; clues added at random until exactly one arrangement fits. */
function ordering(r: ReturnType<typeof rng>, difficulty: 1 | 2 | 3): Made | null {
  const settings = [
    { slots: ["first", "second", "third", "fourth"], noun: "in the queue", ask: "Who is third in the queue?", askIndex: 2 },
    { slots: ["early", "morning", "afternoon", "late"], noun: "shift", ask: "Who works the late shift?", askIndex: 3 },
    { slots: ["ground", "first", "second", "third"], noun: "floor", ask: "Who works on the second floor?", askIndex: 2 },
    { slots: ["desk 1", "desk 2", "desk 3", "desk 4"], noun: "desk", ask: "Who sits at desk 1?", askIndex: 0 },
  ];
  const s = r.pick(settings);
  const people = r.shuffle(PEOPLE).slice(0, 4);
  const truth = r.shuffle(people); // truth[i] is in slot i
  const at = (arr: string[], p: string) => arr.indexOf(p);
  type Clue = { text: string; ok: (a: string[]) => boolean };
  const pool: Clue[] = [];
  for (const a of people)
    for (const b of people) {
      if (a === b) continue;
      if (at(truth, a) < at(truth, b)) pool.push({ text: `${a} is somewhere before ${b}.`, ok: (x) => at(x, a) < at(x, b) });
      if (Math.abs(at(truth, a) - at(truth, b)) === 1) pool.push({ text: `${a} is next to ${b}.`, ok: (x) => Math.abs(at(x, a) - at(x, b)) === 1 });
      if (at(truth, a) === at(truth, b) + 1) pool.push({ text: `${a} is directly after ${b}.`, ok: (x) => at(x, a) === at(x, b) + 1 });
    }
  for (const a of people) {
    const i = at(truth, a);
    pool.push({ text: `${a} is not ${slotName(s, (i + 1) % 4)}.`, ok: (x) => at(x, a) !== (i + 1) % 4 });
    if (difficulty === 1) pool.push({ text: `${a} is ${slotName(s, i)}.`, ok: (x) => at(x, a) === i });
  }
  const all = permutations(people);
  const chosen: Clue[] = [];
  for (const c of r.shuffle(pool)) {
    const before = all.filter((p) => chosen.every((k) => k.ok(p))).length;
    const after = all.filter((p) => [...chosen, c].every((k) => k.ok(p))).length;
    if (after < before) chosen.push(c);
    if (after === 1) break;
  }
  const fits = all.filter((p) => chosen.every((k) => k.ok(p)));
  if (fits.length !== 1 || chosen.length < 2 || chosen.length > 6) return null;
  const answer = truth[s.askIndex]!;
  return {
    stimulus: `${people.join(", ").replace(/, ([^,]*)$/, " and $1")} each take one ${s.noun === "in the queue" ? "place in the queue" : s.noun}: ${s.slots.join(", ")}.\n${chosen.map((c) => c.text).join(" ")}`,
    prompt: s.ask,
    correct: answer,
    wrong: people.filter((p) => p !== answer),
    explanation: `Only one arrangement fits every clue: ${truth.map((p, i) => `${s.slots[i]} ${p}`).join(", ")}.`,
    difficulty: chosen.length <= 3 ? 2 : 3,
  };
}
const slotName = (s: { slots: string[]; noun: string }, i: number) =>
  s.noun === "in the queue" ? `${s.slots[i]} in the queue` : s.noun === "desk" ? `at ${s.slots[i]}` : `on the ${s.slots[i]} ${s.noun}`;

/** Fixed quotas: every if-then rule in every form (12), 21 ordering puzzles, 22 syllogisms and 2 practice. */
function build(): BankItem[] {
  const r = rng(4242);
  const made: Made[][] = [[], [], []];
  const seen = new Set<string>();
  const add = (list: Made[], m: Made | null) => {
    if (!m) return false;
    const k = `${m.stimulus}|${m.prompt}`;
    if (seen.has(k)) return false;
    seen.add(k);
    list.push(m);
    return true;
  };
  for (let k = 0; k < 12; k++) add(made[1]!, conditional(r, k));
  for (let g = 0; made[2]!.length < 21 && g < 5000; g++) add(made[2]!, ordering(r, (g % 3 === 0 ? 1 : 2) as 1 | 2));
  for (let k = 0, g = 0; made[0]!.length < 24 && g < 5000; g++, k++) add(made[0]!, syllogism(r, k));
  // Interleave the kinds so a drawn set mixes them; the last two syllogisms are practice.
  const practice = made[0]!.splice(-2);
  const order: Made[] = [];
  for (let k = 0; order.length < 55; k++) for (const list of made) if (list[k] && order.length < 55) order.push(list[k]!);
  return [...order, ...practice].map((m, i) => {
    const opts = withAnswer(r, m.correct, m.wrong, Math.min(4, m.wrong.length + 1));
    // Keep "None of these must be true" last, as candidates expect.
    const noneAt = opts.options.indexOf(NONE);
    if (noneAt >= 0 && noneAt !== opts.options.length - 1) {
      const correctText = opts.options[opts.answer]!;
      opts.options.splice(noneAt, 1);
      opts.options.push(NONE);
      opts.answer = opts.options.indexOf(correctText);
    }
    const isPractice = i >= 55;
    return {
      id: isPractice ? `log_p${i - 54}` : `log_${pad(i + 1)}`,
      testId: "logical",
      practice: isPractice,
      stimulus: m.stimulus,
      prompt: m.prompt,
      options: opts.options,
      answer: opts.answer,
      explanation: m.explanation,
      difficulty: m.difficulty,
      source: "original" as const,
    };
  });
}

export const logicalBank = build();
