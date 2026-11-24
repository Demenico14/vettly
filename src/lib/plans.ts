/** Plans, shared by the browser and the server: Settings → Plan and billing, the public pricing page and sign-up. */

/** Plan limits. Prices in USD a year. Seats are enforced; test credits and CV reading are shown against these. */
export const PLAN_LIMITS = {
  starter: { seats: 5, tests: 100, cvs: 600, price: 1200 },
  growth: { seats: 20, tests: 500, cvs: 3000, price: 4800 },
  enterprise: { seats: 50, tests: 1500, cvs: 10000, price: 15600 },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

/** Every new organisation starts on a free trial of this plan, for this many days. */
export const TRIAL_PLAN: PlanKey = "growth";
export const TRIAL_DAYS = 5;

const n = (x: number) => x.toLocaleString("en-GB");

/**
 * How each plan is described wherever plans are shown. Plans differ by size, not features: every organisation gets
 * everything Vettly does. Starter is billed monthly; Growth and Enterprise yearly (see settings.subscription).
 */
export const PLANS: {
  id: PlanKey;
  name: string;
  price: string;
  billing: string;
  forWho: string;
  points: string[];
}[] = [
  {
    id: "starter",
    name: "Starter",
    price: `US$${n(PLAN_LIMITS.starter.price)} a year`,
    billing: `Billed monthly at US$${n(PLAN_LIMITS.starter.price / 12)}`,
    forWho: "For a small HR team hiring a few roles at a time.",
    points: [`${PLAN_LIMITS.starter.seats} seats`, `${n(PLAN_LIMITS.starter.tests)} test credits a year`, `${n(PLAN_LIMITS.starter.cvs)} CVs read a year`],
  },
  {
    id: "growth",
    name: "Growth",
    price: `US$${n(PLAN_LIMITS.growth.price)} a year`,
    billing: `Billed yearly, about US$${n(PLAN_LIMITS.growth.price / 12)} a month`,
    forWho: "For HR teams running several vacancies at once, with managers on panels.",
    points: [`${PLAN_LIMITS.growth.seats} seats`, `${n(PLAN_LIMITS.growth.tests)} test credits a year`, `${n(PLAN_LIMITS.growth.cvs)} CVs read a year`],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: `From US$${n(PLAN_LIMITS.enterprise.price)} a year`,
    billing: "Billed yearly, sized with you",
    forWho: "For groups hiring across companies, sites or countries.",
    points: [
      `${PLAN_LIMITS.enterprise.seats} seats or more`,
      `${n(PLAN_LIMITS.enterprise.tests)} test credits a year or more`,
      `${n(PLAN_LIMITS.enterprise.cvs)} CVs read a year or more`,
    ],
  },
];

/** What every plan includes. Each line is something Vettly does today. */
export const INCLUDED = [
  "Bulk CV upload, read into profiles you check",
  "Screening against your requirements, with the CV line behind each answer",
  "The seven-step hiring path and pipeline",
  "Psychometric tests on any phone, with consent and adjustments",
  "Interviews with structured questions and independent scorecards",
  "Offer letters on your letterhead, approved in order",
  "A consent-based talent pool",
  "Analytics and fairness reports",
  "Roles and permissions, and a full audit log",
  "Retention, deletion and data requests for the CDPA and POPIA",
];
