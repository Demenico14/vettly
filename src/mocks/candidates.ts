/**
 * MOCK DATA — Phase 1 only. Fictional candidate profiles. Every person here also appears, with the same
 * details, on the dashboard, vacancy pages and design system (summaries come from src/mocks/data.ts).
 * Institutions and employers are used as realistic context only; no real person is described.
 */
import type {
  ApplicationEvent,
  ApplicationSource,
  CandidateProfile,
  CandidateSummary,
  CandidateDocument,
  Availability,
  Education,
  WorkExperience,
  CandidateSkill,
  Certification,
  Project,
} from "@/types";
import { candidates as summaries } from "./data";
import { vacancyRecords } from "./vacancies";

type Detail = {
  email: string;
  phone: string;
  linkedin: string | null;
  availability: Availability;
  currentEmployer: string | null;
  expectedSalary: string | null;
  source: ApplicationSource;
  summary: string;
  experience: Omit<WorkExperience, "id">[];
  education: Omit<Education, "id">[];
  skills: CandidateSkill[];
  certifications?: Certification[];
  projects?: Project[];
  extraDocs?: Omit<CandidateDocument, "id">[];
  tags?: string[];
  inTalentPool?: boolean;
  /** Earlier applications to other vacancies. */
  previous?: { vacancyTitle: string; appliedAt: string; stage: CandidateSummary["stage"]; matchScore: number; source: ApplicationSource }[];
};

