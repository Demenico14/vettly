/**
 * Integrity and reliability: 56 original statements, answered from strongly disagree to strongly agree, across
 * the test's five scales: honesty attitudes, rule adherence, dependability, workplace conduct and candour.
 * Candour statements describe an idealised picture ("I have never…"): agreeing with many of them sends the
 * profile to a person for review, never to rejection. Keyed + means agreement scores high on the scale.
 */
import type { BankItem } from "./util";

const ITEMS: [string, string, "+" | "-"][] = [
  // Honesty attitudes
  ["Taking stationery home from work is a form of stealing.", "int_honesty", "+"],
  ["Small fiddles on expense claims don't really hurt anyone.", "int_honesty", "-"],
  ["I would tell my manager if I was paid too much by mistake.", "int_honesty", "+"],
  ["Most people would take money from the till if they knew they'd never be caught.", "int_honesty", "-"],
  ["Covering for a colleague who clocked in late is just being a good teammate.", "int_honesty", "-"],
  ["I would report a supplier who offered me a personal gift to win an order.", "int_honesty", "+"],
  ["It's fine to round up the hours on a timesheet when you've worked hard.", "int_honesty", "-"],
  ["Honesty matters even when the amount involved is tiny.", "int_honesty", "+"],
  ["If a company is very profitable, taking a little extra is understandable.", "int_honesty", "-"],
  ["I would rather admit a costly mistake than let it be blamed on the system.", "int_honesty", "+"],
  ["Using a work vehicle for personal errands is acceptable if you replace the fuel.", "int_honesty", "-"],
  ["I tell customers the truth about delivery dates, even when it loses the sale.", "int_honesty", "+"],
  ["People who are strict about honesty at work are naive.", "int_honesty", "-"],
  // Rule adherence
  ["I follow safety procedures even when no one is checking.", "int_rules", "+"],
  ["Rules at work are guidelines; experienced people know when to skip them.", "int_rules", "-"],
  ["I sign documents only after reading them properly.", "int_rules", "+"],
  ["If a procedure slows me down, I find a quicker way round it.", "int_rules", "-"],
  ["I ask before using a system or tool I haven't been trained on.", "int_rules", "+"],
  ["Getting results matters more than how they were achieved.", "int_rules", "-"],
  ["I keep customer information confidential, even from friends who ask.", "int_rules", "+"],
  ["Sharing a login with a trusted colleague is harmless.", "int_rules", "-"],
  ["I follow the approval process for spending, even for small amounts.", "int_rules", "+"],
  ["Policies are written by people who don't do the real work.", "int_rules", "-"],
  ["When a rule seems wrong, I raise it rather than ignore it.", "int_rules", "+"],
  // Dependability
  ["I arrive on time for shifts and meetings.", "int_reliable", "+"],
  ["I sometimes agree to deadlines I know I won't meet.", "int_reliable", "-"],
  ["When I say I'll do something, I do it.", "int_reliable", "+"],
  ["I let people know early if I'm going to be late with work.", "int_reliable", "+"],
  ["Finishing a task properly matters less to me than starting the next one.", "int_reliable", "-"],
  ["Colleagues can count on me to cover my part of a job.", "int_reliable", "+"],
  ["I often forget commitments I've made.", "int_reliable", "-"],
  ["I keep going with dull tasks until they're done.", "int_reliable", "+"],
  ["Calling in sick when you're just tired is reasonable now and then.", "int_reliable", "-"],
  ["I check my work before handing it over.", "int_reliable", "+"],
  ["I leave tasks unfinished when something more interesting comes up.", "int_reliable", "-"],
  // Workplace conduct
  ["In the past year I have taken longer breaks than I was allowed.", "int_conduct", "-"],
  ["I have argued with a colleague in front of customers.", "int_conduct", "-"],
  ["I treat colleagues with respect, even ones I don't like.", "int_conduct", "+"],
  ["I have spread rumours about people at work.", "int_conduct", "-"],
  ["I have deliberately worked slowly to make a point.", "int_conduct", "-"],
  ["I stay calm and polite when customers are rude.", "int_conduct", "+"],
  ["I have used work time for personal business on a regular basis.", "int_conduct", "-"],
  ["I clean up after myself in shared spaces.", "int_conduct", "+"],
  ["I have damaged equipment through carelessness and not reported it.", "int_conduct", "-"],
  ["I speak up when I see someone being treated unfairly.", "int_conduct", "+"],
  ["I have come to work under the influence of alcohol.", "int_conduct", "-"],
  ["I take care of company property as if it were my own.", "int_conduct", "+"],
  ["I have ignored instructions from a supervisor because I disagreed.", "int_conduct", "-"],
  // Candour (agreeing describes an unusually idealised picture)
  ["I have never told a lie, not even a small one.", "int_candour", "-"],
  ["I have never been annoyed with anyone at work.", "int_candour", "-"],
  ["I always say exactly what I think, without exception.", "int_candour", "-"],
  ["Sometimes I put off things I should do.", "int_candour", "+"],
  ["I have never been late for anything.", "int_candour", "-"],
  ["Like most people, I have broken a minor rule at some point.", "int_candour", "+"],
  ["I have never felt jealous of a colleague's success.", "int_candour", "-"],
  ["I occasionally lose my temper.", "int_candour", "+"],
];

export const integrityBank: BankItem[] = [
  ...ITEMS.map(([prompt, scale, keyed], i): BankItem => ({ id: `int_${String(i + 1).padStart(2, "0")}`, testId: "integrity", practice: false, scale, keyed, prompt, difficulty: 1, source: "original" })),
  { id: "int_p1", testId: "integrity", practice: true, prompt: "I enjoy learning how things work.", difficulty: 1, source: "original" },
  { id: "int_p2", testId: "integrity", practice: true, prompt: "I like to plan my week in advance.", difficulty: 1, source: "original" },
];
