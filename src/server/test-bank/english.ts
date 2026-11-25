/**
 * Business English: 55 original questions, 37 on grammar, vocabulary and business usage and 18 on short
 * workplace reading texts, plus two practice. British English throughout. Options are shuffled with a fixed seed.
 */
import { type BankItem, authored, rng } from "./util";

type G = [1 | 2 | 3, string, string, string[], string];

const GRAMMAR: G[] = [
  [1, "Choose the correct word: \"The report ___ on your desk since Monday.\"", "has been", ["is", "was being", "have been"], "Present perfect for something that started in the past and continues."],
  [1, "Choose the correct word: \"Please send the invoice to Rudo and ___.\"", "me", ["I", "myself", "mine"], "Object pronoun after a preposition."],
  [1, "Which sentence is correct?", "Each of the managers has signed the form.", ["Each of the managers have signed the form.", "Each of the manager has signed the form.", "Each of the managers signing the form."], "\"Each\" takes a singular verb."],
  [2, "Choose the correct word: \"We need ___ information before we can decide.\"", "more", ["many", "a few", "several"], "\"Information\" is uncountable."],
  [1, "Choose the correct word: \"The meeting was cancelled ___ the power cut.\"", "because of", ["because", "despite", "although"], "\"Because of\" before a noun."],
  [2, "Which sentence is correct?", "If we had ordered earlier, the parts would have arrived on time.", ["If we ordered earlier, the parts would have arrived on time.", "If we would have ordered earlier, the parts arrived on time.", "If we had ordered earlier, the parts will arrive on time."], "Third conditional: had + past participle, would have + past participle."],
  [1, "Choose the correct spelling.", "accommodation", ["accomodation", "acommodation", "accommodaton"], "Double c, double m."],
  [1, "Choose the correct word: \"Your account is ___ for renewal next month.\"", "due", ["do", "dew", "doe"], ""],
  [2, "Choose the correct word: \"The new policy will ___ everyone in the department.\"", "affect", ["effect", "effects", "affection"], "\"Affect\" is the verb."],
  [2, "Choose the correct word: \"Neither the manager nor the staff ___ aware of the change.\"", "were", ["was", "is", "be"], "With neither…nor, the verb agrees with the nearer subject (staff)."],
  [1, "Choose the correct word: \"We look forward to ___ from you.\"", "hearing", ["hear", "heard", "be hearing"], "\"Look forward to\" takes -ing."],
  [2, "Which sentence uses the apostrophe correctly?", "The company's profits rose this year.", ["The companys' profits rose this year.", "The companies profit's rose this year.", "The company's profit's rose this year."], "One company: company's."],
  [1, "Choose the best word: \"Please ___ receipt of this letter.\"", "acknowledge", ["acknowledgement", "knowledge", "admit"], ""],
  [2, "Choose the correct word: \"The figures were checked ___ the audit team.\"", "by", ["from", "with", "of"], "Passive agent takes \"by\"."],
  [2, "Which sentence is the most formal?", "We regret to inform you that your application has not been successful.", ["Sorry, you didn't get the job.", "Bad news: no job this time.", "Unfortunately you weren't picked."], ""],
  [1, "Choose the correct word: \"There are ___ applicants than last year.\"", "fewer", ["less", "lesser", "few"], "\"Fewer\" with countable nouns."],
  [2, "Choose the correct word: \"The contract, ___ was signed in May, ends next year.\"", "which", ["that", "who", "what"], "Non-defining clause after a comma takes \"which\"."],
  [3, "Which sentence is correct?", "Having checked the figures, Tendai approved the payment.", ["Having checked the figures, the payment was approved by Tendai.", "Checking the figures, the payment got approved.", "Having checked the figures, approval was given."], "The opening phrase must describe the subject that follows."],
  [1, "What does \"ASAP\" mean?", "As soon as possible", ["As simple as possible", "After sales and payment", "At standard agreed price"], ""],
  [2, "Choose the closest meaning of \"defer\" in \"We will defer the decision.\"", "postpone", ["refuse", "share", "speed up"], ""],
  [2, "Choose the closest meaning of \"comply\".", "obey a rule or request", ["complain", "complete", "compare"], ""],
  [1, "Choose the correct word: \"Can you ___ me the stapler?\"", "lend", ["borrow", "loan from", "lent"], "You lend to someone; you borrow from them."],
  [2, "Choose the closest meaning of \"interim\" in \"an interim manager\".", "temporary", ["junior", "external", "experienced"], ""],
  [3, "Choose the correct word: \"The board approved the budget, ___ the finance director had concerns.\"", "although", ["despite", "however", "because"], "\"Although\" joins two clauses with a contrast."],
  [2, "Which is the best subject line for an email asking to move a meeting?", "Request to move Thursday's project meeting", ["Meeting", "Hi", "URGENT!!! READ NOW"], "Specific and calm."],
  [1, "Choose the correct word: \"I ___ to the Harare office last year.\"", "moved", ["move", "have moved", "am moving"], "Past simple with a finished time."],
  [3, "Choose the correct word: \"Had I known about the delay, I ___ the client.\"", "would have called", ["would call", "will have called", "had called"], "Inverted third conditional."],
  [2, "Choose the closest meaning of \"liaise\".", "work together and share information", ["make a decision alone", "sign a contract", "write a report"], ""],
  [1, "Choose the correct word: \"The parcel arrived ___ Tuesday.\"", "on", ["in", "at", "by the"], "Days take \"on\"."],
  [2, "Which sentence is punctuated correctly?", "We need three things: a budget, a plan and a deadline.", ["We need three things; a budget, a plan and a deadline.", "We need three things, a budget a plan, and a deadline.", "We need: three things a budget, a plan and a deadline."], "A colon introduces a list."],
  [3, "Choose the correct word: \"It is essential that every driver ___ the checklist.\"", "complete", ["completes", "completed", "will complete"], "Formal subjunctive after \"it is essential that\"."],
  [2, "Choose the closest meaning of \"feasible\".", "possible to do", ["expensive", "required by law", "already done"], ""],
  [1, "Choose the correct word: \"Please find the agenda ___.\"", "attached", ["attach", "attaching", "attachment"], ""],
  [2, "Choose the correct word: \"The team ___ divided on the proposal.\"", "were", ["was being", "be", "is been"], "With a group acting as individuals, British English often takes a plural verb."],
  [3, "Choose the closest meaning of \"mitigate\" in \"mitigate the risk\".", "reduce", ["accept", "measure", "ignore"], ""],
  [1, "Choose the correct word: \"She is responsible ___ payroll.\"", "for", ["of", "to", "about"], ""],
  [2, "Choose the correct word: \"We haven't received the payment ___.\"", "yet", ["already", "still", "since"], "\"Yet\" in negative present perfect."],
];

