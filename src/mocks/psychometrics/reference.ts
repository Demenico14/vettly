/**
 * Reference data from docs/reports/Workplace psychometric assessment database.md: validity benchmarks,
 * report templates, consent notice content and country compliance profiles. Not legal advice. Items marked
 * "unverified" must be checked against the primary source before the product relies on them.
 */
import type { CountryProfile, ReportTemplate, ValidityBenchmark } from "../../types/psychometrics";

/** Sackett, Zhang, Berry & Lievens (2022), JAP 107(11), Table 3, alongside Schmidt & Hunter (1998). */
export const validityBenchmarks: ValidityBenchmark[] = [
  { predictor: "Structured interview", schmidtHunter1998: 0.51, sackett2022: 0.42, lowerCredibility80: 0.18, blackWhiteD: 0.23 },
  { predictor: "Job knowledge test", schmidtHunter1998: 0.48, sackett2022: 0.4, lowerCredibility80: 0.23, blackWhiteD: 0.54 },
  { predictor: "Empirically keyed biodata", schmidtHunter1998: 0.35, sackett2022: 0.38, lowerCredibility80: 0.26, blackWhiteD: 0.33 },
  { predictor: "Work sample", schmidtHunter1998: 0.54, sackett2022: 0.33, lowerCredibility80: 0.21, blackWhiteD: 0.67 },
  { predictor: "Cognitive ability", schmidtHunter1998: 0.51, sackett2022: 0.31, lowerCredibility80: 0.13, blackWhiteD: 0.79 },
  { predictor: "Integrity test", schmidtHunter1998: 0.41, sackett2022: 0.31, lowerCredibility80: 0.05, blackWhiteD: 0.1 },
  { predictor: "Personality-based emotional intelligence", schmidtHunter1998: null, sackett2022: 0.3, lowerCredibility80: 0.08, blackWhiteD: 0.22 },
  { predictor: "Assessment centre", schmidtHunter1998: 0.37, sackett2022: 0.29, lowerCredibility80: 0.17, blackWhiteD: 0.52 },
  { predictor: "Situational judgement test", schmidtHunter1998: null, sackett2022: 0.26, lowerCredibility80: 0.13, blackWhiteD: 0.39 },
  { predictor: "Conscientiousness (contextualised)", schmidtHunter1998: null, sackett2022: 0.25, lowerCredibility80: 0.25, blackWhiteD: -0.07 },
  { predictor: "Interests (fit-based)", schmidtHunter1998: 0.1, sackett2022: 0.24, lowerCredibility80: -0.08, blackWhiteD: 0.33 },
  { predictor: "Ability-based emotional intelligence", schmidtHunter1998: null, sackett2022: 0.22, lowerCredibility80: 0.16, blackWhiteD: null },
  { predictor: "Conscientiousness (overall)", schmidtHunter1998: 0.31, sackett2022: 0.19, lowerCredibility80: 0.02, blackWhiteD: -0.07 },
  { predictor: "Unstructured interview", schmidtHunter1998: 0.38, sackett2022: 0.19, lowerCredibility80: -0.01, blackWhiteD: 0.32 },
  { predictor: "Openness (overall)", schmidtHunter1998: null, sackett2022: 0.05, lowerCredibility80: -0.03, blackWhiteD: 0.1 },
  { predictor: "Years of job experience", schmidtHunter1998: 0.18, sackett2022: 0.07, lowerCredibility80: -0.07, blackWhiteD: 0.49 },
];

export const reportTemplates: ReportTemplate[] = [
  {
    type: "hr",
    label: "HR report",
    audience: "Recruiters and hiring managers",
    sections: ["Score summary with the norm group used", "Band and percentile per test", "Battery composite and role fit", "Response-consistency and candour flags", "Accommodations applied", "How to use these results"],
    releasedViaPractitioner: true,
  },
  {
    type: "candidate_feedback",
    label: "Candidate feedback",
    audience: "The candidate",
    sections: ["What was measured", "Your results in bands (no percentiles)", "Strengths", "Up to five development areas", "How the employer will use the results", "Your right to ask for a review"],
    releasedViaPractitioner: false,
  },
  {
    type: "interview_guide",
    label: "Interview guide",
    audience: "Interview panel",
    sections: ["3–8 scales to explore, each with a hypothesis", "Suggested questions and follow-up probes", "What good and weak answers sound like", "Areas where the profile looks idealised"],
    releasedViaPractitioner: true,
  },
  {
    type: "development",
    label: "Development report",
    audience: "Employee and line manager",
    sections: ["Profile overview", "Strengths to build on", "Development priorities", "Suggested actions"],
    releasedViaPractitioner: true,
  },
  {
    type: "team",
    label: "Team report",
    audience: "Team leader",
    sections: ["Team profile across scales", "Balance and gaps", "Likely friction points", "Discussion prompts"],
    releasedViaPractitioner: true,
  },
];

