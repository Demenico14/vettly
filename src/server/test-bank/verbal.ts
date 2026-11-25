/**
 * Verbal reasoning: eleven original workplace passages with five statements each (55), plus a short practice
 * passage. The candidate judges each statement True, False or Cannot say, using only the passage. Difficulty
 * rises with how much inference a statement needs; "Cannot say" items test not reading in what isn't there.
 */
import type { BankItem } from "./util";

const T = 0;
const F = 1;
const C = 2;
type S = [string, 0 | 1 | 2, 1 | 2 | 3, string];

const PASSAGES: { title: string; text: string; statements: S[] }[] = [
  {
    title: "Leave carry-over",
    text: "Staff may carry up to five unused leave days into the next calendar year. Carried-over days must be taken by 31 March, after which they lapse. Managers may approve exceptions in writing for staff on approved study leave. Leave cannot be exchanged for pay except when someone leaves the company.",
    statements: [
      ["Staff can carry seven unused leave days into the next year.", F, 1, "The limit is five days."],
      ["A carried-over day not taken by 31 March is normally lost.", T, 1, "Carried-over days lapse after 31 March."],
      ["Someone on approved study leave may keep carried-over days past 31 March with written approval.", T, 2, "Managers may approve exceptions in writing for staff on study leave."],
      ["Most staff carry over the full five days.", C, 2, "The passage says nothing about how many days people actually carry over."],
      ["A member of staff can sell unused leave back to the company at any time.", F, 2, "Leave can be paid out only when someone leaves."],
    ],
  },
  {
    title: "Fleet servicing",
    text: "Every company vehicle must be serviced every 10,000 km or every six months, whichever comes first. Drivers book services through the fleet office, which keeps the service history. A vehicle that misses a service is taken off the road until it has been serviced. Tyres are checked at every service, but are replaced only when tread falls below 2 mm.",
    statements: [
      ["A vehicle that has done 8,000 km in seven months is overdue for a service.", T, 2, "Six months has passed, which comes first."],
      ["Drivers keep their own vehicle's service records.", F, 1, "The fleet office keeps the service history."],
      ["Tyres are replaced at every service.", F, 1, "Tyres are checked at every service but replaced only below 2 mm of tread."],
      ["The fleet office uses an outside garage for services.", C, 2, "The passage doesn't say who carries out the services."],
      ["A vehicle can stay in use for a short time after missing a service if the driver reports it.", F, 3, "A vehicle that misses a service is taken off the road until serviced; there's no grace period."],
    ],
  },
  {
    title: "Mobile money rollout",
    text: "From 1 March, customers in Masvingo and Gweru can pay their accounts by mobile money. The service will reach other provinces once the first two have run for three months without a major fault. Customers pay no fee for mobile payments; the company absorbs the transaction cost. Cash payments at branches will continue for the foreseeable future.",
    statements: [
      ["Customers in Bulawayo can pay by mobile money from 1 March.", F, 1, "Only Masvingo and Gweru start on 1 March."],
      ["Customers pay a small fee for each mobile payment.", F, 1, "Customers pay no fee."],
      ["The service will reach other provinces no earlier than June.", T, 3, "It needs three months without a major fault after 1 March, so 1 June at the earliest."],
      ["Branches will stop accepting cash once mobile money is available everywhere.", F, 2, "Cash payments will continue for the foreseeable future."],
      ["Most customers in Masvingo will switch to mobile money.", C, 2, "The passage doesn't predict take-up."],
    ],
  },
  {
    title: "Purchasing rules",
    text: "Purchases under USD 500 need one quote and a line manager's approval. Purchases from USD 500 to USD 5,000 need three written quotes and approval from the finance manager. Anything above USD 5,000 goes to the tender committee, which meets on the first Monday of each month. Emergency repairs may skip quotes, but must be reported to finance within two working days.",
    statements: [
      ["A USD 450 purchase needs the finance manager's approval.", F, 1, "Under USD 500 needs a line manager's approval."],
      ["A USD 5,000 purchase needs three written quotes.", T, 2, "USD 500 to USD 5,000 includes 5,000."],
      ["A USD 7,200 purchase could be approved on a Wednesday by the finance manager.", F, 2, "Above USD 5,000 goes to the tender committee."],
      ["Emergency repairs never need to be reported.", F, 1, "They must be reported within two working days."],
      ["The tender committee approves most of the purchases it reviews.", C, 2, "The passage doesn't say."],
    ],
  },
  {
    title: "Underground safety",
    text: "No one may go underground without a lamp, a self-rescuer and a tag at the lamp room. The shift supervisor counts tags at the start and end of every shift. If a tag is still on the board at the end of a shift, a search begins immediately. Visitors must be accompanied by a qualified miner at all times underground.",
    statements: [
      ["A miner may go underground without a self-rescuer if the shift is short.", F, 1, "No one may go underground without one."],
      ["Tags are counted twice each shift.", T, 1, "At the start and at the end."],
      ["A tag left on the board at the end of a shift means the miner has had an accident.", C, 3, "It means a search begins; the passage doesn't say what it means."],
      ["A visitor may walk alone underground once they have a lamp.", F, 2, "Visitors must be accompanied at all times."],
      ["The shift supervisor is a qualified miner.", C, 2, "The passage doesn't say."],
    ],
  },
  {
    title: "Personal information",
    text: "Candidates' CVs may be kept for twelve months after a vacancy closes, unless the candidate agrees to stay in the talent pool longer. Anyone can ask what personal information we hold about them, and we must reply within 30 days. Information is shared with hiring managers only for the vacancy the candidate applied for. CVs are never sold or passed to recruitment agencies.",
    statements: [
      ["A CV may be kept for eighteen months if the candidate agrees to join the talent pool.", T, 2, "Longer retention is allowed with the candidate's agreement."],
      ["A candidate who asks what information is held must get a reply within a month.", T, 2, "Within 30 days."],
      ["Hiring managers can see every candidate who has applied to the company.", F, 2, "Only candidates for their own vacancy."],
      ["CVs are sometimes shared with recruitment agencies with permission.", F, 3, "CVs are never passed to agencies."],
      ["Most candidates agree to join the talent pool.", C, 1, "The passage doesn't say."],
    ],
  },
  {
    title: "Service charter",
    text: "Phone calls are answered within five rings during opening hours. Complaints are acknowledged within one working day and resolved within ten. If a complaint can't be resolved in ten working days, the customer is told why and given a new date. Branches open from 8:00 to 17:00 on weekdays and 8:00 to 12:00 on Saturdays.",
    statements: [
      ["A complaint made on a Wednesday must be acknowledged by the end of Thursday.", T, 1, "Complaints are acknowledged within one working day."],
      ["Every complaint is resolved within ten working days.", F, 2, "Some take longer; the customer is then told why."],
      ["Branches open on Sundays.", F, 1, "Weekdays and Saturdays only."],
      ["Calls made at 18:00 on a Tuesday are answered within five rings.", C, 3, "The five-ring promise covers opening hours; the passage doesn't say what happens after 17:00."],
      ["Branches open for fewer hours on Saturdays than on weekdays.", T, 1, "Four hours against nine."],
    ],
  },
  {
    title: "Overtime",
    text: "Overtime must be approved in advance by a supervisor. Weekday overtime is paid at one and a half times the normal hourly rate; Sunday and public holiday work at double. Staff on management grades are not paid overtime but may take time off in lieu. Overtime is capped at 40 hours a month for each person.",
    statements: [
      ["Overtime worked without approval is paid at the normal rate.", C, 3, "The passage says approval is needed, not what happens without it."],
      ["Public holiday work pays more than weekday overtime.", T, 1, "Double against one and a half times."],
      ["A manager who works on Sunday is paid double.", F, 2, "Management grades aren't paid overtime."],
      ["A person may work 50 hours of overtime in a month if it is approved.", F, 2, "Overtime is capped at 40 hours a month."],
      ["Supervisors are on management grades.", C, 2, "The passage doesn't say."],
    ],
  },
  {
    title: "Recruitment",
    text: "All vacancies are advertised internally for five working days before they go outside the company. Internal applicants who meet every essential requirement are guaranteed an interview. Shortlists are agreed by at least two people, one of them from HR. Reasons for rejecting each shortlisted candidate are recorded.",
    statements: [
      ["An internal applicant who meets every essential requirement will be offered the job.", F, 2, "They're guaranteed an interview, not the job."],
      ["A vacancy can be advertised externally on its first day.", F, 1, "It's advertised internally for five working days first."],
      ["Someone from HR helps agree every shortlist.", T, 1, "At least two people, one from HR."],
      ["Reasons are recorded for every candidate who is not hired.", C, 3, "The passage covers shortlisted candidates only; it doesn't say whether reasons are kept for anyone else."],
      ["Internal applicants are more likely to be hired than external ones.", C, 2, "The passage doesn't say."],
    ],
  },
  {
    title: "Passwords",
    text: "Passwords must be at least fifteen characters long and must not be reused across systems. Staff are asked to use a passphrase of several unrelated words. Accounts lock after five failed attempts and unlock after 30 minutes or when the help desk resets them. The help desk never asks for a password by phone or email.",
    statements: [
      ["A twelve-character password is allowed if it contains symbols.", F, 2, "The minimum is fifteen characters."],
      ["Using the same password for email and the payroll system breaks the policy.", T, 1, "Passwords must not be reused across systems."],
      ["After five failed attempts, a user must call the help desk to get back in.", F, 2, "The account also unlocks by itself after 30 minutes."],
      ["A caller asking for your password who says they're from the help desk is not following help desk practice.", T, 3, "The help desk never asks for passwords by phone."],
      ["Passphrases are harder to remember than short passwords.", C, 1, "The passage doesn't say."],
    ],
  },
  {
    title: "Contract farming",
    text: "Growers in the scheme receive seed and fertiliser at the start of the season and repay the cost from their harvest. The company buys the whole crop at a price agreed before planting. If the market price at harvest is higher than the agreed price, growers receive half of the difference. Growers who sell any of their crop elsewhere leave the scheme.",
    statements: [
      ["Growers pay for seed before planting.", F, 1, "They repay the cost from their harvest."],
      ["If the market price rises by USD 40 a tonne above the agreed price, growers get USD 20 a tonne extra.", T, 3, "They receive half of the difference."],
      ["If the market price falls below the agreed price, growers are paid the lower market price.", F, 3, "The company buys at the price agreed before planting; only a higher market price changes what growers get."],
      ["A grower may sell a small part of the crop to a neighbour and stay in the scheme.", F, 2, "Selling any of the crop elsewhere means leaving."],
      ["The agreed price is set after the harvest.", F, 1, "It is agreed before planting."],
    ],
  },
];

