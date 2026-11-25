/**
 * Data checking: 55 pairs of records plus two practice, about half identical and half with one small change
 * of the kind that slips through in real work (0 for O, 1 for I, two digits swapped, a letter dropped). The
 * candidate says Same or Different. Generated from a fixed seed.
 */
import { type BankItem, pad, rng } from "./util";

const FIRST = ["Tatenda", "Rufaro", "Nyasha", "Kudzai", "Farai", "Chipo", "Tendai", "Rumbidzai", "Tafadzwa", "Simbarashe", "Thandiwe", "Blessing"];
const LAST = ["Moyo", "Ndlovu", "Chikore", "Banda", "Mhlanga", "Dube", "Sibanda", "Mutasa", "Zvobgo", "Makoni", "Nyathi", "Chinamasa"];
const STREETS = ["Jason Moyo Ave", "Samora Machel Ave", "Leopold Takawira St", "Herbert Chitepo St", "Robert Mugabe Rd", "Fife St", "Lobengula St", "Kwame Nkrumah Ave"];
const TOWNS = ["Harare", "Bulawayo", "Mutare", "Gweru", "Masvingo", "Kwekwe", "Chinhoyi", "Kadoma"];

type Gen = (r: ReturnType<typeof rng>) => string;
const RECORDS: { label: string; gen: Gen; difficulty: 1 | 2 | 3 }[] = [
  { label: "Name", gen: (r) => `${r.pick(FIRST)} ${r.pick(LAST)}`, difficulty: 1 },
  { label: "Address", gen: (r) => `${r.int(2, 188)} ${r.pick(STREETS)}, ${r.pick(TOWNS)}`, difficulty: 2 },
  { label: "Account", gen: (r) => `ZW-${r.int(1000, 9999)}-${String.fromCharCode(65 + r.int(0, 25))}${String.fromCharCode(65 + r.int(0, 25))}-${r.int(100, 999)}`, difficulty: 3 },
  { label: "Amount", gen: (r) => `USD ${r.int(1, 98).toLocaleString("en-GB")},${String(r.int(0, 999)).padStart(3, "0")}.${String(r.int(0, 99)).padStart(2, "0")}`, difficulty: 2 },
  { label: "Phone", gen: (r) => `+263 7${r.pick([1, 3, 7, 8])} ${r.int(100, 999)} ${r.int(1000, 9999)}`, difficulty: 2 },
  { label: "Date and reference", gen: (r) => `${String(r.int(1, 28)).padStart(2, "0")}/${String(r.int(1, 12)).padStart(2, "0")}/2026 · INV-${r.int(10000, 99999)}`, difficulty: 3 },
  { label: "Vehicle", gen: (r) => `${String.fromCharCode(65 + r.int(0, 25))}${String.fromCharCode(65 + r.int(0, 25))}${String.fromCharCode(65 + r.int(0, 25))} ${r.int(1000, 9999)}`, difficulty: 1 },
];

const LOOKALIKE: Record<string, string> = { O: "0", "0": "O", I: "1", "1": "I", B: "8", "8": "B", S: "5", "5": "S", Z: "2", "2": "Z", G: "6", "6": "G", a: "o", o: "a", e: "c", n: "m", m: "n", u: "v" };

/** One small change, of a kind people really miss. */
function alter(r: ReturnType<typeof rng>, s: string): string {
  const spots = [...s].map((c, i) => (/[A-Za-z0-9]/.test(c) ? i : -1)).filter((i) => i >= 0);
  for (let tries = 0; tries < 20; tries++) {
    const i = r.pick(spots);
    const c = s[i]!;
    const how = r.int(0, 2);
    let t = s;
    if (how === 0 && LOOKALIKE[c]) t = s.slice(0, i) + LOOKALIKE[c] + s.slice(i + 1);
    else if (how === 1 && i + 1 < s.length && /[A-Za-z0-9]/.test(s[i + 1]!) && s[i + 1] !== c) t = s.slice(0, i) + s[i + 1] + c + s.slice(i + 2);
    else if (how === 2 && /[a-z]/.test(c) && i > 0) t = s.slice(0, i) + s.slice(i + 1);
    if (t !== s) return t;
  }
  const i = r.pick(spots);
  return s.slice(0, i) + (s[i] === "7" ? "1" : "7") + s.slice(i + 1);
}

function build(): BankItem[] {
  const r = rng(5150);
  const out: BankItem[] = [];
  for (let i = 0; i < 57; i++) {
    const rec = RECORDS[i % RECORDS.length]!;
    const left = rec.gen(r);
    const same = r.next() < 0.5;
    const right = same ? left : alter(r, left);
    const practice = i >= 55;
    out.push({
      id: practice ? `chk_p${i - 54}` : `chk_${pad(i + 1)}`,
      testId: "checking",
      practice,
      prompt: `${rec.label}: is the copy the same as the original?`,
      figure: { kind: "pair", left, right },
      figureAlt: `Original: ${left}. Copy: ${right}.`,
      options: ["Same", "Different"],
      answer: same ? 0 : 1,
      explanation: same ? "Every character matches." : "One character differs.",
      difficulty: rec.difficulty,
      source: "original",
    });
  }
  return out;
}

export const checkingBank = build();
