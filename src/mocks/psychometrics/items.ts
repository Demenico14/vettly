/**
 * MOCK DATA — sample and practice items. Ability, SJT, integrity, motivation, EI and knowledge items are
 * original. The personality examples are well-known IPIP items, which are public domain (ipip.ori.org).
 * Answers are verified in scripts/check-psychometrics.mjs where they can be computed.
 * Only a handful per test: the full item banks are metadata, not content, in Phase 1.
 */
import type { SampleItem } from "../../types/psychometrics";

const BRANCH_TABLE =
  "Quarterly revenue, USD thousands\nBranch | Q1 | Q2\nHarare | 420 | 462\nBulawayo | 310 | 279\nMutare | 150 | 168";

const LEAVE_POLICY =
  "Staff may carry up to five unused leave days into the next calendar year. Carried-over days must be taken by 31 March, after which they lapse. Managers may approve exceptions in writing for staff on approved study leave.";

export const sampleItems: SampleItem[] = [
  /* Numerical */
  { id: "itm_num_1", testId: "tst_num_grad", practice: true, stimulus: BRANCH_TABLE, prompt: "By what percentage did Harare's revenue grow from Q1 to Q2?", options: ["8%", "10%", "12%", "42%"], answer: 1, explanation: "462 ÷ 420 = 1.10, so revenue grew by 10%.", source: "original" },
  { id: "itm_num_2", testId: "tst_num_grad", practice: true, stimulus: BRANCH_TABLE, prompt: "Which branch's revenue fell between Q1 and Q2?", options: ["Harare", "Bulawayo", "Mutare", "None of them"], answer: 1, explanation: "Bulawayo fell from 310 to 279.", source: "original" },
  { id: "itm_num_3", testId: "tst_num_grad", practice: true, prompt: "An invoice for ZAR 18 500 is paid in US dollars at USD 1 = ZAR 18.50. How much is paid?", options: ["USD 925", "USD 1 000", "USD 1 850", "USD 3 422"], answer: 1, explanation: "18 500 ÷ 18.50 = 1 000.", source: "original" },
  { id: "itm_num_4", testId: "tst_num_prof", practice: true, stimulus: BRANCH_TABLE, prompt: "What share of total Q2 revenue came from Mutare, to the nearest percent?", options: ["15%", "18%", "19%", "21%"], answer: 1, explanation: "Q2 total = 462 + 279 + 168 = 909. 168 ÷ 909 = 18.5%, which rounds to 18%.", source: "original" },
  { id: "itm_num_5", testId: "tst_num_ops", practice: true, prompt: "A shelf holds 24 boxes of 12 tins. 37 tins are sold. How many tins are left?", options: ["251", "253", "261", "288"], answer: 0, explanation: "24 × 12 = 288; 288 − 37 = 251.", source: "original" },

  /* Verbal */
  { id: "itm_verb_1", testId: "tst_verb_grad", practice: true, stimulus: LEAVE_POLICY, prompt: "Staff can carry seven unused leave days into the next year.", options: ["True", "False", "Cannot say"], answer: 1, explanation: "The limit is five days.", source: "original" },
  { id: "itm_verb_2", testId: "tst_verb_grad", practice: true, stimulus: LEAVE_POLICY, prompt: "Carried-over days that are not taken by 31 March are lost, unless an exception applies.", options: ["True", "False", "Cannot say"], answer: 0, explanation: "Days lapse after 31 March; written exceptions are possible for staff on study leave.", source: "original" },
  { id: "itm_verb_3", testId: "tst_verb_grad", practice: true, stimulus: LEAVE_POLICY, prompt: "Most staff carry over the full five days.", options: ["True", "False", "Cannot say"], answer: 2, explanation: "The passage says nothing about how many days staff actually carry over.", source: "original" },
  { id: "itm_read_1", testId: "tst_verb_ops", practice: true, stimulus: "Forklift keys must be signed out at the security office and returned before the end of the shift. Only staff with a valid operator card may sign out keys.", prompt: "What must you have before you can sign out forklift keys?", options: ["A supervisor's permission", "A valid operator card", "A shift roster", "A security pass"], answer: 1, source: "original" },

  /* Inductive, deductive, critical thinking */
  { id: "itm_ind_1", testId: "tst_inductive", practice: true, prompt: "What number comes next? 2, 6, 12, 20, 30, …", options: ["36", "40", "42", "48"], answer: 2, explanation: "The gaps grow by two each time: +4, +6, +8, +10, so the next gap is +12.", source: "original" },
  { id: "itm_ind_2", testId: "tst_inductive", practice: true, prompt: "What letter comes next? C, F, I, L, …", options: ["M", "N", "O", "P"], answer: 2, explanation: "Each letter is three further along the alphabet.", source: "original" },
  { id: "itm_ded_1", testId: "tst_deductive", practice: true, prompt: "All branch managers have completed the compliance course. Thandi has not completed it. Which statement must be true?", options: ["Thandi is not a branch manager", "Thandi will be a branch manager soon", "Some branch managers have not completed it", "None of these must be true"], answer: 0, source: "original" },
  { id: "itm_ded_2", testId: "tst_deductive", practice: true, prompt: "Three drivers, A, B and C, each take one shift: early, day or late. A doesn't drive late. B drives the day shift. Who drives late?", options: ["A", "B", "C", "It can't be decided"], answer: 2, explanation: "B has the day shift and A can't take the late shift, so C does.", source: "original" },
  { id: "itm_ct_1", testId: "tst_critical", practice: true, scale: "ct_assumptions", stimulus: "\"We should open a branch in Kitwe. Our Ndola branch has grown every quarter for two years.\"", prompt: "Which assumption does this argument rely on?", options: ["Kitwe customers will behave like Ndola customers", "Ndola will keep growing", "Kitwe has no competing branches", "Opening branches is cheap"], answer: 0, source: "original" },

  /* Mechanical, spatial, checking */
  { id: "itm_mech_1", testId: "tst_mechanical", practice: true, prompt: "Gear A has 20 teeth and drives gear B, which has 40 teeth. Gear A turns clockwise at 60 rpm. How does gear B turn?", options: ["Clockwise at 120 rpm", "Anticlockwise at 30 rpm", "Anticlockwise at 120 rpm", "Clockwise at 30 rpm"], answer: 1, explanation: "Meshed gears turn in opposite directions, and speed scales inversely with the number of teeth.", source: "original" },
  { id: "itm_spat_1", testId: "tst_spatial", practice: true, prompt: "Which capital letter looks exactly the same after being rotated 180°?", options: ["N", "R", "F", "G"], answer: 0, source: "original" },
  { id: "itm_chk_1", testId: "tst_checking", practice: true, prompt: "Are these the same?  ZW-4471-BQ-208  |  ZW-4471-BO-208", options: ["Same", "Different"], answer: 1, explanation: "The fourth group differs: BQ against BO.", source: "original" },
  { id: "itm_chk_2", testId: "tst_checking", practice: true, prompt: "Are these the same?  14 Jason Moyo Ave, Harare  |  14 Jason Moyo Ave, Harare", options: ["Same", "Different"], answer: 0, source: "original" },

  /* Personality: public-domain IPIP items */
  { id: "itm_bf_1", testId: "tst_big_five", scale: "bf_co1", practice: false, prompt: "Am always prepared.", keyed: "+", source: "ipip" },
  { id: "itm_bf_2", testId: "tst_big_five", scale: "bf_co2", practice: false, prompt: "Pay attention to details.", keyed: "+", source: "ipip" },
  { id: "itm_bf_3", testId: "tst_big_five", scale: "bf_es1", practice: false, prompt: "Get stressed out easily.", keyed: "-", source: "ipip" },
  { id: "itm_bf_4", testId: "tst_big_five", scale: "bf_ag1", practice: false, prompt: "Sympathize with others' feelings.", keyed: "+", source: "ipip" },
  { id: "itm_bf_5", testId: "tst_big_five", scale: "bf_ex1", practice: false, prompt: "Feel comfortable around people.", keyed: "+", source: "ipip" },
  { id: "itm_bf_6", testId: "tst_big_five", scale: "bf_op1", practice: false, prompt: "Have a vivid imagination.", keyed: "+", source: "ipip" },

  /* Work styles: an original forced-choice triad */
  {
    id: "itm_ws_1",
    testId: "tst_work_styles",
    practice: true,
    prompt: "Choose the statement most like you and the one least like you.",
    options: ["I plan my week before it starts.", "I enjoy persuading people to see things my way.", "I stay calm when deadlines move."],
    explanation: "Each statement measures a different scale (planning, influence, composure). There's no right answer.",
    source: "original",
  },

  /* SJT */
  {
    id: "itm_sjt_1",
    testId: "tst_sjt_service",
    practice: true,
    stimulus: "A customer at the counter says they were charged twice for the same prepaid electricity token. The queue behind them is long, and your system shows only one transaction.",
    prompt: "Choose the most effective and least effective response.",
    options: [
      "Tell them the system shows one transaction, so there's nothing you can do.",
      "Take their details and the bank reference, log a query, and tell them when they'll hear back.",
      "Refund the second charge from the till so the queue keeps moving.",
      "Ask them to come back when it's quieter.",
    ],
    effectiveness: [1, 4, 2, 1],
    explanation: "Logging the query resolves the issue within policy and sets expectations. Refunding from the till without evidence breaks cash-handling rules.",
    source: "original",
  },
  {
    id: "itm_sjt_2",
    testId: "tst_sjt_prof",
    scale: "sjt_prioritise",
    practice: true,
    stimulus: "Your manager asks for the month-end variance report by 3 p.m. At 1 p.m. a senior colleague asks you to drop everything and fix figures for a board pack due tomorrow morning.",
    prompt: "Rate how effective each response would be.",
    options: [
      "Do the board pack first, because the colleague is more senior.",
      "Tell your colleague you'll start at 3 p.m. once the report is in, and check that this works for them.",
      "Ask your manager which comes first, explaining both deadlines.",
      "Try to do both at once and submit whatever is ready at 3 p.m.",
    ],
    effectiveness: [2, 4, 3, 1],
    source: "original",
  },
  {
    id: "itm_sjt_3",
    testId: "tst_sjt_lead",
    scale: "sjl_people",
    practice: true,
    stimulus: "A reliable team member has missed three deadlines this month. Others are starting to cover for them.",
    prompt: "Rate how effective each response would be.",
    options: [
      "Wait to see whether it improves next month.",
      "Meet privately, describe the pattern, ask what's happening and agree next steps.",
      "Redistribute their work quietly so the team isn't affected.",
      "Raise it at the next team meeting so expectations are clear.",
    ],
    effectiveness: [1, 4, 2, 1],
    source: "original",
  },

  /* Integrity, EI, motivation (original statements) */
  { id: "itm_int_1", testId: "tst_integrity", scale: "int_honesty", practice: false, prompt: "Taking small items home from work is fine if nobody will notice.", keyed: "-", source: "original" },
  { id: "itm_int_2", testId: "tst_integrity", scale: "int_reliable", practice: false, prompt: "When I promise a colleague something, I do it even if it becomes inconvenient.", keyed: "+", source: "original" },
  { id: "itm_int_3", testId: "tst_integrity", scale: "int_candour", practice: false, prompt: "I have never been irritated with anyone at work.", keyed: "-", explanation: "Candour item: almost everyone is sometimes irritated, so strong agreement suggests an idealised answer.", source: "original" },
  { id: "itm_ei_1", testId: "tst_ei", scale: "ei_empathy", practice: false, prompt: "I can tell when a colleague is upset, even if they don't say so.", keyed: "+", source: "original" },
  { id: "itm_mot_1", testId: "tst_motivation", scale: "mot_6", practice: false, prompt: "Being told exactly how to do every part of a task.", keyed: "-", explanation: "Rated from 'greatly reduces my motivation' to 'greatly increases it'. Low ratings indicate a strong Autonomy motivator.", source: "original" },

  /* Knowledge and language */
  { id: "itm_xl_1", testId: "tst_excel", scale: "xl_formulas", practice: true, prompt: "Which formula totals B2:B10 only for rows where column C is \"Harare\"?", options: ['=SUM(B2:B10,"Harare")', '=SUMIF(C2:C10,"Harare",B2:B10)', '=COUNTIF(C2:C10,"Harare")', '=IF(C2="Harare",SUM(B2:B10))'], answer: 1, source: "original" },
  { id: "itm_acc_1", testId: "tst_accounting", scale: "acc_ifrs", practice: true, prompt: "Under IFRS 16, what does a lessee recognise at the start of most leases?", options: ["Only a lease expense each month", "A right-of-use asset and a lease liability", "An intangible asset only", "A provision for future rentals"], answer: 1, source: "original" },
  { id: "itm_en_1", testId: "tst_english", scale: "en_grammar", practice: true, prompt: "Neither the manager nor the analysts ___ available on Friday.", options: ["is", "are", "was", "be"], answer: 1, explanation: "With 'neither … nor', the verb agrees with the nearer subject: 'analysts are'.", source: "original" },
  { id: "itm_typ_1", testId: "tst_typing", practice: true, prompt: "Please find attached the signed delivery note for order 4471. The second pallet will arrive in Gweru on Thursday morning.", source: "original" },
];
