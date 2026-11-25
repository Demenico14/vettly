/**
 * Work motivation: 60 original situations, five for each of the test's twelve motivators (mot_1 to mot_12:
 * achievement, recognition, earnings, security, progression, autonomy, variety, belonging, helping others,
 * learning, structure, purpose). The candidate rates how much each would raise or lower their motivation,
 * so every statement is keyed +: a higher rating means the motivator matters more to them.
 */
import type { BankItem } from "./util";

const MOTIVATORS: string[][] = [
  // 1 Achievement
  ["A target that will take real effort to reach.", "Seeing clear results from my work each week.", "A project where success depends on my skill.", "Being measured on what I deliver, not hours worked.", "Beating my own best performance."],
  // 2 Recognition
  ["My manager thanking me in front of the team.", "My name on a report or project I led.", "An award for the best work of the quarter.", "Customers asking for me by name.", "Senior leaders knowing what I contributed."],
  // 3 Earnings
  ["A bonus linked to my own results.", "A pay rise above inflation this year.", "Commission on every sale I close.", "Overtime paid at a higher rate.", "Being paid at the top of the market for my role."],
  // 4 Security
  ["A permanent contract rather than a fixed-term one.", "A company with a long, stable history.", "Knowing my income will be the same every month.", "A pension and medical aid as part of the package.", "Clear protection against sudden layoffs."],
  // 5 Progression
  ["A clear path to a more senior role.", "Being considered for promotion within a year.", "Taking on responsibility beyond my job title.", "A manager who actively plans my next step.", "Leading a team in the future."],
  // 6 Autonomy
  ["Choosing how to organise my own day.", "Deciding the approach to a task myself.", "Working without someone checking each step.", "Flexibility over where I work some days.", "Owning a project from start to finish."],
  // 7 Variety
  ["Different tasks every day.", "Travelling to different sites for work.", "Moving between projects through the year.", "Meeting new people regularly.", "Solving a new kind of problem each week."],
  // 8 Belonging
  ["A close team that looks out for each other.", "Team lunches and social events.", "Colleagues I can rely on for support.", "Feeling part of something bigger than my job.", "Staying with the same team for years."],
  // 9 Helping others
  ["Work that makes a direct difference to people's lives.", "Mentoring a newer colleague.", "Solving a customer's problem so they leave happy.", "Volunteering days paid by the company.", "Helping a struggling teammate catch up."],
  // 10 Learning
  ["Paid study towards a qualification.", "Learning a new system or skill on the job.", "Working alongside experts I can learn from.", "Time set aside each month for training.", "Feedback that helps me improve quickly."],
  // 11 Structure
  ["Clear instructions for each task.", "A predictable weekly routine.", "Knowing exactly who I report to.", "Written procedures for how work is done.", "Goals agreed in advance and kept stable."],
  // 12 Purpose
  ["An employer whose values match mine.", "Work that benefits my community.", "Knowing how my work serves a bigger goal.", "A company that acts responsibly, even at a cost.", "Products or services I'm proud of."],
];

export const motivationBank: BankItem[] = [
  ...MOTIVATORS.flatMap((items, m) =>
    items.map(
      (prompt, i): BankItem => ({ id: `mot_${String(m * 5 + i + 1).padStart(2, "0")}`, testId: "motivation", practice: false, scale: `mot_${m + 1}`, keyed: "+", prompt, difficulty: 1, source: "original" }),
    ),
  ),
  { id: "mot_p1", testId: "motivation", practice: true, prompt: "A comfortable chair at my desk.", difficulty: 1, source: "original" },
  { id: "mot_p2", testId: "motivation", practice: true, prompt: "A short walk to work.", difficulty: 1, source: "original" },
];
