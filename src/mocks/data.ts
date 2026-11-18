/**
 * MOCK DATA — Phase 1 only. Illustrative, fictional records.
 * Nothing here is real recruitment activity. Replace via the service layer (src/services), never import
 * this file from UI components directly.
 *
 * Records are fixed so the same person always shows the same details everywhere.
 */
import type { AppNotification, CandidateSummary, Organisation, User } from "@/types";

/** Fixed reference time so relative dates never drift between renders. */
export const MOCK_NOW = "2026-11-18T09:30:00+02:00";

export const organisations: Organisation[] = [
  {
    id: "org_msasa",
    name: "Msasa Financial Group",
    shortName: "Msasa Financial",
    industry: "Financial services",
    city: "Harare",
    country: "Zimbabwe",
    plan: "growth",
    seatsUsed: 14,
    seatsTotal: 20,
  },
  {
    id: "org_matobo",
    name: "Matobo Logistics",
    shortName: "Matobo Logistics",
    industry: "Transport & logistics",
    city: "Bulawayo",
    country: "Zimbabwe",
    plan: "starter",
    seatsUsed: 4,
    seatsTotal: 5,
  },
];

export const users: User[] = [
  {
    id: "usr_tendai",
    name: "Tendai Moyo",
    email: "tendai.moyo@msasafinancial.example",
    role: "hr_manager",
    title: "HR Manager",
  },
  {
    id: "usr_kuda",
    name: "Kudzai Chirwa",
    email: "kudzai.chirwa@msasafinancial.example",
    role: "recruiter",
    title: "Talent Acquisition Officer",
  },
  {
    id: "usr_admin",
    name: "Grace Nyathi",
    email: "grace@vettly.example",
    role: "super_admin",
    title: "Platform Administrator",
  },
];

export const notifications: AppNotification[] = [
  {
    id: "ntf_1",
    kind: "application",
    title: "14 new applications",
    body: "Software Developer (Harare) received 14 applications overnight.",
    createdAt: "2026-11-18T07:05:00+02:00",
    read: false,
  },
  {
    id: "ntf_2",
    kind: "processing",
    title: "CV batch processed",
    body: "38 of 40 CVs extracted for Finance Manager. 2 need manual review.",
    createdAt: "2026-11-18T06:40:00+02:00",
    read: false,
  },
  {
    id: "ntf_3",
    kind: "interview",
    title: "Interview confirmed",
    body: "Rutendo Chikwanha accepted the panel interview on Thu 20 Nov, 10:00.",
    createdAt: "2026-11-17T16:12:00+02:00",
    read: false,
  },
  {
    id: "ntf_4",
    kind: "mention",
    title: "Kudzai Chirwa mentioned you",
    body: "“Can you review the shortlist for Data Analyst before Friday?”",
    createdAt: "2026-11-17T11:30:00+02:00",
    read: true,
  },
  {
    id: "ntf_5",
    kind: "offer",
    title: "Offer accepted",
    body: "Farai Mutasa accepted the HR Officer offer. Start date 5 Jan 2027.",
    createdAt: "2026-11-15T14:02:00+02:00",
    read: true,
  },
];

export const candidates: CandidateSummary[] = [
  {
    id: "cnd_rutendo",
    name: "Rutendo Chikwanha",
    headline: "Full-stack developer · 6 yrs",
    location: "Harare",
    appliedFor: "Software Developer",
    stage: "interview",
    matchScore: 88,
    provenance: "hr_confirmed",
    appliedAt: "2026-11-03T10:00:00+02:00",
    topSkills: ["TypeScript", "React", "PostgreSQL"],
  },
  {
    id: "cnd_tafadzwa",
    name: "Tafadzwa Ncube",
    headline: "Chartered accountant (ICAZ) · 9 yrs",
    location: "Bulawayo",
    appliedFor: "Finance Manager",
    stage: "shortlisted",
    matchScore: 82,
    provenance: "ai_illustrative",
    appliedAt: "2026-11-10T08:20:00+02:00",
    topSkills: ["IFRS", "Budgeting", "Sage Evolution"],
  },
  {
    id: "cnd_nyasha",
    name: "Nyasha Dube",
    headline: "Data analyst · 4 yrs",
    location: "Harare",
    appliedFor: "Data Analyst",
    stage: "screening",
    matchScore: 74,
    provenance: "ai_illustrative",
    appliedAt: "2026-11-12T13:45:00+02:00",
    topSkills: ["SQL", "Power BI", "Python"],
  },
  {
    id: "cnd_farai",
    name: "Farai Mutasa",
    headline: "HR generalist (IPMZ) · 5 yrs",
    location: "Mutare",
    appliedFor: "Human Resources Officer",
    stage: "hired",
    matchScore: 91,
    provenance: "hr_confirmed",
    appliedAt: "2026-10-14T09:10:00+02:00",
    topSkills: ["Labour Act", "Payroll", "Employee relations"],
  },
  {
    id: "cnd_thandiwe",
    name: "Thandiwe Ndlovu",
    headline: "Brand & digital marketer · 3 yrs",
    location: "Johannesburg",
    appliedFor: "Marketing Executive",
    stage: "applied",
    matchScore: 63,
    provenance: "ai_illustrative",
    appliedAt: "2026-11-16T17:30:00+02:00",
    topSkills: ["Meta Ads", "Copywriting", "Google Analytics"],
  },
  {
    id: "cnd_blessing",
    name: "Blessing Mapfumo",
    headline: "Operations supervisor · 7 yrs",
    location: "Gweru",
    appliedFor: "Operations Manager",
    stage: "rejected",
    matchScore: 41,
    provenance: "hr_overridden",
    appliedAt: "2026-11-01T11:00:00+02:00",
    topSkills: ["Lean", "Fleet management", "SAP"],
  },
  {
    id: "cnd_tinashe",
    name: "Tinashe Mhlanga",
    headline: "Backend developer · 3 yrs",
    location: "Harare",
    appliedFor: "Software Developer",
    stage: "offer",
    matchScore: 79,
    provenance: "hr_confirmed",
    appliedAt: "2026-11-04T15:15:00+02:00",
    topSkills: ["Node.js", "Docker", "AWS"],
  },
  {
    id: "cnd_lindiwe",
    name: "Lindiwe Khumalo",
    headline: "Financial analyst (CIMA) · 5 yrs",
    location: "Lusaka",
    appliedFor: "Finance Manager",
    stage: "screening",
    matchScore: 57,
    provenance: "ai_illustrative",
    appliedAt: "2026-11-11T09:40:00+02:00",
    topSkills: ["Financial modelling", "Excel", "Treasury"],
  },
];

export const vacancies = [
  { id: "vac_swdev", title: "Software Developer", location: "Harare" },
  { id: "vac_hro", title: "Human Resources Officer", location: "Harare" },
  { id: "vac_fin", title: "Finance Manager", location: "Bulawayo" },
  { id: "vac_mkt", title: "Marketing Executive", location: "Harare" },
  { id: "vac_data", title: "Data Analyst", location: "Harare" },
  { id: "vac_ops", title: "Operations Manager", location: "Gweru" },
] as const;
