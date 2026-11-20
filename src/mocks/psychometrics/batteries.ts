/**
 * MOCK DATA — test batteries (role templates). Role mappings and weights are design assumptions from the
 * research report. The structured interview stays the focal predictor (Sackett et al. 2022), so ability
 * sifts only flag candidates for human review; nobody is rejected on a score alone (POPIA s.71, CDPA s.25).
 * The ids "graduate", "professional" and "leadership" are the batteries vacancies already reference.
 */
import type { Battery, BatteryComponent } from "../../types/psychometrics";
import { tests } from "./catalogue";

const sift = (testId: string, reviewBelowPercentile = 30): BatteryComponent => ({ testId, use: "sift", reviewBelowPercentile });
const inform = (testId: string, optional = false): BatteryComponent => ({ testId, use: "inform_interview", ...(optional ? { optional } : {}) });
const weighted = (testId: string, optional = false): BatteryComponent => ({ testId, use: "weighted", ...(optional ? { optional } : {}) });

function battery(b: Omit<Battery, "totalMinutes" | "isMock">): Battery {
  const minutes = b.components
    .filter((c) => !c.optional)
    .reduce((sum, c) => sum + (tests.find((t) => t.id === c.testId)?.medianCompletionMin ?? 0), 0);
  return { ...b, totalMinutes: Math.round(minutes / 5) * 5, isMock: true };
}

const W = {
  standard: { interview: 0.375, ability: 0.275, workSampleOrKnowledge: 0.175, personalityOrSjt: 0.175 },
  workSample: { interview: 0.35, ability: 0.2, workSampleOrKnowledge: 0.3, personalityOrSjt: 0.15 },
  service: { interview: 0.4, ability: 0.15, workSampleOrKnowledge: 0.15, personalityOrSjt: 0.3 },
};

export const batteries: Battery[] = [
  battery({
    id: "graduate",
    label: "Graduate battery",
    roleFamily: "Graduate programme",
    level: "graduate",
    description: "Numerical and verbal reasoning to sift, with work styles to guide the interview.",
    components: [sift("tst_num_grad", 35), sift("tst_verb_grad", 35), inform("tst_work_styles")],
    weights: W.standard,
    recommendedFor: ["Graduate trainee", "Learnership", "Management trainee"],
    deadlineDays: 7,
  }),
  battery({
    id: "professional",
    label: "Professional battery",
    roleFamily: "Professional / specialist",
    level: "professional",
    description: "Professional-level numerical reasoning and workplace judgement.",
    components: [sift("tst_num_prof"), weighted("tst_sjt_prof"), inform("tst_work_styles", true)],
    weights: W.standard,
    recommendedFor: ["Finance manager", "Software developer", "Data analyst", "HR officer"],
    deadlineDays: 5,
  }),
  battery({
    id: "leadership",
    label: "Leadership battery",
    roleFamily: "Manager / leader",
    level: "manager",
    description: "Manager-level verbal reasoning, leadership judgement and work styles.",
    components: [sift("tst_verb_mgr", 25), weighted("tst_sjt_lead"), inform("tst_work_styles"), inform("tst_motivation", true)],
    weights: W.standard,
    recommendedFor: ["Operations manager", "Head of department", "Regional manager"],
    deadlineDays: 7,
  }),
  battery({
    id: "customer_service",
    label: "Customer service battery",
    roleFamily: "Customer service / contact centre",
    level: "operational",
    description: "Short and mobile-first: service judgement, workplace reading and data checking.",
    components: [weighted("tst_sjt_service"), sift("tst_verb_ops", 20), sift("tst_checking", 20), inform("tst_work_styles", true)],
    weights: W.service,
    recommendedFor: ["Contact-centre agent", "Teller", "Front-desk administrator"],
    deadlineDays: 3,
  }),
  battery({
    id: "finance",
    label: "Finance battery",
    roleFamily: "Finance / accounting",
    level: "professional",
    description: "Numerical and verbal reasoning, data checking and integrity, with optional IFRS knowledge.",
    components: [sift("tst_num_prof", 35), sift("tst_checking"), inform("tst_verb_prof"), inform("tst_integrity"), weighted("tst_accounting", true)],
    weights: W.standard,
    recommendedFor: ["Accountant", "Finance manager", "Payroll officer", "Credit analyst"],
    deadlineDays: 5,
  }),
  battery({
    id: "sales",
    label: "Sales battery",
    roleFamily: "Sales",
    level: "professional",
    description: "Sales judgement, work styles and verbal reasoning, with an optional motivation profile.",
    components: [weighted("tst_sjt_sales"), inform("tst_work_styles"), sift("tst_verb_prof", 20), inform("tst_motivation", true)],
    weights: W.service,
    recommendedFor: ["Account manager", "Sales representative", "Business development"],
    deadlineDays: 5,
  }),
  battery({
    id: "operations",
    label: "Supervisory battery",
    roleFamily: "Operations / supervisory",
    level: "supervisory",
    description: "Everyday numbers and reading and workplace judgement, with an optional short personality profile.",
    components: [sift("tst_num_ops", 25), sift("tst_verb_ops", 25), weighted("tst_sjt_prof"), inform("tst_big_five", true)],
    weights: W.standard,
    recommendedFor: ["Shift supervisor", "Team leader", "Depot supervisor"],
    deadlineDays: 5,
  }),
  battery({
    id: "technical",
    label: "Technical battery",
    roleFamily: "Technical / engineering",
    level: "operational",
    description: "Mechanical, spatial and pattern reasoning with everyday numbers.",
    components: [sift("tst_mechanical", 30), sift("tst_spatial", 25), inform("tst_inductive"), sift("tst_num_ops", 25)],
    weights: W.workSample,
    recommendedFor: ["Artisan", "Technician", "Maintenance planner", "Engineering apprentice"],
    deadlineDays: 7,
  }),
  battery({
    id: "administrative",
    label: "Administrative battery",
    roleFamily: "Administrative / clerical",
    level: "operational",
    description: "Data checking, reading, numbers, typing and integrity, with optional spreadsheet skills.",
    components: [sift("tst_checking", 25), sift("tst_verb_ops", 25), sift("tst_num_ops", 25), weighted("tst_typing"), inform("tst_integrity"), weighted("tst_excel", true)],
    weights: W.workSample,
    recommendedFor: ["Administrator", "Data capturer", "Payroll administrator", "Receptionist"],
    deadlineDays: 5,
  }),
  battery({
    id: "software",
    label: "Software engineering battery",
    roleFamily: "IT / software",
    level: "professional",
    description: "A coding work sample, weighted most, with pattern and numerical reasoning.",
    components: [weighted("tst_coding"), inform("tst_inductive"), inform("tst_num_prof", true)],
    weights: W.workSample,
    recommendedFor: ["Software developer", "Data engineer", "QA engineer"],
    deadlineDays: 7,
  }),
];

/** Short component list for labels, e.g. "Numerical + situational judgement". */
export function batterySummary(b: Battery) {
  const required = b.components.filter((c) => !c.optional).map((c) => tests.find((t) => t.id === c.testId)!.shortName.toLowerCase());
  const text = required.join(" + ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