const READING: { text: string; qs: G[] }[] = [
  {
    text: "Notice: From Monday, visitors must sign in at reception and wear a visitor badge at all times. Badges must be returned when leaving. Contractors working on site for more than one day will be issued a contractor pass instead.",
    qs: [
      [1, "What must every visitor do on arrival?", "Sign in at reception", ["Collect a contractor pass", "Call their host", "Show an ID book"], ""],
      [2, "A contractor will be on site for three days. What will they receive?", "A contractor pass", ["A visitor badge", "Nothing", "A badge for each day"], ""],
      [2, "When must visitor badges be returned?", "When the visitor leaves", ["At the end of the week", "Only if damaged", "When the contractor finishes"], ""],
    ],
  },
  {
    text: "Dear customer, your order (ref. 4471) has been dispatched and should reach you within three working days. If it hasn't arrived by then, please reply to this email with your order reference. Please don't call the branch, as staff there can't track online orders.",
    qs: [
      [1, "What has happened to the order?", "It has been sent", ["It has been cancelled", "It has arrived", "It is out of stock"], ""],
      [2, "What should the customer do if the order is late?", "Reply to the email with the order reference", ["Call the branch", "Place the order again", "Wait two weeks"], ""],
      [2, "Why should the customer not call the branch?", "Branch staff can't track online orders", ["The branch is closed", "Calls cost money", "The branch is too busy"], ""],
    ],
  },
  {
    text: "Minutes, operations meeting: Farai reported that two forklifts are out of service. Parts have been ordered and should arrive on Thursday. Until then, the night shift will borrow one forklift from the Msasa warehouse. Rumbi will confirm the loan by Tuesday.",
    qs: [
      [1, "How many forklifts are out of service?", "Two", ["One", "Three", "None"], ""],
      [2, "Where will the night shift get a forklift?", "From the Msasa warehouse", ["From the parts supplier", "From the day shift", "From a hire company"], ""],
      [3, "What must happen by Tuesday?", "Rumbi confirms the forklift loan", ["The parts arrive", "Both forklifts are repaired", "The night shift stops"], ""],
    ],
  },
  {
    text: "Job advert: Finance Officer, Bulawayo. Essential: a degree in accounting or finance and two years' experience with month-end close. Desirable: experience with Sage Evolution. Applications close on 15 December; late applications will not be considered.",
    qs: [
      [1, "Where is the job based?", "Bulawayo", ["Harare", "Not stated", "Mutare"], ""],
      [2, "Which is essential for the role?", "Two years' experience with month-end close", ["Experience with Sage Evolution", "A master's degree", "Five years' experience"], ""],
      [2, "What happens to an application sent on 16 December?", "It will not be considered", ["It will be considered if strong", "It goes to a reserve list", "It must be posted"], ""],
    ],
  },
  {
    text: "Safety bulletin: A worker was injured last week when a pallet fell from a high shelf. From today, pallets above the second level must be shrink-wrapped, and no one may stand in an aisle while a forklift is lifting. Report any loose loads to your supervisor immediately.",
    qs: [
      [1, "Why was the bulletin issued?", "A worker was injured by a falling pallet", ["A forklift broke down", "Stock went missing", "A new shelf was installed"], ""],
      [2, "Which pallets must now be shrink-wrapped?", "Pallets above the second level", ["Every pallet", "Pallets on the floor", "Only heavy pallets"], ""],
      [3, "What should you do if you see a loose load?", "Tell your supervisor straight away", ["Fix it yourself", "Wait for the next inspection", "Move it to the floor"], ""],
    ],
  },
  {
    text: "Email: Hi Tatenda, thanks for the draft budget. The staffing line looks low: it doesn't include the two posts we agreed to fill in March. Could you update it and send it back by Friday? I'll then share it with the board on Monday.",
    qs: [
      [1, "What is the writer's concern?", "The staffing line is too low", ["The budget is too high", "The draft is late", "The board rejected it"], ""],
      [2, "What was left out of the staffing line?", "Two posts to be filled in March", ["Overtime", "Bonuses", "Training costs"], ""],
      [2, "When will the board see the budget?", "On Monday", ["On Friday", "In March", "Not stated"], ""],
    ],
  },
];

function build(): BankItem[] {
  const r = rng(2468);
  const g = GRAMMAR.map(([d, prompt, correct, wrong, explanation], i) => authored(r, `en_${String(i + 1).padStart(2, "0")}`, "english", d, prompt, correct, wrong, { scale: "en_grammar", ...(explanation ? { explanation } : {}) }));
  const rd = READING.flatMap((p, pi) =>
    p.qs.map(([d, prompt, correct, wrong], qi) => authored(r, `en_${String(38 + pi * 3 + qi).padStart(2, "0")}`, "english", d, prompt, correct, wrong, { scale: "en_reading", stimulus: p.text, tags: [`text_${pi + 1}`] })),
  );
  return [
    ...g,
    ...rd,
    authored(r, "en_p1", "english", 1, "Choose the correct word: \"I ___ in Harare.\"", "live", ["lives", "living", "am live"], { practice: true, scale: "en_grammar", explanation: "\"I\" takes \"live\"." }),
    authored(r, "en_p2", "english", 1, "Choose the closest meaning of \"begin\".", "start", ["end", "pause", "repeat"], { practice: true, scale: "en_grammar" }),
  ];
}

export const englishBank = build();