const PRACTICE = {
  text: "The canteen opens at 7:00 and closes at 15:00. Hot meals are served from 12:00 to 14:00. Staff pay with their ID card.",
  statements: [
    ["Hot meals are served at 13:00.", T, "Hot meals are served from 12:00 to 14:00."],
    ["Staff can pay for meals in cash.", C, "The passage says staff pay with their ID card, but not whether cash is refused."],
  ] as [string, 0 | 1 | 2, string][],
};

const OPTIONS = ["True", "False", "Cannot say"];

export const verbalBank: BankItem[] = [
  ...PASSAGES.flatMap((p, pi) =>
    p.statements.map(([prompt, answer, difficulty, explanation], si): BankItem => ({
      id: `verb_${String(pi * 5 + si + 1).padStart(2, "0")}`,
      testId: "verbal",
      practice: false,
      stimulus: p.text,
      prompt,
      options: OPTIONS,
      answer,
      explanation,
      difficulty,
      tags: [`passage_${pi + 1}`],
      source: "original",
    })),
  ),
  ...PRACTICE.statements.map(([prompt, answer, explanation], i): BankItem => ({
    id: `verb_p${i + 1}`,
    testId: "verbal",
    practice: true,
    stimulus: PRACTICE.text,
    prompt,
    options: OPTIONS,
    answer,
    explanation,
    difficulty: 1,
    source: "original",
  })),
];
