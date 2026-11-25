/**
 * Situational judgement: 52 original workplace scenarios, each with four responses rated by an expert key from
 * 1 (very ineffective) to 4 (very effective). Every scenario has one clear most effective response; where two
 * responses are equally poor, either counts as least effective. The same scenario works for rating and for
 * most/least. Tagged by theme; each SJT test
 * draws the themes that suit it. Scale codes match the tests' scales.
 */
import type { BankItem } from "./util";

type Scenario = [string, [string, number][]];

const THEMES: { tag: string; scale: string; items: Scenario[] }[] = [
  {
    tag: "prioritise",
    scale: "sjt_prioritise",
    items: [
      ["Your manager asks for a report by 15:00. A client then calls with an urgent problem that will take two hours.", [["Tell your manager about the clash and agree which comes first", 4], ["Do the report and ask the client to call back tomorrow", 2], ["Help the client and hand the report in late without saying anything", 1], ["Pass the client to a colleague without checking they're free", 2]]],
      ["You have five tasks due today and can realistically finish three.", [["Rank them by impact, finish the top three and agree new dates for the rest", 4], ["Start all five and get each one partly done", 1], ["Work late to finish everything, whatever the quality", 2], ["Do the easiest ones first to clear the list", 2]]],
      ["A colleague keeps asking you for quick favours that eat into your own deadlines.", [["Explain your deadlines and agree times when you can help", 4], ["Agree every time and work late", 2], ["Ignore their requests", 1], ["Complain about them to the team", 1]]],
      ["Two managers give you conflicting instructions on the same task.", [["Ask both to agree a single instruction, explaining the conflict", 4], ["Follow the more senior manager without telling the other", 2], ["Do neither until they sort it out themselves", 1], ["Do a mix of both instructions", 1]]],
      ["Halfway through a project you realise the deadline was unrealistic from the start.", [["Tell the project lead now, with a revised plan", 4], ["Keep quiet and hope to catch up", 1], ["Cut corners to meet the date", 2], ["Wait until the deadline and then explain", 1]]],
      ["A routine monthly report takes you a full day, though much of it is copying figures.", [["Suggest a template or automation to your manager", 4], ["Keep doing it the same way", 2], ["Skip the parts that seem pointless", 1], ["Ask a junior to do it without telling anyone", 1]]],
      ["You're asked to join a new working group while already at full capacity.", [["Say what you'd have to drop to join, and let your manager decide", 4], ["Accept and fit it in somehow", 2], ["Decline without explanation", 1], ["Accept and quietly do less on your existing work", 1]]],
      ["An email marked urgent arrives from someone you don't know, asking for a supplier's bank details to be changed.", [["Verify the request by phoning the supplier on a known number", 4], ["Change the details as asked", 1], ["Forward it to a colleague to handle", 2], ["Delete it", 2]]],
    ],
  },
  {
    tag: "team",
    scale: "sjt_team",
    items: [
      ["A team member is often late with their part of shared work, which delays you.", [["Talk to them privately to understand why and agree a plan", 4], ["Do their part yourself", 2], ["Report them to the manager straight away", 2], ["Complain about them to the rest of the team", 1]]],
      ["In a meeting, a colleague takes credit for an idea you shared with them.", [["Calmly add how the idea developed, and raise it with them afterwards", 4], ["Say nothing and let it go", 2], ["Accuse them in front of everyone", 1], ["Stop sharing ideas with anyone", 1]]],
      ["A new colleague seems lost and hasn't asked for help.", [["Offer to show them how things work", 4], ["Wait for them to ask", 2], ["Tell the manager they're struggling", 2], ["Assume someone else will help", 1]]],
      ["Two colleagues are arguing loudly in the open office.", [["Suggest they continue the conversation somewhere private", 4], ["Ignore it", 2], ["Take one side publicly", 1], ["Record it on your phone", 1]]],
      ["Your team disagrees about how to approach a task, and time is running out.", [["Summarise the options and propose how to decide quickly", 4], ["Push your own view until people give in", 1], ["Let the loudest person decide", 2], ["Leave the decision to someone else and step back", 2]]],
      ["A colleague makes a mistake that affects a shared report.", [["Point it out to them privately and help fix it", 4], ["Fix it without telling them", 2], ["Point it out in the team meeting", 1], ["Leave it and let them find out", 1]]],
      ["You're asked to work with a colleague you find difficult.", [["Agree clear roles and keep the focus on the work", 4], ["Ask to be moved to another project", 2], ["Do the work alone and present it as joint", 1], ["Avoid them and communicate only by email", 2]]],
    ],
  },
  {
    tag: "client",
    scale: "sjt_client",
    items: [
      ["A client asks for a change that will cost more than the agreed budget.", [["Explain the extra cost and get their agreement before starting", 4], ["Do it and absorb the cost", 2], ["Refuse without discussion", 1], ["Do it and add the cost to the invoice without warning", 1]]],
      ["A client is unhappy with work your team delivered.", [["Listen fully, acknowledge the issue and agree next steps", 4], ["Explain why they're wrong", 1], ["Offer a discount before understanding the problem", 2], ["Pass the complaint straight to your manager", 2]]],
      ["You promised a client a delivery date that now can't be met.", [["Tell them as soon as you know, with a realistic new date", 4], ["Wait until the date passes", 1], ["Blame another department", 1], ["Send a partial delivery without explanation", 2]]],
      ["A client asks you a technical question you can't answer.", [["Say you'll find out and come back by an agreed time", 4], ["Guess an answer", 1], ["Change the subject", 1], ["Tell them to search online", 2]]],
      ["A long-standing client asks for a discount you're not authorised to give.", [["Explain your limit and take the request to someone who can decide", 4], ["Give the discount anyway", 1], ["Refuse firmly and end the call", 2], ["Promise a discount and work it out later", 1]]],
      ["A client emails late at night asking for an immediate reply.", [["Reply first thing, or earlier if it's a genuine emergency covered by your role", 4], ["Reply at once every time", 2], ["Ignore it until they chase", 1], ["Forward it to everyone in the team", 2]]],
      ["A client shares confidential information about a competitor.", [["Don't use it, and tell the client politely you can't", 4], ["Use it to win business", 1], ["Pass it to your sales team", 1], ["Note it in the client file", 2]]],
    ],
  },
  {
    tag: "ethics",
    scale: "sjt_ethics",
    items: [
      ["You notice a colleague claiming fuel for trips they didn't make.", [["Raise it through the proper channel", 4], ["Confront them in front of others", 2], ["Ignore it, it's not your business", 1], ["Start claiming extra fuel too", 1]]],
      ["A supplier offers you an expensive gift during a tender.", [["Decline it and tell your manager", 4], ["Accept it but don't let it influence you", 1], ["Accept it and share it with the team", 1], ["Decline it but tell no one", 3]]],
      ["Your manager asks you to backdate a document.", [["Explain you can't, and suggest the correct way to record it", 4], ["Do it because your manager asked", 1], ["Do it and keep a copy for yourself", 1], ["Refuse and say nothing more", 3]]],
      ["You discover you made an error in a payment that went out last week.", [["Report it at once and help put it right", 4], ["Hope no one notices", 1], ["Fix it quietly next month", 2], ["Blame the system", 1]]],
      ["A friend applies for a job in your team.", [["Declare the relationship and step out of the decision", 4], ["Make sure they get the job", 1], ["Give them tips on the interview questions", 1], ["Say nothing and assess them like anyone else", 2]]],
      ["You overhear confidential salary information about a colleague.", [["Keep it to yourself", 4], ["Tell the colleague what you heard", 2], ["Share it with friends at work", 1], ["Use it to negotiate your own pay", 1]]],
      ["You're asked to sign off a safety check you didn't see happen.", [["Decline, and ask for the check to be done or witnessed", 4], ["Sign it because the team usually does it right", 1], ["Sign it and make a note to check later", 2], ["Refuse and leave it unresolved", 2]]],
    ],
  },
  {
    tag: "people",
    scale: "sjl_people",
    items: [
      ["A strong performer in your team has become withdrawn and their work has slipped.", [["Have a private, supportive conversation about what's changed", 4], ["Give them a formal warning", 1], ["Wait and see if it improves", 2], ["Move their work to others without discussion", 1]]],
      ["Two team members want the same development opportunity.", [["Agree fair criteria and explain the decision to both", 4], ["Pick the one you get on with best", 1], ["Give it to neither to avoid conflict", 1], ["Let them sort it out between themselves", 2]]],
      ["A team member repeatedly misses deadlines after you've raised it informally.", [["Set clear expectations in writing and agree support and a review date", 4], ["Keep reminding them informally", 2], ["Take the work away and do it yourself", 1], ["Start a disciplinary process without telling them", 1]]],
      ["Your team is exhausted after a long busy period.", [["Recognise the effort and plan time to recover", 4], ["Push on, there's more work coming", 1], ["Give everyone a vague promise of a bonus", 1], ["Leave it to each person to take leave", 2]]],
      ["A new hire is underperforming in their first month.", [["Check their training and give clear feedback and support", 4], ["End their probation early", 1], ["Assume they'll improve on their own", 2], ["Complain to HR about the recruitment process", 1]]],
      ["Someone in your team tells you a colleague is bullying them.", [["Take it seriously, record it and follow the procedure", 4], ["Tell them to sort it out themselves", 1], ["Confront the colleague in front of the team", 1], ["Ask them for more evidence before doing anything", 2]]],
    ],
  },
  {
    tag: "change",
    scale: "sjl_change",
    items: [
      ["Head office announces a new system your team distrusts.", [["Explain the reasons, listen to concerns and pass them on", 4], ["Tell the team to get on with it", 2], ["Agree with the team that it's a bad idea", 1], ["Delay using it as long as possible", 1]]],
      ["A restructure means two roles in your team will change.", [["Talk to the people affected first, before announcing it widely", 4], ["Announce it by email to everyone", 1], ["Wait until the last minute", 1], ["Let HR handle all the communication", 2]]],
      ["Your team's new process is slower in its first week.", [["Gather feedback, fix what you can and set expectations", 4], ["Go back to the old process", 2], ["Insist it's working", 1], ["Blame the people who designed it", 1]]],
      ["You disagree with a change your director has decided on.", [["Raise your concerns with the director, then support the decision", 4], ["Tell your team you disagree with it", 1], ["Quietly carry on the old way", 1], ["Go along with it without saying anything", 2]]],
      ["A long-serving employee resists every change you introduce.", [["Ask for their view and involve them in shaping the change", 4], ["Ignore them", 2], ["Tell them to adapt or leave", 1], ["Exclude them from the project", 1]]],
    ],
  },
  {
    tag: "service",
    scale: "sjs_total",
    items: [
      ["A customer at the counter is angry about a long wait.", [["Apologise, explain the delay and serve them as quickly as you can", 4], ["Tell them everyone has to wait", 1], ["Serve them before others in the queue", 2], ["Call security", 1]]],
      ["A customer asks for a refund outside the returns policy.", [["Explain the policy kindly and offer any option you can, such as an exchange", 4], ["Refund them to keep them happy", 2], ["Refuse curtly", 1], ["Tell them to complain to head office", 1]]],
      ["A customer on the phone is speaking a language you don't speak well.", [["Find a colleague who speaks it, or use simple language and check understanding", 4], ["Hang up", 1], ["Speak louder", 1], ["Ask them to call back another day", 2]]],
      ["You're closing and a customer arrives with an urgent request.", [["Help if it's quick, or arrange the earliest next step", 4], ["Turn them away", 2], ["Serve them but complain throughout", 1], ["Pretend you're already closed", 1]]],
      ["A regular customer is rude to a junior colleague.", [["Step in calmly to support your colleague and take over", 4], ["Ignore it, the customer is always right", 1], ["Argue with the customer", 1], ["Tell your colleague to toughen up", 1]]],
      ["A product a customer wants is out of stock.", [["Offer an alternative or arrange to contact them when it arrives", 4], ["Say it's out of stock and nothing more", 2], ["Promise it tomorrow without checking", 1], ["Send them to a competitor", 2]]],
    ],
  },
  {
    tag: "sales",
    scale: "sjsa_total",
    items: [
      ["A prospect says your price is higher than a competitor's.", [["Ask what matters most to them and show the value that justifies the price", 4], ["Match the price immediately", 2], ["Criticise the competitor", 1], ["End the conversation", 1]]],
      ["You're short of your monthly target with a week to go.", [["Review your pipeline and focus on the deals most likely to close", 4], ["Pressure customers into buying now", 1], ["Offer big discounts to everyone", 2], ["Accept you'll miss it and wait for next month", 1]]],
      ["A customer wants a product that won't really meet their need.", [["Explain the limits honestly and suggest what would suit them", 4], ["Sell it anyway", 1], ["Sell it and offer a refund if it doesn't work", 2], ["Refuse to sell anything", 1]]],
      ["A big client hasn't replied to your last three emails.", [["Try another channel, such as a call, and ask if their needs have changed", 4], ["Keep emailing daily", 1], ["Give up on them", 1], ["Complain to their manager", 1]]],
      ["A colleague asks to share the commission on a deal you mostly won alone.", [["Discuss each person's contribution and follow the commission rules", 4], ["Refuse without discussion", 2], ["Agree to avoid an argument", 2], ["Report them to your manager", 1]]],
      ["A customer asks for a promise about delivery that you can't guarantee.", [["Give an honest estimate and explain what could affect it", 4], ["Promise it to win the sale", 1], ["Refuse to give any date", 2], ["Promise it and blame logistics if it's late", 1]]],
    ],
  },
];

export const sjtBank: BankItem[] = THEMES.flatMap((t) =>
  t.items.map(([scenario, responses], i): BankItem => {
    const eff = responses.map(([, e]) => e);
    return {
      id: `sjt_${t.tag}_${String(i + 1).padStart(2, "0")}`,
      testId: "sjt",
      practice: false,
      scale: t.scale,
      tags: [t.tag],
      stimulus: scenario,
      prompt: "How effective is each response?",
      options: responses.map(([r]) => r),
      effectiveness: eff,
      difficulty: eff.filter((e) => e === 4).length === 1 && eff.filter((e) => e === 1).length === 1 ? 1 : 2,
      source: "original",
    };
  }),
);

/** A practice scenario, not scored. */
export const sjtPractice: BankItem = {
  id: "sjt_p1",
  testId: "sjt",
  practice: true,
  stimulus: "You arrive at work and find the shared kitchen in a mess.",
  prompt: "How effective is each response?",
  options: ["Tidy your part and suggest a cleaning rota at the next team meeting", "Leave it for the cleaners", "Post an angry message in the team chat", "Clean it all yourself every day"],
  effectiveness: [4, 2, 1, 2],
  difficulty: 1,
  source: "original",
};