/** What every candidate is told before testing. Derived from POPIA, the CDPA and the Zambian and Botswana Acts. */
export const consentNotice = {
  version: "2026-11-v1",
  items: [
    "Who is assessing you: the employer is responsible for your data, and Vettly processes it for them.",
    "Why: to help decide on your application for the named vacancy, and for no other purpose without asking you.",
    "What is measured, how long it takes, and that personality questionnaires have no right answers.",
    "Who will see your results: the recruitment team for this vacancy, and, where required, a registered psychology practitioner.",
    "That a person reviews every decision. Test scores never reject you on their own, and you can ask for a review and give your side.",
    "That you can ask for accommodations, such as extra time, before you start.",
    "Where your data is stored, and whether it leaves your country.",
    "How long results are kept (12 months for unsuccessful applicants unless you agree to longer) and how to ask for deletion.",
    "That you will receive a feedback report after you finish.",
    "How to contact the employer's information officer or data protection officer.",
    "Optional, separate consent to keep your anonymised results for improving the tests.",
  ],
};

export const countryProfiles: CountryProfile[] = [
  {
    country: "ZA",
    name: "South Africa",
    dataProtectionLaw: "Protection of Personal Information Act 4 of 2013 (POPIA)",
    regulator: "Information Regulator",
    employmentLaw: "Employment Equity Act 55 of 1998, s.8",
    practitionerBody: "HPCSA Professional Board for Psychology",
    employerRegistration: { label: "Information officer registered with the Information Regulator", required: true },
    breachNotice: "As soon as reasonably possible (s.22, unverified)",
    defaultRetentionMonths: 12,
    biometricProctoringAllowed: false,
    dataResidency: "No localisation rule; cross-border transfers under s.72 (unverified)",
    requirements: [
      { topic: "Test quality", rule: "Tests must be scientifically valid and reliable, applied fairly to all, and not biased against any employee or group.", productBehaviour: "Every test version stores validity, reliability, norm and bias evidence. Sends are blocked for tests without it.", citation: "EEA s.8(a)–(c)", status: "cited" },
      { topic: "Certification", rule: "HPCSA certification is no longer required: s.8(d) was deleted from 1 January 2025 after ATP-SA v President of the RSA (2017).", productBehaviour: "No 'HPCSA-certified' badge anywhere. Tests record whether they are HPCSA-classified instead.", citation: "Employment Equity Amendment Act 4 of 2022", status: "cited" },
      { topic: "Who may use classified tests", rule: "Tests classified as psychological may be used only by registered practitioners within their scope.", productBehaviour: "Classified-test reports are released to HR through a registered practitioner on the account.", citation: "Health Professions Act; GN R.993 of 2008", status: "cited" },
      { topic: "Automated decisions", rule: "No decision with legal or substantial effect based solely on automated profiling of work performance.", productBehaviour: "A person must review before any rejection. Every outcome message has a 'request a review' link.", citation: "POPIA s.71", status: "cited" },
      { topic: "Special personal information", rule: "Race and health data are special personal information with stricter conditions.", productBehaviour: "EEA demographics and accommodations are stored separately and never used in scoring.", citation: "POPIA ss.26–33 (unverified)", status: "unverified" },
    ],
  },
  {
    country: "ZW",
    name: "Zimbabwe",
    dataProtectionLaw: "Cyber and Data Protection Act [Chapter 12:07] and SI 155 of 2024",
    regulator: "POTRAZ (Data Protection Authority)",
    employmentLaw: "Labour Act [Chapter 28:01], s.5",
    practitionerBody: "Allied Health Practitioners Council of Zimbabwe",
    employerRegistration: { label: "POTRAZ data controller licence (50 or more data subjects) and a notified DPO", required: true },
    breachNotice: "POTRAZ within 24 hours; affected people within 72 hours if the risk is high",
    defaultRetentionMonths: 12,
    biometricProctoringAllowed: false,
    dataResidency: "Transfers need adequate protection in the destination and notification to POTRAZ",
    requirements: [
      { topic: "Licence", rule: "Controllers processing data of 50 or more people need a POTRAZ licence and a data protection officer.", productBehaviour: "Sends are blocked until the employer's licence number is on file.", citation: "SI 155 of 2024", status: "cited" },
      { topic: "Automated decisions", rule: "A right not to be subject to solely automated decisions unless the person consents or a law provides for it.", productBehaviour: "Explicit opt-in to automated scoring, and human review before any rejection.", citation: "CDPA s.25", status: "cited" },
      { topic: "Sensitive data and biometrics", rule: "Sensitive data needs written consent; only licensed persons may process biometrics.", productBehaviour: "Webcam and face-matching proctoring are switched off.", citation: "CDPA; SI 155 of 2024", status: "cited" },
      { topic: "Who administers", rule: "Experts advise using registered psychologists for pre-employment psychological tests. This is opinion, not statute.", productBehaviour: "Recommended, not enforced.", citation: "Herald (expert commentary)", status: "assumption" },
    ],
  },
  {
    country: "ZM",
    name: "Zambia",
    dataProtectionLaw: "Data Protection Act No. 3 of 2021",
    regulator: "Office of the Data Protection Commissioner",
    employmentLaw: "Employment Code Act 2019, s.5",
    practitionerBody: "Health Professions Council of Zambia",
    employerRegistration: { label: "Registration with the Data Protection Commissioner", required: true },
    breachNotice: "Sources conflict on the deadline",
    defaultRetentionMonths: 12,
    biometricProctoringAllowed: false,
    dataResidency: "Sensitive personal data stays in Zambia unless the person consents to transfer",
    requirements: [
      { topic: "Registration", rule: "Data controllers must register with the Data Protection Commissioner.", productBehaviour: "Registration number required in organisation settings.", citation: "Data Protection Act 2021", status: "cited" },
      { topic: "Data residency", rule: "Sensitive data is stored in Zambia, or transferred only with consent.", productBehaviour: "Zambian candidates' accommodation and demographic data are hosted in-region by default.", citation: "Data Protection Act 2021", status: "cited" },
      { topic: "Discrimination", rule: "No direct or indirect discrimination against prospective employees; no pregnancy questions at recruitment.", productBehaviour: "Adverse-impact monitoring per vacancy.", citation: "Employment Code Act 2019 s.5", status: "cited" },
    ],
  },
  {
    country: "BW",
    name: "Botswana",
    dataProtectionLaw: "Data Protection Act 2024",
    regulator: "Information and Data Protection Commission",
    employmentLaw: "Employment and Labour Relations Act 2025; Persons with Disability Act 2024",
    practitionerBody: "Botswana Health Professions Council",
    employerRegistration: null,
    breachNotice: "Unconfirmed",
    defaultRetentionMonths: 12,
    biometricProctoringAllowed: false,
    dataResidency: "Unconfirmed",
    requirements: [
      { topic: "Data protection", rule: "The 2024 Act replaced the 2018 Act. Commencement is reported as 29 October 2024 or 14 January 2025.", productBehaviour: "Apply the same consent and review defaults as the other countries.", citation: "Data Protection Act 2024", status: "unverified" },
      { topic: "Disability", rule: "Disability discrimination in employment is prohibited.", productBehaviour: "Accommodation requests offered before every test.", citation: "Persons with Disability Act 2024", status: "cited" },
    ],
  },
];

/** Candidate-flow defaults (design assumptions anchored on ThriveMap and HireVue completion research). */
export const candidateFlow = {
  deadlineDays: 5,
  reminderHoursBeforeDeadline: [48, 24],
  maxExtensions: 1,
  extensionDays: [2, 7] as const,
  defaultExtraTimePercent: 25,
  disconnectGraceSeconds: 120,
  retestLockoutMonths: 6,
  quoteMedianNotLimit: true,
  /** Per 100 invitations for professional roles. */
  funnel: { opened: 88, started: 76, completed: 69, expiredUnstarted: 19, abandoned: 6, withdrawn: 2 },
};
