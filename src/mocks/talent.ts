/**
 * MOCK DATA — Msasa Financial Group's talent pool (Module 12): people who aren't active applicants but could be
 * approached. Fictional names; employers and universities are real Southern African context only.
 * A few records have lapsed consent so the retention rules can be seen working.
 */
import type { Availability, SkillLevel } from "@/types";
import type { CountryCode } from "@/types/psychometrics";
import type { Collection, SavedSearch, TalentFilters, TalentRecord, TalentSource, TalentTestResult } from "@/types/talent";

const LEVEL: Record<string, SkillLevel> = { E: "Expert", A: "Advanced", I: "Intermediate", B: "Basic" };
/** "IFRS:E:8, Excel:A:10" → skills */
const sk = (s: string) =>
  s.split(",").map((x) => {
    const [name, l, y] = x.trim().split(":");
    return { name: name!, level: LEVEL[l!]!, years: Number(y) };
  });
const TEST: Record<string, [string, string]> = {
  num: ["tst_num_prof", "Numerical reasoning"],
  numg: ["tst_num_grad", "Numerical reasoning"],
  verb: ["tst_verb_prof", "Verbal reasoning"],
  ind: ["tst_inductive", "Pattern reasoning"],
  sjt: ["tst_sjt_prof", "Workplace judgement"],
  svc: ["tst_sjt_service", "Service judgement"],
};
const tests = (s: string, takenAt: string): TalentTestResult[] =>
  s
    ? s.split(",").map((x) => {
        const [k, p] = x.trim().split(":");
        return { testId: TEST[k!]![0], label: TEST[k!]![1], percentile: Number(p), takenAt };
      })
    : [];

let n = 0;
function t(
  name: string,
  currentTitle: string,
  currentEmployer: string | null,
  location: string,
  country: CountryCode,
  years: number,
  skills: string,
  education: string,
  availability: Availability,
  salary: number | null,
  source: TalentSource,
  history: string | null,
  testStr: string,
  extra: { tags?: string[]; relocation?: boolean; work?: TalentRecord["workPreference"]; languages?: string[]; lastContact?: string; consentUntil?: string } = {},
): TalentRecord {
  const id = `tal_${++n}`;
  const [first, last] = name.toLowerCase().split(" ");
  const lastContact = extra.lastContact ?? "2026-09-15";
  return {
    id,
    name,
    headline: `${currentTitle} · ${years} yrs`,
    currentTitle,
    currentEmployer,
    location,
    country,
    yearsExperience: years,
    skills: sk(skills),
    education,
    availability,
    expectedSalaryUsd: salary,
    openToRelocation: extra.relocation ?? false,
    workPreference: extra.work ?? "Any",
    languages: extra.languages ?? ["English"],
    source,
    history,
    tests: tests(testStr, lastContact),
    tags: extra.tags ?? [],
    email: `${first}.${last}@example.com`,
    phone: country === "ZA" ? `+27 82 ••• ${1000 + n * 37}` : country === "ZM" ? `+260 97 ••• ${1000 + n * 37}` : country === "BW" ? `+267 71 ••• ${100 + n * 7}` : `+263 77 ••• ${1000 + n * 37}`,
    lastContact,
    consentUntil: extra.consentUntil ?? "2027-09-15",
    isMock: true,
  };
}