const D: Record<string, Detail> = {
  cnd_rutendo: {
    email: "rutendo.chikwanha@gmail.com",
    phone: "+263 77 412 3390",
    linkedin: "https://www.linkedin.com/in/example-rutendo-chikwanha",
    availability: "1 month's notice",
    currentEmployer: "Paynow Labs",
    expectedSalary: "USD 2 500 / month",
    source: "LinkedIn",
    summary:
      "Full-stack developer with six years building payment and customer-facing web products in Harare. Leads a team of three, cares about tests and clear code reviews, and has shipped integrations with EcoCash and ZIPIT.",
    experience: [
      { title: "Senior Software Engineer", company: "Paynow Labs", location: "Harare", start: "2023-02", end: null, bullets: ["Lead a team of three building the merchant dashboard in TypeScript and React", "Designed the EcoCash and ZIPIT settlement service handling 40k transactions a day", "Introduced code review guidelines and raised test coverage from 35% to 78%"] },
      { title: "Software Developer", company: "Cassava Smartech", location: "Harare", start: "2020-06", end: "2023-01", bullets: ["Built Node.js APIs for the Sasai wallet onboarding flow", "Maintained PostgreSQL schemas and migrations across four services"] },
      { title: "Junior Developer", company: "Webdev Zimbabwe", location: "Harare", start: "2019-01", end: "2020-05", bullets: ["Delivered company websites and booking systems for SME clients"] },
    ],
    education: [{ institution: "University of Zimbabwe", qualification: "BSc (Hons)", field: "Computer Science", start: 2014, end: 2018, grade: "Upper second (2.1)" }],
    skills: [
      { name: "TypeScript", level: "Expert", years: 5 },
      { name: "React", level: "Expert", years: 5 },
      { name: "Node.js", level: "Advanced", years: 6 },
      { name: "PostgreSQL", level: "Advanced", years: 5 },
      { name: "AWS", level: "Intermediate", years: 3 },
      { name: "Docker", level: "Intermediate", years: 3 },
    ],
    certifications: [{ name: "AWS Certified Developer – Associate", issuer: "Amazon Web Services", year: 2024, credentialId: "AWS-DVA-88213" }],
    projects: [{ name: "ZimRates", description: "Open-source API publishing daily USD/ZiG official and market rates, used by 300+ developers.", year: 2024, link: "https://github.com/example/zimrates" }],
    tags: ["Strong communicator", "Fintech"],
    inTalentPool: true,
  },
  cnd_tafadzwa: {
    email: "t.ncube.ca@gmail.com",
    phone: "+263 71 908 4422",
    linkedin: "https://www.linkedin.com/in/example-tafadzwa-ncube",
    availability: "3 months' notice",
    currentEmployer: "Delta Beverages",
    expectedSalary: "USD 3 800 / month",
    source: "Vettly careers page",
    summary:
      "Chartered accountant with nine years in group reporting and controls, the last four leading a team of six. Prepares IFRS consolidated accounts for a multi-entity group and has led two external audits end to end.",
    experience: [
      { title: "Group Financial Accountant", company: "Delta Beverages", location: "Bulawayo", start: "2021-04", end: null, bullets: ["Prepare IFRS 9 and IFRS 16 compliant group financial statements for four subsidiaries", "Lead a team of six accountants across two sites", "Coordinated the 2024 and 2025 external audits with zero material findings"] },
      { title: "Senior Accountant", company: "KPMG Zimbabwe", location: "Harare", start: "2017-01", end: "2021-03", bullets: ["Audit senior on manufacturing and retail clients", "Supervised teams of up to five on year-end engagements"] },
    ],
    education: [
      { institution: "National University of Science and Technology", qualification: "BCom (Hons)", field: "Accounting", start: 2012, end: 2016, grade: "First class" },
    ],
    skills: [
      { name: "IFRS", level: "Expert", years: 9 },
      { name: "Group consolidations", level: "Expert", years: 6 },
      { name: "Budgeting & forecasting", level: "Advanced", years: 5 },
      { name: "Sage Evolution", level: "Intermediate", years: 3 },
      { name: "Team leadership", level: "Advanced", years: 4 },
    ],
    certifications: [{ name: "Chartered Accountant (Zimbabwe)", issuer: "ICAZ", year: 2019, credentialId: "ICAZ-07741" }],
    extraDocs: [{ name: "ICAZ membership certificate.pdf", kind: "Certificate", sizeKb: 212, pages: 1, uploadedAt: "2026-11-10T08:25:00+02:00" }],
    tags: ["Relocation from Harare not needed"],
  },
  cnd_nyasha: {
    email: "nyasha.dube@outlook.com",
    phone: "+263 78 230 5561",
    linkedin: "https://www.linkedin.com/in/example-nyasha-dube",
    availability: "1 month's notice",
    currentEmployer: "Econet Wireless",
    expectedSalary: "USD 1 800 / month",
    source: "Referral",
    summary: "Data analyst with four years turning telecoms usage and sales data into dashboards and churn models. Comfortable presenting findings to non-technical managers.",
    experience: [
      { title: "Data Analyst", company: "Econet Wireless", location: "Harare", start: "2022-03", end: null, bullets: ["Own 14 Power BI dashboards used by regional sales managers", "Built a churn model in Python that reduced prepaid churn by 4% in targeted campaigns"] },
      { title: "Business Analyst", company: "CBZ Bank", location: "Harare", start: "2020-08", end: "2022-02", bullets: ["Wrote SQL reports for branch performance and loan arrears"] },
    ],
    education: [{ institution: "Midlands State University", qualification: "BSc (Hons)", field: "Statistics", start: 2016, end: 2020 }],
    skills: [
      { name: "SQL", level: "Expert", years: 4 },
      { name: "Power BI", level: "Advanced", years: 4 },
      { name: "Python (pandas)", level: "Intermediate", years: 2 },
      { name: "Excel", level: "Advanced", years: 6 },
    ],
    certifications: [{ name: "Microsoft PL-300 Power BI Data Analyst", issuer: "Microsoft", year: 2023 }],
    projects: [{ name: "Harare kombi fares tracker", description: "Personal project collecting and visualising route fares over 12 months.", year: 2025 }],
  },
  cnd_farai: {
    email: "farai.mutasa@yahoo.com",
    phone: "+263 77 118 9024",
    linkedin: null,
    availability: "Immediately",
    currentEmployer: null,
    expectedSalary: "USD 1 400 / month",
    source: "Vettly careers page",
    summary: "HR generalist with five years across recruitment, employee relations and payroll inputs in manufacturing and retail. IPMZ member.",
    experience: [
      { title: "HR Officer", company: "OK Zimbabwe", location: "Mutare", start: "2021-01", end: "2026-09", bullets: ["Handled recruitment and onboarding for 11 branches", "Advised managers on disciplinary hearings under the Labour Act"] },
      { title: "HR Assistant", company: "Mutare Board & Paper", location: "Mutare", start: "2019-02", end: "2020-12", bullets: ["Maintained HR records and leave schedules"] },
    ],
    education: [{ institution: "Africa University", qualification: "BA (Hons)", field: "Human Resource Management", start: 2015, end: 2018 }],
    skills: [
      { name: "Labour Act & employee relations", level: "Advanced", years: 5 },
      { name: "Recruitment", level: "Advanced", years: 5 },
      { name: "Payroll inputs (Belina)", level: "Intermediate", years: 3 },
    ],
    certifications: [{ name: "Member", issuer: "Institute of People Management of Zimbabwe (IPMZ)", year: 2020 }],
    tags: ["Hired"],
  },
  cnd_thandiwe: {
    email: "thandiwe.ndlovu@gmail.com",
    phone: "+27 72 553 1180",
    linkedin: "https://www.linkedin.com/in/example-thandiwe-ndlovu",
    availability: "2 weeks' notice",
    currentEmployer: "Freelance",
    expectedSalary: "USD 1 300 / month",
    source: "LinkedIn",
    summary: "Brand and digital marketer, three years running paid social and content for retail and FMCG brands in Johannesburg. Looking to move home to Harare.",
    experience: [
      { title: "Digital Marketing Freelancer", company: "Self-employed", location: "Johannesburg", start: "2024-03", end: null, bullets: ["Run Meta and Google campaigns for five retail clients, ZAR 40k monthly spend"] },
      { title: "Marketing Coordinator", company: "Clicks Group", location: "Johannesburg", start: "2023-01", end: "2024-02", bullets: ["Coordinated in-store and social promotions"] },
    ],
    education: [{ institution: "University of the Witwatersrand", qualification: "BA", field: "Media and Communication", start: 2019, end: 2022 }],
    skills: [
      { name: "Meta Ads", level: "Advanced", years: 3 },
      { name: "Copywriting", level: "Advanced", years: 3 },
      { name: "Google Analytics", level: "Intermediate", years: 2 },
      { name: "Canva / Figma", level: "Intermediate", years: 3 },
    ],
    projects: [{ name: "Winter skincare campaign", description: "Campaign for a Johannesburg skincare brand that reached 1.2M people with a 3.1% click-through rate.", year: 2025 }],
  },
  cnd_blessing: {
    email: "blessing.mapfumo@gmail.com",
    phone: "+263 77 640 2213",
    linkedin: null,
    availability: "1 month's notice",
    currentEmployer: "ZimPost",
    expectedSalary: "USD 2 600 / month",
    source: "Email (CV upload)",
    summary: "Operations supervisor with seven years in logistics and fleet, currently overseeing 40 vehicles across the Midlands.",
    experience: [
      { title: "Operations Supervisor", company: "ZimPost", location: "Gweru", start: "2020-05", end: null, bullets: ["Supervise fleet of 40 vehicles and 60 drivers", "Cut fuel cost per km by 9% through route planning"] },
      { title: "Logistics Officer", company: "Bak Logistics", location: "Gweru", start: "2018-01", end: "2020-04", bullets: ["Scheduled long-haul deliveries to Harare and Bulawayo"] },
    ],
    education: [{ institution: "Midlands State University", qualification: "Diploma", field: "Logistics and Supply Chain", start: 2015, end: 2017 }],
    skills: [
      { name: "Fleet management", level: "Advanced", years: 7 },
      { name: "Lean", level: "Basic" },
      { name: "SAP", level: "Basic", years: 1 },
    ],
    previous: [{ vacancyTitle: "Human Resources Officer", appliedAt: "2026-09-25T10:00:00+02:00", stage: "rejected", matchScore: 0, source: "Email (CV upload)" }],
  },
  cnd_tinashe: {
    email: "tinashe.mhlanga@proton.me",
    phone: "+263 78 505 7719",
    linkedin: "https://www.linkedin.com/in/example-tinashe-mhlanga",
    availability: "1 month's notice",
    currentEmployer: "Steward Bank",
    expectedSalary: "USD 2 400 / month",
    source: "Referral",
    summary: "Backend developer with three years building banking APIs. Strong on containerised deployment and testing.",
    experience: [
      { title: "Backend Developer", company: "Steward Bank", location: "Harare", start: "2023-06", end: null, bullets: ["Build Node.js services for the mobile banking app", "Moved four services to Docker and AWS ECS"] },
      { title: "Graduate Developer", company: "Steward Bank", location: "Harare", start: "2022-01", end: "2023-05", bullets: ["Rotated through payments, cards and integration teams"] },
    ],
    education: [{ institution: "Harare Institute of Technology", qualification: "BTech (Hons)", field: "Software Engineering", start: 2017, end: 2021 }],
    skills: [
      { name: "Node.js", level: "Advanced", years: 3 },
      { name: "Docker", level: "Advanced", years: 2 },
      { name: "AWS", level: "Intermediate", years: 2 },
      { name: "TypeScript", level: "Intermediate", years: 2 },
    ],
    tags: ["Offer sent"],
  },
  cnd_lindiwe: {
    email: "lindiwe.khumalo@gmail.com",
    phone: "+260 97 711 2208",
    linkedin: "https://www.linkedin.com/in/example-lindiwe-khumalo",
    availability: "3 months' notice",
    currentEmployer: "Zambeef Products",
    expectedSalary: "USD 3 000 / month",
    source: "Indeed",
    summary: "Financial analyst and CIMA passed finalist with five years in agribusiness, strong on modelling and treasury.",
    experience: [
      { title: "Financial Analyst", company: "Zambeef Products", location: "Lusaka", start: "2021-02", end: null, bullets: ["Own the group cash-flow forecast and FX exposure reporting", "Built the capital projects evaluation model"] },
    ],
    education: [{ institution: "University of Zambia", qualification: "BAcc", field: "Accountancy", start: 2015, end: 2019 }],
    skills: [
      { name: "Financial modelling", level: "Advanced", years: 5 },
      { name: "Treasury", level: "Intermediate", years: 3 },
      { name: "Excel", level: "Expert", years: 7 },
    ],
    certifications: [{ name: "CIMA Professional (passed finalist)", issuer: "CIMA", year: 2024 }],
    previous: [{ vacancyTitle: "Data Analyst", appliedAt: "2026-11-04T09:00:00+02:00", stage: "withdrawn", matchScore: 48, source: "Indeed" }],
  },
  cnd_chipo: {
    email: "chipo.makoni@gmail.com",
    phone: "+263 77 300 6612",
    linkedin: "https://www.linkedin.com/in/example-chipo-makoni",
    availability: "1 month's notice",
    currentEmployer: "Innscor Africa",
    expectedSalary: "USD 3 500 / month",
    source: "LinkedIn",
    summary: "Group accountant with seven years in consolidations for a listed holding company. Hands-on with Pastel and Sage, and with managing audit timetables.",
    experience: [
      { title: "Group Accountant", company: "Innscor Africa", location: "Harare", start: "2020-07", end: null, bullets: ["Consolidate 12 subsidiaries under IFRS for the annual report", "Manage the group audit timetable with external auditors"] },
      { title: "Accountant", company: "Simbisa Brands", location: "Harare", start: "2018-01", end: "2020-06", bullets: ["Prepared monthly management accounts for franchise operations"] },
    ],
    education: [{ institution: "University of Zimbabwe", qualification: "BCom (Hons)", field: "Accounting", start: 2013, end: 2017 }],
    skills: [
      { name: "Consolidations", level: "Expert", years: 6 },
      { name: "IFRS", level: "Advanced", years: 7 },
      { name: "Pastel", level: "Advanced", years: 5 },
    ],
    certifications: [{ name: "ACCA Member", issuer: "ACCA", year: 2021 }],
  },
  cnd_simba: {
    email: "simba.chari@gmail.com",
    phone: "+263 71 220 9930",
    linkedin: null,
    availability: "Immediately",
    currentEmployer: "Masvingo City Council",
    expectedSalary: "USD 1 600 / month",
    source: "Email (CV upload)",
    summary: "Finance officer with four years in local government, handling reconciliations, payroll and creditors.",
    experience: [{ title: "Finance Officer", company: "Masvingo City Council", location: "Masvingo", start: "2022-01", end: null, bullets: ["Monthly bank and creditors reconciliations", "Payroll processing for 600 staff"] }],
    education: [{ institution: "Great Zimbabwe University", qualification: "BCom", field: "Accounting", start: 2017, end: 2021 }],
    skills: [
      { name: "Reconciliations", level: "Advanced", years: 4 },
      { name: "Payroll", level: "Intermediate", years: 3 },
      { name: "Excel", level: "Intermediate", years: 4 },
    ],
  },
  cnd_ruvimbo: {
    email: "ruvimbo.gumbo@gmail.com",
    phone: "+263 78 991 4120",
    linkedin: "https://www.linkedin.com/in/example-ruvimbo-gumbo",
    availability: "2 weeks' notice",
    currentEmployer: "Tumai Analytics",
    expectedSalary: "USD 1 900 / month",
    source: "LinkedIn",
    summary: "Data engineer with three years building pipelines and warehouses; wants to move closer to analysis and stakeholder work.",
    experience: [{ title: "Data Engineer", company: "Tumai Analytics", location: "Harare", start: "2023-01", end: null, bullets: ["Built Airflow pipelines loading 30 sources into the warehouse", "Wrote data quality checks that cut reporting errors by half"] }],
    education: [{ institution: "University of Cape Town", qualification: "BSc", field: "Computer Science and Statistics", start: 2019, end: 2022 }],
    skills: [
      { name: "Python", level: "Advanced", years: 3 },
      { name: "SQL", level: "Expert", years: 4 },
      { name: "Airflow", level: "Advanced", years: 2 },
      { name: "Power BI", level: "Basic" },
    ],
    projects: [{ name: "Load-shedding schedule parser", description: "Turns ZESA load-shedding PDFs into a calendar feed.", year: 2024, link: "https://github.com/example/zesa-schedule" }],
  },
  cnd_kudakwashe: {
    email: "kuda.sibanda@gmail.com",
    phone: "+263 77 845 0021",
    linkedin: "https://www.linkedin.com/in/example-kudakwashe-sibanda",
    availability: "Immediately",
    currentEmployer: "Freelance",
    expectedSalary: "USD 1 200 / month",
    source: "Vettly careers page",
    summary: "Junior developer with two years building React and Firebase apps for small businesses in Bulawayo.",
    experience: [{ title: "Freelance Web Developer", company: "Self-employed", location: "Bulawayo", start: "2024-06", end: null, bullets: ["Built booking and stock apps for six Bulawayo businesses"] }],
    education: [{ institution: "National University of Science and Technology", qualification: "BSc (Hons)", field: "Computer Science", start: 2020, end: 2024 }],
    skills: [
      { name: "JavaScript", level: "Advanced", years: 3 },
      { name: "React", level: "Intermediate", years: 2 },
      { name: "Firebase", level: "Intermediate", years: 2 },
    ],
  },
};