export const talentRecords: TalentRecord[] = [
  /* Finance */
  t("Rudo Mavhunga", "Group Reporting Manager", "Old Mutual Zimbabwe", "Harare", "ZW", 11, "IFRS:E:10, Group consolidations:E:7, Team leadership:A:5, Sage Evolution:A:6, Treasury:I:3", "BCom (Hons) Accounting, University of Zimbabwe; CA(Z)", "3 months' notice", 4200, "Past applicant", "Runner-up, Finance Manager (2025): final panel. Panel noted strong IFRS, wanted more treasury exposure.", "num:84,verb:72,sjt:69", { tags: ["Silver medallist", "CA(Z)"], lastContact: "2025-08-20", consentUntil: "2026-08-20" }),
  t("Thabo Mokoena", "Financial Controller", "Sasol", "Johannesburg", "ZA", 13, "IFRS:E:12, Group consolidations:E:9, Treasury:A:6, SAP:A:8, Team leadership:A:7", "BCom Accounting, University of Johannesburg; CA(SA)", "3 months' notice", 5200, "Sourced on LinkedIn", null, "", { relocation: true, tags: ["CA(SA)"], lastContact: "2026-10-30" }),
  t("Mutsa Chikore", "Senior Accountant", "Econet Wireless", "Harare", "ZW", 6, "IFRS:A:6, Month-end close:E:6, Excel:E:8, Pastel:A:4", "BAcc, Midlands State University", "1 month's notice", 2600, "Referral", "Referred by Sipho Ndlovu.", "num:77", { tags: ["Referral"] }),
  t("Kelebogile Seretse", "Finance Manager", "Debswana", "Gaborone", "BW", 10, "IFRS:E:10, Budgeting:E:8, Team leadership:A:5, Oracle:A:6, Treasury:A:4", "BCom Accounting, University of Botswana; ACCA", "3 months' notice", 4600, "Sourced on LinkedIn", null, "", { relocation: true, languages: ["English", "Setswana"] }),
  t("Bupe Mwanza", "Treasury Accountant", "Zambia National Commercial Bank", "Lusaka", "ZM", 7, "Treasury:E:6, Cash-flow management:E:7, IFRS:A:5, Excel:E:7, Forex:A:5", "BAcc, Copperbelt University", "1 month's notice", 2900, "Past applicant", "Applied for Finance Manager (2026), not shortlisted: no team leadership yet.", "num:88", { relocation: true, languages: ["English", "Bemba"], lastContact: "2026-11-02" }),
  t("Nyarai Dzvova", "Audit Senior", "Deloitte Zimbabwe", "Harare", "ZW", 5, "IFRS:A:5, Audit:E:5, Excel:A:6, Team leadership:I:2", "BCom (Hons) Accounting, NUST", "1 month's notice", 2200, "Alumni", "Former Msasa graduate trainee (2019–2021).", "numg:81,verb:79", { tags: ["Alumni", "Boomerang"] }),
  t("Tonderai Gapare", "Credit Manager", "CBZ Bank", "Harare", "ZW", 9, "Credit analysis:E:9, Financial modelling:A:6, IFRS:I:4, Team leadership:A:4", "BSc Economics, University of Zimbabwe; CFA Level II", "1 month's notice", 3300, "Speculative CV", null, "num:73", { lastContact: "2025-06-01", consentUntil: "2026-06-01" }),
  t("Lerato Dlamini", "Payroll Supervisor", "Shoprite", "Johannesburg", "ZA", 8, "Payroll:E:8, VIP payroll:E:6, Belina:I:2, Excel:A:7, Team leadership:I:3", "Diploma in Payroll Management, Unisa", "2 weeks' notice", 1900, "Sourced on LinkedIn", null, "", { relocation: true }),

  /* Software and IT */
  t("Tafadzwa Mukarati", "Senior Backend Engineer", "Cassava Smartech", "Harare", "ZW", 7, "Node.js:E:7, TypeScript:A:5, PostgreSQL:E:7, AWS:A:4, Payments:A:5, Docker:A:4", "BSc Computer Science, University of Zimbabwe", "1 month's notice", 2800, "Past applicant", "Runner-up, Software Developer (2026): technical panel; offer went to a candidate with more React.", "ind:86,num:74", { tags: ["Silver medallist"], lastContact: "2026-11-12" }),
  t("Sipho Nkosi", "Full-stack Developer", "Takealot", "Cape Town", "ZA", 5, "React:E:5, TypeScript:E:5, Node.js:A:4, GraphQL:A:3, AWS:I:2", "BSc Computer Science, UCT", "1 month's notice", 3500, "Sourced on LinkedIn", null, "", { work: "Remote", relocation: false }),
  t("Chiedza Marufu", "Frontend Developer", "Paynow Labs", "Harare", "ZW", 3, "React:A:3, TypeScript:A:3, CSS:E:4, Accessibility:A:2", "BSc Information Systems, Africa University", "1 month's notice", 1700, "Careers fair", "Met at the UZ careers fair, Sept 2026.", "ind:79", { tags: ["Graduate 2023"], lastContact: "2026-09-20" }),
  t("Kudzai Mapfumo", "DevOps Engineer", "Liquid Intelligent Technologies", "Harare", "ZW", 6, "AWS:E:5, Docker:E:5, Kubernetes:A:3, Terraform:A:3, Linux:E:6", "BTech Computer Engineering, HIT", "3 months' notice", 3000, "Referral", "Referred by Tatenda Mutasa.", "", { tags: ["Referral"] }),
  t("Mwila Banda", "Software Engineer", "Zoona", "Lusaka", "ZM", 4, "Java:A:4, Spring:A:3, PostgreSQL:A:4, Payments:A:3, Mobile money:A:3", "BEng Computer Science, University of Zambia", "1 month's notice", 2100, "Past applicant", "Applied for Software Developer (2026); strong payments, little React.", "ind:71", { relocation: true, lastContact: "2026-10-25" }),
  t("Ruvarashe Nhamo", "QA Engineer", "Steward Bank", "Harare", "ZW", 4, "Test automation:A:4, Cypress:A:3, TypeScript:I:2, API testing:A:4", "BSc Computer Science, Chinhoyi University of Technology", "2 weeks' notice", 1500, "Speculative CV", null, "", {}),
  t("Gaone Kgosi", "Mobile Developer", "Orange Botswana", "Gaborone", "BW", 5, "React Native:E:4, TypeScript:A:4, Kotlin:A:3, Firebase:A:4", "BSc Computer Science, University of Botswana", "1 month's notice", 2400, "Sourced on LinkedIn", null, "", { work: "Remote", languages: ["English", "Setswana"] }),

  /* Data and BI */
  t("Farai Chinembiri", "BI Developer", "Delta Corporation", "Harare", "ZW", 5, "Power BI:E:5, SQL:E:6, DAX:E:4, Python:I:2, Data modelling:A:4", "BSc Statistics, University of Zimbabwe; Microsoft PL-300", "1 month's notice", 2200, "Past applicant", "Runner-up, Data Analyst (2025).", "num:82,ind:75", { tags: ["Silver medallist", "PL-300"], lastContact: "2025-11-10", consentUntil: "2026-11-10" }),
  t("Naledi Mahlangu", "Data Scientist", "Discovery", "Johannesburg", "ZA", 6, "Python:E:6, Machine learning:A:4, SQL:A:5, Statistics:E:6, Power BI:I:2", "MSc Statistics, Wits", "1 month's notice", 4200, "Sourced on LinkedIn", null, "", { work: "Hybrid" }),
  t("Tinotenda Moyo", "Data Analyst", "NetOne", "Bulawayo", "ZW", 3, "SQL:A:3, Excel:E:5, Power BI:A:2, Tableau:I:1", "BSc Mathematics, NUST", "2 weeks' notice", 1300, "Careers fair", "Met at the NUST careers fair, Aug 2026.", "numg:76", { relocation: true, lastContact: "2026-08-14" }),
  t("Chilufya Mulenga", "Analytics Lead", "Airtel Zambia", "Lusaka", "ZM", 8, "SQL:E:8, Power BI:E:5, Python:A:5, Team leadership:A:3, Data modelling:E:6", "BSc Economics, University of Zambia", "3 months' notice", 3400, "Referral", "Referred by Lovemore Sithole.", "num:80", { relocation: true, tags: ["Referral"] }),
  t("Anesu Gwatidzo", "Junior Data Analyst", "Zimstat", "Harare", "ZW", 1, "Excel:A:3, SQL:I:1, Stata:A:2, Power BI:B:1", "BSc Statistics, University of Zimbabwe", "Immediately", 900, "Careers fair", "Met at the UZ careers fair, Sept 2026.", "numg:68,verb:64", { tags: ["Graduate 2025"], lastContact: "2026-09-20" }),

  /* Marketing */
  t("Rumbidzai Sibanda", "Digital Marketing Manager", "Innscor Africa", "Harare", "ZW", 7, "Campaign planning:E:7, Paid social:E:5, Google Ads:A:4, Copywriting:A:6, Team leadership:I:2", "BA Marketing, Midlands State University; CIM", "1 month's notice", 2300, "Past applicant", "Applied for Marketing Executive (2026): over-qualified for the level.", "verb:83,sjt:74", { languages: ["English", "Shona"], lastContact: "2026-11-11" }),
  t("Zanele Ndlovu", "Content Lead", "Old Mutual", "Cape Town", "ZA", 5, "Copywriting:E:5, Content strategy:A:4, SEO:A:3, Social media:A:5", "BA Journalism, Rhodes University", "1 month's notice", 2600, "Sourced on LinkedIn", null, "", { work: "Remote", languages: ["English", "isiNdebele"] }),
  t("Tanaka Mhlope", "Brand Coordinator", "Delta Beverages", "Harare", "ZW", 3, "Social media:A:3, Campaign planning:I:2, Copywriting:A:3, Event management:A:3", "Diploma in Marketing, Harare Polytechnic", "2 weeks' notice", 1100, "Speculative CV", null, "", { languages: ["English", "Shona"] }),

  /* Operations */
  t("Blessing Murwira", "Depot Manager", "Unifreight Africa", "Gweru", "ZW", 12, "Operations management:E:12, Fleet management:E:8, Facilities management:A:5, SAP:A:4, Team leadership:E:9", "BBA, Midlands State University; Lean Six Sigma Green Belt", "3 months' notice", 3100, "Referral", "Referred by Farai Gumbo.", "sjt:78", { tags: ["Referral"], relocation: true }),
  t("Mpho Tau", "Logistics Supervisor", "Choppies", "Francistown", "BW", 6, "Fleet management:A:5, Inventory control:A:6, Team leadership:A:4, Excel:A:5", "Diploma in Logistics, Botswana Accountancy College", "1 month's notice", 1600, "Sourced on LinkedIn", null, "", { relocation: true, languages: ["English", "Setswana"] }),
  t("Gift Muchena", "Facilities Officer", "Zimplats", "Ngezi", "ZW", 7, "Facilities management:E:7, Health and safety:E:7, Contractor management:A:5", "BSc Construction Management, NUST", "1 month's notice", 1800, "Past applicant", "Applied for Operations Manager (2026) before the role was paused.", "sjt:66", { lastContact: "2026-11-13" }),

  /* HR, customer service, admin */
  t("Tsitsi Kambarami", "HR Business Partner", "FBC Holdings", "Harare", "ZW", 8, "Employee relations:E:8, Labour Act:E:8, Recruitment:A:6, HR analytics:I:2", "BSc Human Resource Management, Midlands State University; IPMZ", "1 month's notice", 2400, "Past applicant", "Runner-up, Human Resources Officer (2026): final interview.", "verb:81,sjt:85", { tags: ["Silver medallist", "IPMZ"], lastContact: "2026-11-15" }),
  t("Kudakwashe Zhou", "Talent Acquisition Specialist", "Econet Wireless", "Harare", "ZW", 4, "Recruitment:E:4, Sourcing:E:4, Employer branding:A:3", "BSc Psychology, University of Zimbabwe", "1 month's notice", 1500, "Sourced on LinkedIn", null, "", {}),
  t("Precious Phiri", "Contact Centre Team Leader", "Old Mutual Zimbabwe", "Harare", "ZW", 6, "Customer service:E:6, Team leadership:A:3, Complaints handling:E:5, CRM:A:4", "Diploma in Business Management, Harare Polytechnic", "2 weeks' notice", 1100, "Speculative CV", null, "svc:83", { languages: ["English", "Shona"] }),
  t("Nomvula Khumalo", "Executive Assistant", "Standard Bank", "Johannesburg", "ZA", 9, "Diary management:E:9, Board papers:A:6, Excel:A:6, Minute taking:E:8", "Diploma in Office Management, Damelin", "1 month's notice", 2000, "Referral", "Referred by Ruth Chinamasa.", "", { lastContact: "2026-07-01", consentUntil: "2026-07-01" }),
];

/** Skills often found together: used to suggest broader searches. */
export const RELATED_SKILLS: Record<string, string[]> = {
  IFRS: ["Group consolidations", "Audit", "Month-end close"],
  "Group consolidations": ["IFRS", "Team leadership"],
  Treasury: ["Cash-flow management", "Forex"],
  React: ["TypeScript", "React Native", "CSS"],
  TypeScript: ["React", "Node.js"],
  "Node.js": ["TypeScript", "PostgreSQL", "AWS"],
  Payments: ["Mobile money", "Node.js"],
  "Power BI": ["DAX", "SQL", "Tableau"],
  SQL: ["Power BI", "Python", "Data modelling"],
  Python: ["SQL", "Machine learning", "Statistics"],
  "Campaign planning": ["Paid social", "Google Ads", "Copywriting"],
  "Fleet management": ["Operations management", "Inventory control"],
  "Employee relations": ["Labour Act", "Recruitment"],
  "Customer service": ["Complaints handling", "CRM"],
};

export const EMPTY_FILTERS: TalentFilters = {
  query: "",
  skills: [],
  minLevel: null,
  minYears: 0,
  countries: [],
  availability: [],
  sources: [],
  test: null,
  relocation: false,
  consentValidOnly: true,
  includeApplicants: true,
};