const STAGE_ORDER = ["applied", "screening", "shortlisted", "assessment", "interview", "offer", "hired"] as const;

function historyFor(stage: CandidateSummary["stage"], appliedAt: string): ApplicationEvent[] {
  const start = new Date(appliedAt).getTime();
  const at = (days: number) => new Date(start + days * 86400000).toISOString();
  const events: ApplicationEvent[] = [{ stage: "applied", at: appliedAt, by: "Candidate" }];
  if (stage === "rejected" || stage === "withdrawn") {
    events.push({ stage: "screening", at: at(1), by: "Vettly" });
    events.push(
      stage === "rejected"
        ? { stage, at: at(4), by: "Tendai Moyo", note: "Essential requirements not evidenced on the CV." }
        : { stage, at: at(3), by: "Candidate", note: "Accepted another offer." },
    );
    return events;
  }
  const idx = STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
  const by = ["Candidate", "Vettly", "Kudzai Chirwa", "Vettly", "Tendai Moyo", "Tendai Moyo", "Tendai Moyo"];
  for (let i = 1; i <= idx; i++) events.push({ stage: STAGE_ORDER[i]!, at: at(i * 2), by: by[i]! });
  return events;
}

const vacancyId = (title: string) => vacancyRecords.find((v) => v.title === title)?.id ?? "";