const f = (patch: Partial<TalentFilters>): TalentFilters => ({ ...EMPTY_FILTERS, ...patch });

export const savedSearches: SavedSearch[] = [
  { id: "ss_ifrs", name: "Finance leaders: IFRS group reporting, 7+ years", filters: f({ skills: ["IFRS", "Group consolidations"], minYears: 7 }), alert: "weekly", owner: "Tendai Moyo", createdAt: "2026-08-01T09:00:00+02:00", lastRunAt: "2026-11-11T07:00:00+02:00", newSinceLastRun: 1, isMock: true },
  { id: "ss_react", name: "React developers open to Harare", filters: f({ skills: ["React"], countries: ["ZW"] }), alert: "daily", owner: "Kudzai Chirwa", createdAt: "2026-10-05T09:00:00+02:00", lastRunAt: "2026-11-17T07:00:00+02:00", newSinceLastRun: 0, isMock: true },
  { id: "ss_data", name: "Data analysts: SQL and Power BI, numerical 70+", filters: f({ skills: ["SQL", "Power BI"], test: { family: "numerical", min: 70 } }), alert: "weekly", owner: "Tendai Moyo", createdAt: "2026-09-12T09:00:00+02:00", lastRunAt: "2026-11-11T07:00:00+02:00", newSinceLastRun: 2, isMock: true },
];

export const collections: Collection[] = [
  {
    id: "col_fin",
    name: "Finance leadership bench",
    description: "People we'd approach for senior finance roles in the next 12 months.",
    owner: "Tendai Moyo",
    sharedWith: ["Sipho Ndlovu", "Ruth Chinamasa"],
    members: [
      { personId: "tal_1", kind: "talent", addedBy: "Tendai Moyo", addedAt: "2025-08-21T09:00:00+02:00", note: "Strong final panel in 2025. Ask again about treasury experience." },
      { personId: "tal_2", kind: "talent", addedBy: "Tendai Moyo", addedAt: "2026-10-30T10:00:00+02:00", note: "Open to moving to Bulawayo or Harare for the right role." },
      { personId: "tal_4", kind: "talent", addedBy: "Sipho Ndlovu", addedAt: "2026-09-02T12:00:00+02:00", note: "" },
      { personId: "cnd_tafadzwa", kind: "candidate", addedBy: "Tendai Moyo", addedAt: "2026-11-18T09:00:00+02:00", note: "Active for Finance Manager. Keep warm whatever happens." },
    ],
    updatedAt: "2026-11-18T09:00:00+02:00",
    isMock: true,
  },
  {
    id: "col_eng",
    name: "Engineering silver medallists",
    description: "Strong finalists we couldn't hire. First call when a developer role opens.",
    owner: "Kudzai Chirwa",
    sharedWith: ["Tatenda Mutasa"],
    members: [
      { personId: "tal_9", kind: "talent", addedBy: "Kudzai Chirwa", addedAt: "2026-11-12T15:00:00+02:00", note: "Second developer opening: call first." },
      { personId: "tal_13", kind: "talent", addedBy: "Kudzai Chirwa", addedAt: "2026-10-26T10:00:00+02:00", note: "Payments depth; React to develop." },
    ],
    updatedAt: "2026-11-12T15:00:00+02:00",
    isMock: true,
  },
  {
    id: "col_grad",
    name: "Graduate intake 2027",
    description: "Careers-fair contacts for the January 2027 graduate programme.",
    owner: "Kudzai Chirwa",
    sharedWith: [],
    members: [
      { personId: "tal_11", kind: "talent", addedBy: "Kudzai Chirwa", addedAt: "2026-09-21T09:00:00+02:00", note: "" },
      { personId: "tal_18", kind: "talent", addedBy: "Kudzai Chirwa", addedAt: "2026-08-15T09:00:00+02:00", note: "Would relocate to Harare." },
      { personId: "tal_20", kind: "talent", addedBy: "Kudzai Chirwa", addedAt: "2026-09-21T09:00:00+02:00", note: "" },
    ],
    updatedAt: "2026-09-21T09:00:00+02:00",
    isMock: true,
  },
];