export const candidateProfiles: CandidateProfile[] = summaries.map((s) => {
  const d = D[s.id]!;
  const slug = s.name.toLowerCase().replace(/\s+/g, "-");
  return {
    ...s,
    email: d.email,
    phone: d.phone,
    linkedin: d.linkedin,
    availability: d.availability,
    currentEmployer: d.currentEmployer,
    expectedSalary: d.expectedSalary,
    summary: d.summary,
    experience: d.experience.map((e, i) => ({ ...e, id: `${s.id}_exp_${i}` })),
    education: d.education.map((e, i) => ({ ...e, id: `${s.id}_edu_${i}` })),
    skills: d.skills,
    certifications: d.certifications ?? [],
    projects: d.projects ?? [],
    documents: [
      { id: `${s.id}_cv`, name: `${slug}-cv.pdf`, kind: "CV", sizeKb: 180 + (s.name.length * 7) % 120, pages: 2, uploadedAt: s.appliedAt },
      ...(d.source === "Vettly careers page" || d.source === "LinkedIn"
        ? [{ id: `${s.id}_cl`, name: `${slug}-cover-letter.pdf`, kind: "Cover letter" as const, sizeKb: 64, pages: 1, uploadedAt: s.appliedAt }]
        : []),
      ...(d.extraDocs ?? []).map((x, i) => ({ ...x, id: `${s.id}_doc_${i}` })),
    ],
    applications: [
      {
        id: `${s.id}_app_0`,
        vacancyId: vacancyId(s.appliedFor),
        vacancyTitle: s.appliedFor,
        appliedAt: s.appliedAt,
        source: d.source,
        stage: s.stage,
        matchScore: s.matchScore,
        provenance: s.provenance,
        history: historyFor(s.stage, s.appliedAt),
      },
      ...(d.previous ?? []).map((p, i) => ({
        id: `${s.id}_app_${i + 1}`,
        vacancyId: vacancyId(p.vacancyTitle),
        vacancyTitle: p.vacancyTitle,
        appliedAt: p.appliedAt,
        source: p.source,
        stage: p.stage,
        matchScore: p.matchScore,
        provenance: "hr_confirmed" as const,
        history: historyFor(p.stage, p.appliedAt),
      })),
    ],
    notes:
      s.id === "cnd_rutendo"
        ? [{ id: "note_1", author: "Kudzai Chirwa", body: "Strong phone screen. Clear on payment reconciliation edge cases. Asked about hybrid days.", at: "2026-11-10T15:20:00+02:00" }]
        : [],
    tags: d.tags ?? [],
    inTalentPool: d.inTalentPool ?? false,
  };
});

export const ALL_SKILLS = [...new Set(candidateProfiles.flatMap((c) => c.skills.map((s) => s.name)))].sort();
export const ALL_LOCATIONS = [...new Set(candidateProfiles.map((c) => c.location))].sort();
export const ALL_SOURCES: ApplicationSource[] = ["Vettly careers page", "LinkedIn", "Email (CV upload)", "Referral", "Indeed", "VacancyMail"];
